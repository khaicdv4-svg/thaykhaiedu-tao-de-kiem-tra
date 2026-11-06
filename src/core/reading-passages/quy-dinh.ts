/**
 * ThayKhaiEdu - Quy định của tổ khối 4 cho ngữ liệu đọc (đọc thành tiếng, đọc hiểu).
 * Nguồn: ma trận nội dung cả năm môn Tiếng Việt 4 (2026 – 2027) và quy định ra đề của tổ.
 * Mọi con số ở đây là của tổ; sửa ở một chỗ này, các nơi khác dùng chung.
 */

import type { BoNao } from '@/core/bo-nao/bo-nao';

export type KyKiemTraBaiDoc = 'GIUA_HK1' | 'CUOI_HK1' | 'GIUA_HK2' | 'CUOI_NAM';
export type LoaiBaiDoc = 'DOC_THANH_TIENG' | 'DOC_HIEU';
export type TheLoaiBaiDoc = 'TRUYEN' | 'MIEU_TA' | 'THO' | 'VAN_BAN_THONG_TIN' | 'KICH' | 'KHAC';

export const DANH_SACH_KY: { ma: KyKiemTraBaiDoc; ten: string }[] = [
  { ma: 'GIUA_HK1', ten: 'Giữa học kì I' },
  { ma: 'CUOI_HK1', ten: 'Cuối học kì I' },
  { ma: 'GIUA_HK2', ten: 'Giữa học kì II' },
  { ma: 'CUOI_NAM', ten: 'Cuối năm' },
];

export const TEN_LOAI: Record<LoaiBaiDoc, string> = {
  DOC_THANH_TIENG: 'Đọc thành tiếng',
  DOC_HIEU: 'Đọc hiểu',
};

export const TEN_THE_LOAI: Record<TheLoaiBaiDoc, string> = {
  TRUYEN: 'Truyện',
  MIEU_TA: 'Miêu tả',
  THO: 'Thơ',
  VAN_BAN_THONG_TIN: 'Văn bản thông tin',
  KICH: 'Kịch',
  KHAC: 'Khác',
};

/** 8 chủ điểm SGK Tiếng Việt 4 KNTT (bản 2026 – 2027). */
export const CHU_DIEM_TV4 = [
  { so: 1, ten: 'Mỗi người một vẻ', tap: 1 },
  { so: 2, ten: 'Trải nghiệm và khám phá', tap: 1 },
  { so: 3, ten: 'Niềm vui sáng tạo', tap: 1 },
  { so: 4, ten: 'Chắp cánh ước mơ', tap: 1 },
  { so: 5, ten: 'Sống để yêu thương', tap: 2 },
  { so: 6, ten: 'Uống nước nhớ nguồn', tap: 2 },
  { so: 7, ten: 'Quê hương trong tôi', tap: 2 },
  { so: 8, ten: 'Vì một thế giới bình yên', tap: 2 },
] as const;

export type TenChuDiem = (typeof CHU_DIEM_TV4)[number]['ten'];

/** Chủ điểm của bài đọc theo kì kiểm tra (theo ma trận chung của tổ). */
export const CHU_DIEM_THEO_KY: Record<KyKiemTraBaiDoc, TenChuDiem[]> = {
  GIUA_HK1: ['Mỗi người một vẻ', 'Trải nghiệm và khám phá'],
  CUOI_HK1: ['Niềm vui sáng tạo', 'Chắp cánh ước mơ'],
  GIUA_HK2: ['Sống để yêu thương', 'Uống nước nhớ nguồn'],
  CUOI_NAM: ['Quê hương trong tôi', 'Vì một thế giới bình yên'],
};

export interface KhoangDoDai {
  min: number;
  max: number;
  dungSai: number;
  donVi: 'tiếng';
}

/** Đọc thành tiếng: giữa HKI 80 – 85 tiếng, các kì sau 80 – 90 tiếng; lệch tối đa ±5. */
const DOC_THANH_TIENG: Record<KyKiemTraBaiDoc, KhoangDoDai> = {
  GIUA_HK1: { min: 80, max: 85, dungSai: 5, donVi: 'tiếng' },
  CUOI_HK1: { min: 80, max: 90, dungSai: 5, donVi: 'tiếng' },
  GIUA_HK2: { min: 80, max: 90, dungSai: 5, donVi: 'tiếng' },
  CUOI_NAM: { min: 80, max: 90, dungSai: 5, donVi: 'tiếng' },
};

