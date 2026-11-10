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
import { TRANG_THAI_NHAP, kiemDinhDe, saoChepDeSangKyMoi, type DeKiemTra, type KetQuaKiemDinhDe, type TrangThaiDe } from '@/core/de/de';
import type { KyKiemTra, MaTranChung, MaTranRieng, TrangThaiMaTran } from '@/types/matrix-template';

const KHOI = 4;
const VAI_TRO_GHI = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const DANH_SACH_KY: KyKiemTra[] = ['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM'];

export async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  // Vai trò cao nhất đang hiệu lực (gộp vai trò gốc và vai trò cấp thêm) và danh sách đầy đủ các vai trò
  const [{ data: vaiTroCao }, { data: dsVaiTro }, { data: dsQuyen }] = await Promise.all([supabase.rpc('get_auth_user_role'), supabase.rpc('vai_tro_cua_toi'), supabase.rpc('quyen_gv_cua_toi')]);
  const vaiTro = ((dsVaiTro as string[] | null) ?? [profile.role as string]);
  return { supabase, user, orgId: profile.organization_id as string, role: ((vaiTroCao as string | null) ?? (profile.role as string)), vaiTro, quyen: ((dsQuyen as string[] | null) ?? []) };
}

function canQuyenGhi(role: string, quyen: string[] = []) {
  if (role === 'TEACHER' && quyen.includes('SUA_MA_TRAN_DAC_TA')) return;
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

/** Ma trận chung của tổ (kho ma trận) được xác nhận bản mới hơn sau khi ma trận riêng đã xác nhận → cần kiểm tra lại. */
async function timMaTranChungMoiHon(supabase: any, orgId: string, maMon: string, ky: string, xacNhanRieng: string | undefined) {
  if (!xacNhanRieng) return null;
  const { data: kho } = await supabase
    .from('tai_lieu_ma_tran')
    .select('phien_ban, xac_nhan_luc, ten_file')
    .eq('organization_id', orgId).eq('khoi', KHOI).eq('loai', 'CHUNG').eq('ma_mon', maMon).eq('ky_kiem_tra', ky)
    .eq('trang_thai', 'DA_XAC_NHAN')
    .order('xac_nhan_luc', { ascending: false }).limit(1);
  const k = kho?.[0];
  if (k?.xac_nhan_luc && new Date(k.xac_nhan_luc).getTime() > new Date(xacNhanRieng).getTime()) {
    return { phienBan: k.phien_ban as number, xacNhanLuc: k.xac_nhan_luc as string, tenFile: k.ten_file as string };
  }
  return null;
}

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
  const maTranChungMoiHon = await timMaTranChungMoiHon(supabase, orgId, maMon, ky, moiNhat?.[0]?.xac_nhan_luc as string | undefined);
  return {
    banNhap: nhap ? sangMtr(nhap) : null,
    moiNhat: moiNhat?.[0] ? sangMtr(moiNhat[0]) : null,
    maTranChungMoiHon,
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
  const { supabase, user, orgId, role, quyen } = await layNguoiDung();
  canQuyenGhi(role, quyen);
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
  const { supabase, user, orgId, role, quyen } = await layNguoiDung();
  canQuyenGhi(role, quyen);
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
  if (giongCu) {
    // Giáo viên kiểm tra lại và xác nhận: ghi nhận lần xác nhận mới để hết cảnh báo ma trận chung mới hơn.
    const { data: moi, error } = await supabase.from('ma_tran_rieng').update({ xac_nhan_luc: new Date().toISOString(), xac_nhan_boi: user.id }).eq('id', cu.id).select(COT_MTR).single();
    ban = error || !moi ? sangMtr(cu) : sangMtr(moi);
  } else {
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
  const { supabase, user, orgId, role, quyen } = await layNguoiDung();
  canQuyenGhi(role, quyen);
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
  const { supabase, user, orgId, role, quyen } = await layNguoiDung();
  canQuyenGhi(role, quyen);
  if (dacTa.ma_mon !== maMon || dacTa.ky_kiem_tra !== ky) throw new Error('Đặc tả không đúng môn hoặc kì đã chọn.');
  const { chon, moiNhat } = await layMaTranRiengDeKeThua(supabase, orgId, maMon, ky, maTranRiengId);
  if (chon.phienBan !== dacTa.phien_ban_ma_tran_rieng) throw new Error('Số phiên bản ma trận riêng ghi trong đặc tả không đúng.');
  const chungMoi = await timMaTranChungMoiHon(supabase, orgId, maMon, ky, moiNhat.xacNhanLuc ?? undefined);
  if (chungMoi) throw new Error(`Ma trận chung của tổ vừa có bản ${chungMoi.phienBan} mới hơn. Vào Ma trận riêng, kiểm tra và xác nhận lại trước khi xác nhận đặc tả.`);
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
// Đề kiểm tra (bước 4) và quy trình thẩm định, phê duyệt (bước 5)
// ---------------------------------------------------------------------------
//
// Mỗi giáo viên có đề riêng cho từng (môn, kì). Quyền xem/sửa/xóa do cơ sở dữ liệu quyết định (RLS + hàm quy trình),
// ứng dụng chỉ gọi các hàm đó, không tự suy ra quyền.

export interface BanDe {
  id: string;
  maDe: string;
  trangThai: TrangThaiDe;
  dacTaId: string;
  phienBanDacTa: number;
  capNhatLuc: string;
  duLieu: DeKiemTra;
  duyetLuc: string | null;
  ghiChuDuyet: string | null;
  phamViXem: 'RIENG_TU' | 'TO' | 'TRUONG';
  /** Người đang đăng nhập có phải người tạo đề không. */
  laChuDe: boolean;
  nguoiTao: string | null;
  maMon: string;
  ky: string;
  /** Các thao tác quy trình mà người đang đăng nhập được làm với đề này ở trạng thái hiện tại. */
  hanhDong: string[];
}

const COT_DE = 'id, ma_de, trang_thai, dac_ta_id, phien_ban_dac_ta, updated_at, du_lieu, duyet_luc, ghi_chu_duyet, pham_vi_xem, created_by, ma_mon, ky_kiem_tra';
const sangDe = (r: any, uid: string, hanhDong: string[] = [], nguoiTao: string | null = null): BanDe => ({
  id: r.id, maDe: r.ma_de, trangThai: r.trang_thai, dacTaId: r.dac_ta_id, phienBanDacTa: r.phien_ban_dac_ta, capNhatLuc: r.updated_at, duLieu: r.du_lieu,
  duyetLuc: r.duyet_luc ?? null, ghiChuDuyet: r.ghi_chu_duyet ?? null, phamViXem: r.pham_vi_xem, laChuDe: r.created_by === uid, nguoiTao,
  maMon: r.ma_mon, ky: r.ky_kiem_tra, hanhDong,
});

function loiDe(viec: string, msg: string): Error {
  if (/de_kiem_tra/.test(msg) && /(does not exist|schema cache|Could not find)/i.test(msg)) {
    return new Error('Cơ sở dữ liệu chưa có bảng đề kiểm tra. Cần chạy migration 20261106210000_de_kiem_tra.sql trên Supabase.');
  }
  return new Error(`${viec}: ${msg}`);
}

async function hanhDongCuaDe(supabase: any, id: string): Promise<string[]> {
  const { data } = await supabase.rpc('hanh_dong_cho_phep', { p_de: id });
  return (data as string[] | null) ?? [];
}

/** Đề của chính người đăng nhập cho môn, kì (nếu có). */
export async function layDe(maMon: string, ky: string): Promise<{ de: BanDe | null }> {
  kiemMonKy(maMon, ky);
  const { supabase, user, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('de_kiem_tra').select(COT_DE).eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).eq('created_by', user.id).maybeSingle();
  if (error) throw loiDe('Không đọc được đề kiểm tra', error.message);
  if (!data) return { de: null };
  return { de: sangDe(data, user.id, await hanhDongCuaDe(supabase, data.id)) };
}

/** Một đề theo mã, nếu người đăng nhập được phép xem (quyền xem do cơ sở dữ liệu quyết định). */
export async function layDeTheoId(id: string): Promise<BanDe> {
  const { supabase, user, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('de_kiem_tra').select(COT_DE).eq('organization_id', orgId).eq('id', id).maybeSingle();
  if (error) throw loiDe('Không đọc được đề kiểm tra', error.message);
  if (!data) throw new Error('Không tìm thấy đề hoặc bạn không có quyền xem đề này.');
  let ten: string | null = null;
  if (data.created_by) {
    const { data: p } = await supabase.from('profiles').select('full_name').eq('id', data.created_by).maybeSingle();
    ten = (p as any)?.full_name ?? null;
  }
  return sangDe(data, user.id, await hanhDongCuaDe(supabase, id), ten);
}

/** Bản đặc tả đã xác nhận mà đề đang lưu kế thừa (dùng để xuất bộ hồ sơ khớp với đề). */
export async function layDacTaCuaDe(maMon: string, ky: string, dacTaId: string): Promise<BanDacTa> {
  kiemMonKy(maMon, ky);
  const { supabase, orgId } = await layNguoiDung();
  const { chon } = await layDacTaDeKeThua(supabase, orgId, maMon, ky, dacTaId);
  return chon;
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

const TT_SUA_DUOC = ['BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI', 'TRA_LAI'];

/**
 * Lưu đề của chính mình. Trạng thái do trình duyệt gửi chỉ có nghĩa "bản nháp" hoặc "gửi thẩm định"; máy chủ kiểm định lại.
 * Gửi thẩm định đi qua hàm quy trình của cơ sở dữ liệu. Sửa đề đang thẩm định thì thu hồi về nháp trước; sửa đề đã duyệt thì tạo phiên bản mới.
 */
export async function luuDe(maMon: string, ky: string, dacTaId: string, de: DeKiemTra, trangThai: TrangThaiDe): Promise<{ ban: BanDe; kiemDinh: KetQuaKiemDinhDe }> {
  kiemMonKy(maMon, ky);
  const { supabase, user, orgId } = await layNguoiDung();
  if (de.ma_mon !== maMon || de.ky_kiem_tra !== ky) throw new Error('Đề không đúng môn hoặc kì đã chọn.');
  if (![...TRANG_THAI_NHAP, 'SAN_SANG_DUYET'].includes(trangThai)) throw new Error('Trạng thái này chỉ đặt qua các bước thẩm định, phê duyệt, không đặt khi lưu.');
  const { chon, moiNhat } = await layDacTaDeKeThua(supabase, orgId, maMon, ky, dacTaId);
  if (chon.phienBan !== de.phien_ban_dac_ta) throw new Error('Số phiên bản đặc tả ghi trong đề không đúng.');

  const kiemDinh = kiemDinhDe(chon.duLieu, de, { phienBanDacTaMoiNhat: moiNhat.phienBan ?? undefined });
  const muonGui = trangThai === 'SAN_SANG_DUYET';
  if (muonGui && !kiemDinh.hopLe) throw new Error(`Đề còn lỗi, chưa gửi thẩm định được: ${kiemDinh.loi[0]}`);
  let tt: TrangThaiDe = muonGui ? 'CAN_KIEM_TRA' : trangThai;
  if (tt === 'CAN_KIEM_TRA' && !kiemDinh.hopLe) tt = 'CO_LOI';

  const { data: cu } = await supabase.from('de_kiem_tra').select('id, trang_thai, du_lieu, dac_ta_id').eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', ky).eq('created_by', user.id).maybeSingle();
  let id: string | null = cu?.id ?? null;
  if (cu) {
    const giong = cu.dac_ta_id === dacTaId && JSON.stringify(cu.du_lieu) === JSON.stringify(de);
    if (!TT_SUA_DUOC.includes(cu.trang_thai)) {
      if (giong && !muonGui) return { ban: await layDeTheoId(cu.id), kiemDinh };
      if (cu.trang_thai === 'SAN_SANG_DUYET' || cu.trang_thai === 'DANG_THAM_DINH') {
        const { error } = await supabase.rpc('chuyen_trang_thai_de', { p_de: cu.id, p_hanh_dong: 'THU_HOI_VE_NHAP', p_ghi_chu: 'Thu hồi để sửa' });
        if (error) throw new Error(error.message);
      } else if (cu.trang_thai === 'DA_DUYET' || cu.trang_thai === 'DA_PHAT_HANH') {
        if (giong && !muonGui) return { ban: await layDeTheoId(cu.id), kiemDinh };
        const { error } = await supabase.rpc('chuyen_trang_thai_de', { p_de: cu.id, p_hanh_dong: 'TAO_PHIEN_BAN_MOI', p_ghi_chu: null });
        if (error) throw new Error(error.message);
      } else {
        throw new Error('Đề đang ở bước xét duyệt của tổ trưởng hoặc Ban giám hiệu nên không sửa được. Nhờ người duyệt yêu cầu chỉnh sửa nếu cần đổi.');
      }
    }
  }
  // Đề đang được trả lại giữ nguyên trạng thái "Trả lại" cho đến khi gửi thẩm định lại
  const giuTraLai = cu?.trang_thai === 'TRA_LAI' && !muonGui;
  const hang = { du_lieu: de, dac_ta_id: dacTaId, phien_ban_dac_ta: de.phien_ban_dac_ta, updated_by: user.id, ...(giuTraLai ? {} : { trang_thai: tt }) };
  if (id) {
    const { error } = await supabase.from('de_kiem_tra').update(hang).eq('id', id);
    if (error) throw loiDe('Không lưu được đề kiểm tra', error.message);
  } else {
    const { data, error } = await supabase.from('de_kiem_tra').insert({ ...hang, trang_thai: tt, organization_id: orgId, khoi: KHOI, ma_mon: maMon, ky_kiem_tra: ky, created_by: user.id }).select('id').single();
    if (error) throw loiDe('Không lưu được đề kiểm tra', error.message);
    id = data.id;
  }
  if (muonGui) {
    const { error } = await supabase.rpc('chuyen_trang_thai_de', { p_de: id, p_hanh_dong: 'GUI_THAM_DINH', p_ghi_chu: null });
    if (error) throw new Error(error.message);
  }
  return { ban: await layDeTheoId(id as string), kiemDinh };
}

// ---------------------------------------------------------------------------
// Kho đề, quy trình, lịch sử, nhận xét
// ---------------------------------------------------------------------------

export interface DongKhoDe {
  id: string;
  maDe: string;
  maMon: string;
  ky: string;
  trangThai: TrangThaiDe;
  phamViXem: 'RIENG_TU' | 'TO' | 'TRUONG';
  phienBanDacTa: number;
  capNhatLuc: string;
  duyetLuc: string | null;
  phienBanDaDuyetMoiNhat: number | null;
  nguoiTao: string | null;
  laChuDe: boolean;
  duocXoa: boolean;
  hanhDong: string[];
}

const TT_XOA_DUOC = ['BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI', 'TRA_LAI'];

/** Danh sách đề người đăng nhập được xem (cơ sở dữ liệu lọc) kèm các thao tác được phép. */
export async function danhSachDe(): Promise<DongKhoDe[]> {
  const { supabase, user, orgId, vaiTro } = await layNguoiDung();
  const { data, error } = await supabase.from('de_kiem_tra').select('id, ma_de, ma_mon, ky_kiem_tra, trang_thai, pham_vi_xem, phien_ban_dac_ta, updated_at, duyet_luc, created_by').eq('organization_id', orgId).eq('khoi', KHOI).order('updated_at', { ascending: false });
  if (error) throw loiDe('Không đọc được kho đề', error.message);
  const hang = (data ?? []) as any[];
  const { data: dd } = await supabase.from('de_da_duyet').select('de_id, phien_ban').eq('organization_id', orgId).order('phien_ban', { ascending: false });
  const moiNhat = new Map<string, number>();
  for (const r of (dd ?? []) as any[]) if (r.de_id && !moiNhat.has(r.de_id)) moiNhat.set(r.de_id, r.phien_ban);
  const ids = [...new Set(hang.map((r) => r.created_by).filter(Boolean))] as string[];
  const ten = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids);
    for (const p of (ps ?? []) as any[]) ten.set(p.id, p.full_name);
  }
  const hanhDong = await Promise.all(hang.map((r) => hanhDongCuaDe(supabase, r.id)));
  const laBgh = vaiTro.includes('SCHOOL_LEADERSHIP') || vaiTro.includes('SCHOOL_ADMIN');
  return hang.map((r, i) => ({
    id: r.id, maDe: r.ma_de, maMon: r.ma_mon, ky: r.ky_kiem_tra, trangThai: r.trang_thai, phamViXem: r.pham_vi_xem, phienBanDacTa: r.phien_ban_dac_ta, capNhatLuc: r.updated_at, duyetLuc: r.duyet_luc ?? null,
    phienBanDaDuyetMoiNhat: moiNhat.get(r.id) ?? null,
    nguoiTao: r.created_by ? ten.get(r.created_by) ?? null : null,
    laChuDe: r.created_by === user.id,
    duocXoa: laBgh || (r.created_by === user.id && TT_XOA_DUOC.includes(r.trang_thai)),
    hanhDong: hanhDong[i],
  }));
}

export interface PhienBanDeDaDuyet { phienBan: number; phienBanDacTa: number; duyetLuc: string; ghiChu: string | null }

export async function phienBanDeDaDuyet(deId: string): Promise<PhienBanDeDaDuyet[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('de_da_duyet').select('phien_ban, phien_ban_dac_ta, duyet_luc, ghi_chu').eq('organization_id', orgId).eq('de_id', deId).order('phien_ban', { ascending: false });
  if (error) throw loiDe('Không đọc được các phiên bản đề đã duyệt', error.message);
  return ((data ?? []) as any[]).map((r) => ({ phienBan: r.phien_ban, phienBanDacTa: r.phien_ban_dac_ta, duyetLuc: r.duyet_luc, ghiChu: r.ghi_chu }));
}

export const HANH_DONG_QUY_TRINH = ['GUI_THAM_DINH', 'THU_HOI_VE_NHAP', 'TAO_PHIEN_BAN_MOI', 'BAT_DAU_THAM_DINH', 'DE_NGHI_DAT', 'YEU_CAU_CHINH_SUA', 'XAC_NHAN_TO', 'CHUYEN_BGH', 'PHE_DUYET', 'PHAT_HANH', 'THU_HOI_DE', 'LUU_TRU'] as const;
export type HanhDongQuyTrinh = (typeof HANH_DONG_QUY_TRINH)[number];

/**
 * Chuyển đề sang bước tiếp theo của quy trình. Ai được làm gì do hàm chuyen_trang_thai_de của cơ sở dữ liệu quyết định
 * (không ai tự duyệt đề của mình, tổ trưởng chỉ xác nhận cấp tổ, chỉ Ban giám hiệu mới duyệt cuối và phát hành).
 * Riêng phê duyệt: máy chủ kiểm định lại đề (đặc tả mới nhất, tổng điểm…) trước khi gọi hàm.
 */
export async function chuyenTrangThaiDe(id: string, hanhDong: string, ghiChu: string): Promise<{ ban: BanDe; phienBan: number | null; taoPhienBanMoi: boolean }> {
  if (!(HANH_DONG_QUY_TRINH as readonly string[]).includes(hanhDong)) throw new Error('Thao tác không hợp lệ.');
  const { supabase } = await layNguoiDung();
  const ban = await layDeTheoId(id);
  if (hanhDong === 'PHE_DUYET' || hanhDong === 'XAC_NHAN_TO' || hanhDong === 'GUI_THAM_DINH') {
    const { orgId } = await layNguoiDung();
    const { chon, moiNhat } = await layDacTaDeKeThua(supabase, orgId, ban.maMon, ban.ky, ban.dacTaId);
    const kq = kiemDinhDe(chon.duLieu, ban.duLieu, { phienBanDacTaMoiNhat: moiNhat.phienBan ?? undefined });
    if (!kq.hopLe) throw new Error(`Đề còn lỗi, chưa ${hanhDong === 'PHE_DUYET' ? 'duyệt' : hanhDong === 'GUI_THAM_DINH' ? 'gửi thẩm định' : 'xác nhận'} được: ${kq.loi[0]}`);
  }
  const { data, error } = await supabase.rpc('chuyen_trang_thai_de', { p_de: id, p_hanh_dong: hanhDong, p_ghi_chu: ghiChu.trim().slice(0, 1000) || null });
  if (error) throw new Error(error.message);
  const kq = data as { phien_ban: number | null; tao_phien_ban_moi: boolean };
  return { ban: await layDeTheoId(id), phienBan: kq?.phien_ban ?? null, taoPhienBanMoi: !!kq?.tao_phien_ban_moi };
}

export interface DongLichSu { id: string; hanhDong: string; tu: string | null; den: string | null; nguoi: string | null; vaiTro: string | null; ghiChu: string | null; phienBan: number | null; luc: string }

export async function lichSuDe(deId: string): Promise<DongLichSu[]> {
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase.from('de_lich_su').select('id, hanh_dong, tu_trang_thai, den_trang_thai, ten_nguoi, vai_tro_su_dung, ghi_chu, phien_ban_duyet, tao_luc').eq('de_id', deId).order('tao_luc', { ascending: true });
  if (error) throw new Error(`Không đọc được lịch sử: ${error.message}`);
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, hanhDong: r.hanh_dong, tu: r.tu_trang_thai, den: r.den_trang_thai, nguoi: r.ten_nguoi, vaiTro: r.vai_tro_su_dung, ghiChu: r.ghi_chu, phienBan: r.phien_ban_duyet, luc: r.tao_luc }));
}

