<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Quy tắc của dự án ThayKhaiEdu (bắt buộc với mọi AI và người làm tiếp)

1. **Chỉ một nhánh chính: `main`.** Vercel triển khai production từ `main`. Không tạo app mới, thư mục app thứ hai hay nhánh dài hạn song song (như `ung-dung-next` trước đây).
2. **Trước khi sửa code:** chạy `git fetch`, kiểm tra nhánh, commit HEAD và `git status`. Nếu thấy có nhiều hơn một bản (nhánh khác chưa gộp, repo hoặc project Vercel khác cùng tên), dừng lại và hỏi chủ dự án, không tự chọn một bản để làm tiếp.
3. **Nhánh tạm** chỉ dùng cho một việc nhỏ, phải gộp vào `main` (hoặc xóa) ngay khi xong, trong cùng phiên làm việc.
4. Không force-push, không xóa lịch sử, không deploy hay merge khi chủ dự án chưa đồng ý.
5. Trước khi đẩy lên `main`: `npm run typecheck`, `npm test`, `npm run build` đều phải đạt.
