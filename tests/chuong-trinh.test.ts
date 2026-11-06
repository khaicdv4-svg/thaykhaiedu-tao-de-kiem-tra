import { describe, expect, it } from 'vitest';
import { chiaPhan, docYccdAI, kiemTraTrich } from '@/core/chuong-trinh/trich-yccd';

describe('trích YCCĐ từ tài liệu chương trình', () => {
  it('đọc JSON bọc trong ```, bỏ mục thiếu nội dung', () => {
    const kq = docYccdAI('```json\n[{"mach":"Chất","chuDe":null,"bai":"Bài 1","noiDung":"Nêu được tính chất của nước.","trichDan":"Nêu được tính chất của nước."},{"noiDung":"","trichDan":"x"}]\n```');
    expect(kq).toHaveLength(1);
    expect(kq?.[0].mach).toBe('Chất');
  });
  it('AI trả sai dạng thì trả null', () => {
    expect(docYccdAI('Xin lỗi, tôi không biết.')).toBeNull();
  });
  it('trích dẫn có thật trong tài liệu thì khớp, bịa thì không', () => {
    const tai = '- Nêu được một số tính chất của nước (không màu, không mùi).\n- Làm được thí nghiệm đơn giản.';
    const kq = kiemTraTrich([
      { mach: null, chuDe: null, bai: null, noiDung: 'Nêu được một số tính chất của nước', trichDan: 'Nêu được một số tính chất của nước (không màu, không mùi)' },
      { mach: null, chuDe: null, bai: null, noiDung: 'Giải thích được vòng tuần hoàn của nước', trichDan: 'Giải thích được vòng tuần hoàn của nước' },
    ], tai);
    expect(kq[0].trichKhop).toBe(true);
    expect(kq[1].trichKhop).toBe(false);
  });
  it('bỏ YCCĐ trùng nhau', () => {
    const y = { mach: null, chuDe: null, bai: null, noiDung: 'Nêu được A.', trichDan: 'Nêu được A.' };
    expect(kiemTraTrich([y, { ...y, noiDung: 'nêu được a' }], 'Nêu được A.')).toHaveLength(1);
  });
  it('chia phần ở chỗ xuống dòng, không mất chữ', () => {
    const t = Array.from({ length: 50 }, (_, i) => `Dòng số ${i} ${'x'.repeat(100)}`).join('\n');
    const p = chiaPhan(t, 1000);
    expect(p.length).toBeGreaterThan(3);
    expect(p.join('\n').replace(/\s/g, '').length).toBe(t.replace(/\s/g, '').length);
  });
});
