import { describe, expect, it } from 'vitest';
import { chonTrangSgv, docCauAISoan, docKetQuaDoiChieu, gopTrang, khoangTrangCuaCau, phanTichTrangSgk, trangPdfTuTrangSach } from '../src/core/chuong-trinh/sach';

const mucLuc = [
  { tap: 1, baiSo: 3, tuan: 3, trang: 20 }, { tap: 1, baiSo: 3, tuan: 3, trang: 22 }, { tap: 1, baiSo: 4, tuan: 4, trang: 27 },
  { tap: 2, baiSo: 3, tuan: 21, trang: 15 }, { tap: 2, baiSo: 4, tuan: 22, trang: 19 },
];

describe('trang sách của câu', () => {
  it('đọc ô Trang SGK', () => {
    expect(phanTichTrangSgk('tr. 45')).toEqual([45, 45]);
    expect(phanTichTrangSgk('tr. 45–47')).toEqual([45, 47]);
    expect(phanTichTrangSgk('trang 45 - 46')).toEqual([45, 46]);
    expect(phanTichTrangSgk('')).toBeNull();
    expect(phanTichTrangSgk('tr. 10-40')).toBeNull();
  });
  it('ưu tiên trang thầy điền, không thì suy từ mục lục đến trước bài kế', () => {
    expect(khoangTrangCuaCau({ baiHoc: 'Bài 3. Góc', trangSgk: 'tr. 22', tuan: 3 }, mucLuc)).toMatchObject({ tu: 22, den: 22, nguon: 'DAC_TA' });
    expect(khoangTrangCuaCau({ baiHoc: 'Bài 3. Góc', trangSgk: '', tuan: 3 }, mucLuc)).toEqual({ tap: 1, tu: 20, den: 25, nguon: 'MUC_LUC' });
  });
  it('chọn đúng tập theo tuần khi số bài lặp ở hai tập', () => {
    expect(khoangTrangCuaCau({ baiHoc: 'Bài 3. Góc', trangSgk: '', tuan: 21 }, mucLuc)).toMatchObject({ tap: 2, tu: 15, den: 18 });
  });
  it('không đoán khi thiếu căn cứ', () => {
    expect(khoangTrangCuaCau({ baiHoc: 'Ôn tập', trangSgk: '', tuan: 3 }, mucLuc)).toBeNull();
    expect(khoangTrangCuaCau({ baiHoc: 'Bài 9. Xa', trangSgk: '', tuan: 9 }, mucLuc)).toBeNull();
  });
  it('đổi trang sách sang trang PDF', () => {
    expect(trangPdfTuTrangSach(1, 5)).toBe(5);
    expect(trangPdfTuTrangSach(20, 5)).toBe(24);
  });
});

describe('SGV và lời nhắc', () => {
  it('tìm trang SGV theo tên bài', () => {
    const t = [{ trang: 10, noiDung: 'Bài khác' }, { trang: 11, noiDung: 'BÀI 3. GÓC NHỌN, GÓC TÙ' }, { trang: 12, noiDung: 'tiếp' }, { trang: 30, noiDung: 'Góc nhọn, góc tù ôn lại' }];
    expect(chonTrangSgv(t, 'Bài 3. Góc nhọn, góc tù', 2).map((x) => x.trang)).toEqual([11, 12]);
    expect(chonTrangSgv(t, 'Bài 9. Không có', 2)).toEqual([]);
  });
  it('gộp trang có nhãn và bỏ trang rỗng', () => {
    const g = gopTrang('SGK', [{ trang: 5, noiDung: 'abc' }, { trang: 6, noiDung: '  ' }]);
    expect(g).toContain('[SGK trang 5]');
    expect(g).not.toContain('trang 6');
  });
  it('đọc JSON AI trả về, chấp nhận khối code, từ chối khi không có JSON', () => {
    const c = docCauAISoan('```json\n{"deBai":"Góc nào là góc tù?","luaChon":["A","B","C","D"],"dapAn":"C","huongDanCham":"","khongDuCanCu":false,"ghiChu":""}\n```');
    expect(c?.luaChon).toHaveLength(4);
    expect(docCauAISoan('không có json')).toBeNull();
    expect(docCauAISoan('{"khongDuCanCu":true,"ghiChu":"thiếu trang"}')?.khongDuCanCu).toBe(true);
    const k = docKetQuaDoiChieu('{"trongPhamVi":"co","khopSach":"xyz","dapAnDung":"khong","chepNguyenSach":"co","nhanXet":["a"],"goiY":""}');
    expect(k).toMatchObject({ trongPhamVi: 'co', khopSach: 'khong_du_can_cu', dapAnDung: 'khong' });
  });
});
