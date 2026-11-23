import { describe, expect, it } from 'vitest';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { baiThieuTrongMucLuc, canDiemVaCau, cacMachCuaMaTran, docGoiYMach, ganBaiChoTiet, tinhTiLeMach, trangTrongTenTiet, type MucLucTiLe, type TietTiLe } from '../src/core/matrix/ti-le-tiet';
import { lamSachBaiMach, lamSachBoNao } from '../src/core/bo-nao/bo-nao';

// Trích PPCT Toán 4 học kì I và mục lục SGK thật trên tao-de-thu-nghiem (23/11/2026); mục lục thiếu bài 1 và bài 22.
let tt = 0;
const t = (tuan: number, baiTen: string, loaiTiet = 'standard', hocKi = 1): TietTiLe => ({ thuTu: ++tt, tuan, hocKi, baiTen, loaiTiet });
const TIET: TietTiLe[] = [
  t(1, 'Ôn tập các số đến 100 000  (tr.6)', 'review'),
  t(1, 'Luyện tập (tr7)'),
  t(1, 'Ôn tập các phép tính trong phạm vi 100 000(tr.9)', 'review'),
  t(1, 'Luyện tập (tr.10)'),
  t(2, 'Số chẵn , số lẻ (tr.12)'),
  t(2, 'Luyện tập (tr.13)'),
  t(10, 'Giây, thế kỉ (tr 66)'),
  t(10, 'Giây, thế kỉ (tr 67)'),
  t(11, 'Luyện tập chung (tr.73)'),
  t(11, 'Luyện tập (tr.74)'),
  t(11, 'Phép cộng các số có nhiều chữ số (tr.76)'),
  t(11, 'Luyện tập (tr.78)'),
  t(12, 'Phép trừ các số có nhiều chữ số (tr.79)'),
  t(12, 'Tính chất giao hoán và kết hợp của phép cộng (tr.82)'),
  t(12, 'Tính chất giao hoán và kết hợp của phép cộng (tt) (84)'),
  t(13, 'Tìm hai số khi biết tổng và hiệu của hai số đó (tr.86)'),
  t(18, 'Ôn tập KTCHKI /(tr.129)', 'review'),
  t(19, 'Chia cho số có một chữ số (tr.6)', 'standard', 2),
];
const ML: MucLucTiLe[] = [
  [2, 'Ôn tập các phép tính trong phạm vi 100 000', 9], [3, 'Số chẵn, số lẻ', 12], [19, 'Giây, thế kỉ', 66], [21, 'Luyện tập chung', 73],
  [23, 'Phép trừ các số có nhiều chữ số', 79], [24, 'Tính chất giao hoán và kết hợp của phép cộng', 82], [25, 'Tìm hai số biết tổng và hiệu của hai số đó', 86], [37, 'Ôn tập chung', 127],
].map(([baiSo, noiDung, trang]) => ({ tap: 1, baiSo: baiSo as number, noiDung: noiDung as string, trang: trang as number })).concat([{ tap: 2, baiSo: 39, noiDung: 'Chia cho số có một chữ số', trang: 6 }]);

const baiCua = (ten: string) => {
  const g = ganBaiChoTiet(TIET, ML);
  return g.get(TIET.find((x) => x.baiTen === ten)!.thuTu)!;
};

