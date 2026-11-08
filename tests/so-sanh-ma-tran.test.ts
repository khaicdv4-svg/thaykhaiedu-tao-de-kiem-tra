import { describe, it, expect } from 'vitest';
import { soSanhMaTran, tomTatThayDoi } from '@/core/kho-ma-tran/so-sanh';

describe('so sánh ma trận', () => {
  it('tìm dòng thêm và dòng bỏ, bỏ qua dòng trống và khoảng trắng thừa', () => {
    const kq = soSanhMaTran('Số học  \n\nHình học\nĐo lường', 'Số học\nHình học\nThống kê');
    expect(kq.them).toEqual(['Thống kê']);
    expect(kq.bo).toEqual(['Đo lường']);
  });
  it('báo không đổi khi giống nhau', () => {
    expect(tomTatThayDoi(soSanhMaTran('a\nb', 'b\na'))).toContain('không đổi');
  });
  it('rút gọn khi quá nhiều dòng', () => {
    const moi = Array.from({ length: 10 }, (_, i) => `dòng ${i}`).join('\n');
    expect(tomTatThayDoi(soSanhMaTran('', moi), 3)).toContain('và 7 dòng khác');
  });
});
