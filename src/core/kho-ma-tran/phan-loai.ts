/**
 * ThayKhaiEdu - Kho ma trận của tổ: nhận diện file ma trận từ đường dẫn (tên thư mục + tên file).
 *
 * Hai loại:
 *  - CA_NAM: ma trận nội dung cả năm, mỗi môn một file, không gắn kì.
 *  - CHUNG : ma trận chung của một kì kiểm tra, mỗi môn × kì một file.
 *
 * Làm bằng quy tắc, không dùng AI. Không chắc thì để trống và báo, giáo viên chọn lại.
 */

export type LoaiMaTranTo = 'CA_NAM' | 'CHUNG';
export type KyMaTran = 'GIUA_HK1' | 'CUOI_HK1' | 'GIUA_HK2' | 'CUOI_NAM';

export const TEN_LOAI_MA_TRAN: Record<LoaiMaTranTo, string> = {
  CA_NAM: 'Ma trận nội dung cả năm',
  CHUNG: 'Ma trận chung',
};

export const DANH_SACH_KY_MA_TRAN: { ma: KyMaTran; ten: string }[] = [
  { ma: 'GIUA_HK1', ten: 'Giữa HKI' },
  { ma: 'CUOI_HK1', ten: 'Cuối HKI' },
  { ma: 'GIUA_HK2', ten: 'Giữa HKII' },
  { ma: 'CUOI_NAM', ten: 'Cuối năm' },
];

/** Mã môn trùng với mã trong mẫu ma trận (src/core/matrix/templates). */
export const DANH_SACH_MON: { ma: string; ten: string }[] = [
  { ma: 'TOAN', ten: 'Toán' },
  { ma: 'TIENG_VIET', ten: 'Tiếng Việt' },
  { ma: 'KHOA_HOC', ten: 'Khoa học' },
  { ma: 'LS_DL', ten: 'Lịch sử và Địa lí' },
  { ma: 'CONG_NGHE', ten: 'Công nghệ' },
  { ma: 'TIN_HOC', ten: 'Tin học' },
  { ma: 'TIENG_ANH', ten: 'Tiếng Anh' },
];