describe('Đọc bài của từng tiết trong PPCT', () => {
  it('đọc được trang ở nhiều cách ghi', () => {
    expect(trangTrongTenTiet('Luyện tập (tr7)')).toBe(7);
    expect(trangTrongTenTiet('Giây, thế kỉ (tr 66)')).toBe(66);
    expect(trangTrongTenTiet('Số có 6 chữ số (Trang 33)')).toBe(33);
    expect(trangTrongTenTiet('Tính chất giao hoán… (tt) (84)')).toBe(84);
    expect(trangTrongTenTiet('Luyện tập (tr127,.128)')).toBe(127);
    expect(trangTrongTenTiet('Bài 1: Nước (Tiết 1)')).toBeNull();
  });

  it('Toán: tiết luyện tập đi theo bài có trang đầu gần nhất; bài học kì II tra tập 2', () => {
    expect(baiCua('Luyện tập (tr.10)').khoa).toBe('bai-2');
    expect(baiCua('Luyện tập (tr.13)').khoa).toBe('bai-3');
    expect(baiCua('Giây, thế kỉ (tr 67)').khoa).toBe('bai-19');
    expect(baiCua('Tính chất giao hoán và kết hợp của phép cộng (tt) (84)').khoa).toBe('bai-24');
    expect(baiCua('Chia cho số có một chữ số (tr.6)').khoa).toBe('bai-39');
  });

  it('mục lục thiếu bài: tiết bài mới mở đúng bài còn thiếu, không dồn vào bài luyện tập chung liền trước', () => {
    expect(baiCua('Luyện tập (tr.74)').khoa).toBe('bai-21');
    expect(baiCua('Phép cộng các số có nhiều chữ số (tr.76)')).toEqual({ khoa: 'bai-22', ten: 'Bài 22: Phép cộng các số có nhiều chữ số' });
    expect(baiCua('Luyện tập (tr.78)').khoa).toBe('bai-22');
    expect(baiCua('Phép trừ các số có nhiều chữ số (tr.79)').khoa).toBe('bai-23');
    // Trước bài đầu tiên của mục lục (thiếu bài 1)
    expect(baiCua('Ôn tập các số đến 100 000  (tr.6)').khoa).toBe('bai-1');
    expect(baiCua('Luyện tập (tr7)').khoa).toBe('bai-1');
    expect(baiThieuTrongMucLuc(ML)).toContain(22);
  });

  it('Khoa học, LS&ĐL, Công nghệ: đọc "Bài N" trong tên tiết, gom các tiết của cùng bài', () => {
    const tiet: TietTiLe[] = [
      { thuTu: 1, tuan: 1, hocKi: 1, baiTen: 'Bài 1: Tính chất của nước và nước với cuộc sống.(Tiết 1)', loaiTiet: 'standard' },
      { thuTu: 2, tuan: 1, hocKi: 1, baiTen: 'Bài 1: Tính chất của nước và nước với cuộc sống.(Tiết 2)', loaiTiet: 'standard' },
    ];
    const g = ganBaiChoTiet(tiet, []);
    expect(g.get(1)).toEqual({ khoa: 'bai-1', ten: 'Bài 1: Tính chất của nước và nước với cuộc sống' });
    expect(g.get(2)!.khoa).toBe('bai-1');
  });
});

