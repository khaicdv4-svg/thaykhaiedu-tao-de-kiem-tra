/**
 * ThayKhaiEdu - Lưu ma trận riêng và bản đặc tả lên cơ sở dữ liệu (bảng ma_tran_rieng, dac_ta).
 *
 * Mỗi (trường, khối, môn, kì) có một bản nháp dùng chung của tổ (sửa được) và các phiên bản đã xác nhận
 * (1, 2, 3…, không sửa, không xóa). Xác nhận luôn chạy lại kiểm định ở máy chủ, không tin kết quả từ trình duyệt.
 * Tổ trưởng, tổ phó, quản trị mới ghi được; mọi thành viên trong trường đọc được (RLS cũng chặn ở tầng dữ liệu).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { dsYccd } from '@/lib/repositories/chuong-trinh.repository';
import { kiemDinhMaTranChung, kiemDinhMaTranRieng } from '@/core/matrix/matrix-template';
import { kiemDinhDacTa, type DacTa, type TrangThaiDacTa } from '@/core/dac-ta/dac-ta';
import { kiemDinhDe, type DeKiemTra, type KetQuaKiemDinhDe, type TrangThaiDe } from '@/core/de/de';
import type { KyKiemTra, MaTranChung, MaTranRieng, TrangThaiMaTran } from '@/types/matrix-template';

const KHOI = 4;
const VAI_TRO_GHI = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const DANH_SACH_KY: KyKiemTra[] = ['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM'];

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  return { supabase, user, orgId: profile.organization_id as string, role: profile.role as string };
}

function canQuyenGhi(role: string) {
  if (!VAI_TRO_GHI.includes(role)) throw new Error('Chỉ tổ trưởng, tổ phó hoặc quản trị mới được lưu và xác nhận. Bạn chỉ được xem.');
}

/** Bảng đặc tả chưa được tạo (chưa chạy migration): báo bằng lời dễ hiểu thay vì lỗi kĩ thuật. */
function loiDacTa(viec: string, msg: string): Error {
  if (/dac_ta/.test(msg) && /(does not exist|schema cache|Could not find)/i.test(msg)) {
    return new Error('Cơ sở dữ liệu chưa có bảng đặc tả. Cần chạy migration 20261106200000_dac_ta.sql trên Supabase.');
  }
  return new Error(`${viec}: ${msg}`);
}

function kiemMonKy(maMon: string, ky: string) {
  if (!maMon) throw new Error('Thiếu môn.');
  if (!DANH_SACH_KY.includes(ky as KyKiemTra)) throw new Error('Kì kiểm tra không hợp lệ.');
}

// ---------------------------------------------------------------------------
// Ma trận riêng
// ---------------------------------------------------------------------------

/** Dữ liệu lưu trong cột du_lieu: ma trận chung dùng để lập (bản chụp) và ma trận riêng. */
export interface DuLieuMaTranRieng {
  ma_tran_chung: MaTranChung;
  ma_tran_rieng: MaTranRieng;
}

export interface BanMaTranRieng {
  id: string;
  phienBan: number | null;
  trangThai: TrangThaiMaTran;
  capNhatLuc: string;
  xacNhanLuc: string | null;
  duLieu: DuLieuMaTranRieng;
}

const COT_MTR = 'id, phien_ban, trang_thai, updated_at, xac_nhan_luc, du_lieu';
const sangMtr = (r: any): BanMaTranRieng => ({
  id: r.id, phienBan: r.phien_ban, trangThai: r.trang_thai, capNhatLuc: r.updated_at, xacNhanLuc: r.xac_nhan_luc, duLieu: r.du_lieu,
});

