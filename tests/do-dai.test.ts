import { describe, expect, it } from 'vitest';
import { danhGiaDoDai } from '../src/core/reading-passages/do-dai';

describe('đánh giá số tiếng theo kì kiểm tra', () => {
  it('đọc hiểu truyện: giữa HKI 250–280, cuối HKI 280–300', () => {
    expect(danhGiaDoDai(265, 'DOC_HIEU', 'GIUA_HK1', 'TRUYEN')).toMatchObject({ mau: 'xanh', dungDuoc: true });
    expect(danhGiaDoDai(290, 'DOC_HIEU', 'GIUA_HK1', 'TRUYEN')).toMatchObject({ mau: 'vang', dungDuoc: true });
    expect(danhGiaDoDai(300, 'DOC_HIEU', 'GIUA_HK1', 'TRUYEN')).toMatchObject({ mau: 'do', dungDuoc: false });
    expect(danhGiaDoDai(290, 'DOC_HIEU', 'CUOI_HK1', 'TRUYEN')).toMatchObject({ mau: 'xanh', dungDuoc: true });
  });
  it('cùng một bài, khác kì thì kết quả khác', () => {
    expect(danhGiaDoDai(180, 'DOC_HIEU', 'GIUA_HK1', 'MIEU_TA')?.mau).toBe('xanh');
    expect(danhGiaDoDai(180, 'DOC_HIEU', 'GIUA_HK2', 'MIEU_TA')?.mau).toBe('do');
  });
  it('đọc thành tiếng: bài dài hơn thì cắt đoạn, bài thiếu thì không dùng được', () => {
    expect(danhGiaDoDai(300, 'DOC_THANH_TIENG', 'GIUA_HK1', 'TRUYEN')).toMatchObject({ mau: 'vang', dungDuoc: true });
    expect(danhGiaDoDai(82, 'DOC_THANH_TIENG', 'GIUA_HK1', 'TRUYEN')).toMatchObject({ mau: 'xanh', dungDuoc: true });
    expect(danhGiaDoDai(60, 'DOC_THANH_TIENG', 'CUOI_NAM', 'TRUYEN')).toMatchObject({ mau: 'do', dungDuoc: false });
  });
  it('trả null khi tổ chưa quy định', () => {
    expect(danhGiaDoDai(100, 'DOC_HIEU', 'GIUA_HK1', 'KICH')).toBeNull();
  });
});
