/**
 * ThayKhaiEdu - Đọc bảng ma trận chung đã tải lên (cau_truc của tai_lieu_ma_tran) thành MaTranChung
 * để bước 2 lập ma trận riêng dùng đúng file tổ đã xác nhận, đủ 4 kì.
 *
 * Nhận ra 3 kiểu bảng của tổ khối 4:
 *  - TOAN_HINH_THUC_MUC: cột Số câu, TN/TL (đếm câu), Mức 1–2–3 (ghi điểm). Toán.
 *  - BAI_MUC_TN_TL: cột "Số câu và số điểm", từng cặp TN/TL theo mức, ô ghi "1 (Câu 3) NLC".
 *    Khoa học, Lịch sử và Địa lí, Công nghệ.
 *  - TIENG_VIET_3_PHAN: bảng Đọc thành tiếng, bảng Đọc hiểu (điểm theo mức, VBVH/VBTT), bảng Viết.
 *
 * Cách gom câu chịu được ô bị tách, gộp lộn xộn: mỗi câu hỏi có đúng một ô ghi điểm (hoặc ghi "Câu n")
 * ở cột mức; mọi ô khác nằm trong phạm vi hàng của ô đó thuộc về câu đó.
 *
 * Hàm thuần, không đọc ghi cơ sở dữ liệu. Chỗ nào đọc không chắc thì ghi vào canhBao để tổ trưởng xem lại;
 * kết quả vẫn qua kiemDinhMaTranChung và bước xem trước, xác nhận như cũ.
 */

import { danhKhoaCauTach } from '@/core/matrix/matrix-template';
import type { KhoiVanBan, OBang } from '@/core/utils/docx-bang';
import type {
  BaiKiemTraMaTran,
  BoCucMaTran,
  CauHoiMaTran,
  ChuKy,
  DangCau,
  DongMaTran,
  HinhThucCau,
  KyKiemTra,
  MaTranChung,
  MucDo,
  PhanMaTran,
} from '@/types/matrix-template';

export interface ThongTinFile {
  maMon: string;
  tenMon: string;
  ky: KyKiemTra;
  /** Số phiên bản file trong kho, ghi vào phien_ban_mau dạng "kho-3" */
  phienBan: number;
  lop?: string;
}

export interface KetQuaDocMaTran {
  mtc: MaTranChung | null;
  /** Những chỗ app đọc không chắc, tổ trưởng cần xem lại */
  canhBao: string[];
  /** Không dựng được ma trận (bảng không đúng kiểu nào) */
  loi?: string;
}

// ---------------------------------------------------------------------------
// Lưới ô: trải ô gộp ra đủ hàng × cột
// ---------------------------------------------------------------------------

interface ONut {
  id: number;
  o: OBang;
  r0: number;
  c0: number;
}

type Luoi = (ONut | null)[][];

export function moRongLuoi(hang: OBang[][]): Luoi {
  const luoi: Luoi = [];
  let id = 0;
  hang.forEach((dong, r) => {
    luoi[r] ??= [];
    let c = 0;
    for (const o of dong) {
      while (luoi[r][c]) c++;
      const nut: ONut = { id: id++, o, r0: r, c0: c };
      const soHang = Math.max(1, o.hang || 1);
      const soCot = Math.max(1, o.cot || 1);
      for (let dr = 0; dr < soHang; dr++) {
        const rr = r + dr;
        if (rr >= hang.length) break;
        luoi[rr] ??= [];
        for (let dc = 0; dc < soCot; dc++) luoi[rr][c + dc] = nut;
      }
      c += soCot;
    }
  });
  for (let r = 0; r < luoi.length; r++) luoi[r] ??= [];
  return luoi;
}