/** Bản nháp và phiên bản đã xác nhận mới nhất, kèm danh sách các phiên bản (không kèm nội dung). */
export async function layMaTranRieng(maMon: string, ky: string) {
  kiemMonKy(maMon, ky);
  const { supabase, orgId } = await layNguoiDung();
  const loc = (q: any) => q.eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky);
  const { data: nhap, error: e1 } = await loc(supabase.from('ma_tran_rieng').select(COT_MTR)).eq('la_ban_nhap', true).maybeSingle();
  if (e1) throw new Error(`Không đọc được ma trận riêng: ${e1.message}`);
  const { data: moiNhat, error: e2 } = await loc(supabase.from('ma_tran_rieng').select(COT_MTR)).eq('la_ban_nhap', false).order('phien_ban', { ascending: false }).limit(1);
  if (e2) throw new Error(`Không đọc được ma trận riêng: ${e2.message}`);
  const { data: ds } = await loc(supabase.from('ma_tran_rieng').select('id, phien_ban, xac_nhan_luc')).eq('la_ban_nhap', false).order('phien_ban', { ascending: false });
  return {
    banNhap: nhap ? sangMtr(nhap) : null,
    moiNhat: moiNhat?.[0] ? sangMtr(moiNhat[0]) : null,
    cacPhienBan: ((ds ?? []) as any[]).map((r) => ({ id: r.id as string, phienBan: r.phien_ban as number, xacNhanLuc: r.xac_nhan_luc as string })),
  };
}

/** Bỏ phần không ảnh hưởng nội dung khi so hai bản ma trận riêng. */
function noiDungMaTran(m: MaTranRieng) {
  const { cap_nhat_luc: _a, trang_thai: _b, ...con } = m;
  void _a; void _b;
  return JSON.stringify(con);
}

function kiemCauTruc(d: DuLieuMaTranRieng, maMon: string, ky: string) {
  if (!d?.ma_tran_chung || !d?.ma_tran_rieng) throw new Error('Thiếu ma trận chung hoặc ma trận riêng.');
  if (d.ma_tran_chung.ma_mon !== maMon || d.ma_tran_chung.ky_kiem_tra !== ky) throw new Error('Ma trận không đúng môn hoặc kì đã chọn.');
  if (d.ma_tran_rieng.ma_tran_chung_ma_mon !== maMon || d.ma_tran_rieng.ma_tran_chung_ky !== ky) throw new Error('Ma trận riêng không thuộc ma trận chung này.');
  if (JSON.stringify(d).length > 2_000_000) throw new Error('Ma trận quá lớn.');
}

export async function luuNhapMaTranRieng(maMon: string, ky: string, d: DuLieuMaTranRieng): Promise<BanMaTranRieng> {
  kiemMonKy(maMon, ky);
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenGhi(role);
  kiemCauTruc(d, maMon, ky);
  const trangThai = d.ma_tran_rieng.trang_thai;
  const hang = {
    du_lieu: d, trang_thai: trangThai, phien_ban_ma_tran_chung: d.ma_tran_chung.phien_ban_mau, updated_by: user.id,
  };
  const { data: cu } = await supabase.from('ma_tran_rieng').select('id').eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).eq('la_ban_nhap', true).maybeSingle();
  const { data, error } = cu
    ? await supabase.from('ma_tran_rieng').update(hang).eq('id', cu.id).select(COT_MTR).single()
    : await supabase.from('ma_tran_rieng').insert({ ...hang, organization_id: orgId, khoi: KHOI, ma_mon: maMon, ky_kiem_tra: ky, la_ban_nhap: true, created_by: user.id }).select(COT_MTR).single();
  if (error) throw new Error(`Không lưu được bản nháp ma trận riêng: ${error.message}`);
  return sangMtr(data);
}

