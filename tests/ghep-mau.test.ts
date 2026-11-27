import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { AlignmentType, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { strFromU8, unzipSync } from 'fflate';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong, type LuaChon } from '../src/core/matrix/matrix-template';
import { taoDacTa } from '../src/core/dac-ta/dac-ta';
import { taoDeTuDacTa } from '../src/core/de/de';
import { dungHoSoDe, dungTaiLieuDe, dungTaiLieuTiengViet } from '../src/core/de/xuat-word';
import { ghepDauBaiTheoMau, layDauBaiMau } from '../src/core/mau-de/ghep-mau';

// Hình 1×1 điểm ảnh (giả làm logo trường trong mẫu)
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

const r = (text: string, o: { bold?: boolean; size?: number } = {}) => new TextRun({ text, font: 'Times New Roman', size: o.size ?? 26, bold: o.bold });
const p = (runs: TextRun[] | TextRun, giua = false) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: giua ? AlignmentType.CENTER : undefined });

/** Mẫu giống file của tổ: khổ Letter, lề trái 2,25 cm; tiêu đề tách nhiều lần chạy chữ; dòng "Môn" viết thường. */
async function taoMau(tieuDeMotDoan = false): Promise<Uint8Array> {
  const tieuDe = tieuDeMotDoan
    ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [r('KIỂM TRA CUỐI HKI ', { bold: true }), r('NĂM HỌC  2025 - 2026', { bold: true }), new TextRun({ break: 1 }), r('Môn KHOA HỌC - Lớp 4 (CT)', { bold: true }), new TextRun({ break: 1 }), r('Thời gian: 35 phút')] })]
    : [p([r('KIỂM TRA ', { bold: true }), r('GIỮA HKI', { bold: true }), r(' NĂM HỌC 2025 - 2026', { bold: true })], true), p(r('Môn KHOA HỌC - Lớp 4 (CT)', { bold: true }), true), p(r('Thời gian: 40 phút'), true)];
  const bangTen = new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [4000, 1700, 1700, 1600],
    rows: [
      new TableRow({ children: [
        new TableCell({ rowSpan: 2, width: { size: 4000, type: WidthType.DXA }, children: [
          new Paragraph({ children: [new ImageRun({ type: 'png', data: PNG, transformation: { width: 20, height: 20 } })] }),
          p(r('TRƯỜNG TH TRẦN VĂN ƠN', { bold: true })), p(r('HỌ TÊN HS: ……………')), p(r('LỚP: ……………')), p(r('NGÀY KIỂM TRA: ……')),
        ] }),
        new TableCell({ columnSpan: 3, width: { size: 5000, type: WidthType.DXA }, children: tieuDe }),
      ] }),
      new TableRow({ children: ['GV coi KT1', 'GV coi KT2', 'Số thứ tự'].map((t) => new TableCell({ width: { size: 1666, type: WidthType.DXA }, children: [p(r(t, { bold: true }), true)] })) }),
    ],
  });
  const bangDiem = new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [1500, 3500, 2000, 2000],
    rows: [new TableRow({ children: ['Điểm', 'Nhận xét', 'GV chấm KT1', 'GV chấm KT2'].map((t, i) => new TableCell({ width: { size: [1500, 3500, 2000, 2000][i], type: WidthType.DXA }, children: [p(r(t, { bold: true }), true)] })) })],
  });
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { left: 1276, right: 1964, top: 400, bottom: 400 } } },
      children: [bangTen, p(r('')), bangDiem, p(r('PHẦN I. TRẮC NGHIỆM (6 điểm)', { bold: true })), p(r('Câu 1. Nước có thể thấm qua những vật nào dưới đây?'))],
    }],
  });
  return new Uint8Array(await Packer.toBuffer(doc));
}

function deLsdl() {
  const mtc = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'LS_DL')!;
  const lc: LuaChon = {};
  for (const nhom of cacNhomLuaChon(mtc)) lc[nhom.ma] = nhom.phuong_an[0].ma;
  const mtr = taoMaTranRiengRong(mtc);
  mtr.lua_chon_da_dung = lc;
  mtr.cau_hoi = danhSachCau(mtc, lc).map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  mtr.trang_thai = 'DA_XAC_NHAN';
  const dacTa = taoDacTa(mtc, mtr, 1, { tuanKiemTra: 9 });
  const de = taoDeTuDacTa(dacTa, 1);
  de.cau = de.cau.map((c, i) => ({ ...c, deBai: `Nội dung câu ${i + 1}.`, luaChon: c.dang === 'NLC' ? ['Một', 'Hai', 'Ba', 'Bốn'] : c.luaChon, dapAn: 'B' }));
  return { dacTa, de };
}