/** Bỏ dấu, chữ thường, gọn khoảng trắng: để so khớp tiêu đề cột. */
export function chuan(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const gon = (s: string) => s.replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const motDong = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Các ô gốc (không trùng) của một cột trong một dải hàng, theo thứ tự hàng. */
function oTrongCot(luoi: Luoi, r1: number, r2: number, c: number): ONut[] {
  const out: ONut[] = [];
  const da = new Set<number>();
  for (let r = r1; r <= r2; r++) {
    const n = luoi[r]?.[c];
    if (n && !da.has(n.id)) {
      da.add(n.id);
      out.push(n);
    }
  }
  return out;
}

const chuCot = (luoi: Luoi, r1: number, r2: number, c: number | undefined) =>
  c === undefined ? '' : oTrongCot(luoi, r1, r2, c).map((n) => n.o.chu).join('\n');

/** Số đầu tiên trong chuỗi, nhận cả dấu phẩy thập phân. */
export function docSo(s: string): number | null {
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

/** Số câu trong ô: "1 Câu 1", "4 Câu 8 (a,b,c,d)", "(Câu 11)", "1,2, 3,4", "1 (Câu 7) TLN". */
export function docOCau(s: string, soTronLaSoCau = true): { cau: string[]; yNho: string[] | null; soDau: number | null; dang: DangCau | null } {
  const t = s.replace(/\s+/g, ' ').trim();
  // Ý nhỏ: "(a,b,c,d)" hoặc "(Câu 8 a,b,c,d)"
  // Một ý trong ngoặc: "Câu 8 (a)" (câu chia ý ở nhiều dòng ma trận)
  const mY = t.match(/(?<![\p{L}\d])([a-h](?:\s*[,;]\s*[a-h])+)(?![\p{L}\d])/iu) ?? t.match(/\(\s*([a-h])\s*\)/i);
  const yNho = mY ? mY[1].split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean) : null;
  const boY = mY ? t.replace(mY[0], ' ') : t;
  const n = chuan(boY);
  let cau: string[] = [];
  let soDau: number | null = null;
  const viTri = n.search(/cau\s*\d/);
  if (viTri >= 0) {
    const truoc = n.slice(0, viTri);
    soDau = docSo(truoc);
    const sau = n.slice(viTri).replace(/^cau\s*/, '');
    const m = sau.match(/^[\d\s,;va\-–]+/);
    cau = (m ? m[0] : '').match(/\d+/g) ?? [];
  } else if (soTronLaSoCau && !/[a-z]/.test(n.replace(/\b(tn|tl)\b/g, ''))) {
    // Chỉ có số: Tiếng Việt ghi số thứ tự câu ("1,2, 3,4"); Toán ghi số lượng câu nên không dùng
    cau = n.match(/\d+/g) ?? [];
  }
  let dang: DangCau | null = null;
  if (/\bnlc\b/.test(n)) dang = 'NLC';
  else if (/\bd\s*\/\s*s\b/.test(n)) dang = 'DS';
  else if (/\btln\b/.test(n)) dang = 'TLN';
  else if (/\bnoi\b/.test(n)) dang = 'NOI';
  else if (/\bdien\b/.test(n)) dang = 'DIEN';
  return { cau, yNho, soDau, dang };
}

/**
 * Tách ô YCCĐ thành danh sách: dòng bắt đầu bằng "-", "–", "•" là một YCCĐ; dòng "+" nối vào YCCĐ trước;
 * dòng chữ thường đứng trước mọi gạch đầu dòng là nhãn (Toán: "Bài toán có lời văn").
 * Dòng "* TỪ VỰNG:" (Tiếng Việt) cũng là nhãn.
 */
export function tachYccd(s: string): { yccd: string[]; nhan?: string } {
  const dong = gon(s).split('\n').map((x) => x.trim()).filter((x) => x && !/^\.+$/.test(x));
  const yccd: string[] = [];
  const nhan: string[] = [];
  const coGach = dong.some((d) => /^[-–—•]/.test(d));
  for (let d of dong) {
    const mSao = d.match(/^\*\s*([^:]{2,40}):\s*(.*)$/);
    if (mSao) {
      nhan.push(mSao[1].trim());
      d = mSao[2].trim();
      if (!d) continue;
    }
    const mGach = d.match(/^(?:[-–—•]\s*)+(.*)$/);
    if (mGach) {
      if (mGach[1].trim()) yccd.push(mGach[1].trim());
      continue;
    }
    if (/^[+(]/.test(d) && yccd.length) {
      yccd[yccd.length - 1] += `\n${d}`;
      continue;
    }
    if (!coGach) {
      yccd.push(d);
      continue;
    }
    if (!yccd.length) nhan.push(d);
    else yccd.push(d);
  }
  return { yccd, nhan: nhan.length ? nhan.join(' ') : undefined };
}

const viHoaDau = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

/** "Phần 2: Đọc hiểu (8 điểm)" → "Phần 2: Đọc hiểu" */
const boDiemNgoac = (s: string) => motDong(s).replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*(?:điểm|đ)\s*\)\s*$/i, '').trim();
const chuanNhom = (s: string) => motDong(s).replace(/(\d)\s*(điểm)/gi, '$1 $2');

// ---------------------------------------------------------------------------
// Thông tin chung: trường, tiêu đề, ngày kí, chữ kí
// ---------------------------------------------------------------------------

function tatCaChu(khoi: KhoiVanBan[], boQua: Set<number>): string[] {
  const out: string[] = [];
  khoi.forEach((k, i) => {
    if (boQua.has(i)) return;
    if (k.loai === 'doan') out.push(...gon(k.chu).split('\n'));
    else for (const h of k.hang) for (const o of h) out.push(...gon(o.chu).split('\n'));
  });
  return out.map((x) => x.replace(/\t+/g, '  ').trim()).filter(Boolean);
}

function thongTinChung(khoi: KhoiVanBan[], bangChinh: Set<number>, f: ThongTinFile) {
  const dong = tatCaChu(khoi, bangChinh);
  const tim = (re: RegExp) => dong.find((d) => re.test(d));
  const coQuan = tim(/^(ỦY BAN|UỶ BAN|UBND)/i);
  const truong = tim(/TRƯỜNG\s+TIỂU\s+HỌC/i);
  const tieuDe = tim(/MA\s+TRẬN/i);
  const namHoc = dong.join(' ').match(/NĂM\s+HỌC\s*:?\s*(\d{4})\s*[-–]\s*(\d{4})/i);
  const phut = dong.join(' ').match(/(\d{2,3})\s*phút/i);
  const ngay = dong.map((d) => d.match(/ngày[^\n]*?năm\s*\d{4}/i)).find(Boolean);
  const noiKy = dong.map((d) => d.match(/([\p{Lu}][\p{Ll}]+(?:\s[\p{Lu}][\p{Ll}]+)*)\s*,\s*ngày/u)).find(Boolean);
  const chuKy: ChuKy[] = [];
  const noi = dong.join('\n');
  if (/HIỆU\s+TRƯỞNG/i.test(noi)) chuKy.push({ chuc_vu: 'HIỆU TRƯỞNG', ho_ten: '' });
  else if (/Ban\s+Giám\s+hiệu/i.test(noi)) chuKy.push({ chuc_vu: 'Ban Giám hiệu duyệt', ho_ten: '' });
  const viTriTT = dong.findIndex((d) => /TỔ\s+TRƯỞNG/i.test(d));
  if (viTriTT >= 0) {
    const ten = dong.slice(viTriTT + 1).find((d) => /^[\p{Lu}][\p{Ll}]+(\s+[\p{L}][\p{Ll}]+){1,4}$/u.test(d.trim()));
    chuKy.push({ chuc_vu: 'TỔ TRƯỞNG', ho_ten: ten?.trim() ?? '' });
  }
  return {
    phien_ban_mau: `kho-${f.phienBan}`,
    loai: 'MA_TRAN_CHUNG' as const,
    lop: f.lop ?? 'Lớp 4',
    ky_kiem_tra: f.ky,
    nam_hoc: namHoc ? `${namHoc[1]} - ${namHoc[2]}` : '',
    truong: {
      co_quan_chu_quan: motDong(coQuan ?? ''),
      truong: motDong(truong ?? ''),
      noi_ky: noiKy?.[1] ?? (coQuan?.match(/PHƯỜNG\s+(.+)$/i)?.[1] ? viHoaTu(coQuan.match(/PHƯỜNG\s+(.+)$/i)![1]) : ''),
    },
    mon: f.tenMon,
    ma_mon: f.maMon,
    tieu_de: motDong(tieuDe ?? `MA TRẬN KIỂM TRA ĐỊNH KÌ – ${f.tenMon.toUpperCase()}`),
    thoi_gian_phut: phut ? Number(phut[1]) : null,
    ngay_ky: ngay ? motDong(ngay[0]) : '',
    chu_ky: chuKy,
  };
}

