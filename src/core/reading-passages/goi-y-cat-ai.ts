/**
 * ThayKhaiEdu - AI chọn đoạn cắt cho bài đọc thành tiếng.
 *
 * Code (cat-doan.ts) tìm các đoạn đúng số tiếng, ngắt tự nhiên. AI không đếm tiếng:
 * AI chỉ chọn đoạn nào trọn nghĩa nhất, có chi tiết để hỏi 1 câu. Không gọi được AI thì dùng thứ tự của code.
 */

import type { DoanCat } from '@/core/reading-passages/cat-doan';

export const HE_THONG_CHON_DOAN =
  'Bạn hỗ trợ giáo viên lớp 4 chọn đoạn trích cho phần đọc thành tiếng. Chỉ chọn trong các đoạn được đưa; không viết lại, không sửa chữ. ' +
  'Trả lời đúng một dòng JSON: {"chon": số thứ tự, "lyDo": "một câu ngắn"}.';

export function loiNhacChonDoan(tieuDe: string, ungVien: DoanCat[]): string {
  const ds = ungVien.map((d, i) => `Đoạn ${i + 1} (${d.soTieng} tiếng, ngắt: ${d.ketThuc}):\n${d.doan}`).join('\n\n');
  return (
    `Bài "${tieuDe}". Chọn đoạn đọc thành tiếng cho học sinh lớp 4: ý trọn vẹn, câu chữ dễ đọc, ` +
    `có một chi tiết rõ để giáo viên hỏi một câu, không bắt đầu hoặc kết thúc dở ý.\n\n${ds}`
  );
}

/** Đọc câu trả lời của AI; trả về chỉ số (từ 0) hoặc null nếu không hợp lệ. */
export function docLuaChonAI(traLoi: string, soUngVien: number): { chi: number; lyDo: string } | null {
  const m = traLoi.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as { chon?: unknown; lyDo?: unknown };
    const n = typeof o.chon === 'number' ? o.chon : Number(o.chon);
    if (!Number.isInteger(n) || n < 1 || n > soUngVien) return null;
    return { chi: n - 1, lyDo: typeof o.lyDo === 'string' ? o.lyDo.trim() : '' };
  } catch {
    return null;
  }
}
