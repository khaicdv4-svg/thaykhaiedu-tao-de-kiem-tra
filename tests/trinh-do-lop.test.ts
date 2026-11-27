import { describe, expect, it } from 'vitest';
import { hoSoTrinhDo, phamViDaHoc } from '../src/core/de/trinh-do-lop';
import { quyTacTheoMon } from '../src/core/de/quy-tac-soan-de';

describe('Hồ sơ trình độ từng lớp', () => {
  it('Toán lớp 2 học kì I: phạm vi 100, chưa học bảng nhân', () => {
    const t = hoSoTrinhDo({ khoi: 2, maMon: 'TOAN', ky: 'CUOI_HK1' });
    expect(t).toContain('LỚP 2, HỌC KÌ I');
    expect(t).toContain('phạm vi 100');
    expect(t).toMatch(/chưa học: .*nhân/i);
  });

  it('Tiếng Việt lớp 3 không dùng thuật ngữ lớp 4', () => {
    const t = hoSoTrinhDo({ khoi: 3, maMon: 'TIENG_VIET', ky: 'GIUA_HK1' });
    expect(t).toContain('từ chỉ sự vật, hoạt động, đặc điểm');
  });

  it('khối 4 Toán: giữ quy định số liệu riêng của tổ, không lặp số liệu khung', () => {
    const t = quyTacTheoMon({ maMon: 'TOAN', ky: 'CUOI_HK1', muc: 2, khoi: 4 });
    expect(t).toContain('TRÌNH ĐỘ HỌC SINH LỚP 4');
    expect(t).toContain('SỐ LIỆU ĐÚNG TẦM LỚP 4');
  });

  it('phạm vi đã học: lấy bài trong kì đến tuần kiểm tra, nêu bài chưa học', () => {
    const tiet = [
      { tuan: 1, baiTen: 'Bài 1: Ôn tập các số đến 100 000' },
      { tuan: 1, baiTen: 'Bài 1: Ôn tập các số đến 100 000' },
      { tuan: 9, baiTen: 'Bài 18: Luyện tập chung' },
      { tuan: 19, baiTen: 'Bài 38: Nhân với số có một chữ số' },
    ];
    const t = phamViDaHoc(tiet, 'GIUA_HK1', 9);
    expect(t).toContain('T1: Bài 1: Ôn tập các số đến 100 000');
    expect(t.match(/Bài 1:/g)).toHaveLength(1);
    expect(t).toContain('CHƯA HỌC');
    expect(t).toContain('Nhân với số có một chữ số');
    expect(phamViDaHoc(tiet, 'GIUA_HK2', 27)).toContain('tuần 19–27');
  });
});

describe('Phạm vi đã học gọn', () => {
  it('bỏ số trang và các tiết Luyện tập', () => {
    const t = phamViDaHoc([
      { tuan: 2, baiTen: 'Số chẵn , số lẻ (tr.12)' },
      { tuan: 2, baiTen: 'Luyện tập (tr.13)' },
      { tuan: 13, baiTen: 'Luyện tập chung (tr.88)' },
    ], 'CUOI_HK1', 18);
    expect(t).toContain('T2: Số chẵn, số lẻ');
    expect(t).not.toContain('Luyện tập');
    expect(t).not.toContain('tr.');
  });
});
