import { describe, expect, it } from 'vitest';
import { NHAT_KY_CAP_NHAT, coBanMoi, mucMoiHon, ngayVN, soMoiNhat } from '@/core/phien-ban/phien-ban';

describe('Phiên bản và nhật ký cập nhật', () => {
  it('nhận ra bản mới khi mã máy chủ khác mã trang', () => {
    expect(coBanMoi('421e841', 'a1b2c3d')).toBe(true);
    expect(coBanMoi('421e841', '421e841')).toBe(false);
    expect(coBanMoi('421e841', null)).toBe(false);
    // Chạy thử trên máy: mỗi lần dựng một mã, không báo
    expect(coBanMoi('may-abc', 'may-xyz')).toBe(false);
  });

  it('lấy các mục mới hơn số đã xem, mới nhất ở đầu', () => {
    const moi = mucMoiHon(NHAT_KY_CAP_NHAT, 2);
    expect(moi.map((m) => m.so)).toEqual(NHAT_KY_CAP_NHAT.map((m) => m.so).filter((so) => so > 2).sort((x, y) => y - x));
    expect(mucMoiHon(NHAT_KY_CAP_NHAT, soMoiNhat(NHAT_KY_CAP_NHAT))).toEqual([]);
  });

  it('nhật ký hợp lệ: số không trùng, mục mới nhất đứng đầu, ngày đúng dạng, có nội dung', () => {
    const so = NHAT_KY_CAP_NHAT.map((m) => m.so);
    expect(new Set(so).size).toBe(so.length);
    expect(NHAT_KY_CAP_NHAT[0].so).toBe(soMoiNhat(NHAT_KY_CAP_NHAT));
    for (const m of NHAT_KY_CAP_NHAT) {
      expect(m.ngay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.noiDung.length).toBeGreaterThan(0);
    }
  });

  it('đổi ngày sang dạng Việt Nam', () => {
    expect(ngayVN('2026-11-26')).toBe('26/11/2026');
  });
});
