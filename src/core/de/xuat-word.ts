/**
 * ThayKhaiEdu - Xuất đề kiểm tra và hướng dẫn chấm ra Word (.docx).
 *
 * Quy cách theo mẫu của tổ: A4, lề hẹp, Times New Roman cỡ 13, đen trắng, dãn dòng 1,3.
 * Đầu đề là khung viền (trường, họ tên, lớp, ngày kiểm tra | tên kì, môn, thời gian, giáo viên coi, số thứ tự),
 * kế đó là bảng Điểm / Nhận xét / GV chấm. Mỗi câu một hàng: điểm ở cột trái, nội dung ở cột phải,
 * ngăn cách bằng một đường kẻ dọc (không khung quanh điểm). Dòng chấm chạy hết bề rộng chữ.
 *
 * Hàm dựng tài liệu là hàm thuần; việc ghi ra tệp do nơi gọi làm (Packer.toBuffer).
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  LeaderType,
  PageOrientation,
  type ISectionOptions,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { NHAN_LUA_CHON, nhanCau, type CauDe, type DeKiemTra } from '@/core/de/de';
import type { DacTa } from '@/core/dac-ta/dac-ta';

export interface ThongTinDe {
  tenTruong: string;
  /** Ví dụ "KTĐK GIỮA HKI - NĂM HỌC 2026 - 2027". */
  tieuDeKy: string;
  /** Ví dụ "TIẾNG VIỆT (ĐỌC HIỂU)". */
  tenMon: string;
  thoiGianPhut: number;
}

const FONT = 'Times New Roman';
const CO = 26; // 13 pt
const DAN_DONG = 312; // 1,3 dòng
const LE = 567; // 1 cm
const RONG_TRANG = 11906 - LE * 2;
const RONG_DIEM = 1100;
const RONG_NOI_DUNG = RONG_TRANG - RONG_DIEM;
interface Vien { style: (typeof BorderStyle)[keyof typeof BorderStyle]; size: number; color: string }
interface CacVien { top: Vien; bottom: Vien; left: Vien; right: Vien }
const KHONG_VIEN: Vien = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const VIEN_DEN: Vien = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const CAC_VIEN_KHONG: CacVien = { top: KHONG_VIEN, bottom: KHONG_VIEN, left: KHONG_VIEN, right: KHONG_VIEN };

const fmtDiem = (x: number) => String(x).replace('.', ',');
const tr = (text: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new TextRun({ text, font: FONT, size: o.size ?? CO, bold: o.bold, italics: o.italics });

function doan(runs: TextRun[] | string, o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; truoc?: number; sau?: number; thut?: number; giuDong?: boolean } = {}) {
  return new Paragraph({
    children: typeof runs === 'string' ? [tr(runs)] : runs,
    alignment: o.align,
    spacing: { line: DAN_DONG, before: o.truoc ?? 0, after: o.sau ?? 0 },
    indent: o.thut ? { left: o.thut } : undefined,
    keepLines: true,
    keepNext: o.giuDong,
  });
}

/** Dòng chấm chạy hết bề rộng cột nội dung. */
function dongCham(rong = RONG_NOI_DUNG - 200) {
  return new Paragraph({
    children: [new TextRun({ text: '\t', font: FONT, size: CO })],
    tabStops: [{ type: TabStopType.RIGHT, position: rong, leader: LeaderType.DOT }],
    spacing: { line: 360, before: 0, after: 0 },
  });
}

const o2 = (cs: Paragraph[], rong: number, vien: CacVien = CAC_VIEN_KHONG, span = 1) =>
  new TableCell({ children: cs, width: { size: rong, type: WidthType.DXA }, borders: vien, columnSpan: span, verticalAlign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 80, right: 80 } });

// ---------------------------------------------------------------------------
// Đầu đề
// ---------------------------------------------------------------------------

