import { describe, expect, it } from 'vitest';
import { gopBaiSgk, TOI_DA_BAI_SGK } from '@/core/chuong-trinh/sach';

const bai = (soBai: string, trangTu: number, trangDen: number, noiDung = 'Nội dung bài.') => ({ soBai, ten: `Bài ${soBai}`, trangTu, trangDen, noiDung });

describe('gopBaiSgk', () => {
  it('chỉ lấy bài giao với khoảng trang và xếp theo trang', () => {
    const t = gopBaiSgk([bai('3', 20, 22), bai('2', 17, 19), bai('9', 60, 62)], 18, 21);
    expect(t.indexOf('Bài 2')).toBeLessThan(t.indexOf('Bài 3'));
    expect(t).not.toContain('Bài 9');
    expect(t).toContain('tr. 17–19');
  });
  it('bỏ bài không có chữ và giới hạn số bài', () => {
    const nhieu = Array.from({ length: 6 }, (_, i) => bai(String(i + 1), 10, 12));
    expect(gopBaiSgk([bai('7', 10, 12, '   '), ...nhieu], 10, 12).split('[SGK ').length - 1).toBe(TOI_DA_BAI_SGK);
  });
  it('trả chuỗi rỗng khi không có bài phù hợp', () => {
    expect(gopBaiSgk([bai('1', 5, 6)], 50, 52)).toBe('');
  });
});