const viHoaTu = (s: string) => motDong(s).toLowerCase().split(' ').map((w) => viHoaDau(w)).join(' ');

// ---------------------------------------------------------------------------
// Tìm hàng tiêu đề, cột theo chữ ở tiêu đề
// ---------------------------------------------------------------------------

interface TieuDe {
  /** Hàng cuối của phần tiêu đề (hàng có ô "TN") */
  hCuoi: number;
  /** Chữ (đã chuẩn hóa) của mọi ô tiêu đề kèm cột bắt đầu */
  o: { c0: number; c1: number; r0: number; t: string }[];
}

function timTieuDe(luoi: Luoi): TieuDe | null {
  const gioiHan = Math.min(luoi.length, 4);
  let hCuoi = -1;
  for (let r = 0; r < gioiHan; r++) {
    if (luoi[r].some((n) => n && n.r0 === r && /^(tn|tl|tl\/th)$/.test(chuan(n.o.chu)))) {
      hCuoi = r;
      break;
    }
  }
  if (hCuoi < 0) return null;
  const o: TieuDe['o'] = [];
  const da = new Set<number>();
  for (let r = 0; r <= hCuoi; r++) {
    for (const n of luoi[r]) {
      if (!n || da.has(n.id)) continue;
      da.add(n.id);
      o.push({ c0: n.c0, c1: n.c0 + Math.max(1, n.o.cot) - 1, r0: n.r0, t: chuan(n.o.chu) });
    }
  }
  // Ô kéo dài từ tiêu đề xuống (hàng "rN") làm hàng tiêu đề dài hơn
  let hThat = hCuoi;
  for (let r = 0; r <= hCuoi; r++) for (const n of luoi[r]) if (n) hThat = Math.max(hThat, n.r0 + Math.max(1, n.o.hang) - 1);
  return { hCuoi: hThat, o };
}

const cotCo = (td: TieuDe, re: RegExp) => td.o.find((x) => re.test(x.t))?.c0;

/** Hàng cuối của phần dữ liệu: trước hàng "Tổng". */
function hangCuoiDuLieu(luoi: Luoi, tu: number): number {
  for (let r = tu; r < luoi.length; r++) {
    const dauHang = luoi[r].filter((n) => n && n.r0 === r);
    if (dauHang.some((n) => /^tong\b/.test(chuan(n!.o.chu)))) return r - 1;
  }
  return luoi.length - 1;
}

/** Số câu ghi ở hàng "Tổng" của file (cột cho trước), để đối chiếu. */
function soCauHangTong(luoi: Luoi, tu: number, cot: number): number | null {
  const r = hangCuoiDuLieu(luoi, tu) + 1;
  for (let rr = r; rr < Math.min(luoi.length, r + 2); rr++) {
    const n = luoi[rr]?.[cot];
    if (n && n.r0 === rr && /\d/.test(n.o.chu)) return docSo(n.o.chu);
  }
  return null;
}

function doiChieuTong(soGhi: number | null, ds: DongDoc[], canhBao: string[]) {
  if (soGhi === null) return;
  const soTinh = ds.reduce((t, d) => t + d.dong.cau_hoi.reduce((u, c) => u + c.so_cau_tinh, 0), 0);
  if (soGhi !== soTinh) canhBao.push(`Hàng Tổng của file ghi ${soGhi} câu nhưng ma trận có ${soTinh} câu. Tổ trưởng xem lại hàng Tổng hoặc các cột mức.`);
}

// ---------------------------------------------------------------------------
// Bảng có điểm ghi ở cột mức (Toán, Tiếng Việt đọc hiểu)
// ---------------------------------------------------------------------------

interface CauDoc {
  cau: CauHoiMaTran;
  /** Hàng bắt đầu, để xếp thứ tự */
  r: number;
}

interface DongDoc {
  dong: DongMaTran;
  r: number;
}

