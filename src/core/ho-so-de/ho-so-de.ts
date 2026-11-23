/**
 * ThayKhaiEdu - Hồ sơ đề: một bộ (Lớp 4 · môn · kì) dùng xuyên suốt 5 bước tạo đề.
 * Chọn một lần ở bước 1 (hoặc từ trang chủ), các bước sau giữ nguyên, không bắt chọn lại.
 *
 * Nguồn: ?mon=&ky= trên địa chỉ được ưu tiên; không có thì lấy hồ sơ lưu trên máy (localStorage).
 * Hàm thuần + vài hàm đọc ghi trình duyệt, gọi được an toàn khi không có window.
 */

import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';

export interface HoSoDe {
  mon: string;
  ky: KyDung;
}

export const KHOA_LUU_HO_SO = 'tke.hoSoDe';
/** Sự kiện báo hồ sơ vừa đổi, để thanh 5 bước và menu cập nhật đường dẫn */
export const SU_KIEN_HO_SO = 'tke-ho-so-de';

export const monHopLe = (m: string | null | undefined): m is string => !!m && MAU_MA_TRAN_CHUNG.some((x) => x.ma_mon === m);
export const kyHopLe = (k: string | null | undefined): k is KyDung => !!k && DANH_SACH_KY.some((x) => x.ma === k);

export const tenMonHoSo = (m: string) => MAU_MA_TRAN_CHUNG.find((x) => x.ma_mon === m)?.mon ?? m;
export const tenKyHoSo = (k: string) => DANH_SACH_KY.find((x) => x.ma === k)?.ten ?? k;

/** Đọc ?mon=&ky= từ chuỗi truy vấn. Thiếu hoặc sai thì trả null. */
export function hoSoTuTruyVan(search: string): HoSoDe | null {
  const p = new URLSearchParams(search);
  const mon = p.get('mon');
  const ky = p.get('ky');
  return monHopLe(mon) && kyHopLe(ky) ? { mon, ky } : null;
}

export function hoSoTuChuoiLuu(s: string | null): HoSoDe | null {
  if (!s) return null;
  try {
    const h = JSON.parse(s) as Partial<HoSoDe>;
    return monHopLe(h.mon) && kyHopLe(h.ky) ? { mon: h.mon, ky: h.ky } : null;
  } catch {
    return null;
  }
}

/** "?mon=TOAN&ky=CUOI_HK1" gắn vào đường dẫn một bước. Không có hồ sơ thì giữ nguyên đường dẫn. */
export function ganHoSo(href: string, h: HoSoDe | null): string {
  if (!h) return href;
  const [duong, truyVan = ''] = href.split('?');
  const p = new URLSearchParams(truyVan);
  p.set('mon', h.mon);
  p.set('ky', h.ky);
  return `${duong}?${p.toString()}`;
}

/** Hồ sơ hiện tại: địa chỉ trước, rồi bản lưu trên máy. */
export function docHoSoDe(): HoSoDe | null {
  if (typeof window === 'undefined') return null;
  const tuDiaChi = hoSoTuTruyVan(window.location.search);
  if (tuDiaChi) return tuDiaChi;
  try {
    return hoSoTuChuoiLuu(window.localStorage.getItem(KHOA_LUU_HO_SO));
  } catch {
    return null;
  }
}

export function luuHoSoDe(h: HoSoDe): void {
  if (typeof window === 'undefined' || !monHopLe(h.mon) || !kyHopLe(h.ky)) return;
  try {
    const cu = hoSoTuChuoiLuu(window.localStorage.getItem(KHOA_LUU_HO_SO));
    if (cu && cu.mon === h.mon && cu.ky === h.ky) return;
    window.localStorage.setItem(KHOA_LUU_HO_SO, JSON.stringify({ mon: h.mon, ky: h.ky }));
  } catch {
    /* không lưu được thì vẫn dùng trong trang này */
  }
  window.dispatchEvent(new Event(SU_KIEN_HO_SO));
}

/** Câu cần mở ngay khi vào trang (?cau=<khóa câu>), dùng khi bấm "Sửa câu này" từ màn Xem đề. */
export function cauTrenDiaChi(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('cau');
}

/** Đường dẫn mở đúng một câu ở một bước: "/dac-ta?mon=TOAN&ky=CUOI_HK1&cau=…". */
export function duongDanCau(href: string, h: HoSoDe, khoa: string): string {
  return `${ganHoSo(href, h)}&cau=${encodeURIComponent(khoa)}`;
}

/** Cuộn tới câu có id "cau-<khóa>" và tô viền vài giây cho dễ thấy. */
export function cuonToiCau(khoa: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(`cau-${khoa}`);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('ring-4', 'ring-amber-400', 'rounded-lg');
  window.setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400'), 4000);
  return true;
}

/** Cách lập ma trận riêng cho một môn, kì: từ ma trận chung của tổ, hoặc dựng khung từ chương trình. Chọn ở bước 1. */
export type CachLap = 'MA_TRAN_CHUNG' | 'CHUONG_TRINH';
const khoaCachLap = (mon: string, ky: string) => `tke.cachLap.${mon}.${ky}`;

export function docCachLap(mon: string, ky: string): CachLap {
  if (typeof window === 'undefined') return 'MA_TRAN_CHUNG';
  try { return window.localStorage.getItem(khoaCachLap(mon, ky)) === 'CHUONG_TRINH' ? 'CHUONG_TRINH' : 'MA_TRAN_CHUNG'; } catch { return 'MA_TRAN_CHUNG'; }
}

export function luuCachLap(mon: string, ky: string, c: CachLap): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(khoaCachLap(mon, ky), c); } catch { /* không lưu được thì thôi */ }
}