/** Xác nhận: chạy lại kiểm định, rồi tạo phiên bản mới (hoặc giữ phiên bản cũ nếu nội dung không đổi). */
export async function xacNhanMaTranRieng(maMon: string, ky: string, d: DuLieuMaTranRieng): Promise<{ ban: BanMaTranRieng; taoPhienBanMoi: boolean }> {
  kiemMonKy(maMon, ky);
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenGhi(role);
  kiemCauTruc(d, maMon, ky);

  const kqChung = kiemDinhMaTranChung(d.ma_tran_chung);
  if (!kqChung.hopLe) throw new Error(`Ma trận chung chưa hợp lệ: ${kqChung.loi[0]}`);
  let yccdCT: string[] | undefined;
  if (d.ma_tran_rieng.nguon_yccd === 'CHUONG_TRINH') {
    const lop = Number(d.ma_tran_chung.lop.replace(/\D/g, '')) || 4;
    yccdCT = (await dsYccd({ mon: maMon, lop, trangThai: 'DA_DUYET' })).map((y) => y.noiDung);
  }
  const kq = kiemDinhMaTranRieng(d.ma_tran_chung, d.ma_tran_rieng, yccdCT);
  if (!kq.hopLe) throw new Error(`Ma trận riêng còn lỗi, chưa xác nhận được: ${kq.loi[0]}`);

  const mtrXacNhan: MaTranRieng = { ...d.ma_tran_rieng, trang_thai: 'DA_XAC_NHAN', cap_nhat_luc: new Date().toISOString() };
  const duLieu: DuLieuMaTranRieng = { ma_tran_chung: d.ma_tran_chung, ma_tran_rieng: mtrXacNhan };

  const loc = (q: any) => q.eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky);
  const { data: moiNhat } = await loc(supabase.from('ma_tran_rieng').select(COT_MTR)).eq('la_ban_nhap', false).order('phien_ban', { ascending: false }).limit(1);
  const cu = moiNhat?.[0] as any;
  const giongCu = !!cu && noiDungMaTran((cu.du_lieu as DuLieuMaTranRieng).ma_tran_rieng) === noiDungMaTran(mtrXacNhan)
    && JSON.stringify((cu.du_lieu as DuLieuMaTranRieng).ma_tran_chung) === JSON.stringify(d.ma_tran_chung);

  let ban: BanMaTranRieng;
  if (giongCu) ban = sangMtr(cu);
  else {
    const { data, error } = await supabase.from('ma_tran_rieng').insert({
      organization_id: orgId, khoi: KHOI, ma_mon: maMon, ky_kiem_tra: ky, la_ban_nhap: false, phien_ban: (cu?.phien_ban ?? 0) + 1,
      phien_ban_ma_tran_chung: d.ma_tran_chung.phien_ban_mau, du_lieu: duLieu, trang_thai: 'DA_XAC_NHAN',
      xac_nhan_boi: user.id, xac_nhan_luc: new Date().toISOString(), created_by: user.id, updated_by: user.id,
    }).select(COT_MTR).single();
    if (error) throw new Error(`Không xác nhận được ma trận riêng: ${error.message}`);
    ban = sangMtr(data);
  }
  // Bản nháp cũng chuyển sang "đã xác nhận" để mọi người thấy cùng một trạng thái
  await luuNhapMaTranRieng(maMon, ky, duLieu);
  return { ban, taoPhienBanMoi: !giongCu };
}

// ---------------------------------------------------------------------------
// Bản đặc tả
// ---------------------------------------------------------------------------

export interface BanDacTa {
  id: string;
  phienBan: number | null;
  trangThai: TrangThaiDacTa;
  maTranRiengId: string;
  phienBanMaTranRieng: number;
  capNhatLuc: string;
  xacNhanLuc: string | null;
  duLieu: DacTa;
}

const COT_DT = 'id, phien_ban, trang_thai, ma_tran_rieng_id, phien_ban_ma_tran_rieng, updated_at, xac_nhan_luc, du_lieu';
const sangDt = (r: any): BanDacTa => ({
  id: r.id, phienBan: r.phien_ban, trangThai: r.trang_thai, maTranRiengId: r.ma_tran_rieng_id, phienBanMaTranRieng: r.phien_ban_ma_tran_rieng,
  capNhatLuc: r.updated_at, xacNhanLuc: r.xac_nhan_luc, duLieu: r.du_lieu,
});