/** Gom ô YCCĐ và câu hỏi chồng hàng lên nhau thành dòng ma trận (hợp nhất theo phạm vi hàng). */
function gomDong(
  luoi: Luoi,
  h1: number,
  h2: number,
  cotYccd: number,
  cacNhomCau: { r1: number; r2: number; cau: CauHoiMaTran[] }[],
  dungDong: (r1: number, r2: number, yccdText: string) => Omit<DongMaTran, 'cau_hoi' | 'yccd'> & { yccd?: string[] },
): DongDoc[] {
  const ycc = oTrongCot(luoi, h1, h2, cotYccd).filter((n) => n.r0 >= h1);
  // Hợp nhất: mỗi ô YCCĐ là một đỉnh, mỗi nhóm câu nối các ô YCCĐ chồng hàng với nó
  const cha = ycc.map((_, i) => i);
  const goc = (i: number): number => (cha[i] === i ? i : (cha[i] = goc(cha[i])));
  const phamVi = (n: ONut) => [n.r0, Math.min(h2, n.r0 + Math.max(1, n.o.hang) - 1)] as const;
  const nhomCuaY = new Map<number, number[]>();
  cacNhomCau.forEach((g, gi) => {
    const lienQuan = ycc.map((n, i) => ({ i, pv: phamVi(n) })).filter(({ pv }) => pv[0] <= g.r2 && pv[1] >= g.r1).map((x) => x.i);
    for (let k = 1; k < lienQuan.length; k++) cha[goc(lienQuan[k])] = goc(lienQuan[0]);
    if (lienQuan.length) nhomCuaY.set(gi, lienQuan);
  });
  const cum = new Map<number, number[]>();
  ycc.forEach((_, i) => cum.set(goc(i), [...(cum.get(goc(i)) ?? []), i]));
  const out: DongDoc[] = [];
  for (const ds of cum.values()) {
    const cacY = ds.map((i) => ycc[i]);
    const r1 = Math.min(...cacY.map((n) => n.r0));
    const r2 = Math.max(...cacY.map((n) => phamVi(n)[1]));
    const chuY = cacY.map((n) => n.o.chu).join('\n');
    const cau = cacNhomCau
      .filter((_, gi) => (nhomCuaY.get(gi) ?? []).some((i) => ds.includes(i)))
      .flatMap((g) => g.cau);
    const khung = dungDong(r1, r2, chuY);
    const { yccd: yTach, nhan } = tachYccd(chuY);
    const dong: DongMaTran = { ...khung, yccd: khung.yccd ?? yTach, cau_hoi: cau };
    if (nhan && dong.nhan === undefined && khung.yccd === undefined) dong.nhan = nhan;
    out.push({ dong, r: r1 });
  }
  return out.sort((a, b) => a.r - b.r);
}

function docBangDiemTheoMuc(
  luoi: Luoi,
  td: TieuDe,
  canhBao: string[],
  kieu: 'TOAN' | 'TV',
): DongDoc[] | null {
  const cotYccd = cotCo(td, /yeu cau can dat/);
  const cotSoCau = cotCo(td, kieu === 'TV' ? /^cau so$/ : /^so cau$/);
  const cotTN = td.o.find((x) => x.t === 'tn')?.c0;
  const cotTL = td.o.find((x) => x.t === 'tl')?.c0;
  if (cotYccd === undefined || cotSoCau === undefined || cotTN === undefined || cotTL === undefined) return null;
  const cotMuc = new Map<MucDo, number>();
  for (const x of td.o) {
    const m = x.t.match(/^(?:muc\s*)?([123])$/);
    if (m && x.c0 > cotTL) cotMuc.set(Number(m[1]) as MucDo, x.c0);
  }
  if (cotMuc.size !== 3) return null;
  const h1 = td.hCuoi + 1;
  const h2 = hangCuoiDuLieu(luoi, h1);

  // Mỗi câu: một ô có điểm ở cột mức
  const nhom: { r1: number; r2: number; cau: CauHoiMaTran[] }[] = [];
  for (const [muc, c] of cotMuc) {
    for (const n of oTrongCot(luoi, h1, h2, c)) {
      if (n.r0 < h1) continue;
      const diem = docSo(n.o.chu);
      if (!diem) continue;
      const r1 = n.r0;
      const r2 = Math.min(h2, n.r0 + Math.max(1, n.o.hang) - 1);
      let chuCau = chuCot(luoi, r1, r2, cotSoCau);
      const soTron = kieu === 'TV';
      let doc = docOCau(chuCau, soTron);
      // Ô điểm ngắn hơn ô YCCĐ (Toán cuối năm: "(Câu 12)" nằm ở hàng dưới): đọc lại trong phạm vi ô YCCĐ
      const oY = luoi[r1]?.[cotYccd];
      if (!doc.cau.length && oY) {
        const chuRong = chuCot(luoi, oY.r0, Math.min(h2, oY.r0 + Math.max(1, oY.o.hang) - 1), cotSoCau);
        const docRong = docOCau(chuRong, soTron);
        if (docRong.cau.length === 1) { chuCau = chuRong; doc = docRong; }
      }
      const { cau, yNho, soDau } = doc;
      const coTN = /\d/.test(chuCot(luoi, r1, r2, cotTN));
      const coTL = /\d/.test(chuCot(luoi, r1, r2, cotTL));
      const hinhThuc: HinhThucCau = coTN && !coTL ? 'TN' : coTL && !coTN ? 'TL' : coTN ? 'TN' : 'TL';
      if (coTN === coTL) canhBao.push(`Câu ${cau.join(', ') || '?'}: không rõ trắc nghiệm hay tự luận (cột TN/TL), app tạm để ${hinhThuc}.`);
      if (!cau.length) {
        canhBao.push(`Có một câu ${fmt(diem)} điểm ở Mức ${muc} chưa ghi số câu (ô "${motDong(chuCau) || 'trống'}").`);
        continue;
      }
      if (cau.length > 1) {
        const moiCau = Math.round((diem / cau.length) * 100) / 100;
        nhom.push({ r1, r2, cau: cau.map((so) => ({ cau: so, y_nho: null, so_cau_tinh: 1, muc, hinh_thuc: hinhThuc, dang: null, diem: moiCau })) });
      } else {
        const soTinh = yNho?.length ?? 1;
        if (soDau && soDau !== soTinh) canhBao.push(`Câu ${cau[0]}: cột số câu ghi ${soDau} nhưng app tính ${soTinh} câu${yNho ? ` (ý ${yNho.join(', ')})` : ''}.`);
        nhom.push({ r1, r2, cau: [{ cau: cau[0], y_nho: yNho, so_cau_tinh: soTinh, muc, hinh_thuc: hinhThuc, dang: null, diem }] });
      }
    }
  }

  const coNhom = cotYccd >= 3;
  const ketQua = gomDong(luoi, h1, h2, cotYccd, nhom, (r1) => {
    const mach = luoi[r1]?.[0]?.o.chu ?? '';
    const nhomText = coNhom ? luoi[r1]?.[1]?.o.chu ?? '' : '';
    const noiDungText = cotYccd >= 2 ? luoi[r1]?.[cotYccd - 1]?.o.chu ?? '' : '';
    const d: Omit<DongMaTran, 'cau_hoi' | 'yccd'> = {
      mach: kieu === 'TV' ? boDiemNgoac(mach) : motDong(mach),
      noi_dung: motDong(noiDungText) || null,
    };
    if (coNhom && nhomText.trim()) d.nhom = chuanNhom(nhomText);
    if (d.noi_dung && /^\*?\s*chủ điểm/i.test(d.noi_dung)) {
      d.chu_diem = motDong(gon(noiDungText).replace(/^\*?\s*chủ điểm\s*:?\s*/i, '').replace(/\n?\s*\*\s*/g, '; ').replace(/^;\s*/, ''));
      d.noi_dung = null;
    }
    return d;
  }).map((x) => {
    // Tiếng Việt: nội dung lấy theo nhãn "* TỪ VỰNG:" khi cột nội dung là chủ điểm
    if (x.dong.noi_dung === null && x.dong.nhan) {
      x.dong.noi_dung = viHoaDau(x.dong.nhan);
      delete x.dong.nhan;
    }
    return x;
  });
  if (kieu === 'TOAN') doiChieuTong(soCauHangTong(luoi, h1, cotSoCau), ketQua, canhBao);
  return ketQua;
}