const tt = { tenTruong: 'TRƯỜNG TIỂU HỌC MẶC ĐỊNH', tieuDeKy: 'KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027', tenMon: 'LỊCH SỬ VÀ ĐỊA LÍ', thoiGianPhut: 35 };

const chuDoc = (tep: Uint8Array) => strFromU8(unzipSync(tep)['word/document.xml']).replace(/<w:br\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
/** Chữ của đầu bài đầu tiên (trước dòng PHẦN BÀI LÀM). */
const chuDauBai = (tep: Uint8Array) => { const c = chuDoc(tep); return c.slice(0, c.indexOf('PHẦN BÀI LÀM')); };

describe('Xuất đề theo mẫu của tổ', () => {
  it('lấy đầu bài của mẫu đến hết bảng Điểm – GV chấm, không lấy câu hỏi của mẫu', async () => {
    const xml = strFromU8(unzipSync(await taoMau())['word/document.xml']);
    const dau = layDauBaiMau(xml);
    expect(dau).toContain('GV chấm KT2');
    expect(dau).not.toContain('Nước có thể thấm');
  });

  it('thay đầu bài app dựng bằng đầu bài mẫu, đổi đúng tên kì, môn, thời gian; giữ hình của mẫu', async () => {
    const { de } = deLsdl();
    const tepDe = new Uint8Array(await Packer.toBuffer(dungTaiLieuDe(tt, de)));
    const kq = ghepDauBaiTheoMau(tepDe, await taoMau());
    if (process.env.XUAT_MAU) writeFileSync(process.env.XUAT_MAU, kq.tep);
    expect(kq.soChoThay).toBe(1);
    const chu = chuDoc(kq.tep);
    const dau = chuDauBai(kq.tep);
    expect(dau).toContain('TRƯỜNG TH TRẦN VĂN ƠN'); // của mẫu
    expect(dau).toContain('NGÀY KIỂM TRA'); // dòng của mẫu giữ nguyên
    expect(dau).toContain('KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027');
    expect(chu).toContain('KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027');
    expect(chu).toContain('MÔN LỊCH SỬ VÀ ĐỊA LÍ - Lớp 4');
    expect(chu).toContain('Thời gian: 35 phút');
    expect(chu).not.toContain('NĂM HỌC 2025 - 2026');
    expect(chu).not.toContain('Môn KHOA HỌC');
    expect(chu).not.toContain('Nước có thể thấm'); // câu hỏi của mẫu không mang sang
    expect(chu).toContain('PHẦN BÀI LÀM CỦA HỌC SINH');
    expect(chu).toContain('Nội dung câu 1.');
    const goi = unzipSync(kq.tep);
    const docXml = strFromU8(goi['word/document.xml']);
    const rels = strFromU8(goi['word/_rels/document.xml.rels']);
    const id = docXml.match(/r:embed="(rIdMau\d+)"/)?.[1];
    expect(id).toBeTruthy();
    const dich = rels.match(new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`))?.[1] ?? rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${id}"`))?.[1];
    expect(goi[`word/${dich}`]).toBeTruthy();
    // bảng của mẫu (9000 rộng trên trang chữ 9000) được giãn theo trang A4 lề 1 cm (10772)
    expect(docXml).toMatch(/<w:gridCol w:w="4788"\/>/);
  });

  it('tiêu đề viết trong một đoạn có xuống dòng cũng thay đúng', async () => {
    const { de } = deLsdl();
    const kq = ghepDauBaiTheoMau(new Uint8Array(await Packer.toBuffer(dungTaiLieuDe(tt, de))), await taoMau(true));
    const chu = chuDauBai(kq.tep);
    expect(chu).toContain('KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027\nMÔN LỊCH SỬ VÀ ĐỊA LÍ - Lớp 4\nThời gian: 35 phút');
  });

  it('bộ hồ sơ và đề Tiếng Việt: thay mọi đầu bài, phần đọc thành tiếng không ghi thời gian', async () => {
    const { dacTa, de } = deLsdl();
    const hs = ghepDauBaiTheoMau(new Uint8Array(await Packer.toBuffer(dungHoSoDe(tt, dacTa, de))), await taoMau());
    expect(hs.soChoThay).toBe(1);
    // Hồ sơ có trang ngang (ma trận) trước trang dọc (đề): đầu bài phải theo bề ngang trang dọc
    const xmlHs = strFromU8(unzipSync(hs.tep)['word/document.xml']);
    const dauHs = xmlHs.slice(xmlHs.indexOf('GV coi') - 6000, xmlHs.indexOf('PHẦN BÀI LÀM'));
    expect(dauHs).toContain('<w:tblW w:w="10772" w:type="dxa"/>');
    expect(dauHs).not.toContain('<w:tblW w:w="15704"');

    const tv = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TIENG_VIET')!;
    const lc: LuaChon = {};
    for (const nhom of cacNhomLuaChon(tv)) lc[nhom.ma] = nhom.phuong_an[0].ma;
    const mtr = taoMaTranRiengRong(tv);
    mtr.lua_chon_da_dung = lc;
    mtr.cau_hoi = danhSachCau(tv, lc).map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
    mtr.trang_thai = 'DA_XAC_NHAN';
    const deTv = taoDeTuDacTa(taoDacTa(tv, mtr, 1, { tuanKiemTra: 18 }), 1);
    const doan = (n: number) => Array.from({ length: n }, (_, i) => `tiếng${i}`).join(' ');
    deTv.tiengViet = {
      baiDocHieu: { tieuDe: 'Bài đọc', noiDung: doan(120), tacGia: 'A', nguon: 'B' },
      baiDocThanhTieng: [1, 2, 3, 4].map((i) => ({ tieuDe: `Bài ${i}`, noiDung: doan(82), tacGia: 'A', nguon: 'B', cauHoi: 'Hỏi?', traLoi: 'Đáp.' })),
    };
    const kq = ghepDauBaiTheoMau(new Uint8Array(await Packer.toBuffer(dungTaiLieuTiengViet({ ...tt, tenMon: 'TIẾNG VIỆT' }, deTv))), await taoMau());
    if (process.env.XUAT_MAU_TV) writeFileSync(process.env.XUAT_MAU_TV, kq.tep);
    expect(kq.soChoThay).toBe(3);
    const chu = chuDoc(kq.tep);
    expect(chu).toContain('MÔN TIẾNG VIỆT (ĐỌC HIỂU) - Lớp 4');
    expect(chu).toContain('MÔN TIẾNG VIỆT (VIẾT) - Lớp 4');
    const sauDocThanhTieng = chu.slice(chu.indexOf('MÔN TIẾNG VIỆT (Đọc thành tiếng) - Lớp 4'));
    expect(sauDocThanhTieng.slice(0, 120)).not.toContain('Thời gian');
  });

  it('mẫu không có bảng Điểm – GV chấm thì báo lỗi để xuất theo khung mặc định', async () => {
    const doc = new Document({ sections: [{ children: [p(r('Chỉ có chữ, không có đầu bài'))] }] });
    const { de } = deLsdl();
    const tepDe = new Uint8Array(await Packer.toBuffer(dungTaiLieuDe(tt, de)));
    const mauLoi = new Uint8Array(await Packer.toBuffer(doc));
    expect(() => ghepDauBaiTheoMau(tepDe, mauLoi)).toThrow(/chưa có đầu bài/);
  });
});

