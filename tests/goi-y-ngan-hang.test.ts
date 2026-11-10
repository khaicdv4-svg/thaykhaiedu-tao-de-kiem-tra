import { describe, expect, it } from 'vitest';
import { goiYTuNganHang, type CauNganHangGoiY } from '../src/core/de/goi-y-ngan-hang';
import type { CauDe } from '../src/core/de/de';

const cau = (khoa: string, p: Partial<CauDe>): CauDe => ({
  khoa, cau: khoa, yNho: null, muc: 1, hinhThuc: 'TN', dang: 'NLC', diem: 0.5, yccd: '', deBai: '', luaChon: [], dapAn: '', huongDanCham: '', ghiChuHinh: '', ...p,
});
const nh = (id: string, p: Partial<CauNganHangGoiY>, deBai = 'Đề ' + id): CauNganHangGoiY => ({
  id, muc: 1, hinhThuc: 'TN', dang: 'NLC', yccd: '', daKiemDinh: false,
  noiDung: { deBai, luaChon: ['a', 'b', 'c', 'd'], dapAn: 'A', huongDanCham: '', ghiChuHinh: '' }, ...p,
});

describe('Gợi ý câu từ ngân hàng', () => {
  it('chỉ gợi ý cho câu trống và đúng mức, hình thức, dạng', () => {
    const r = goiYTuNganHang(
      [cau('c1', {}), cau('c2', { deBai: 'đã có' }), cau('c3', { muc: 2 })],
      [nh('a', {}), nh('b', { muc: 3 })],
    );
    expect(r.map((x) => [x.khoa, x.cauNganHang.id])).toEqual([['c1', 'a']]);
  });

  it('ưu tiên cùng YCCĐ và câu đã kiểm định, mỗi câu ngân hàng dùng một lần', () => {
    const r = goiYTuNganHang(
      [cau('c1', { yccd: 'So sánh các số có nhiều chữ số' }), cau('c2', { yccd: 'Làm tròn số đến hàng trăm nghìn' })],
      [
        nh('x', { yccd: 'Làm tròn số đến hàng trăm nghìn' }),
        nh('y', { yccd: 'So sánh các số có nhiều chữ số', daKiemDinh: true }),
        nh('z', { yccd: 'Khác hẳn' }),
      ],
    );
    expect(r.find((x) => x.khoa === 'c1')?.cauNganHang.id).toBe('y');
    expect(r.find((x) => x.khoa === 'c2')?.cauNganHang.id).toBe('x');
  });

  it('câu đúng/sai cần đủ số ý; trắc nghiệm cần đủ 4 phương án và có đáp án', () => {
    const ds = cau('d1', { dang: 'DS', yNho: ['a', 'b', 'c'] });
    const r = goiYTuNganHang([ds, cau('n1', {})], [
      nh('ds2', { dang: 'DS', noiDung: { deBai: 'x', luaChon: ['1', '2'], dapAn: 'ĐS', huongDanCham: '', ghiChuHinh: '' } }),
      nh('ds3', { dang: 'DS', noiDung: { deBai: 'y', luaChon: ['1', '2', '3'], dapAn: 'ĐSĐ', huongDanCham: '', ghiChuHinh: '' } }),
      nh('thieu', { noiDung: { deBai: 'z', luaChon: ['a', 'b'], dapAn: 'A', huongDanCham: '', ghiChuHinh: '' } }),
    ]);
    expect(r.map((x) => x.cauNganHang.id)).toEqual(['ds3']);
  });
});