/** Đọc hiểu theo kì và thể loại (ma trận nội dung cả năm); lệch tối đa ±10. */
const DOC_HIEU: Record<KyKiemTraBaiDoc, Partial<Record<TheLoaiBaiDoc, [number, number]>>> = {
  GIUA_HK1: { TRUYEN: [250, 280], MIEU_TA: [180, 200], THO: [90, 100], VAN_BAN_THONG_TIN: [140, 150] },
  CUOI_HK1: { TRUYEN: [280, 300], MIEU_TA: [200, 220], THO: [100, 110], VAN_BAN_THONG_TIN: [150, 160] },
  GIUA_HK2: { TRUYEN: [300, 320], MIEU_TA: [220, 240], THO: [110, 120], VAN_BAN_THONG_TIN: [160, 170] },
  CUOI_NAM: { TRUYEN: [300, 330], MIEU_TA: [220, 250], THO: [110, 120], VAN_BAN_THONG_TIN: [160, 180] },
};

/** Khoảng độ dài quy định; null khi tổ chưa quy định cho thể loại đó. */
export function khoangDoDai(loai: LoaiBaiDoc, ky: KyKiemTraBaiDoc, theLoai: TheLoaiBaiDoc, boNao?: BoNao | null): KhoangDoDai | null {
  const rieng = boNao?.ky[ky];
  if (loai === 'DOC_THANH_TIENG') {
    if (rieng?.tocDo) return { ...rieng.tocDo, dungSai: boNao!.dungSai.thanhTieng, donVi: 'tiếng' };
    return DOC_THANH_TIENG[ky];
  }
  // Kì đã có trong bộ não: theo ma trận của tổ; thể loại ma trận không ghi thì coi là chưa quy định.
  if (rieng && Object.keys(rieng.doDai).length > 0) {
    const k = rieng.doDai[theLoai];
    return k ? { min: k[0], max: k[1], dungSai: boNao!.dungSai.docHieu, donVi: 'tiếng' } : null;
  }
  const k = DOC_HIEU[ky][theLoai];
  return k ? { min: k[0], max: k[1], dungSai: 10, donVi: 'tiếng' } : null;
}

/** Chủ điểm của kì: theo bộ não nếu đã tải ma trận, không thì theo mặc định. */
export function chuDiemCuaKy(ky: KyKiemTraBaiDoc, boNao?: BoNao | null): string[] {
  const cd = boNao?.ky[ky]?.chuDiem;
  return cd && cd.length > 0 ? cd : CHU_DIEM_THEO_KY[ky];
}

/** Ngưỡng trùng với bài đọc SGK đang dạy (chủ dự án chốt 05/11/2026). */
export const NGUONG_TRUNG_SGK = { chan: 30, canhBao: 10 } as const;

/** Trang web chỉ nên làm nguồn phụ (đề thi, lời giải); nguồn chính phải là sách, báo, tác giả. */
export const TEN_MIEN_NGUON_PHU = ['loigiaihay', 'vndoc', 'lazi', 'vietjack', 'tuyensinh247', 'hoc247', 'toploigiai', 'khoahoc.vietjack'];

/**
 * Nguồn là SGK Tiếng Việt 4 Kết nối tri thức đang dạy: không dùng (học sinh đã học).
 * SGK Cánh Diều, Chân trời sáng tạo được phép và nên tìm (thầy Khái chốt 06/11/2026).
 */
const KNTT = /k[eế]t n[oố]i tri th[uứ]c/i;
const TV4 = /ti[eế]ng vi[eệ]t\s*(l[oớ]p\s*)?4\b|\bl[oớ]p\s*4\b/i;
export function laNguonSgkDangDay(nguon: string): boolean {
  return KNTT.test(nguon) && TV4.test(nguon);
}

/** Nguồn là sách in (không có link) phải ghi số trang, ví dụ "trang 25", "tr. 25". */
export const CO_SO_TRANG = /\b(trang|tr\.?)\s*\d+/i;
