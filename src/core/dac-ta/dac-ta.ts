/**
 * ThayKhaiEdu - Bản đặc tả (bước 3 của quy trình tạo đề).
 *
 * Đặc tả kế thừa ma trận riêng ĐÃ XÁC NHẬN: mỗi câu một dòng, gồm YCCĐ, mức, hình thức, dạng câu, điểm
 * (lấy từ ma trận, không sửa ở đây) và bài, tuần trong phân phối chương trình, trang SGK (giáo viên điền).
 * Quy trình: Tạo đặc tả → Xem trước → Kiểm tra → Chỉnh sửa → Xác nhận → Tạo đề.
 *
 * Mọi hàm ở đây là hàm thuần, không đọc ghi cơ sở dữ liệu.
 * Ứng dụng không tự đoán bài, tuần, trang SGK: chỉ gợi ý khi có dữ liệu khớp trong Kho chương trình / PPCT,
 * và gợi ý luôn để giáo viên xem lại.
 */

import type { DangCau, HinhThucCau, KyKiemTra, MaTranChung, MaTranRieng, MucDo } from '@/types/matrix-template';
import { apDungSuaCau, danhSachCau, laCauBaiViet } from '@/core/matrix/matrix-template';

export type TrangThaiDacTa = 'BAN_NHAP' | 'CAN_KIEM_TRA' | 'CO_LOI' | 'DA_XAC_NHAN' | 'CAN_XAC_NHAN_LAI';

/** Phần giáo viên điền (không lấy từ ma trận). Giữ nguyên khi dựng lại đặc tả. */
/** Hình đi kèm câu mà giáo viên yêu cầu từ bước đặc tả, để bước tạo đề dàn trang đúng ngay từ đầu. */
export type KieuHinhKem = 'KHONG' | 'MINH_HOA' | 'PHUONG_AN' | 'SO_DO' | 'BIEU_DO' | 'BANG' | 'TIA_SO';
export const TEN_KIEU_HINH: Record<KieuHinhKem, string> = {
  KHONG: 'Không cần hình',
  MINH_HOA: 'Hình minh họa cho đề bài',
  PHUONG_AN: 'Hình cho từng phương án A, B, C, D',
  SO_DO: 'Sơ đồ',
  BIEU_DO: 'Biểu đồ',
  BANG: 'Bảng số liệu',
  TIA_SO: 'Tia số',
};

export interface MinhChungCau {
  baiHoc: string;
  tuan: number | null;
  /** Ví dụ "tr. 45" hoặc "tr. 45–46". Để trống nếu chưa đối chiếu. */
  trangSgk: string;
  ghiChu: string;
  /** Hình kèm theo yêu cầu cho câu này (đặc tả cũ chưa có: coi như không cần). */
  hinhKem?: KieuHinhKem;
  /** Mô tả ngắn hình cần có, ví dụ "4 góc nhọn, vuông, tù, bẹt". */
  moTaHinh?: string;
}

export interface DongDacTa extends MinhChungCau {
  /** Khóa câu trong ma trận riêng, ví dụ "doc/doc_hieu/6". */
  khoa: string;
  baiKiemTra: string;
  phan: string | null;
  mach: string;
  noiDung: string | null;
  cau: string;
  yNho: string[] | null;
  soCauTinh: number;
  muc: MucDo;
  hinhThuc: HinhThucCau;
  dang: DangCau | null;
  diem: number;
  yccd: string;
}

export interface DacTa {
  loai: 'DAC_TA';
  ma_mon: string;
  ky_kiem_tra: KyKiemTra;
  /** Phiên bản ma trận riêng đã xác nhận mà đặc tả này kế thừa. */
  phien_ban_ma_tran_rieng: number;
  /** Tuần kiểm tra: bài dạy sau tuần này là chưa học. Không có thì bỏ qua kiểm tra đó. */
  tuan_kiem_tra: number | null;
  dong: DongDacTa[];
}