export async function layDacTa(maMon: string, ky: string) {
  kiemMonKy(maMon, ky);
  const { supabase, orgId } = await layNguoiDung();
  const loc = (q: any) => q.eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky);
  const { data: nhap, error: e1 } = await loc(supabase.from('dac_ta').select(COT_DT)).eq('la_ban_nhap', true).maybeSingle();
  if (e1) throw loiDacTa('Không đọc được bản đặc tả', e1.message);
  const { data: moiNhat, error: e2 } = await loc(supabase.from('dac_ta').select(COT_DT)).eq('la_ban_nhap', false).order('phien_ban', { ascending: false }).limit(1);
  if (e2) throw loiDacTa('Không đọc được bản đặc tả', e2.message);
  return { banNhap: nhap ? sangDt(nhap) : null, moiNhat: moiNhat?.[0] ? sangDt(moiNhat[0]) : null };
}

async function layMaTranRiengDeKeThua(supabase: any, orgId: string, maMon: string, ky: string, id: string) {
  const { data, error } = await supabase.from('ma_tran_rieng').select(COT_MTR).eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).eq('la_ban_nhap', false).order('phien_ban', { ascending: false });
  if (error) throw new Error(`Không đọc được ma trận riêng: ${error.message}`);
  const ds = ((data ?? []) as any[]).map(sangMtr);
  const moiNhat = ds[0];
  if (!moiNhat) throw new Error('Môn này chưa có ma trận riêng đã xác nhận. Hãy xác nhận ma trận riêng ở bước 2 trước.');
  const chon = ds.find((b) => b.id === id);
  if (!chon) throw new Error('Không tìm thấy phiên bản ma trận riêng mà đặc tả kế thừa.');
  return { chon, moiNhat };
}

export async function luuNhapDacTa(maMon: string, ky: string, maTranRiengId: string, dacTa: DacTa, trangThai: TrangThaiDacTa): Promise<BanDacTa> {
  kiemMonKy(maMon, ky);
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenGhi(role);
  if (dacTa.ma_mon !== maMon || dacTa.ky_kiem_tra !== ky) throw new Error('Đặc tả không đúng môn hoặc kì đã chọn.');
  if (trangThai === 'DA_XAC_NHAN') throw new Error('Bản nháp không được ghi trạng thái đã xác nhận. Dùng thao tác xác nhận.');
  const { chon } = await layMaTranRiengDeKeThua(supabase, orgId, maMon, ky, maTranRiengId);
  if (chon.phienBan !== dacTa.phien_ban_ma_tran_rieng) throw new Error('Số phiên bản ma trận riêng ghi trong đặc tả không đúng.');
  const hang = { du_lieu: dacTa, trang_thai: trangThai, ma_tran_rieng_id: maTranRiengId, phien_ban_ma_tran_rieng: dacTa.phien_ban_ma_tran_rieng, updated_by: user.id };
  const { data: cu } = await supabase.from('dac_ta').select('id').eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).eq('la_ban_nhap', true).maybeSingle();
  const { data, error } = cu
    ? await supabase.from('dac_ta').update(hang).eq('id', cu.id).select(COT_DT).single()
    : await supabase.from('dac_ta').insert({ ...hang, organization_id: orgId, khoi: KHOI, ma_mon: maMon, ky_kiem_tra: ky, la_ban_nhap: true, created_by: user.id }).select(COT_DT).single();
  if (error) throw loiDacTa('Không lưu được bản nháp đặc tả', error.message);
  return sangDt(data);
}

