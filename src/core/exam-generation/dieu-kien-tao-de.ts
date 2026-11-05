/**
 * ThayKhaiEdu - Điều kiện bắt buộc trước khi AI (hoặc giáo viên) tạo đề.
 *
 * Chủ dự án yêu cầu (05/11/2026): tạo đề phải kết nối với ma trận và sách giáo khoa.
 * Hàm này là cửa chặn: chưa đủ điều kiện thì không gọi AI tạo câu hỏi.
 *
 * - Ma trận riêng đã xác nhận và không còn lỗi.
 * - Tiếng Việt: bài đọc hiểu và 4 bài đọc thành tiếng lấy từ kho, đã duyệt, đúng kì, đúng chủ điểm,
 *   bài đọc hiểu đúng phương án văn bản (VBVH/VBTT) của ma trận riêng.
 * - Căn cứ SGK của từng câu: khi kho SGK đã duyệt thì bắt buộc; trước đó chỉ cảnh báo.
 */

import type { MaTranChung, MaTranRieng } from '@/types/matrix-template';
import { danhSachCau, kiemDinhMaTranRieng } from '@/core/matrix/matrix-template';
import { CHU_DIEM_THEO_KY, type KyKiemTraBaiDoc, type LoaiBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

export interface BaiDocDaChon {
  id: string;
  tieuDe: string;
  trangThai: string; // APPROVED mới được dùng
  loai: LoaiBaiDoc | null;
  ky: KyKiemTraBaiDoc | null;
  chuDiem: string | null;
  theLoai: TheLoaiBaiDoc | null;
}

export interface CanCuSgk {
  sach: string;
  trang: number;
}

export interface DauVaoTaoDe {
  maTranChung: MaTranChung;
  maTranRieng: MaTranRieng;
  baiDocHieu?: BaiDocDaChon | null;
  baiDocThanhTieng?: BaiDocDaChon[];
  /** khóa câu (ví dụ "chinh/p1/3") → trang SGK làm căn cứ */
  canCuSgk?: Record<string, CanCuSgk[]>;
  /** Bật khi kho SGK đã duyệt xong cho môn này. */
  batBuocCanCuSgk?: boolean;
}

export interface KetQuaDieuKien {
  duocTaoDe: boolean;
  loi: string[];
  canhBao: string[];
}

const THE_LOAI_VBVH: TheLoaiBaiDoc[] = ['TRUYEN', 'MIEU_TA', 'THO', 'KICH'];

function kiemBaiDoc(b: BaiDocDaChon, loai: LoaiBaiDoc, ky: KyKiemTraBaiDoc, nhan: string, loi: string[]) {
  if (b.trangThai !== 'APPROVED') loi.push(`${nhan} "${b.tieuDe}" chưa được tổ trưởng duyệt.`);
  if (b.loai !== loai) loi.push(`${nhan} "${b.tieuDe}" không thuộc loại ${loai === 'DOC_HIEU' ? 'đọc hiểu' : 'đọc thành tiếng'}.`);
  if (b.ky !== ky) loi.push(`${nhan} "${b.tieuDe}" không thuộc kì kiểm tra này.`);
  if (!b.chuDiem || !(CHU_DIEM_THEO_KY[ky] as string[]).includes(b.chuDiem)) {
    loi.push(`${nhan} "${b.tieuDe}" không đúng chủ điểm của kì (${CHU_DIEM_THEO_KY[ky].join('; ')}).`);
  }
}

export function kiemTraDieuKienTaoDe(d: DauVaoTaoDe): KetQuaDieuKien {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const { maTranChung: mtc, maTranRieng: mtr } = d;

  // 1. Ma trận
  if (mtr.trang_thai !== 'DA_XAC_NHAN') loi.push('Ma trận riêng chưa được xác nhận.');
  const kq = kiemDinhMaTranRieng(mtc, mtr);
  if (!kq.hopLe) loi.push(...kq.loi.map((l) => `Ma trận: ${l}`));

  const ky = mtc.ky_kiem_tra as KyKiemTraBaiDoc;

  // 2. Tiếng Việt: bài đọc từ kho
  if (mtc.ma_mon === 'TIENG_VIET') {
    if (!d.baiDocHieu) loi.push('Chưa chọn bài đọc hiểu từ kho bài đọc.');
    else {
      kiemBaiDoc(d.baiDocHieu, 'DOC_HIEU', ky, 'Bài đọc hiểu', loi);
      const pa = mtr.lua_chon_da_dung['loai_van_ban'];
      const tl = d.baiDocHieu.theLoai;
      if (pa === 'VBTT' && tl !== 'VAN_BAN_THONG_TIN') loi.push('Ma trận riêng chọn văn bản thông tin nhưng bài đọc hiểu không phải văn bản thông tin.');
      if (pa === 'VBVH' && (!tl || !THE_LOAI_VBVH.includes(tl))) loi.push('Ma trận riêng chọn văn bản văn học nhưng bài đọc hiểu không phải văn bản văn học.');
    }
    const tt = d.baiDocThanhTieng ?? [];
    if (tt.length < 4) loi.push(`Cần 4 bài đọc thành tiếng từ kho, mới chọn ${tt.length}.`);
    tt.forEach((b, i) => kiemBaiDoc(b, 'DOC_THANH_TIENG', ky, `Bài đọc thành tiếng ${i + 1}`, loi));
    const ids = [d.baiDocHieu?.id, ...tt.map((b) => b.id)].filter(Boolean);
    if (new Set(ids).size !== ids.length) loi.push('Có bài đọc được chọn hai lần.');
  }

  // 3. Căn cứ SGK cho từng câu
  const thieu = danhSachCau(mtc, mtr.lua_chon_da_dung)
    .filter((c) => c.cau.dang !== 'VIET' && (c.phan.kieu ?? 'CAU_HOI') === 'CAU_HOI')
    .filter((c) => !(d.canCuSgk?.[c.khoa]?.length))
    .map((c) => c.cau.cau);
  if (thieu.length) {
    const msg = `Câu ${thieu.join(', ')} chưa có căn cứ trang SGK.`;
    if (d.batBuocCanCuSgk) loi.push(msg);
    else canhBao.push(`${msg} (Sẽ bắt buộc khi kho SGK của môn này được duyệt.)`);
  }

  return { duocTaoDe: loi.length === 0, loi, canhBao };
}
