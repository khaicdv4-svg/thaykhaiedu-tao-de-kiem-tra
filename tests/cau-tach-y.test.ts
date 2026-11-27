import { describe, expect, it } from 'vitest';
import { docOCau } from '../src/core/kho-ma-tran/doc-ma-tran-chung';
import { danhKhoaCauTach, kiemDinhMaTranChung, laCauTachY } from '../src/core/matrix/matrix-template';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { laPhanCauTach, nhanCau } from '../src/core/de/de';
import type { MaTranChung } from '../src/types/matrix-template';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('Câu chia ý ở nhiều dòng ma trận (Câu 8 (a) và Câu 8 (b, c, d))', () => {
  it('đọc được ô "1 Câu 8 (a)" và "3 Câu 8 (b, c, d)"', () => {
    expect(docOCau('1\nCâu 8\n(a)')).toMatchObject({ cau: ['8'], yNho: ['a'] });
    expect(docOCau('3\nCâu 8\n(b, c, d)')).toMatchObject({ cau: ['8'], yNho: ['b', 'c', 'd'] });
  });

  it('chấp nhận câu chia ý, chỉ báo trùng khi các ý chồng nhau', () => {
    expect(laCauTachY([{ y_nho: ['a'] }, { y_nho: ['b', 'c', 'd'] }])).toBe(true);
    expect(laCauTachY([{ y_nho: ['a', 'b'] }, { y_nho: ['b', 'c'] }])).toBe(false);
    expect(laCauTachY([{ y_nho: null }, { y_nho: ['b'] }])).toBe(false);
  });

  it('ma trận Toán có Câu 8 tách hai dòng: không còn lỗi trùng số thứ tự, khóa riêng từng phần', () => {
    const toan = clone(MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!) as MaTranChung;
    const phan = toan.bai_kiem_tra[0].phan[0];
    // Tìm một câu có số lớn nhất, tách thành hai phần ở hai dòng
    const dong = phan.dong.filter((d) => d.cau_hoi.length);
    const d1 = dong[0];
    const d2 = dong[dong.length - 1];
    const so = String(Math.max(...phan.dong.flatMap((d) => d.cau_hoi.map((c) => Number(c.cau))).filter(Number.isFinite)) + 1);
    d1.cau_hoi.push({ cau: so, y_nho: ['a'], so_cau_tinh: 1, muc: 2, hinh_thuc: 'TL', dang: null, diem: 0.5 });
    d2.cau_hoi.push({ cau: so, y_nho: ['b', 'c', 'd'], so_cau_tinh: 3, muc: 2, hinh_thuc: 'TL', dang: null, diem: 1.5 });
    danhKhoaCauTach(toan);
    const kq = kiemDinhMaTranChung(toan);
    expect(kq.loi.some((l) => /trùng số thứ tự/.test(l))).toBe(false);
    expect(d1.cau_hoi.at(-1)!.khoa_goc).toBe(`${so}a`);
    expect(d2.cau_hoi.at(-1)!.khoa_goc).toBe(`${so}bcd`);
  });

  it('nhãn câu ghi rõ ý của từng phần', () => {
    const c = { cau: '8', khoa: 'chinh/p1/8bcd', yNho: ['b', 'c', 'd'] };
    expect(laPhanCauTach(c)).toBe(true);
    expect(nhanCau(c)).toBe('Câu 8 (b, c, d)');
    expect(nhanCau({ cau: '8', khoa: 'chinh/p1/8', yNho: ['a', 'b'] })).toBe('Câu 8');
  });
});
