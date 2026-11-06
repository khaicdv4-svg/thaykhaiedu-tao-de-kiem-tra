/**
 * ThayKhaiEdu - AI chỉnh độ dài bài đọc (thêm / bớt ít tiếng cho đúng quy định).
 *
 * Quy định (thầy Khái chốt 06/11/2026):
 * - Ưu tiên cắt đoạn trọn ý (cat-doan.ts). Chỉ chỉnh khi lệch ít.
 * - Bớt: lược câu, ý phụ. Thêm: rất ít (từ nối, vế tả), không thêm sự việc, nhân vật, ý mới.
 * - Tổng số tiếng thêm + bớt không quá 15% số tiếng bài gốc.
 * - Bài đã chỉnh ghi tác giả "Theo …" và gắn nhãn "Có AI chỉnh sửa thêm … / bớt … tiếng".
 * - Code đếm tiếng và so sánh, không tin số AI tự báo.
 */

import { countVietnameseSyllables } from '@/core/utils/vietnamese-word-counter';
import type { KhoangDoDai } from './quy-dinh';

export const TI_LE_CHINH_TOI_DA = 0.15;

export type LoaiDoan = 'GIU' | 'THEM' | 'BOT';
export interface DoanSoSanh { loai: LoaiDoan; chu: string }

export interface KetQuaSoSanh {
  doan: DoanSoSanh[];
  them: number;
  bot: number;
}

