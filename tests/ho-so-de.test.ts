/** Hồ sơ đề (môn × kì) dùng xuyên suốt 5 bước, và danh sách hồ sơ đang làm ở trang chủ. */
import { describe, expect, it } from 'vitest';
import { ganHoSo, hoSoTuChuoiLuu, hoSoTuTruyVan } from '@/core/ho-so-de/ho-so-de';
import { tinhDanhSachHoSo, type HangBuoc } from '@/core/ho-so-de/danh-sach';

describe('Hồ sơ đề', () => {
  it('đọc từ địa chỉ, bỏ qua môn hoặc kì sai', () => {
    expect(hoSoTuTruyVan('?mon=TOAN&ky=CUOI_NAM')).toEqual({ mon: 'TOAN', ky: 'CUOI_NAM' });
    expect(hoSoTuTruyVan('?mon=TOAN')).toBeNull();
    expect(hoSoTuTruyVan('?mon=HOA&ky=CUOI_NAM')).toBeNull();
    expect(hoSoTuTruyVan('?mon=TOAN&ky=GIUA_KY')).toBeNull();
  });
  it('đọc bản lưu trên máy, chịu được dữ liệu hỏng', () => {
    expect(hoSoTuChuoiLuu('{"mon":"TIENG_VIET","ky":"GIUA_HK2"}')).toEqual({ mon: 'TIENG_VIET', ky: 'GIUA_HK2' });
    expect(hoSoTuChuoiLuu('khong-phai-json')).toBeNull();
    expect(hoSoTuChuoiLuu(null)).toBeNull();
  });
  it('gắn môn, kì vào đường dẫn bước, giữ tham số khác', () => {
    const h = { mon: 'TOAN', ky: 'CUOI_HK1' as const };
    expect(ganHoSo('/dac-ta', h)).toBe('/dac-ta?mon=TOAN&ky=CUOI_HK1');
    expect(ganHoSo('/tests?tab=1', h)).toBe('/tests?tab=1&mon=TOAN&ky=CUOI_HK1');
    expect(ganHoSo('/dac-ta?mon=KHOA_HOC&ky=GIUA_HK1', h)).toBe('/dac-ta?mon=TOAN&ky=CUOI_HK1');
    expect(ganHoSo('/dac-ta', null)).toBe('/dac-ta');
  });
});

describe('Danh sách hồ sơ đang làm', () => {
  const h = (ma_mon: string, ky_kiem_tra: string, x: Partial<HangBuoc>): HangBuoc => ({ ma_mon, ky_kiem_tra, updated_at: '2026-11-10T00:00:00Z', ...x });

  it('tính đúng bước làm tiếp cho từng hồ sơ', () => {
    const ds = tinhDanhSachHoSo(
      [
        h('TOAN', 'CUOI_HK1', { la_ban_nhap: false }),
        h('KHOA_HOC', 'CUOI_HK1', { la_ban_nhap: true }),
        h('TIENG_VIET', 'GIUA_HK2', { la_ban_nhap: false }),
        h('LS_DL', 'CUOI_NAM', { la_ban_nhap: false }),
      ],
      [h('TOAN', 'CUOI_HK1', { la_ban_nhap: false }), h('TIENG_VIET', 'GIUA_HK2', { la_ban_nhap: true }), h('LS_DL', 'CUOI_NAM', { la_ban_nhap: false })],
      [h('TOAN', 'CUOI_HK1', { trang_thai: 'DA_DUYET' }), h('LS_DL', 'CUOI_NAM', { trang_thai: 'TRA_LAI' })],
    );
    const theo = Object.fromEntries(ds.map((d) => [`${d.mon}/${d.ky}`, d]));
    expect(theo['KHOA_HOC/CUOI_HK1']).toMatchObject({ buocTiep: 2, xong: false });
    expect(theo['TIENG_VIET/GIUA_HK2']).toMatchObject({ buocTiep: 3, tinhTrang: 'đặc tả đang làm, chưa xác nhận' });
    expect(theo['LS_DL/CUOI_NAM']).toMatchObject({ buocTiep: 4, tinhTrang: 'đề bị trả lại, cần sửa' });
    expect(theo['TOAN/CUOI_HK1']).toMatchObject({ buocTiep: 5, xong: true });
    // Hồ sơ đã xong xếp cuối
    expect(ds[ds.length - 1].mon).toBe('TOAN');
  });

  it('đặc tả đã xác nhận mà chưa có đề thì làm tiếp bước 4', () => {
    const [d] = tinhDanhSachHoSo([h('TOAN', 'GIUA_HK2', { la_ban_nhap: false })], [h('TOAN', 'GIUA_HK2', { la_ban_nhap: false })], []);
    expect(d).toMatchObject({ buocTiep: 4, tinhTrang: 'đặc tả đã xác nhận, chưa soạn đề' });
  });

  it('xếp hồ sơ cập nhật gần nhất lên trước', () => {
    const ds = tinhDanhSachHoSo(
      [h('TOAN', 'GIUA_HK1', { la_ban_nhap: true, updated_at: '2026-11-01T00:00:00Z' }), h('KHOA_HOC', 'CUOI_NAM', { la_ban_nhap: true, updated_at: '2026-11-20T00:00:00Z' })],
      [],
      [],
    );
    expect(ds.map((d) => d.mon)).toEqual(['KHOA_HOC', 'TOAN']);
  });
});
