# Kiểm tra nguyên nhân mẫu số 13 ở dòng tiến độ ("soạn xong 0/13")

> **Ngày lập:** 28/11/2026  
> **Trạng thái:** Chỉ báo cáo, chưa sửa code trong `src/` hay `tests/`.

---

## 1. Danh sách các chỗ tính và hiển thị mẫu số `13`

| # | Tệp | Dòng | Đoạn code liên quan | Lấy số từ đâu? |
|---|---|---|---|---|
| 1 | `src/core/de/de.ts` | 358–360 | `export function tienDoDe(d: DeKiemTra): { xong: number; tong: number } { return { xong: d.cau.filter(cauDaXong).length, tong: d.cau.length }; }` | Lấy từ `d.cau.length` (số phần tử / ô nhập trong khung đề) |
| 2 | `src/components/quy-trinh/TaoDeView.tsx` | 579 | `const tienDo = useMemo(() => (de ? tienDoDe(de) : { xong: 0, tong: 0 }), [de]);` | Nhận kết quả từ `tienDoDe(de)` |
| 3 | `src/components/quy-trinh/TaoDeView.tsx` | 610 | `<span>{new Set(de.cau.map((c) => c.cau)).size} câu · <b>{fmtDiem(tongDiem)}</b> điểm · soạn xong <b>{tienDo.xong}/{tienDo.tong}</b></span>` | Tử số câu đếm theo `Set(c.cau)` (= `12`); mẫu số tiến độ lấy `tienDo.tong` (= `13`) |
| 4 | `src/components/quy-trinh/TaoDeView.tsx` | 612 | `<div className="h-full bg-emerald-500" style={{ width: `${tienDo.tong ? (tienDo.xong / tienDo.tong) * 100 : 0}%` }} />` | Thanh tiến độ dùng `tienDo.tong` (= `13`) |
| 5 | `src/components/quy-trinh/TaoDeView.tsx` | 600, 710 | `const conTrong = de ? de.cau.filter((c) => trongPhan(c.khoa) && !c.deBai.trim()).length : 0;` | Đếm số phần tử `de.cau` còn trống (= `13` ô khi toàn bộ đề đang trống) |

*(Ngoài ra, trong `src/core/de/de.ts:192`, `taoDeTuDacTa()` dựng `de.cau` bằng `xepDongTheoCau(dacTa.dong).map(...)`, nên `de.cau.length` luôn bằng `dacTa.dong.length`.)*

---

## 2. Nguyên nhân
- **Số `13` không phải số cứng**, mà là `de.cau.length` (bằng `dacTa.dong.length`).
- Trong Đặc tả phiên bản 9 của môn Toán lớp 4 Cuối HKI, **Câu 8 được tách làm 2 dòng** (`Câu 8 (a)` và `Câu 8 (b, c, d)`), nên tổng cộng có `12` câu nhưng có **`13` dòng đặc tả** → `taoDeTuDacTa()` tạo ra **`13` ô nhập** trong `de.cau`.
- Ở lần sửa đếm câu trước, nhãn đầu dòng đã đổi sang đếm số câu duy nhất (`12 câu`), nhưng hàm `tienDoDe(d)` ở `src/core/de/de.ts:358-360` vẫn đếm `d.cau.length` (`13`), dẫn đến dòng chữ `"12 câu · 10 điểm · soạn xong 0/13"`.

---

## 3. Đề xuất sửa (chưa thực hiện)
- **Phương án 1 (khuyến nghị – đồng bộ theo số câu = 12):** Sửa `tienDoDe(d)` trong `src/core/de/de.ts` để gom nhóm `d.cau` theo số thứ tự `c.cau`:
  - `tong`: đếm số câu duy nhất (`demSoCauDe(d.cau)` → `12`).
  - `xong`: đếm số câu mà **tất cả các ý/dòng** của câu đó đều đạt `cauDaXong(c)` (ví dụ Câu 8 chỉ tính là xong khi cả `8 (a)` và `8 (b, c, d)` đều xong).
  - Cân nhắc đồng bộ luôn thông báo `conTrong` theo số câu (hoặc ghi rõ `"13 ô"` / `"12 câu"`) để không gây nhầm lẫn cho giáo viên.
- **Phương án 2 (giữ nguyên đếm ô):** Giữ `tienDoDe` đếm theo ô (`13`), nhưng sửa nhãn hiển thị thành `"soạn xong 0/13 phần"` để phân biệt với `"12 câu"`.

---

## 4. Đã sửa (28/11/2026, theo phương án 1)
- `src/core/de/de.ts`: thêm `nhomOTheoCau()` (nhóm các ô cùng số câu trong cùng một phần, ví dụ `chinh/p1/8a` và `chinh/p1/8bcd`) và `demCauConTrong()`. `tienDoDe()` giờ đếm theo câu: một câu chỉ tính là xong khi mọi ý của câu đều đủ.
- `src/components/quy-trinh/TaoDeView.tsx`: dòng tiến độ, thanh tiến độ, số "câu còn trống" và "câu đã soạn" đều đếm theo câu. Đề Toán mẫu hiện `12 câu · 10 điểm · soạn xong 0/12`.
- `tests/cau-tach-y.test.ts`: thêm kiểm tra tiến độ 0/12 khi trống, Câu 8 chưa xong khi mới soạn (a), 12/12 khi soạn đủ.
- Kiểm thử: 65/65 file, 562/562 test đạt; `tsc --noEmit` và `npm run build` đạt. Chưa commit.
- Còn lại (chưa sửa): khi AI đang chạy, dòng "AI đang soạn… x/y câu" vẫn đếm theo lượt gọi AI (13 lượt cho 12 câu).
