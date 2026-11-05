/**
 * ThayKhaiEdu - Xử lý và kiểm định ma trận chung, ma trận riêng (mẫu tổ khối 4).
 *
 * Quy tắc: docs/mau-ma-tran/README-mau-ma-tran.md, mục 1 và mục 4.
 * - Lỗi bắt buộc sửa (errors) chặn chuyển bước.
 * - Cảnh báo chuyên môn (warnings) để giáo viên xem xét.
 *
 * Mọi hàm ở đây là hàm thuần, không đọc ghi cơ sở dữ liệu.
 */

import type {
  BaiKiemTraMaTran,
  CauHoiMaTran,
  DongMaTran,
  MaTranChung,
  MaTranRieng,
  MucDo,
  PhanMaTran,
} from '@/types/matrix-template';
import type { CognitiveLevel, MatrixSpecificationItem } from '@/types/curriculum';

// ---------------------------------------------------------------------------
// Duyệt cấu trúc
// ---------------------------------------------------------------------------

/** Mã nhóm lựa chọn → mã phương án. */
export type LuaChon = Record<string, string>;

export interface CauTrongMaTran {
  khoa: string;
  bai: BaiKiemTraMaTran;
  phan: PhanMaTran;
  dong: DongMaTran;
  cau: CauHoiMaTran;
}

export function khoaCau(bai: BaiKiemTraMaTran, phan: PhanMaTran, cau: CauHoiMaTran): string {
  return `${bai.ma}/${phan.ma}/${cau.cau}`;
}

/** Các dòng của một phần theo lựa chọn: dòng của phương án đã chọn đứng trước, rồi tới dòng dùng chung. */
export function dongCuaPhan(phan: PhanMaTran, luaChon: LuaChon): DongMaTran[] {
  if (!phan.lua_chon) return phan.dong;
  const ma = luaChon[phan.lua_chon.ma];
  const pa = phan.lua_chon.phuong_an.find((p) => p.ma === ma);
  return [...(pa ? pa.dong : []), ...phan.dong];
}

/** Mọi tổ hợp lựa chọn có thể có của ma trận chung (Tiếng Việt: 2 × 2 = 4 tổ hợp). */
export function toHopLuaChon(mtc: MaTranChung): LuaChon[] {
  let ketQua: LuaChon[] = [{}];
  for (const bai of mtc.bai_kiem_tra) {
    for (const phan of bai.phan) {
      if (!phan.lua_chon) continue;
      const nhom = phan.lua_chon;
      ketQua = ketQua.flatMap((lc) => nhom.phuong_an.map((pa) => ({ ...lc, [nhom.ma]: pa.ma })));
    }
  }
  return ketQua;
}

export function cacNhomLuaChon(mtc: MaTranChung) {
  return mtc.bai_kiem_tra.flatMap((b) => b.phan.flatMap((p) => (p.lua_chon ? [p.lua_chon] : [])));
}