export interface KetQuaKiemDinhDacTa {
  hopLe: boolean;
  loi: string[];
  canhBao: string[];
}

const lamTron = (x: number) => Math.round(x * 100) / 100;
const chuanHoa = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

export const MINH_CHUNG_RONG: MinhChungCau = { baiHoc: '', tuan: null, trangSgk: '', ghiChu: '' };

// ---------------------------------------------------------------------------
// Dựng đặc tả
// ---------------------------------------------------------------------------

/** Gợi ý bài, tuần cho một câu (từ Kho chương trình và PPCT). Chỉ là gợi ý. */
export type GoiYMinhChung = Partial<Pick<MinhChungCau, 'baiHoc' | 'tuan'>>;

interface TuyChonDung {
  tuanKiemTra?: number | null;
  /** Gợi ý theo YCCĐ (chuẩn hóa chữ thường). Chỉ điền vào ô còn trống. */
  goiYTheoYccd?: Map<string, GoiYMinhChung>;
  /** PPCT của môn: dùng khi YCCĐ không có gợi ý, tìm bài theo "Bài N" ghi trong nội dung câu. */
  tiet?: TietGoiY[];
  /** Giữ phần giáo viên đã điền (theo khóa câu) khi dựng lại sau khi ma trận đổi. */
  minhChungCu?: Record<string, MinhChungCau>;
}

/** Các câu của ma trận riêng, đã áp chỗ giáo viên sửa và phương án đã chọn, theo đúng thứ tự trình bày. */
function cauHieuLuc(mtcGoc: MaTranChung, mtr: MaTranRieng) {
  return danhSachCau(apDungSuaCau(mtcGoc, mtr.sua_cau), mtr.lua_chon_da_dung);
}

function yccdCuaCau(mtr: MaTranRieng, c: ReturnType<typeof cauHieuLuc>[number]): string {
  const chon = mtr.cau_hoi.find((x) => x.khoa === c.khoa)?.yccd?.trim();
  if (chon) return chon;
  // Bài viết không chọn YCCĐ riêng: lấy các YCCĐ của dòng chứa câu
  return laCauBaiViet(c) ? c.dong.yccd.join('; ') : '';
}

export function taoDacTa(mtcGoc: MaTranChung, mtr: MaTranRieng, phienBanMaTranRieng: number, tuyChon: TuyChonDung = {}): DacTa {
  const dong: DongDacTa[] = cauHieuLuc(mtcGoc, mtr).map((c) => {
    const yccd = yccdCuaCau(mtr, c);
    const cu = tuyChon.minhChungCu?.[c.khoa];
    const goiY = tuyChon.goiYTheoYccd?.get(chuanHoa(yccd)) ?? goiYTheoBaiPpct(c.dong.noi_dung ?? c.dong.mach, tuyChon.tiet);
    return {
      khoa: c.khoa,
      baiKiemTra: c.bai.ten,
      phan: c.phan.ten,
      mach: c.dong.mach,
      noiDung: c.dong.noi_dung,
      cau: c.cau.cau,
      yNho: c.cau.y_nho,
      soCauTinh: c.cau.so_cau_tinh,
      muc: c.cau.muc,
      hinhThuc: c.cau.hinh_thuc,
      dang: c.cau.dang,
      diem: c.cau.diem,
      yccd,
      baiHoc: cu?.baiHoc || goiY?.baiHoc || '',
      tuan: cu?.tuan ?? goiY?.tuan ?? null,
      trangSgk: cu?.trangSgk ?? '',
      ghiChu: cu?.ghiChu ?? '',
      hinhKem: cu?.hinhKem ?? 'KHONG',
      moTaHinh: cu?.moTaHinh ?? '',
    };
  });
  return {
    loai: 'DAC_TA',
    ma_mon: mtr.ma_tran_chung_ma_mon,
    ky_kiem_tra: mtr.ma_tran_chung_ky,
    phien_ban_ma_tran_rieng: phienBanMaTranRieng,
    tuan_kiem_tra: tuyChon.tuanKiemTra ?? null,
    dong,
  };
}

