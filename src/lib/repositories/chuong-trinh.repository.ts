/**
 * ThayKhaiEdu - Kho chương trình GDPT 2018: tài liệu và YCCĐ dùng chung lớp 1–5 của trường.
 * Bảng: ct_tai_lieu, ct_yccd (migration 20261106190000). Xem cho mọi thành viên; ghi chỉ tổ trưởng / quản trị.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { LoaiTaiLieu, NguonTaiLieu, TaiLieuChuongTrinh, TrangThaiYccd, YccdChuongTrinh } from '@/core/chuong-trinh/mon';
import type { YccdDaKiem } from '@/core/chuong-trinh/trich-yccd';

const VAI_TRO_SUA = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  return { supabase, user, orgId: profile.organization_id as string, role: profile.role as string };
}

function canQuyenSua(role: string) {
  if (!VAI_TRO_SUA.includes(role)) throw new Error('Chỉ tổ trưởng hoặc quản trị mới được thực hiện thao tác này.');
}

interface DongTaiLieu {
  id: string; loai: LoaiTaiLieu; mon: string; lop: number | null; tieu_de: string; nguon: NguonTaiLieu;
  link: string | null; ten_file: string | null; so_ky_tu: number; ghi_chu: string | null; created_at: string;
}
const taiLieuTu = (r: DongTaiLieu): TaiLieuChuongTrinh => ({
  id: r.id, loai: r.loai, mon: r.mon, lop: r.lop, tieuDe: r.tieu_de, nguon: r.nguon, link: r.link,
  tenFile: r.ten_file, soKyTu: r.so_ky_tu, ghiChu: r.ghi_chu, taoLuc: r.created_at,
});

interface DongYccd {
  id: string; tai_lieu_id: string | null; mon: string; lop: number; mach: string | null; chu_de: string | null; bai: string | null;
  noi_dung: string; trich_dan: string | null; trich_khop: boolean; nguon: 'AI_TRICH' | 'NHAP_TAY'; trang_thai: TrangThaiYccd;
}
const yccdTu = (r: DongYccd): YccdChuongTrinh => ({
  id: r.id, taiLieuId: r.tai_lieu_id, mon: r.mon, lop: r.lop, mach: r.mach, chuDe: r.chu_de, bai: r.bai,
  noiDung: r.noi_dung, trichDan: r.trich_dan, trichKhop: r.trich_khop, nguon: r.nguon, trangThai: r.trang_thai,
});
const COT_YCCD = 'id, tai_lieu_id, mon, lop, mach, chu_de, bai, noi_dung, trich_dan, trich_khop, nguon, trang_thai';

export async function dsTaiLieu(): Promise<TaiLieuChuongTrinh[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase
    .from('ct_tai_lieu')
    .select('id, loai, mon, lop, tieu_de, nguon, link, ten_file, so_ky_tu, ghi_chu, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không đọc được danh sách tài liệu: ${error.message}`);
  const { data: dem } = await supabase.from('ct_yccd').select('tai_lieu_id').eq('organization_id', orgId).not('tai_lieu_id', 'is', null);
  const dd = new Map<string, number>();
  for (const d of dem ?? []) dd.set(d.tai_lieu_id as string, (dd.get(d.tai_lieu_id as string) ?? 0) + 1);
  return ((data ?? []) as DongTaiLieu[]).map((r) => ({ ...taiLieuTu(r), soYccd: dd.get(r.id) ?? 0 }));
}

export async function layTaiLieuDayDu(id: string): Promise<TaiLieuChuongTrinh & { noiDung: string }> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase
    .from('ct_tai_lieu')
    .select('id, loai, mon, lop, tieu_de, nguon, link, ten_file, so_ky_tu, ghi_chu, created_at, noi_dung')
    .eq('id', id).eq('organization_id', orgId).single();
  if (error || !data) throw new Error('Không tìm thấy tài liệu.');
  return { ...taiLieuTu(data as DongTaiLieu), noiDung: (data as { noi_dung: string }).noi_dung ?? '' };
}

export interface TaiLieuMoi {
  loai: LoaiTaiLieu; mon: string; lop: number | null; tieuDe: string; nguon: NguonTaiLieu;
  link?: string | null; tenFile?: string | null; noiDung: string; ghiChu?: string | null;
}

export async function themTaiLieu(t: TaiLieuMoi): Promise<TaiLieuChuongTrinh> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenSua(role);
  const { data, error } = await supabase.from('ct_tai_lieu').insert({
    organization_id: orgId, loai: t.loai, mon: t.mon, lop: t.lop, tieu_de: t.tieuDe.trim().slice(0, 300), nguon: t.nguon,
    link: t.link ?? null, ten_file: t.tenFile ?? null, noi_dung: t.noiDung, so_ky_tu: t.noiDung.length, ghi_chu: t.ghiChu ?? null, created_by: user.id,
  }).select('id, loai, mon, lop, tieu_de, nguon, link, ten_file, so_ky_tu, ghi_chu, created_at').single();
  if (error || !data) throw new Error(`Không lưu được tài liệu: ${error?.message ?? ''}`);
  return taiLieuTu(data as DongTaiLieu);
}

/** Xóa tài liệu; YCCĐ đã trích giữ lại (chỉ mất liên kết tài liệu). */
export async function xoaTaiLieu(id: string): Promise<void> {
  const { supabase, orgId, role } = await layNguoiDung();
  canQuyenSua(role);
  const { error } = await supabase.from('ct_tai_lieu').delete().eq('id', id).eq('organization_id', orgId);
  if (error) throw new Error(`Không xóa được: ${error.message}`);
}

