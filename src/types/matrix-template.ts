/**
 * ThayKhaiEdu - Mẫu ma trận chung và ma trận riêng (theo mẫu tổ khối 4).
 *
 * Tài liệu gốc: docs/mau-ma-tran/README-mau-ma-tran.md (mục 3).
 * Tên trường giữ đúng như các file JSON trong docs/mau-ma-tran để nạp trực tiếp, không cần chuyển đổi.
 *
 * Kiểu cũ `ExamMatrix` / `MatrixSpecificationItem` (src/types/curriculum.ts) vẫn giữ nguyên.
 * Dùng `toLegacyMatrixItems()` trong src/core/matrix/matrix-template.ts khi cần dữ liệu theo kiểu cũ.
 */

/** Mức 1, 2, 3 theo Điều 7 Thông tư 27/2020/TT-BGDĐT. Không có Mức 4. */
export type MucDo = 1 | 2 | 3;

/** TN: trắc nghiệm (gồm NLC, Đ/S, TLN, nối, điền); TL: tự luận / thực hành. */
export type HinhThucCau = 'TN' | 'TL';

/** NLC: nhiều lựa chọn; DS: đúng sai; TLN: trả lời ngắn; VIET: bài viết Tiếng Việt. */
export type DangCau = 'NLC' | 'DS' | 'TLN' | 'NOI' | 'DIEN' | 'VIET';

/** Kiểu bố cục khi trình bày (xem mục 2 của README). */
export type BoCucMaTran = 'TOAN_HINH_THUC_MUC' | 'BAI_MUC_TN_TL' | 'TIENG_VIET_3_PHAN';

export type KyKiemTra = 'GIUA_HK1' | 'CUOI_HK1' | 'GIUA_HK2' | 'CUOI_NAM';

/** Một câu hỏi (ô câu) trong ma trận. */
export interface CauHoiMaTran {
  /** Số thứ tự câu, ví dụ "1", "8". Bài viết Tiếng Việt dùng "Viết". */
  cau: string;
  /** Ý nhỏ, ví dụ ["a", "b", "c", "d"] cho Câu 8 Toán. */
  y_nho: string[] | null;
  /** Số câu được tính trong tổng (Câu 8 a–d tính 4 câu). */
  so_cau_tinh: number;
  muc: MucDo;
  hinh_thuc: HinhThucCau;
  dang: DangCau | null;
  /** Điểm của cả câu (gồm mọi ý nhỏ). */
  diem: number;
}

/** Một dòng ma trận: mạch / nội dung / danh sách YCCĐ / các câu gắn với dòng. */
export interface DongMaTran {
  mach: string;
  noi_dung: string | null;
  yccd: string[];
  cau_hoi: CauHoiMaTran[];
  /** Nhãn in nghiêng đậm phía trên YCCĐ (Toán: "Bài toán có lời văn"). */
  nhan?: string;
  /** Nhóm con trong một phần (Tiếng Việt: "Đọc hiểu văn bản (5 điểm)"). */
  nhom?: string;
  chu_diem?: string;
  so_tiet?: number;
  /** Điểm của tiêu chí chấm (Tiếng Việt, Đọc thành tiếng). */
  tieu_chi_diem?: number;
}

export interface PhuongAnLuaChon {
  ma: string;
  ten: string;
  dong: DongMaTran[];
}

/** Nhóm phương án, ma trận riêng phải chọn đúng một (VBVH/VBTT; thể loại bài viết). */
export interface NhomLuaChon {
  ma: string;
  ten: string;
  phuong_an: PhuongAnLuaChon[];
}

export type KieuPhan = 'CAU_HOI' | 'TIEU_CHI' | 'VIET';

export interface PhanMaTran {
  ma: string;
  ten: string | null;
  tong_diem?: number;
  kieu?: KieuPhan;
  lua_chon?: NhomLuaChon;
  /** Các dòng dùng chung, không phụ thuộc phương án. */
  dong: DongMaTran[];
}

export interface BaiKiemTraMaTran {
  ma: string;
  ten: string;
  tong_diem: number;
  phan: PhanMaTran[];
}

export interface ChuKy {
  chuc_vu: string;
  ho_ten: string;
}

export interface MaTranChung {
  phien_ban_mau: string;
  loai: 'MA_TRAN_CHUNG';
  lop: string;
  ky_kiem_tra: KyKiemTra;
  nam_hoc: string;
  truong: { co_quan_chu_quan: string; truong: string; noi_ky: string };
  mon: string;
  ma_mon: string;
  bo_cuc: BoCucMaTran;
  tieu_de: string;
  thoi_gian_phut: number | null;
  ngay_ky: string;
  chu_ky: ChuKy[];
  bai_kiem_tra: BaiKiemTraMaTran[];
  /** Tỉ lệ % theo mức tổ quy định cho môn. Không cố định 50 – 30 – 20. */
  ti_le_muc_quy_dinh?: Record<'1' | '2' | '3', number>;
  /** Tiếng Việt: điểm theo mức trên 8 điểm đọc hiểu. */
  ti_le_muc_quy_dinh_doc_hieu?: { '1': number; '2': number; '3': number; don_vi: string };
  do_dai_van_ban?: Record<string, string>;
  ghi_chu_dang_cau?: string;
  bang_phu?: string[];
  ky_vong_tu_file_goc?: Record<string, unknown>;
  van_de_can_xac_nhan?: string[];
}

/** Trạng thái nghiệp vụ (Phụ lục 1.1, mục VII). */
export type TrangThaiMaTran = 'BAN_NHAP' | 'CAN_KIEM_TRA' | 'CO_LOI' | 'DA_XAC_NHAN' | 'CAN_XAC_NHAN_LAI';

export interface CauHoiMaTranRieng {
  /** Khóa câu: "<mã bài>/<mã phần>/<số câu>", ví dụ "doc/doc_hieu/6". */
  khoa: string;
  /** Đúng một YCCĐ, chọn trong danh sách YCCĐ của dòng chứa câu. */
  yccd: string;
}

export interface MaTranRieng {
  loai: 'MA_TRAN_RIENG';
  ma_tran_chung_ma_mon: string;
  ma_tran_chung_ky: KyKiemTra;
  phien_ban_ma_tran_chung: string;
  /** Mã nhóm lựa chọn → mã phương án đã chọn. Ví dụ { loai_van_ban: "VBVH" }. */
  lua_chon_da_dung: Record<string, string>;
  cau_hoi: CauHoiMaTranRieng[];
  trang_thai: TrangThaiMaTran;
  cap_nhat_luc?: string;
}