/** Xác nhận đặc tả: kiểm định lại với đúng phiên bản ma trận riêng đã chọn, và phải là phiên bản mới nhất. */
export async function xacNhanDacTa(maMon: string, ky: string, maTranRiengId: string, dacTa: DacTa): Promise<{ ban: BanDacTa; taoPhienBanMoi: boolean }> {
  kiemMonKy(maMon, ky);
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenGhi(role);
  if (dacTa.ma_mon !== maMon || dacTa.ky_kiem_tra !== ky) throw new Error('Đặc tả không đúng môn hoặc kì đã chọn.');
  const { chon, moiNhat } = await layMaTranRiengDeKeThua(supabase, orgId, maMon, ky, maTranRiengId);
  if (chon.phienBan !== dacTa.phien_ban_ma_tran_rieng) throw new Error('Số phiên bản ma trận riêng ghi trong đặc tả không đúng.');
  const kq = kiemDinhDacTa(chon.duLieu.ma_tran_chung, chon.duLieu.ma_tran_rieng, dacTa, { phienBanMaTranRiengMoiNhat: moiNhat.phienBan ?? undefined });
  if (!kq.hopLe) throw new Error(`Đặc tả còn lỗi, chưa xác nhận được: ${kq.loi[0]}`);

  const loc = (q: any) => q.eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky);
  const { data: moiNhatDt } = await loc(supabase.from('dac_ta').select(COT_DT)).eq('la_ban_nhap', false).order('phien_ban', { ascending: false }).limit(1);
  const cu = moiNhatDt?.[0] as any;
  const giongCu = !!cu && cu.ma_tran_rieng_id === maTranRiengId && JSON.stringify(cu.du_lieu) === JSON.stringify(dacTa);

  let ban: BanDacTa;
  if (giongCu) ban = sangDt(cu);
  else {
    const { data, error } = await supabase.from('dac_ta').insert({
      organization_id: orgId, khoi: KHOI, ma_mon: maMon, ky_kiem_tra: ky, la_ban_nhap: false, phien_ban: (cu?.phien_ban ?? 0) + 1,
      ma_tran_rieng_id: maTranRiengId, phien_ban_ma_tran_rieng: dacTa.phien_ban_ma_tran_rieng, du_lieu: dacTa, trang_thai: 'DA_XAC_NHAN',
      xac_nhan_boi: user.id, xac_nhan_luc: new Date().toISOString(), created_by: user.id, updated_by: user.id,
    }).select(COT_DT).single();
    if (error) throw loiDacTa('Không xác nhận được đặc tả', error.message);
    ban = sangDt(data);
  }
  // Bản nháp cũng chuyển sang "đã xác nhận" (trigger chỉ chặn đổi loại bản, không chặn đổi trạng thái của nháp)
  const { data: nhap } = await supabase.from('dac_ta').select('id').eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).eq('la_ban_nhap', true).maybeSingle();
  const hangNhap = { du_lieu: dacTa, trang_thai: 'DA_XAC_NHAN', ma_tran_rieng_id: maTranRiengId, phien_ban_ma_tran_rieng: dacTa.phien_ban_ma_tran_rieng, updated_by: user.id };
  if (nhap) await supabase.from('dac_ta').update(hangNhap).eq('id', nhap.id);
  else await supabase.from('dac_ta').insert({ ...hangNhap, organization_id: orgId, khoi: KHOI, ma_mon: maMon, ky_kiem_tra: ky, la_ban_nhap: true, created_by: user.id });
  return { ban, taoPhienBanMoi: !giongCu };
}

// ---------------------------------------------------------------------------
// Đề kiểm tra (bước 4)
// ---------------------------------------------------------------------------

export interface BanDe {
  id: string;
  trangThai: TrangThaiDe;
  dacTaId: string;
  phienBanDacTa: number;
  capNhatLuc: string;
  duLieu: DeKiemTra;
}

const COT_DE = 'id, trang_thai, dac_ta_id, phien_ban_dac_ta, updated_at, du_lieu';
const sangDe = (r: any): BanDe => ({
  id: r.id, trangThai: r.trang_thai, dacTaId: r.dac_ta_id, phienBanDacTa: r.phien_ban_dac_ta, capNhatLuc: r.updated_at, duLieu: r.du_lieu,
});

