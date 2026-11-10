import { describe, expect, it } from 'vitest';
import { timCauTrungGiuaCacDe, type DeSoSanh } from '../src/core/de/trung-giua-cac-de';
import type { CauDe, DeKiemTra } from '../src/core/de/de';

const cau = (khoa: string, deBai: string, luaChon: string[] = []): CauDe => ({
  khoa, cau: khoa.replace('c', ''), yNho: null, muc: 1, hinhThuc: 'TL', dang: 'TLN', diem: 1, yccd: '', deBai, luaChon, dapAn: '', huongDanCham: '', ghiChuHinh: '',
});
const de = (id: string, maMon: string, ky: string, cs: CauDe[]): DeSoSanh => ({ id, maDe: id, maMon, ky, de: { loai: 'DE', ma_mon: maMon, ky_kiem_tra: ky as DeKiemTra['ky_kiem_tra'], phien_ban_dac_ta: 1, cau: cs } });

describe('Câu trùng giữa các đề', () => {
  it('báo câu giống nhau ở hai đề cùng môn, bỏ qua khác hoa thường và khoảng trắng', () => {
    const r = timCauTrungGiuaCacDe([
      de('a', 'TOAN', 'GIUA_HK1', [cau('c1', 'Tính  nhẩm: 30 x 4 = ?  Viết kết quả vào chỗ chấm.')]),
      de('b', 'TOAN', 'CUOI_HK1', [cau('c3', 'tính nhẩm: 30 x 4 = ? viết kết quả vào chỗ chấm.')]),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].cacDe.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('không báo trùng khác môn, câu quá ngắn, hoặc cùng một đề', () => {
    expect(timCauTrungGiuaCacDe([
      de('a', 'TOAN', 'GIUA_HK1', [cau('c1', 'Một câu đủ dài để so sánh nhé'), cau('c2', 'Một câu đủ dài để so sánh nhé')]),
      de('b', 'KHOA_HOC', 'GIUA_HK1', [cau('c1', 'Một câu đủ dài để so sánh nhé')]),
      de('c', 'TOAN', 'GIUA_HK1', [cau('c1', 'Ngắn')]),
      de('d', 'TOAN', 'CUOI_HK1', [cau('c1', 'Ngắn')]),
    ])).toEqual([]);
  });

  it('cùng đề bài nhưng khác phương án thì không phải câu trùng', () => {
    expect(timCauTrungGiuaCacDe([
      de('a', 'TOAN', 'GIUA_HK1', [cau('c1', 'Số nào lớn nhất trong các số sau đây?', ['1', '2', '3', '4'])]),
      de('b', 'TOAN', 'CUOI_HK1', [cau('c1', 'Số nào lớn nhất trong các số sau đây?', ['10', '20', '30', '40'])]),
    ])).toEqual([]);
  });
});