function dauDe(t: ThongTinDe, tc: { tenMon?: string; phut?: number | null } = {}): (Table | Paragraph)[] {
  const tenMon = tc.tenMon ?? t.tenMon;
  const phut = tc.phut === undefined ? t.thoiGianPhut : tc.phut;
  const trai = RONG_TRANG / 2;
  const phai = RONG_TRANG - trai;
  const khung = { top: VIEN_DEN, bottom: VIEN_DEN, left: VIEN_DEN, right: VIEN_DEN };
  const bang1 = new Table({
    width: { size: RONG_TRANG, type: WidthType.DXA },
    columnWidths: [trai, phai],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          o2([
            doan([tr(t.tenTruong, { bold: true })], { align: AlignmentType.CENTER }),
            doan('HỌ TÊN HS: ……………………………', { truoc: 60 }),
            doan('LỚP: 4 ……………………………………', { truoc: 60 }),
            doan('NGÀY KIỂM TRA: …………………'),
          ], trai, khung),
          o2([
            doan([tr(t.tieuDeKy, { bold: true })], { align: AlignmentType.CENTER }),
            doan([tr(`MÔN ${tenMon} - Lớp 4`, { bold: true })], { align: AlignmentType.CENTER }),
            ...(phut ? [doan(`Thời gian: ${phut} phút`, { align: AlignmentType.CENTER })] : []),
            doan([tr('GV coi KT1            GV coi KT2            Số thứ tự')], { align: AlignmentType.CENTER, truoc: 60 }),
          ], phai, khung),
        ],
      }),
    ],
  });

  const w = [1400, 4300, 2536, 2536];
  const tong = w.reduce((a, b) => a + b, 0);
  w[1] += RONG_TRANG - tong;
  const bang2 = new Table({
    width: { size: RONG_TRANG, type: WidthType.DXA },
    columnWidths: w,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        cantSplit: true,
        children: ['Điểm', 'Nhận xét', 'GV chấm KT1', 'GV chấm KT2'].map((h, i) =>
          o2([doan([tr(h, { bold: true })], { align: AlignmentType.CENTER }), ...(i === 1 ? [dongCham(w[1] - 200), dongCham(w[1] - 200)] : [doan('')])], w[i], khung),
        ),
      }),
    ],
  });

  return [bang1, doan('', { sau: 40 }), bang2, doan([tr('PHẦN BÀI LÀM CỦA HỌC SINH', { bold: true })], { align: AlignmentType.CENTER, truoc: 120, sau: 60 })];
}

// ---------------------------------------------------------------------------
// Câu hỏi
// ---------------------------------------------------------------------------

function soDongCham(c: CauDe): number {
  if (c.dang === 'VIET') return 18;
  return Math.max(2, Math.min(6, Math.ceil(c.diem * 3)));
}

function noiDungCau(c: CauDe, inDam = false): Paragraph[] {
  const kq: Paragraph[] = [];
  const dongDau = c.deBai.split(/\n+/).filter((x) => x.trim());
  kq.push(
    doan([tr(`${nhanCau(c)}${/^\d+$/.test(c.cau) ? '. ' : ': '}`, { bold: true }), tr(dongDau[0] ?? '', { bold: inDam })]),
    ...dongDau.slice(1).map((d) => doan([tr(d, { bold: inDam })])),
  );
  if (c.ghiChuHinh.trim()) kq.push(doan([tr(`[${c.ghiChuHinh.trim()}]`, { italics: true })]));

  if (c.dang === 'DS') {
    (c.yNho ?? c.luaChon.map((_, i) => String.fromCharCode(97 + i))).forEach((y, i) => {
      kq.push(new Paragraph({
        children: [tr(`${y}) ${c.luaChon[i] ?? ''}`), tr('\tĐ  /  S')],
        tabStops: [{ type: TabStopType.RIGHT, position: RONG_NOI_DUNG - 200 }],
        spacing: { line: DAN_DONG },
        indent: { left: 300 },
        keepLines: true,
      }));
    });
  } else if (c.hinhThuc === 'TN') {
    const coLuaChon = c.luaChon.some((x) => x.trim());
    if (coLuaChon) NHAN_LUA_CHON.forEach((n, i) => { if (c.luaChon[i]?.trim()) kq.push(doan(`${n}. ${c.luaChon[i]}`, { thut: 300 })); });
    else if (c.dang !== 'NLC') kq.push(dongCham());
  } else {
    for (let i = 0; i < soDongCham(c); i++) kq.push(dongCham());
  }
  return kq;
}

/** Mỗi câu một hàng: điểm bên trái, nội dung bên phải, một đường kẻ dọc giữa hai cột, hàng không bị cắt ngang trang. */
function bangCau(cau: CauDe[], inDam = false): Table {
  const rows = cau.map((c) => new TableRow({
    cantSplit: true,
    children: [
      o2([doan([tr(`…/${fmtDiem(c.diem)}đ`)], { align: AlignmentType.LEFT })], RONG_DIEM, { ...CAC_VIEN_KHONG, right: VIEN_DEN }),
      o2(noiDungCau(c, inDam), RONG_NOI_DUNG),
    ],
  }));
  return new Table({ width: { size: RONG_TRANG, type: WidthType.DXA }, columnWidths: [RONG_DIEM, RONG_NOI_DUNG], layout: TableLayoutType.FIXED, rows });
}

// ---------------------------------------------------------------------------
// Hướng dẫn chấm
// ---------------------------------------------------------------------------

function dapAnHienThi(c: CauDe): string {
  if (c.dang === 'NLC') {
    const n = c.dapAn.trim().toUpperCase();
    const i = (NHAN_LUA_CHON as readonly string[]).indexOf(n);
    return i >= 0 && c.luaChon[i]?.trim() ? `${n}. ${c.luaChon[i]}` : n;
  }
  if (c.dang === 'DS') return Array.from(c.dapAn.replace(/[\s,;]/g, '').toUpperCase()).map((k, i) => `${(c.yNho ?? [])[i] ?? String.fromCharCode(97 + i)}) ${k === 'Đ' ? 'Đúng' : 'Sai'}`).join('; ');
  return c.dapAn;
}

