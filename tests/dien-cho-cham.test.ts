import { describe, expect, it } from 'vitest';
import { laDienChoCham, moRongChoCham, soDongTraLoi, tachYTrongDeBai } from '../src/core/de/de';

describe('Câu điền thẳng vào chỗ chấm', () => {
  const deBai = 'Viết số thích hợp vào chỗ chấm:\nb) 2 400 cm² + 6 dm² = ... cm²\nc) 2 tấn 5 tạ − 800 kg = ... kg';
  it('không chừa dòng kẻ bên dưới, chỗ chấm được kéo dài', () => {
    expect(laDienChoCham({ dang: null, deBai, hinhThuc: 'TL' })).toBe(true);
    expect(soDongTraLoi({ dang: null, diem: 1.5, deBai }, 'TOAN')).toBe(0);
    expect(moRongChoCham(deBai)).toContain('= …………………… cm²');
  });
  it('câu tự luận thường vẫn có dòng kẻ', () => {
    expect(soDongTraLoi({ dang: null, diem: 1, deBai: 'Tính bằng cách thuận tiện: 31 600 + 25 480 + 4 400' }, 'TOAN')).toBeGreaterThan(0);
  });
  it('tách được các ý bắt đầu từ b)', () => {
    expect(tachYTrongDeBai('Đặt tính rồi tính: b) 12 345 + 6 789 c) 98 765 − 4 321')?.y.map((x) => x.nhan)).toEqual(['b', 'c']);
  });
});