/** Tách chữ và dấu câu thành từng phần riêng, để đổi dấu câu không bị tính là đổi chữ. */
const tachTu = (s: string) => s.normalize('NFC').match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
const DAU_DONG = /^[.,;:!?…)\]}”’»]$/;
const DAU_MO = /^[(\[{“‘«]$/;

/** So sánh theo từng chữ (LCS). Mỗi đoạn đã kèm khoảng trắng đúng chỗ để hiển thị lại. */
export function soSanhBaiDoc(goc: string, moi: string): KetQuaSoSanh {
  const a = tachTu(goc);
  const b = tachTu(moi);
  const n = a.length, m = b.length;
  // Bảng LCS (tối đa vài trăm chữ mỗi bài, đủ nhanh)
  const L: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const doan: DoanSoSanh[] = [];
  let truoc = '';
  const day = (loai: LoaiDoan, tu: string) => {
    const cach = !truoc || DAU_DONG.test(tu) || DAU_MO.test(truoc) || tu === '"' ? '' : ' ';
    truoc = tu;
    const cuoi = doan[doan.length - 1];
    if (cuoi && cuoi.loai === loai) cuoi.chu += cach + tu;
    else doan.push({ loai, chu: cach + tu });
  };
  let i = 0, j = 0, them = 0, bot = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { day('GIU', a[i]); i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { day('THEM', b[j]); them += countVietnameseSyllables(b[j]); j++; }
    else { day('BOT', a[i]); bot += countVietnameseSyllables(a[i]); i++; }
  }
  return { doan, them, bot };
}

/** Số tiếng cần đạt gần nhất: trong khoảng thì giữ, ngoài khoảng thì về biên gần nhất. */
export function mucTieu(soTieng: number, k: Pick<KhoangDoDai, 'min' | 'max'>): number {
  return Math.min(Math.max(soTieng, k.min), k.max);
}

/** Lệch bao nhiêu thì còn chỉnh được (không quá 15% bài gốc). */
export function chinhDuoc(soTieng: number, k: Pick<KhoangDoDai, 'min' | 'max'>): { duoc: boolean; canDoi: number; toiDa: number } {
  const canDoi = Math.abs(mucTieu(soTieng, k) - soTieng);
  const toiDa = Math.floor(soTieng * TI_LE_CHINH_TOI_DA);
  return { duoc: canDoi > 0 && canDoi <= toiDa, canDoi, toiDa };
}

export interface KiemTraBanChinh {
  hopLe: boolean;
  loi: string[];
  soTieng: number;
  them: number;
  bot: number;
  doan: DoanSoSanh[];
  nhan: string;
}

/** Nhãn gắn với bài đã chỉnh. */
export function nhanAIChinh(them: number, bot: number): string {
  const phan = [them ? `thêm ${them}` : '', bot ? `bớt ${bot}` : ''].filter(Boolean).join(', ');
  return `Có AI chỉnh sửa ${phan || 'thêm 0'} tiếng`;
}

/** Kiểm tra bản AI chỉnh so với bản gốc: đúng độ dài, không đổi quá 15%. */
export function kiemTraBanChinh(goc: string, moi: string, k: KhoangDoDai): KiemTraBanChinh {
  const ss = soSanhBaiDoc(goc, moi);
  const soGoc = countVietnameseSyllables(goc);
  const soTieng = countVietnameseSyllables(moi);
  const loi: string[] = [];
  if (!moi.trim()) loi.push('AI trả về bài rỗng.');
  if (soTieng < k.min - k.dungSai || soTieng > k.max + k.dungSai) {
    loi.push(`Bản chỉnh có ${soTieng} tiếng, vẫn ngoài quy định ${k.min} – ${k.max} (±${k.dungSai}).`);
  }
  const doi = ss.them + ss.bot;
  const toiDa = Math.floor(soGoc * TI_LE_CHINH_TOI_DA);
  if (doi > toiDa) loi.push(`AI đổi ${doi} tiếng (thêm ${ss.them}, bớt ${ss.bot}), quá 15% bài gốc (tối đa ${toiDa} tiếng).`);
  if (doi === 0) loi.push('AI không thay đổi gì.');
  return { hopLe: loi.length === 0, loi, soTieng, them: ss.them, bot: ss.bot, doan: ss.doan, nhan: nhanAIChinh(ss.them, ss.bot) };
}

/** Tác giả của bài đã chỉnh ghi "Theo …". */
export function tacGiaTheo(tacGia: string): string {
  const t = tacGia.trim();
  if (!t) return t;
  return /^theo\s/i.test(t) ? t : `Theo ${t}`;
}

export const HE_THONG_CHINH_DO_DAI =
  'Bạn giúp tổ chuyên môn lớp 4 chỉnh nhẹ độ dài một bài đọc đã xuất bản để làm đề kiểm tra. ' +
  'Giữ nguyên lời văn, giọng văn, nội dung chính và mọi chi tiết quan trọng của tác giả. ' +
  'Muốn bớt: lược câu hoặc vế phụ, câu lặp ý. Muốn thêm: chỉ thêm rất ít từ nối hoặc một vế tả ngắn hợp mạch văn; ' +
  'không thêm sự việc, nhân vật, ý mới. Không sửa các câu còn lại. ' +
  'Trả lời đúng một khối JSON: {"noiDung": "toàn bộ bài sau khi chỉnh", "ghiChu": "một câu ngắn nói đã thêm/bớt ở đâu"}.';

export function loiNhacChinhDoDai(tieuDe: string, noiDung: string, soTieng: number, k: KhoangDoDai): string {
  const muc = mucTieu(soTieng, k);
  const huong = soTieng > muc ? `bớt khoảng ${soTieng - muc} tiếng` : `thêm khoảng ${muc - soTieng} tiếng`;
  return [
    `Bài "${tieuDe}" hiện có ${soTieng} tiếng. Quy định: ${k.min} – ${k.max} tiếng.`,
    `Hãy ${huong} để bài nằm trong ${k.min} – ${k.max} tiếng (một "tiếng" là một âm tiết).`,
    `Tổng số tiếng thêm và bớt không vượt quá ${Math.floor(soTieng * TI_LE_CHINH_TOI_DA)} tiếng.`,
    'Giữ nguyên cách xuống dòng của bài.',
    '',
    'Bài gốc:',
    noiDung,
  ].join('\n');
}

/** Đọc JSON AI trả về. */
export function docBanChinhAI(traLoi: string): { noiDung: string; ghiChu: string } | null {
  const m = traLoi.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as { noiDung?: unknown; ghiChu?: unknown };
    if (typeof o.noiDung !== 'string' || !o.noiDung.trim()) return null;
    return { noiDung: o.noiDung.trim(), ghiChu: typeof o.ghiChu === 'string' ? o.ghiChu.trim() : '' };
  } catch {
    return null;
  }
}
