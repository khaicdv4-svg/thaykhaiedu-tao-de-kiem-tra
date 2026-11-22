/**
 * Liên kết ma trận chung → ma trận riêng → đặc tả.
 *
 * Tổ trưởng (và quản trị) bấm Lưu là app tự kiểm tra; không có lỗi thì tự xác nhận và cập nhật luôn bước sau.
 * Bước nào còn lỗi thì giữ bản nháp ở bước đó (trạng thái "Cần xác nhận lại"), báo lỗi và dừng.
 * Tổ phó, giáo viên vẫn lưu nháp và chờ xác nhận như cũ.
 * Không đụng tới đề kiểm tra đã tạo: đề vẫn gắn với phiên bản đặc tả cũ.
 */
import { chuyenMaTranRiengSangBanMoi, ganSanYccdDuyNhat, kiemDinhMaTranChung } from '@/core/matrix/matrix-template';
import { dienLaiTuPpct, dungLaiDacTa, taoGoiYTheoYccd, type DacTa, type TrangThaiDacTa } from '@/core/dac-ta/dac-ta';
import { maTranChungTuKho } from './kho-ma-tran.repository';
import { dsMucLucSgk, dsTietPpct, dsYccd } from './chuong-trinh.repository';
import {
  layDacTa,
  layMaTranRieng,
  layNguoiDung,
  luuNhapDacTa,
  luuNhapMaTranRieng,
  xacNhanDacTa,
  xacNhanMaTranRieng,
  type DuLieuMaTranRieng,
} from './ma-tran-dac-ta.repository';

export const VAI_TRO_TU_XAC_NHAN = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

export interface BuocLienKet {
  buoc: 'MA_TRAN_RIENG' | 'DAC_TA';
  ok: boolean;
  thongBao: string;
}

const thongDiep = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function duocTuXacNhan(): Promise<boolean> {
  try {
    const { role } = await layNguoiDung();
    return VAI_TRO_TU_XAC_NHAN.includes(role);
  } catch {
    return false;
  }
}

/** Ma trận chung của môn, kì vừa được xác nhận: chuyển ma trận riêng sang bản mới, rồi tới đặc tả. */
export async function capNhatSauMaTranChung(maMon: string, ky: string): Promise<BuocLienKet[]> {
  const kho = await maTranChungTuKho(maMon, ky);
  if (!kho.mtc) return [];
  const { banNhap, moiNhat } = await layMaTranRieng(maMon, ky);
  // Bản nháp giữ chỗ thầy cô đang sửa dở; sau khi xác nhận thì bản nháp trùng bản đã xác nhận
  const goc = banNhap ?? moiNhat;
  if (!goc) return [];
  if (JSON.stringify(goc.duLieu.ma_tran_chung) === JSON.stringify(kho.mtc)) {
    // Ma trận riêng đã theo đúng bản này; vẫn kiểm tra đặc tả
    return capNhatSauMaTranRieng(maMon, ky);
  }

  const { mtr, bo } = chuyenMaTranRiengSangBanMoi(kho.mtc, goc.duLieu.ma_tran_rieng);
  const mtrMoi = ganSanYccdDuyNhat(kho.mtc, mtr);
  const duLieu: DuLieuMaTranRieng = { ma_tran_chung: kho.mtc, ma_tran_rieng: mtrMoi };
  const ghiChuBo = bo ? ` ${bo} chỗ chọn YCCĐ không còn hợp với ma trận chung mới nên đã bỏ.` : '';
  try {
    const kq = await xacNhanMaTranRieng(maMon, ky, duLieu);
    const buoc: BuocLienKet = {
      buoc: 'MA_TRAN_RIENG',
      ok: true,
      thongBao: `Ma trận riêng đã tự cập nhật theo ma trận chung bản ${kho.phienBan} và xác nhận thành phiên bản ${kq.ban.phienBan}.${ghiChuBo}`,
    };
    return [buoc, ...(await capNhatSauMaTranRieng(maMon, ky))];
  } catch (e) {
    await luuNhapMaTranRieng(maMon, ky, { ...duLieu, ma_tran_rieng: { ...mtrMoi, trang_thai: 'CAN_XAC_NHAN_LAI' } }).catch(() => undefined);
    return [{
      buoc: 'MA_TRAN_RIENG',
      ok: false,
      thongBao: `Ma trận riêng đã chuyển sang ma trận chung bản ${kho.phienBan} nhưng còn chỗ cần thầy cô xử lí nên chưa tự xác nhận: ${thongDiep(e).replace(/^Ma trận riêng còn lỗi, chưa xác nhận được: /, '')}.${ghiChuBo} Vào bước 2 sửa rồi bấm Lưu.`,
    }];
  }
}

