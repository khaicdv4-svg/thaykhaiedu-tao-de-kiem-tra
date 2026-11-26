/**
 * ThayKhaiEdu - Đọc khối làm việc ở máy chủ (API, repository) từ cookie `tke_khoi`.
 * Không có cookie hoặc gọi ngoài yêu cầu thì dùng khối mặc định.
 */

import { cookies } from 'next/headers';
import { COOKIE_KHOI, KHOI_MAC_DINH, chuanHoaKhoi, docKhoi } from '@/core/khoi-lam-viec';

export async function layKhoiLamViec(): Promise<number> {
  try {
    const c = await cookies();
    return chuanHoaKhoi(c.get(COOKIE_KHOI)?.value);
  } catch {
    return KHOI_MAC_DINH;
  }
}

/** Khối gửi kèm yêu cầu (?lop=, { lop }) nếu hợp lệ; không có thì lấy khối làm việc. */
export async function khoiHoacLamViec(v: unknown): Promise<number> {
  return docKhoi(v) ?? (await layKhoiLamViec());
}
