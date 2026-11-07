import { describe, expect, it } from 'vitest';
import { loaiDongChuaDung } from '@/core/chuong-trinh/doc-muc-luc-anh';
import { docMucLuc } from '@/core/chuong-trinh/muc-luc-sgk';

describe('doc-muc-luc-anh', () => {
  it('giữ dòng đủ 5 cột có số trang, bỏ dòng thừa và tiêu đề', () => {
    const kq = loaiDongChuaDung('Đây là kết quả:\n```\nTuần\tBài\tHoạt động\tNội dung\tTrang đầu\n1\t1\tĐọc\tĐiều kì diệu\t8\n\t2\tViết\tViết đoạn\t14\nChủ điểm\t\t\t\t\n```');
    expect(kq).toEqual(['1\t1\tĐọc\tĐiều kì diệu\t8', '\t2\tViết\tViết đoạn\t14']);
  });
  it('dòng giữ lại đọc được bằng docMucLuc', () => {
    const r = docMucLuc(loaiDongChuaDung('1\t1\tĐọc\tĐiều kì diệu\t8\n\t2\tViết\tViết đoạn\t14').join('\n'));
    expect(r.loi).toEqual([]);
    expect(r.dong.length).toBe(2);
  });
});
