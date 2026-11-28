import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { layCauTrongDeAI, thucHienXoaDeNhap } from '../src/components/quy-trinh/TaoDeView';

describe('Thanh hành động bước 4 (Tạo đề)', () => {
  const tao13CauTrong = () =>
    Array.from({ length: 13 }, (_, i) => ({
      khoa: `chinh/p1/${i + 1}`,
      deBai: '',
    }));

  it('khi đề có 13 ô trống, "AI hỗ trợ tạo đề" chỉ chọn đúng 13 ô trống đó', () => {
    const ds = layCauTrongDeAI(tao13CauTrong(), () => true, false);
    expect(ds).toHaveLength(13);
    expect(ds.map((c) => c.khoa)).toEqual(Array.from({ length: 13 }, (_, i) => `chinh/p1/${i + 1}`));
  });

  it('khi đề có sẵn 3 câu thầy đã soạn, "AI hỗ trợ tạo đề" bỏ qua 3 câu đó và chỉ điền 10 ô còn trống', () => {
    const cau = tao13CauTrong().map((c, i) =>
      i < 3 ? { ...c, deBai: `Câu thầy đã soạn số ${i + 1}` } : c,
    );
    const ds = layCauTrongDeAI(cau, () => true, false);
    expect(ds).toHaveLength(10);
    expect(ds.some((c) => c.khoa === 'chinh/p1/1' || c.khoa === 'chinh/p1/2' || c.khoa === 'chinh/p1/3')).toBe(false);
    // 3 câu thầy đã soạn giữ nguyên nội dung
    expect(cau.slice(0, 3).map((c) => c.deBai)).toEqual([
      'Câu thầy đã soạn số 1',
      'Câu thầy đã soạn số 2',
      'Câu thầy đã soạn số 3',
    ]);
  });

  it('"Xóa đề nháp" không xóa khi chưa xác nhận, chỉ xóa khi đã xác nhận', async () => {
    const xoaMock = vi.fn(async () => {});
    const daXoaKhiHuy = await thucHienXoaDeNhap(() => false, xoaMock);
    expect(daXoaKhiHuy).toBe(false);
    expect(xoaMock).not.toHaveBeenCalled();

    const daXoaKhiDongY = await thucHienXoaDeNhap(() => true, xoaMock);
    expect(daXoaKhiDongY).toBe(true);
    expect(xoaMock).toHaveBeenCalledTimes(1);
  });

  it('giao diện thanh hành động có đủ 4 nút chính, menu "⋯" chứa 2 nút phụ và class chống tràn/xuống dòng', () => {
    const src = readFileSync('src/components/quy-trinh/TaoDeView.tsx', 'utf8');
    expect(src).toContain('Soạn đề thủ công');
    expect(src).toContain('AI hỗ trợ tạo đề');
    expect(src).toContain('Lấy từ ngân hàng');
    expect(src).toContain('Xem đề');
    expect(src).toContain('aria-label="Thao tác khác"');
    expect(src).toContain('Làm lại đề trống');
    expect(src).toContain('Xóa đề nháp');
    expect(src).toContain('whitespace-nowrap shrink-0');
  });
});
