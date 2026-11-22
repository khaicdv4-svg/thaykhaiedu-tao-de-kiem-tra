import { describe, expect, it } from 'vitest';
import { apDungGhepBai, chonBaiTheoTu, danhSachBaiUngVien, docKetQuaGhepBai } from '@/core/dac-ta/ghep-bai';
import type { DacTa } from '@/core/dac-ta/dac-ta';

// Rút từ PPCT Toán 4 thật (đồng bộ PPCT HUB ngày 15/11) và mục lục SGK
const tiet = [
  [1, 'Ôn tập các số đến 100 000  (tr.6)'], [1, 'Luyện tập (tr7)'], [2, 'Số chẵn , số lẻ (tr.12)'], [2, 'Biểu thức chứa chữ (tr.14)'],
  [3, 'Giải bài toán có 3 bước tính (tr.19)'], [3, 'Luyện tập chung (tr.21)'], [3, 'Đo góc,đơn vị đo góc (tr.23)'], [4, 'Góc nhọn ,góc tù,góc bẹt (tr.26)'],
  [5, 'Số có 6 chữ số (Trang 33)'], [5, 'Hàng và lớp (tr.37)'], [6, 'Hàng và lớp (tt) (tr.38)'], [6, 'Các số trong phạm vi lớp triệu (tr.41)'],
  [7, 'Làm tròn đến hàng trăm nghìn (tr.45)'], [7, 'So sánh các số có nhiều chữ số (tr.47)'], [7, 'Làm quen với dãy số tự nhiên (tr.50)'],
  [8, 'Yến ,tạ tấn (tr.56)'], [10, 'Giây, thế kỉ (tr 66)'], [10, 'Thực hành và trải nghệm sử dụng một số đơn vị đo đại lượng (tr.69)'],
  [11, 'Phép cộng các số có nhiều chữ số (tr.76)'], [12, 'Phép trừ các số có nhiều chữ số (tr.79)'], [12, 'Tính chất giao hoán và kết hợp của phép cộng (tr.82)'],
  [13, 'Tìm hai số khi biết tổng và hiệu của hai số đó (tr.86)'], [15, 'Hình bình hành (tr.105)'], [15, 'Hình thoi (tr.107)'], [16, 'Ôn tập các số đến lớp triệu (tr.114)'],
  [20, 'Nhân với số có một chữ số (tr.5)'],
].map(([tuan, baiTen]) => ({ tuan: tuan as number, baiTen: baiTen as string }));
const mucLuc = [
  { baiSo: 3, tuan: 2, hoatDong: 'Bài học', noiDung: 'Số chẵn, số lẻ', trang: 12 },
  { baiSo: 11, tuan: 5, hoatDong: 'Bài học', noiDung: 'Hàng và lớp', trang: 37 },
  { baiSo: 12, tuan: 6, hoatDong: 'Bài học', noiDung: 'Các số trong phạm vi lớp triệu', trang: 41 },
  { baiSo: 13, tuan: 7, hoatDong: 'Bài học', noiDung: 'Làm tròn số đến hàng trăm nghìn', trang: 45 },
];

describe('Tự ghép câu đặc tả với bài trong PPCT', () => {
  const ds = danhSachBaiUngVien(tiet, mucLuc, 1, 18);

  it('chỉ lấy bài trong phạm vi tuần, bỏ tiết luyện tập, ôn tập; gộp tiết (tt)', () => {
    const ten = ds.map((u) => u.ten);
    expect(ten.some((t) => /luyện tập|ôn tập/i.test(t))).toBe(false);
    expect(ten.filter((t) => /Hàng và lớp/.test(t)).length).toBe(1);
    expect(ten.some((t) => /Nhân với số có một chữ số/.test(t))).toBe(false);
    expect(ds.find((u) => /lớp triệu/.test(u.ten))).toMatchObject({ ten: 'Bài 12: Các số trong phạm vi lớp triệu', tuan: 6, trangSgk: 'tr. 41' });
  });

  it('chấm điểm từ chung chọn đúng các câu rõ ràng', () => {
    const chon = (yccd: string) => chonBaiTheoTu({ khoa: 'x', yccd }, ds)?.ten;
    expect(chon('Làm quen với dãy số tự nhiên và đặc điểm của dãy số tự nhiên.')).toMatch(/dãy số tự nhiên/);
    expect(chon('Nhận biết được hình bình hành, hình thoi.')).toMatch(/Hình bình hành|Hình thoi/);
    expect(chon('Áp dụng được tính chất giao hoán, kết hợp để thực hiện phép tính một cách thuận tiện.')).toMatch(/giao hoán/);
    expect(chon('Làm tròn được số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn, tròn trăm nghìn.')).toMatch(/Làm tròn/);
    expect(chon('Làm quen với biểu thức chứa một, hai, ba chữ và tính được giá trị của biểu thức.')).toMatch(/Biểu thức chứa chữ/);
  });

  it('đọc kết quả AI: bỏ số bài ngoài danh sách và khóa lạ', () => {
    const cau = [{ khoa: 'a', yccd: 'y' }, { khoa: 'b', yccd: 'y' }];
    const kq = docKetQuaGhepBai('Đây: {"ghep":[{"khoa":"a","bai":2},{"khoa":"b","bai":999},{"khoa":"z","bai":1}]}', cau, ds);
    expect([...kq.keys()]).toEqual(['a']);
    expect(kq.get('a')?.so).toBe(2);
  });

  it('chỉ điền ô trống, giữ ô thầy đã điền', () => {
    const d = { dong: [
      { khoa: 'a', baiHoc: '', tuan: null, trangSgk: '' },
      { khoa: 'b', baiHoc: 'Bài thầy chọn', tuan: 9, trangSgk: 'tr. 1' },
    ] } as unknown as DacTa;
    const u = ds[0];
    const kq = apDungGhepBai(d, new Map([['a', u], ['b', u]]));
    expect(kq.soDong).toBe(1);
    expect(kq.dacTa.dong[0].baiHoc).toBe(u.ten);
    expect(kq.dacTa.dong[1].baiHoc).toBe('Bài thầy chọn');
  });
});