function loiDe(viec: string, msg: string): Error {
  if (/de_kiem_tra/.test(msg) && /(does not exist|schema cache|Could not find)/i.test(msg)) {
    return new Error('Cơ sở dữ liệu chưa có bảng đề kiểm tra. Cần chạy migration 20261106210000_de_kiem_tra.sql trên Supabase.');
  }
  return new Error(`${viec}: ${msg}`);
}

/** Đề đang soạn của môn, kì (nếu có). */
export async function layDe(maMon: string, ky: string): Promise<{ de: BanDe | null }> {
  kiemMonKy(maMon, ky);
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('de_kiem_tra').select(COT_DE).eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).maybeSingle();
  if (error) throw loiDe('Không đọc được đề kiểm tra', error.message);
  return { de: data ? sangDe(data) : null };
}

/** Đặc tả đã xác nhận mà đề kế thừa phải đúng phiên bản và là bản mới nhất khi lưu (cũ hơn vẫn lưu được nhưng báo lỗi lúc kiểm định). */
async function layDacTaDeKeThua(supabase: any, orgId: string, maMon: string, ky: string, id: string) {
  const { data, error } = await supabase.from('dac_ta').select(COT_DT).eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).eq('la_ban_nhap', false).order('phien_ban', { ascending: false });
  if (error) throw loiDacTa('Không đọc được đặc tả', error.message);
  const ds = ((data ?? []) as any[]).map(sangDt);
  if (!ds.length) throw new Error('Môn này chưa có đặc tả đã xác nhận. Hãy xác nhận đặc tả ở bước 3 trước.');
  const chon = ds.find((b) => b.id === id);
  if (!chon) throw new Error('Không tìm thấy phiên bản đặc tả mà đề kế thừa.');
  return { chon, moiNhat: ds[0] };
}

export async function luuDe(maMon: string, ky: string, dacTaId: string, de: DeKiemTra, trangThai: TrangThaiDe): Promise<{ ban: BanDe; kiemDinh: KetQuaKiemDinhDe }> {
  kiemMonKy(maMon, ky);
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenGhi(role);
  if (de.ma_mon !== maMon || de.ky_kiem_tra !== ky) throw new Error('Đề không đúng môn hoặc kì đã chọn.');
  const { chon, moiNhat } = await layDacTaDeKeThua(supabase, orgId, maMon, ky, dacTaId);
  if (chon.phienBan !== de.phien_ban_dac_ta) throw new Error('Số phiên bản đặc tả ghi trong đề không đúng.');

  // Máy chủ kiểm định lại: không tin trạng thái do trình duyệt gửi lên
  const kiemDinh = kiemDinhDe(chon.duLieu, de, { phienBanDacTaMoiNhat: moiNhat.phienBan ?? undefined });
  let tt: TrangThaiDe = trangThai;
  if (trangThai === 'SAN_SANG_DUYET' && !kiemDinh.hopLe) throw new Error(`Đề còn lỗi, chưa chuyển sang duyệt được: ${kiemDinh.loi[0]}`);
  if (trangThai === 'CAN_KIEM_TRA' && !kiemDinh.hopLe) tt = 'CO_LOI';

  const hang = { du_lieu: de, trang_thai: tt, dac_ta_id: dacTaId, phien_ban_dac_ta: de.phien_ban_dac_ta, updated_by: user.id };
  const { data: cu } = await supabase.from('de_kiem_tra').select('id').eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).maybeSingle();
  const { data, error } = cu
    ? await supabase.from('de_kiem_tra').update(hang).eq('id', cu.id).select(COT_DE).single()
    : await supabase.from('de_kiem_tra').insert({ ...hang, organization_id: orgId, khoi: KHOI, ma_mon: maMon, ky_kiem_tra: ky, created_by: user.id }).select(COT_DE).single();
  if (error) throw loiDe('Không lưu được đề kiểm tra', error.message);
  return { ban: sangDe(data), kiemDinh };
}
