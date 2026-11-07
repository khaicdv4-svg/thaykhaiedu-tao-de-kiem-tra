/**
 * ThayKhaiEdu - Tìm nguồn bài đọc bằng cách app tự tìm web (không nhờ model tìm web).
 * File này chỉ có phần thuần (không gọi mạng): viết câu tìm, đọc kết quả tìm kiếm,
 * chọn trang để mở, đối chiếu trang với bài đọc, trích đoạn quanh bài để AI đọc tác giả và nguồn.
 */

import { chuanHoaSoSanh } from '@/core/reading-passages/phan-tich';

export interface KetQuaTim {
  title: string;
  url: string;
  snippet: string;
}

const NFC = (s: string) => s.normalize('NFC');

/** Tối đa 4 câu tìm: tên bài + tác giả, một câu nguyên văn ở đầu bài, một câu ở giữa bài, tên bài + SGK. */
export function taoTruyVan(b: { tieuDe: string; tacGia?: string; noiDung: string }): string[] {
  const tu = chuanHoaSoSanh(NFC(b.noiDung)).split(' ').filter(Boolean);
  const cum = (i: number, n = 9) => tu.slice(i, i + n).join(' ');
  const ten = chuanHoaSoSanh(NFC(b.tieuDe));
  const tacGia = (b.tacGia ?? '').trim();
  const q: string[] = [];
  if (ten) q.push(`"${ten}" ${tacGia} lớp 4`.replace(/\s+/g, ' ').trim());
  if (tu.length >= 9) q.push(`"${cum(0)}"`);
  if (tu.length >= 30) q.push(`"${cum(Math.floor(tu.length / 2))}"`);
  if (ten) q.push(`${ten} Tiếng Việt 4 sách giáo khoa bài đọc`);
  return [...new Set(q)].slice(0, 4);
}

const TEN_MIEN_BO_QUA = ['facebook.com', 'youtube.com', 'youtu.be', 'tiktok.com', 'pinterest.', 'instagram.com', 'zalo.me'];

/** Gộp kết quả của nhiều câu tìm: trang nào xuất hiện nhiều lần thì đứng trước; bỏ trùng và trang mạng xã hội. */
export function chonUngVien(dsKetQua: KetQuaTim[][], toiDa = 8): KetQuaTim[] {
  const dem = new Map<string, { kq: KetQuaTim; lan: number; thuTu: number }>();
  let thuTu = 0;
  for (const ds of dsKetQua) {
    for (const k of ds) {
      if (!/^https?:\/\//i.test(k.url) || TEN_MIEN_BO_QUA.some((d) => k.url.toLowerCase().includes(d))) continue;
      const cu = dem.get(k.url);
      if (cu) cu.lan++;
      else dem.set(k.url, { kq: k, lan: 1, thuTu: thuTu++ });
    }
  }
  return [...dem.values()].sort((a, b) => b.lan - a.lan || a.thuTu - b.thuTu).slice(0, toiDa).map((x) => x.kq);
}

/** Trang có chứa bài đọc không: lấy 3 cụm 8 tiếng (đầu, giữa, cuối bài), thấy ít nhất 2 cụm thì khớp. */
export function trangKhopBai(vanBanTrang: string, noiDung: string): { khop: boolean; thay: number; tong: number } {
  const trang = ` ${chuanHoaSoSanh(NFC(vanBanTrang))} `;
  const tu = chuanHoaSoSanh(NFC(noiDung)).split(' ').filter(Boolean);
  const viTri = [0, Math.max(0, Math.floor(tu.length / 2) - 4), Math.max(0, tu.length - 8)];
  const cum = viTri.map((i) => tu.slice(i, i + 8).join(' ')).filter((c) => c.split(' ').length === 8);
  const thay = cum.filter((c) => trang.includes(` ${c} `)).length;
  return { khop: cum.length > 0 && thay >= Math.min(2, cum.length), thay, tong: cum.length };
}

/** Đoạn chữ quanh chỗ bài đọc xuất hiện trong trang (trước 600 kí tự, sau 500 kí tự), để đọc "Theo…", "Nguồn…", tên sách, số trang. */
export function trichQuanhBai(vanBanTrang: string, noiDung: string, toiDa = 2600): string {
  const mau = chuanHoaSoSanh(NFC(noiDung)).split(' ').filter(Boolean).slice(0, 5);
  const goc = NFC(vanBanTrang);
  const tok: { t: string; vt: number }[] = [];
  for (const m of goc.matchAll(/[\p{L}\p{N}]+/gu)) tok.push({ t: m[0].toLowerCase(), vt: m.index ?? 0 });
  let bat = -1;
  for (let i = 0; i + mau.length <= tok.length && bat < 0; i++) {
    if (mau.every((w, j) => tok[i + j].t === w)) bat = tok[i].vt;
  }
  if (bat < 0) return goc.slice(0, toiDa);
  return goc.slice(Math.max(0, bat - 600), Math.min(goc.length, bat + noiDung.length + 500)).slice(0, toiDa);
}

const THUC_THE: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function giaiMaThucThe(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => THUC_THE[n.toLowerCase()] ?? m);
}

const boThe = (s: string) => giaiMaThucThe(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Trang HTML -> chữ thường để đối chiếu (giữ xuống dòng ở các thẻ khối). */
export function htmlSangChu(html: string): { tieuDe: string; vanBan: string } {
  const tieuDe = boThe(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '');
  const vanBan = giaiMaThucThe(
    html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|tr|br)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/[ \t ]+/g, ' ').replace(/\n\s*/g, '\n').trim();
  return { tieuDe, vanBan };
}

/** Đọc trang kết quả của DuckDuckGo (bản html). Trả mảng rỗng nếu không nhận ra cấu trúc. */
export function docKetQuaDuckDuckGo(html: string): KetQuaTim[] {
  const kq: KetQuaTim[] = [];
  const khoi = html.split('class="result__a"').slice(1);
  for (const k of khoi) {
    const href = /href="([^"]+)"/.exec(k)?.[1];
    if (!href) continue;
    let url = giaiMaThucThe(href);
    const uddg = /[?&]uddg=([^&]+)/.exec(url)?.[1];
    if (uddg) url = decodeURIComponent(uddg);
    if (url.startsWith('//')) url = `https:${url}`;
    const title = boThe(/>([\s\S]*?)<\/a>/.exec(k)?.[1] ?? '');
    const snippet = boThe(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(k)?.[1] ?? '');
    if (/^https?:\/\//i.test(url)) kq.push({ title, url, snippet });
  }
  return kq;
}

/** Đọc kết quả của Tavily. */
export function docKetQuaTavily(json: unknown): KetQuaTim[] {
  const ds = (json as { results?: unknown })?.results;
  if (!Array.isArray(ds)) return [];
  return ds
    .map((r: any) => ({ title: String(r?.title ?? ''), url: String(r?.url ?? ''), snippet: String(r?.content ?? '').slice(0, 300) }))
    .filter((r) => /^https?:\/\//i.test(r.url));
}
