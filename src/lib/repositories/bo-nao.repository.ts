/**
 * ThayKhaiEdu - Bộ não chuyên môn: đọc cho mọi thành viên, chỉ tổ trưởng / quản trị được sửa.
 * Bảng: bo_nao_chuyen_mon (migration 20261106000001).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { boNaoTrong, lamSachBaiMach, lamSachBoNao, type BoNao } from '@/core/bo-nao/bo-nao';

const KHOI = 4;
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

/** Bộ não của trường; chưa có thì trả về bộ não trống (app dùng số mặc định). */
export async function docBoNao(): Promise<BoNao> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('bo_nao_chuyen_mon').select('du_lieu').eq('organization_id', orgId).eq('khoi', KHOI).maybeSingle();
  if (error) throw new Error(`Không đọc được Bộ não chuyên môn: ${error.message}`);
  return data ? lamSachBoNao(data.du_lieu) : boNaoTrong();
}

/** Dùng trong các route khác: lỗi thì coi như chưa có, không làm hỏng việc đang làm. */
export async function docBoNaoNeuCo(): Promise<BoNao | null> {
  try {
    return await docBoNao();
  } catch {
    return null;
  }
}

export async function luuBoNao(du: unknown): Promise<BoNao> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_SUA.includes(role)) throw new Error('Chỉ tổ trưởng hoặc quản trị mới được sửa Bộ não chuyên môn.');
  const sach = lamSachBoNao(du);
  // Trang Bộ não không gửi bảng Bài → Mạch: giữ nguyên bảng đang lưu
  if (!sach.baiMach) {
    const { data: cu } = await supabase.from('bo_nao_chuyen_mon').select('du_lieu').eq('organization_id', orgId).eq('khoi', KHOI).maybeSingle();
    const bm = lamSachBaiMach((cu?.du_lieu as Record<string, unknown> | undefined)?.baiMach);
    if (Object.keys(bm).length) sach.baiMach = bm;
  }
  const { error } = await supabase
    .from('bo_nao_chuyen_mon')
    .upsert({ organization_id: orgId, khoi: KHOI, du_lieu: sach, updated_by: user.id }, { onConflict: 'organization_id,khoi' });
  if (error) throw new Error(`Không lưu được: ${error.message}`);
  return sach;
}

/** Bảng Bài → Mạch của một môn (mọi thành viên đọc được). */
export async function docBaiMach(maMon: string): Promise<Record<string, string>> {
  return (await docBoNao()).baiMach?.[maMon] ?? {};
}

/** Lưu bảng Bài → Mạch của một môn. Chỉ tổ trưởng, quản trị. Không đụng phần khác của Bộ não. */
export async function luuBaiMach(maMon: string, bang: Record<string, string>): Promise<Record<string, string>> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_SUA.includes(role)) throw new Error('Chỉ tổ trưởng hoặc quản trị mới được xếp bài vào mạch.');
  if (!/^[A-Z_]{2,20}$/.test(maMon)) throw new Error('Môn không hợp lệ.');
  const { data: cu, error: e1 } = await supabase.from('bo_nao_chuyen_mon').select('du_lieu').eq('organization_id', orgId).eq('khoi', KHOI).maybeSingle();
  if (e1) throw new Error(`Không đọc được Bộ não chuyên môn: ${e1.message}`);
  const du = { ...((cu?.du_lieu as Record<string, unknown>) ?? boNaoTrong()) };
  const tatCa = lamSachBaiMach(du.baiMach);
  const moi = lamSachBaiMach({ [maMon]: bang })[maMon] ?? {};
  if (Object.keys(moi).length) tatCa[maMon] = moi; else delete tatCa[maMon];
  du.baiMach = tatCa;
  const { error } = await supabase
    .from('bo_nao_chuyen_mon')
    .upsert({ organization_id: orgId, khoi: KHOI, du_lieu: du, updated_by: user.id }, { onConflict: 'organization_id,khoi' });
  if (error) throw new Error(`Không lưu được: ${error.message}`);
  return moi;
}
