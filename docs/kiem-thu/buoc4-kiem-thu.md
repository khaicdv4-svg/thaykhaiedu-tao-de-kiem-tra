# Kiểm chứng thực tế thanh hành động bước 4 ("Tạo đề")

> **Ngày kiểm chứng:** 28/11/2026  
> **Đường dẫn kiểm tra:** `http://localhost:3000/tao-de?mon=TOAN&ky=CUOI_HK1`  
> **Trạng thái đề:** `Lớp 4 · Toán · Cuối học kì I · Đặc tả phiên bản 9 · Đang soạn` (khung 12 câu, 13 ô nhập do Câu 8 tách `(a)` và `(b, c, d)`).

---

## Ảnh chụp màn hình ở 3 kích thước

- **Desktop (1280×800):** `docs/kiem-thu/buoc4-desktop.png`
- **Tablet (768×900):** `docs/kiem-thu/buoc4-tablet.png`
- **Mobile (375×812):** `docs/kiem-thu/buoc4-mobile.png`

---

## Bảng kết quả kiểm tra từng ý (a–e)

| Ý | Nội dung kiểm tra | Kết quả | Chi tiết quan sát thực tế |
|---|---|---|---|
| **a** | Thanh có đúng 4 nút: `"Soạn đề thủ công"`, `"AI hỗ trợ tạo đề"`, `"Lấy từ ngân hàng"`, `"Xem đề"`, và nút `"⋯"` | **Đạt** | Đủ 4 nút chính trong `role="toolbar"` và nút `"⋯"` (`aria-label="Thao tác khác"`), đúng nhãn, hiển thị rõ ở cả 3 kích thước (`buoc4-desktop.png`, `buoc4-tablet.png`, `buoc4-mobile.png`). |
| **b** | Ở 375px, không có nút nào bị chữ xuống 2 dòng và không có thanh cuộn ngang | **Đạt** | Trên `buoc4-mobile.png` (375×812), toàn bộ 5 nút đều giữ 1 dòng (`Soạn đề thủ công`: 32px, `AI hỗ trợ tạo đề`: 44px, `Lấy từ ngân hàng`: 41.33px, `Xem đề`: 33.33px, `⋯`: 29.33px). Không có thanh cuộn ngang trang (`scrollWidth <= 375px`, thử cuộn ngang không dịch chuyển). |
| **c** | Bấm `"⋯"` hiện đúng 2 mục `"Làm lại đề trống"` và `"Xóa đề nháp"`. Bấm `"Xóa đề nháp"` hiện hộp hỏi xác nhận; bấm `"Hủy"` không xóa gì | **Đạt** | Menu mở ra đúng 2 mục. Khi bấm `"Xóa đề nháp"`, hộp thoại `confirm` hiện thông báo `"Xóa hẳn đề nháp này? Nội dung đang soạn sẽ mất và không thể khôi phục."`; sau khi bấm Hủy, đề vẫn giữ nguyên (`12 câu · 10 điểm · soạn xong 0/13`). |
| **d** | Thêm nội dung cho 1 câu bằng `"Soạn đề thủ công"` và lưu. Sau đó bấm `"AI hỗ trợ tạo đề"`, câu đã soạn giữ nguyên, chỉ ô trống được điền | **Đạt một phần (dừng do lỗi khóa AI)** | Xem chi tiết mục **Ý d** bên dưới (`docs/kiem-thu/buoc4-ai-sau.png`). |
| **e** | Dòng tiến độ `"… câu · 10 điểm · soạn xong x/13"` cập nhật đúng sau khi lưu | **Đạt** | Khi nhập đủ Đề bài, 4 phương án A–D và Đáp án (`A`) cho Câu 1 rồi bấm Lưu, trạng thái Câu 1 chuyển thành `"Đã đủ"` và dòng tiến độ cập nhật chính xác từ `12 câu · 10 điểm · soạn xong 0/13` lên `12 câu · 10 điểm · soạn xong 1/13` (sau đó đã trả lại trạng thái ban đầu `0/13`). |

---

## Ý d — Chi tiết kiểm tra nút "AI hỗ trợ tạo đề"

- **Ảnh chụp sau khi AI chạy xong:** `docs/kiem-thu/buoc4-ai-sau.png`
- **Trạng thái trước khi bấm AI:**
  - Tiến độ: `12 câu · 10 điểm · soạn xong 1/13`
  - **Câu 1 (soạn tay & đã lưu):**
    - Đề bài: `Số "ba trăm năm mươi hai nghìn không trăm bốn mươi mốt" được viết là:`
    - A: `352 041` · B: `352 410` · C: `325 041` · D: `352 014`
    - Đáp án: `A`
  - Số ô trống còn lại: `12` (`Câu 2`, `Câu 3`, `Câu 4`, `Câu 5`, `Câu 6`, `Câu 7`, `Câu 8 (a)`, `Câu 8 (b, c, d)`, `Câu 9`, `Câu 10`, `Câu 11`, `Câu 12`).
- **Thông báo lỗi nguyên văn từ API (`/api/de-kiem-tra/soan-cau`, HTTP 500):**
  - Banner: `AI chưa soạn được câu nào. Xem lí do bên dưới.`
  - Khung chi tiết: `Còn 12 câu trống (1 câu đã soạn sẽ được giữ nguyên).`
  - Cả 12 ô trống đều báo: `Không giải mã được khóa (AI_KHOA_BI_MAT đã bị đổi?). Nhập lại khóa ở trang Cài đặt AI.`
- **Kết quả kiểm tra từng tiêu chí của Ý d:**
  - **a. Câu 1 giữ nguyên hoàn toàn so với bước 2:** **Đạt** (đề bài, 4 phương án A–D, đáp án `A` không thay đổi từng chữ; nút AI cũng không gọi API cho Câu 1).
  - **b. Các ô trống được điền:** **Không đạt** (`0/12` ô trống được điền do lỗi giải mã khóa `AI_KHOA_BI_MAT` ở server).
  - **c. Mỗi câu AI soạn đủ đề bài, 4 phương án và đáp án:** **Không đạt** (`Câu 2`–`Câu 12`, gồm cả `Câu 8 (a)` và `Câu 8 (b, c, d)` vẫn trống hoàn toàn vì API lỗi khóa).
  - **d. Tổng số câu và tổng điểm không đổi (`12 câu · 10 điểm`):** **Đạt** (hiển thị đúng `12 câu · 10 điểm · soạn xong 1/13`).
- **Chi phí:** **không hiển thị** trên giao diện (ghi nhận thực tế: có 12 lượt gọi `POST /api/de-kiem-tra/soan-cau`, cả 12 lượt dừng ở HTTP 500 trước khi gọi nhà cung cấp AI).

---

## Ghi nhận phụ (nằm ngoài phạm vi thanh hành động bước 4)
- Trên header topbar chung của app ở cỡ `768px` (`buoc4-tablet.png`) và `375px` (`buoc4-mobile.png`), tiêu đề `"Xưởng sản xuất đề kiểm tra AI"` hơi đè lên nút mở menu / badge `"Lớp 4"`. Không sửa gì theo đúng phạm vi chỉ kiểm chứng.