export interface NhanXetDe { id: string; thanhPhan: string; noiDung: string; tacGia: string | null; daXuLy: boolean; luc: string }

export async function nhanXetDe(deId: string): Promise<NhanXetDe[]> {
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase.from('de_nhan_xet').select('id, thanh_phan, noi_dung, ten_tac_gia, da_xu_ly, tao_luc').eq('de_id', deId).order('tao_luc', { ascending: true });
  if (error) throw new Error(`Không đọc được nhận xét: ${error.message}`);
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, thanhPhan: r.thanh_phan, noiDung: r.noi_dung, tacGia: r.ten_tac_gia, daXuLy: r.da_xu_ly, luc: r.tao_luc }));
}

export async function themNhanXet(deId: string, thanhPhan: string, noiDung: string): Promise<void> {
  const { supabase, user, orgId } = await layNguoiDung();
  const nd = noiDung.trim().slice(0, 2000);
  if (!nd) throw new Error('Nội dung nhận xét đang trống.');
  const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const { error } = await supabase.from('de_nhan_xet').insert({ organization_id: orgId, de_id: deId, tac_gia: user.id, ten_tac_gia: (p as any)?.full_name ?? null, thanh_phan: (thanhPhan || 'CHUNG').slice(0, 80), noi_dung: nd });
  if (error) throw new Error(/row-level security/.test(error.message) ? 'Bạn không có quyền nhận xét đề này.' : error.message);
}

