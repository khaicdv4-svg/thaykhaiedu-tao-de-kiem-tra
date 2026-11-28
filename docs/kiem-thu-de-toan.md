# Kiểm thử đề Toán lớp 4 Cuối HKI theo file mẫu

> **Ngày kiểm thử:** 28/11/2026
> **File xuất kiểm thử:**
> - Đề + Hướng dẫn chấm: `docs/kiem-thu/De-TOAN-CUOI_HK1.docx`
> - Ma trận + Đặc tả (file riêng): `docs/kiem-thu/MaTran-DacTa-TOAN-CUOI_HK1.docx`
> **File mẫu đối chiếu:** `docs/mau-chuan/de-mau-toan-cuoi-hki-lop4.docx`

---

## 1. Kết quả chạy kiểm thử tự động và build

- `npm run typecheck`: đạt (0 lỗi TypeScript)
- `npm test`: **64/64 file test đạt, 558/558 tests đạt (0 fail)**
- `npm run build`: **thành công** (`next build` hoàn tất 101/101 trang)

---

## 2. Kiểm tra từng tiêu chí Bước 2 trên `docs/kiem-thu/De-TOAN-CUOI_HK1.docx`

| # | Tiêu chí | Kết quả | Chi tiết quan sát từ file `.docx` |
|---|---|---|---|
| 1 | Khung đầu đề 4 cột 2 hàng | Đạt | TABLE 0 (2×4): cột 1 (`45,5%` = 4507 twip) gộp 2 hàng chứa tên trường, `HỌ TÊN HS:`, `LỚP:`, `NGÀY KIỂM TRA:` (tab phải leader chấm — kiểm tra trên LibreOffice PDF: mỗi mục đúng 1 dòng, không xuống dòng); cột phải (5399 twip) gồm `KIỂM TRA CUỐI HỌC KÌ I - NH 2026 - 2027` (1 dòng), `MÔN TOÁN - Lớp 4`, `Thời gian: 40 phút`, hàng 2 tách `GV coi KT1`, `GV coi KT2`, `Số thứ tự` |
| 2 | Tên trường `TRƯỜNG TH TRẦN VĂN ƠN` (mọi file xuất) | Đạt | Cả đề (`De-TOAN-CUOI_HK1.docx`) lẫn ma trận & đặc tả (`MaTran-DacTa-TOAN-CUOI_HK1.docx`) đều in `TRƯỜNG TH TRẦN VĂN ƠN` |
| 3 | Ô `LỚP:` để trống, tiêu đề ghi `Lớp 4` | Đạt | Đầu đề in `LỚP: ……………………………………` (trống); tiêu đề in `MÔN TOÁN - Lớp 4` |
| 4 | Tên kì thi theo mẫu | Đạt | `KIỂM TRA CUỐI HỌC KÌ I - NH 2026 - 2027` |
| 5 | Bảng Điểm / Nhận xét / GV chấm KT1 / KT2 & dòng PHẦN BÀI LÀM | Đạt | TABLE 1 (1×4) và đoạn `PHẦN BÀI LÀM CỦA HỌC SINH` |
| 6 | Phần I Trắc nghiệm & Phần II Tự luận | Đạt | Có `PHẦN I. TRẮC NGHIỆM (3 điểm)`, `Khoanh vào chữ đặt trước câu trả lời đúng.`, `PHẦN II. TỰ LUẬN (7 điểm)` |
| 7 | Ô điểm `…/0,5đ` bên trái, kẻ dọc | Đạt | TABLE 2 (6×2) và TABLE 3 (6×2) |
| 8 | Điểm tính theo bước 0,5, tổng 10 điểm, đúng 12 câu | Đạt | Ma trận (`MaTran-DacTa-TOAN-CUOI_HK1.docx`) ghi `Tổng số câu` = `12` (Mức 1: 7, Mức 2: 3, Mức 3: 2), tổng điểm `10`; Đề (`De-TOAN-CUOI_HK1.docx`) gồm 6 câu TN × 0,5đ = 3đ và 6 câu TL = 7đ (tổng 12 câu, 10đ) |
| 9 | Đủ dòng kẻ làm bài, đặt tính & in sẵn `Bài giải` | Đạt | Câu 8 đặt tính chia lưới 2 cột có dòng chấm; Câu 11 (bài toán lời văn) tự động chèn `Bài giải` trước dòng kẻ |
| 10 | Dòng kết thúc đề | Đạt | In `HẾT` (thay cho `HẾT ĐỀ`) |
| 11 | Bảng đáp án TN dạng ngang, căn trái & giữa dọc | Đạt | TABLE 4 (2×7): tất cả các ô (kể cả `Câu`, `1`..`6`, `Đáp án` và `A`..`D`) đều căn trái (`LEFT`) và căn giữa theo chiều dọc (`CENTER`) |
| 12 | HDC ghi biểu điểm từng ý & cách chấm khác đúng | Đạt | TABLE 5 (7×3): dòng tiêu đề (`Câu`, `Đáp án`, `Biểu điểm`) căn giữa & in đậm; tất cả ô nội dung căn trái & căn giữa dọc (`CENTER`); có ghi quy tắc khoanh nhiều đáp án TN và `Học sinh diễn đạt khác mà đúng ý vẫn cho điểm.` |
| 13 | Điểm toàn bài làm tròn thành số nguyên | Đạt | Có ghi `Điểm toàn bài là tổng điểm các câu, làm tròn thành số nguyên theo quy định (không cho điểm thập phân).` |
| 14 | Khối chữ ký cuối đề/HDC | Đạt | TABLE 6 (1×2): `DUYỆT CỦA BAN GIÁM HIỆU` và `……, ngày … tháng … năm 2026 / GIÁO VIÊN RA ĐỀ` |
| 15 | Font Times New Roman cỡ 13, lề chuẩn mẫu | Đạt | Lề trái/phải `635000 EMU` (~1,76 cm), trên `457200 EMU`, dưới `444500 EMU`, `cantSplit: true` trên mọi hàng bảng |
| 16 | Xuất 2 file riêng (giữ nguyên mục 1) | Đạt | Xuất riêng `De-TOAN-CUOI_HK1.docx` và `MaTran-DacTa-TOAN-CUOI_HK1.docx` |
| 17 | Kiểm lại đáp án bằng code trước khi xuất | Đạt | Tất cả 12 câu (TN và TL) đã được kiểm lại bằng code trước khi ghi file `.docx` |