/** Lấy phần giáo viên đã điền ra khỏi một đặc tả, để dựng lại mà không mất. */
export function layMinhChung(d: DacTa): Record<string, MinhChungCau> {
  return Object.fromEntries(d.dong.map((r) => [r.khoa, { baiHoc: r.baiHoc, tuan: r.tuan, trangSgk: r.trangSgk, ghiChu: r.ghiChu, hinhKem: r.hinhKem ?? 'KHONG', moTaHinh: r.moTaHinh ?? '' }]));
}

/**
 * Dựng lại đặc tả khi ma trận riêng có phiên bản mới: số liệu lấy lại từ ma trận,
 * phần giáo viên đã điền được giữ theo khóa câu. Câu mới thì để trống, câu bị bỏ thì mất dòng (và được báo lại).
 */
export function dungLaiDacTa(mtcGoc: MaTranChung, mtr: MaTranRieng, phienBanMoi: number, cu: DacTa): { dacTa: DacTa; moi: string[]; bo: string[] } {
  const dacTa = taoDacTa(mtcGoc, mtr, phienBanMoi, { tuanKiemTra: cu.tuan_kiem_tra, minhChungCu: layMinhChung(cu) });
  const khoaCu = new Set(cu.dong.map((r) => r.khoa));
  const khoaMoi = new Set(dacTa.dong.map((r) => r.khoa));
  return {
    dacTa,
    moi: dacTa.dong.filter((r) => !khoaCu.has(r.khoa)).map((r) => `${r.baiKiemTra}, Câu ${r.cau}`),
    bo: cu.dong.filter((r) => !khoaMoi.has(r.khoa)).map((r) => `${r.baiKiemTra}, Câu ${r.cau}`),
  };
}

// ---------------------------------------------------------------------------
// Kiểm định
// ---------------------------------------------------------------------------

const tenDong = (r: DongDacTa) => `${r.phan ?? r.baiKiemTra}, Câu ${r.cau}`;

export interface TuyChonKiemDinhDacTa {
  /** Kho SGK đã duyệt thì bắt buộc có trang SGK; chưa thì chỉ cảnh báo. */
  batBuocTrangSgk?: boolean;
  /** Phiên bản mới nhất đã xác nhận của ma trận riêng, để biết đặc tả có cũ không. */
  phienBanMaTranRiengMoiNhat?: number;
}

/**
 * Đặc tả phải thống nhất với ma trận riêng về mạch, YCCĐ, mức, hình thức, số câu, điểm (mục 6 của dự án),
 * và mỗi câu phải có bài, tuần đã học theo PPCT.
 */