// ---------------------------------------------------------------------------
// Bảng "Số câu và số điểm" + cặp TN/TL theo mức (Khoa học, LS&ĐL, Công nghệ)
// ---------------------------------------------------------------------------

function docBangCapMuc(luoi: Luoi, td: TieuDe, canhBao: string[]): { dong: DongDoc[]; tiLe?: Record<'1' | '2' | '3', number> } | null {
  const cotYccd = cotCo(td, /yeu cau can dat/);
  const cotSoDiem = cotCo(td, /so cau va so diem/);
  if (cotYccd === undefined || cotSoDiem === undefined) return null;
  // Hàng có ô TN: thứ tự ô TN, TL, TN, TL... → Mức 1, 2, 3, rồi cột Tổng
  const hTN = luoi.findIndex((h, r) => r <= td.hCuoi && h.some((n) => n && n.r0 === r && chuan(n.o.chu) === 'tn'));
  const oTN = [...new Map(luoi[hTN].filter((n): n is ONut => !!n && n.r0 === hTN).map((n) => [n.id, n])).values()].sort((a, b) => a.c0 - b.c0);
  const viTriTheoCot = (c: number) => {
    const n = luoi[hTN][c];
    return n ? oTN.findIndex((x) => x.id === n.id) : -1;
  };
  const tiLe: Partial<Record<'1' | '2' | '3', number>> = {};
  for (const x of td.o) {
    const m = x.t.match(/^muc\s*([123])\s*\((\d+)\s*%\)/);
    if (m) tiLe[m[1] as '1' | '2' | '3'] = Number(m[2]);
  }

  const h1 = td.hCuoi + 1;
  const h2 = hangCuoiDuLieu(luoi, h1);
  const out: DongDoc[] = [];
  // Mỗi ô "Số câu và số điểm" là một đơn vị: câu hỏi và YCCĐ nằm trong phạm vi hàng của ô đó
  for (const oSD of oTrongCot(luoi, h1, h2, cotSoDiem)) {
    if (oSD.r0 < h1) continue;
    const r = oSD.r0;
    const r2 = Math.min(h2, r + Math.max(1, oSD.o.hang) - 1);
    const oMach = luoi[r][0];
    const tenMach = motDong(oMach?.o.chu ?? '');
    const nhanDong = tenMach.slice(0, 60) || `Hàng ${r + 1}`;
    const nSoDiem = chuan(oSD.o.chu);
    const soCauGhi = nSoDiem.includes('cau') ? docSo(nSoDiem.split('cau')[0] ?? '') : null;
    const diemGhi = nSoDiem.includes('diem') ? docSo(nSoDiem.split('cau').slice(1).join(' ') || nSoDiem) : null;
    const cau: CauHoiMaTran[] = [];
    const da = new Set<number>();
    for (let rr = r; rr <= r2; rr++) {
      for (const n of luoi[rr]) {
        if (!n || da.has(n.id) || n.c0 <= cotSoDiem || !n.o.chu.trim()) continue;
        da.add(n.id);
        const k = viTriTheoCot(n.c0);
        if (k < 0 || k >= 6) continue; // cột Tổng
        const muc = (Math.floor(k / 2) + 1) as MucDo;
        const hinhThuc: HinhThucCau = k % 2 === 0 ? 'TN' : 'TL';
        const { cau: so, dang } = docOCau(n.o.chu, false);
        if (!so.length) {
          if (/\d/.test(n.o.chu)) canhBao.push(`${nhanDong}: ô Mức ${muc} ${hinhThuc} ghi "${motDong(n.o.chu)}" nhưng chưa có số câu.`);
          continue;
        }
        for (const x of so) cau.push({ cau: x, y_nho: null, so_cau_tinh: 1, muc, hinh_thuc: hinhThuc, dang, diem: 0 });
      }
    }
    if (cau.length) {
      const tong = diemGhi ?? cau.length;
      const moiCau = Math.round((tong / cau.length) * 100) / 100;
      cau.forEach((c) => (c.diem = moiCau));
      if (soCauGhi !== null && soCauGhi !== cau.length) {
        canhBao.push(`${nhanDong}: cột "Số câu và số điểm" ghi ${soCauGhi} câu nhưng các cột mức có ${cau.length} câu.`);
      }
      if (diemGhi === null) canhBao.push(`${nhanDong}: chưa đọc được số điểm, app tạm tính 1 điểm mỗi câu.`);
    }
    const { yccd, nhan } = tachYccd(chuCot(luoi, r, r2, cotYccd));
    const dong: DongMaTran = { mach: tenMach, noi_dung: cotYccd >= 2 ? motDong(luoi[r][1]?.o.chu ?? '') || null : null, yccd, cau_hoi: cau };
    if (nhan) dong.nhan = nhan;
    out.push({ dong, r });
  }
  // Hàng "TỔNG | SỐ CÂU | 10 | ...": số câu nằm ở cột "Số câu và số điểm"
  doiChieuTong(soCauHangTong(luoi, h1, cotSoDiem), out, canhBao);
  const tiLeDu = tiLe['1'] && tiLe['2'] && tiLe['3'] ? (tiLe as Record<'1' | '2' | '3', number>) : undefined;
  return { dong: out, tiLe: tiLeDu };
}

