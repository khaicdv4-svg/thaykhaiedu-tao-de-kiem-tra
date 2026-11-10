import { describe, expect, it } from 'vitest';
import { docNhieuCauAISoan, loiNhacVietLai, loiNhacSoanNhieuCau } from '../src/core/chuong-trinh/sach';

const meta = { tenMon: 'Toán', dang: 'NLC', hinhThuc: 'TN', muc: 1, diem: 0.5, yccd: 'Làm tròn số', baiHoc: 'Bài 12', trangSgk: '' };

describe('AI soạn nhiều câu và viết lại', () => {
  it('đọc được khối JSON có nhiều câu, bỏ câu không có đề bài và bỏ định dạng Markdown', () => {
    const r = docNhieuCauAISoan('Đây là kết quả:\n```json\n{"cau":[{"deBai":"**Làm tròn 1 234 đến hàng trăm.**","luaChon":["1 200","1 300","1 000","1 230"],"dapAn":"A","huongDanCham":""},{"deBai":"","luaChon":[],"dapAn":""}],"khongDuCanCu":false,"ghiChu":""}\n```');
    expect(r?.cau).toHaveLength(1);
    expect(r?.cau[0].deBai).toBe('Làm tròn 1 234 đến hàng trăm.');
    expect(r?.cau[0].luaChon).toHaveLength(4);
  });

  it('thiếu căn cứ thì trả về khongDuCanCu, không có câu', () => {
    const r = docNhieuCauAISoan('{"cau":[],"khongDuCanCu":true,"ghiChu":"Trang sách không có nội dung bài này"}');
    expect(r).toMatchObject({ khongDuCanCu: true, cau: [] });
  });

  it('trả lời không phải JSON thì null', () => {
    expect(docNhieuCauAISoan('Xin lỗi, tôi không soạn được.')).toBeNull();
    expect(docNhieuCauAISoan('{"cau":[],"khongDuCanCu":false}')).toBeNull();
  });

  it('lời nhắc ghi đúng số câu, yêu cầu cần đạt và yêu cầu chỉnh của giáo viên', () => {
    const a = loiNhacSoanNhieuCau(meta, 4, { sgk: 'Trang 45 ...', sgv: '' });
    expect(a).toContain('đúng 4 câu');
    expect(a).toContain('Làm tròn số');
    const b = loiNhacVietLai({ ...meta, deBai: 'Câu cũ', luaChon: ['a', 'b', 'c', 'd'], dapAn: 'A' }, 'đáp án ngắn hơn');
    expect(b).toContain('YÊU CẦU CỦA GIÁO VIÊN: đáp án ngắn hơn');
    expect(b).toContain('Câu cũ');
  });
});
