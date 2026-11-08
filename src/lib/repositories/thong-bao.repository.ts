/**
 * ThayKhaiEdu - Thông báo trong trường (bảng thong_bao, migration 20261108100000).
 * Mọi người trong trường đọc được; chỉ tổ trưởng, tổ phó, quản trị tạo.
 * Mỗi người tự đánh dấu đã đọc cho riêng mình.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface ThongBao {
  id: string;
  loai: string;
  tieuDe: string;
  noiDung: string;
  lienKet: string | null;
  luc: string;
  daDoc: boolean;
}

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  return { supabase, user, orgId: profile.organization_id as string };
}

/** 30 thông báo mới nhất của trường, kèm đã đọc hay chưa. */
export async function danhSachThongBao(): Promise<ThongBao[]> {
  const { supabase, user, orgId } = await layNguoiDung();
  const { data, error } = await supabase
    .from('thong_bao')
    .select('id, loai, tieu_de, noi_dung, lien_ket, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(`Không đọc được thông báo: ${error.message}`);
  const ds = data ?? [];
  if (ds.length === 0) return [];
  const { data: doc } = await supabase
    .from('thong_bao_da_doc')
    .select('thong_bao_id')
    .eq('user_id', user.id)
    .in('thong_bao_id', ds.map((r: any) => r.id));
  const daDoc = new Set((doc ?? []).map((r: any) => r.thong_bao_id));
  return ds.map((r: any) => ({
    id: r.id,
    loai: r.loai,
    tieuDe: r.tieu_de,
    noiDung: r.noi_dung,
    lienKet: r.lien_ket,
    luc: r.created_at,
    daDoc: daDoc.has(r.id),
  }));
}

/** Đánh dấu đã đọc (một hoặc nhiều thông báo) cho người đang đăng nhập. */
export async function danhDauDaDoc(ids: string[]): Promise<void> {
  const { supabase, user } = await layNguoiDung();
  const sach = [...new Set(ids)].slice(0, 100);
  if (sach.length === 0) return;
  const { error } = await supabase
    .from('thong_bao_da_doc')
    .upsert(sach.map((id) => ({ thong_bao_id: id, user_id: user.id })), { onConflict: 'thong_bao_id,user_id', ignoreDuplicates: true });
  if (error) throw new Error(`Không đánh dấu được: ${error.message}`);
}
