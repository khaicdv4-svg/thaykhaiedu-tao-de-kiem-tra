/**
 * ThayKhaiEdu - Trang đề Tiếng Việt chia 3 phần (quyết định của tổ trưởng ngày 26/11/2026).
 * Phần 1 Đọc hiểu: bài đọc hiểu + ma trận → đặc tả → câu hỏi. Phần 2 Đọc thành tiếng: chọn bài → câu hỏi.
 * Phần 3 Viết: kiểu bài → đặc tả → đề bài, hướng dẫn chấm. Cuối cùng: Hoàn chỉnh đề (xem trước, sửa, xuất Word).
 * Ma trận riêng, đặc tả, đề vẫn là một bộ chung; mỗi phần chỉ hiện các câu của phần đó.
 */

export type PhanTV = 'docHieu' | 'thanhTieng' | 'viet' | 'hoanChinh';

export type MucTV =
  | 'p1-ma-tran' | 'p1-dac-ta' | 'p1-cau-hoi'
  | 'p2-chon-bai' | 'p2-cau-hoi'
  | 'p3-kieu-bai' | 'p3-dac-ta' | 'p3-de-bai'
  | 'hoan-chinh';

export const DS_MUC_TV: MucTV[] = ['p1-ma-tran', 'p1-dac-ta', 'p1-cau-hoi', 'p2-chon-bai', 'p2-cau-hoi', 'p3-kieu-bai', 'p3-dac-ta', 'p3-de-bai', 'hoan-chinh'];
export const laMucTV = (m: string | null | undefined): m is MucTV => !!m && (DS_MUC_TV as string[]).includes(m);

/** Cách các màn ma trận, đặc tả, đề chạy khi nhúng trong trang đề Tiếng Việt. */
export interface NhungTV {
  phan: PhanTV;
  /** Đường dẫn tới một mục khác của trang đề Tiếng Việt (giữ kì đang làm). */
  lienKet: (muc: MucTV, cau?: string) => string;
}

/** Câu (khóa "bai/phan/cau") có thuộc phần đang làm không. */
export function khoaThuocPhan(khoa: string, phan: PhanTV): boolean {
  if (phan === 'docHieu') return khoa.startsWith('doc/doc_hieu/');
  if (phan === 'viet') return khoa.startsWith('viet/');
  if (phan === 'thanhTieng') return false;
  return true;
}

/** Sửa một câu: mở đúng phần chứa câu đó. */
export function mucCuaCau(khoa: string): MucTV {
  if (khoa.startsWith('doc/doc_hieu/')) return 'p1-cau-hoi';
  if (khoa.startsWith('viet/')) return 'p3-de-bai';
  return 'p2-cau-hoi';
}

export function duongDanTV(ky: string, muc: MucTV, cau?: string): string {
  return `/de-tieng-viet?mon=TIENG_VIET&ky=${ky}&muc=${muc}${cau ? `&cau=${encodeURIComponent(cau)}` : ''}`;
}
