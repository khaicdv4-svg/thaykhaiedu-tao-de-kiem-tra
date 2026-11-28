# So sánh App Hiện Tại với File Mẫu Toán Lớp 4 Cuối HKI

> **Ngày lập:** 28/11/2026  
> **Người lập:** AI (Antigravity)  
> **Nguồn so sánh:**
> - **File mẫu:** `docs/mau-chuan/de-mau-toan-cuoi-hki-lop4.docx` (1 section, 15 đoạn, 9 bảng)
> - **App hiện tại:** `HoSo-TOAN-CUOI_HK1.docx` tại `D:\DU_LIEU_TAO_DE\tu_APP_TAO_DE\` (4 sections)
> - **Code chính:** `src/core/de/xuat-word.ts` (hàm `cacPhanDe`, `dauDe`, `bangCau`, `huongDanCham`)

---

## 1. CẤU TRÚC FILE TỔNG QUAN

| Tiêu chí | File mẫu | App hiện tại | Trạng thái |
|---|---|---|---|
| Số file xuất | 1 file (đề + HDC) | 2 file: HoSo (ma trận+đặc tả+đề+HDC) | KHÁC |
| Số sections trong file đề | 1 section duy nhất | 4 sections (ma trận, đặc tả, đề, HDC) | KHÁC |
| Trang đề | Nằm trong 1 section cùng HDC | Section riêng | Khác cách tổ chức, kết quả tương đương |

---

## 2. KHUNG ĐẦU ĐỀ

| # | Tiêu chí | File mẫu | App hiện tại | Trạng thái |
|---|---|---|---|---|
| 2.1 | Cấu trúc bảng đầu đề | 2 hàng x 4 cột: hàng 1 gộp cột 2-3-4 (cột phải rộng); hàng 2 tách thành GV coi KT1 / GV coi KT2 / Số TT | 1 hàng x 2 cột: trái (trường+họ tên+lớp+ngày), phải (tiêu đề+môn+thời gian+GV coi) | KHÁC – Mẫu dùng bảng 4 cột 2 hàng; app dùng 2 cột 1 hàng |
| 2.2 | Tên trường | "TRƯỜNG TH TRẦN VĂN ƠN" | "TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN" | Chấp nhận cả `[TH hoặc TIỂU HỌC]` |
| 2.3 | Tiêu đề kỳ thi | "KIỂM TRA CUỐI HỌC KÌ I - NH 2026 - 2027" (dấu - ngắn, "NH" viết tắt) | "KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027" (viết tắt "KTĐK") | KHÁC – Cả hai đều viết tắt nhưng khác cách |
| 2.4 | HỌ TÊN HS, LỚP để trống | Có, dùng tab \t để kéo dài | Có, dùng dấu "……………………………" | KHÁC – Mẫu dùng tab, app dùng dấu chấm. Kết quả in tương đương |
| 2.5 | NGÀY KIỂM TRA | Có | Có | ĐÚNG |
| 2.6 | GV coi KT1, GV coi KT2, Số thứ tự | Có (hàng riêng bên dưới) | Có (cùng dòng trong cột phải) | KHÁC cách bố cục, nội dung tương đương |
| 2.7 | Chỉ ghi "Lớp 4" (không ghi 4/1, 4/2) | "Lớp 4" | "Lớp 4 ……" | ĐÚNG |
| 2.8 | Thời gian: 40 phút | Có | Có | ĐÚNG |
| 2.9 | Bảng Điểm / Nhận xét / GV chấm KT1 / GV chấm KT2 | Có (TABLE 1, 1 hàng 4 cột) | Có (1 hàng 4 cột) | ĐÚNG |
| 2.10 | Dòng "PHẦN BÀI LÀM CỦA HỌC SINH" | Có (đoạn in đậm, căn giữa) | Có | ĐÚNG |

---

## 3. CẤU TRÚC ĐỀ

| # | Tiêu chí | File mẫu | App hiện tại | Trạng thái |
|---|---|---|---|---|
| 3.1 | Tiêu đề "PHẦN I. TRẮC NGHIỆM (3 điểm)" | CÓ – in đậm, trước bảng câu TN | KHÔNG CÓ | ❌ THIẾU |
| 3.2 | Dòng hướng dẫn "Khoanh vào chữ đặt trước câu trả lời đúng." | CÓ – ngay sau tiêu đề Phần I | KHÔNG CÓ | ❌ THIẾU |
| 3.3 | Tiêu đề "PHẦN II. TỰ LUẬN (7 điểm)" | CÓ – in đậm, trước bảng câu TL | KHÔNG CÓ | ❌ THIẾU |
| 3.4 | Mỗi câu có ô điểm "…/0,5đ" bên trái, kẻ dọc | Có (cột trái ~17 twip) | Có (cột trái 1100 twip = ~19 twip) | ĐÚNG |
| 3.5 | Câu TN: 4 phương án A B C D xếp 2 cột | Có, bố cục 2 cột trong ô | Có (phuongAn()) | ĐÚNG |
| 3.6 | Câu TL: có dòng kẻ chấm cho HS làm bài | Có | Có (dongCham()) | ĐÚNG |
| 3.7 | Câu đặt tính (Câu 8): có lưới 2 cột, dòng kẻ | Mẫu để trống rộng (không dùng lưới, chỉ 1 ô rộng) | App dùng lưới 2 cột nhieuY/datTinh | KHÁC – Mẫu để 1 ô rộng; app dùng lưới 2 cột |
| 3.8 | Câu điền chỗ chấm (Câu 7: "… = ……………… kg") | CÓ – dùng tab và dấu chấm trong đề bài | App có moRongChoCham() cho câu điền | ĐÚNG |
| 3.9 | Câu vẽ hình (Câu 10): có hình đính kèm | CÓ – có hình trong ô (python-docx không đọc được ảnh) | App hỗ trợ hinhCau() | CÓ CƠ CHẾ, nội dung phụ thuộc AI |
| 3.10 | Câu có bài giải sẵn (Câu 11: "Bài giải") | CÓ – đề bài in sẵn chữ "Bài giải" trong ô | App không tự in "Bài giải" | ⚠️ KHÁC NHỎ |
| 3.11 | Tổng: 6 câu TN (3đ) + 6 câu TL (7đ) = 10đ | Đúng: 6×0,5 + (1,5+2+1+0,5+1,5+0,5) = 3+7 = 10đ | Ma trận CHK1 Toán: 6 TN 3đ + 6 TL 7đ = 10đ | ĐÚNG |
| 3.13 | Dòng "HẾT" sau trang đề | "HẾT" (không có "ĐỀ") | "HẾT ĐỀ" | KHÁC NHỎ |

---

## 4. HƯỚNG DẪN CHẤM

| # | Tiêu chí | File mẫu | App hiện tại | Trạng thái |
|---|---|---|---|---|
| 4.1 | Tiêu đề HDC | "HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN" (không có tên trường/môn/kỳ) | Có tên trường + "HƯỚNG DẪN CHẤM MÔN TOÁN - LỚP 4" + tên kỳ | KHÁC |
| 4.2 | Bảng đáp án TN: dạng ngang (câu 1-6 một hàng) | Có (TABLE 6: 2 hàng x 7 cột: hàng 1 = số câu, hàng 2 = đáp án) | App in dọc: mỗi câu 1 hàng (cột: câu, đáp án, điểm) | KHÁC – Mẫu in ngang; app in dọc |
| 4.3 | HDC TL: bảng 3 cột (Câu, Đáp án, Biểu điểm) | Có (TABLE 7: 7 hàng) | App dùng bangDapAn(): 3 cột (Câu, Đáp án+HDC, Điểm) | ĐÚNG cơ bản |
| 4.4 | Biểu điểm từng ý chi tiết | Có: "Mỗi ý đúng 0,5 điểm", "Đặt tính sai: không cho điểm", "Tính đúng kết quả nhưng không thuận tiện: 0,25đ", v.v. | Có, trường huongDanCham ghi biểu điểm | ĐÚNG cơ bản |
| 4.5 | Cách chấm khi HS làm khác mà vẫn đúng | CÓ – "Học sinh diễn đạt khác mà đúng ý vẫn cho điểm" (đoạn riêng trước HDC TL) | Không có câu này | ❌ THIẾU |
| 4.6 | Làm tròn tổng điểm thành số nguyên | CÓ – "Điểm toàn bài ... làm tròn thành số nguyên theo quy định (không cho điểm thập phân)." | Không có | ❌ THIẾU |
| 4.7 | Quy tắc khoanh TN nhiều lựa chọn | "Khoanh từ hai chữ trở lên trong một câu: không cho điểm câu đó." | Không có trong HDC | ❌ THIẾU |
| 4.8 | Dòng ghi chú Câu 10 (vẽ hình) | "Đường thẳng không đi qua M hoặc không vuông góc với AB: không cho điểm" | Phụ thuộc nội dung câu | CÓ CƠ CHẾ |

---

## 5. CHỮ KÝ CUỐI ĐỀ

| # | Tiêu chí | File mẫu | App hiện tại | Trạng thái |
|---|---|---|---|---|
| 5.1 | Khối "DUYỆT CỦA BAN GIÁM HIỆU" | CÓ – TABLE 8 cuối đề (1 hàng 2 cột) | KHÔNG CÓ trong trang đề | ❌ THIẾU |
| 5.2 | Khối "GIÁO VIÊN RA ĐỀ" | CÓ – cùng TABLE 8, cột phải, có ngày tháng | KHÔNG CÓ | ❌ THIẾU |
| 5.3 | Vị trí chữ ký | Cuối trang đề (trước hoặc sau HDC) | Chỉ có "HIỆU TRƯỞNG" + "TỔ TRƯỞNG" trong trang ma trận | KHÁC |

---

## 6. ĐỊNH DẠNG IN ẤN

| # | Tiêu chí | File mẫu | App hiện tại | Trạng thái |
|---|---|---|---|---|
| 6.1 | Font | Times New Roman 13pt | Times New Roman 13pt | ĐÚNG |
| 6.2 | Lề (margin) | Trái/Phải: 635000 EMU ≈ 1,76 cm; Trên: 457200 EMU ≈ 1,27 cm; Dưới: 444500 EMU ≈ 1,23 cm | Trái/Phải: 567 twip = 1 cm; Trên/Dưới: 567 twip = 1 cm | KHÁC – Mẫu dùng lề trái/phải ~1,76 cm; app dùng 1 cm |
| 6.3 | Bảng không bị cắt khi ngắt trang | Mẫu không ghi rõ (cần kiểm tra thực tế) | cantSplit: true | ĐÚNG |
| 6.4 | Hạn chế khoảng trắng cuối trang | Mẫu gói vừa 1 trang đề | App nén về 3 trang (GIOI_HAN_TRANG.TOAN=3) | KHÁC – Mẫu 1 section, app giới hạn 3 trang đề |

---

## 7. KIỂM TRA ĐÁP ÁN FILE MẪU (tính lại bằng code)

| Câu | Đáp án file mẫu | Kiểm tra tính toán | Kết quả |
|-----|----------------|-------------------|---------|
| 1 TN | A. 302 047 – số lẻ | 302047: lẻ ✓, viết đúng "ba trăm linh hai nghìn không trăm bốn mươi bảy" ✓ | ✅ ĐÚNG |
| 2 TN | C. 700 000 | Trong 4.728.150: vị trí 7 → hàng trăm nghìn → giá trị 700 000 ✓ | ✅ ĐÚNG |
| 3 TN | A. 850 142; 850 124; 805 241; 805 214 | sorted([805214, 850124, 805241, 850142], reverse=True) = [850142, 850124, 805241, 805214] ✓ | ✅ ĐÚNG |
| 4 TN | A. 3 500 000 | 3 476 520 / 100 000 = 34,77 → làm tròn → 35 × 100 000 = 3 500 000 ✓ | ✅ ĐÚNG |
| 5 TN | B. Góc đỉnh B | Có hình vẽ trong file (không đọc được bằng python-docx) – không kiểm tra được | ⚠️ Cần xem hình |
| 6 TN | B. Hình 2 | Có hình vẽ trong file (không đọc được bằng python-docx) – không kiểm tra được | ⚠️ Cần xem hình |
| 7 TL | a) 4060 kg, b) 715 dm², c) 500 dm² | 4×1000+60=4060 ✓; 7×100+15=715 ✓; 5×100=500 ✓ | ✅ ĐÚNG |
| 8 TL | a) 593865, b) 373272, c) 175799, d) 76152 | Phép tính đặt tính không đọc được từ file (hình ảnh) – cần xem trực tiếp | ⚠️ Cần xem |
| 9a TL | 16 728 | 2345+6728+7655 = 16728 ✓ | ✅ ĐÚNG |
| 9b TL | 13 160 | (4580+5420)+3160 = 10000+3160 = 13160 ✓ | ✅ ĐÚNG |
| 10 TL | Vẽ đúng đường thẳng qua M, vuông góc AB | Không kiểm tra được (câu vẽ hình) | ⚠️ Không kiểm tra |
| 11 TL | Đỏ: 15 400 kg, Trắng: 11 080 kg | (26480+4320)/2 = 15400 ✓; 15400-4320 = 11080 ✓ | ✅ ĐÚNG |
| 12 TL | 540 giây | (2×60+15)×4 = 135×4 = 540 ✓ | ✅ ĐÚNG |

**Phát hiện:** Câu 2 TN: Đáp án file mẫu ghi C (700 000) nhưng đây là **giá trị** của chữ số 7, còn đề hỏi "giá trị của chữ số 7 trong số 4 728 150 là" → 700 000 = C → đúng.

---

## 8. DANH SÁCH VIỆC CẦN SỬA (ưu tiên)

### ❌ Thiếu hoàn toàn (phải thêm)

| # | Việc cần làm | Vị trí sửa |
|---|---|---|
| A | Thêm đoạn **"PHẦN I. TRẮC NGHIỆM (X điểm)"** trước nhóm câu TN | `src/core/de/xuat-word.ts` – hàm `cacPhanDe()` |
| B | Thêm đoạn **"Khoanh vào chữ đặt trước câu trả lời đúng."** sau tiêu đề Phần I | `src/core/de/xuat-word.ts` |
| C | Thêm đoạn **"PHẦN II. TỰ LUẬN (Y điểm)"** trước nhóm câu TL | `src/core/de/xuat-word.ts` |
| D | Thêm bảng chữ ký **"DUYỆT CỦA BAN GIÁM HIỆU" / "GIÁO VIÊN RA ĐỀ"** cuối đề | `src/core/de/xuat-word.ts` – thêm hàm `chuKyCuoiDe()` |
| E | Thêm đoạn **"Học sinh diễn đạt khác mà đúng ý vẫn cho điểm. Điểm toàn bài làm tròn thành số nguyên."** trước HDC TL | `src/core/de/xuat-word.ts` – hàm `huongDanCham()` |
| F | Thêm quy tắc khoanh TN: **"Khoanh từ hai chữ trở lên trong một câu: không cho điểm câu đó."** vào HDC | `src/core/de/xuat-word.ts` – hàm `huongDanCham()` |
| G | Đổi bảng đáp án TN từ dọc (mỗi câu 1 hàng) → **ngang** (câu 1–6 một hàng, đáp án một hàng) | `src/core/de/xuat-word.ts` – hàm `bangDapAn()` hoặc tách thành `bangDapAnTN()` |

### ⚠️ Khác (cần xác nhận trước khi sửa)

| # | Điểm khác | Hiện tại | Mẫu | Quyết định? |
|---|---|---|---|---|
| H | Tiêu đề kỳ thi | "KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027" | "KIỂM TRA CUỐI HỌC KÌ I - NH 2026 - 2027" | Thầy chọn cách nào? |
| I | Bảng đầu đề | 2 cột 1 hàng | 4 cột 2 hàng | Thầy muốn giống mẫu hay giữ app? |
| J | Lề trang | Trái/Phải 1 cm | Trái/Phải ~1,76 cm | Thầy muốn giống mẫu hay giữ app? |
| K | Dòng kết thúc đề | "HẾT ĐỀ" | "HẾT" | Sửa thành "HẾT"? |
| L | Câu 11: in sẵn "Bài giải" | Không | Có | Thêm "Bài giải" cho câu có bài giải dài? |

---

## 9. VỀ FILE SGK MÀ APP ĐỌC

App đọc SGK từ bên ngoài thư mục dự án. Các file tìm thấy tại `D:\DU_LIEU_TAO_DE\tu_APP_TAO_DE\`:

| File/Thư mục | Ghi chú |
|---|---|
| `04-sgk-toan-4-tap-mot.pdf` | PDF SGK Toán 4 tập 1 (Kết nối tri thức) |
| `04-sgk-toan-4-tap-hai.pdf` | PDF SGK Toán 4 tập 2 |
| `toan4_tap1_chu_OCR_theo_bai\` | Thư mục chứa chữ OCR từ SGK theo từng bài |
| `toan4_tap1_danh_sach_bai.csv` | Danh sách bài Toán 4 tập 1 |

Ngoài ra, PDF SGK bản gốc nằm tại:
- `D:\06_Nam_hoc\2026 - 2027\...\sgk-toan-lop-4-tap-1-ket-noi-tri-thuc.pdf`
- `D:\06_Nam_hoc\2026 - 2027\...\sgk-toan-lop-4-tap-2-ket-noi-tri-thuc.pdf`

**Chưa chép vào dự án, chỉ báo vị trí theo yêu cầu.**

---

## 10. TÓM TẮT ĐỂ DUYỆT

### Mục ĐÚNG (không cần sửa): 10 mục
Font TNR 13pt · Bảng Điểm/NX/GV chấm · PHẦN BÀI LÀM · Ô điểm + kẻ dọc · Dòng kẻ làm bài · Câu TN có 4 phương án · Câu điền chỗ · Tổng 10đ theo đúng ma trận · cantSplit chống cắt bảng · HDC có biểu điểm từng ý

### Mục ❌ THIẾU (phải thêm): 7 mục
Tiêu đề Phần I TN · Dòng hướng dẫn khoanh · Tiêu đề Phần II TL · Chữ ký BGH+GVRD cuối đề · Dòng "HS diễn đạt khác vẫn cho điểm + làm tròn số nguyên" · Quy tắc khoanh nhiều lựa chọn · Bảng đáp án TN dạng ngang

### Mục ⚠️ KHÁC (cần thầy quyết định): 5 mục
Tiêu đề kỳ thi · Bảng đầu đề (2 cột vs 4 cột) · Lề trang · Dòng kết thúc "HẾT ĐỀ" vs "HẾT" · Dòng "Bài giải" trong câu TL

---

**→ Dừng lại chờ thầy duyệt bảng này trước khi sửa code.**