export async function dsYccd(loc: { mon?: string; lop?: number; trangThai?: TrangThaiYccd; taiLieuId?: string }): Promise<YccdChuongTrinh[]> {
  const { supabase, orgId } = await layNguoiDung();
  let q = supabase.from('ct_yccd').select(COT_YCCD).eq('organization_id', orgId);
  if (loc.mon) q = q.eq('mon', loc.mon);
  if (loc.lop) q = q.eq('lop', loc.lop);
  if (loc.trangThai) q = q.eq('trang_thai', loc.trangThai);
  if (loc.taiLieuId) q = q.eq('tai_lieu_id', loc.taiLieuId);
  const { data, error } = await q.order('mach', { nullsFirst: false }).order('created_at').limit(2000);
  if (error) throw new Error(`Không đọc được YCCĐ: ${error.message}`);
  return ((data ?? []) as DongYccd[]).map(yccdTu);
}

const chuan = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Lưu YCCĐ AI trích vào hàng chờ duyệt; bỏ qua YCCĐ đã có (cùng môn, lớp, nội dung). */
export async function luuYccdTrich(p: { mon: string; lop: number; taiLieuId: string; ds: YccdDaKiem[] }): Promise<{ moi: number; trung: number }> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenSua(role);
  const { data: cu } = await supabase.from('ct_yccd').select('noi_dung').eq('organization_id', orgId).eq('mon', p.mon).eq('lop', p.lop).limit(5000);
  const daCo = new Set((cu ?? []).map((r) => chuan(r.noi_dung as string)));
  const them = p.ds.filter((y) => !daCo.has(chuan(y.noiDung)));
  if (them.length) {
    const { error } = await supabase.from('ct_yccd').insert(them.map((y) => ({
      organization_id: orgId, tai_lieu_id: p.taiLieuId, mon: p.mon, lop: p.lop, mach: y.mach, chu_de: y.chuDe, bai: y.bai,
      noi_dung: y.noiDung, trich_dan: y.trichDan, trich_khop: y.trichKhop, nguon: 'AI_TRICH', trang_thai: 'CHO_DUYET', created_by: user.id,
    })));
    if (error) throw new Error(`Không lưu được YCCĐ: ${error.message}`);
  }
  return { moi: them.length, trung: p.ds.length - them.length };
}

export async function themYccdTay(y: { mon: string; lop: number; mach?: string | null; chuDe?: string | null; bai?: string | null; noiDung: string }): Promise<YccdChuongTrinh> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenSua(role);
  const { data, error } = await supabase.from('ct_yccd').insert({
    organization_id: orgId, mon: y.mon, lop: y.lop, mach: y.mach || null, chu_de: y.chuDe || null, bai: y.bai || null,
    noi_dung: y.noiDung.trim(), nguon: 'NHAP_TAY', trang_thai: 'DA_DUYET', duyet_boi: user.id, duyet_luc: new Date().toISOString(), created_by: user.id,
  }).select(COT_YCCD).single();
  if (error || !data) throw new Error(`Không lưu được: ${error?.message ?? ''}`);
  return yccdTu(data as DongYccd);
}

export async function capNhatYccd(id: string, patch: { noiDung?: string; mach?: string | null; chuDe?: string | null; bai?: string | null; trangThai?: TrangThaiYccd }): Promise<void> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenSua(role);
  const cot: Record<string, unknown> = {};
  if (patch.noiDung !== undefined) {
    if (!patch.noiDung.trim()) throw new Error('Nội dung YCCĐ không được để trống.');
    cot.noi_dung = patch.noiDung.trim();
  }
  if (patch.mach !== undefined) cot.mach = patch.mach || null;
  if (patch.chuDe !== undefined) cot.chu_de = patch.chuDe || null;
  if (patch.bai !== undefined) cot.bai = patch.bai || null;
  if (patch.trangThai) {
    cot.trang_thai = patch.trangThai;
    cot.duyet_boi = patch.trangThai === 'CHO_DUYET' ? null : user.id;
    cot.duyet_luc = patch.trangThai === 'CHO_DUYET' ? null : new Date().toISOString();
  }
  const { error } = await supabase.from('ct_yccd').update(cot).eq('id', id).eq('organization_id', orgId);
  if (error) throw new Error(`Không cập nhật được: ${error.message}`);
}

/** Duyệt / từ chối nhiều YCCĐ một lần. */
export async function doiTrangThaiNhieu(ids: string[], trangThai: TrangThaiYccd): Promise<number> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  canQuyenSua(role);
  if (!ids.length) return 0;
  const { error } = await supabase.from('ct_yccd').update({
    trang_thai: trangThai, duyet_boi: trangThai === 'CHO_DUYET' ? null : user.id, duyet_luc: trangThai === 'CHO_DUYET' ? null : new Date().toISOString(),
  }).in('id', ids).eq('organization_id', orgId);
  if (error) throw new Error(`Không cập nhật được: ${error.message}`);
  return ids.length;
}

export async function xoaYccd(ids: string[]): Promise<void> {
  const { supabase, orgId, role } = await layNguoiDung();
  canQuyenSua(role);
  const { error } = await supabase.from('ct_yccd').delete().in('id', ids).eq('organization_id', orgId);
  if (error) throw new Error(`Không xóa được: ${error.message}`);
}
