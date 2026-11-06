# Xưởng sản xuất đề kiểm tra AI – ThayKhaiEdu

Ứng dụng web giúp giáo viên tiểu học (lớp 1–5) lập ma trận, bản đặc tả, tạo đề kiểm tra, kiểm định và xuất bản đề. Căn cứ Chương trình GDPT 2018 và Thông tư 27/2020/TT-BGDĐT. AI chỉ hỗ trợ, giáo viên quyết định cuối cùng.

## Một bản duy nhất

- Chỉ có **một nhánh chính là `main`**. Vercel triển khai production từ `main`.
- Bản HTML tĩnh cũ đã bị xóa khỏi `main` ngày 06/11/2026. Nếu cần xem lại, nó vẫn nằm trong lịch sử git ở commit `4953c90`.
- Quy tắc cho mọi người và mọi AI làm tiếp dự án: xem `AGENTS.md`.

## Công nghệ

- Next.js (App Router), React, TypeScript, Tailwind CSS.
- Supabase: đăng nhập, cơ sở dữ liệu, phân quyền theo trường (RLS). Migration trong `supabase/migrations`.
- Kiểm thử: Vitest (`tests/`).

## Chạy trên máy

```bash
npm ci
cp .env.example .env.local   # điền NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, AI_KHOA_BI_MAT
npm run dev
```

Kiểm tra trước khi đẩy code:

```bash
npm run typecheck && npm test && npm run build
```

Thiếu biến Supabase thì app chạy ở chế độ dữ liệu mẫu (DEMO_MODE).

## Tài liệu

- `docs/CAI-DAT-AI.md`: trang Cài đặt AI, khóa API, phân model theo việc.
- `docs/kho-sgk/KHO-BAI-DOC-DA-LAM.md`: kho bài đọc và kho SGK.
- `docs/quyet-dinh-3-muc-danh-gia.md`: quy định 3 mức đánh giá theo Thông tư 27.