// ---------------------------------------------------------------------------
// Tiếng Việt: đọc thành tiếng, viết, độ dài văn bản
// ---------------------------------------------------------------------------

function docDocThanhTieng(luoi: Luoi): PhanMaTran | null {
  const td = luoi[0]?.map((n) => (n ? chuan(n.o.chu) : ''));
  const cotYccd = td?.findIndex((t) => t.includes('yeu cau can dat')) ?? -1;
  const cotDiem = td?.findIndex((t) => t === 'diem') ?? -1;
  if (cotYccd < 0 || cotDiem < 0) return null;
  const dong: DongMaTran[] = [];
  let ten = 'Phần 1: Đọc thành tiếng';
  let noiDung: string | null = null;
  for (let r = 1; r < luoi.length; r++) {
    const o = luoi[r][cotYccd];
    if (!o || o.r0 !== r) continue;
    if (/^tong\b/.test(chuan(o.o.chu))) break;
    const mach = luoi[r][0]?.o.chu ?? '';
    if (mach.trim()) ten = boDiemNgoac(mach);
    const nd = cotYccd >= 2 ? luoi[r][1]?.o.chu ?? '' : '';
    if (nd.trim()) noiDung = motDong(gon(nd).replace(/^\*\s*/, '').replace(/\n+/g, '; ').replace(/:\s*;\s*/, ': '));
    const diem = docSo(luoi[r][cotDiem]?.o.chu.replace(/^[.\s/]+/, '') ?? '');
    dong.push({ mach: ten, noi_dung: noiDung, yccd: [motDong(o.o.chu)], cau_hoi: [], tieu_chi_diem: diem ?? 0 });
  }
  if (!dong.length) return null;
  const tong = dong.reduce((s, d) => s + (d.tieu_chi_diem ?? 0), 0);
  return { ma: 'doc_thanh_tieng', ten, kieu: 'TIEU_CHI', tong_diem: tong, dong };
}

/** Mã phương án từ tên thể loại: "Viết bài văn miêu tả con vật" → "MIEU_TA_CON_VAT". */
export function maTheLoai(ten: string): string {
  const t = chuan(ten)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(viet|bai van|doan van|bai|doan|van|mot|cua|da|ve)\b/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('_')
    .toUpperCase();
  return t || 'THE_LOAI';
}

