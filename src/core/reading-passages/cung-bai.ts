/**
 * ThayKhaiEdu - Hai bài đọc có phải cùng một bài không.
 * Quy tắc của tổ: trong một đề, bài đọc hiểu và các bài đọc thành tiếng không được lấy cùng một bài
 * (đoạn trích từ cùng một bài dài cũng tính là cùng bài).
 */

export function chuanHoaTieuDe(t: string): string {
  return t
    .toLowerCase()
    .replace(/\((đoạn )?trích[^)]*\)/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function laCungBai(a: { id?: string; tieuDe: string }, b: { id?: string; tieuDe: string }): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  const x = chuanHoaTieuDe(a.tieuDe);
  return x !== '' && x === chuanHoaTieuDe(b.tieuDe);
}
