/**
 * ThayKhaiEdu - Dựng khung ma trận từ chương trình (khi tổ chưa có ma trận chung).
 *
 * Luồng: phạm vi tuần trong PPCT → các bài, số tiết → ghép YCCĐ đã duyệt (AI gợi ý, giáo viên sửa)
 * → chia số câu theo số tiết, chia điểm theo tỉ lệ mức giáo viên nhập → khung MaTranChung.
 *
 * Quy tắc:
 * - Hàm ở đây thuần túy, không gọi AI, không đọc cơ sở dữ liệu.
 * - Không áp một tỉ lệ M1/M2/M3 cố định: tỉ lệ do giáo viên nhập (bước 5%, vì mỗi câu tối thiểu 0,5 điểm).
 * - Khung chỉ là bản nháp. Giáo viên sửa rồi xác nhận ở các bước sau của quy trình.
 */

import type { CauHoiMaTran, DongMaTran, HinhThucCau, MaTranChung, MucDo } from '@/types/matrix-template';

export interface TietPpct {
  thuTu: number;
  tuan: number | null;
  chuDe: string | null;
  baiTen: string | null;
}

/** Một chủ đề (hoặc nhóm bài) trong phạm vi kiểm tra. */
export interface NhomBai {
  /** Khóa ổn định để ghép YCCĐ: số thứ tự đầu tiên của nhóm trong PPCT. */
  id: string;
  chuDe: string;
  bai: string[];
  soTiet: number;
  tuanDau: number;
  tuanCuoi: number;
}

const chuoiSach = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** "Chủ đề 3:Số có nhiều chữ số" → "Chủ đề 3: Số có nhiều chữ số" (PPCT nhập tay hay thiếu cách). */
export function lamSachTenChuDe(s: string): string {
  return chuoiSach(s).replace(/^(Chủ đề\s*\d+)\s*[:.]\s*/i, '$1: ');
}

/**
 * Gom các tiết có tuần trong [tuanTu, tuanDen] thành nhóm theo chủ đề, giữ thứ tự PPCT.
 * Tiết không có tuần bị bỏ (không biết có nằm trong phạm vi hay không).
 */
export function nhomBaiTrongPhamVi(tiet: TietPpct[], tuanTu: number, tuanDen: number): NhomBai[] {
  const trongPhamVi = tiet
    .filter((t) => t.tuan !== null && t.tuan >= tuanTu && t.tuan <= tuanDen)
    .sort((a, b) => a.thuTu - b.thuTu);
  const kq: NhomBai[] = [];
  for (const t of trongPhamVi) {
    const chuDe = lamSachTenChuDe(t.chuDe ?? '') || 'Chưa rõ chủ đề';
    const bai = chuoiSach(t.baiTen);
    let nhom = kq.find((n) => n.chuDe === chuDe);
    if (!nhom) {
      nhom = { id: String(t.thuTu), chuDe, bai: [], soTiet: 0, tuanDau: t.tuan!, tuanCuoi: t.tuan! };
      kq.push(nhom);
    }
    if (bai && !nhom.bai.includes(bai)) nhom.bai.push(bai);
    nhom.soTiet += 1;
    nhom.tuanDau = Math.min(nhom.tuanDau, t.tuan!);
    nhom.tuanCuoi = Math.max(nhom.tuanCuoi, t.tuan!);
  }
  return kq;
}

/** Tên ngắn của nhóm bài trong ô "nội dung": "Bài 1–6" hoặc liệt kê khi ít. */
export function tenNoiDungNhom(bai: string[]): string | null {
  if (bai.length === 0) return null;
  if (bai.length <= 2) return bai.join('; ');
  return `${bai[0]} … ${bai[bai.length - 1]} (${bai.length} bài)`;
}

// ---------------------------------------------------------------------------
// Ghép YCCĐ cho nhóm bài (kết quả AI) – kiểm tra, không tin AI
// ---------------------------------------------------------------------------

export interface YccdRutGon {
  id: string;
  noiDung: string;
  mach: string | null;
}

/** Lời nhắc cho AI: chỉ được chọn id trong danh sách, không được viết YCCĐ mới. */
export const HE_THONG_GAN_YCCD =
  'Bạn là chuyên gia chương trình giáo dục phổ thông 2018 bậc tiểu học. Nhiệm vụ: với một chủ đề của sách giáo khoa, chọn trong DANH SÁCH YCCĐ cho sẵn những yêu cầu cần đạt mà các bài của chủ đề đó dạy. ' +
  'Chỉ chọn theo id trong danh sách. Không viết thêm, không sửa chữ, không bịa id. Không chắc thì bỏ, không chọn bừa. ' +
  'Chỉ trả về một mảng JSON các id, ví dụ ["a1","b2"]. Không giải thích.';

