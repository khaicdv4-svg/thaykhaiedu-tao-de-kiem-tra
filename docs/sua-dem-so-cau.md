# Rà soát các chỗ đếm số câu bằng số dòng hoặc số ý

> **Ngày lập:** 28/11/2026  
> **Quy tắc áp dụng:**
> - Đếm số câu theo **số thứ tự câu duy nhất** (`cau`), không đếm theo số dòng hay `so_cau_tinh`. Ví dụ `Câu 8 (a)` và `Câu 8 (b, c, d)` là **1 câu** (Câu 8).
> - Các ý cùng số câu được **cộng điểm lại** (ví dụ `0,5 + 1,5 = 2 điểm`).
> - Một câu có thể nằm ở **nhiều mạch kiến thức khác nhau** (hợp lệ, không báo lỗi).
> - Các ý cùng một câu phải **cùng hình thức** (`TN` hoặc `TL`); nếu khác nhau thì báo **cảnh báo** khi kiểm định, không tự sửa.

---

## Danh sách các vị trí phát hiện trong mã nguồn

| # | Tệp | Dòng / Hàm | Cách đếm sai hiện tại | Cách sửa theo quy tắc |
|---|---|---|---|---|
| 1 | `src/core/matrix/matrix-template.ts` | `tongHop()` (dòng 192–214) | Cộng `cau.so_cau_tinh` vào `soCau`, `soCauTN`, `soCauTL`, `soCauTheoMuc` (Câu 8 `so_cau_tinh: 4` bị đếm thành 4 câu; tách 2 dòng bị đếm thành nhiều câu) | Đếm theo tập số thứ tự câu duy nhất (`bai.ma + cau.cau`) |
| 2 | `src/core/matrix/matrix-template.ts` | `kiemDinhCauTruc()` (dòng 260–324) | Chưa kiểm tra các ý cùng số câu có cùng `hinh_thuc` (TN/TL) hay không | Giữ hợp lệ khi 1 câu chia ý ở nhiều mạch khác nhau; bổ sung **cảnh báo** nếu các phần cùng số câu có `hinh_thuc` khác nhau |
| 3 | `src/core/dac-ta/dac-ta.ts` | Thiếu helper đếm & `kiemDinhDacTa()` | Nơi gọi thường dùng `dacTa.dong.length` | Thêm `demSoCauDacTa(dong)` đếm theo số câu duy nhất; cảnh báo trong `kiemDinhDacTa` nếu các dòng cùng câu khác `hinhThuc` |
| 4 | `src/core/de/de.ts` | Thiếu helper đếm & `kiemDinhDe()` | Nơi gọi thường dùng `de.cau.length` | Thêm `demSoCauDe(cau)` đếm theo số câu duy nhất; cảnh báo trong `kiemDinhDe` nếu các phần cùng câu khác `hinhThuc` |
| 5 | `src/core/de/xuat-word.ts` | `gomMaTran()` & `bangMaTran()` (dòng 1004–1057) | Cộng `r.soCauTinh` vào `n.m[muc][tn/tl]` và cộng dồn `tong.c += soCau` qua từng dòng mạch | Ô `Tổng số câu` (`tong.c`) và các tổng mức đếm theo số câu duy nhất; nếu câu chia ý ở nhiều mạch thì mỗi dòng vẫn hiện đủ, tổng câu không cộng trùng |
| 6 | `src/core/matrix/ti-le-tiet.ts` | `tinhTiLeMach()` (dòng 233, 254) | `cau.reduce((s, c) => s + (c.cau.so_cau_tinh ?? 1), 0)` | Đếm `tongCau` và `cauMaTran` theo số thứ tự câu duy nhất |
| 7 | `src/components/matrices/MatrixPreview.tsx` | `BangToan()` (dòng 87–94, 126–142) & `BangChung()` (dòng 195–261) | `BangToan` cộng `c.so_cau_tinh`; `BangChung` cộng `+ 1` cho từng phần tử `cau_hoi` và `r.cau_hoi.reduce(... + c.so_cau_tinh)` | Đếm theo số thứ tự câu duy nhất (ví dụ Câu 8 tách 2 dòng chỉ tính 1 câu ở dòng `Tổng số câu` / `TỔNG SỐ CÂU`) |
| 8 | `src/components/quy-trinh/DacTaView.tsx` | Dòng 395 | Hiển thị `{dacTa.dong.length} câu` (đếm theo số dòng đặc tả) | Đổi thành `{demSoCauDacTa(dacTa.dong)} câu` |
| 9 | `src/components/quy-trinh/TaoDeView.tsx` | Dòng 198, 299, 578, 631 | Hiển thị `{dacTaBan.duLieu.dong.length} câu` và `{de.cau.length} câu` (đếm theo số dòng/phần) | Đổi thành `demSoCauDacTa(...)` và `demSoCauDe(de.cau)` |

---

## Kiểm tra thêm với đề Toán mẫu lớp 4 Cuối HKI
- Ma trận `chk1-toan.ts`: Câu 1–6 (TN, 0,5đ/câu = 3đ), Câu 7 (TL, 1đ), Câu 8 (TL, 2đ, 4 ý a, b, c, d), Câu 9 (TL, 1đ), Câu 10 (TL, 1đ), Câu 11 (TL, 1,5đ), Câu 12 (TL, 0,5đ).
- Sau khi sửa: **Tổng số câu = 12 câu (6 câu TN, 6 câu TL), tổng điểm = 10 điểm** — kể cả khi Câu 8 được tách thành 2 dòng `Câu 8 (a)` (0,5đ) và `Câu 8 (b, c, d)` (1,5đ) ở 2 mạch kiến thức khác nhau.
