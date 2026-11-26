/**
 * ThayKhaiEdu - Lời nhắc và đọc kết quả AI soạn câu hỏi cho bài đọc thành tiếng (mỗi bài một câu hỏi, một đáp án).
 * Hàm thuần.
 */

export const HE_THONG_CAU_HOI_DOC_TIENG = `Bạn là giáo viên tiểu học Việt Nam (TP.HCM), soạn câu hỏi cho phần kiểm tra đọc thành tiếng lớp 4.
Mỗi đoạn đọc: một câu hỏi ngắn hỏi về một chi tiết có ngay trong đoạn, học sinh trả lời miệng sau khi đọc.
Yêu cầu:
- Câu hỏi ngắn, rõ, một ý; từ ngữ quen thuộc với học sinh miền Nam; không đánh đố.
- Câu trả lời nằm trong đoạn đọc; đáp án ghi ngắn gọn, đúng chi tiết trong đoạn.
- Không hỏi về tên tác giả, nguồn.
Chỉ trả về JSON dạng: [{"cauHoi":"...","traLoi":"..."}], đúng thứ tự và đúng số đoạn được gửi, không thêm chữ nào khác.`;

export function loiNhacCauHoiDocTieng(ds: { tieuDe: string; noiDung: string }[]): string {
  return ds.map((b, i) => `Đoạn ${i + 1} – ${b.tieuDe || '(không tên)'}:\n${b.noiDung.trim()}`).join('\n\n');
}

/** Đọc mảng JSON trong câu trả lời của AI; thiếu hoặc sai thì trả phần tử rỗng. */
export function docCauHoiDocTieng(traLoi: string, soBai: number): { cauHoi: string; traLoi: string }[] {
  const kq = Array.from({ length: soBai }, () => ({ cauHoi: '', traLoi: '' }));
  const m = traLoi.match(/\[[\s\S]*\]/);
  if (!m) return kq;
  try {
    const arr = JSON.parse(m[0]) as unknown[];
    arr.slice(0, soBai).forEach((x, i) => {
      const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
      kq[i] = {
        cauHoi: typeof o.cauHoi === 'string' ? o.cauHoi.trim().slice(0, 500) : '',
        traLoi: typeof o.traLoi === 'string' ? o.traLoi.trim().slice(0, 1000) : '',
      };
    });
  } catch { /* để trống */ }
  return kq;
}