function bangDapAn(cau: CauDe[]): Table {
  const w = [1300, RONG_TRANG - 1300 - 1300, 1300];
  const vien = { top: VIEN_DEN, bottom: VIEN_DEN, left: VIEN_DEN, right: VIEN_DEN };
  const hang = (a: string, b: Paragraph[], d: string, dam = false) => new TableRow({
    cantSplit: true,
    children: [
      o2([doan([tr(a, { bold: dam })], { align: AlignmentType.CENTER })], w[0], vien),
      o2(b, w[1], vien),
      o2([doan([tr(d, { bold: dam })], { align: AlignmentType.CENTER })], w[2], vien),
    ],
  });
  const rows = [hang('Câu', [doan([tr('Đáp án, hướng dẫn chấm', { bold: true })], { align: AlignmentType.CENTER })], 'Điểm', true)];
  for (const c of cau) {
    const ps: Paragraph[] = [];
    const dapAn = dapAnHienThi(c).trim();
    if (dapAn) ps.push(doan(dapAn));
    for (const d of c.huongDanCham.split(/\n+/).filter((x) => x.trim())) ps.push(doan(d));
    if (!ps.length) ps.push(doan(''));
    rows.push(hang(nhanCau(c).replace(/^Câu /, ''), ps, fmtDiem(c.diem)));
  }
  const tong = Math.round(cau.reduce((s, c) => s + c.diem, 0) * 100) / 100;
  rows.push(hang('', [doan([tr('Tổng', { bold: true })], { align: AlignmentType.RIGHT })], fmtDiem(tong), true));
  return new Table({ width: { size: RONG_TRANG, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED, rows });
}

function huongDanCham(t: ThongTinDe, de: DeKiemTra): (Table | Paragraph)[] {
  return [
    doan([tr(t.tenTruong, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(`HƯỚNG DẪN CHẤM MÔN ${t.tenMon} - LỚP 4`, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(t.tieuDeKy, { bold: true })], { align: AlignmentType.CENTER, sau: 120 }),
    bangDapAn(de.cau),
  ];
}

// ---------------------------------------------------------------------------
// Tài liệu
// ---------------------------------------------------------------------------

/** Xếp câu theo số thứ tự (Câu 1, 2, 3…), các câu không đánh số (Viết) để cuối; giữ nguyên thứ tự gốc khi bằng nhau. */
export function xepCauTheoSo(cau: CauDe[]): CauDe[] {
  const so = (c: CauDe) => (/^\d+$/.test(c.cau) ? Number(c.cau) : Number.POSITIVE_INFINITY);
  return cau.map((c, i) => ({ c, i })).sort((a, b) => so(a.c) - so(b.c) || a.i - b.i).map((x) => x.c);
}

const TAI_LIEU = { creator: 'ThayKhaiEdu', styles: { default: { document: { run: { font: FONT, size: CO } } } } } as const;

/** Các phần (mỗi phần một trang mới) của đề và hướng dẫn chấm cho môn thường. */
export function cacPhanDe(t: ThongTinDe, deGoc: DeKiemTra): ISectionOptions[] {
  const de = { ...deGoc, cau: xepCauTheoSo(deGoc.cau) };
  const trang = {
    page: {
      size: { width: 11906, height: 16838 },
      margin: { left: LE, right: LE, top: 567, bottom: 567, header: 0, footer: 0 },
    },
  };
  return [
    { properties: trang, children: [...dauDe(t), bangCau(de.cau), doan([tr('HẾT ĐỀ', { bold: true })], { align: AlignmentType.CENTER, truoc: 120 })] },
    { properties: trang, children: huongDanCham(t, de) },
  ];
}

export function dungTaiLieuDe(t: ThongTinDe, deGoc: DeKiemTra): Document {
  return new Document({ ...TAI_LIEU, title: `${t.tieuDeKy} - ${t.tenMon}`, sections: cacPhanDe(t, deGoc) });
}

// ---------------------------------------------------------------------------
// Bộ đề Tiếng Việt: một tệp gồm Đọc hiểu (tờ câu hỏi, tờ bài đọc) → Viết → Đọc thành tiếng (phiếu giáo viên,
// tờ bốn bài đọc) → Hướng dẫn chấm chung. Mỗi phần có đầu bài riêng và bắt đầu trang mới.
// ---------------------------------------------------------------------------

const TEN_KY_DAY: Record<string, string> = { GIUA_HK1: 'GIỮA HỌC KÌ I', CUOI_HK1: 'CUỐI HỌC KÌ I', GIUA_HK2: 'GIỮA HỌC KÌ II', CUOI_NAM: 'CUỐI NĂM HỌC' };

const BIEU_DIEM_VIET: { tieuChi: string; moTa: string; diem: number }[] = [
  { tieuChi: '1. Mở bài', moTa: 'Giới thiệu được câu chuyện/đối tượng cần kể, tả.', diem: 1 },
  { tieuChi: '2. Thân bài', moTa: 'Trình tự sự việc hợp lí (2 điểm); nội dung, chi tiết phù hợp (2 điểm); cảm xúc, suy nghĩ (1 điểm).', diem: 5 },
  { tieuChi: '3. Kết bài', moTa: 'Kết thúc hợp lí (0,5 điểm); nêu bài học, cảm nghĩ (0,5 điểm).', diem: 1 },
  { tieuChi: '4. Bố cục', moTa: 'Đủ ba phần, các đoạn liên kết chặt chẽ.', diem: 1 },
  { tieuChi: '5. Sáng tạo', moTa: 'Có ý riêng, cách diễn đạt sinh động.', diem: 1 },
  { tieuChi: '6. Chính tả, ngữ pháp, trình bày', moTa: 'Dùng từ, đặt câu đúng (0,5 điểm); viết đúng chính tả, trình bày sạch đẹp (0,5 điểm).', diem: 1 },
];

function dongTheoDoan(text: string): string[] {
  return text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
}

/** "Theo X" → "(Theo X)"; đã có dấu ngoặc hoặc chữ "Theo" thì giữ nguyên. */
function dongTacGia(tacGia: string): string {
  const t = tacGia.trim();
  if (!t) return '';
  if (t.startsWith('(')) return t;
  return /^theo\b/i.test(t) ? `(${t})` : `(Theo ${t})`;
}

function khoiBaiDoc(b: { tieuDe: string; noiDung: string; tacGia: string; nguon: string }, co: number, o: { tieuDeTruoc?: string } = {}): Paragraph[] {
  const ps: Paragraph[] = [];
  ps.push(new Paragraph({
    children: [...(o.tieuDeTruoc ? [tr(o.tieuDeTruoc, { bold: true, size: co })] : []), tr(b.tieuDe.toUpperCase(), { bold: true, size: co })],
    alignment: AlignmentType.CENTER,
    spacing: { line: DAN_DONG, before: 60, after: 60 },
    keepNext: true,
  }));
  for (const d of dongTheoDoan(b.noiDung)) {
    ps.push(new Paragraph({ children: [tr(d, { size: co })], alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 480 }, spacing: { line: DAN_DONG, after: 0 } }));
  }
  const tg = dongTacGia(b.tacGia);
  if (tg) ps.push(new Paragraph({ children: [tr(tg, { size: co })], alignment: AlignmentType.RIGHT, spacing: { line: DAN_DONG } }));
  if (b.nguon.trim()) ps.push(new Paragraph({ children: [tr(b.nguon.trim(), { italics: true, size: 22 })], alignment: AlignmentType.RIGHT, spacing: { line: 276 } }));
  return ps;
}

function bangTieuChuanDoc(): Table {
  const vien = { top: VIEN_DEN, bottom: VIEN_DEN, left: VIEN_DEN, right: VIEN_DEN };
  const w = [RONG_TRANG - 2000, 2000];
  const hang = (a: string, b: string, dam = false) => new TableRow({
    cantSplit: true,
    children: [o2([doan([tr(a, { bold: dam })], { align: dam ? AlignmentType.CENTER : AlignmentType.LEFT })], w[0], vien), o2([doan([tr(b, { bold: dam })], { align: AlignmentType.CENTER })], w[1], vien)],
  });
  return new Table({
    width: { size: RONG_TRANG, type: WidthType.DXA },
    columnWidths: w,
    layout: TableLayoutType.FIXED,
    rows: [
      hang('Tiêu chuẩn cho điểm đọc', 'Điểm', true),
      hang('1. Đọc vừa đủ nghe, rõ từng tiếng; tốc độ đọc đạt yêu cầu; ngắt nghỉ hơi đúng ở các dấu câu, các cụm từ rõ nghĩa', '…/0,5đ'),
      hang('2. Đọc đúng nội dung (tiếng, từ) và diễn cảm (ngữ điệu, nhấn giọng,…)', '…/0,5đ'),
      hang('3. Trả lời đúng câu hỏi về nội dung đoạn đọc', '…/1đ'),
      hang('Cộng', '…/2đ', true),
    ],
  });
}

function bangBieuDiemViet(): Table {
  const vien = { top: VIEN_DEN, bottom: VIEN_DEN, left: VIEN_DEN, right: VIEN_DEN };
  const w = [2600, RONG_TRANG - 2600 - 1500, 1500];
  const hang = (a: string, b: string, c: string, dam = false) => new TableRow({
    cantSplit: true,
    children: [
      o2([doan([tr(a, { bold: dam })])], w[0], vien),
      o2([doan([tr(b, { bold: dam })], { align: dam ? AlignmentType.CENTER : AlignmentType.LEFT })], w[1], vien),
      o2([doan([tr(c, { bold: dam })], { align: AlignmentType.CENTER })], w[2], vien),
    ],
  });
  return new Table({
    width: { size: RONG_TRANG, type: WidthType.DXA },
    columnWidths: w,
    layout: TableLayoutType.FIXED,
    rows: [
      hang('Tiêu chí chấm điểm', 'Mô tả chi tiết', 'Điểm tối đa', true),
      ...BIEU_DIEM_VIET.map((b) => hang(b.tieuChi, b.moTa, fmtDiem(b.diem))),
      hang('Tổng', '', '10', true),
    ],
  });
}

function tenDoanDoc(c: CauDe): string {
  return nhanCau(c).replace(/^Câu /, '');
}

/** Các phần của bộ đề Tiếng Việt (Đọc hiểu, bài đọc, Viết, Đọc thành tiếng, hướng dẫn chấm). */
export function cacPhanTiengViet(t: ThongTinDe, deGoc: DeKiemTra): ISectionOptions[] {
  const tv = deGoc.tiengViet;
  if (!tv) throw new Error('Đề Tiếng Việt chưa có bài đọc.');
  const cau = xepCauTheoSo(deGoc.cau);
  const cauDocHieu = cau.filter((c) => c.dang !== 'VIET');
  const cauViet = cau.find((c) => c.dang === 'VIET');
  const kyDay = TEN_KY_DAY[deGoc.ky_kiem_tra] ?? t.tieuDeKy;
  const namHoc = /NĂM HỌC\s+(.+)$/.exec(t.tieuDeKy)?.[1] ?? '';
  const trang = { page: { size: { width: 11906, height: 16838 }, margin: { left: LE, right: LE, top: 567, bottom: 567, header: 0, footer: 0 } } };
  const soTN = cauDocHieu.filter((c) => c.hinhThuc === 'TN').map((c) => tenDoanDoc(c));
  const dsTN = soTN.length > 1 ? `${soTN.slice(0, -1).join(', ')} và ${soTN[soTN.length - 1]}` : soTN.join('');
  const diemDocHieu = Math.round(cauDocHieu.reduce((s, c) => s + c.diem, 0) * 100) / 100;
  const kh = tv.baiDocThanhTieng;

  // 1. Đọc hiểu: tờ câu hỏi
  const toCauHoi = [
    ...dauDe(t, { tenMon: 'TIẾNG VIỆT (ĐỌC HIỂU)', phut: 30 }),
    doan([tr(`II. ĐỌC HIỂU: ${fmtDiem(diemDocHieu)} điểm`, { bold: true })], { truoc: 80 }),
    doan([tr('Em đọc bài '), tr(`“${tv.baiDocHieu.tieuDe}”`, { italics: true }), tr(' rồi làm các bài tập sau:')], { thut: 300 }),
    ...(dsTN ? [doan(`Khoanh tròn vào chữ cái (A, B, C, D) trước ý trả lời đúng nhất cho từng câu hỏi ${dsTN} và làm các bài tập dưới đây:`, { sau: 40 })] : []),
    bangCau(cauDocHieu, true),
    doan([tr('HẾT ĐỀ', { bold: true })], { align: AlignmentType.CENTER, truoc: 120 }),
  ];

  // 2. Tờ bài đọc hiểu (cỡ chữ 14)
  const toBaiDoc = [
    doan([tr(t.tenTruong, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(`KIỂM TRA ${kyDay} - LỚP 4`, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(`NĂM HỌC: ${namHoc}`, { bold: true })], { align: AlignmentType.CENTER, sau: 120 }),
    new Paragraph({ children: [new TextRun({ text: 'Bài đọc hiểu:', font: FONT, size: 28, bold: true, underline: {} })], spacing: { line: DAN_DONG, after: 60 } }),
    ...khoiBaiDoc(tv.baiDocHieu, 28),
  ];

  // 3. Viết
  const toViet = [
    ...dauDe(t, { tenMon: 'TIẾNG VIỆT (VIẾT)', phut: 40 }),
    new Table({
      width: { size: RONG_TRANG, type: WidthType.DXA },
      columnWidths: [RONG_DIEM, RONG_NOI_DUNG],
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        children: [
          o2([doan([tr('…/10đ')])], RONG_DIEM, { ...CAC_VIEN_KHONG, right: VIEN_DEN }),
          o2([
            doan([tr('Đề bài: ', { bold: true }), tr(cauViet?.deBai.trim() ?? '')]),
            doan([tr('Bài làm', { bold: true })], { align: AlignmentType.CENTER, truoc: 60 }),
            ...Array.from({ length: 44 }, () => dongCham()),
          ], RONG_NOI_DUNG),
        ],
      })],
    }),
  ];

  // 4. Đọc thành tiếng: phiếu giáo viên
  const kyTocDo = deGoc.ky_kiem_tra === 'GIUA_HK1' ? '80 - 85' : '80 - 90';
  const phieuGV = [
    ...dauDe(t, { tenMon: 'TIẾNG VIỆT (Đọc thành tiếng)', phut: null }),
    doan([tr('I. ĐỌC THÀNH TIẾNG: 2 điểm', { bold: true }), tr(` (Thời gian đọc: khoảng ${kyTocDo} tiếng/1 phút)`)], { truoc: 100 }),
    doan('1. Giáo viên cho học sinh đọc một trong những bài đọc dưới đây:', { truoc: 60 }),
    ...kh.map((b, i) => doan(`☐  Bài đọc ${i + 1}: ${b.tieuDe.toUpperCase()}`, { thut: 700, truoc: 20 })),
    doan('2. Giáo viên nêu 1 câu hỏi (trong nội dung đoạn học sinh đọc) cho học sinh trả lời.', { truoc: 100, sau: 80 }),
    bangTieuChuanDoc(),
  ];

  // 5. Tờ bốn bài đọc thành tiếng
  const toBonBai = [
    doan([tr('Bài đọc thành tiếng', { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr('Học sinh đọc một trong các bài sau và trả lời câu hỏi.', { italics: true })], { align: AlignmentType.CENTER, sau: 80 }),
    ...kh.flatMap((b, i) => [
      ...khoiBaiDoc(b, CO, { tieuDeTruoc: `☐  Bài đọc ${i + 1}:  ` }),
      doan([tr('Câu hỏi: ', { bold: true }), tr(b.cauHoi)], { truoc: 40, sau: 80 }),
    ]),
  ];

  // 6. Hướng dẫn chấm chung
  const bangHDCDocHieu = bangDapAn(cauDocHieu);
  const hdc = [
    doan([tr(t.tenTruong, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr('HƯỚNG DẪN CHẤM MÔN TIẾNG VIỆT - LỚP 4', { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(`KTĐK ${kyDay} - NĂM HỌC ${namHoc}`, { bold: true })], { align: AlignmentType.CENTER, sau: 100 }),
    doan([tr('I. ĐỌC THÀNH TIẾNG: (2 điểm)', { bold: true })], { truoc: 60 }),
    doan(`* Học sinh đọc 1 đoạn văn ở 4 bài đọc đã cho từ ${kyTocDo.replace(' - ', ' – ')} tiếng.`),
    doan('* Giáo viên nêu 1 câu hỏi (trong nội dung đoạn học sinh đọc) cho học sinh trả lời. HS trả lời đúng 1 câu hỏi về nội dung trong đoạn học sinh vừa đọc đạt 1 điểm.'),
    ...kh.flatMap((b, i) => [
      doan([tr(`Bài đọc ${i + 1}: ${b.tieuDe.toUpperCase()}`, { bold: true })], { truoc: 40 }),
      doan([tr('Câu hỏi: ', { bold: true }), tr(b.cauHoi)], { thut: 300 }),
      doan([tr('Trả lời: ', { bold: true }), tr(b.traLoi)], { thut: 300 }),
    ]),
    doan([tr(`II. ĐỌC HIỂU: (${fmtDiem(diemDocHieu)} điểm)`, { bold: true })], { truoc: 100, sau: 40 }),
    bangHDCDocHieu,
    doan([tr('III. VIẾT: (10 điểm)', { bold: true })], { truoc: 100 }),
    doan([tr('Đề bài: ', { bold: true }), tr(cauViet?.deBai.trim() ?? '')]),
    ...(cauViet?.huongDanCham.trim() ? dongTheoDoan(cauViet.huongDanCham).map((d) => doan(d)) : []),
    doan('Biểu điểm:', { sau: 40 }),
    bangBieuDiemViet(),
  ];

  const phan = (children: (Paragraph | Table)[]): ISectionOptions => ({ properties: trang, children });
  return [phan(toCauHoi), phan(toBaiDoc), phan(toViet), phan(phieuGV), phan(toBonBai), phan(hdc)];
}

export function dungTaiLieuTiengViet(t: ThongTinDe, deGoc: DeKiemTra): Document {
  const kyDay = TEN_KY_DAY[deGoc.ky_kiem_tra] ?? t.tieuDeKy;
  return new Document({ ...TAI_LIEU, title: `Đề kiểm tra ${kyDay} - Tiếng Việt lớp 4`, sections: cacPhanTiengViet(t, deGoc) });
}

// ---------------------------------------------------------------------------
// Bộ hồ sơ: Ma trận → Bản đặc tả → Đề → Hướng dẫn chấm, trong một tệp.
// Ma trận và đặc tả được dựng từ chính bản đặc tả đã xác nhận mà đề kế thừa, nên luôn khớp với đề.
// ---------------------------------------------------------------------------

const RONG_NGANG = 16838 - LE * 2;
const TRANG_NGANG = { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { left: LE, right: LE, top: 567, bottom: 567, header: 0, footer: 0 } } };

const ONHO = 22; // 11 pt cho bảng rộng
const trN = (text: string, o: { bold?: boolean } = {}) => tr(text, { bold: o.bold, size: ONHO });
const doanN = (text: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) => new Paragraph({ children: [trN(text, { bold: o.bold })], alignment: o.align, spacing: { line: 252 } });
const VIEN_TAT_CA: CacVien = { top: VIEN_DEN, bottom: VIEN_DEN, left: VIEN_DEN, right: VIEN_DEN };
const oN = (text: string[], rong: number, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; span?: number } = {}) =>
  o2(text.map((x) => doanN(x, o)), rong, VIEN_TAT_CA, o.span ?? 1);

function tieuDeBangRong(t: ThongTinDe, dacTa: DacTa, tieuDe: string): Paragraph[] {
  return [
    doan([tr(t.tenTruong, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(`${tieuDe} ${t.tieuDeKy.replace(/^KTĐK /, 'KIỂM TRA ĐỊNH KÌ ')}`, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(`MÔN: ${t.tenMon.toUpperCase()} - LỚP 4`, { bold: true })], { align: AlignmentType.CENTER, sau: 100 }),
  ];
}

interface NhomMaTran { ten: string; mach: string; yccd: string[]; cau: string[]; m: Record<1 | 2 | 3, { tn: number; tl: number }>; diem: number }

/** Gom các dòng đặc tả theo (phần, mạch, nội dung) để dựng bảng ma trận. */
function gomMaTran(dacTa: DacTa): NhomMaTran[] {
  const ds = new Map<string, NhomMaTran>();
  for (const r of dacTa.dong) {
    const khoa = `${r.baiKiemTra}|${r.phan ?? ''}|${r.mach}|${r.noiDung ?? ''}`;
    let n = ds.get(khoa);
    if (!n) {
      n = { ten: [r.phan ?? r.baiKiemTra].join(''), mach: [r.mach, r.noiDung].filter(Boolean).join(' – '), yccd: [], cau: [], m: { 1: { tn: 0, tl: 0 }, 2: { tn: 0, tl: 0 }, 3: { tn: 0, tl: 0 } }, diem: 0 };
      ds.set(khoa, n);
    }
    if (r.yccd && !n.yccd.includes(r.yccd)) n.yccd.push(r.yccd);
    n.cau.push(r.cau);
    n.m[r.muc][r.hinhThuc === 'TN' ? 'tn' : 'tl'] += r.soCauTinh;
    n.diem += r.diem;
  }
  return [...ds.values()];
}

function bangMaTran(dacTa: DacTa): Table {
  const w = [3000, 4800, 1500, 700, 700, 700, 700, 700, 700, RONG_NGANG - 3000 - 4800 - 1500 - 700 * 6 - 900, 900];
  const hang = (cells: { t: string[]; w: number; b?: boolean; a?: (typeof AlignmentType)[keyof typeof AlignmentType]; span?: number }[]) =>
    new TableRow({ cantSplit: true, children: cells.map((c) => oN(c.t, c.w, { bold: c.b, align: c.a, span: c.span })) });
  const giua = AlignmentType.CENTER;
  const rows: TableRow[] = [
    hang([{ t: ['Mạch kiến thức, nội dung'], w: w[0], b: true, a: giua }, { t: ['Yêu cầu cần đạt'], w: w[1], b: true, a: giua }, { t: ['Câu số'], w: w[2], b: true, a: giua },
      { t: ['Mức 1 (TN | TL)'], w: w[3] + w[4], b: true, a: giua, span: 2 }, { t: ['Mức 2 (TN | TL)'], w: w[5] + w[6], b: true, a: giua, span: 2 }, { t: ['Mức 3 (TN | TL)'], w: w[7] + w[8], b: true, a: giua, span: 2 },
      { t: ['Số câu'], w: w[9], b: true, a: giua }, { t: ['Điểm'], w: w[10], b: true, a: giua }]),
  ];
  const so = (n: number) => (n ? String(n) : '');
  let tong = { c: 0, d: 0, m: { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number> };
  let phanHienTai = '';
  for (const n of gomMaTran(dacTa)) {
    if (n.ten !== phanHienTai) {
      phanHienTai = n.ten;
      rows.push(hang([{ t: [n.ten], w: RONG_NGANG, b: true, span: 11 }]));
    }
    const soCau = ([1, 2, 3] as const).reduce((a, k) => a + n.m[k].tn + n.m[k].tl, 0);
    tong.c += soCau;
    tong.d += n.diem;
    ([1, 2, 3] as const).forEach((k) => { tong.m[k] += n.m[k].tn + n.m[k].tl; });
    rows.push(hang([
      { t: [n.mach], w: w[0] }, { t: n.yccd, w: w[1] }, { t: [n.cau.join(', ')], w: w[2], a: giua },
      { t: [so(n.m[1].tn)], w: w[3], a: giua }, { t: [so(n.m[1].tl)], w: w[4], a: giua },
      { t: [so(n.m[2].tn)], w: w[5], a: giua }, { t: [so(n.m[2].tl)], w: w[6], a: giua },
      { t: [so(n.m[3].tn)], w: w[7], a: giua }, { t: [so(n.m[3].tl)], w: w[8], a: giua },
      { t: [so(soCau)], w: w[9], a: giua }, { t: [fmtDiem(Math.round(n.diem * 100) / 100)], w: w[10], a: giua },
    ]));
  }
  rows.push(hang([
    { t: ['Tổng số câu'], w: w[0] + w[1] + w[2], b: true, a: AlignmentType.RIGHT, span: 3 },
    { t: [String(tong.m[1])], w: w[3] + w[4], b: true, a: giua, span: 2 }, { t: [String(tong.m[2])], w: w[5] + w[6], b: true, a: giua, span: 2 }, { t: [String(tong.m[3])], w: w[7] + w[8], b: true, a: giua, span: 2 },
    { t: [String(tong.c)], w: w[9], b: true, a: giua }, { t: [fmtDiem(Math.round(tong.d * 100) / 100)], w: w[10], b: true, a: giua },
  ]));
  return new Table({ width: { size: RONG_NGANG, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED, rows });
}

function bangDacTa(dacTa: DacTa): Table {
  const w = [700, 2300, 3900, 600, 1000, 800, 800, 1700, 1100, RONG_NGANG - 700 - 2300 - 3900 - 600 - 1000 - 800 - 800 - 1700 - 1100];
  const dau = ['Câu', 'Mạch, nội dung', 'Yêu cầu cần đạt', 'Mức', 'Hình thức', 'Điểm', 'Tuần', 'Bài học (PPCT)', 'Trang SGK', 'Ghi chú'];
  const rows: TableRow[] = [new TableRow({ cantSplit: true, children: dau.map((h, i) => oN([h], w[i], { bold: true, align: AlignmentType.CENTER })) })];
  const xep = [...dacTa.dong].sort((a, b) => (Number(a.cau) || 1e9) - (Number(b.cau) || 1e9));
  for (const r of xep) {
    rows.push(new TableRow({
      cantSplit: true,
      children: [
        oN([`${r.cau}${r.yNho ? ` (${r.yNho.join(', ')})` : ''}`], w[0], { align: AlignmentType.CENTER }),
        oN([r.noiDung ?? r.mach], w[1]),
        oN([r.yccd], w[2]),
        oN([String(r.muc)], w[3], { align: AlignmentType.CENTER }),
        oN([`${r.hinhThuc}${r.dang ? ` (${r.dang})` : ''}`], w[4], { align: AlignmentType.CENTER }),
        oN([fmtDiem(r.diem)], w[5], { align: AlignmentType.CENTER }),
        oN([r.tuan == null ? '' : String(r.tuan)], w[6], { align: AlignmentType.CENTER }),
        oN([r.baiHoc], w[7]),
        oN([r.trangSgk], w[8]),
        oN([r.ghiChu], w[9]),
      ],
    }));
  }
  return new Table({ width: { size: RONG_NGANG, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED, rows });
}

function chuKyHieuTruong(): Table {
  const w = Math.floor(RONG_NGANG / 2);
  const o1 = (a: string, b: string) => o2([doan([tr(a, { bold: true })], { align: AlignmentType.CENTER }), doan([tr(b, { italics: true })], { align: AlignmentType.CENTER })], w);
  return new Table({
    width: { size: RONG_NGANG, type: WidthType.DXA },
    columnWidths: [w, RONG_NGANG - w],
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: [o1('HIỆU TRƯỞNG', '(Ký, ghi rõ họ tên)'), o1('TỔ TRƯỞNG', '(Ký, ghi rõ họ tên)')] })],
  });
}

/** Một tệp: Ma trận, Bản đặc tả, Đề, Hướng dẫn chấm. `dacTa` là bản đã xác nhận mà đề kế thừa. */
export function dungHoSoDe(t: ThongTinDe, dacTa: DacTa, de: DeKiemTra): Document {
  const maTran: ISectionOptions = { properties: TRANG_NGANG, children: [...tieuDeBangRong(t, dacTa, 'MA TRẬN ĐỀ'), bangMaTran(dacTa), doan('', { sau: 120 }), chuKyHieuTruong()] };
  const dacTaPhan: ISectionOptions = { properties: TRANG_NGANG, children: [...tieuDeBangRong(t, dacTa, 'BẢN ĐẶC TẢ ĐỀ'), bangDacTa(dacTa)] };
  const phanDe = de.ma_mon === 'TIENG_VIET' && de.tiengViet ? cacPhanTiengViet(t, de) : cacPhanDe(t, de);
  return new Document({ ...TAI_LIEU, title: `Hồ sơ đề kiểm tra - ${t.tenMon}`, sections: [maTran, dacTaPhan, ...phanDe] });
}
