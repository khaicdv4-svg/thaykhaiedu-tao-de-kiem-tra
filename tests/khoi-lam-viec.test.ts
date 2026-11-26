import { describe, expect, it } from 'vitest';
import {
  COOKIE_KHOI,
  chonKhoiBanDau,
  chuanHoaKhoi,
  chuoiGhiCookie,
  docKhoi,
  doiLopTrongLoiNhac,
  dsKhoiCuaTruong,
  khoiTuChuoiCookie,
} from '@/core/khoi-lam-viec';
import { maSubjectTheoKhoi } from '@/core/mau-de/mau-de';
import { quyTacTheoMon } from '@/core/de/quy-tac-soan-de';

describe('Khối làm việc', () => {
  it('đọc khối hợp lệ 1–5, sai thì null hoặc về mặc định 4', () => {
    expect(docKhoi('5')).toBe(5);
    expect(docKhoi(3)).toBe(3);
    expect(docKhoi('6')).toBeNull();
    expect(docKhoi('abc')).toBeNull();
    expect(docKhoi(undefined)).toBeNull();
    expect(chuanHoaKhoi('0')).toBe(4);
    expect(chuanHoaKhoi(null)).toBe(4);
  });

  it('danh sách khối của trường: lọc, sắp xếp; trống thì đủ 5 khối', () => {
    expect(dsKhoiCuaTruong([5, 4, 4, 9])).toEqual([4, 5]);
    expect(dsKhoiCuaTruong([])).toEqual([1, 2, 3, 4, 5]);
    expect(dsKhoiCuaTruong(null)).toEqual([1, 2, 3, 4, 5]);
  });

  it('chọn khối lúc mở app: tài khoản → cookie → phân công → 4', () => {
    const ds = [1, 2, 3, 4, 5];
    expect(chonKhoiBanDau({ taiKhoan: 5, cookie: '3', phanCong: [2], dsKhoi: ds })).toBe(5);
    expect(chonKhoiBanDau({ cookie: '3', phanCong: [2], dsKhoi: ds })).toBe(3);
    expect(chonKhoiBanDau({ phanCong: [2], dsKhoi: ds })).toBe(2);
    expect(chonKhoiBanDau({ dsKhoi: ds })).toBe(4);
    // Khối không thuộc trường thì bỏ qua
    expect(chonKhoiBanDau({ taiKhoan: 5, dsKhoi: [1, 2] })).toBe(1);
  });

  it('ghi và đọc cookie khối', () => {
    expect(chuoiGhiCookie(5)).toContain(`${COOKIE_KHOI}=5`);
    expect(khoiTuChuoiCookie(`sb-abc=xyz; ${COOKIE_KHOI}=2; khac=1`)).toBe(2);
    expect(khoiTuChuoiCookie('sb-abc=xyz')).toBeNull();
  });

  it('đổi "lớp 4" trong lời nhắc AI sang khối đang làm việc, không đụng chỗ khác', () => {
    expect(doiLopTrongLoiNhac('Môn Toán lớp 4. QUY TẮC CỦA TỔ KHỐI 4', 5)).toBe('Môn Toán lớp 5. QUY TẮC CỦA TỔ KHỐI 5');
    expect(doiLopTrongLoiNhac('sách Tiếng Việt 4, học sinh lớp 4A, lớp 40', 3)).toBe('sách Tiếng Việt 3, học sinh lớp 4A, lớp 40');
    expect(doiLopTrongLoiNhac('số đến lớp triệu', 5)).toBe('số đến lớp triệu');
    expect(doiLopTrongLoiNhac('Môn Toán lớp 4.', 4)).toBe('Môn Toán lớp 4.');
  });

  it('mã môn mẫu đề theo khối', () => {
    expect(maSubjectTheoKhoi('TOAN', 4)).toBe('subj-toan4');
    expect(maSubjectTheoKhoi('TIENG_VIET', 5)).toBe('subj-tv5');
    expect(maSubjectTheoKhoi('KHONG_CO', 5)).toBeUndefined();
  });

  it('quy tắc số liệu Toán của tổ khối 4 chỉ đưa vào ở khối 4', () => {
    const k4 = quyTacTheoMon({ maMon: 'TOAN', ky: 'CUOI_HK1', muc: 2 });
    const k5 = quyTacTheoMon({ maMon: 'TOAN', ky: 'CUOI_HK1', muc: 2, khoi: 5 });
    expect(k4).toContain('SỐ LIỆU ĐÚNG TẦM LỚP 4');
    expect(k5).not.toContain('SỐ LIỆU ĐÚNG TẦM');
    expect(k5).toContain('MỨC ĐỘ');
  });
});