export async function danhDauNhanXet(id: string, daXuLy: boolean): Promise<void> {
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase.from('de_nhan_xet').update({ da_xu_ly: daXuLy }).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Chỉ người soạn đề mới đánh dấu đã xử lý.');
}

/** Người soạn chọn ai được xem đề của mình: riêng tư, cả tổ, hoặc cả trường. */
export async function doiPhamViXem(id: string, pv: string): Promise<void> {
  if (!['RIENG_TU', 'TO', 'TRUONG'].includes(pv)) throw new Error('Phạm vi xem không hợp lệ.');
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase.from('de_kiem_tra').update({ pham_vi_xem: pv }).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Chỉ người tạo đề mới đổi được phạm vi xem.');
}

export async function phanCongThamDinh(deId: string, nguoi: string): Promise<void> {
  const { supabase, user, orgId } = await layNguoiDung();
  const { error } = await supabase.from('de_phan_cong').upsert({ organization_id: orgId, de_id: deId, nguoi_tham_dinh: nguoi, giao_boi: user.id, hieu_luc: true }, { onConflict: 'de_id,nguoi_tham_dinh' });
  if (error) throw new Error(/row-level security/.test(error.message) ? 'Chỉ tổ trưởng hoặc Ban giám hiệu mới phân công, và không phân công người tạo đề tự thẩm định đề của mình.' : error.message);
}

