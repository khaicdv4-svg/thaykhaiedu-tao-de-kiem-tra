/**
 * Mục lục SGK: thầy tải file CSV hoặc dán bảng từ Excel (cột: Tuần, Bài, Hoạt động, Nội dung, Trang đầu).
 * Ứng dụng chỉ đọc, kiểm tra và đối chiếu với PPCT; không tự đoán số trang.
 */

export interface DongMucLuc { tuan: number | null; bai: number; hoatDong: string; noiDung: string; trang: number }
export interface TietDoiChieu { tuan: number | null; baiTen: string | null }
export interface KetQuaMucLuc { dong: DongMucLuc[]; loi: string[]; canhBao: string[] }

export const TIEU_DE_MAU = ['Tuần', 'Bài', 'Hoạt động', 'Nội dung', 'Trang đầu'];
export const CSV_MAU = `${TIEU_DE_MAU.join(',')}\n1,1,Đọc,Điều kì diệu,8\n1,1,Luyện từ và câu,Danh từ,9\n1,1,Viết,Tìm hiểu đoạn văn và câu chủ đề,10\n`;

/** Tách một dòng: ưu tiên dấu Tab (dán từ Excel), nếu không thì dấu phẩy hoặc chấm phẩy; hiểu ô đặt trong dấu nháy kép. */
function tachDong(dong: string): string[] {
  const dau = dong.includes('\t') ? '\t' : (dong.match(/;/g)?.length ?? 0) > (dong.match(/,/g)?.length ?? 0) ? ';' : ',';
  const kq: string[] = [];
  let o = '';
  let trongNhay = false;
  for (let i = 0; i < dong.length; i++) {
    const c = dong[i];
    if (c === '"') {
      if (trongNhay && dong[i + 1] === '"') { o += '"'; i++; } else trongNhay = !trongNhay;
    } else if (c === dau && !trongNhay) { kq.push(o.trim()); o = ''; } else o += c;
  }
  kq.push(o.trim());
  return kq;
}

const soNguyen = (s: string): number | null => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
const soBai = (s: string | null | undefined) => /(?:^|[^\p{L}\d])bài\s*(\d+)\b/iu.exec(s ?? '')?.[1];

/**
 * Đọc và kiểm tra mục lục. `tiet` (PPCT của môn) là tùy chọn: có thì đối chiếu bài và tuần, lệch chỉ cảnh báo.
 * Lỗi (chặn lưu): thiếu hoạt động, bài hoặc trang không phải số nguyên dương, trùng dòng.
 */
