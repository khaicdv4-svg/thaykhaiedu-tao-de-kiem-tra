import { describe, expect, it } from 'vitest';
import { CSV_MAU, docMucLuc } from '../src/core/chuong-trinh/muc-luc-sgk';

const tiet = [
  { tuan: 1, baiTen: 'Bài 1\nĐiều kì diệu\n(3 tiết)' },
  { tuan: 2, baiTen: 'Bài 1\nĐiều kì diệu\n(3 tiết)' },
  { tuan: 1, baiTen: 'Bài 2\nThi nhạc (4 tiết)' },
];

describe('Đọc mục lục SGK', () => {
  it('file mẫu đọc được, không lỗi', () => {
    const kq = docMucLuc(CSV_MAU);
    expect(kq.loi).toEqual([]);
    expect(kq.dong).toHaveLength(3);
    expect(kq.dong[0]).toEqual({ tuan: 1, bai: 1, hoatDong: 'Đọc', noiDung: 'Điều kì diệu', trang: 8 });
  });

  it('đọc được bảng dán từ Excel (ngăn cách bằng Tab) và ô có dấu phẩy trong nháy kép', () => {
    const kq = docMucLuc('1\t1\tĐọc\tĐiều kì diệu\t8\r\n1\t1\tLuyện từ và câu\tDanh từ, động từ\t9\n');
    expect(kq.loi).toEqual([]);
    expect(kq.dong[1].noiDung).toBe('Danh từ, động từ');
    const csv = docMucLuc('Tuần,Bài,Hoạt động,Nội dung,Trang đầu\n1,1,Viết,"Tìm hiểu đoạn văn, câu chủ đề",10');
    expect(csv.dong[0].noiDung).toBe('Tìm hiểu đoạn văn, câu chủ đề');
  });

  it('Đọc mở rộng không có nội dung vẫn hợp lệ', () => {
    expect(docMucLuc('2,4,Đọc mở rộng,,22').loi).toEqual([]);
  });

  it('báo lỗi đúng dòng khi bài, trang sai hoặc thiếu cột', () => {
    const kq = docMucLuc('1,x,Đọc,A,8\n1,1,Đọc,B,abc\n1,1,Đọc\n1,1,,B,9');
    expect(kq.dong).toHaveLength(0);
    expect(kq.loi.map((l) => l.slice(0, 7))).toEqual(['Dòng 1:', 'Dòng 2:', 'Dòng 3:', 'Dòng 4:']);
  });

  it('báo trùng dòng', () => {
    const kq = docMucLuc('1,1,Đọc,A,8\n1,1,Đọc,A,9');
    expect(kq.loi[0]).toContain('trùng');
  });

  it('cảnh báo trang giảm dần và thiếu bài', () => {
    const kq = docMucLuc('1,1,Đọc,A,20\n1,2,Đọc,B,10\n2,5,Đọc,C,30');
    expect(kq.canhBao.some((c) => c.includes('bài 2') && c.includes('nhỏ hơn'))).toBe(true);
    expect(kq.canhBao.some((c) => c.includes('Thiếu bài 3 đến bài 4'))).toBe(true);
  });

  it('đối chiếu PPCT: bài không có, tuần lệch; tuần nằm trong các tuần của bài thì không cảnh báo', () => {
    const kq = docMucLuc('2,1,Đọc,A,8\n1,2,Đọc,B,12\n3,2,Viết,C,14\n4,3,Đọc,D,16', tiet);
    expect(kq.canhBao.some((c) => c.includes('Bài 1'))).toBe(false);
    expect(kq.canhBao.filter((c) => c.includes('Bài 2'))).toHaveLength(1);
    expect(kq.canhBao.some((c) => c.includes('Bài 2') && c.includes('tuần 3'))).toBe(true);
    expect(kq.canhBao.some((c) => c.includes('Bài 3') && c.includes('không có trong'))).toBe(true);
  });

  it('rỗng thì báo cần nhập', () => {
    expect(docMucLuc('  \n').loi[0]).toContain('Chưa có dòng nào');
  });
});
