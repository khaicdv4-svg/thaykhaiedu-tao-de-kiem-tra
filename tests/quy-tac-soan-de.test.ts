import { describe, expect, it } from 'vitest';
import { quyTacTheoMon } from '@/core/de/quy-tac-soan-de';
import { loiNhacVietLai } from '@/core/chuong-trinh/sach';

describe('Quy tắc của tổ đưa vào lời nhắc AI', () => {
  it('Toán: cấm số một, hai chữ số; giới hạn nhớ theo kì; mức 3 có tình huống thực tế', () => {
    const q = quyTacTheoMon({ maMon: 'TOAN', ky: 'CUOI_HK1', muc: 3 });
    expect(q).toMatch(/KHÔNG dùng số một, hai chữ số/);
    expect(q).toMatch(/không quá 2 lượt/);
    expect(q).toMatch(/Mức 3/);
    expect(quyTacTheoMon({ maMon: 'TOAN', ky: 'CUOI_NAM', muc: 2 })).toMatch(/không quá 3 lượt/);
  });
  it('môn khác không có quy tắc số liệu Toán', () => {
    expect(quyTacTheoMon({ maMon: 'KHOA_HOC', muc: 1 })).not.toMatch(/lượt/);
  });
  it('lời nhắc viết lại mang đúng số điểm và quy tắc của tổ', () => {
    const t = loiNhacVietLai({ maMon: 'TOAN', ky: 'CUOI_HK1', tenMon: 'Toán', dang: null, hinhThuc: 'TL', muc: 3, diem: 1.5, yccd: 'tổng hiệu', baiHoc: '', trangSgk: '', deBai: 'x' }, 'viết lại');
    expect(t).toMatch(/1,5 điểm/);
    expect(t).toMatch(/QUY TẮC CỦA TỔ KHỐI 4/);
  });
});
