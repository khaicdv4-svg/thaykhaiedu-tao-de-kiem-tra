/**
 * Liên kết ma trận chung (của tổ) → ma trận riêng → đặc tả (của từng giáo viên).
 *
 * - Thầy cô bấm Lưu ma trận riêng, đặc tả của mình: app tự kiểm tra; không có lỗi thì dùng ngay và cập nhật bước sau.
 *   Còn lỗi thì giữ bản nháp ở bước đó, báo lỗi và dừng.
 * - Tổ trưởng xác nhận ma trận chung mới: app tự cập nhật ma trận riêng, đặc tả của MỌI giáo viên đã làm môn, kì đó,
 *   giữ phần chọn của từng người còn hợp lệ; câu đổi yêu cầu thì để người đó làm lại.
 * Không đụng tới đề: đề tự chuyển sang đặc tả mới khi người soạn mở bước 4.
 */
import { chuyenMaTranRiengSangBanMoi, ganSanYccdDuyNhat, kiemDinhMaTranChung } from '@/core/matrix/matrix-template';
import { dienLaiTuPpct, dungLaiDacTa, taoGoiYTheoYccd, type DacTa, type TrangThaiDacTa } from '@/core/dac-ta/dac-ta';
import { maTranChungTuKho } from './kho-ma-tran.repository';
import { dsMucLucSgk, dsTietPpct, dsYccd } from './chuong-trinh.repository';
import { ghepBaiTuDong } from './ghep-bai.repository';
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

export interface BuocLienKet {
  buoc: 'MA_TRAN_RIENG' | 'DAC_TA';
  ok: boolean;
  thongBao: string;
}

const thongDiep = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Ma trận chung của môn, kì vừa được xác nhận: cập nhật bộ của từng giáo viên đã làm môn, kì này. */
export async function capNhatSauMaTranChung(maMon: string, ky: string): Promise<BuocLienKet[]> {
  const { supabase, orgId, user } = await layNguoiDung();
  const { data } = await supabase.from('ma_tran_rieng').select('chu_so_huu').eq('organization_id', orgId).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).is('cat_luc', null);
  const ds = [...new Set(((data ?? []) as { chu_so_huu: string }[]).map((r) => r.chu_so_huu))];
  if (!ds.length) return [];
  const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ds);
  const ten = new Map(((ps ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name ?? 'Giáo viên']));
  const kq: BuocLienKet[] = [];
  for (const chu of ds) {
    const truoc = chu === user.id ? '' : `${ten.get(chu) ?? 'Giáo viên'}: `;
    try {
      for (const b of await capNhatMotNguoi(maMon, ky, chu)) kq.push({ ...b, thongBao: truoc + b.thongBao });
    } catch (e) {
      kq.push({ buoc: 'MA_TRAN_RIENG', ok: false, thongBao: `${truoc}Chưa cập nhật được ma trận riêng: ${thongDiep(e)}` });
    }
  }
  return kq;
}

async function capNhatMotNguoi(maMon: string, ky: string, chu: string): Promise<BuocLienKet[]> {
  const kho = await maTranChungTuKho(maMon, ky);
  if (!kho.mtc) return [];
  const { banNhap, moiNhat } = await layMaTranRieng(maMon, ky, chu);
  // Bản nháp giữ chỗ đang sửa dở; sau khi xác nhận thì bản nháp trùng bản đã xác nhận
  const goc = banNhap ?? moiNhat;
  if (!goc) return [];
  if (JSON.stringify(goc.duLieu.ma_tran_chung) === JSON.stringify(kho.mtc)) return capNhatSauMaTranRieng(maMon, ky, chu);

  const { mtr, bo } = chuyenMaTranRiengSangBanMoi(kho.mtc, goc.duLieu.ma_tran_rieng);
  const mtrMoi = ganSanYccdDuyNhat(kho.mtc, mtr);
  const duLieu: DuLieuMaTranRieng = { ma_tran_chung: kho.mtc, ma_tran_rieng: mtrMoi };
  const ghiChuBo = bo ? ` ${bo} chỗ chọn YCCĐ không còn hợp với ma trận chung mới nên đã bỏ.` : '';
  try {
    const kq = await xacNhanMaTranRieng(maMon, ky, duLieu, chu);
    const buoc: BuocLienKet = {
      buoc: 'MA_TRAN_RIENG',
      ok: true,
      thongBao: `Ma trận riêng đã tự cập nhật theo ma trận chung bản ${kho.phienBan}, thành phiên bản ${kq.ban.phienBan}.${ghiChuBo}`,
    };
    return [buoc, ...(await capNhatSauMaTranRieng(maMon, ky, chu))];
  } catch (e) {
    await luuNhapMaTranRieng(maMon, ky, { ...duLieu, ma_tran_rieng: { ...mtrMoi, trang_thai: 'CAN_XAC_NHAN_LAI' } }, chu).catch(() => undefined);
    return [{
      buoc: 'MA_TRAN_RIENG',
      ok: false,
      thongBao: `Ma trận riêng đã chuyển sang ma trận chung bản ${kho.phienBan} nhưng còn chỗ cần làm lại: ${thongDiep(e).replace(/^Ma trận riêng còn lỗi, chưa xác nhận được: /, '')}.${ghiChuBo} Vào bước 2 sửa rồi bấm Lưu.`,
    }];
  }
}

