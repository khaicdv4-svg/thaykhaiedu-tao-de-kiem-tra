import { NextRequest, NextResponse } from 'next/server';
import { lamSachUrl } from '@/core/reading-passages/kiem-tra';
import { chuanHoaSoSanh } from '@/core/reading-passages/phan-tich';

/** Không cho kiểm tra địa chỉ nội bộ (tránh dùng máy chủ để dò mạng trong). */
function laDiaChiNoiBo(host: string) {
  const h = host.toLowerCase();
  return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '0.0.0.0' || h.startsWith('[') ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

/**
 * Mở thử link nguồn, xem trang có chứa nội dung bài đọc không.
 * CON_TON_TAI: mở được và thấy đoạn văn; KHONG_KHOP_NOI_DUNG: mở được nhưng không thấy; KHONG_MO_DUOC: lỗi.
 */
export async function POST(req: NextRequest) {
  const { url, noiDung } = (await req.json()) as { url?: string; noiDung?: string };
  let u: URL;
  try {
    u = new URL(lamSachUrl(url || ''));
    if (!['http:', 'https:'].includes(u.protocol) || laDiaChiNoiBo(u.hostname)) throw new Error();
  } catch {
    return NextResponse.json({ trangThai: 'KHONG_MO_DUOC', lyDo: 'Link không hợp lệ.' });
  }
  try {
    const res = await fetch(u.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'ThayKhaiEdu-KiemTraNguon/1.0', Accept: 'text/html,*/*' },
    });
    if (!res.ok) return NextResponse.json({ trangThai: 'KHONG_MO_DUOC', lyDo: `Trang trả về mã ${res.status}.`, url: u.toString() });
    const html = (await res.text()).slice(0, 2_000_000);
    const trang = ` ${chuanHoaSoSanh(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))} `;
    const tu = chuanHoaSoSanh(noiDung || '').split(' ').filter(Boolean);
    // Lấy 3 cụm 8 tiếng ở đầu, giữa, cuối bài; thấy ít nhất 2 cụm thì coi là khớp
    const viTri = [0, Math.max(0, Math.floor(tu.length / 2) - 4), Math.max(0, tu.length - 8)];
    const cum = viTri.map((i) => tu.slice(i, i + 8).join(' ')).filter((c) => c.split(' ').length === 8);
    const thay = cum.filter((c) => trang.includes(` ${c} `)).length;
    const khop = cum.length === 0 ? true : thay >= Math.min(2, cum.length);
    return NextResponse.json({
      trangThai: khop ? 'CON_TON_TAI' : 'KHONG_KHOP_NOI_DUNG',
      lyDo: khop ? 'Mở được, thấy nội dung bài đọc trên trang.' : 'Mở được nhưng không thấy nội dung bài đọc trên trang.',
      url: u.toString(),
    });
  } catch {
    return NextResponse.json({ trangThai: 'KHONG_MO_DUOC', lyDo: 'Không mở được trang (hết thời gian hoặc lỗi mạng).', url: u.toString() });
  }
}