/** Danh sách câu của ma trận theo một tổ hợp lựa chọn. */
export function danhSachCau(mtc: MaTranChung, luaChon: LuaChon = {}): CauTrongMaTran[] {
  const out: CauTrongMaTran[] = [];
  for (const bai of mtc.bai_kiem_tra) {
    for (const phan of bai.phan) {
      for (const dong of dongCuaPhan(phan, luaChon)) {
        for (const cau of dong.cau_hoi) {
          out.push({ khoa: khoaCau(bai, phan, cau), bai, phan, dong, cau });
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tổng hợp số liệu
// ---------------------------------------------------------------------------

export interface TongHop {
  tongDiem: number;
  soCau: number;
  soCauTN: number;
  soCauTL: number;
  diemTN: number;
  diemTL: number;
  diemTheoMuc: Record<MucDo, number>;
  soCauTheoMuc: Record<MucDo, number>;
  diemTheoMach: Record<string, number>;
}

const lamTron = (x: number) => Math.round(x * 100) / 100;

export function tongHop(cauList: CauTrongMaTran[]): TongHop {
  const t: TongHop = {
    tongDiem: 0, soCau: 0, soCauTN: 0, soCauTL: 0, diemTN: 0, diemTL: 0,
    diemTheoMuc: { 1: 0, 2: 0, 3: 0 }, soCauTheoMuc: { 1: 0, 2: 0, 3: 0 }, diemTheoMach: {},
  };
  for (const { dong, cau } of cauList) {
    t.tongDiem += cau.diem;
    t.soCau += cau.so_cau_tinh;
    if (cau.hinh_thuc === 'TN') { t.soCauTN += cau.so_cau_tinh; t.diemTN += cau.diem; }
    else { t.soCauTL += cau.so_cau_tinh; t.diemTL += cau.diem; }
    if (cau.muc in t.diemTheoMuc) {
      t.diemTheoMuc[cau.muc] += cau.diem;
      t.soCauTheoMuc[cau.muc] += cau.so_cau_tinh;
    }
    t.diemTheoMach[dong.mach] = (t.diemTheoMach[dong.mach] ?? 0) + cau.diem;
  }
  t.tongDiem = lamTron(t.tongDiem);
  t.diemTN = lamTron(t.diemTN);
  t.diemTL = lamTron(t.diemTL);
  for (const k of [1, 2, 3] as MucDo[]) t.diemTheoMuc[k] = lamTron(t.diemTheoMuc[k]);
  for (const k of Object.keys(t.diemTheoMach)) t.diemTheoMach[k] = lamTron(t.diemTheoMach[k]);
  return t;
}

/** Tổng hợp riêng phần câu hỏi (bỏ phần chấm theo tiêu chí và bài viết), dùng để so tỉ lệ mức. */
export function tongHopPhanCauHoi(mtc: MaTranChung, luaChon: LuaChon = {}): TongHop {
  return tongHop(danhSachCau(mtc, luaChon).filter((c) => (c.phan.kieu ?? 'CAU_HOI') === 'CAU_HOI'));
}

/** Điểm của một bài kiểm tra = điểm câu hỏi + điểm tiêu chí (Đọc thành tiếng). */
export function diemBaiKiemTra(bai: BaiKiemTraMaTran, luaChon: LuaChon): number {
  let s = 0;
  for (const phan of bai.phan) s += diemPhan(phan, luaChon);
  return lamTron(s);
}

export function diemPhan(phan: PhanMaTran, luaChon: LuaChon): number {
  let s = 0;
  for (const dong of dongCuaPhan(phan, luaChon)) {
    s += dong.tieu_chi_diem ?? 0;
    for (const c of dong.cau_hoi) s += c.diem;
  }
  return lamTron(s);
}

// ---------------------------------------------------------------------------
// Kiểm định
// ---------------------------------------------------------------------------

export interface KetQuaKiemDinh {
  hopLe: boolean;
  loi: string[];
  canhBao: string[];
}

const laBoiSo05 = (x: number) => Math.abs(x * 2 - Math.round(x * 2)) < 1e-9;
const fmt = (x: number) => String(lamTron(x)).replace('.', ',');

function moTaLuaChon(mtc: MaTranChung, lc: LuaChon): string {
  const ten: string[] = [];
  for (const nhom of cacNhomLuaChon(mtc)) {
    const pa = nhom.phuong_an.find((p) => p.ma === lc[nhom.ma]);
    if (pa) ten.push(pa.ma);
  }
  return ten.length ? ` (phương án ${ten.join(', ')})` : '';
}

/** Kiểm định cấu trúc dùng chung cho cả ma trận chung và ma trận riêng, theo một tổ hợp lựa chọn. */
function kiemDinhCauTruc(mtc: MaTranChung, lc: LuaChon, loi: string[], canhBao: string[]) {
  const nhan = moTaLuaChon(mtc, lc);

  for (const bai of mtc.bai_kiem_tra) {
    // 1. Tổng điểm từng bài kiểm tra
    const tong = diemBaiKiemTra(bai, lc);
    if (Math.abs(tong - bai.tong_diem) > 0.001) {
      loi.push(`${bai.ten}${nhan}: tổng điểm là ${fmt(tong)}, phải bằng ${fmt(bai.tong_diem)}.`);
    }

    for (const phan of bai.phan) {
      const tenPhan = phan.ten ?? bai.ten;
      if (phan.tong_diem !== undefined) {
        const dp = diemPhan(phan, lc);
        if (Math.abs(dp - phan.tong_diem) > 0.001) {
          loi.push(`${tenPhan}${nhan}: tổng điểm là ${fmt(dp)}, phải bằng ${fmt(phan.tong_diem)}.`);
        }
      }

      const soThuTu: number[] = [];
      for (const dong of dongCuaPhan(phan, lc)) {
        if (dong.tieu_chi_diem !== undefined && !laBoiSo05(dong.tieu_chi_diem)) {
          loi.push(`${tenPhan}: tiêu chí "${dong.yccd[0] ?? ''}" có điểm ${fmt(dong.tieu_chi_diem)}, không phải bội số của 0,5.`);
        }
        if (dong.cau_hoi.length > 0 && dong.yccd.filter((y) => y.trim()).length === 0) {
          loi.push(`${tenPhan}: dòng "${dong.noi_dung ?? dong.mach}" có câu hỏi nhưng chưa có YCCĐ.`);
        }
        for (const c of dong.cau_hoi) {
          const ten = `${tenPhan}, Câu ${c.cau}`;
          // 2. Bước điểm 0,5
          if (!(c.diem > 0) || !laBoiSo05(c.diem)) {
            loi.push(`${ten}: điểm ${fmt(c.diem)} không phải bội số của 0,5.`);
          }
          // 3. Chỉ Mức 1, 2, 3
          if (![1, 2, 3].includes(c.muc)) {
            loi.push(`${ten}: mức "${String(c.muc)}" không hợp lệ. Chỉ có Mức 1, Mức 2, Mức 3.`);
          }
          if (!Number.isInteger(c.so_cau_tinh) || c.so_cau_tinh <= 0) {
            loi.push(`${ten}: số câu tính phải là số nguyên dương.`);
          }
          if (c.y_nho && c.y_nho.length !== c.so_cau_tinh) {
            canhBao.push(`${ten}: có ${c.y_nho.length} ý nhỏ nhưng tính ${c.so_cau_tinh} câu.`);
          }
          if (c.y_nho && c.diem / c.y_nho.length < 0.5 - 1e-9) {
            canhBao.push(`${ten}: mỗi ý nhỏ dưới 0,5 điểm.`);
          }
          const n = Number(c.cau);
          if (Number.isInteger(n)) soThuTu.push(n);
        }
      }

      // 4. Số thứ tự câu liên tục từ 1, không trùng (bỏ qua phần bài viết)
      if ((phan.kieu ?? 'CAU_HOI') === 'CAU_HOI' && soThuTu.length > 0) {
        const sapXep = [...soThuTu].sort((a, b) => a - b);
        const trung = sapXep.filter((x, i) => i > 0 && x === sapXep[i - 1]);
        if (trung.length) loi.push(`${tenPhan}${nhan}: trùng số thứ tự câu ${[...new Set(trung)].join(', ')}.`);
        const thieu = sapXep.length ? Array.from({ length: sapXep[sapXep.length - 1] }, (_, i) => i + 1).filter((x) => !sapXep.includes(x)) : [];
        if (thieu.length) loi.push(`${tenPhan}${nhan}: thiếu Câu ${thieu.join(', ')} (số thứ tự câu phải liên tục từ 1).`);
      }
    }
  }

  // Cảnh báo tỉ lệ mức (chỉ phần câu hỏi), theo quy định của môn, không cố định 50 – 30 – 20
  const th = tongHopPhanCauHoi(mtc, lc);
  if (mtc.ti_le_muc_quy_dinh_doc_hieu) {
    const qd = mtc.ti_le_muc_quy_dinh_doc_hieu;
    for (const k of [1, 2, 3] as MucDo[]) {
      const muon = qd[String(k) as '1' | '2' | '3'];
      if (Math.abs(th.diemTheoMuc[k] - muon) > 0.001) {
        canhBao.push(`Mức ${k}${nhan}: ${fmt(th.diemTheoMuc[k])} điểm, quy định của tổ là ${fmt(muon)} điểm.`);
      }
    }
  } else if (mtc.ti_le_muc_quy_dinh && th.tongDiem > 0) {
    for (const k of [1, 2, 3] as MucDo[]) {
      const muon = mtc.ti_le_muc_quy_dinh[String(k) as '1' | '2' | '3'];
      const thuc = (th.diemTheoMuc[k] / th.tongDiem) * 100;
      if (Math.abs(thuc - muon) > 0.5) {
        canhBao.push(`Mức ${k}${nhan}: ${fmt(thuc)}%, quy định của tổ là ${muon}%.`);
      }
    }
  }
}

/** Kiểm định ma trận chung: kiểm mọi tổ hợp lựa chọn. */
export function kiemDinhMaTranChung(mtc: MaTranChung): KetQuaKiemDinh {
  const loi: string[] = [];
  const canhBao: string[] = [];
  for (const lc of toHopLuaChon(mtc)) kiemDinhCauTruc(mtc, lc, loi, canhBao);

  // Dòng YCCĐ chưa gắn câu: được phép ở ma trận chung, chỉ nhắc
  for (const bai of mtc.bai_kiem_tra) {
    for (const phan of bai.phan) {
      if ((phan.kieu ?? 'CAU_HOI') !== 'CAU_HOI') continue;
      const tatCaDong = [...phan.dong, ...(phan.lua_chon?.phuong_an.flatMap((p) => p.dong) ?? [])];
      for (const d of tatCaDong) {
        if (d.cau_hoi.length === 0 && d.tieu_chi_diem === undefined) {
          canhBao.push(`Dòng "${d.noi_dung ?? d.mach}" chưa gắn câu hỏi nào (ma trận riêng sẽ bỏ dòng này).`);
        }
      }
    }
  }
  const dsLoi = [...new Set(loi)];
  return { hopLe: dsLoi.length === 0, loi: dsLoi, canhBao: [...new Set(canhBao)] };
}

// ---------------------------------------------------------------------------
// Ma trận riêng
// ---------------------------------------------------------------------------

/** Câu bài viết đánh giá cả bài theo mọi YCCĐ của thể loại, không chọn một YCCĐ. */
const laCauBaiViet = (c: CauTrongMaTran) => c.cau.dang === 'VIET' || c.phan.kieu === 'VIET';

export function taoMaTranRiengRong(mtc: MaTranChung): MaTranRieng {
  return {
    loai: 'MA_TRAN_RIENG',
    ma_tran_chung_ma_mon: mtc.ma_mon,
    ma_tran_chung_ky: mtc.ky_kiem_tra,
    phien_ban_ma_tran_chung: mtc.phien_ban_mau,
    lua_chon_da_dung: {},
    cau_hoi: [],
    trang_thai: 'BAN_NHAP',
  };
}

export function kiemDinhMaTranRieng(mtc: MaTranChung, mtr: MaTranRieng): KetQuaKiemDinh {
  const loi: string[] = [];
  const canhBao: string[] = [];

  if (mtr.ma_tran_chung_ma_mon !== mtc.ma_mon || mtr.ma_tran_chung_ky !== mtc.ky_kiem_tra) {
    loi.push('Ma trận riêng không thuộc ma trận chung này (khác môn hoặc khác kì).');
  }
  if (mtr.phien_ban_ma_tran_chung !== mtc.phien_ban_mau) {
    loi.push(`Ma trận chung đã đổi từ phiên bản ${mtr.phien_ban_ma_tran_chung} sang ${mtc.phien_ban_mau}. Cần xem lại và xác nhận lại ma trận riêng.`);
  }

  // Phải chọn đủ phương án ở mọi nhóm
  for (const nhom of cacNhomLuaChon(mtc)) {
    const ma = mtr.lua_chon_da_dung[nhom.ma];
    if (!ma) loi.push(`Chưa chọn: ${nhom.ten}.`);
    else if (!nhom.phuong_an.some((p) => p.ma === ma)) loi.push(`${nhom.ten}: phương án "${ma}" không có trong ma trận chung.`);
  }

  // Cấu trúc (số câu, mức, điểm) lấy nguyên từ ma trận chung nên chỉ cần kiểm theo lựa chọn đã dùng
  kiemDinhCauTruc(mtc, mtr.lua_chon_da_dung, loi, canhBao);

  // Mỗi câu đúng một YCCĐ, thuộc dòng gốc
  const cauList = danhSachCau(mtc, mtr.lua_chon_da_dung);
  const daChon = new Map<string, string[]>();
  for (const c of mtr.cau_hoi) daChon.set(c.khoa, [...(daChon.get(c.khoa) ?? []), c.yccd]);
  const khoaHopLe = new Set(cauList.map((c) => c.khoa));

  for (const c of cauList) {
    if (laCauBaiViet(c)) continue;
    const ten = `${c.phan.ten ?? c.bai.ten}, Câu ${c.cau.cau}`;
    const chon = (daChon.get(c.khoa) ?? []).filter((y) => y.trim());
    if (chon.length === 0) loi.push(`${ten}: chưa chọn YCCĐ.`);
    else if (chon.length > 1) loi.push(`${ten}: chỉ được gắn một YCCĐ, đang có ${chon.length}.`);
    else if (!c.dong.yccd.includes(chon[0])) loi.push(`${ten}: YCCĐ đã chọn không thuộc dòng "${c.dong.noi_dung ?? c.dong.mach}" của ma trận chung.`);
  }
  for (const k of daChon.keys()) {
    if (!khoaHopLe.has(k)) loi.push(`Có YCCĐ gắn cho câu "${k}" không có trong ma trận theo phương án đã chọn.`);
  }

  const dsLoi = [...new Set(loi)];
  return { hopLe: dsLoi.length === 0, loi: dsLoi, canhBao: [...new Set(canhBao)] };
}

/**
 * Trạng thái sau khi kiểm định. Không tự chuyển sang DA_XAC_NHAN:
 * giáo viên phải bấm xác nhận (Phụ lục 1.1, mục 2.4).
 */
export function trangThaiSauKiemDinh(mtr: MaTranRieng, kq: KetQuaKiemDinh): MaTranRieng['trang_thai'] {
  if (mtr.trang_thai === 'DA_XAC_NHAN' || mtr.trang_thai === 'CAN_XAC_NHAN_LAI') {
    return kq.hopLe ? mtr.trang_thai : 'CO_LOI';
  }
  return kq.hopLe ? 'CAN_KIEM_TRA' : 'CO_LOI';
}

/** Gọi khi giáo viên sửa ma trận riêng: nếu đã xác nhận thì chuyển sang cần xác nhận lại. */
export function trangThaiSauKhiSua(mtr: MaTranRieng): MaTranRieng['trang_thai'] {
  return mtr.trang_thai === 'DA_XAC_NHAN' || mtr.trang_thai === 'CAN_XAC_NHAN_LAI' ? 'CAN_XAC_NHAN_LAI' : 'BAN_NHAP';
}

/**
 * Dựng ma trận riêng để trình bày: cùng cấu trúc ma trận chung nhưng
 * - chỉ giữ phương án đã chọn (nhóm lựa chọn được thay bằng các dòng của phương án),
 * - mỗi dòng chỉ còn YCCĐ đã gắn cho câu của dòng đó,
 * - bỏ dòng không có câu hỏi (giữ dòng tiêu chí chấm của Đọc thành tiếng).
 */
export function dungMaTranRieng(mtc: MaTranChung, mtr: MaTranRieng): MaTranChung {
  const chon = new Map(mtr.cau_hoi.map((c) => [c.khoa, c.yccd]));
  return {
    ...mtc,
    tieu_de: mtc.tieu_de.replace('MA TRẬN CHUNG', 'MA TRẬN'),
    bai_kiem_tra: mtc.bai_kiem_tra.map((bai) => ({
      ...bai,
      phan: bai.phan.flatMap((phan): PhanMaTran[] => {
        const dong = dongCuaPhan(phan, mtr.lua_chon_da_dung)
          .filter((d) => d.cau_hoi.length > 0 || d.tieu_chi_diem !== undefined)
          .map((d) => {
            if (d.cau_hoi.length === 0) return d;
            const yc = d.cau_hoi.map((c) => {
              const ct = { cau: c, phan, bai, dong: d, khoa: khoaCau(bai, phan, c) };
              return laCauBaiViet(ct) ? null : chon.get(ct.khoa) ?? null;
            });
            const giuNguyen = yc.every((y) => y === null);
            return { ...d, yccd: giuNguyen ? d.yccd : [...new Set(yc.filter((y): y is string => !!y))] };
          });
        if (dong.length === 0) return [];
        return [{ ...phan, lua_chon: undefined, dong }];
      }),
    })),
  };
}

// ---------------------------------------------------------------------------
// Tương thích với kiểu cũ (src/types/curriculum.ts)
// ---------------------------------------------------------------------------

const MUC_SANG_LEVEL: Record<MucDo, CognitiveLevel> = { 1: 'LEVEL_1', 2: 'LEVEL_2', 3: 'LEVEL_3' };

function loaiCauCu(c: CauHoiMaTran): MatrixSpecificationItem['questionType'] {
  switch (c.dang) {
    case 'DS': return 'TRUE_FALSE';
    case 'NOI': return 'MATCHING';
    case 'TLN':
    case 'DIEN': return 'SHORT_ANSWER';
    case 'VIET': return 'ESSAY';
    default: return c.hinh_thuc === 'TN' ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER';
  }
}

/** Chuyển ma trận riêng sang danh sách MatrixSpecificationItem cũ (mỗi câu một dòng). */
export function toLegacyMatrixItems(mtc: MaTranChung, mtr: MaTranRieng, matrixId: string): MatrixSpecificationItem[] {
  const chon = new Map(mtr.cau_hoi.map((c) => [c.khoa, c.yccd]));
  return danhSachCau(mtc, mtr.lua_chon_da_dung)
    .filter((c) => (c.phan.kieu ?? 'CAU_HOI') === 'CAU_HOI')
    .map((c) => {
      const tong = c.bai.tong_diem || 10;
      return {
        id: `${matrixId}:${c.khoa}`,
        matrixId,
        yccdId: chon.get(c.khoa) ?? c.dong.yccd[0] ?? '',
        topicName: c.dong.mach,
        cognitiveLevel: MUC_SANG_LEVEL[c.cau.muc],
        questionType: loaiCauCu(c.cau),
        questionCount: c.cau.so_cau_tinh,
        pointsPerQuestion: c.cau.diem / c.cau.so_cau_tinh,
        totalPoints: c.cau.diem,
        percentageWeight: lamTron((c.cau.diem / tong) * 100),
      };
    });
}
