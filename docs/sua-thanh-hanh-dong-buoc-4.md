# Kiểm tra thanh hành động bước 4 ("Tạo đề")

> **Ngày lập:** 28/11/2026  
> **File chính:** `src/components/quy-trinh/TaoDeView.tsx`  
> **Khung chứa thanh công cụ:** `ThanhHoSoDe` (`src/components/quy-trinh/ThanhHoSoDe.tsx`, được gọi tại dòng 600–602 của `TaoDeView.tsx`)

---

## Danh sách nút và hàm xử lý hiện tại

| Vị trí hiện tại | Nhãn nút hiện tại | Hàm / hành động đang gọi | Ghi chú |
|---|---|---|---|
| `thanhCongCu` (dòng 572–576) | `Soạn đề` | `setCheDo('soan'); window.scrollTo({ top: 0, behavior: 'smooth' })` | Chuyển về giao diện nhập từng câu |
| `thanhCongCu` (dòng 572–576) | `Xem đề` | `setCheDo('xem'); window.scrollTo({ top: 0, behavior: 'smooth' })` | Chuyển sang màn hình xem trước đề |
| `thanhCongCu` (dòng 584–586) | `Làm lại đề trống` | `taoMoi()` (dòng 255–264) | Hỏi `window.confirm(...)` nếu đề đã có câu, rồi dựng lại khung đề trống từ đặc tả |
| `thanhCongCu` (dòng 587–592) | `Xóa đề nháp` | `xoaDeNhap()` (dòng 270–287) | Hiện tại bấm lần 1 bật `hoiXoa` ("Bấm lần nữa để xóa"), bấm lần 2 mới gọi `DELETE /api/de-kiem-tra?id=...` |
| Khối soạn AI (dòng 655–658) | `Tạo đề` (hoặc `Tạo câu hỏi đọc hiểu` / `Tạo đề bài viết`) | `taoDeBangAI()` (dòng 425–478, `vietLaiTatCa = false`) | Lọc `de.cau.filter(c => trongPhan(c.khoa) && !c.deBai.trim())`, chỉ điền các câu còn trống |
| Khối soạn AI (dòng 659–661) | `Viết lại tất cả` | `taoDeBangAI(true)` | Hiện khi `!conTrong`, hỏi `window.confirm` trước khi viết lại toàn bộ |
| Khối soạn AI (dòng 662–666) | `Lấy từ ngân hàng` | `layGoiYNH()` | Gợi ý câu từ ngân hàng cho các câu còn trống |

---

## Thông tin hiển thị đi kèm
- Dòng tiến độ (dòng 578–581): `{soCau} câu · {tongDiem} điểm · soạn xong {tienDo.xong}/{tienDo.tong}` và thanh tiến độ xanh lá.
- Thông báo tự dựng khung (dòng 299): `Đã dựng khung X câu theo đặc tả phiên bản Y. Bấm "Tạo đề" để AI soạn tất cả các câu và đáp án.` (cần đổi `"Tạo đề"` thành `"AI hỗ trợ tạo đề"`).
- Dòng mô tả cạnh nút AI (dòng 667): `AI soạn {conTrong} câu còn trống theo đặc tả.`