export function loiNhacGanYccd(p: { mon: string; lop: number; chuDe: string; bai: string[]; yccd: YccdRutGon[] }): string {
  const ds = p.yccd.map((y) => `- ${y.id} | ${y.mach ?? ''} | ${y.noiDung}`).join('\n');
  return [
    `Môn ${p.mon}, lớp ${p.lop}, sách Kết nối tri thức với cuộc sống.`,
    `Chủ đề: ${p.chuDe}`,
    `Các bài: ${p.bai.join('; ')}`,
    '',
    'DANH SÁCH YCCĐ (id | mạch | nội dung):',
    ds,
    '',
    'Trả về mảng JSON id của các YCCĐ thuộc chủ đề và các bài trên.',
  ].join('\n');
}

/** Đọc mảng id AI trả về; chỉ giữ id có trong danh sách, bỏ trùng. Sai dạng thì trả null. */
export function docGanYccd(traLoi: string, idHopLe: Set<string>): string[] | null {
  const t = traLoi.replace(/```(?:json)?/gi, '').trim();
  const dau = t.indexOf('[');
  const cuoi = t.lastIndexOf(']');
  if (dau < 0 || cuoi <= dau) return null;
  try {
    const arr = JSON.parse(t.slice(dau, cuoi + 1)) as unknown;
    if (!Array.isArray(arr)) return null;
    const kq: string[] = [];
    for (const x of arr) {
      const id = typeof x === 'string' ? x.trim() : '';
      if (id && idHopLe.has(id) && !kq.includes(id)) kq.push(id);
    }
    return kq;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Chia số câu và điểm
// ---------------------------------------------------------------------------

/** Chia `tong` đơn vị theo trọng số bằng phương pháp phần dư lớn nhất. Tổng luôn bằng `tong`. */
export function chiaTheoTrongSo(trongSo: number[], tong: number): number[] {
  const t = trongSo.reduce((a, b) => a + b, 0);
  if (trongSo.length === 0) return [];
  if (t <= 0) {
    const co = Math.floor(tong / trongSo.length);
    const du = tong - co * trongSo.length;
    return trongSo.map((_, i) => co + (i < du ? 1 : 0));
  }
  const thuc = trongSo.map((w) => (w / t) * tong);
  const nguyen = thuc.map(Math.floor);
  let con = tong - nguyen.reduce((a, b) => a + b, 0);
  const thuTuDu = thuc.map((x, i) => ({ i, du: x - Math.floor(x) })).sort((a, b) => b.du - a.du || a.i - b.i);
  for (const { i } of thuTuDu) {
    if (con <= 0) break;
    nguyen[i] += 1;
    con -= 1;
  }
  return nguyen;
}

export interface TiLeMuc {
  m1: number;
  m2: number;
  m3: number;
}

/** Đổi phần trăm sang số "nửa điểm" (đơn vị 0,5 điểm) trên tổng 10 điểm = 20 đơn vị. */
export function donViTheoMuc(tiLe: TiLeMuc): [number, number, number] | null {
  const { m1, m2, m3 } = tiLe;
  if ([m1, m2, m3].some((x) => !Number.isFinite(x) || x < 0)) return null;
  if (Math.abs(m1 + m2 + m3 - 100) > 0.001) return null;
  const u = [m1, m2, m3].map((x) => (x / 100) * 20);
  if (u.some((x) => Math.abs(x - Math.round(x)) > 1e-6)) return null; // phải là bội số của 5%
  return [Math.round(u[0]), Math.round(u[1]), Math.round(u[2])];
}

export interface DongNguon {
  mach: string;
  noiDung: string | null;
  yccd: string[];
  soTiet: number;
}

export interface ThamSoDung {
  maMon: string;
  tenMon: string;
  lop: string;
  nam_hoc: string;
  ky: MaTranChung['ky_kiem_tra'];
  tieuDeKy: string;
  thoiGianPhut: number | null;
  truong: MaTranChung['truong'];
  soCau: number;
  tiLeMuc: TiLeMuc;
  dong: DongNguon[];
  /** Ghi chú về phạm vi để hiện trong "Vấn đề cần xác nhận". */
  ghiChuPhamVi?: string;
}

export interface KetQuaDung {
  maTran: MaTranChung | null;
  loi: string[];
  canhBao: string[];
}

/**
 * Dựng khung ma trận một bài kiểm tra 10 điểm, bố cục BAI_MUC_TN_TL.
 * - Số câu mỗi dòng tỉ lệ số tiết; dòng chưa có YCCĐ không được gắn câu.
 * - Điểm mỗi câu là bội số của 0,5; tổng điểm đúng 10; tổng điểm theo mức đúng tỉ lệ nhập.
 * - Hình thức gợi ý: Mức 1 → TN, Mức 3 → TL, Mức 2 xen kẽ. Giáo viên sửa được ở bước lập ma trận riêng.
 */
export function dungMaTranTuChuongTrinh(p: ThamSoDung): KetQuaDung {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const don = donViTheoMuc(p.tiLeMuc);
  if (!don) {
    loi.push('Tỉ lệ ba mức phải cộng đủ 100% và mỗi mức là bội số của 5% (vì mỗi câu ít nhất 0,5 điểm).');
  }
  if (!Number.isInteger(p.soCau) || p.soCau < 3 || p.soCau > 20) {
    loi.push('Số câu phải từ 3 đến 20 (mỗi câu ít nhất 0,5 điểm, tổng 10 điểm).');
  }
  const dongCoYccd = p.dong.filter((d) => d.yccd.length > 0 && d.soTiet > 0);
  for (const d of p.dong) {
    if (d.yccd.length === 0) canhBao.push(`"${d.mach}" chưa có YCCĐ nào được ghép nên khung không gắn câu vào dòng này.`);
  }
  if (dongCoYccd.length === 0) loi.push('Chưa có dòng nào được ghép YCCĐ. Ghép YCCĐ cho ít nhất một chủ đề.');
  if (loi.length || !don) return { maTran: null, loi, canhBao };

  // 1. Số câu mỗi mức theo số đơn vị điểm: mức có điểm thì ít nhất 1 câu, không quá số đơn vị
  const mucCoDiem = ([1, 2, 3] as MucDo[]).filter((m) => don[m - 1] > 0);
  if (p.soCau < mucCoDiem.length) {
    return { maTran: null, loi: [`Cần ít nhất ${mucCoDiem.length} câu để có đủ các mức đã chọn.`], canhBao };
  }
  const cauMoiMuc: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const m of mucCoDiem) cauMoiMuc[m] = 1;
  let conLai = p.soCau - mucCoDiem.length;
  while (conLai > 0) {
    // Thêm câu cho mức đang có nhiều đơn vị điểm trên mỗi câu nhất, chưa vượt số đơn vị
    const ungVien = mucCoDiem.filter((m) => cauMoiMuc[m] < don[m - 1]).sort((a, b) => don[b - 1] / cauMoiMuc[b] - don[a - 1] / cauMoiMuc[a]);
    if (ungVien.length === 0) break;
    cauMoiMuc[ungVien[0]] += 1;
    conLai -= 1;
  }
  if (conLai > 0) {
    return { maTran: null, loi: [`Với tỉ lệ mức này chỉ chia được tối đa ${p.soCau - conLai} câu (mỗi câu ít nhất 0,5 điểm). Giảm số câu hoặc đổi tỉ lệ.`], canhBao };
  }

  // 2. Điểm từng câu trong mỗi mức: chia đều theo đơn vị 0,5
  const diemCauTheoMuc: Record<number, number[]> = { 1: [], 2: [], 3: [] };
  for (const m of mucCoDiem) {
    const phanDon = chiaTheoTrongSo(Array(cauMoiMuc[m]).fill(1), don[m - 1]);
    diemCauTheoMuc[m] = phanDon.map((u) => u / 2).sort((a, b) => b - a);
  }

  // 3. Số câu mỗi dòng theo số tiết
  const cauMoiDong = chiaTheoTrongSo(dongCoYccd.map((d) => d.soTiet), p.soCau);
  const cauDong = dongCoYccd.map((d, i) => ({ d, so: cauMoiDong[i] })).filter((x) => x.so > 0);
  if (cauDong.length < dongCoYccd.length) {
    const bo = dongCoYccd.filter((d) => !cauDong.some((x) => x.d === d)).map((d) => `"${d.mach}"`).join(', ');
    canhBao.push(`Với ${p.soCau} câu, các dòng ít tiết nhất chưa có câu: ${bo}. Tăng số câu nếu muốn đủ mọi chủ đề.`);
  }

  // 4. Gán mức cho từng ô câu: dòng nhiều tiết nhận mức cao trước, mỗi lượt một câu cho mỗi dòng
  const oCau: { dong: number; muc: MucDo | null }[] = [];
  cauDong.forEach((x, di) => { for (let k = 0; k < x.so; k++) oCau.push({ dong: di, muc: null }); });
  const thuTuDong = cauDong.map((x, di) => ({ di, so: x.d.soTiet })).sort((a, b) => b.so - a.so || a.di - b.di).map((x) => x.di);
  for (const muc of [3, 2] as MucDo[]) {
    let can = cauMoiMuc[muc];
    while (can > 0) {
      let giao = false;
      for (const di of thuTuDong) {
        if (can <= 0) break;
        const o = oCau.find((c) => c.dong === di && c.muc === null);
        if (o) { o.muc = muc; can -= 1; giao = true; }
      }
      if (!giao) {
        const o = oCau.find((c) => c.muc === null);
        if (!o) break;
        o.muc = muc; can -= 1;
      }
    }
  }
  for (const o of oCau) if (o.muc === null) o.muc = 1;

  // 5. Hình thức: M1 → TN, M3 → TL, M2 xen kẽ TN/TL
  let luotM2 = 0;
  const hinhThucCua = (m: MucDo): HinhThucCau => {
    if (m === 1) return 'TN';
    if (m === 3) return 'TL';
    luotM2 += 1;
    return luotM2 % 2 === 1 ? 'TN' : 'TL';
  };

  // 6. Dựng dòng ma trận, đánh số câu liên tục theo thứ tự PPCT
  const kho: Record<number, number[]> = { 1: [...diemCauTheoMuc[1]], 2: [...diemCauTheoMuc[2]], 3: [...diemCauTheoMuc[3]] };
  let stt = 0;
  const dongMaTran: DongMaTran[] = cauDong.map((x, di) => {
    const cauHoi: CauHoiMaTran[] = oCau
      .filter((o) => o.dong === di)
      .sort((a, b) => (a.muc as number) - (b.muc as number))
      .map((o) => {
        const muc = o.muc as MucDo;
        const diem = kho[muc].shift() ?? 0.5;
        stt += 1;
        const hinh = hinhThucCua(muc);
        return { cau: String(stt), y_nho: null, so_cau_tinh: 1, muc, hinh_thuc: hinh, dang: hinh === 'TN' ? 'NLC' : null, diem };
      });
    return { mach: x.d.mach, noi_dung: x.d.noiDung, yccd: x.d.yccd, cau_hoi: cauHoi, so_tiet: x.d.soTiet };
  });

  // 7. Kiểm lại: tổng điểm mỗi mức và tổng
  const tong = dongMaTran.flatMap((d) => d.cau_hoi).reduce((s, c) => s + c.diem, 0);
  if (Math.abs(tong - 10) > 0.001) {
    return { maTran: null, loi: [`Tổng điểm dựng được là ${tong}, không đủ 10. Báo lại để sửa.`], canhBao };
  }

  const maTran: MaTranChung = {
    phien_ban_mau: 'DUNG_TU_CHUONG_TRINH',
    loai: 'MA_TRAN_CHUNG',
    lop: p.lop,
    ky_kiem_tra: p.ky,
    nam_hoc: p.nam_hoc,
    truong: p.truong,
    mon: p.tenMon,
    ma_mon: p.maMon,
    bo_cuc: 'BAI_MUC_TN_TL',
    tieu_de: `KHUNG MA TRẬN DỰNG TỪ CHƯƠNG TRÌNH – ${p.tieuDeKy}`,
    thoi_gian_phut: p.thoiGianPhut,
    ngay_ky: 'ngày … tháng … năm …',
    chu_ky: [],
    bai_kiem_tra: [{ ma: 'chinh', ten: `Bài kiểm tra ${p.tenMon}`, tong_diem: 10, phan: [{ ma: 'p1', ten: null, dong: dongMaTran }] }],
    ti_le_muc_quy_dinh: { '1': p.tiLeMuc.m1, '2': p.tiLeMuc.m2, '3': p.tiLeMuc.m3 },
    van_de_can_xac_nhan: [
      'Khung này do ứng dụng dựng từ phân phối chương trình và YCCĐ đã duyệt, chưa phải ma trận chung của tổ.',
      'Số câu mỗi chủ đề chia theo số tiết trong PPCT; mức và hình thức câu là gợi ý, giáo viên chỉnh ở bước lập ma trận riêng.',
      ...(p.ghiChuPhamVi ? [p.ghiChuPhamVi] : []),
    ],
  };
  return { maTran, loi, canhBao };
}
