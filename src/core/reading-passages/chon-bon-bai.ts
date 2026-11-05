/**
 * ThayKhaiEdu - Chọn 4 bài đọc thành tiếng cho một kì từ kho bài đọc.
 *
 * Mỗi kì có 2 chủ điểm: lấy 2 bài mỗi chủ điểm, ưu tiên khác thể loại để giáo viên có lựa chọn.
 * Mỗi bài được cắt thành đoạn đúng số tiếng của kì (ngắt cuối câu/cuối dòng là tốt nhất).
 * Bài đọc hiểu của đề đang soạn được loại ra để không trùng.
 */

import { catDoanTotNhat, type DoanCat, type KieuNgat } from '@/core/reading-passages/cat-doan';
import { CHU_DIEM_THEO_KY, khoangDoDai, type KyKiemTraBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

export interface UngVienBaiDoc {
  id: string;
  tieuDe: string;
  noiDung: string;
  trangThai: string;
  chuDiem: string | null;
  theLoai: TheLoaiBaiDoc | null;
}

export interface BaiDocThanhTiengDuocChon {
  id: string;
  tieuDe: string;
  chuDiem: string;
  theLoai: TheLoaiBaiDoc | null;
  trangThai: string;
  doan: DoanCat;
}

export interface KetQuaChonBonBai {
  baiDoc: BaiDocThanhTiengDuocChon[];
  /** Lý do chưa đủ 4 bài, để hiển thị cho thầy. */
  thieu: string[];
}

const DIEM_NGAT: Record<KieuNgat, number> = { CUOI_CAU: 0, CUOI_DONG: 0, DAU_PHAY: 1, GIUA_CAU: 2 };

function diemChatLuong(d: DoanCat): number {
  return DIEM_NGAT[d.kieuNgat] * 10 + (d.trongKhoang ? 0 : 5) + (d.batDau === 'DAU_BAI' ? 0 : 1);
}

export function chonBonBaiDocThanhTieng(
  ky: KyKiemTraBaiDoc,
  kho: UngVienBaiDoc[],
  tuyChon: { baiDocHieuId?: string | null; chiDaDuyet?: boolean } = {},
): KetQuaChonBonBai {
  const { baiDocHieuId = null, chiDaDuyet = true } = tuyChon;
  const q = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN')!;
  const baiDoc: BaiDocThanhTiengDuocChon[] = [];
  const thieu: string[] = [];

  for (const chuDiem of CHU_DIEM_THEO_KY[ky]) {
    const ungVien = kho
      .filter((b) => b.chuDiem === chuDiem && b.id !== baiDocHieuId && (!chiDaDuyet || b.trangThai === 'APPROVED'))
      .map((b) => ({ b, doan: catDoanTotNhat(b.noiDung, { min: q.min, max: q.max, dungSai: q.dungSai }) }))
      .filter((x): x is { b: UngVienBaiDoc; doan: DoanCat } => x.doan !== null)
      .sort((x, y) => diemChatLuong(x.doan) - diemChatLuong(y.doan));

    const chon: typeof ungVien = [];
    const theLoaiDaLay = new Set<string>();
    for (const x of ungVien) {
      if (chon.length < 2 && !theLoaiDaLay.has(x.b.theLoai ?? '')) {
        chon.push(x);
        theLoaiDaLay.add(x.b.theLoai ?? '');
      }
    }
    for (const x of ungVien) if (chon.length < 2 && !chon.includes(x)) chon.push(x);

    if (chon.length < 2) thieu.push(`Chủ điểm "${chuDiem}" mới có ${chon.length}/2 bài cắt được${chiDaDuyet ? ' (chỉ tính bài đã duyệt)' : ''}.`);
    for (const x of chon) {
      baiDoc.push({ id: x.b.id, tieuDe: x.b.tieuDe, chuDiem, theLoai: x.b.theLoai, trangThai: x.b.trangThai, doan: x.doan });
    }
  }
  return { baiDoc, thieu };
}
