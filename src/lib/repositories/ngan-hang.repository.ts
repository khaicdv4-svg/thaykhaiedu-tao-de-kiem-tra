/**
 * ThayKhaiEdu - Ngân hàng câu hỏi của trường (bảng ngan_hang_cau_hoi, migration 20261110100000).
 * Giáo viên lưu câu đã soạn để dùng lại; tổ trưởng, tổ phó, quản trị đánh dấu "đã kiểm định".
 */

import { createHash } from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CauDe, NoiDungCau } from '@/core/de/de';

const KHOI = 4;
const VAI_TRO_DUYET = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

export interface CauNganHang {
  id: string;
  maMon: string;
  muc: number;
  hinhThuc: 'TN' | 'TL';
  dang: string | null;
  yccd: string;
  chuDe: string;
  diemGoiY: number | null;
  noiDung: NoiDungCau;
  daKiemDinh: boolean;
  taoBoi: string | null;
  taoLuc: string;
  cuaToi: boolean;
}

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  const { data: vaiTro } = await supabase.rpc('get_auth_user_role');
  return { supabase, user, orgId: profile.organization_id as string, duocDuyet: VAI_TRO_DUYET.includes(String(vaiTro ?? '')) };
}

const chuanHoa = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Khóa chống trùng: cùng đề bài và cùng các phương án thì coi là một câu. */
export function khoaTrungCau(n: Pick<NoiDungCau, 'deBai' | 'luaChon'>): string {
  return createHash('sha256').update(chuanHoa(n.deBai) + '|' + n.luaChon.map(chuanHoa).join('|')).digest('hex').slice(0, 40);
}

const sang = (r: any, uid: string): CauNganHang => ({
  id: r.id, maMon: r.ma_mon, muc: r.muc, hinhThuc: r.hinh_thuc, dang: r.dang, yccd: r.yccd, chuDe: r.chu_de,
  diemGoiY: r.diem_goi_y == null ? null : Number(r.diem_goi_y), noiDung: r.noi_dung, daKiemDinh: r.da_kiem_dinh,
  taoBoi: r.tao_boi, taoLuc: r.created_at, cuaToi: r.tao_boi === uid,
});

export interface BoLoc { mon?: string; muc?: number; hinhThuc?: string; dang?: string; q?: string; chiDaKiemDinh?: boolean }

export async function danhSachNganHang(loc: BoLoc): Promise<{ cau: CauNganHang[]; duocDuyet: boolean }> {
  const { supabase, user, orgId, duocDuyet } = await layNguoiDung();
  let q = supabase.from('ngan_hang_cau_hoi').select('*').eq('organization_id', orgId).eq('khoi', KHOI);
  if (loc.mon) q = q.eq('ma_mon', loc.mon);
  if (loc.muc) q = q.eq('muc', loc.muc);
  if (loc.hinhThuc) q = q.eq('hinh_thuc', loc.hinhThuc);
  if (loc.dang) q = q.eq('dang', loc.dang);
  if (loc.chiDaKiemDinh) q = q.eq('da_kiem_dinh', true);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(300);
  if (error) {
    if (/ngan_hang_cau_hoi/.test(error.message) && /(does not exist|schema cache|Could not find)/i.test(error.message)) {
      throw new Error('Ngân hàng câu hỏi chưa được bật trên hệ thống (chưa chạy migration).');
    }
    throw new Error(`Không đọc được ngân hàng câu hỏi: ${error.message}`);
  }
  let ds = (data ?? []).map((r) => sang(r, user.id));
  const tu = chuanHoa(loc.q ?? '');
  if (tu) ds = ds.filter((c) => chuanHoa(`${c.noiDung.deBai} ${c.yccd} ${c.chuDe} ${c.noiDung.luaChon.join(' ')}`).includes(tu));
  return { cau: ds, duocDuyet };
}

/** Lưu một câu vào ngân hàng. Câu giống hệt (đề bài + phương án) đã có thì báo lại, không lưu thêm. */
export async function luuVaoNganHang(maMon: string, c: CauDe, chuDe: string): Promise<{ id: string; daCo: boolean }> {
  const { supabase, user, orgId } = await layNguoiDung();
  if (!c.deBai.trim()) throw new Error('Câu chưa có đề bài, chưa lưu được.');
  const noiDung: NoiDungCau = { deBai: c.deBai, luaChon: c.luaChon, dapAn: c.dapAn, huongDanCham: c.huongDanCham, ghiChuHinh: c.ghiChuHinh, hinh: c.hinh ?? [] };
  const khoa = khoaTrungCau(noiDung);
  const { data: co } = await supabase.from('ngan_hang_cau_hoi').select('id').eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', maMon).eq('khoa_trung', khoa).maybeSingle();
  if (co) return { id: co.id as string, daCo: true };
  const { data, error } = await supabase.from('ngan_hang_cau_hoi').insert({
    organization_id: orgId, khoi: KHOI, ma_mon: maMon, muc: c.muc, hinh_thuc: c.hinhThuc, dang: c.dang, yccd: c.yccd,
    chu_de: chuDe.slice(0, 200), diem_goi_y: c.diem, noi_dung: noiDung, khoa_trung: khoa, tao_boi: user.id,
  }).select('id').single();
  if (error) throw new Error(`Không lưu được vào ngân hàng: ${error.message}`);
  return { id: data.id as string, daCo: false };
}

export async function datKiemDinh(id: string, daKiemDinh: boolean): Promise<void> {
  const { supabase, orgId, duocDuyet } = await layNguoiDung();
  if (!duocDuyet) throw new Error('Chỉ tổ trưởng, tổ phó hoặc quản trị mới đánh dấu đã kiểm định.');
  const { error } = await supabase.from('ngan_hang_cau_hoi').update({ da_kiem_dinh: daKiemDinh }).eq('id', id).eq('organization_id', orgId);
  if (error) throw new Error(`Không cập nhật được: ${error.message}`);
}

export async function xoaKhoiNganHang(id: string): Promise<void> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('ngan_hang_cau_hoi').delete().eq('id', id).eq('organization_id', orgId).select('id');
  if (error) throw new Error(`Không xóa được: ${error.message}`);
  if (!data?.length) throw new Error('Không xóa được: chỉ người lưu câu này, tổ trưởng, tổ phó hoặc quản trị mới xóa.');
}
