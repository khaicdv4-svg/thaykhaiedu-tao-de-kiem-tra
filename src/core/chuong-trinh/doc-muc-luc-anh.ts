/**
 * AI đọc ảnh trang mục lục SGK thành các dòng CSV (Tuần, Bài, Hoạt động, Nội dung, Trang đầu).
 * AI chỉ chép chữ nhìn thấy; kết quả vào ô xem trước để thầy đối chiếu, không tự lưu.
 */

export const HE_THONG_DOC_MUC_LUC = `Bạn đọc ảnh một trang MỤC LỤC sách giáo khoa tiểu học Việt Nam và chép lại thành bảng.
Quy tắc bắt buộc:
- Chỉ chép những gì NHÌN THẤY trên ảnh. Không đoán, không thêm bài, không suy ra số trang.
- Mỗi dòng ứng với một mục có số trang ở cuối dòng (trang đầu của mục đó).
- Trình bày mỗi dòng đúng 5 cột, ngăn cách bằng dấu Tab: Tuần, Bài, Hoạt động, Nội dung, Trang đầu.
- "Bài" chỉ là SỐ của bài (ví dụ 1, 2, 3). Bài nằm dưới chủ điểm hoặc chương nào thì giữ số bài đó.
- "Tuần": nếu ảnh có ghi tuần thì chép số, không có thì để trống.
- "Hoạt động" như trên ảnh (Đọc, Viết, Luyện từ và câu, Nói và nghe, Đọc mở rộng, Luyện tập...). Ảnh không phân hoạt động thì ghi "Bài học".
- Bỏ dòng tên chủ điểm, tên chương, lời nói đầu, bảng kí hiệu, trang bìa nếu không có số trang của một bài.
- Không viết lời giải thích, không dùng dấu ba chấm (\`\`\`). Trang không có mục lục thì không trả về gì.`;

export function loiNhacDocMucLuc(p: { mon: string; tap: number; trang: number }): string {
  return `Đây là ảnh trang ${p.trang || ''} của sách ${p.mon} lớp 4, tập ${p.tap}. Chép các mục lục có trên trang này theo đúng quy tắc.`;
}

/** Giữ lại dòng có 5 cột và cột cuối là số trang; bỏ dòng tiêu đề và dòng AI viết thêm. */
export function loaiDongChuaDung(traLoi: string): string[] {
  return traLoi
    .replace(/```[a-z]*\n?/g, '')
    .split(/\r?\n/)
    .map((d) => d.trimEnd())
    .filter((d) => {
      const c = d.split('\t');
      return c.length === 5 && /^\d+$/.test(c[4].trim()) && /^\d+$/.test(c[1].trim()) && c[2].trim() !== '' && c[3].trim() !== '';
    });
}