describe('Báo cáo tỉ lệ theo số tiết của mạch', () => {
  const toan = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!;
  const mach = cacMachCuaMaTran(toan);

  it('lấy đúng các mạch của ma trận', () => {
    expect(mach.length).toBeGreaterThan(0);
  });

  it('tính số tiết, tỉ lệ, điểm (bước 0,5, tổng đúng) và số câu theo bảng Bài → Mạch; bài chưa xếp được báo', () => {
    const baiMach: Record<string, string> = { 'bai-1': mach[0], 'bai-2': mach[0], 'bai-3': mach[0], 'bai-19': mach[1] ?? mach[0], 'bai-21': mach[1] ?? mach[0] };
    const bc = tinhTiLeMach({ tiet: TIET, mucLuc: ML, tuyChon: { tuanTu: 1, tuanDen: 18, tinhOnTap: true, tinhKiemTra: false }, baiMach, mtc: toan });
    const tongTietXep = bc.dong.reduce((s, d) => s + d.soTiet, 0);
    expect(tongTietXep).toBe(bc.tongTiet - bc.tietChuaXep);
    expect(bc.tietChuaXep).toBeGreaterThan(0);
    expect(bc.ghiChu.some((g) => /chưa xếp mạch/.test(g))).toBe(true);
    expect(bc.dong.reduce((s, d) => s + d.diemGoiY, 0)).toBeCloseTo(bc.tongDiem, 5);
    expect(bc.dong.every((d) => Number.isInteger(d.diemGoiY * 2))).toBe(true);
    expect(bc.dong.reduce((s, d) => s + d.cauGoiY, 0)).toBe(bc.tongCau);
    expect(bc.dong.reduce((s, d) => s + d.diemMaTran, 0)).toBeCloseTo(bc.tongDiem, 5);
    const m0 = bc.dong.find((d) => d.mach === mach[0])!;
    expect(m0.soTiet).toBe(6); // bài 1 (2 tiết) + bài 2 (2 tiết) + bài 3 (2 tiết)
  });

  it('bỏ tiết ôn tập hoặc đổi khoảng tuần thì số tiết đổi theo; tiết kiểm tra mặc định không tính', () => {
    const baiMach = { 'bai-1': mach[0], 'bai-2': mach[0] };
    const co = tinhTiLeMach({ tiet: TIET, mucLuc: ML, tuyChon: { tuanTu: 1, tuanDen: 18, tinhOnTap: true, tinhKiemTra: false }, baiMach, mtc: toan });
    const khong = tinhTiLeMach({ tiet: TIET, mucLuc: ML, tuyChon: { tuanTu: 1, tuanDen: 18, tinhOnTap: false, tinhKiemTra: false }, baiMach, mtc: toan });
    expect(co.dong[0].soTiet - khong.dong[0].soTiet).toBe(2);
    const hk2 = tinhTiLeMach({ tiet: TIET, mucLuc: ML, tuyChon: { tuanTu: 19, tuanDen: 35, tinhOnTap: true, tinhKiemTra: false }, baiMach, mtc: toan });
    expect(hk2.tongTiet).toBe(1);
  });
});

describe('AI gợi ý mạch và lưu bảng Bài → Mạch', () => {
  it('chỉ nhận mạch có trong danh sách, bỏ chỗ AI bịa', () => {
    const kq = docGoiYMach('```json\n{"1":"số và phép tính","2":"Mạch bịa","3":""}\n```', [{ khoa: 'bai-1' }, { khoa: 'bai-2' }, { khoa: 'bai-3' }], ['Số và phép tính', 'Hình học và đo lường']);
    expect(kq).toEqual({ 'bai-1': 'Số và phép tính' });
  });

  it('Bộ não giữ bảng Bài → Mạch theo môn, bỏ ô rỗng và mã môn lạ', () => {
    expect(lamSachBaiMach({ TOAN: { 'bai-1': ' Số và phép tính ', 'bai-2': '' }, 'x y': { a: 'b' } })).toEqual({ TOAN: { 'bai-1': 'Số và phép tính' } });
    expect(lamSachBoNao({ baiMach: { TOAN: { 'bai-1': 'Số' } } }).baiMach).toEqual({ TOAN: { 'bai-1': 'Số' } });
    expect(lamSachBoNao({}).baiMach).toBeUndefined();
  });
});

describe('canDiemVaCau', () => {
  it('mạch ít tiết có 0,5 điểm thì cũng có 1 câu (51 – 36 – 3 tiết, 10 điểm, 15 câu)', async () => {
    const { chiaTheoTrongSo } = await import('../src/core/matrix/dung-tu-chuong-trinh');
    const tiet = [51, 36, 3];
    const nua = chiaTheoTrongSo(tiet, 20);
    const cau = chiaTheoTrongSo(tiet, 15);
    expect(cau[2]).toBe(0);
    canDiemVaCau(nua, cau);
    expect(nua.reduce((a, b) => a + b, 0)).toBe(20);
    expect(cau.reduce((a, b) => a + b, 0)).toBe(15);
    nua.forEach((d, i) => { expect(d > 0).toBe(cau[i] > 0); expect(d).toBeGreaterThanOrEqual(cau[i]); });
    expect(cau[2]).toBe(1);
  });
  it('mạch có câu mà chưa có điểm thì nhận 0,5 điểm', () => {
    const nua = [12, 8, 0];
    const cau = [8, 6, 1];
    canDiemVaCau(nua, cau);
    expect(nua).toEqual([11, 8, 1]);
  });
});
