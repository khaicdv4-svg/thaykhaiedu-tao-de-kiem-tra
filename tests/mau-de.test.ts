/** Mẫu đề của tổ: đoán môn theo tên file, đọc khổ giấy, lề, phông chữ từ file Word. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { doanOMau, docThongSoDocx, thongSoTuXml } from '@/core/mau-de/mau-de';

describe('Đoán môn theo tên file mẫu', () => {
  it.each([
    ['DE KIEM TRA TOAN CUOI HKI.docx', 'TOAN'],
    ['Mẫu đề Tiếng Việt - Đọc hiểu.docx', 'TIENG_VIET'],
    ['1. KIỂM TRA TV LỚP 4 -GHKI - NH 26-27.docx', 'TIENG_VIET'],
    ['TV_ĐỌC_K4.docx', 'TIENG_VIET'],
    ['Đề Khoa học.docx', 'KHOA_HOC'],
    ['DE LS&DL CHKI.docx', 'LS_DL'],
    ['Lịch sử và Địa lí 4.docx', 'LS_DL'],
    ['Mau de Cong nghe.docx', 'CONG_NGHE'],
  ])('%s → %s', (ten, o) => expect(doanOMau(ten)).toBe(o));

  it('không chắc thì để thầy cô chọn', () => {
    expect(doanOMau('mau-de-moi.docx')).toBeNull();
  });
});

describe('Thông số trang', () => {
  it('đọc khổ A4, lề (mm), phông và cỡ chữ dùng nhiều nhất', () => {
    const doc = '<w:body><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman"/><w:sz w:val="26"/></w:rPr></w:r></w:p>'
      + '<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman"/><w:sz w:val="26"/></w:rPr></w:r><w:r><w:rPr><w:sz w:val="28"/></w:rPr></w:r></w:p>'
      + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="851" w:right="851" w:bottom="851" w:left="1134"/></w:sectPr></w:body>';
    const t = thongSoTuXml(doc, null);
    expect(t).toMatchObject({ khoGiay: 'A4', ngang: false, phong: 'Times New Roman', coChu: 13 });
    expect(t.le).toEqual({ top: 15, bottom: 15, left: 20, right: 15 });
  });

  it('nhận trang ngang và lấy mặc định từ styles khi đoạn văn không ghi', () => {
    const t = thongSoTuXml('<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/></w:sectPr>', '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>');
    expect(t).toMatchObject({ khoGiay: 'A4', ngang: true, phong: 'Arial', coChu: 12 });
  });

  it('đọc được file Word thật', async () => {
    const b = readFileSync('tests/fixtures/ma-tran-bang-mau.docx');
    const t = await docThongSoDocx(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    expect(t.khoGiay).toBeTruthy();
    expect(t.le.top).toBeGreaterThan(0);
  });
});

describe('File Word cũ (.doc)', () => {
  it('đổi chữ thành đoạn văn để xem trước, gọn dòng trống và dấu Tab', async () => {
    const { doanVanTuChuDoc, laFileDocCu } = await import('@/core/mau-de/mau-de');
    const ds = doanVanTuChuDoc('TRƯỜNG TH TRẦN VĂN ƠN\n\n\n\nHỌ TÊN HS:\tKTĐK GIỮA HỌC KÌ I\r\n…/ 0.5 đ\tCâu 1: Người cha bảo gì?\n\n');
    expect(ds.map((d) => d.chu)).toEqual(['TRƯỜNG TH TRẦN VĂN ƠN', '', 'HỌ TÊN HS:     KTĐK GIỮA HỌC KÌ I', '…/ 0.5 đ     Câu 1: Người cha bảo gì?']);
    expect(laFileDocCu('1. ĐỀ KIỂM TRA TV LỚP 4 -GHKI - NH 26-27.doc')).toBe(true);
    expect(laFileDocCu('mau.docx')).toBe(false);
  });
});
