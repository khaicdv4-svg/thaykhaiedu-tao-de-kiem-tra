import { describe, expect, it } from 'vitest';
import { xmlSheetSangVanBan, xmlWordSangVanBanCoBang } from '../src/core/utils/docx-text';
import { docBangPpct } from '../src/core/chuong-trinh/ppct-tu-pdf';

const o = (t: string) => `<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
const h = (...c: string[]) => `<w:tr>${c.map(o).join('')}</w:tr>`;

describe('đọc bảng Word', () => {
  it('giữ hàng và ô của bảng, đoạn thường là một dòng', () => {
    const xml = `<w:body><w:p><w:r><w:t>PPCT Toán 4</w:t></w:r></w:p><w:tbl>${h('Tuần', 'Chủ đề', 'Bài', 'Tiết')}${h('1', 'Số', 'Ôn tập', '3')}</w:tbl></w:body>`;
    expect(xmlWordSangVanBanCoBang(xml)).toBe('PPCT Toán 4\nTuần\tChủ đề\tBài\tTiết\n1\tSố\tÔn tập\t3');
  });
  it('bảng Word hợp lệ đi qua bộ đọc PPCT', () => {
    const xml = `<w:tbl>${h('1', 'Số', 'Ôn tập các số đến 100 000', '3')}${h('2', 'Số', 'Số chẵn, số lẻ', '2')}</w:tbl>`;
    const kq = docBangPpct(xmlWordSangVanBanCoBang(xml));
    expect(kq.loi).toEqual([]);
    expect(kq.dong).toHaveLength(2);
    expect(kq.tongTiet).toBe(5);
  });
});

describe('đọc bảng Excel', () => {
  it('đọc chuỗi dùng chung, số, ô trống giữa hàng', () => {
    const xml = '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c><c r="D1"><v>3</v></c></row><row r="2"><c r="A2"><v>2</v></c><c r="B2" t="inlineStr"><is><t>Số</t></is></c></row></sheetData>';
    expect(xmlSheetSangVanBan(xml, ['1', 'Ôn tập'])).toBe('1\t\tÔn tập\t3\n2\tSố');
  });
});

import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import { docBangTuDocx } from '../src/core/utils/docx-text';
describe('tệp .docx thật', () => {
  it('đọc được bảng từ tệp do thư viện docx tạo', async () => {
    const hang = (...c: string[]) => new TableRow({ children: c.map((t) => new TableCell({ children: [new Paragraph(t)] })) });
    const buf = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('KHBD'), new Table({ rows: [hang('1', 'Số', 'Ôn tập', '3'), hang('2', 'Số', 'Số chẵn', '2')] })] }] }));
    const chu = await docBangTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(chu).toContain('1\tSố\tÔn tập\t3');
    expect(docBangPpct(chu.split('\n').slice(1).join('\n')).dong).toHaveLength(2);
  });
});