export function docMucLuc(chu: string, tiet: TietDoiChieu[] = []): KetQuaMucLuc {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const dong: DongMucLuc[] = [];
  const dongChu = chu.replace(/^﻿/, '').split(/\r?\n/);
  const daCo = new Set<string>();
  dongChu.forEach((raw, i) => {
    if (!raw.trim()) return;
    const o = tachDong(raw);
    const stt = i + 1;
    // Dòng tiêu đề: ô thứ hai không phải số
    if (dong.length === 0 && soNguyen(o[1] ?? '') === null && /bài/i.test(o[1] ?? '')) return;
    const bai = soNguyen(o[1] ?? '');
    const trang = soNguyen(o[4] ?? '');
    const tuanChu = (o[0] ?? '').trim();
    const tuan = tuanChu ? soNguyen(tuanChu) : null;
    if (o.length < 5) { loi.push(`Dòng ${stt}: cần đủ 5 cột (Tuần, Bài, Hoạt động, Nội dung, Trang đầu).`); return; }
    if (bai === null || bai < 1) { loi.push(`Dòng ${stt}: cột Bài phải là số nguyên (ví dụ 3).`); return; }
    if (trang === null || trang < 1) { loi.push(`Dòng ${stt}: cột Trang đầu phải là số nguyên lớn hơn 0.`); return; }
    if (tuanChu && (tuan === null || tuan < 1 || tuan > 40)) { loi.push(`Dòng ${stt}: cột Tuần phải từ 1 đến 40 (hoặc để trống).`); return; }
    if (!o[2]) { loi.push(`Dòng ${stt}: thiếu hoạt động (Đọc, Viết, Luyện từ và câu…).`); return; }
    const khoa = `${bai}|${o[2].toLowerCase()}|${o[3].toLowerCase()}`;
    if (daCo.has(khoa)) { loi.push(`Dòng ${stt}: trùng với một dòng trên (bài ${bai}, ${o[2]}${o[3] ? `: ${o[3]}` : ''}).`); return; }
    daCo.add(khoa);
    dong.push({ tuan, bai, hoatDong: o[2], noiDung: o[3], trang });
  });
  if (!dong.length && !loi.length) loi.push('Chưa có dòng nào. Dán bảng mục lục hoặc chọn file CSV.');

  // Trang phải tăng dần theo thứ tự bài
  const theoBai = new Map<number, number>();
  for (const d of dong) theoBai.set(d.bai, Math.min(theoBai.get(d.bai) ?? Infinity, d.trang));
  const bai = [...theoBai.keys()].sort((a, b) => a - b);
  for (let k = 1; k < bai.length; k++) {
    if ((theoBai.get(bai[k]) ?? 0) < (theoBai.get(bai[k - 1]) ?? 0)) canhBao.push(`Trang đầu bài ${bai[k]} (tr. ${theoBai.get(bai[k])}) nhỏ hơn bài ${bai[k - 1]} (tr. ${theoBai.get(bai[k - 1])}). Thầy xem lại.`);
  }
  for (let n = 1; n < bai.length; n++) if (bai[n] - bai[n - 1] > 1) canhBao.push(`Thiếu bài ${bai[n - 1] + 1}${bai[n] - bai[n - 1] > 2 ? ` đến bài ${bai[n] - 1}` : ''} trong mục lục.`);

  // Đối chiếu với PPCT
  if (tiet.length) {
    const tuanTheoBai = new Map<number, Set<number>>();
    for (const t of tiet) {
      const n = soBai(t.baiTen);
      if (!n) continue;
      const s = tuanTheoBai.get(Number(n)) ?? new Set<number>();
      if (t.tuan !== null) s.add(t.tuan);
      tuanTheoBai.set(Number(n), s);
    }
    const daBao = new Set<number>();
    for (const d of dong) {
      if (daBao.has(d.bai)) continue;
      const tuanPpct = tuanTheoBai.get(d.bai);
      if (!tuanPpct) { canhBao.push(`Bài ${d.bai} không có trong phân phối chương trình của môn này.`); daBao.add(d.bai); continue; }
      if (d.tuan !== null && tuanPpct.size && !tuanPpct.has(d.tuan)) { canhBao.push(`Bài ${d.bai}: mục lục ghi tuần ${d.tuan}, phân phối chương trình xếp tuần ${[...tuanPpct].sort((a, b) => a - b).join(', ')}.`); daBao.add(d.bai); }
    }
  }
  return { dong, loi, canhBao };
}

/**
 * Tập một thường dạy học kì I (tuần 1–18), tập hai học kì II (tuần 19–35).
 * Dữ liệu có ghi tuần mà rơi hẳn sang học kì kia thì nhắc thầy xem có chọn nhầm tập không.
 */
export function canhBaoNhamTap(dong: DongMucLuc[], tap: number): string | null {
  const tuan = dong.map((d) => d.tuan).filter((t): t is number => t !== null);
  if (!tuan.length) return null;
  const min = Math.min(...tuan);
  const max = Math.max(...tuan);
  if (tap === 1 && min >= 19) return `Bảng này có tuần ${min}–${max} (học kì II) nhưng đang chọn Tập một. Có thể thầy chọn nhầm tập, nên chọn Tập hai.`;
  if (tap === 2 && max <= 18) return `Bảng này có tuần ${min}–${max} (học kì I) nhưng đang chọn Tập hai. Có thể thầy chọn nhầm tập, nên chọn Tập một.`;
  return null;
}
