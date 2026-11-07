/**
 * ThayKhaiEdu - Đề kiểm tra (bước 4 của quy trình tạo đề).
 *
 * Đề kế thừa bản đặc tả ĐÃ XÁC NHẬN: mỗi dòng đặc tả có đúng một câu trong đề, gồm đề bài, các lựa chọn,
 * đáp án và hướng dẫn chấm. Mức, hình thức, dạng câu, điểm lấy từ đặc tả, không sửa ở đây.
 *
 * Mọi hàm ở đây là hàm thuần, không đọc ghi cơ sở dữ liệu. Ứng dụng không tự bịa đề bài hay đáp án:
 * câu nào chưa có nội dung thì để trống và báo thiếu khi kiểm định.
 */

import type { DangCau, HinhThucCau, KyKiemTra, MucDo } from '@/types/matrix-template';
import { xepDongTheoCau, type DacTa } from '@/core/dac-ta/dac-ta';
import { kiemDinhTiengViet, taoNoiDungTiengVietRong, type NoiDungTiengViet } from '@/core/de/tieng-viet';
import type { KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';

export type TrangThaiDe = 'BAN_NHAP' | 'CAN_KIEM_TRA' | 'CO_LOI' | 'SAN_SANG_DUYET' | 'CAN_KIEM_TRA_LAI' | 'DA_DUYET' | 'TRA_LAI';

/** Trạng thái chỉ đặt qua thao tác duyệt, không cho trình duyệt tự gửi lên khi lưu. */
export const TRANG_THAI_CHI_DO_DUYET: TrangThaiDe[] = ['DA_DUYET', 'TRA_LAI'];

export const NHAN_LUA_CHON = ['A', 'B', 'C', 'D'] as const;

/** Phần giáo viên (hoặc AI) điền cho một câu. Giữ nguyên khi dựng lại đề. */
export interface NoiDungCau {
  deBai: string;
  /** Trắc nghiệm nhiều lựa chọn: đúng 4 phương án A–D. Đúng sai: mỗi ý một dòng. Dạng khác để trống. */
  luaChon: string[];
  /** NLC: "A".."D". Đúng sai: chuỗi Đ/S theo thứ tự ý, ví dụ "ĐSĐS". Dạng khác: đáp án viết ra. */
  dapAn: string;
  huongDanCham: string;
  /** Mô tả hình, bảng, bài đọc đi kèm (để dàn trang). */
  ghiChuHinh: string;
}

export interface CauDe extends NoiDungCau {
  khoa: string;
  cau: string;
  yNho: string[] | null;
  muc: MucDo;
  hinhThuc: HinhThucCau;
  dang: DangCau | null;
  diem: number;
  yccd: string;
}

export interface DeKiemTra {
  loai: 'DE';
  ma_mon: string;
  ky_kiem_tra: KyKiemTra;
  /** Phiên bản đặc tả đã xác nhận mà đề này kế thừa. */
  phien_ban_dac_ta: number;
  cau: CauDe[];
  /** Chỉ có ở đề Tiếng Việt: bài đọc hiểu và bốn bài đọc thành tiếng. */
  tiengViet?: NoiDungTiengViet;
}

export interface KetQuaKiemDinhDe {
  hopLe: boolean;
  loi: string[];
  canhBao: string[];
}

const lamTron = (x: number) => Math.round(x * 100) / 100;
const chuanHoa = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

export const NOI_DUNG_RONG: NoiDungCau = { deBai: '', luaChon: [], dapAn: '', huongDanCham: '', ghiChuHinh: '' };

export function nhanCau(c: Pick<CauDe, 'cau'>): string {
  return /^\d+$/.test(c.cau) ? `Câu ${c.cau}` : c.cau;
}

// ---------------------------------------------------------------------------
// Dựng đề
// ---------------------------------------------------------------------------

function luaChonMau(dang: DangCau | null, yNho: string[] | null): string[] {
  if (dang === 'NLC') return ['', '', '', ''];
  if (dang === 'DS') return (yNho ?? ['a', 'b', 'c', 'd']).map(() => '');
  return [];
}

/** Mỗi dòng đặc tả thành một câu trống của đề. Phần nội dung để trống, không tự đoán. */
export function taoDeTuDacTa(dacTa: DacTa, phienBanDacTa: number, noiDungCu: Record<string, NoiDungCau> = {}, tiengVietCu?: NoiDungTiengViet): DeKiemTra {
  return {
    ...(dacTa.ma_mon === 'TIENG_VIET' ? { tiengViet: tiengVietCu ?? taoNoiDungTiengVietRong() } : {}),
    loai: 'DE',
    ma_mon: dacTa.ma_mon,
    ky_kiem_tra: dacTa.ky_kiem_tra,
    phien_ban_dac_ta: phienBanDacTa,
    cau: xepDongTheoCau(dacTa.dong).map((r) => ({
      khoa: r.khoa,
      cau: r.cau,
      yNho: r.yNho,
      muc: r.muc,
      hinhThuc: r.hinhThuc,
      dang: r.dang,
      diem: r.diem,
      yccd: r.yccd,
      ...(noiDungCu[r.khoa] ?? { ...NOI_DUNG_RONG, luaChon: luaChonMau(r.dang, r.yNho) }),
    })),
  };
}

/**
 * Số dòng chấm chừa cho câu tự luận (cả đề in và bản xem trước dùng chung).
 * Bài viết: 18 dòng. Toán cần nhiều chỗ hơn (đặt tính, lời giải, đáp số); đề bài có "đặt tính" thì chừa ít nhất 6 dòng.
 */
export function soDongTraLoi(c: Pick<CauDe, 'dang' | 'diem' | 'deBai'>, maMon: string): number {
  if (c.dang === 'VIET') return 18;
  const toan = maMon === 'TOAN';
  const goc = toan ? Math.ceil(c.diem * 5) + 1 : Math.ceil(c.diem * 4) + 1;
  let n = Math.max(3, Math.min(toan ? 10 : 8, goc));
  if (/đặt tính|giải bài toán|bài giải|lời giải/i.test(c.deBai)) n = Math.max(n, 6);
  return n;
}

/** Đáp án viết ra để in: NLC kèm nội dung phương án, Đúng/Sai theo từng ý. */
export function dapAnHienThi(c: CauDe): string {
  if (c.dang === 'NLC') {
    const n = c.dapAn.trim().toUpperCase();
    const i = (NHAN_LUA_CHON as readonly string[]).indexOf(n);
    return i >= 0 && c.luaChon[i]?.trim() ? `${n}. ${c.luaChon[i]}` : n;
  }
  if (c.dang === 'DS') return Array.from(c.dapAn.replace(/[\s,;]/g, '').toUpperCase()).map((k, i) => `${(c.yNho ?? [])[i] ?? String.fromCharCode(97 + i)}) ${k === 'Đ' ? 'Đúng' : 'Sai'}`).join('; ');
  return c.dapAn;
}

export function layNoiDung(d: DeKiemTra): Record<string, NoiDungCau> {
  const kq: Record<string, NoiDungCau> = {};
  for (const c of d.cau) kq[c.khoa] = { deBai: c.deBai, luaChon: c.luaChon, dapAn: c.dapAn, huongDanCham: c.huongDanCham, ghiChuHinh: c.ghiChuHinh };
  return kq;
}

/** Dựng lại đề khi đặc tả đổi: giữ nội dung các câu còn nguyên khóa, báo câu mới và câu bị bỏ. */
export function dungLaiDe(dacTaMoi: DacTa, phienBanMoi: number, cu: DeKiemTra): { de: DeKiemTra; moi: string[]; bo: string[] } {
  const noiDungCu = layNoiDung(cu);
  const de = taoDeTuDacTa(dacTaMoi, phienBanMoi, noiDungCu, cu.tiengViet);
  const khoaMoi = new Set(dacTaMoi.dong.map((r) => r.khoa));
  const moi = dacTaMoi.dong.filter((r) => !noiDungCu[r.khoa]).map((r) => r.khoa);
  const bo = cu.cau.filter((c) => !khoaMoi.has(c.khoa)).map((c) => c.khoa);
  return { de, moi, bo };
}

// ---------------------------------------------------------------------------
// Tiến độ và kiểm định
// ---------------------------------------------------------------------------

/** Một câu coi là xong khi có đề bài, đáp án (hoặc hướng dẫn chấm với bài viết) và lựa chọn đủ. */
export function cauDaXong(c: CauDe): boolean {
  return kiemDinhMotCau(c).length === 0;
}

export function tienDoDe(d: DeKiemTra): { xong: number; tong: number } {
  return { xong: d.cau.filter(cauDaXong).length, tong: d.cau.length };
}

function kiemDinhMotCau(c: CauDe): string[] {
  const loi: string[] = [];
  const t = nhanCau(c);
  if (!c.deBai.trim()) loi.push(`${t}: chưa có đề bài.`);

  if (c.dang === 'NLC') {
    if (c.luaChon.length !== 4 || c.luaChon.some((x) => !x.trim())) loi.push(`${t}: cần đủ 4 phương án A, B, C, D.`);
    else if (new Set(c.luaChon.map(chuanHoa)).size < 4) loi.push(`${t}: có phương án trùng nhau.`);
    if (!(NHAN_LUA_CHON as readonly string[]).includes(c.dapAn.trim().toUpperCase())) loi.push(`${t}: đáp án phải là A, B, C hoặc D.`);
  } else if (c.dang === 'DS') {
    const soY = c.yNho?.length ?? c.luaChon.length;
    if (c.luaChon.length !== soY || c.luaChon.some((x) => !x.trim())) loi.push(`${t}: cần nội dung đủ ${soY} ý để chọn Đúng/Sai.`);
    const kyTu = Array.from(c.dapAn.replace(/[\s,;]/g, '').toUpperCase());
    if (kyTu.length !== soY || kyTu.some((k) => k !== 'Đ' && k !== 'S')) loi.push(`${t}: đáp án cần ${soY} ký tự Đ hoặc S, ví dụ "ĐSĐS".`);
  } else if (c.dang === 'VIET') {
    if (!c.huongDanCham.trim()) loi.push(`${t}: bài viết cần hướng dẫn chấm (các ý cho điểm).`);
  } else {
    if (!c.dapAn.trim()) loi.push(`${t}: chưa có đáp án.`);
    // Trắc nghiệm chưa rõ dạng (nối, điền, chọn…): lựa chọn là tùy chọn, nhưng đã nhập thì phải đủ để chọn
    const coChu = c.luaChon.filter((x) => x.trim());
    if (c.hinhThuc === 'TN' && coChu.length === 1) loi.push(`${t}: có lựa chọn nhưng mới nhập một phương án.`);
  }

  if (c.hinhThuc === 'TL' && c.dang !== 'VIET' && !c.huongDanCham.trim() && c.diem > 0.5) {
    loi.push(`${t}: câu ${String(c.diem).replace(".", ",")} điểm cần hướng dẫn chấm chia điểm.`);
  }
  return loi;
}

export interface TuyChonKiemDinhDe {
  /** Số phiên bản đặc tả đã xác nhận mới nhất, để báo khi đề kế thừa bản cũ. */
  phienBanDacTaMoiNhat?: number;
}

/** Kiểm định đề với đặc tả mà nó kế thừa: khớp từng câu, từng điểm, nội dung và đáp án đầy đủ, không trùng câu. */
export function kiemDinhDe(dacTa: DacTa, de: DeKiemTra, tuyChon: TuyChonKiemDinhDe = {}): KetQuaKiemDinhDe {
  const loi: string[] = [];
  const canhBao: string[] = [];

  if (de.ma_mon !== dacTa.ma_mon || de.ky_kiem_tra !== dacTa.ky_kiem_tra) loi.push('Đề không cùng môn hoặc kì với đặc tả.');
  if (tuyChon.phienBanDacTaMoiNhat != null && de.phien_ban_dac_ta < tuyChon.phienBanDacTaMoiNhat) {
    loi.push(`Đề đang kế thừa đặc tả phiên bản ${de.phien_ban_dac_ta}, đã có phiên bản ${tuyChon.phienBanDacTaMoiNhat} mới hơn. Hãy cập nhật đề theo đặc tả mới.`);
  }

  const theoKhoa = new Map(de.cau.map((c) => [c.khoa, c]));
  if (theoKhoa.size !== de.cau.length) loi.push('Đề có câu bị trùng khóa.');

  for (const r of xepDongTheoCau(dacTa.dong)) {
    const c = theoKhoa.get(r.khoa);
    const t = r.cau && /^\d+$/.test(r.cau) ? `Câu ${r.cau}` : r.cau;
    if (!c) {
      loi.push(`${t}: có trong đặc tả nhưng chưa có trong đề.`);
      continue;
    }
    if (c.muc !== r.muc || c.hinhThuc !== r.hinhThuc || c.dang !== r.dang || lamTron(c.diem) !== lamTron(r.diem)) {
      loi.push(`${t}: mức, hình thức, dạng câu hoặc điểm không khớp đặc tả.`);
    }
  }
  const khoaDacTa = new Set(dacTa.dong.map((r) => r.khoa));
  for (const c of xepDongTheoCau(de.cau)) if (!khoaDacTa.has(c.khoa)) loi.push(`${nhanCau(c)}: không có trong đặc tả.`);

  const tong = lamTron(de.cau.reduce((s, c) => s + c.diem, 0));
  if (tong !== 10) loi.push(`Tổng điểm của đề là ${tong}, cần đúng 10.`);

  for (const c of xepDongTheoCau(de.cau)) loi.push(...kiemDinhMotCau(c));

  if (dacTa.ma_mon === 'TIENG_VIET') {
    const tv = kiemDinhTiengViet(dacTa.ky_kiem_tra as KyKiemTraBaiDoc, de.tiengViet);
    loi.push(...tv.loi);
    canhBao.push(...tv.canhBao);
  }

  // Câu trùng đề bài
  const daGap = new Map<string, string>();
  for (const c of xepDongTheoCau(de.cau)) {
    const k = chuanHoa(c.deBai);
    if (k.length < 10) continue;
    const truoc = daGap.get(k);
    if (truoc) loi.push(`${nhanCau(c)} trùng đề bài với ${truoc}.`);
    else daGap.set(k, nhanCau(c));
  }

  for (const c of xepDongTheoCau(de.cau)) {
    if (c.hinhThuc === 'TL' && c.dang !== 'VIET' && c.diem >= 1 && c.huongDanCham.trim() && !/điểm|\d\s*đ\b/i.test(c.huongDanCham)) {
      canhBao.push(`${nhanCau(c)}: hướng dẫn chấm chưa ghi điểm từng ý (nên chia ${String(c.diem).replace('.', ',')} điểm theo các bước làm).`);
    }
  }

  for (const c of xepDongTheoCau(de.cau)) {
    if (/hình|bảng|biểu đồ|sơ đồ/i.test(c.deBai) && !c.ghiChuHinh.trim()) {
      canhBao.push(`${nhanCau(c)}: đề bài nhắc đến hình hoặc bảng nhưng chưa ghi mô tả để dàn trang.`);
    }
  }

  return { hopLe: loi.length === 0, loi, canhBao };
}

export function trangThaiDeSauKiemDinh(hienTai: TrangThaiDe, kq: KetQuaKiemDinhDe): TrangThaiDe {
  if (hienTai === 'SAN_SANG_DUYET' || hienTai === 'DA_DUYET') return hienTai;
  return kq.hopLe ? 'CAN_KIEM_TRA' : 'CO_LOI';
}

/** Sửa nội dung đề sau khi đã sẵn sàng duyệt thì phải kiểm tra lại. */
export function trangThaiDeSauKhiSua(hienTai: TrangThaiDe): TrangThaiDe {
  return hienTai === 'SAN_SANG_DUYET' || hienTai === 'DA_DUYET' ? 'CAN_KIEM_TRA_LAI' : 'BAN_NHAP';
}
