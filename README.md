# THAYKHAIEDU — HỆ THỐNG TẠO ĐỀ KIỂM TRA AI & PPCT HUB (GDPT 2018)

> **Hệ thống tạo đề kiểm tra 1-chạm thông minh, tích hợp phân phối chương trình 35 tuần, ma trận đặc tả chuẩn Bộ GD&ĐT (Sách Kết nối tri thức với cuộc sống) và định dạng xuất bản in ấn A4 chuẩn giáo viên.**

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Bộ lưu trữ kép Hybrid Dual-Tier (IndexedDB + localStorage)**:
   - Lưu trữ hàng trăm đề kiểm tra, ma trận và toàn bộ phân phối chương trình không giới hạn dung lượng.
   - Cơ chế tự động lưu ngầm, bảo toàn dữ liệu vĩnh viễn trên trình duyệt.

2. **Bộ Trộn Mã Đề 1-Click (Đề A - Mã 101 / Đề B - Mã 102)**:
   - Trộn ngẫu nhiên câu hỏi & hoán vị phương án trắc nghiệm.
   - Giữ nguyên vị trí đoạn trích đọc hiểu Tiếng Việt.
   - Tự động xuất **Bảng đối soát đáp án A ↔ B** tiện lợi cho giáo viên chấm thi.

3. **Module Đọc Hiểu Tiếng Việt Chuyên Sâu (Passage-Anchored Reading)**:
   - Neo chặt văn bản đọc hiểu với hệ thống 6–8 câu hỏi đọc hiểu và Luyện từ và câu.
   - Đầy đủ bài tập Tập làm văn kèm **Rubric chấm điểm chuẩn Thông tư 27** (5 tiêu chí, 10 điểm).

4. **Khung PPCT 35 Tuần Cả Năm (HK1 & HK2) Chuẩn GDPT 2018**:
   - Tích hợp sẵn 86+ tiết học bao phủ trọn vẹn 35 tuần năm học.
   - Đầy đủ 4 cột mốc kiểm tra định kì: Giữa HK1 (Tuần 9), Cuối HK1 (Tuần 18), Giữa HK2 (Tuần 27), Cuối Năm (Tuần 35).
   - Hỗ trợ Kéo - Thả / Nạp file JSON phân phối chương trình cá nhân hoá.

5. **Bộ Lọc Kiểm Định Toán Học Tiểu Học (Math Sanity Check)**:
   - Tự động quét và phát hiện các lỗi: Phép chia cho 0, chia không chia hết ở số tự nhiên, phép trừ ra số âm ($a < b$), số lẻ thập phân ở đối tượng rời rạc (học sinh, con vật...).
   - **1-Click Tự động sửa chuẩn số liệu toán**: Đảo phép trừ âm, khử trùng đáp án, khôi phục đáp án đúng duy nhất.

6. **Xuất Bản Đa Định Dạng Chuẩn Đẹp**:
   - **In ấn A4**: Tối ưu ngắt trang (`avoid-break`), căn chỉnh lề in 20mm/15mm chuẩn văn bản.
   - **Microsoft Word (.DOC)**: Chuyển đổi dòng kẻ chấm tự luận và ô ly thành bảng viền nét đứt tương thích 100% Word.
   - **Xuất Trọn Bộ 2 Mã Đề Word**: Đề A + Ngắt trang + Đề B + Ngắt trang + Bảng đối soát đáp án.

---

## 🚀 CÔNG NGHỆ

- **Kiến trúc**: Single Page Application (SPA) thuần túy Client-side, không phụ thuộc backend phức tạp.
- **Giao diện**: TailwindCSS, FontAwesome 6, Thiết kế Mint Pastel Worksheet tiểu học.
- **Lưu trữ**: IndexedDB API + LocalStorage.
- **Trí tuệ nhân tạo**: Tích hợp Google Gemini AI Live API sinh đề theo thời gian thực.