/** Bỏ dấu, viết hoa, gộp khoảng trắng; "&" thành " VA ". */
export function chuanHoa(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/&/g, ' VA ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

const MON_QUY_TAC: { re: RegExp; ma: string }[] = [
  { re: /\bTIENG VIET\b|\bTV\b/, ma: 'TIENG_VIET' },
  { re: /\bTIENG ANH\b|\bANH VAN\b/, ma: 'TIENG_ANH' },
  { re: /\bTOAN\b/, ma: 'TOAN' },
  { re: /\bKHOA HOC\b|\bKH\b/, ma: 'KHOA_HOC' },
  { re: /\bLICH SU\b|\bLS VA DL\b|\bLS DL\b|\bLSDL\b|\bDIA LI\b|\bDIA LY\b/, ma: 'LS_DL' },
  { re: /\bCONG NGHE\b|\bCN\b(?! NAM)/, ma: 'CONG_NGHE' },
  { re: /\bTIN HOC\b/, ma: 'TIN_HOC' },
];

/** Kì trong một đoạn chữ đã chuẩn hóa. Thứ tự quan trọng: "HKII" phải xét trước "HKI". */
function timKy(s: string): KyMaTran | null {
  const t = ` ${s} `;
  if (/ (GIUA (HOC )?(KI|KY) (II|2)|GIUA HK ?(II|2)|GHK ?(II|2)) /.test(t)) return 'GIUA_HK2';
  if (/ (GIUA (HOC )?(KI|KY) (I|1)|GIUA HK ?(I|1)|GHK ?(I|1)) /.test(t)) return 'GIUA_HK1';
  if (/ (CUOI NAM|CUOI (HOC )?(KI|KY) (II|2)|CUOI HK ?(II|2)|CHK ?(II|2)|CN HOC) /.test(t)) return 'CUOI_NAM';
  if (/ (CUOI (HOC )?(KI|KY) (I|1)|CUOI HK ?(I|1)|CHK ?(I|1)) /.test(t)) return 'CUOI_HK1';
  return null;
}

function timMon(s: string): string | null {
  for (const q of MON_QUY_TAC) if (q.re.test(s)) return q.ma;
  return null;
}

function timLoai(s: string): LoaiMaTranTo | null {
  if (/\bNOI DUNG CA NAM\b|\bCA NAM\b/.test(s) && !/\bMA TRAN CHUNG\b/.test(s)) return 'CA_NAM';
  if (/\bMA TRAN CHUNG\b|\bMTC\b/.test(s)) return 'CHUNG';
  return null;
}

export type DinhDangFile = 'DOCX' | 'DOC_CU' | 'KHAC' | 'TAM';

export function dinhDangFile(tenFile: string): DinhDangFile {
  if (tenFile.startsWith('~$')) return 'TAM';
  const duoi = tenFile.toLowerCase().split('.').pop() ?? '';
  if (duoi === 'docx') return 'DOCX';
  if (duoi === 'doc') return 'DOC_CU';
  return 'KHAC';
}

export interface KetQuaPhanLoai {
  duongDan: string;
  tenFile: string;
  dinhDang: DinhDangFile;
  loai: LoaiMaTranTo | null;
  maMon: string | null;
  ky: KyMaTran | null;
  /** Ghi chú cho giáo viên: thiếu gì, mâu thuẫn gì. */
  canhBao: string[];
}

const tenKy = (k: KyMaTran) => DANH_SACH_KY_MA_TRAN.find((x) => x.ma === k)?.ten ?? k;

/**
 * Nhận diện một file từ đường dẫn tương đối, ví dụ
 * "ĐỀ KIỂM TRA 2026 - 2027/3.MA TRAN CHUNG CUOI HKI_K4/1. MA TRẬN CHUNG MÔN TOÁN CUỐI HKI K4_2026-2027.docx".
 * Tên file được ưu tiên hơn tên thư mục; hai bên nói khác nhau thì để trống kì và báo.
 */
export function phanLoaiFile(duongDan: string): KetQuaPhanLoai {
  const phan = duongDan.replace(/\\/g, '/').split('/').filter(Boolean);
  const tenFile = phan[phan.length - 1] ?? duongDan;
  const thuMuc = phan.slice(0, -1).map(chuanHoa);
  const ten = chuanHoa(tenFile.replace(/\.[^.]+$/, ''));
  const canhBao: string[] = [];
  const dinhDang = dinhDangFile(tenFile);

  // Loại: tên file trước, rồi thư mục gần nhất ra ngoài
  let loai = timLoai(ten);
  for (let i = thuMuc.length - 1; !loai && i >= 0; i--) loai = timLoai(thuMuc[i]);

  // Môn: tên file trước, rồi thư mục
  let maMon = timMon(ten);
  for (let i = thuMuc.length - 1; !maMon && i >= 0; i--) maMon = timMon(thuMuc[i]);

  // Kì: so tên file với thư mục gần nhất có ghi kì
  const kyTenFile = timKy(ten);
  let kyThuMuc: KyMaTran | null = null;
  for (let i = thuMuc.length - 1; !kyThuMuc && i >= 0; i--) kyThuMuc = timKy(thuMuc[i]);
  let ky: KyMaTran | null = kyTenFile ?? kyThuMuc;
  if (kyTenFile && kyThuMuc && kyTenFile !== kyThuMuc) {
    canhBao.push(`Tên file ghi ${tenKy(kyTenFile)} nhưng nằm trong thư mục ${tenKy(kyThuMuc)}. Thầy chọn lại kì cho đúng.`);
    ky = null;
  }

  if (loai === 'CA_NAM') ky = null;
  if (dinhDang === 'DOC_CU') canhBao.push('File Word cũ (.doc). Mở file, chọn Lưu thành → Word Document (.docx) rồi tải lại.');
  if (dinhDang === 'KHAC') canhBao.push('Không phải file Word, bỏ qua.');
  if (dinhDang === 'DOCX') {
    if (!loai) canhBao.push('Chưa nhận ra loại ma trận.');
    if (!maMon) canhBao.push('Chưa nhận ra môn.');
    if (loai === 'CHUNG' && !ky && kyTenFile === kyThuMuc) canhBao.push('Chưa nhận ra kì kiểm tra.');
  }

  return { duongDan, tenFile, dinhDang, loai, maMon, ky, canhBao };
}

/** Khóa ô trong bảng: loại + môn (+ kì với ma trận chung). null khi chưa đủ thông tin. */
export function khoaO(f: { loai: LoaiMaTranTo | null; maMon: string | null; ky: KyMaTran | null }): string | null {
  if (!f.loai || !f.maMon) return null;
  if (f.loai === 'CHUNG') return f.ky ? `CHUNG/${f.maMon}/${f.ky}` : null;
  return `CA_NAM/${f.maMon}`;
}

/** Các ô có từ hai file trở lên trong cùng một lần tải: phải bỏ bớt trước khi lưu. */
export function oBiTrung<T extends { loai: LoaiMaTranTo | null; maMon: string | null; ky: KyMaTran | null; boQua?: boolean }>(ds: T[]): Set<string> {
  const dem = new Map<string, number>();
  for (const f of ds) {
    if (f.boQua) continue;
    const k = khoaO(f);
    if (k) dem.set(k, (dem.get(k) ?? 0) + 1);
  }
  return new Set([...dem].filter(([, n]) => n > 1).map(([k]) => k));
}