export function kiemDinhDacTa(mtcGoc: MaTranChung, mtr: MaTranRieng, d: DacTa, tuyChon: TuyChonKiemDinhDacTa = {}): KetQuaKiemDinhDacTa {
  const loi: string[] = [];
  const canhBao: string[] = [];

  if (mtr.trang_thai !== 'DA_XAC_NHAN') loi.push('Ma trận riêng chưa được xác nhận. Chỉ lập đặc tả từ ma trận đã xác nhận.');
  if (d.ma_mon !== mtr.ma_tran_chung_ma_mon || d.ky_kiem_tra !== mtr.ma_tran_chung_ky) loi.push('Đặc tả không thuộc ma trận này (khác môn hoặc khác kì).');
  if (tuyChon.phienBanMaTranRiengMoiNhat !== undefined && d.phien_ban_ma_tran_rieng < tuyChon.phienBanMaTranRiengMoiNhat) {
    loi.push(`Ma trận riêng đã có phiên bản ${tuyChon.phienBanMaTranRiengMoiNhat} (đặc tả đang theo phiên bản ${d.phien_ban_ma_tran_rieng}). Cần dựng lại đặc tả và xác nhận lại.`);
  }

  // 1. Khớp ma trận từng câu
  const cauMa = cauHieuLuc(mtcGoc, mtr);
  const dongTheoKhoa = new Map(d.dong.map((r) => [r.khoa, r]));
  const khoaMa = new Set(cauMa.map((c) => c.khoa));
  for (const c of cauMa) {
    const r = dongTheoKhoa.get(c.khoa);
    const ten = `${c.phan.ten ?? c.bai.ten}, Câu ${c.cau.cau}`;
    if (!r) { loi.push(`${ten}: có trong ma trận nhưng chưa có trong đặc tả.`); continue; }
    const yccd = yccdCuaCau(mtr, c);
    const khac: string[] = [];
    if (r.cau !== c.cau.cau) khac.push(`số câu ${r.cau} ≠ ${c.cau.cau}`);
    if (r.muc !== c.cau.muc) khac.push(`Mức ${r.muc} ≠ Mức ${c.cau.muc}`);
    if (r.hinhThuc !== c.cau.hinh_thuc) khac.push(`${r.hinhThuc} ≠ ${c.cau.hinh_thuc}`);
    if ((r.dang ?? null) !== (c.cau.dang ?? null)) khac.push('dạng câu khác ma trận');
    if (Math.abs(r.diem - c.cau.diem) > 1e-9) khac.push(`${r.diem} điểm ≠ ${c.cau.diem} điểm`);
    if (r.soCauTinh !== c.cau.so_cau_tinh) khac.push(`số câu tính ${r.soCauTinh} ≠ ${c.cau.so_cau_tinh}`);
    if (r.mach !== c.dong.mach) khac.push('mạch kiến thức khác ma trận');
    if (r.yccd !== yccd) khac.push('YCCĐ khác ma trận');
    if (khac.length) loi.push(`${ten} không khớp ma trận riêng: ${khac.join('; ')}.`);
  }
  for (const r of d.dong) if (!khoaMa.has(r.khoa)) loi.push(`${tenDong(r)}: có trong đặc tả nhưng không còn trong ma trận riêng.`);

  // 2. Tổng điểm
  const diemMa = lamTron(cauMa.reduce((s, c) => s + c.cau.diem, 0));
  const diemDt = lamTron(d.dong.reduce((s, r) => s + r.diem, 0));
  if (Math.abs(diemMa - diemDt) > 1e-9) loi.push(`Tổng điểm đặc tả ${diemDt} khác tổng điểm ma trận ${diemMa}.`);

  // 3. Minh chứng từng câu
  for (const r of xepDongTheoCau(d.dong)) {
    if (!r.baiHoc.trim()) loi.push(`${tenDong(r)}: chưa ghi bài học trong phân phối chương trình.`);
    if (r.tuan === null || r.tuan === undefined) loi.push(`${tenDong(r)}: chưa ghi tuần học trong phân phối chương trình.`);
    else if (!Number.isInteger(r.tuan) || r.tuan < 1 || r.tuan > 40) loi.push(`${tenDong(r)}: tuần ${r.tuan} không hợp lệ (từ 1 đến 40).`);
    else if (d.tuan_kiem_tra !== null && r.tuan > d.tuan_kiem_tra) {
      loi.push(`${tenDong(r)}: nội dung dạy ở tuần ${r.tuan}, sau tuần kiểm tra (tuần ${d.tuan_kiem_tra}). Học sinh chưa được học.`);
    }
    if (!r.trangSgk.trim()) {
      (tuyChon.batBuocTrangSgk ? loi : canhBao).push(`${tenDong(r)}: chưa ghi trang SGK.`);
    }
  }

  // 4. Một câu – một YCCĐ: không để hai câu trùng một YCCĐ khi YCCĐ khác của cùng dòng bị bỏ trống
  const dung = new Map<string, number>();
  for (const r of d.dong) if (r.yccd) dung.set(chuanHoa(r.yccd), (dung.get(chuanHoa(r.yccd)) ?? 0) + 1);
  const dongMa = new Set<string>();
  for (const c of cauMa) {
    const k = `${c.bai.ma}|${c.phan.ma}|${c.dong.mach}|${c.dong.noi_dung ?? ''}`;
    if (dongMa.has(k) || c.dong.yccd.length < 2 || laCauBaiViet(c)) continue;
    dongMa.add(k);
    const bo = c.dong.yccd.filter((y) => !dung.has(chuanHoa(y)));
    const trung = c.dong.yccd.filter((y) => (dung.get(chuanHoa(y)) ?? 0) > 1);
    if (bo.length && trung.length) canhBao.push(`Mạch "${c.dong.mach}": YCCĐ "${trung[0]}" được dùng cho nhiều câu trong khi "${bo[0]}" chưa có câu nào.`);
  }

  const dsLoi = [...new Set(loi)];
  return { hopLe: dsLoi.length === 0, loi: dsLoi, canhBao: [...new Set(canhBao)] };
}