/** Ma trận riêng vừa có phiên bản mới: dựng lại đặc tả (giữ bài, tuần, trang của câu không đổi YCCĐ), điền thêm từ PPCT, rồi tự dùng. */
export async function capNhatSauMaTranRieng(maMon: string, ky: string, chu?: string): Promise<BuocLienKet[]> {
  const { moiNhat: mtrBan } = await layMaTranRieng(maMon, ky, chu);
  if (!mtrBan || mtrBan.phienBan === null) return [];
  const { banNhap, moiNhat } = await layDacTa(maMon, ky, chu);
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
    // Câu còn trống bài (câu mới, câu đổi YCCĐ): tự ghép bài trong PPCT của kì
    dacTa = (await ghepBaiTuDong(maMon, ky, dacTa, lop)).dacTa;
  } catch {
    // Chưa có PPCT hoặc mục lục thì để ô trống cho thầy cô điền
  }
  const them = `${kq.moi.length ? ` Câu mới: ${kq.moi.join('; ')}.` : ''}${kq.doi.length ? ` Câu đổi YCCĐ, đã điền lại bài, trang: ${kq.doi.join('; ')}.` : ''}`;
  try {
    const xn = await xacNhanDacTa(maMon, ky, mtrBan.id, dacTa, chu);
    return [{ buoc: 'DAC_TA', ok: true, thongBao: `Đặc tả đã tự cập nhật theo ma trận riêng phiên bản ${mtrBan.phienBan}, thành phiên bản ${xn.ban.phienBan}.${them}` }];
  } catch (e) {
    const trangThai: TrangThaiDacTa = 'CAN_XAC_NHAN_LAI';
    await luuNhapDacTa(maMon, ky, mtrBan.id, dacTa, trangThai, chu).catch(() => undefined);
    return [{
      buoc: 'DAC_TA',
      ok: false,
      thongBao: `Đặc tả đã chuyển sang ma trận riêng phiên bản ${mtrBan.phienBan} nhưng còn chỗ cần điền: ${thongDiep(e).replace(/^Đặc tả còn lỗi, chưa xác nhận được: /, '')}.${them} Vào bước 3 điền nốt rồi bấm Lưu.`,
    }];
  }
}

/** Lưu ma trận riêng của mình: tự kiểm tra; không có lỗi thì dùng ngay và cập nhật đặc tả; còn lỗi thì lưu nháp. */
export async function luuMaTranRiengTuDong(maMon: string, ky: string, d: DuLieuMaTranRieng) {
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

/** Lưu đặc tả của mình: tự kiểm tra và dùng ngay; còn lỗi thì lưu nháp. */
export async function luuDacTaTuDong(maMon: string, ky: string, maTranRiengId: string, dacTa: DacTa, trangThai: TrangThaiDacTa) {
  const nhap = trangThai === 'DA_XAC_NHAN' ? 'CAN_XAC_NHAN_LAI' : trangThai;
  try {
    const xn = await xacNhanDacTa(maMon, ky, maTranRiengId, dacTa);
    return { daXacNhan: true, ban: xn.ban, taoPhienBanMoi: xn.taoPhienBanMoi };
  } catch (e) {
    const ban = await luuNhapDacTa(maMon, ky, maTranRiengId, dacTa, nhap);
    return { daXacNhan: false, ban, loiXacNhan: thongDiep(e) };
  }
}
