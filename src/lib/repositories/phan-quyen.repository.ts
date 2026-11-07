/**
 * ThayKhaiEdu - Phân quyền: vai trò cấp thêm (nhiều vai trò, có phạm vi và thời hạn) và ủy quyền có thời hạn.
 * Mọi kiểm tra quyền do cơ sở dữ liệu thực hiện (RLS và trigger); lớp này chỉ gọi và đổi lỗi sang lời dễ hiểu.
 */

import { layNguoiDung } from '@/lib/repositories/ma-tran-dac-ta.repository';

export const VAI_TRO_HE_THONG = ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_LEADERSHIP', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'] as const;
export const HANH_DONG_UY_QUYEN = ['BAT_DAU_THAM_DINH', 'YEU_CAU_CHINH_SUA', 'XAC_NHAN_TO', 'CHUYEN_BGH'] as const;

export interface QuyenCuaToi {
  vaiTro: string[];
  laQuanTri: boolean;
  laBgh: boolean;
  laToTruong: boolean;
  /** Được soạn đề (giáo viên, tổ trưởng, tổ phó, Ban giám hiệu). Quản trị viên đơn thuần thì không. */
  duocSoanDe: boolean;
  /** Được giao ủy quyền (tổ trưởng hoặc Ban giám hiệu). */
  duocUyQuyen: boolean;
  /** Được phân công người thẩm định cho đề. */
  duocPhanCong: boolean;
}

export async function quyenCuaToi(): Promise<QuyenCuaToi> {
  const { vaiTro } = await layNguoiDung();
  const co = (r: string) => vaiTro.includes(r);
  const laBgh = co('SCHOOL_LEADERSHIP') || co('SCHOOL_ADMIN');
  const laToTruong = co('GROUP_LEADER');
  return {
    vaiTro,
    laQuanTri: co('SYSTEM_ADMIN'),
    laBgh,
    laToTruong,
    duocSoanDe: co('TEACHER') || co('GROUP_LEADER') || co('DEPUTY_GROUP_LEADER') || laBgh,
    duocUyQuyen: laToTruong || laBgh,
    duocPhanCong: laToTruong || laBgh,
  };
}

export interface ThanhVien { id: string; ten: string; vaiTroGoc: string; vaiTro: string[] }

/** Thành viên đang hoạt động của trường (để chọn người thẩm định, người nhận chia sẻ hoặc ủy quyền). */
export async function dsThanhVien(): Promise<ThanhVien[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('profiles').select('id, full_name, role, is_active').eq('organization_id', orgId).order('full_name');
  if (error) throw new Error(`Không đọc được danh sách thành viên: ${error.message}`);
  const { data: vt } = await supabase.from('user_roles').select('user_id, role, valid_from, valid_to');
  const bay = Date.now();
  const them = new Map<string, string[]>();
  for (const r of (vt ?? []) as any[]) {
    if (new Date(r.valid_from).getTime() > bay || (r.valid_to && new Date(r.valid_to).getTime() <= bay)) continue;
    them.set(r.user_id, [...(them.get(r.user_id) ?? []), r.role]);
  }
  return ((data ?? []) as any[]).filter((p) => p.is_active !== false).map((p) => ({ id: p.id, ten: p.full_name, vaiTroGoc: p.role, vaiTro: [...new Set([p.role, ...(them.get(p.id) ?? [])])] }));
}

export interface DongVaiTro { id: string; userId: string; ten: string | null; vaiTro: string; khoi: number | null; tu: string; den: string | null; lyDo: string }

export async function dsVaiTroCapThem(): Promise<DongVaiTro[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('user_roles').select('id, user_id, role, pham_vi_khoi, valid_from, valid_to, ly_do').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (error) throw new Error(`Không đọc được vai trò: ${error.message}`);
  const ids = [...new Set(((data ?? []) as any[]).map((r) => r.user_id))];
  const ten = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids);
    for (const p of (ps ?? []) as any[]) ten.set(p.id, p.full_name);
  }
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, userId: r.user_id, ten: ten.get(r.user_id) ?? null, vaiTro: r.role, khoi: r.pham_vi_khoi, tu: r.valid_from, den: r.valid_to, lyDo: r.ly_do }));
}

