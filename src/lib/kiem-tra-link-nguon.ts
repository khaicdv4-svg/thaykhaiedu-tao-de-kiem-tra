/**
 * Mở thử link nguồn, xem trang có chứa nội dung bài đọc không (dùng ở máy chủ).
 * CON_TON_TAI: mở được và thấy đoạn văn; KHONG_KHOP_NOI_DUNG: mở được nhưng không thấy; KHONG_MO_DUOC: lỗi.
 */

import { lamSachUrl, type TrangThaiLink } from '@/core/reading-passages/kiem-tra';
import { htmlSangChu, trangKhopBai } from '@/core/reading-passages/tim-nguon-web';

/** Không cho kiểm tra địa chỉ nội bộ (tránh dùng máy chủ để dò mạng trong). */
export function laDiaChiNoiBo(host: string) {
  const h = host.toLowerCase();
  return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '0.0.0.0' || h.startsWith('[') ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

export interface KetQuaKiemLink {
  trangThai: TrangThaiLink;
  lyDo: string;
  url?: string;
}

export async function kiemTraLinkNguon(url: string | undefined, noiDung: string | undefined): Promise<KetQuaKiemLink> {
  let u: URL;
  try {
    u = new URL(lamSachUrl(url || ''));
    if (!['http:', 'https:'].includes(u.protocol) || laDiaChiNoiBo(u.hostname)) throw new Error();
  } catch {
    return { trangThai: 'KHONG_MO_DUOC', lyDo: 'Link không hợp lệ.' };
  }
  try {
    const res = await fetch(u.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'ThayKhaiEdu-KiemTraNguon/1.0', Accept: 'text/html,*/*' },
    });
    if (!res.ok) return { trangThai: 'KHONG_MO_DUOC', lyDo: `Trang trả về mã ${res.status}.`, url: u.toString() };
    const html = (await res.text()).slice(0, 2_000_000);
    const kh = trangKhopBai(htmlSangChu(html).vanBan, noiDung || '');
    const khop = kh.tong === 0 ? true : kh.khop;
    return {
      trangThai: khop ? 'CON_TON_TAI' : 'KHONG_KHOP_NOI_DUNG',
      lyDo: khop ? 'Mở được, thấy nội dung bài đọc trên trang.' : 'Mở được nhưng không thấy nội dung bài đọc trên trang.',
      url: u.toString(),
    };
  } catch {
    return { trangThai: 'KHONG_MO_DUOC', lyDo: 'Không mở được trang (hết thời gian hoặc lỗi mạng).', url: u.toString() };
  }
}
