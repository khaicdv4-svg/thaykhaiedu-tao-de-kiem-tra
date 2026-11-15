/**
 * ThayKhaiEdu - Cài đặt hệ thống (dữ liệu thật): thông tin trường, năm học, tổ chuyên môn, người dùng.
 * Mọi kiểm tra quyền ghi do cơ sở dữ liệu làm (RLS + hàm dat_nam_hoc_hien_tai);
 * lớp này chỉ kiểm tra dữ liệu nhập và đổi lỗi sang lời dễ hiểu.
 */

import { layNguoiDung } from '@/lib/repositories/ma-tran-dac-ta.repository';

export interface ThongTinTruong {
  id: string; ma: string; ten: string; tinh: string; quan: string; diaChi: string; khoi: number[]; capNhat: string;
}
export interface NamHoc { id: string; ma: string; ten: string; batDau: string; ketThuc: string; hienTai: boolean }
export interface ToChuyenMon {
  id: string; ma: string; ten: string; moTa: string; khoi: number[];
  toTruongId: string | null; toPhoId: string | null; soThanhVien: number;
}
export interface NguoiDungTruong { id: string; ten: string; email: string; vaiTroGoc: string; vaiTro: string[]; khoi: number[]; hoatDong: boolean }

export interface DuLieuCaiDat {
  truong: ThongTinTruong | null;
  namHoc: NamHoc[];
  to: ToChuyenMon[];
  nguoiDung: NguoiDungTruong[];
  quyen: { laQuanTri: boolean; laBgh: boolean; suaTruong: boolean; suaNamHoc: boolean; suaTo: boolean };
}

