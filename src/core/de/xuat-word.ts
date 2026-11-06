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

function dauDe(t: ThongTinDe): (Table | Paragraph)[] {
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
            doan([tr(`MÔN ${t.tenMon} - Lớp 4`, { bold: true })], { align: AlignmentType.CENTER }),
            doan(`Thời gian: ${t.thoiGianPhut} phút`, { align: AlignmentType.CENTER }),
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

function noiDungCau(c: CauDe): Paragraph[] {
  const kq: Paragraph[] = [];
  const dongDau = c.deBai.split(/\n+/).filter((x) => x.trim());
  kq.push(
    doan([tr(`${nhanCau(c)}${/^\d+$/.test(c.cau) ? '. ' : ': '}`, { bold: true }), tr(dongDau[0] ?? '')]),
    ...dongDau.slice(1).map((d) => doan(d)),
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
function bangCau(cau: CauDe[]): Table {
  const rows = cau.map((c) => new TableRow({
    cantSplit: true,
    children: [
      o2([doan([tr(`…/${fmtDiem(c.diem)}đ`)], { align: AlignmentType.LEFT })], RONG_DIEM, { ...CAC_VIEN_KHONG, right: VIEN_DEN }),
      o2(noiDungCau(c), RONG_NOI_DUNG),
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

function huongDanCham(t: ThongTinDe, de: DeKiemTra): (Table | Paragraph)[] {
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
  for (const c of de.cau) {
    const ps: Paragraph[] = [];
    const dapAn = dapAnHienThi(c).trim();
    if (dapAn) ps.push(doan(dapAn));
    for (const d of c.huongDanCham.split(/\n+/).filter((x) => x.trim())) ps.push(doan(d));
    if (!ps.length) ps.push(doan(''));
    rows.push(hang(nhanCau(c).replace(/^Câu /, ''), ps, fmtDiem(c.diem)));
  }
  const tong = Math.round(de.cau.reduce((s, c) => s + c.diem, 0) * 100) / 100;
  rows.push(hang('', [doan([tr('Tổng', { bold: true })], { align: AlignmentType.RIGHT })], fmtDiem(tong), true));

  return [
    doan([tr(t.tenTruong, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(`HƯỚNG DẪN CHẤM MÔN ${t.tenMon} - LỚP 4`, { bold: true })], { align: AlignmentType.CENTER }),
    doan([tr(t.tieuDeKy, { bold: true })], { align: AlignmentType.CENTER, sau: 120 }),
    new Table({ width: { size: RONG_TRANG, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED, rows }),
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

export function dungTaiLieuDe(t: ThongTinDe, deGoc: DeKiemTra): Document {
  const de = { ...deGoc, cau: xepCauTheoSo(deGoc.cau) };
  const trang = {
    page: {
      size: { width: 11906, height: 16838 },
      margin: { left: LE, right: LE, top: 567, bottom: 567, header: 0, footer: 0 },
    },
  };
  return new Document({
    creator: 'ThayKhaiEdu',
    title: `${t.tieuDeKy} - ${t.tenMon}`,
    styles: { default: { document: { run: { font: FONT, size: CO } } } },
    sections: [
      { properties: trang, children: [...dauDe(t), bangCau(de.cau), doan([tr('HẾT ĐỀ', { bold: true })], { align: AlignmentType.CENTER, truoc: 120 })] },
      { properties: trang, children: huongDanCham(t, de) },
    ],
  });
}