/** Trạng thái sau kiểm định. Không tự sang DA_XAC_NHAN: giáo viên phải bấm xác nhận. */
export function trangThaiDacTaSauKiemDinh(hienTai: TrangThaiDacTa, kq: KetQuaKiemDinhDacTa): TrangThaiDacTa {
  if (hienTai === 'DA_XAC_NHAN' || hienTai === 'CAN_XAC_NHAN_LAI') return kq.hopLe ? hienTai : 'CO_LOI';
  return kq.hopLe ? 'CAN_KIEM_TRA' : 'CO_LOI';
}

/** Gọi khi sửa đặc tả: đã xác nhận thì phải xác nhận lại. */
export function trangThaiDacTaSauKhiSua(hienTai: TrangThaiDacTa): TrangThaiDacTa {
  return hienTai === 'DA_XAC_NHAN' || hienTai === 'CAN_XAC_NHAN_LAI' ? 'CAN_XAC_NHAN_LAI' : 'BAN_NHAP';
}

// ---------------------------------------------------------------------------
// Gợi ý bài, tuần (chỉ khi có dữ liệu khớp)
// ---------------------------------------------------------------------------

export interface TietGoiY { tuan: number | null; baiTen: string | null }
export interface YccdGoiY { noiDung: string; bai: string | null }

/**
 * Với mỗi YCCĐ trong Kho chương trình có ghi bài: gợi ý bài đó và tuần đầu tiên của bài trong PPCT.
 * Không khớp đúng chữ thì không gợi ý (không đoán).
 */
export function taoGoiYTheoYccd(yccdKho: YccdGoiY[], tiet: TietGoiY[]): Map<string, GoiYMinhChung> {
  const tuanTheoBai = new Map<string, number>();
  for (const t of tiet) {
    if (!t.baiTen || t.tuan === null) continue;
    const k = chuanHoa(t.baiTen);
    tuanTheoBai.set(k, Math.min(tuanTheoBai.get(k) ?? Infinity, t.tuan));
  }
  const kq = new Map<string, GoiYMinhChung>();
  for (const y of yccdKho) {
    if (!y.bai?.trim()) continue;
    kq.set(chuanHoa(y.noiDung), { baiHoc: y.bai.trim(), tuan: tuanTheoBai.get(chuanHoa(y.bai)) ?? undefined });
  }
  return kq;
}

/** Một dòng mục lục SGK: trang đầu của một phần (Đọc, Viết…) trong một bài. */
export interface MucLucSgk { baiSo: number; tuan: number | null; hoatDong: string; noiDung: string; trang: number }

const boKhoangTrang = (s: string) => chuanHoa(s).replace(/\s+/g, '');

/**
 * Thầy chọn một bài trong danh sách PPCT thì lấy luôn tuần (tuần đầu của bài) và trang SGK (trang đầu của bài, theo mục lục).
 * Chỉ trả về khi khớp đúng một bài trong PPCT; trang chỉ có khi mục lục SGK của môn đã được nhập.
 * Ô nhập một dòng làm mất dấu xuống dòng trong tên bài, nên so sánh bỏ hết khoảng trắng.
 */
