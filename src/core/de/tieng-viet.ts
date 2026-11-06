/**
 * ThayKhaiEdu - Phần riêng của đề Tiếng Việt lớp 4: bài đọc hiểu, bốn bài đọc thành tiếng (mỗi bài một câu hỏi
 * và đáp án). Quy tắc theo skill đề Tiếng Việt của tổ và quy định độ dài ở reading-passages/quy-dinh.ts.
 * Hàm thuần, không đọc ghi cơ sở dữ liệu.
 */

import { khoangDoDai, type KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';

export interface BaiDocDe {
  tieuDe: string;
  noiDung: string;
  tacGia: string;
  /** Ví dụ "Nguồn: Wikipedia, ..." */
  nguon: string;
  /** Mã bài trong kho bài đọc (nếu lấy từ kho). */
  khoId?: string | null;
}

export interface BaiDocThanhTieng extends BaiDocDe {
  cauHoi: string;
  traLoi: string;
}

export interface NoiDungTiengViet {
  baiDocHieu: BaiDocDe;
  /** Đúng 4 bài. */
  baiDocThanhTieng: BaiDocThanhTieng[];
}

export const SO_BAI_THANH_TIENG = 4;

const bai = (): BaiDocDe => ({ tieuDe: '', noiDung: '', tacGia: '', nguon: '', khoId: null });

export function taoNoiDungTiengVietRong(): NoiDungTiengViet {
  return {
    baiDocHieu: bai(),
    baiDocThanhTieng: Array.from({ length: SO_BAI_THANH_TIENG }, () => ({ ...bai(), cauHoi: '', traLoi: '' })),
  };
}

/** Đếm tiếng: tách theo khoảng trắng, không tính tên bài, tác giả, nguồn. */
export function demTieng(noiDung: string): number {
  return noiDung.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export function kiemDinhTiengViet(ky: KyKiemTraBaiDoc, tv: NoiDungTiengViet | undefined): { loi: string[]; canhBao: string[] } {
  const loi: string[] = [];
  const canhBao: string[] = [];
  if (!tv) return { loi: ['Chưa có bài đọc hiểu và bài đọc thành tiếng cho đề Tiếng Việt.'], canhBao };

  const h = tv.baiDocHieu;
  if (!h.tieuDe.trim() || !h.noiDung.trim()) loi.push('Bài đọc hiểu: chưa có tên bài hoặc nội dung.');
  if (h.noiDung.trim() && (!h.tacGia.trim() || !h.nguon.trim())) loi.push('Bài đọc hiểu: cần ghi tác giả và nguồn.');

  if (tv.baiDocThanhTieng.length !== SO_BAI_THANH_TIENG) loi.push(`Đọc thành tiếng cần đúng ${SO_BAI_THANH_TIENG} bài đọc.`);
  const kh = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN');
  tv.baiDocThanhTieng.forEach((b, i) => {
    const t = `Bài đọc ${i + 1}`;
    if (!b.tieuDe.trim() || !b.noiDung.trim()) {
      loi.push(`${t}: chưa có tên bài hoặc nội dung.`);
      return;
    }
    if (!b.tacGia.trim() || !b.nguon.trim()) loi.push(`${t}: cần ghi tác giả và nguồn.`);
    if (!b.cauHoi.trim()) loi.push(`${t}: chưa có câu hỏi.`);
    if (!b.traLoi.trim()) loi.push(`${t}: chưa có đáp án cho câu hỏi.`);
    if (kh) {
      const n = demTieng(b.noiDung);
      if (n < kh.min - kh.dungSai || n > kh.max + kh.dungSai) loi.push(`${t}: ${n} tiếng, quy định ${kh.min}–${kh.max} tiếng (lệch tối đa ±${kh.dungSai}).`);
    }
  });
  const ten = tv.baiDocThanhTieng.map((b) => b.tieuDe.trim().toLowerCase()).filter(Boolean);
  if (new Set(ten).size < ten.length) loi.push('Hai bài đọc thành tiếng trùng tên.');
  return { loi, canhBao };
}
