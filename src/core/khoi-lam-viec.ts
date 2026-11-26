/**
 * ThayKhaiEdu - Khối làm việc: khối lớp người dùng chọn ở trang Tổng quan.
 * Mọi chức năng (Bộ não, kho ma trận, ma trận riêng, đặc tả, đề, ngân hàng câu hỏi, mẫu đề,
 * kho PPCT, kho bài đọc) đọc và ghi theo khối này.
 *
 * Lưu ở hai nơi:
 * - cookie `tke_khoi`: máy chủ đọc được ngay ở mọi API, không tốn thêm truy vấn;
 * - user_metadata.khoi_lam_viec của tài khoản: đổi khối trên máy tính thì điện thoại cũng theo.
 * File này chỉ có hàm thuần, dùng được ở cả trình duyệt và máy chủ.
 */

export const COOKIE_KHOI = 'tke_khoi';
/** Sự kiện trình duyệt báo khối vừa đổi */
export const SU_KIEN_KHOI = 'tke-khoi-lam-viec';
export const KHOI_MAC_DINH = 4;
export const TAT_CA_KHOI = [1, 2, 3, 4, 5] as const;

export function laKhoiHopLe(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

/** Đọc khối từ chuỗi hoặc số; sai hoặc thiếu thì trả null. */
export function docKhoi(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return laKhoiHopLe(n) ? n : null;
}

/** Khối hợp lệ, sai thì về khối mặc định. */
export function chuanHoaKhoi(v: unknown, macDinh: number = KHOI_MAC_DINH): number {
  return docKhoi(v) ?? macDinh;
}

/** Danh sách khối trường đang dạy (cột active_grades); trống hoặc sai thì đủ 5 khối. */
export function dsKhoiCuaTruong(v: unknown): number[] {
  const ds = Array.isArray(v) ? [...new Set(v.map(docKhoi).filter((k): k is number => k !== null))].sort((a, b) => a - b) : [];
  return ds.length ? ds : [...TAT_CA_KHOI];
}

/**
 * Chọn khối làm việc lúc mở app: ưu tiên khối đã lưu trong tài khoản, rồi cookie trên máy,
 * rồi khối được phân công đầu tiên; khối phải nằm trong danh sách khối của trường.
 */
export function chonKhoiBanDau(p: { taiKhoan?: unknown; cookie?: unknown; phanCong?: unknown; dsKhoi: number[] }): number {
  const ds = p.dsKhoi.length ? p.dsKhoi : [...TAT_CA_KHOI];
  const phanCong = Array.isArray(p.phanCong) ? p.phanCong.map(docKhoi) : [];
  for (const k of [docKhoi(p.taiKhoan), docKhoi(p.cookie), ...phanCong]) {
    if (k !== null && ds.includes(k)) return k;
  }
  return ds.includes(KHOI_MAC_DINH) ? KHOI_MAC_DINH : ds[0];
}

/** Đọc giá trị cookie khối từ chuỗi document.cookie */
export function khoiTuChuoiCookie(chuoi: string): number | null {
  const m = chuoi.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE_KHOI}=`));
  return m ? docKhoi(decodeURIComponent(m.slice(COOKIE_KHOI.length + 1))) : null;
}

/** Chuỗi gán cookie khối, giữ 1 năm */
export function chuoiGhiCookie(khoi: number): string {
  return `${COOKIE_KHOI}=${khoi}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Lời nhắc AI viết sẵn cho khối 4 ("lớp 4", "KHỐI 4", "Tiếng Việt 4"…): đổi sang khối đang làm việc.
 * Chỉ đổi khi số 4 đứng riêng (không đụng "lớp 4A", "lớp 40"); khối 4 thì giữ nguyên.
 */
export function doiLopTrongLoiNhac(chu: string, khoi: number): string {
  if (khoi === KHOI_MAC_DINH || !chu) return chu;
  return chu.replace(/(lớp|Lớp|LỚP|khối|Khối|KHỐI)(\s+)4(?![\p{L}\p{N}])/gu, `$1$2${khoi}`)
    .replace(/(Tiếng Việt|Toán|Khoa học|Lịch sử và Địa lí|Công nghệ)\s4(?![\p{L}\p{N}])/gu, `$1 ${khoi}`);
}
