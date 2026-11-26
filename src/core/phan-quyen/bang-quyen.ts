/**
 * Bảng tra cứu quyền theo chức vụ, khớp với các hàm phân quyền trong cơ sở dữ liệu
 * (migration 20261126190000_quyen_to_va_duyet_de_cap_to). Chỉ để hiển thị; quyền thật do cơ sở dữ liệu kiểm tra.
 *
 * Giá trị mỗi ô: 'co' (có), 'khong' (không), 'tich' (có khi được tích ở bảng quyền của tổ),
 * hoặc một chuỗi ghi chú ngắn cho trường hợp có điều kiện.
 */

export const CHUC_VU = ['GV', 'TP', 'TT', 'BGH', 'QT'] as const;
export type ChucVu = (typeof CHUC_VU)[number];
export const TEN_CHUC_VU: Record<ChucVu, string> = { GV: 'Giáo viên', TP: 'Tổ phó', TT: 'Tổ trưởng', BGH: 'Ban giám hiệu', QT: 'Quản trị' };

export type O = 'co' | 'khong' | 'tich' | string;
export interface DongQuyen { viec: string; nhom: 'De' | 'CanCu' | 'QuanLy'; o: Record<ChucVu, O> }

export const TEN_NHOM: Record<DongQuyen['nhom'], string> = { De: 'Đề kiểm tra', CanCu: 'Căn cứ ra đề', QuanLy: 'Quản lý tổ và hệ thống' };

/** Mặc định trước khi tổ trưởng tích: giáo viên có Soạn đề, Kiểm tra chéo; tổ phó có tất cả. */
export const BANG_QUYEN: DongQuyen[] = [
  { nhom: 'De', viec: 'Soạn đề của mình', o: { GV: 'tich', TP: 'tich', TT: 'co', BGH: 'khong', QT: 'co' } },
  { nhom: 'De', viec: 'Kiểm tra chéo, duyệt chéo (khi được phân công)', o: { GV: 'tich', TP: 'tich', TT: 'co', BGH: 'khong', QT: 'co' } },
  { nhom: 'De', viec: 'Phân công kiểm tra chéo', o: { GV: 'tich', TP: 'tich', TT: 'co', BGH: 'co', QT: 'co' } },
  { nhom: 'De', viec: 'Duyệt cấp tổ', o: { GV: 'Môn được giao, cần tích', TP: 'Môn được giao, cần tích', TT: 'co', BGH: 'Ngoại lệ', QT: 'co' } },
  { nhom: 'De', viec: 'Chọn tối đa 3 đề chính nộp Ban giám hiệu', o: { GV: 'Môn được giao', TP: 'Môn được giao', TT: 'co', BGH: 'khong', QT: 'co' } },
  { nhom: 'De', viec: 'Phê duyệt cuối, phát hành, thu hồi', o: { GV: 'khong', TP: 'khong', TT: 'khong', BGH: 'co', QT: 'co' } },
  { nhom: 'De', viec: 'Tự duyệt đề do chính mình soạn', o: { GV: 'khong', TP: 'khong', TT: 'khong', BGH: 'khong', QT: 'khong' } },
  { nhom: 'CanCu', viec: 'Ma trận riêng, đặc tả của mình', o: { GV: 'co', TP: 'co', TT: 'co', BGH: 'khong', QT: 'co' } },
  { nhom: 'CanCu', viec: 'Sửa ma trận, đặc tả của người khác', o: { GV: 'tich', TP: 'tich', TT: 'co', BGH: 'khong', QT: 'co' } },
  { nhom: 'CanCu', viec: 'Nạp mục lục SGK, kho sách', o: { GV: 'tich', TP: 'tich', TT: 'co', BGH: 'khong', QT: 'co' } },
  { nhom: 'CanCu', viec: 'Ma trận chung, kho chương trình, bộ não', o: { GV: 'khong', TP: 'Thêm ma trận chung', TT: 'co', BGH: 'khong', QT: 'co' } },
  { nhom: 'QuanLy', viec: 'Tích quyền cho thành viên trong tổ', o: { GV: 'khong', TP: 'khong', TT: 'Tổ mình', BGH: 'khong', QT: 'co' } },
  { nhom: 'QuanLy', viec: 'Bổ nhiệm tổ phó, giao môn phụ trách', o: { GV: 'khong', TP: 'khong', TT: 'Tổ mình', BGH: 'khong', QT: 'co' } },
  { nhom: 'QuanLy', viec: 'Bổ nhiệm tổ trưởng, cấp vai trò, đăng ký Gmail', o: { GV: 'khong', TP: 'khong', TT: 'khong', BGH: 'khong', QT: 'co' } },
  { nhom: 'QuanLy', viec: 'Ủy quyền có thời hạn', o: { GV: 'khong', TP: 'khong', TT: 'co', BGH: 'co', QT: 'co' } },
];
