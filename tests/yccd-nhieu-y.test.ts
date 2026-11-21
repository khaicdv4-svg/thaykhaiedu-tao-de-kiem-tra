/**
 * Câu có nhiều ý nhỏ được gắn nhiều YCCĐ (Toán Câu 8 a, b, c, d: cộng, trừ và nhân, chia).
 * Câu không có ý nhỏ vẫn chỉ một YCCĐ.
 */
import { describe, expect, it } from 'vitest';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { danhSachCau, dungMaTranRieng, kiemDinhMaTranRieng, taoMaTranRiengRong, yccdCuaCauRieng } from '@/core/matrix/matrix-template';
import { taoDacTa } from '@/core/dac-ta/dac-ta';
import type { MaTranRieng } from '@/types/matrix-template';

const toan = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!;
const cau = danhSachCau(toan);
const c8 = cau.find((c) => c.cau.cau === '8')!;

function mtrDu(): MaTranRieng {
  const m = taoMaTranRiengRong(toan);
  m.cau_hoi = cau.map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  return m;
}

describe('YCCĐ cho câu nhiều ý nhỏ', () => {
  it('Câu 8 trong mẫu có 4 ý và dòng có 2 YCCĐ', () => {
    expect(c8.cau.y_nho).toEqual(['a', 'b', 'c', 'd']);
    expect(c8.dong.yccd.length).toBeGreaterThanOrEqual(2);
  });

  it('gắn cả hai YCCĐ cho Câu 8 vẫn hợp lệ', () => {
    const m = mtrDu();
    m.cau_hoi = m.cau_hoi.map((x) => (x.khoa === c8.khoa ? { ...x, yccd_them: [c8.dong.yccd[1]] } : x));
    const kq = kiemDinhMaTranRieng(toan, m);
    expect(kq.loi.filter((l) => l.includes('Câu 8'))).toEqual([]);
    expect(yccdCuaCauRieng(m.cau_hoi.find((x) => x.khoa === c8.khoa)!)).toEqual(c8.dong.yccd.slice(0, 2));
  });

  it('câu không có ý nhỏ thì không được gắn thêm', () => {
    const c1 = cau.find((c) => c.cau.cau === '1')!;
    const m = mtrDu();
    m.cau_hoi = m.cau_hoi.map((x) => (x.khoa === c1.khoa ? { ...x, yccd_them: ['Một YCCĐ khác'] } : x));
    expect(kiemDinhMaTranRieng(toan, m).loi.some((l) => l.includes('Câu 1') && l.includes('chỉ được gắn một YCCĐ'))).toBe(true);
  });

  it('YCCĐ thêm phải thuộc dòng của câu', () => {
    const m = mtrDu();
    m.cau_hoi = m.cau_hoi.map((x) => (x.khoa === c8.khoa ? { ...x, yccd_them: ['YCCĐ không có trong dòng'] } : x));
    expect(kiemDinhMaTranRieng(toan, m).loi.some((l) => l.includes('Câu 8') && l.includes('không thuộc dòng'))).toBe(true);
  });

  it('đặc tả ghép các YCCĐ của câu; ma trận riêng giữ đủ cả hai', () => {
    const m = mtrDu();
    m.cau_hoi = m.cau_hoi.map((x) => (x.khoa === c8.khoa ? { ...x, yccd_them: [c8.dong.yccd[1]] } : x));
    m.trang_thai = 'DA_XAC_NHAN';
    const dt = taoDacTa(toan, m, 1);
    const dong8 = dt.dong.find((d) => d.khoa === c8.khoa)!;
    expect(dong8.yccd).toBe(`${c8.dong.yccd[0]}; ${c8.dong.yccd[1]}`);
    const rieng = dungMaTranRieng(toan, m);
    const dongRieng = rieng.bai_kiem_tra[0].phan[0].dong.find((d) => d.cau_hoi.some((x) => x.cau === '8'))!;
    expect(dongRieng.yccd).toEqual(c8.dong.yccd.slice(0, 2));
  });
});

describe('Chuyển bản nháp sang ma trận chung mới', () => {
  it('giữ YCCĐ và chỗ sửa còn khớp, đổi sang phiên bản mới, bỏ phần không khớp', async () => {
    const { chuyenMaTranRiengSangBanMoi } = await import('@/core/matrix/matrix-template');
    const moi = { ...toan, phien_ban_mau: 'kho-2' };
    const cu = mtrDu();
    cu.cau_hoi.push({ khoa: 'chinh/p1/99', yccd: 'câu không còn' });
    cu.cau_hoi = cu.cau_hoi.map((x) => (x.khoa === c8.khoa ? { ...x, yccd_them: [c8.dong.yccd[1]] } : x));
    cu.sua_cau = { [c8.khoa]: { diem: 1.5 } };
    const { mtr, giu, bo } = chuyenMaTranRiengSangBanMoi(moi, cu);
    expect(mtr.phien_ban_ma_tran_chung).toBe('kho-2');
    expect(giu).toBe(cau.length);
    expect(bo).toBe(1);
    expect(mtr.cau_hoi.find((x) => x.khoa === c8.khoa)?.yccd_them).toEqual([c8.dong.yccd[1]]);
    expect(mtr.sua_cau).toEqual({ [c8.khoa]: { diem: 1.5 } });
    expect(kiemDinhMaTranRieng(moi, mtr).loi.filter((l) => l.includes('phiên bản'))).toEqual([]);
  });
});
