/**
 * ThayKhaiEdu - Tìm web và mở trang (chỉ dùng ở máy chủ).
 * Có khóa TAVILY_API_KEY (biến môi trường) thì tìm bằng Tavily; không có thì thử DuckDuckGo (có thể bị chặn).
 */

import { chonUngVien, docKetQuaDuckDuckGo, docKetQuaTavily, htmlSangChu, taoTruyVan, trangKhopBai, trichQuanhBai, type KetQuaTim } from '@/core/reading-passages/tim-nguon-web';
import { laDiaChiNoiBo } from '@/lib/kiem-tra-link-nguon';

export interface KetQuaTimKiem {
  nhaCungCap: 'TAVILY' | 'DUCKDUCKGO';
  ketQua: KetQuaTim[];
  loi?: string;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export function coKhoaTavily(): boolean {
  return !!process.env.TAVILY_API_KEY?.trim();
}

export async function timKiemWeb(truyVan: string): Promise<KetQuaTimKiem> {
  const khoa = process.env.TAVILY_API_KEY?.trim();
  if (khoa) {
    try {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${khoa}` },
        body: JSON.stringify({ query: truyVan, max_results: 6, search_depth: 'basic', include_answer: false }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) return { nhaCungCap: 'TAVILY', ketQua: [], loi: `Tavily báo lỗi ${r.status}${r.status === 401 ? ' (khóa không đúng)' : r.status === 429 ? ' (hết hạn mức)' : ''}.` };
      return { nhaCungCap: 'TAVILY', ketQua: docKetQuaTavily(await r.json()) };
    } catch (e) {
      return { nhaCungCap: 'TAVILY', ketQua: [], loi: `Không gọi được Tavily: ${(e as Error).message}` };
    }
  }
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(truyVan)}&kl=vn-vi`, {
      headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'vi,en;q=0.8' },
      signal: AbortSignal.timeout(15_000),
    });
    const html = await r.text();
    if (!r.ok || /anomaly|captcha|unusual traffic/i.test(html)) {
      return { nhaCungCap: 'DUCKDUCKGO', ketQua: [], loi: `DuckDuckGo từ chối yêu cầu từ máy chủ (mã ${r.status}).` };
    }
    return { nhaCungCap: 'DUCKDUCKGO', ketQua: docKetQuaDuckDuckGo(html) };
  } catch (e) {
    return { nhaCungCap: 'DUCKDUCKGO', ketQua: [], loi: `Không gọi được DuckDuckGo: ${(e as Error).message}` };
  }
}

/** Mở một trang web, trả chữ thuần. Lỗi (không mở được, địa chỉ nội bộ, không phải trang chữ) thì ném ra. */
export async function layTrangWeb(url: string): Promise<{ url: string; tieuDe: string; vanBan: string }> {
  const u = new URL(url);
  if (!['http:', 'https:'].includes(u.protocol) || laDiaChiNoiBo(u.hostname)) throw new Error('Địa chỉ không hợp lệ.');
  const res = await fetch(u.toString(), {
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    headers: { 'user-agent': UA, accept: 'text/html,*/*' },
  });
  if (!res.ok) throw new Error(`Mã ${res.status}`);
  const loai = res.headers.get('content-type') ?? '';
  if (loai && !/text|html|xml/i.test(loai)) throw new Error('Không phải trang chữ.');
  const html = (await res.text()).slice(0, 2_000_000);
  return { url: res.url || u.toString(), ...htmlSangChu(html) };
}

export interface TrangDaKiem {
  url: string;
  tieuDe: string;
  trichDoan: string;
}

export interface KetQuaTimNguonWeb {
  trang: TrangDaKiem[];
  nhaCungCap: KetQuaTimKiem['nhaCungCap'];
  soCauTim: number;
  soUngVien: number;
  soTrangMo: number;
  loiTimKiem: string[];
}

/** App tự tìm web, mở các trang ứng viên và giữ lại những trang thật sự chứa bài đọc. */
export async function timTrangChuaBai(b: { tieuDe: string; tacGia?: string; noiDung: string }): Promise<KetQuaTimNguonWeb> {
  const truyVan = taoTruyVan(b);
  const dsKq = await Promise.all(truyVan.map((q) => timKiemWeb(q)));
  const ungVien = chonUngVien(dsKq.map((k) => k.ketQua));
  const trang: TrangDaKiem[] = [];
  let soTrangMo = 0;
  await Promise.all(
    ungVien.map(async (u) => {
      try {
        const t = await layTrangWeb(u.url);
        soTrangMo++;
        if (trangKhopBai(t.vanBan, b.noiDung).khop) {
          trang.push({ url: t.url, tieuDe: t.tieuDe, trichDoan: trichQuanhBai(t.vanBan, b.noiDung) });
        }
      } catch {
        /* trang không mở được thì bỏ qua */
      }
    }),
  );
  return {
    trang: trang.slice(0, 3),
    nhaCungCap: dsKq[0]?.nhaCungCap ?? 'DUCKDUCKGO',
    soCauTim: truyVan.length,
    soUngVien: ungVien.length,
    soTrangMo,
    loiTimKiem: [...new Set(dsKq.map((k) => k.loi).filter((x): x is string => !!x))],
  };
}
