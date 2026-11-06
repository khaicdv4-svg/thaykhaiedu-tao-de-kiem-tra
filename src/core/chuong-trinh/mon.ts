/** Môn học và loại tài liệu của Kho chương trình GDPT 2018 (dùng chung lớp 1–5). */

export const DANH_SACH_MON = [
  { ma: 'TOAN', ten: 'Toán' },
  { ma: 'TIENG_VIET', ten: 'Tiếng Việt' },
  { ma: 'KHOA_HOC', ten: 'Khoa học' },
  { ma: 'LS_DL', ten: 'Lịch sử và Địa lí' },
  { ma: 'CONG_NGHE', ten: 'Công nghệ' },
  { ma: 'DAO_DUC', ten: 'Đạo đức' },
  { ma: 'HDTN', ten: 'Hoạt động trải nghiệm' },
  { ma: 'TIN_HOC', ten: 'Tin học' },
  { ma: 'TIENG_ANH', ten: 'Tiếng Anh' },
  { ma: 'GDTC', ten: 'Giáo dục thể chất' },
  { ma: 'AM_NHAC', ten: 'Âm nhạc' },
  { ma: 'MY_THUAT', ten: 'Mĩ thuật' },
] as const;

export const TEN_MON: Record<string, string> = Object.fromEntries(DANH_SACH_MON.map((m) => [m.ma, m.ten]));

export const LOAI_TAI_LIEU = [
  { ma: 'CT_GDPT', ten: 'Chương trình GDPT 2018' },
  { ma: 'SGK', ten: 'Sách giáo khoa' },
  { ma: 'SGV', ten: 'Sách giáo viên' },
  { ma: 'KHAC', ten: 'Tài liệu khác' },
] as const;

export type LoaiTaiLieu = (typeof LOAI_TAI_LIEU)[number]['ma'];
export type NguonTaiLieu = 'TAI_FILE' | 'LINK' | 'DAN_CHU';
export type TrangThaiYccd = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
export const TEN_LOAI_TAI_LIEU: Record<string, string> = Object.fromEntries(LOAI_TAI_LIEU.map((l) => [l.ma, l.ten]));

export interface TaiLieuChuongTrinh {
  id: string;
  loai: LoaiTaiLieu;
  mon: string;
  lop: number | null;
  tieuDe: string;
  nguon: NguonTaiLieu;
  link: string | null;
  tenFile: string | null;
  soKyTu: number;
  ghiChu: string | null;
  taoLuc: string;
  soYccd?: number;
}

export interface YccdChuongTrinh {
  id: string;
  taiLieuId: string | null;
  mon: string;
  lop: number;
  mach: string | null;
  chuDe: string | null;
  bai: string | null;
  noiDung: string;
  trichDan: string | null;
  trichKhop: boolean;
  nguon: 'AI_TRICH' | 'NHAP_TAY';
  trangThai: TrangThaiYccd;
}