describe('Đầu bài theo mẫu thẳng mép trang', () => {
  it('bảng mẫu rộng hơn lề, thụt lề âm: đưa về đúng bề ngang trang, không thụt lề', async () => {
    const o = (t: string, w: number) => new TableCell({ width: { size: w, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun(t)] })] });
    const bangTen = new Table({ width: { size: 10400, type: WidthType.DXA }, columnWidths: [6000, 4400], indent: { size: -300, type: WidthType.DXA },
      rows: [new TableRow({ children: [o('TRƯỜNG TH TRẦN VĂN ƠN HỌ TÊN HS: … LỚP: …', 6000), o('KTĐK CUỐI HKI MÔN TIẾNG VIỆT GV coi KT1', 4400)] })] });
    const bangDiem = new Table({ width: { size: 10200, type: WidthType.DXA }, columnWidths: [1700, 5500, 3000],
      rows: [new TableRow({ children: [o('Điểm', 1700), o('Nhận xét', 5500), o('GV chấm KT1', 3000)] })] });
    const mau = new Uint8Array(await Packer.toBuffer(new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { left: 1134, right: 850 } } }, children: [bangTen, new Paragraph(''), bangDiem] }] })));
    const { de } = deLsdl();
    const kq = ghepDauBaiTheoMau(new Uint8Array(await Packer.toBuffer(dungTaiLieuDe(tt, de))), mau);
    const xml = strFromU8(unzipSync(kq.tep)['word/document.xml']);
    const dau = xml.slice(0, xml.indexOf('PHẦN BÀI LÀM'));
    const bangs = [...dau.matchAll(/<w:tbl>[\s\S]*?<\/w:tblGrid>/g)].map((m) => m[0]);
    expect(bangs.length).toBe(2);
    for (const b of bangs) {
      const tong = [...b.matchAll(/<w:gridCol w:w="(\d+)"/g)].reduce((s2, m) => s2 + Number(m[1]), 0);
      expect(Math.abs(tong - 10772)).toBeLessThanOrEqual(3);
      expect(b).toContain('<w:tblW w:w="10772" w:type="dxa"/>');
      expect(b).toContain('<w:tblInd w:w="0" w:type="dxa"/>');
    }
  });
});