export async function huyPhanCong(deId: string, nguoi: string): Promise<void> {
  const { supabase } = await layNguoiDung();
  const { error } = await supabase.from('de_phan_cong').update({ hieu_luc: false }).eq('de_id', deId).eq('nguoi_tham_dinh', nguoi);
  if (error) throw new Error(error.message);
}

export async function dsPhanCong(deId: string): Promise<{ nguoi: string; ten: string | null }[]> {
  const { supabase } = await layNguoiDung();
  const { data } = await supabase.from('de_phan_cong').select('nguoi_tham_dinh').eq('de_id', deId).eq('hieu_luc', true);
  const ids = ((data ?? []) as any[]).map((r) => r.nguoi_tham_dinh as string);
  if (!ids.length) return [];
  const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  const ten = new Map(((ps ?? []) as any[]).map((p) => [p.id as string, p.full_name as string]));
  return ids.map((id) => ({ nguoi: id, ten: ten.get(id) ?? null }));
}

export async function chiaSeDe(deId: string, nguoi: string, bo: boolean): Promise<void> {
  const { supabase, user, orgId } = await layNguoiDung();
  const { error } = bo
    ? await supabase.from('de_chia_se').delete().eq('de_id', deId).eq('user_id', nguoi)
    : await supabase.from('de_chia_se').upsert({ organization_id: orgId, de_id: deId, user_id: nguoi, chia_se_boi: user.id }, { onConflict: 'de_id,user_id' });
  if (error) throw new Error(/row-level security/.test(error.message) ? 'Chỉ người tạo đề mới chia sẻ đề.' : error.message);
}