const KHOI_HOP_LE = (ds: unknown): number[] => {
  if (!Array.isArray(ds)) throw new Error('Danh sách khối không hợp lệ.');
  const k = [...new Set(ds.map(Number))].filter((x) => Number.isInteger(x) && x >= 1 && x <= 5).sort();
  if (k.length === 0) throw new Error('Cần chọn ít nhất một khối (1–5).');
  return k;
};
const chu = (v: unknown, ten: string, toiDa = 255, batBuoc = true): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (batBuoc && !s) throw new Error(`Chưa nhập ${ten}.`);
  if (s.length > toiDa) throw new Error(`${ten[0].toUpperCase()}${ten.slice(1)} dài quá ${toiDa} ký tự.`);
  return s;
};
const ngay = (v: unknown, ten: string): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Ngày ${ten} chưa đúng dạng.`);
  return s;
};
/** Lỗi RLS (không có dòng nào được ghi) thành lời dễ hiểu. */
const chanQuyen = (viec: string) => new Error(`Tài khoản này chưa có quyền ${viec}.`);

export async function docCaiDat(): Promise<DuLieuCaiDat> {
  const { supabase, orgId, vaiTro } = await layNguoiDung();
  const co = (r: string) => vaiTro.includes(r);
  const laQuanTri = co('SYSTEM_ADMIN');
  const laBgh = co('SCHOOL_ADMIN') || co('SCHOOL_LEADERSHIP');

  const [org, nam, to, tv, ps, vt] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
    supabase.from('academic_years').select('*').order('start_date', { ascending: false }),
    supabase.from('professional_groups').select('*').eq('organization_id', orgId).order('code'),
    supabase.from('professional_group_members').select('group_id'),
    supabase.from('profiles').select('id, full_name, email, role, assigned_grade_ids, is_active').eq('organization_id', orgId).order('full_name'),
    supabase.from('user_roles').select('user_id, role, valid_from, valid_to').eq('organization_id', orgId),
  ]);
  if (org.error) throw new Error(`Không đọc được thông tin trường: ${org.error.message}`);

  const demTv = new Map<string, number>();
  for (const r of (tv.data ?? []) as { group_id: string }[]) demTv.set(r.group_id, (demTv.get(r.group_id) ?? 0) + 1);

  const bay = Date.now();
  const them = new Map<string, string[]>();
  for (const r of (vt.data ?? []) as { user_id: string; role: string; valid_from: string; valid_to: string | null }[]) {
    if (new Date(r.valid_from).getTime() > bay || (r.valid_to && new Date(r.valid_to).getTime() <= bay)) continue;
    them.set(r.user_id, [...(them.get(r.user_id) ?? []), r.role]);
  }

  const o = org.data as Record<string, any> | null;
  return {
    truong: o ? {
      id: o.id, ma: o.code ?? '', ten: o.name ?? '', tinh: o.province ?? '', quan: o.district ?? '',
      diaChi: o.address ?? '', khoi: o.active_grades ?? [1, 2, 3, 4, 5], capNhat: o.updated_at,
    } : null,
    namHoc: ((nam.data ?? []) as any[]).map((n) => ({ id: n.id, ma: n.code, ten: n.label, batDau: n.start_date, ketThuc: n.end_date, hienTai: !!n.is_current })),
    to: ((to.data ?? []) as any[]).map((g) => ({
      id: g.id, ma: g.code, ten: g.name, moTa: g.description ?? '', khoi: g.assigned_grade_ids ?? [],
      toTruongId: g.leader_user_id, toPhoId: g.deputy_leader_user_id, soThanhVien: demTv.get(g.id) ?? 0,
    })),
    nguoiDung: ((ps.data ?? []) as any[]).map((p) => ({
      id: p.id, ten: p.full_name, email: p.email, vaiTroGoc: p.role,
      vaiTro: [...new Set([p.role as string, ...(them.get(p.id) ?? [])])],
      khoi: p.assigned_grade_ids ?? [], hoatDong: p.is_active !== false,
    })),
    quyen: { laQuanTri, laBgh, suaTruong: laQuanTri || co('SCHOOL_ADMIN'), suaNamHoc: laQuanTri, suaTo: laQuanTri || co('SCHOOL_ADMIN') },
  };
}

export async function luuTruong(b: Record<string, unknown>): Promise<void> {
  const { supabase, orgId } = await layNguoiDung();
  const ban = {
    code: chu(b.ma, 'mã trường', 50),
    name: chu(b.ten, 'tên trường'),
    province: chu(b.tinh, 'tỉnh/thành phố', 100),
    district: chu(b.quan, 'quận/huyện/xã/phường', 100),
    address: chu(b.diaChi, 'địa chỉ', 500, false) || null,
    active_grades: KHOI_HOP_LE(b.khoi),
  };
  const { data, error } = await supabase.from('organizations').update(ban).eq('id', orgId).select('id');
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Mã trường đã có trường khác dùng.' : `Không lưu được: ${error.message}`);
  if (!data?.length) throw chanQuyen('sửa thông tin trường (cần quản trị hoặc Ban giám hiệu)');
}

export async function themNamHoc(b: Record<string, unknown>): Promise<void> {
  const { supabase } = await layNguoiDung();
  const batDau = ngay(b.batDau, 'bắt đầu');
  const ketThuc = ngay(b.ketThuc, 'kết thúc');
  if (ketThuc <= batDau) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
  const ma = `${batDau.slice(0, 4)}-${ketThuc.slice(0, 4)}`;
  const ten = chu(b.ten, 'tên năm học', 100, false) || `Năm học ${batDau.slice(0, 4)} - ${ketThuc.slice(0, 4)}`;
  const { data, error } = await supabase.from('academic_years').insert({ code: ma, label: ten, start_date: batDau, end_date: ketThuc, is_current: false }).select('id');
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? `Năm học ${ma} đã có.` : /row-level|policy/i.test(error.message) ? chanQuyen('thêm năm học (cần quản trị hệ thống)').message : `Không thêm được: ${error.message}`);
  if (!data?.length) throw chanQuyen('thêm năm học');
}

export async function suaNamHoc(b: Record<string, unknown>): Promise<void> {
  const { supabase } = await layNguoiDung();
  const id = chu(b.id, 'năm học', 64);
  const batDau = ngay(b.batDau, 'bắt đầu');
  const ketThuc = ngay(b.ketThuc, 'kết thúc');
  if (ketThuc <= batDau) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
  const { data, error } = await supabase.from('academic_years')
    .update({ label: chu(b.ten, 'tên năm học', 100), start_date: batDau, end_date: ketThuc }).eq('id', id).select('id');
  if (error) throw new Error(`Không lưu được: ${error.message}`);
  if (!data?.length) throw chanQuyen('sửa năm học (cần quản trị hệ thống)');
}

export async function datNamHienTai(id: unknown): Promise<void> {
  const { supabase } = await layNguoiDung();
  const { error } = await supabase.rpc('dat_nam_hoc_hien_tai', { p_id: chu(id, 'năm học', 64) });
  if (error) throw new Error(/Could not find|does not exist/i.test(error.message)
    ? 'Cơ sở dữ liệu chưa có hàm đặt năm học. Cần chạy migration 20261115160000_cai_dat_he_thong.sql.'
    : error.message);
}

export async function luuTo(b: Record<string, unknown>): Promise<void> {
  const { supabase, orgId } = await layNguoiDung();
  const ban = {
    name: chu(b.ten, 'tên tổ'),
    description: chu(b.moTa, 'mô tả', 1000, false) || null,
    assigned_grade_ids: KHOI_HOP_LE(b.khoi),
    leader_user_id: typeof b.toTruongId === 'string' && b.toTruongId ? b.toTruongId : null,
    deputy_leader_user_id: typeof b.toPhoId === 'string' && b.toPhoId ? b.toPhoId : null,
  };
  if (ban.leader_user_id && ban.leader_user_id === ban.deputy_leader_user_id) throw new Error('Tổ trưởng và tổ phó phải là hai người khác nhau.');
  if (typeof b.id === 'string' && b.id) {
    const { data, error } = await supabase.from('professional_groups').update(ban).eq('id', b.id).eq('organization_id', orgId).select('id');
    if (error) throw new Error(`Không lưu được tổ: ${error.message}`);
    if (!data?.length) throw chanQuyen('sửa tổ này');
    return;
  }
  const ma = chu(b.ma, 'mã tổ', 50).toUpperCase().replace(/\s+/g, '_');
  const { error } = await supabase.from('professional_groups').insert({ ...ban, code: ma, organization_id: orgId });
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? `Mã tổ ${ma} đã có.` : /row-level|policy/i.test(error.message) ? chanQuyen('thêm tổ (cần quản trị hoặc Ban giám hiệu)').message : `Không thêm được tổ: ${error.message}`);
}
