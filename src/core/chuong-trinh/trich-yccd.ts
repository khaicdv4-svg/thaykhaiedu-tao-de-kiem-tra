/**
 * AI trích YCCĐ từ tài liệu chương trình. AI chỉ được chép lại từ tài liệu thầy cung cấp.
 * Mỗi YCCĐ phải kèm một đoạn nguyên văn; code kiểm tra đoạn đó có thật trong tài liệu, không thấy thì gắn cờ.
 */

import { TEN_MON, TEN_LOAI_TAI_LIEU } from './mon';

export interface YccdTho {
  mach: string | null;
  chuDe: string | null;
  bai: string | null;
  noiDung: string;
  trichDan: string;
}

export interface YccdDaKiem extends YccdTho {
  trichKhop: boolean;
}

export const KICH_THUOC_PHAN = 9000;
export const TOI_DA_PHAN = 40;

export const HE_THONG_TRICH_YCCD = `Bạn là trợ lí chuyên môn tiểu học Việt Nam. Nhiệm vụ: trích các "yêu cầu cần đạt" (YCCĐ) từ đoạn tài liệu giáo viên cung cấp.
Quy tắc bắt buộc:
- Chỉ chép lại những gì CÓ trong đoạn tài liệu. Không thêm, không suy đoán, không dùng kiến thức bên ngoài.
- Không có YCCĐ trong đoạn thì trả về mảng rỗng [].
- Chỉ lấy YCCĐ của đúng môn và đúng lớp được nêu. Đoạn nói về lớp khác thì bỏ qua.
- Mỗi YCCĐ là một ý riêng, giữ nguyên lời văn gốc (có thể bỏ gạch đầu dòng, số thứ tự).
- "trichDan" là một câu hoặc cụm nguyên văn (tối đa 300 kí tự) có thật trong đoạn tài liệu, chứa YCCĐ đó.
- "mach" là mạch nội dung/chủ đề lớn (ví dụ "Số và phép tính", "Chất", "Đọc"); "chuDe" là chủ đề/chương nhỏ hơn; "bai" là tên bài nếu có. Không rõ thì để null.
Chỉ trả về JSON hợp lệ, không viết thêm gì:
[{"mach":string|null,"chuDe":string|null,"bai":string|null,"noiDung":string,"trichDan":string}]`;

export function loiNhacTrichYccd(p: { mon: string; lop: number; loai: string; tieuDe: string; phan: string; stt: number; tong: number }): string {
  return `Môn: ${TEN_MON[p.mon] ?? p.mon}. Lớp: ${p.lop}. Loại tài liệu: ${TEN_LOAI_TAI_LIEU[p.loai] ?? p.loai} "${p.tieuDe}". Đây là phần ${p.stt}/${p.tong}.
Trích các YCCĐ của môn ${TEN_MON[p.mon] ?? p.mon} lớp ${p.lop} có trong đoạn sau.

<tai_lieu>
${p.phan}
</tai_lieu>`;
}

/** Cắt tài liệu thành các phần ≤ KICH_THUOC_PHAN kí tự, ưu tiên cắt ở chỗ xuống dòng. */
export function chiaPhan(noiDung: string, kichThuoc = KICH_THUOC_PHAN): string[] {
  const s = noiDung.replace(/\r/g, '').trim();
  if (!s) return [];
  const kq: string[] = [];
  let i = 0;
  while (i < s.length) {
    let den = Math.min(s.length, i + kichThuoc);
    if (den < s.length) {
      const nl = s.lastIndexOf('\n', den);
      if (nl > i + kichThuoc * 0.6) den = nl;
    }
    kq.push(s.slice(i, den).trim());
    i = den;
  }
  return kq.filter(Boolean);
}

/** Bỏ dấu câu, đưa về chữ thường, gộp khoảng trắng để so khớp nguyên văn. */
export function chuanHoaDeSoKhop(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‐-―]/g, '-')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const nhan = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t || null;
};

/** Đọc JSON AI trả về (có thể bọc trong ```). Sai dạng thì trả null. */
export function docYccdAI(traLoi: string): YccdTho[] | null {
  const t = traLoi.replace(/```(?:json)?/gi, '').trim();
  const dau = t.indexOf('[');
  const cuoi = t.lastIndexOf(']');
  if (dau < 0 || cuoi <= dau) return null;
  try {
    const arr = JSON.parse(t.slice(dau, cuoi + 1)) as unknown;
    if (!Array.isArray(arr)) return null;
    const kq: YccdTho[] = [];
    for (const x of arr) {
      if (!x || typeof x !== 'object') continue;
      const r = x as Record<string, unknown>;
      const noiDung = nhan(r.noiDung);
      const trichDan = nhan(r.trichDan);
      if (!noiDung || !trichDan) continue;
      kq.push({ mach: nhan(r.mach), chuDe: nhan(r.chuDe), bai: nhan(r.bai), noiDung, trichDan });
    }
    return kq;
  } catch {
    return null;
  }
}

/**
 * So từng YCCĐ với đoạn tài liệu gốc. trichKhop = đoạn trích dẫn có thật trong tài liệu
 * (so sau khi bỏ dấu câu). Bỏ YCCĐ trùng nhau trong cùng lượt.
 */
export function kiemTraTrich(ds: YccdTho[], tai: string): YccdDaKiem[] {
  const goc = ` ${chuanHoaDeSoKhop(tai)} `;
  const thay = new Set<string>();
  const kq: YccdDaKiem[] = [];
  for (const y of ds) {
    const khoa = chuanHoaDeSoKhop(y.noiDung);
    if (!khoa || thay.has(khoa)) continue;
    thay.add(khoa);
    const td = chuanHoaDeSoKhop(y.trichDan);
    const nd = chuanHoaDeSoKhop(y.noiDung);
    const trichKhop = (td.length >= 10 && goc.includes(` ${td} `)) || (nd.length >= 10 && goc.includes(` ${nd} `));
    kq.push({ ...y, trichKhop });
  }
  return kq;
}