/** Ma trận riêng vừa có phiên bản mới: dựng lại đặc tả (giữ bài, tuần, trang đã điền), điền thêm từ PPCT, rồi tự xác nhận. */
export async function capNhatSauMaTranRieng(maMon: string, ky: string): Promise<BuocLienKet[]> {
  const { moiNhat: mtrBan } = await layMaTranRieng(maMon, ky);
  if (!mtrBan || mtrBan.phienBan === null) return [];
  const { banNhap, moiNhat } = await layDacTa(maMon, ky);
  const goc = banNhap ?? moiNhat;
  if (!goc) return [];
  if (goc.maTranRiengId === mtrBan.id && goc.phienBanMaTranRieng === mtrBan.phienBan) return [];

  const { ma_tran_chung: mtc, ma_tran_rieng: mtr } = mtrBan.duLieu;
  const kq = dungLaiDacTa(mtc, mtr, mtrBan.phienBan, goc.duLieu);
  let dacTa: DacTa = kq.dacTa;
  try {
    const lop = Number(mtc.lop.replace(/\D/g, '')) || 4;
    const [tiet, yccd, mucLuc] = await Promise.all([
      dsTietPpct(maMon, lop),
      dsYccd({ mon: maMon, lop, trangThai: 'DA_DUYET' }),
      dsMucLucSgk(maMon, lop),
    ]);
    dacTa = dienLaiTuPpct(dacTa, taoGoiYTheoYccd(yccd, tiet), tiet, mucLuc).dacTa;
  } catch {
    // Chưa có PPCT hoặc mục lục thì để ô trống cho thầy cô điền
  }
  const them = `${kq.moi.length ? ` Câu mới: ${kq.moi.join('; ')}.` : ''}${kq.doi.length ? ` Câu đổi YCCĐ, đã điền lại bài, trang: ${kq.doi.join('; ')}.` : ''}`;
  try {
    const xn = await xacNhanDacTa(maMon, ky, mtrBan.id, dacTa);
    return [{ buoc: 'DAC_TA', ok: true, thongBao: `Đặc tả đã tự cập nhật theo ma trận riêng phiên bản ${mtrBan.phienBan} và xác nhận thành phiên bản ${xn.ban.phienBan}.${them}` }];
  } catch (e) {
    const trangThai: TrangThaiDacTa = 'CAN_XAC_NHAN_LAI';
    await luuNhapDacTa(maMon, ky, mtrBan.id, dacTa, trangThai).catch(() => undefined);
    return [{
      buoc: 'DAC_TA',
      ok: false,
      thongBao: `Đặc tả đã chuyển sang ma trận riêng phiên bản ${mtrBan.phienBan}, giữ bài, tuần, trang đã điền, nhưng chưa tự xác nhận: ${thongDiep(e).replace(/^Đặc tả còn lỗi, chưa xác nhận được: /, '')}.${them} Vào bước 3 điền nốt rồi bấm Lưu.`,
    }];
  }
}

/** Lưu ma trận riêng: tổ trưởng thì tự kiểm tra, xác nhận và cập nhật đặc tả; người khác lưu nháp. */
export async function luuMaTranRiengTuDong(maMon: string, ky: string, d: DuLieuMaTranRieng) {
  if (!(await duocTuXacNhan())) {
    return { daXacNhan: false, ban: await luuNhapMaTranRieng(maMon, ky, d), lienKet: [] as BuocLienKet[] };
  }
  const kqChung = kiemDinhMaTranChung(d.ma_tran_chung);
  if (kqChung.hopLe) {
    try {
      const xn = await xacNhanMaTranRieng(maMon, ky, d);
      return { daXacNhan: true, ban: xn.ban, taoPhienBanMoi: xn.taoPhienBanMoi, lienKet: await capNhatSauMaTranRieng(maMon, ky) };
    } catch (e) {
      const ban = await luuNhapMaTranRieng(maMon, ky, d);
      return { daXacNhan: false, ban, loiXacNhan: thongDiep(e), lienKet: [] as BuocLienKet[] };
    }
  }
  const ban = await luuNhapMaTranRieng(maMon, ky, d);
  return { daXacNhan: false, ban, loiXacNhan: `Ma trận chung chưa hợp lệ: ${kqChung.loi[0]}`, lienKet: [] as BuocLienKet[] };
}

/** Lưu đặc tả: tổ trưởng thì tự kiểm tra và xác nhận; người khác hoặc còn lỗi thì lưu nháp. */
export async function luuDacTaTuDong(maMon: string, ky: string, maTranRiengId: string, dacTa: DacTa, trangThai: TrangThaiDacTa) {
  const nhap = trangThai === 'DA_XAC_NHAN' ? 'CAN_XAC_NHAN_LAI' : trangThai;
  if (!(await duocTuXacNhan())) return { daXacNhan: false, ban: await luuNhapDacTa(maMon, ky, maTranRiengId, dacTa, nhap) };
  try {
    const xn = await xacNhanDacTa(maMon, ky, maTranRiengId, dacTa);
    return { daXacNhan: true, ban: xn.ban, taoPhienBanMoi: xn.taoPhienBanMoi };
  } catch (e) {
    const ban = await luuNhapDacTa(maMon, ky, maTranRiengId, dacTa, nhap);
    return { daXacNhan: false, ban, loiXacNhan: thongDiep(e) };
  }
}
