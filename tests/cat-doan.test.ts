import { describe, expect, it } from 'vitest';
import { catDoanTotNhat, goiYCatDoan } from '../src/core/reading-passages/cat-doan';
import { countVietnameseSyllables } from '../src/core/utils/vietnamese-word-counter';

/** Tạo câu có đúng n tiếng, kết thúc bằng dấu chấm. */
function cau(n: number, dau = '.'): string {
  return Array.from({ length: n }, (_, i) => `tiếng${i}`).join(' ') + dau;
}

describe('cắt đoạn đọc thành tiếng', () => {
  it('ngắt ở cuối câu khi có chỗ rơi vào khoảng cho phép', () => {
    const vb = [cau(40), cau(41), cau(50)].join(' ');
    const c = catDoanTotNhat(vb, { min: 80, max: 85 })!;
    expect(c.soTieng).toBe(81);
    expect(c.kieuNgat).toBe('CUOI_CAU');
    expect(countVietnameseSyllables(c.doan)).toBe(81);
    expect(c.batDau).toBe('DAU_BAI');
  });

  it('không cắt khi bài ngắn hơn mức tối thiểu', () => {
    expect(goiYCatDoan(cau(60), { min: 80, max: 85 })).toEqual([]);
  });

  it('ngắt ở cuối dòng khi là thơ không có dấu câu', () => {
    const dong = (n: number) => Array.from({ length: n }, (_, i) => `chữ${i}`).join(' ');
    const tho = [dong(30), dong(25), dong(27), dong(20)].join('\n');
    const c = catDoanTotNhat(tho, { min: 80, max: 85 })!;
    expect(c.soTieng).toBe(82);
    expect(c.kieuNgat).toBe('CUOI_DONG');
  });

  it('ưu tiên dấu phẩy hơn là cắt giữa câu, và cắt giữa câu là cách cuối', () => {
    const cauDai = Array.from({ length: 120 }, (_, i) => `t${i}`).join(' ');
    const c = catDoanTotNhat(cauDai, { min: 80, max: 85 })!;
    expect(c.kieuNgat).toBe('GIUA_CAU');
    expect(c.soTieng).toBeGreaterThanOrEqual(80);
    expect(c.soTieng).toBeLessThanOrEqual(85);

    const cauPhay = Array.from({ length: 120 }, (_, i) => (i === 81 ? `t${i},` : `t${i}`)).join(' ');
    const c2 = catDoanTotNhat(cauPhay, { min: 80, max: 85 })!;
    expect(c2.kieuNgat).toBe('DAU_PHAY');
    expect(c2.soTieng).toBe(82);
  });

  it('lấy được đoạn giữa bài khi đầu bài không có chỗ ngắt đẹp', () => {
    const dau = Array.from({ length: 100 }, (_, i) => `a${i}`).join(' ');
    const giua = cau(83);
    const c = goiYCatDoan(`${dau}\n${giua}`, { min: 80, max: 85 });
    expect(c[0].kieuNgat).toBe('CUOI_CAU');
    expect(c[0].batDau).toBe('GIUA_BAI');
    expect(c[0].soTieng).toBe(83);
  });

  it('coi dấu gạch đầu dòng lời thoại không phải là tiếng', () => {
    const vb = `- ${cau(40)}\n- ${cau(41)}\n- ${cau(30)}`;
    const c = catDoanTotNhat(vb, { min: 80, max: 85 })!;
    expect(c.soTieng).toBe(81);
  });

  it('cuối dòng kết thúc bằng dấu hai chấm không phải chỗ ngắt tốt', () => {
    const dong1 = Array.from({ length: 81 }, (_, i) => `t${i}`).join(' ') + ' bảo:';
    const c = catDoanTotNhat(`${dong1}\n- ${cau(10)}`, { min: 80, max: 85 })!;
    expect(c.kieuNgat).toBe('DAU_PHAY');
  });

  it('dùng dung sai khi chỉ có chỗ ngắt đẹp nằm ngoài khoảng một chút', () => {
    // Câu thứ nhất 78 tiếng (ngoài 80–85 nhưng trong dung sai ±5), câu thứ hai dài.
    const vb = `${cau(78)} ${Array.from({ length: 40 }, (_, i) => `x${i}`).join(' ')}`;
    const khongDungSai = catDoanTotNhat(vb, { min: 80, max: 85 })!;
    expect(khongDungSai.kieuNgat).toBe('GIUA_CAU');
    const coDungSai = catDoanTotNhat(vb, { min: 80, max: 85, dungSai: 5 })!;
    expect(coDungSai.kieuNgat).toBe('CUOI_CAU');
    expect(coDungSai.soTieng).toBe(78);
    expect(coDungSai.trongKhoang).toBe(false);
  });
});
