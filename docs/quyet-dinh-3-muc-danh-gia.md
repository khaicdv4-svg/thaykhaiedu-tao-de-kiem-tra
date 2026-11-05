# QUYẾT ĐỊNH CHUYÊN MÔN: ÁP DỤNG 3 MỨC ĐỘ ĐÁNH GIÁ ĐỊNH KỲ TIỂU HỌC
**Dự án:** Tạo đề kiểm tra AI – ThayKhaiEdu (Xưởng sản xuất đề kiểm tra thông minh)  
**Người ban hành:** Thầy Võ Việt Khái – Tổ trưởng Chuyên môn Khối 4, Trường TH Trần Văn Ơn  
**Ngày ban hành:** 04/11/2026  
**Căn cứ pháp lý:** Thông tư số 27/2020/TT-BGDĐT ngày 04/9/2020 của Bộ Giáo dục và Đào tạo ban hành Quy định đánh giá học sinh tiểu học  

---

## 1. NGUYÊN TẮC BẮT BUỘC

Trong đánh giá định kỳ các môn học cấp Tiểu học (đặc biệt áp dụng cho Khối 4), hệ thống **TUYỆT ĐỐI CHỈ SỬ DỤNG 3 MỨC ĐỘ NHẬN THỨC**, bám sát Khoản 2 Điều 7 Thông tư 27/2020/TT-BGDĐT:

1. **Mức 1 (LEVEL_1 - Nhận biết):** Nhận biết, nhắc lại hoặc mô tả được nội dung đã học và áp dụng trực tiếp để giải quyết một số tình huống, vấn đề quen thuộc trong học tập.
2. **Mức 2 (LEVEL_2 - Thông hiểu):** Kết nối, sắp xếp được một số nội dung đã học để giải quyết vấn đề có nội dung tương tự.
3. **Mức 3 (LEVEL_3 - Vận dụng):** Vận dụng các nội dung đã học để giải quyết một số vấn đề mới hoặc đưa ra những phản hồi hợp lý trong học tập và cuộc sống.

> [!IMPORTANT]
> **LOẠI BỎ HOÀN TOÀN MỨC 4 (VẬN DỤNG CAO):** Khái niệm "Mức 4: Vận dụng cao" thuộc quy định đánh giá học sinh THCS/THPT (Thông tư 22/2021/TT-BGDĐT) hoặc các tài liệu tập huấn cũ, **không áp dụng cho cấp Tiểu học**. Bất kỳ ma trận hay đề kiểm tra nào ghi 4 mức độ nhận thức đều xem là vi phạm chuẩn chuyên môn tiểu học.

---

## 2. QUY CHUẨN ĐIỂM SỐ VÀ CẤU TRÚC MA TRẬN

- **Thang điểm chuẩn:** 10.0 điểm.
- **Bước điểm:** 0.5 điểm (ví dụ: 0.5đ, 1.0đ, 1.5đ, 2.0đ...). Không dùng bước điểm lẻ 0.25đ trừ khi có chỉ đạo riêng của Sở GD&ĐT.
- **Tỷ lệ định hướng phân bổ mức độ nhận thức (Toán và Tiếng Việt):**
  - **Mức 1:** Khoảng 40% – 50% tổng điểm (Nhận biết kiến thức cốt lõi, kỹ năng cơ bản).
  - **Mức 2:** Khoảng 30% – 40% tổng điểm (Kết nối, thông hiểu, so sánh, bài toán có lời văn cơ bản).
  - **Mức 3:** Khoảng 10% – 20% tổng điểm (Vận dụng giải quyết tình huống thực tế, toán nâng cao mức độ tiểu học, viết sáng tạo).

---

## 3. PHẠM VI ÁP DỤNG TRONG MÃ NGUỒN HỆ THỐNG

| Vị trí mã nguồn | Thành phần áp dụng | Mô tả kiểm soát kỹ thuật |
| :--- | :--- | :--- |
| `src/types/curriculum.ts` | Enum `CognitiveLevel` | Khóa cứng 3 giá trị: `'LEVEL_1'`, `'LEVEL_2'`, `'LEVEL_3'`. Cấu hình nhãn tiếng Việt `COGNITIVE_LEVEL_CONFIG`. |
| `src/core/validation/matrix-validator.ts` | `validateExamMatrix()` | Thuật toán kiểm tra ma trận độc lập: bắt buộc tổng điểm đúng 10.0, bước điểm 0.5, số câu khớp với từng mức. |
| `tests/matrix-validation.test.ts` | Bộ Unit Test Vitest | Kiểm thử tự động từ chối ma trận có mức nhận thức lạ hoặc tổng điểm sai lệch. |
| `src/app/matrices/page.tsx` | Màn hình Soạn ma trận | Giao diện hiển thị rõ 3 cột mức độ nhận thức: Mức 1, Mức 2, Mức 3. |
| `src/app/test-builder/page.tsx` | Xưởng tạo đề | Lọc câu hỏi từ ngân hàng theo đúng 3 mức tương ứng với từng dòng ma trận. |

---

## 4. XÁC NHẬN VÀ HIỆU LỰC

Quyết định này là căn cứ chuyên môn cao nhất cho toàn bộ quy trình thiết kế CSDL, thuật toán kiểm định và giao diện người dùng của phần mềm ThayKhaiEdu. Mọi thành viên phát triển và hệ thống AI đều phải tuân thủ tuyệt đối quy định này.
