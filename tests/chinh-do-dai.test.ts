import { describe, expect, it } from 'vitest';
import { chinhDuoc, docBanChinhAI, kiemTraBanChinh, nhanAIChinh, soSanhBaiDoc, tacGiaTheo } from '../src/core/reading-passages/chinh-do-dai';

const bai = (n: number, tu = 'mây') => Array.from({ length: n }, () => tu).join(' ');
const k = { min: 200, max: 220, dungSai: 10, donVi: 'tiếng' as const };

describe('AI chỉnh độ dài bài đọc', () => {
  it('so sánh đếm đúng số tiếng thêm, bớt', () => {
    const ss = soSanhBaiDoc('Mùa thu, tiết trời trong xanh dịu nhẹ.', 'Mùa thu, tiết trời dịu nhẹ, mát mẻ.');
    expect(ss.bot).toBe(2); // "trong xanh"
    expect(ss.them).toBeGreaterThanOrEqual(2); // "mát mẻ." (và chữ đổi dấu câu)
    expect(ss.doan.some((d) => d.loai === 'BOT' && d.chu.includes('xanh'))).toBe(true);
  });

  it('chỉ cho chỉnh khi lệch không quá 15%', () => {
    expect(chinhDuoc(242, k)).toEqual({ duoc: true, canDoi: 22, toiDa: 36 });
    expect(chinhDuoc(300, k).duoc).toBe(false);
    expect(chinhDuoc(210, k).duoc).toBe(false); // đã đúng, không cần chỉnh
  });

  it('bản chỉnh hợp lệ: đúng độ dài, đổi ít; có nhãn', () => {
    const goc = `${bai(200)} ${bai(42, 'gió')}`;
    const moi = `${bai(200)} ${bai(15, 'gió')}`;
    const kt = kiemTraBanChinh(goc, moi, k);
    expect(kt.hopLe).toBe(true);
    expect(kt.bot).toBe(27);
    expect(kt.nhan).toBe('Có AI chỉnh sửa bớt 27 tiếng');
  });

  it('bản chỉnh sai: còn ngoài khoảng hoặc đổi quá 15% → chặn', () => {
    expect(kiemTraBanChinh(bai(242), bai(240), k).loi.join(' ')).toContain('ngoài quy định');
    const viet = kiemTraBanChinh(bai(240), bai(210, 'nắng'), k);
    expect(viet.loi.join(' ')).toContain('quá 15%');
  });

  it('nhãn, tác giả "Theo", đọc JSON của AI', () => {
    expect(nhanAIChinh(5, 12)).toBe('Có AI chỉnh sửa thêm 5, bớt 12 tiếng');
    expect(tacGiaTheo('Trần Đức Tiến')).toBe('Theo Trần Đức Tiến');
    expect(tacGiaTheo('Theo Tô Hoài')).toBe('Theo Tô Hoài');
    expect(docBanChinhAI('Đây: {"noiDung": "A b c", "ghiChu": "bớt câu cuối"}')).toEqual({ noiDung: 'A b c', ghiChu: 'bớt câu cuối' });
    expect(docBanChinhAI('không có json')).toBeNull();
  });
});