export async function capVaiTro(userId: string, vaiTro: string, khoi: number | null, den: string | null, lyDo: string): Promise<void> {
  if (!(VAI_TRO_HE_THONG as readonly string[]).includes(vaiTro)) throw new Error('Vai trò không hợp lệ.');
  if (!lyDo.trim()) throw new Error('Cần ghi lý do cấp vai trò.');
  const { supabase, user, orgId } = await layNguoiDung();
  const { error } = await supabase.from('user_roles').insert({
    organization_id: orgId, user_id: userId, role: vaiTro, pham_vi_khoi: khoi, valid_to: den ? new Date(den).toISOString() : null, ly_do: lyDo.trim().slice(0, 500), granted_by: user.id,
  });
  if (error) throw new Error(/row-level security/.test(error.message) ? 'Chỉ quản trị viên hệ thống mới cấp vai trò.' : error.message);
}

export async function thuHoiVaiTro(id: string): Promise<void> {
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase.from('user_roles').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Chỉ quản trị viên hệ thống mới thu hồi vai trò.');
}

export interface DongUyQuyen { id: string; giao: string | null; nhan: string | null; nguoiGiao: string; nguoiNhan: string; hanhDong: string[]; khoi: number | null; tu: string; den: string; lyDo: string; thuHoi: boolean }

export async function dsUyQuyen(): Promise<DongUyQuyen[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('uy_quyen').select('id, nguoi_giao, nguoi_nhan, hanh_dong, pham_vi_khoi, tu, den, ly_do, thu_hoi').eq('organization_id', orgId).order('tao_luc', { ascending: false });
  if (error) throw new Error(`Không đọc được ủy quyền: ${error.message}`);
  const ids = [...new Set(((data ?? []) as any[]).flatMap((r) => [r.nguoi_giao, r.nguoi_nhan]))];
  const ten = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids);
    for (const p of (ps ?? []) as any[]) ten.set(p.id, p.full_name);
  }
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, giao: ten.get(r.nguoi_giao) ?? null, nhan: ten.get(r.nguoi_nhan) ?? null, nguoiGiao: r.nguoi_giao, nguoiNhan: r.nguoi_nhan, hanhDong: r.hanh_dong, khoi: r.pham_vi_khoi, tu: r.tu, den: r.den, lyDo: r.ly_do, thuHoi: r.thu_hoi }));
}

export async function giaoUyQuyen(nguoiNhan: string, hanhDong: string[], khoi: number | null, den: string, lyDo: string): Promise<void> {
  if (!hanhDong.length || !hanhDong.every((h) => (HANH_DONG_UY_QUYEN as readonly string[]).includes(h))) throw new Error('Chỉ ủy quyền được: bắt đầu thẩm định, yêu cầu chỉnh sửa, xác nhận cấp tổ, chuyển Ban giám hiệu. Không ủy quyền được phê duyệt cuối cùng.');
  if (!lyDo.trim()) throw new Error('Cần ghi lý do ủy quyền.');
  const hetHan = new Date(den);
  if (Number.isNaN(hetHan.getTime()) || hetHan.getTime() <= Date.now()) throw new Error('Ngày hết hạn phải ở tương lai.');
  const { supabase, user, orgId } = await layNguoiDung();
  const { error } = await supabase.from('uy_quyen').insert({ organization_id: orgId, nguoi_giao: user.id, nguoi_nhan: nguoiNhan, hanh_dong: hanhDong, pham_vi_khoi: khoi, den: hetHan.toISOString(), ly_do: lyDo.trim().slice(0, 500) });
  if (error) throw new Error(error.message);
}

export async function thuHoiUyQuyen(id: string): Promise<void> {
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase.from('uy_quyen').update({ thu_hoi: true }).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Chỉ người giao quyền hoặc Ban giám hiệu mới thu hồi.');
}