export async function dsChiaSe(deId: string): Promise<{ nguoi: string; ten: string | null }[]> {
  const { supabase } = await layNguoiDung();
  const { data } = await supabase.from('de_chia_se').select('user_id').eq('de_id', deId);
  const ids = ((data ?? []) as any[]).map((r) => r.user_id as string);
  if (!ids.length) return [];
  const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  const ten = new Map(((ps ?? []) as any[]).map((p) => [p.id as string, p.full_name as string]));
  return ids.map((id) => ({ nguoi: id, ten: ten.get(id) ?? null }));
}

/**
 * Làm đề mới cho kì khác từ phiên bản đã duyệt mới nhất của đề nguồn mà người dùng xem được. Kì đích phải có đặc tả đã xác nhận
 * và người dùng chưa có đề ở kì đó (không ghi đè). Kết quả là bản nháp để rà lại; đề nguồn giữ nguyên.
 */
export async function saoChepDe(maMon: string, kyNguon: string, kyDich: string): Promise<{ ban: BanDe; daChep: number; trong: number }> {
  kiemMonKy(maMon, kyNguon);
  kiemMonKy(maMon, kyDich);
  if (kyNguon === kyDich) throw new Error('Kì đích phải khác kì của đề nguồn.');
  const { supabase, orgId } = await layNguoiDung();
  const { data: dd, error: e1 } = await supabase.from('de_da_duyet').select('du_lieu').eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('ky_kiem_tra', kyNguon).order('duyet_luc', { ascending: false }).limit(1);
  if (e1) throw loiDe('Không đọc được đề nguồn', e1.message);
  const nguon = (dd ?? [])[0]?.du_lieu as DeKiemTra | undefined;
  if (!nguon) throw new Error('Chỉ làm đề mới từ đề đã được duyệt. Đề nguồn chưa có phiên bản đã duyệt.');
  const { de: daCo } = await layDe(maMon, kyDich);
  if (daCo) throw new Error('Kì đích đã có đề của bạn. App không ghi đè; mở đề đó ở bước 4 để sửa.');
  const { moiNhat } = await layDacTa(maMon, kyDich);
  if (!moiNhat || !moiNhat.duLieu || moiNhat.phienBan == null) throw new Error('Kì đích chưa có đặc tả đã xác nhận. Làm ma trận và đặc tả cho kì đó ở bước 2, 3 trước.');
  const { de, daChep, trong } = saoChepDeSangKyMoi(moiNhat.duLieu, moiNhat.phienBan, nguon);
  const { ban } = await luuDe(maMon, kyDich, moiNhat.id, de, 'BAN_NHAP');
  return { ban, daChep: daChep.length, trong: trong.length };
}

/**
 * Xóa đề theo mã. Người tạo xóa được đề của mình khi còn là bản nháp hoặc đã bị trả lại; Ban giám hiệu xóa được mọi đề trong trường.
 * Các phiên bản đã duyệt (de_da_duyet) luôn được giữ lại, và việc xóa được ghi vào lịch sử.
 */
export async function xoaDe(id: string): Promise<void> {
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase.from('de_kiem_tra').delete().eq('id', id).select('id');
  if (error) throw loiDe('Không xóa được đề', error.message);
  if (!data?.length) throw new Error('Không xóa được đề. Giáo viên chỉ xóa được đề mình tạo khi còn là bản nháp hoặc đã bị trả lại; đề đang xét duyệt hoặc đã duyệt cần Ban giám hiệu xử lý.');
}