function docViet(luoi: Luoi, canhBao: string[]): PhanMaTran | null {
  const td = luoi[0]?.map((n) => (n ? chuan(n.o.chu) : ''));
  const cotTheLoai = td?.findIndex((t) => t === 'the loai') ?? -1;
  const cotYccd = td?.findIndex((t) => t.includes('yeu cau can dat')) ?? -1;
  const cotChuDiem = td?.findIndex((t) => t === 'chu diem') ?? -1;
  const cotDiem = td?.findIndex((t) => t === 'diem') ?? -1;
  if (cotTheLoai < 0 || cotYccd < 0 || !luoi[1]) return null;
  const r = 1;
  const ten = boDiemNgoac(luoi[r][0]?.o.chu ?? 'Phần 3: Viết văn bản');
  const diem = docSo(luoi[r][cotDiem]?.o.chu ?? '') ?? 10;
  const chuDiem = cotChuDiem >= 0 ? motDong(gon(luoi[r][cotChuDiem]?.o.chu ?? '').replace(/^\*\s*/, '').replace(/\n+\s*\*?\s*/g, '; ')) : '';
  const theLoai = gon(luoi[r][cotTheLoai]?.o.chu ?? '')
    .split('\n')
    .map((x) => x.replace(/^[-–—•*\s]+/, '').replace(/\.$/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  // YCCĐ chia đoạn theo "1.", "2." khớp thứ tự thể loại
  const doan: string[][] = [];
  for (const d of gon(luoi[r][cotYccd]?.o.chu ?? '').split('\n')) {
    if (/^\d+\.\s/.test(d)) doan.push([]);
    else if (d.trim()) (doan[doan.length - 1] ?? (doan[0] = [])).push(d);
  }
  if (doan.length !== theLoai.length) canhBao.push(`Phần Viết có ${theLoai.length} thể loại nhưng YCCĐ chia ${doan.length} đoạn, app gắn cùng một danh sách YCCĐ cho mọi thể loại.`);
  const phuongAn = theLoai.map((tl, i) => {
    const nguon = doan.length === theLoai.length ? doan[i] : doan.flat();
    const { yccd } = tachYccd(nguon.join('\n'));
    const dong: DongMaTran = {
      mach: ten,
      noi_dung: tl,
      yccd,
      cau_hoi: [{ cau: 'Viết', y_nho: null, so_cau_tinh: 1, muc: 3, hinh_thuc: 'TL', dang: 'VIET', diem }],
    };
    if (chuDiem) dong.chu_diem = chuDiem;
    return { ma: maTheLoai(tl), ten: tl, dong: [dong] };
  });
  // Mã trùng thì thêm số
  phuongAn.forEach((p, i) => { if (phuongAn.findIndex((q) => q.ma === p.ma) !== i) p.ma = `${p.ma}_${i + 1}`; });
  if (!phuongAn.length) return null;
  return { ma: 'viet', ten, tong_diem: diem, kieu: 'VIET', lua_chon: { ma: 'the_loai', ten: 'Thể loại bài viết (chọn một)', phuong_an: phuongAn }, dong: [] };
}

function docDoDai(khoi: KhoiVanBan[]): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const k of khoi) {
    if (k.loai !== 'doan') continue;
    for (const d of gon(k.chu).split('\n')) {
      const m = d.match(/^\+?\s*([^:+]{2,40}?)\s*:[\s:]*(\d+\s*[-–]\s*\d+)\s*chữ/i);
      if (m) out[motDong(m[1])] = `${m[2].replace(/\s*[-–]\s*/, ' – ')} chữ`;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Ghép lại
// ---------------------------------------------------------------------------

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

function tongDiemDong(ds: DongMaTran[]) {
  return ds.reduce((s, d) => s + d.cau_hoi.reduce((t, c) => t + c.diem, 0), 0);
}

function tiLeTheoDiem(ds: DongMaTran[]): Record<'1' | '2' | '3', number> {
  const diem = { '1': 0, '2': 0, '3': 0 };
  for (const d of ds) for (const c of d.cau_hoi) diem[String(c.muc) as '1' | '2' | '3'] += c.diem;
  const tong = diem['1'] + diem['2'] + diem['3'] || 1;
  return { '1': Math.round((diem['1'] / tong) * 100), '2': Math.round((diem['2'] / tong) * 100), '3': Math.round((diem['3'] / tong) * 100) };
}

export function docMaTranChungTuBang(khoi: KhoiVanBan[], f: ThongTinFile): KetQuaDocMaTran {
  const kq = docMaTranChungTuBangGoc(khoi, f);
  if (kq.mtc) danhKhoaCauTach(kq.mtc);
  return kq;
}

function docMaTranChungTuBangGoc(khoi: KhoiVanBan[], f: ThongTinFile): KetQuaDocMaTran {
  const canhBao: string[] = [];
  const bang = khoi.map((k, i) => ({ k, i })).filter((x): x is { k: Extract<KhoiVanBan, { loai: 'bang' }>; i: number } => x.k.loai === 'bang');

  // Tiếng Việt: ba bảng riêng
  if (f.maMon === 'TIENG_VIET') {
    let dtt: PhanMaTran | null = null;
    let dh: DongDoc[] | null = null;
    let viet: PhanMaTran | null = null;
    const bangChinh = new Set<number>();
    for (const { k, i } of bang) {
      const luoi = moRongLuoi(k.hang);
      const dau = chuan(luoi[0]?.map((n) => n?.o.chu ?? '').join(' | ') ?? '');
      const td = timTieuDe(luoi);
      if (!dh && td && /cau so/.test(dau)) {
        dh = docBangDiemTheoMuc(luoi, td, canhBao, 'TV');
        if (dh) bangChinh.add(i);
      } else if (!viet && /the loai/.test(dau)) {
        viet = docViet(luoi, canhBao);
        if (viet) bangChinh.add(i);
      } else if (!dtt && /yeu cau can dat/.test(dau) && /doc thanh tieng/.test(chuan(k.hang.flat().map((o) => o.chu).join(' ')))) {
        dtt = docDocThanhTieng(luoi);
        if (dtt) bangChinh.add(i);
      }
    }
    if (!dh) return { mtc: null, canhBao, loi: 'Không tìm thấy bảng Đọc hiểu (cột "Câu số", TN, TL, Mức 1–3).' };
    if (!dtt) canhBao.push('Không tìm thấy bảng Đọc thành tiếng.');
    if (!viet) canhBao.push('Không tìm thấy bảng Viết (cột "Thể loại").');
    const laVB = (d: DongMaTran, ma: string) => (d.noi_dung ?? '').toUpperCase().includes(`(${ma})`);
    const dongVBVH = dh.filter((x) => laVB(x.dong, 'VBVH')).map((x) => x.dong);
    const dongVBTT = dh.filter((x) => laVB(x.dong, 'VBTT')).map((x) => x.dong);
    const dongChung = dh.filter((x) => !laVB(x.dong, 'VBVH') && !laVB(x.dong, 'VBTT')).map((x) => x.dong);
    const mach = dh[0]?.dong.mach || 'Phần 2: Đọc hiểu';
    const phanDH: PhanMaTran = {
      ma: 'doc_hieu',
      ten: mach,
      kieu: 'CAU_HOI',
      tong_diem: tongDiemDong([...dongVBVH, ...dongChung]),
      dong: dongChung,
    };
    if (dongVBVH.length && dongVBTT.length) {
      phanDH.lua_chon = {
        ma: 'loai_van_ban',
        ten: 'Loại văn bản đọc hiểu (chọn một)',
        phuong_an: [
          { ma: 'VBVH', ten: 'Văn bản văn học', dong: dongVBVH },
          { ma: 'VBTT', ten: 'Văn bản thông tin', dong: dongVBTT },
        ],
      };
      const dVH = tongDiemDong(dongVBVH);
      const dTT = tongDiemDong(dongVBTT);
      if (Math.abs(dVH - dTT) > 1e-9) canhBao.push(`Phần đọc hiểu VBVH có ${fmt(dVH)} điểm nhưng VBTT có ${fmt(dTT)} điểm.`);
    } else {
      phanDH.dong = dh.map((x) => x.dong);
    }
    const phanDoc = [dtt, phanDH].filter((p): p is PhanMaTran => !!p);
    const baiDoc: BaiKiemTraMaTran = { ma: 'doc', ten: 'Bài kiểm tra Đọc', tong_diem: phanDoc.reduce((s, p) => s + (p.tong_diem ?? 0), 0), phan: phanDoc };
    const bai: BaiKiemTraMaTran[] = [baiDoc];
    if (viet) bai.push({ ma: 'viet', ten: 'Bài kiểm tra Viết', tong_diem: viet.tong_diem ?? 10, phan: [viet] });
    const diemMuc = { '1': 0, '2': 0, '3': 0 };
    for (const d of [...(dongVBVH.length ? dongVBVH : dh.map((x) => x.dong)), ...(dongVBVH.length ? dongChung : [])]) {
      for (const c of d.cau_hoi) diemMuc[String(c.muc) as '1' | '2' | '3'] += c.diem;
    }
    const tongDH = diemMuc['1'] + diemMuc['2'] + diemMuc['3'];
    const mtc: MaTranChung = {
      ...thongTinChung(khoi, bangChinh, f),
      bo_cuc: 'TIENG_VIET_3_PHAN',
      bai_kiem_tra: bai,
      ti_le_muc_quy_dinh_doc_hieu: { ...diemMuc, don_vi: `điểm trên ${fmt(tongDH)}` },
    };
    const doDai = docDoDai(khoi);
    if (doDai) mtc.do_dai_van_ban = doDai;
    if (canhBao.length) mtc.van_de_can_xac_nhan = [...new Set(canhBao)];
    return { mtc, canhBao: [...new Set(canhBao)] };
  }

  // Các môn khác: bảng đầu tiên có hàng tiêu đề TN/TL
  for (const { k, i } of bang) {
    const luoi = moRongLuoi(k.hang);
    const td = timTieuDe(luoi);
    if (!td) continue;
    let dong: DongDoc[] | null = null;
    let boCuc: BoCucMaTran | null = null;
    let tiLeGhi: Record<'1' | '2' | '3', number> | undefined;
    if (cotCo(td, /so cau va so diem/) !== undefined) {
      const kq = docBangCapMuc(luoi, td, canhBao);
      if (kq) { dong = kq.dong; tiLeGhi = kq.tiLe; boCuc = 'BAI_MUC_TN_TL'; }
    } else if (cotCo(td, /^so cau$/) !== undefined) {
      dong = docBangDiemTheoMuc(luoi, td, canhBao, 'TOAN');
      boCuc = 'TOAN_HINH_THUC_MUC';
    }
    if (!dong || !boCuc) continue;
    const ds = dong.map((x) => x.dong);
    const tiLe = tiLeTheoDiem(ds);
    if (tiLeGhi && (['1', '2', '3'] as const).some((m) => tiLeGhi![m] !== tiLe[m])) {
      canhBao.push(`Đầu cột ghi tỉ lệ ${tiLeGhi['1']}% – ${tiLeGhi['2']}% – ${tiLeGhi['3']}% nhưng điểm thực tế là ${tiLe['1']}% – ${tiLe['2']}% – ${tiLe['3']}%. App lấy theo điểm thực tế.`);
    }
    const tong = tongDiemDong(ds);
    const mtc: MaTranChung = {
      ...thongTinChung(khoi, new Set([i]), f),
      bo_cuc: boCuc,
      bai_kiem_tra: [{ ma: 'chinh', ten: `Bài kiểm tra ${f.tenMon}`, tong_diem: Math.round(tong * 100) / 100, phan: [{ ma: 'p1', ten: null, dong: ds }] }],
      ti_le_muc_quy_dinh: tiLe,
    };
    if (canhBao.length) mtc.van_de_can_xac_nhan = [...new Set(canhBao)];
    return { mtc, canhBao: [...new Set(canhBao)] };
  }
  return { mtc: null, canhBao, loi: 'Không nhận ra bảng ma trận: cần có hàng tiêu đề với cột TN, TL và cột "Số câu" hoặc "Số câu và số điểm".' };
}
