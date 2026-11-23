/**
 * ThayKhaiEdu - Báo cáo tỉ lệ theo số tiết của từng mạch kiến thức (tham khảo cho tổ trưởng ở Ma trận chung).
 *
 * Từ phân phối chương trình (từng tiết, tuần, loại tiết) và bảng Bài → Mạch tổ trưởng đã xếp:
 * cộng số tiết của mỗi mạch trong khoảng tuần kiểm tra, ra tỉ lệ %, số điểm và số câu gợi ý;
 * đặt cạnh số điểm, số câu thật trong ma trận chung để tổ trưởng so sánh.
 *
 * Chỉ để tham khảo: không phải lỗi, không chặn lưu, không tự sửa ma trận. Mỗi môn có đặc điểm riêng.
 * Hàm thuần, không đọc cơ sở dữ liệu, không gọi AI. Không đoán mạch: bài chưa xếp thì báo "chưa xếp mạch".
 */

import type { MaTranChung } from '@/types/matrix-template';
import { cacNhomLuaChon, danhSachCau, type LuaChon } from '@/core/matrix/matrix-template';
import { chiaTheoTrongSo } from '@/core/matrix/dung-tu-chuong-trinh';

/** Một tiết trong PPCT. loaiTiet: 'standard' (học mới), 'review' (ôn tập), 'test' (kiểm tra), hoặc null. */
export interface TietTiLe {
  thuTu: number;
  tuan: number | null;
  hocKi: number | null;
  baiTen: string | null;
  loaiTiet?: string | null;
}

/** Một dòng mục lục SGK: trang đầu của một phần trong một bài, theo tập sách. */
export interface MucLucTiLe { tap: number; baiSo: number; noiDung: string; trang: number }

/** Một bài trong PPCT (gom các tiết cùng bài). */
export interface BaiPpct {
  /** Khóa ổn định để lưu Bài → Mạch: "bai-12" hoặc "ten-<tên bài chuẩn hóa>". */
  khoa: string;
  ten: string;
  soTiet: number;
  tuanDau: number;
  tuanCuoi: number;
  /** Vài tên tiết của bài (để tổ trưởng nhận ra bài khi xếp mạch). */
  tenTiet: string[];
}

const chuan = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const gonTen = (s: string) =>
  s.replace(/\(\s*(tiết|tiet)\s*\d+\s*\)/giu, ' ')
    .replace(/\(\s*(tr\.?|trang)\s*[\d\s,–-]*\)/giu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.:;,–-]+|[\s.:;,–-]+$/g, '')
    .trim();

/** Tập sách của tiết: học kì II thì tập 2 (Toán, Tiếng Việt có hai tập); không rõ thì tập 1. */
const tapCuaTiet = (t: TietTiLe) => (t.hocKi === 2 ? 2 : 1);

/** Trang ghi trong tên tiết: "(tr.10)", "(tr 66)", "(Trang 33)", "(tr127,.128)", "(84)". */
export function trangTrongTenTiet(ten: string | null | undefined): number | null {
  const m = /\(\s*(?:tr\.?|trang)?\s*(\d{1,3})(?![\d])[^)]*\)/iu.exec(ten ?? '');
  return m ? Number(m[1]) : null;
}