export function minhChungTuBai(baiHoc: string, tiet: TietGoiY[] | undefined, mucLuc: MucLucSgk[] | undefined): { baiHoc: string; tuan?: number; trangSgk?: string } | undefined {
  const khoa = boKhoangTrang(baiHoc ?? '');
  if (!khoa || !tiet?.length) return undefined;
  const khop = tiet.filter((t) => t.baiTen && boKhoangTrang(t.baiTen) === khoa);
  if (!khop.length) return undefined;
  const tuan = khop.map((t) => t.tuan).filter((x): x is number => x !== null);
  const n = soBai(khop[0].baiTen);
  const trang = n && mucLuc?.length ? mucLuc.filter((m) => String(m.baiSo) === n).map((m) => m.trang) : [];
  return {
    baiHoc: khop[0].baiTen!.replace(/\s+/g, ' ').trim(),
    tuan: tuan.length ? Math.min(...tuan) : undefined,
    trangSgk: trang.length ? `tr. ${Math.min(...trang)}` : undefined,
  };
}

const soBai = (s: string | null | undefined) => /(?:^|[^\p{L}\d])bài\s*(\d+)\b/iu.exec(s ?? '')?.[1];

/**
 * Tìm bài trong PPCT theo số bài ghi ở đầu nội dung câu, ví dụ "Bài 4. Thiên nhiên vùng Trung du…".
 * Chỉ gợi ý khi PPCT có đúng bài mang số đó; không có thì để trống (không đoán).
 */
export function goiYTheoBaiPpct(noiDung: string | null | undefined, tiet: TietGoiY[] | undefined): GoiYMinhChung | undefined {
  const n = soBai(noiDung);
  if (!n || !tiet?.length) return undefined;
  const khop = tiet.filter((t) => t.baiTen && soBai(t.baiTen) === n);
  if (!khop.length) return undefined;
  const tuan = khop.map((t) => t.tuan).filter((x): x is number => x !== null);
  return { baiHoc: khop[0].baiTen!.trim(), tuan: tuan.length ? Math.min(...tuan) : undefined };
}

/** Điền lại bài, tuần từ PPCT vào các ô còn trống. Ô thầy đã điền thì giữ nguyên. */
export function dienLaiTuPpct(d: DacTa, goiYTheoYccd: Map<string, GoiYMinhChung>, tiet: TietGoiY[], mucLuc: MucLucSgk[] = []): { dacTa: DacTa; soDong: number } {
  let soDong = 0;
  const dong = d.dong.map((r) => {
    const g = goiYTheoYccd.get(chuanHoa(r.yccd)) ?? goiYTheoBaiPpct(r.noiDung ?? r.mach, tiet);
    const baiHoc = r.baiHoc || g?.baiHoc || '';
    const tuan = r.tuan ?? g?.tuan ?? null;
    // Có bài rồi (thầy chọn hoặc gợi ý) mà còn thiếu tuần, trang thì tra thêm trong PPCT và mục lục SGK
    const them = baiHoc ? minhChungTuBai(baiHoc, tiet, mucLuc) : undefined;
    const tuanCuoi = tuan ?? them?.tuan ?? null;
    const trangSgk = r.trangSgk || them?.trangSgk || '';
    if (baiHoc === r.baiHoc && tuanCuoi === r.tuan && trangSgk === (r.trangSgk ?? '')) return r;
    soDong++;
    return { ...r, baiHoc, tuan: tuanCuoi, trangSgk };
  });
  return { dacTa: { ...d, dong }, soDong };
}

/** Thứ tự câu trong đề: số câu tăng dần, câu không đánh số (bài viết) để cuối. */
export function xepDongTheoCau<T extends { cau: string }>(ds: T[]): T[] {
  const so = (x: string) => (/^\d+$/.test(x) ? Number(x) : Number.POSITIVE_INFINITY);
  return ds.map((r, i) => ({ r, i })).sort((a, b) => so(a.r.cau) - so(b.r.cau) || a.i - b.i).map((x) => x.r);
}
