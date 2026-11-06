# Cài đặt AI (05/11/2026)

Trang `/ai-settings`, mục "Cài đặt AI" trong menu. Chỉ tổ trưởng (và quản trị trường) thấy và sửa. Cách làm giống trang Cài đặt AI của app Sinh hoạt chuyên môn.

## Trang có 3 phần

1. **Khóa API dùng chung.** Dán khóa rồi bấm Lưu. Máy chủ mã hóa khóa bằng `AI_KHOA_BI_MAT` rồi mới ghi vào Supabase. Màn hình chỉ hiện 4 ký tự cuối.
2. **Danh sách model.** Mỗi dòng: tên gọi, ID model, chuẩn gọi (Anthropic hoặc OpenAI), địa chỉ cổng, giá vào/ra (USD cho 1 triệu token). Nút "Kiểm tra" gửi một câu ngắn để xem khóa, cổng và ID có đúng không. Nếu vừa dán khóa mới mà chưa lưu, nút Kiểm tra dùng khóa vừa dán.
   - "Thêm nhanh (API-LIT)": 18 model chép từ app Sinh hoạt chuyên môn, cổng `https://apilit.dev` (chuẩn Anthropic) và `https://apilit.dev/v1` (chuẩn OpenAI).
   - Khi danh sách trống có nút thêm cả bộ kèm phân việc đề xuất.
3. **Dùng model nào cho việc gì.** Việc nào để "Dùng model mặc định" thì lấy model mặc định.

| Việc | Đang dùng ở đâu | Đề xuất |
|---|---|---|
| Model mặc định | mọi việc chưa chọn riêng | Claude Haiku 5.5 |
| Việc nhẹ | tách bài, nhận chủ điểm, ghi chú (chưa nối) | Claude Haiku 5.5 |
| Tìm bài đọc | nút "AI tìm bài đọc" ở trang Nhập bài đọc | Claude Sonnet 5.5 |
| Đọc tệp | phân tích Word/PDF (chưa nối) | Claude Sonnet 5.5 |
| Soạn đề | Xưởng tạo đề (chưa nối) | Claude Sonnet 5.5 |

## Tìm web

Việc "Tìm bài đọc" gửi kèm công cụ tìm web của chuẩn Anthropic. Nếu cổng không nhận công cụ này, app tự gọi lại không tìm web và ghi chú trên từng bài: "AI không tìm web được: kiểm tra kỹ tác giả và nguồn". Model chuẩn OpenAI không tìm web. Dù có tìm web hay không, bài AI đưa ra vẫn phải qua kiểm tra link, độ dài, trùng SGK và chờ tổ trưởng duyệt.

## Biến môi trường

- `AI_KHOA_BI_MAT`: đã đặt trên Vercel ngày 06/11/2026 (giá trị ngẫu nhiên mới, kiểu sensitive, không xem lại được). Khóa API dán trên bản Vercel chỉ dùng được trên bản Vercel; bản chạy trên máy dùng giá trị riêng trong `.env.local`.
- Đổi `AI_KHOA_BI_MAT` thì khóa đã lưu không giải mã được, phải dán lại khóa ở trang Cài đặt AI.
- Bỏ `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`: app không đọc hai biến này nữa.

## Dữ liệu

Bảng `ai_settings` (migration `20261105121907_cai_dat_ai.sql`, đã áp trên project thử `tao-de-thu-nghiem`): một dòng cho mỗi trường gồm khóa đã mã hóa, 4 ký tự cuối, danh sách model, phân việc.

Quyền (đã thử trên Supabase bằng tài khoản giả):
- tổ trưởng tạo và sửa được;
- giáo viên cùng trường đọc được (máy chủ cần đọc khi giáo viên bấm nút AI) nhưng không sửa, không xóa được;
- giáo viên trường khác không thấy dòng nào.

## File

- `src/core/services/ai/cau-hinh-ai.ts`: kiểu dữ liệu, danh sách việc, bộ model API-LIT, kiểm tra cấu hình.
- `src/lib/ai/ma-hoa-khoa.ts`: mã hóa / giải mã khóa (AES-256-GCM).
- `src/lib/ai/goi-ai.ts`: gọi model chuẩn Anthropic (`/v1/messages`) và chuẩn OpenAI (`/chat/completions`).
- `src/lib/repositories/cai-dat-ai.repository.ts`: đọc / lưu cấu hình, `goiAITheoViec()` cho các chức năng khác dùng.
- `src/app/ai-settings/page.tsx`, `src/app/api/ai-settings/route.ts`, `src/app/api/ai-settings/kiem-tra/route.ts`.
- Nối vào: `src/app/api/reading-passages/ai-tim/route.ts`, `src/core/services/ai/reading-passage-ai.ts`.
- Kiểm thử: `tests/cai-dat-ai.test.ts`.

Muốn chức năng mới dùng AI: gọi `goiAITheoViec('SOAN_DE', { heThong, noiDung, toiDaToken })` trong route API (phía máy chủ). Không gọi AI từ trang "use client".
