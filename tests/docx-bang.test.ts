import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { docKhoiTuDocx, xmlWordSangKhoi } from '../src/core/utils/docx-bang';

describe('Đọc bảng trong file Word ma trận', () => {
  it('giữ ô gộp ngang, gộp dọc và đoạn canh giữa in đậm', async () => {
    const buf = readFileSync(new URL('./fixtures/ma-tran-bang-mau.docx', import.meta.url));
    const khoi = await docKhoiTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(khoi[0]).toEqual({ loai: 'doan', chu: 'MA TRẬN CHUNG CUỐI HKI', dam: true, giua: true });
    const bang = khoi.find((k) => k.loai === 'bang');
    if (bang?.loai !== 'bang') throw new Error('Không thấy bảng');
    expect(bang.hang[0].map((o) => [o.chu, o.cot, o.hang])).toEqual([
      ['Mạch kiến thức', 1, 2],
      ['YCCĐ', 1, 2],
      ['Số câu và số điểm', 3, 1],
    ]);
    expect(bang.hang[1].map((o) => o.chu)).toEqual(['Mức 1', 'Mức 2', 'Mức 3']);
    expect(bang.hang[2][0]).toMatchObject({ chu: 'Công nghệ và đời sống', hang: 2 });
    expect(bang.hang[2][2].chu).toBe('1 câu\n0,5đ');
    expect(bang.hang[3]).toHaveLength(4); // ô gộp dọc của hàng trên không lặp lại
    expect(khoi.at(-1)).toEqual({ loai: 'doan', chu: 'Hết' });
  });

  it('bỏ chữ trùng trong mc:Fallback và bảng lồng nhau gộp vào ô ngoài', () => {
    const xml = '<w:body><w:p><w:r><mc:AlternateContent><mc:Choice><w:t>A</w:t></mc:Choice><mc:Fallback><w:t>A</w:t></mc:Fallback></mc:AlternateContent></w:r></w:p>'
      + '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Ngoài</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Trong</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:tc></w:tr></w:tbl></w:body>';
    const khoi = xmlWordSangKhoi(xml);
    expect(khoi[0]).toEqual({ loai: 'doan', chu: 'A' });
    expect(khoi[1]).toEqual({ loai: 'bang', hang: [[{ chu: 'Ngoài\nTrong', cot: 1, hang: 1 }]] });
  });
});
