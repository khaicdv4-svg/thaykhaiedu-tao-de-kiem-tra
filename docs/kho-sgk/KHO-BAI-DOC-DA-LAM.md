# Kho bài đọc – phần đã làm (05/11/2026)

Theo yêu cầu của chủ dự án: tải file cho máy phân tích và nhập kho, AI tìm bài, người dùng duyệt rồi mới lưu vào kho; tạo đề phải gắn với ma trận và SGK.

## Cơ sở dữ liệu (đã chạy trên project thử `tao-de-thu-nghiem`)

Migration `supabase/migrations/20261105113604_kho_bai_doc_va_kho_sgk.sql`:
- `reading_passages` thêm cột: loại bài (`reading_use`), kì, thể loại, link nguồn và kết quả mở link, tỉ lệ trùng SGK, nguồn gốc (tải file / AI tìm / nhập tay), kết quả kiểm tra, người duyệt.
- Trigger `guard_reading_passage_review`: chỉ tổ trưởng / quản trị được chuyển bài sang `APPROVED` hoặc `REJECTED` (đã thử: giáo viên bị chặn, tổ trưởng duyệt được).
- Bảng mới: `reading_passage_usages`, `sgk_books`, `sgk_sections`, `ppct_sgk_links`, có RLS theo trường.

## Mã nguồn

| File | Việc |
|---|---|
| `src/core/reading-passages/quy-dinh.ts` | Quy định của tổ: độ dài theo kì × thể loại, chủ điểm theo kì, ngưỡng trùng SGK (chặn 30%, cảnh báo 10%) |
| `src/core/reading-passages/sgk-tieng-viet-4.ts` | 62 bài đọc SGK Tiếng Việt 4 bản 2026 – 2027 để chặn trùng theo tên |
| `src/core/reading-passages/phan-tich.ts` | Tách nhiều bài trong một file; nhận tên bài, tác giả "(Theo …)", nguồn "(Nguồn: …)", link; đoán thể loại, chủ điểm, kì, loại bài |
| `src/core/reading-passages/kiem-tra.ts` | Kiểm tra: thiếu tác giả/nguồn, nguồn là SGK, link chưa kiểm/không mở/không khớp, độ dài, chủ điểm sai kì, trùng SGK theo tên và theo nội dung (cụm 8 tiếng) |
| `src/core/utils/docx-text.ts` | Đọc chữ file .docx không cần thư viện ngoài |
| `src/core/services/ai/reading-passage-ai.ts` | Chỗ cắm AI (chưa có khóa); lời nhắc tìm bài viết sẵn theo quy định của tổ |
| `src/core/exam-generation/dieu-kien-tao-de.ts` | Cửa chặn trước khi tạo đề: ma trận riêng đã xác nhận; Tiếng Việt phải có bài đọc hiểu + 4 bài đọc thành tiếng đã duyệt, đúng kì, chủ điểm, đúng VBVH/VBTT; căn cứ trang SGK (cảnh báo, bật bắt buộc khi kho SGK duyệt xong) |
| `src/lib/repositories/kho-bai-doc.repository.ts` | Lưu hàng chờ, danh sách chờ duyệt, bài đã duyệt theo tiêu chí, duyệt / từ chối (máy chủ kiểm tra lại trước khi duyệt) |
| `src/app/api/reading-passages/{phan-tich,kiem-tra-link,hang-cho,duyet,ai-tim}` | API tương ứng; kiểm tra link chặn địa chỉ nội bộ |
| `src/app/reading-passages/nhap`, `.../duyet` | Màn hình Nhập kho (tải file / AI tìm) và Hàng chờ duyệt |
| `src/app/reading-passages/page.tsx` | Bỏ nút "Nạp dữ liệu mẫu thẩm định" (nạp bài gán tên tác giả thật, không kiểm chứng được); thêm nút Nhập bài đọc, Hàng chờ duyệt |
| `tests/kho-bai-doc.test.ts`, `tests/dieu-kien-tao-de.test.ts` | 21 bài kiểm thử mới |

Kết quả trên bản sao đủ dự án: `tsc --noEmit` 0 lỗi, `vitest` 100/100 đạt, `next build` thành công (phông Google bị chặn ở máy kiểm thử nên tạm thay khi build, không đổi trong mã).

## Còn lại

1. **Cắm AI:** thêm `GEMINI_API_KEY` (hoặc `ANTHROPIC_API_KEY`) phía máy chủ và viết lớp `IAIBaiDoc` trả về trong `layAIBaiDoc()`. AI tìm bài phải dùng tìm kiếm web và trả link thật; kết quả vẫn qua `kiemTraBaiDoc` và hàng chờ duyệt.
2. **Chữ SGK để kiểm tra trùng theo nội dung:** OCR các trang bài đọc SGK Tiếng Việt 4 vào `sgk_sections.text_content` (kind `BAI_DOC`). Khi có, phân tích và duyệt tự so trùng nội dung.
3. **PDF:** chưa đọc trực tiếp; giáo viên lưu thành .docx hoặc dán chữ.
4. `PassageFormModal` (thêm tay) và `READING_PASSAGE_CONFIG` vẫn dùng khung độ dài cũ (đọc hiểu 250 – 320). Nên chuyển sang `quy-dinh.ts`.
5. Xưởng tạo đề phải gọi `kiemTraDieuKienTaoDe()` trước khi tạo câu hỏi.

## Điều chỉnh điều kiện chọn bài (06/11/2026, thầy Khái chốt)

Tách hai bước để dễ tìm bài hơn:

- **Đề xuất** (AI tìm, tải file): đúng chủ điểm, phù hợp nội dung, số tiếng gần quy định. Bài dài hơn vẫn đề xuất, tổ cắt một đoạn trọn ý (cả đọc thành tiếng lẫn đọc hiểu). Thể loại ưu tiên đúng loại, khác loại cùng nhóm văn học/thông tin vẫn được. Thiếu tác giả, link vẫn hiện để tổ xem.
- **Chọn vào kho / vào đề** (`kiemTraBaiDoc`, chặn): bắt buộc tác giả; có link thì link phải mở được và đúng bài; không có link thì ghi tên sách và số trang.
- SGK Tiếng Việt 4 **Cánh Diều, Chân trời sáng tạo được phép dùng và nên tìm**. Chỉ chặn SGK Tiếng Việt 4 Kết nối tri thức đang dạy (theo nguồn ghi, theo tên bài, theo nội dung trùng).