const laTietLuyenTap = (ten: string) => /^(luyện tập|ôn tập|thực hành|kiểm tra)/iu.test(ten.trim());
/** Hai tên bài cùng nói một nội dung (so vài chữ đầu, bỏ dấu câu). */
const cungTen = (a: string, b: string) => {
  const k = (s: string) => chuan(s).replace(/[^\p{L}\d ]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
  return !!k(a) && k(a) === k(b);
};

/**
 * Bài của từng tiết (đi lần lượt theo thứ tự PPCT):
 * 1. Tên tiết ghi "Bài 3: …" (Khoa học, LS&ĐL, Công nghệ): lấy số bài.
 * 2. Tên tiết ghi trang (Toán): tra mục lục cùng tập, lấy bài có trang đầu gần nhất không vượt trang đó.
 *    Mục lục thiếu bài (ví dụ thiếu bài 22): tiết học bài mới có tên khác bài liền trước thì mở bài còn thiếu đó,
 *    đặt tên theo tiết; các tiết luyện tập sau nó đi theo, đến khi gặp bài kế tiếp có trong mục lục.
 * 3. Không được thì gom theo tên (bỏ phần trong ngoặc), để tổ trưởng vẫn xếp mạch được.
 */
export function ganBaiChoTiet(tiet: TietTiLe[], mucLuc: MucLucTiLe[] = []): Map<number, { khoa: string; ten: string }> {
  const kq = new Map<number, { khoa: string; ten: string }>();
  const soCo = new Set(mucLuc.map((m) => `${m.tap}|${m.baiSo}`));
  // Bài đang mở để bù chỗ mục lục thiếu: theo tập, kèm số bài trong mục lục mà nó nằm sau (0 = trước bài đầu tiên)
  let bu: { tap: number; sau: number; khoa: string; ten: string } | null = null;
  for (const t of [...tiet].sort((a, b) => a.thuTu - b.thuTu)) {
    const ten = (t.baiTen ?? '').replace(/\s+/g, ' ').trim();
    const soBai = /^\s*bài\s*(\d+)\s*[:.\-–]?\s*(.*)$/iu.exec(ten);
    if (soBai) {
      const n = Number(soBai[1]);
      const ml = mucLuc.find((m) => m.baiSo === n);
      kq.set(t.thuTu, { khoa: `bai-${n}`, ten: `Bài ${n}: ${gonTen(soBai[2]) || ml?.noiDung || ''}`.replace(/:\s*$/, '') });
      continue;
    }
    const trang = trangTrongTenTiet(ten);
    const tap = tapCuaTiet(t);
    const cuaTap = mucLuc.filter((m) => m.tap === tap);
    if (trang !== null && cuaTap.length) {
      const truoc = cuaTap.filter((m) => m.trang <= trang).sort((a, b) => b.trang - a.trang || b.baiSo - a.baiSo)[0];
      const sau = truoc?.baiSo ?? 0;
      const soThieu = truoc ? truoc.baiSo + 1 : Math.min(...cuaTap.map((m) => m.baiSo)) - 1;
      const thieu = soThieu >= 1 && !soCo.has(`${tap}|${soThieu}`) && (!truoc || cuaTap.some((m) => m.baiSo > soThieu));
      if (bu && (bu.tap !== tap || bu.sau !== sau)) bu = null;
      const tenTiet = gonTen(ten);
      const moBaiMoi = thieu && !bu && (!truoc || (!laTietLuyenTap(tenTiet) && !cungTen(tenTiet, truoc.noiDung) && trang > truoc.trang));
      if (moBaiMoi) bu = { tap, sau, khoa: `bai-${soThieu}`, ten: `Bài ${soThieu}: ${tenTiet || 'chưa có trong mục lục'}` };
      if (bu) { kq.set(t.thuTu, { khoa: bu.khoa, ten: bu.ten }); continue; }
      if (truoc) { kq.set(t.thuTu, { khoa: `bai-${truoc.baiSo}`, ten: `Bài ${truoc.baiSo}: ${truoc.noiDung}` }); continue; }
    }
    const g = gonTen(ten) || 'Chưa có tên bài';
    kq.set(t.thuTu, { khoa: `ten-${chuan(g)}`, ten: g });
  }
  return kq;
}

/** Bài của một tiết (khi chỉ xét riêng tiết đó). */
export function baiCuaTiet(t: TietTiLe, mucLuc: MucLucTiLe[] = []): { khoa: string; ten: string } {
  return ganBaiChoTiet([t], mucLuc).get(t.thuTu)!;
}

/** Số bài thiếu trong mục lục (giữa bài nhỏ nhất và lớn nhất của mỗi tập): tiết của các bài này có thể bị tính vào bài liền trước. */
export function baiThieuTrongMucLuc(mucLuc: MucLucTiLe[]): number[] {
  const kq: number[] = [];
  for (const tap of [...new Set(mucLuc.map((m) => m.tap))]) {
    const so = [...new Set(mucLuc.filter((m) => m.tap === tap).map((m) => m.baiSo))].sort((a, b) => a - b);
    for (let i = 1; i < so.length; i++) for (let n = so[i - 1] + 1; n < so[i]; n++) kq.push(n);
  }
  return kq.sort((a, b) => a - b);
}

export interface TuyChonTiLe {
  tuanTu: number;
  tuanDen: number;
  /** Tính tiết ôn tập (loaiTiet 'review'). */
  tinhOnTap: boolean;
  /** Tính tiết kiểm tra (loaiTiet 'test'). */
  tinhKiemTra: boolean;
}

/** Gom tiết trong phạm vi thành các bài, giữ thứ tự PPCT. */
export function baiTrongPhamVi(tiet: TietTiLe[], mucLuc: MucLucTiLe[], tc: TuyChonTiLe): BaiPpct[] {
  const kq = new Map<string, BaiPpct>();
  // Gán bài trên cả năm (không chỉ trong phạm vi) để bài bắt đầu trước tuần kiểm tra vẫn đúng tên
  const ganBai = ganBaiChoTiet(tiet, mucLuc);
  for (const t of [...tiet].sort((a, b) => a.thuTu - b.thuTu)) {
    if (t.tuan === null || t.tuan < tc.tuanTu || t.tuan > tc.tuanDen) continue;
    if (t.loaiTiet === 'review' && !tc.tinhOnTap) continue;
    if (t.loaiTiet === 'test' && !tc.tinhKiemTra) continue;
    const b = ganBai.get(t.thuTu)!;
    const co = kq.get(b.khoa);
    const tenTiet = (t.baiTen ?? '').replace(/\s+/g, ' ').trim();
    if (co) {
      co.soTiet += 1;
      co.tuanDau = Math.min(co.tuanDau, t.tuan);
      co.tuanCuoi = Math.max(co.tuanCuoi, t.tuan);
      if (tenTiet && co.tenTiet.length < 6 && !co.tenTiet.includes(tenTiet)) co.tenTiet.push(tenTiet);
    } else kq.set(b.khoa, { khoa: b.khoa, ten: b.ten, soTiet: 1, tuanDau: t.tuan, tuanCuoi: t.tuan, tenTiet: tenTiet ? [tenTiet] : [] });
  }
  return [...kq.values()];
}

/** Các mạch trong ma trận chung, đúng thứ tự và cách viết của ma trận (kể cả mạch ở phương án lựa chọn). */
export function cacMachCuaMaTran(mtc: MaTranChung): string[] {
  const kq: string[] = [];
  const them = (m: string) => { const x = m.replace(/\s+/g, ' ').trim(); if (x && !kq.some((k) => chuan(k) === chuan(x))) kq.push(x); };
  for (const bai of mtc.bai_kiem_tra) for (const phan of bai.phan) {
    for (const d of phan.dong) them(d.mach);
    for (const pa of phan.lua_chon?.phuong_an ?? []) for (const d of pa.dong) them(d.mach);
  }
  return kq;
}

export interface DongTiLeMach {
  mach: string;
  soTiet: number;
  /** % số tiết (một chữ số thập phân). */
  tiLe: number;
  diemGoiY: number;
  cauGoiY: number;
  diemMaTran: number;
  cauMaTran: number;
  /** % điểm trong ma trận. */
  tiLeMaTran: number;
}

export interface BaoCaoTiLe {
  dong: DongTiLeMach[];
  bai: (BaiPpct & { mach: string | null })[];
  tongTiet: number;
  tietChuaXep: number;
  tongDiem: number;
  tongCau: number;
  ghiChu: string[];
}

const lam1 = (x: number) => Math.round(x * 10) / 10;
const lam2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Cho điểm gợi ý và số câu gợi ý khớp nhau ở từng mạch (sửa tại chỗ):
 * mạch có điểm thì phải có ít nhất 1 câu, mạch có câu thì mỗi câu ít nhất 0,5 điểm.
 * Chia riêng điểm và câu theo số tiết có thể ra "0,5 điểm – 0 câu" ở mạch ít tiết; khi đó
 * lấy 1 câu (hoặc 0,5 điểm) từ mạch đang dư nhiều nhất. Tổng điểm, tổng câu giữ nguyên.
 * nuaDiem: điểm tính theo bước 0,5 (1 = 0,5 điểm).
 */
export function canDiemVaCau(nuaDiem: number[], cau: number[]): void {
  for (let vong = 0; vong < nuaDiem.length * 4; vong++) {
    let doi = false;
    for (let i = 0; i < nuaDiem.length; i++) {
      if (nuaDiem[i] > 0 && cau[i] === 0) {
        // Lấy 1 câu từ mạch nhiều câu nhất mà vẫn còn ít nhất 1 câu
        const j = cau.map((c, k) => ({ c, k })).filter((x) => x.k !== i && x.c > 1).sort((a, b) => b.c - a.c || a.k - b.k)[0]?.k;
        if (j === undefined) continue;
        cau[j] -= 1; cau[i] += 1; doi = true;
      }
      if (nuaDiem[i] < cau[i]) {
        // Mỗi câu ít nhất 0,5 điểm: lấy 0,5 điểm từ mạch dư điểm nhiều nhất so với số câu
        const j = nuaDiem.map((d, k) => ({ du: d - Math.max(cau[k], 1), k })).filter((x) => x.k !== i && x.du > 0).sort((a, b) => b.du - a.du || a.k - b.k)[0]?.k;
        if (j === undefined) continue;
        nuaDiem[j] -= 1; nuaDiem[i] += 1; doi = true;
      }
    }
    if (!doi) return;
  }
}

/**
 * Báo cáo tỉ lệ. Điểm gợi ý chia theo bước 0,5 (tổng bằng tổng điểm ma trận), số câu gợi ý chia theo tổng số câu ma trận;
 * cả hai chia theo số tiết của các mạch, phần dư dồn cho mạch có phần lẻ lớn hơn.
 * baiMach: khóa bài → tên mạch (tổ trưởng đã xếp).
 */
export function tinhTiLeMach(p: { tiet: TietTiLe[]; mucLuc: MucLucTiLe[]; tuyChon: TuyChonTiLe; baiMach: Record<string, string>; mtc: MaTranChung }): BaoCaoTiLe {
  const bai = baiTrongPhamVi(p.tiet, p.mucLuc, p.tuyChon).map((b) => ({ ...b, mach: p.baiMach[b.khoa]?.trim() || null }));
  const machMaTran = cacMachCuaMaTran(p.mtc);
  const tenMach = (m: string) => machMaTran.find((x) => chuan(x) === chuan(m)) ?? m;

  // Số điểm, số câu thật của ma trận (mỗi nhóm lựa chọn lấy phương án đầu, như khi lập ma trận riêng)
  const lc: LuaChon = {};
  for (const n of cacNhomLuaChon(p.mtc)) if (n.phuong_an[0]) lc[n.ma] = n.phuong_an[0].ma;
  const cau = danhSachCau(p.mtc, lc);
  const tongDiem = lam2(cau.reduce((s, c) => s + c.cau.diem, 0));
  const tongCau = cau.reduce((s, c) => s + (c.cau.so_cau_tinh ?? 1), 0);

  const ds = [...machMaTran];
  for (const b of bai) if (b.mach && !ds.some((x) => chuan(x) === chuan(b.mach!))) ds.push(b.mach);
  const tiet = ds.map((m) => bai.filter((b) => b.mach && chuan(b.mach) === chuan(m)).reduce((s, b) => s + b.soTiet, 0));
  const tongDaXep = tiet.reduce((a, b) => a + b, 0);
  const nuaDiem = tongDaXep ? chiaTheoTrongSo(tiet, Math.round(tongDiem / 0.5)) : tiet.map(() => 0);
  const cauGoiY = tongDaXep ? chiaTheoTrongSo(tiet, tongCau) : tiet.map(() => 0);
  canDiemVaCau(nuaDiem, cauGoiY);
  const diem = nuaDiem.map((x) => x * 0.5);

  const dong: DongTiLeMach[] = ds.map((m, i) => {
    const cuaMach = cau.filter((c) => chuan(c.dong.mach) === chuan(m));
    const dm = lam2(cuaMach.reduce((s, c) => s + c.cau.diem, 0));
    return {
      mach: tenMach(m),
      soTiet: tiet[i],
      tiLe: tongDaXep ? lam1((tiet[i] / tongDaXep) * 100) : 0,
      diemGoiY: lam2(diem[i]),
      cauGoiY: cauGoiY[i],
      diemMaTran: dm,
      cauMaTran: cuaMach.reduce((s, c) => s + (c.cau.so_cau_tinh ?? 1), 0),
      tiLeMaTran: tongDiem ? lam1((dm / tongDiem) * 100) : 0,
    };
  });

  const tongTiet = bai.reduce((s, b) => s + b.soTiet, 0);
  const ghiChu: string[] = [];
  const tietChuaXep = tongTiet - tongDaXep;
  if (tietChuaXep) ghiChu.push(`Còn ${tietChuaXep} tiết thuộc ${bai.filter((b) => !b.mach).length} bài chưa xếp mạch, chưa tính vào tỉ lệ.`);
  const thieu = baiThieuTrongMucLuc(p.mucLuc);
  if (thieu.length && p.mucLuc.length) ghiChu.push(`Mục lục SGK đang thiếu bài ${thieu.join(', ')}: app tạm nhận các bài này theo tên tiết trong PPCT. Thầy cô xem lại tên tiết ở từng bài khi xếp mạch, hoặc bổ sung mục lục.`);
  if (!tongTiet) ghiChu.push('Không có tiết nào trong khoảng tuần đã chọn.');
  return { dong, bai, tongTiet, tietChuaXep, tongDiem, tongCau, ghiChu };
}

/** Lời nhắc AI gợi ý mạch cho từng bài: chỉ được chọn trong danh sách mạch của ma trận. */
export const HE_THONG_GOI_Y_MACH =
  'Bạn là giáo viên tiểu học Việt Nam, nắm chương trình GDPT 2018 và sách Kết nối tri thức lớp 4. Nhiệm vụ: xếp mỗi bài vào ĐÚNG MỘT mạch kiến thức trong danh sách cho sẵn. ' +
  'Chỉ dùng tên mạch có trong danh sách, viết y nguyên. Bài ôn tập chung nhiều mạch thì chọn mạch chiếm nhiều nội dung nhất. Không chắc thì để chuỗi rỗng, không đoán bừa. ' +
  'Chỉ trả về một đối tượng JSON: khóa là số thứ tự bài, giá trị là tên mạch. Ví dụ {"1":"Số và phép tính","2":""}. Không giải thích.';

export function loiNhacGoiYMach(p: { tenMon: string; mach: { ten: string; noiDung: string[] }[]; bai: { ten: string; tenTiet: string[] }[] }): string {
  return [
    `Môn ${p.tenMon} lớp 4, sách Kết nối tri thức với cuộc sống.`,
    'DANH SÁCH MẠCH (tên mạch: các nội dung trong ma trận của tổ):',
    ...p.mach.map((m) => `- ${m.ten}: ${m.noiDung.slice(0, 12).join('; ')}`),
    '',
    'CÁC BÀI (số thứ tự. tên bài | vài tên tiết):',
    ...p.bai.map((b, i) => `${i + 1}. ${b.ten}${b.tenTiet.length ? ` | ${b.tenTiet.slice(0, 3).join('; ')}` : ''}`),
    '',
    'Trả về đối tượng JSON: khóa là số thứ tự bài, giá trị là tên mạch (hoặc chuỗi rỗng).',
  ].join('\n');
}

/** Đọc kết quả AI, chỉ giữ mạch có trong danh sách. Trả về khóa bài → mạch. */
export function docGoiYMach(traLoi: string, bai: { khoa: string }[], mach: string[]): Record<string, string> {
  const s = traLoi.replace(/```[a-z]*\n?/gi, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return {};
  let j: Record<string, unknown>;
  try { j = JSON.parse(s.slice(a, b + 1)); } catch { return {}; }
  const kq: Record<string, string> = {};
  bai.forEach((x, i) => {
    const v = j[String(i + 1)];
    if (typeof v !== 'string') return;
    const m = mach.find((y) => chuan(y) === chuan(v));
    if (m) kq[x.khoa] = m;
  });
  return kq;
}
