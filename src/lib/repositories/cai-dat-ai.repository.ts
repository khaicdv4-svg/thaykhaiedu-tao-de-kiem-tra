/**
 * ThayKhaiEdu - Đọc / lưu cấu hình AI của trường (bảng ai_settings, migration 20261105121907_cai_dat_ai).
 * CHỈ dùng ở máy chủ.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  chonModelChoViec,
  duoiKhoa,
  kiemTraCauHinh,
  lamSachModels,
  lamSachPhanViec,
  type CauHinhAI,
  type CauHinhAIHienThi,
  type ModelAI,
  type ViecAI,
} from '@/core/services/ai/cau-hinh-ai';
import { coBiMatMayChu, giaiMaKhoa, maHoaKhoa } from '@/lib/ai/ma-hoa-khoa';
import { goiModel, thuModel, type KetQuaAI, type YeuCauAI } from '@/lib/ai/goi-ai';

export const VAI_TRO_SUA_AI = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

export class LoiQuyen extends Error {}

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new LoiQuyen('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  return { supabase, user, orgId: profile.organization_id as string, role: profile.role as string };
}

async function layNguoiSua() {
  const nd = await layNguoiDung();
  if (!VAI_TRO_SUA_AI.includes(nd.role)) throw new LoiQuyen('Chỉ tổ trưởng được xem và sửa Cài đặt AI.');
  return nd;
}

async function docDong(supabase: Awaited<ReturnType<typeof layNguoiDung>>['supabase'], orgId: string) {
  const { data, error } = await supabase
    .from('ai_settings')
    .select('key_ciphertext, key_last4, models, routes, updated_at')
    .eq('organization_id', orgId)
    .maybeSingle();
  if (error) throw new Error(`Không đọc được Cài đặt AI: ${error.message}`);
  return data as { key_ciphertext: string | null; key_last4: string | null; models: unknown; routes: unknown; updated_at: string } | null;
}

/** Cho trang Cài đặt AI (tổ trưởng). Không trả khóa. */
export async function docCauHinhHienThi(): Promise<CauHinhAIHienThi> {
  const { supabase, orgId } = await layNguoiSua();
  const d = await docDong(supabase, orgId);
  return {
    models: lamSachModels(d?.models),
    phanViec: lamSachPhanViec(d?.routes),
    coKhoa: !!d?.key_ciphertext,
    khoaDuoi: d?.key_last4 ?? null,
    coBiMatMayChu: coBiMatMayChu(),
    capNhatLuc: d?.updated_at ?? null,
  };
}

export interface DuLieuLuu {
  models: unknown;
  phanViec: unknown;
  /** Khóa mới (để trống: giữ khóa cũ). */
  khoaMoi?: string;
  xoaKhoa?: boolean;
}

export async function luuCauHinh(dl: DuLieuLuu): Promise<CauHinhAIHienThi> {
  const { supabase, user, orgId } = await layNguoiSua();
  const cauHinh: CauHinhAI = { models: lamSachModels(dl.models), phanViec: lamSachPhanViec(dl.phanViec) };
  const loi = kiemTraCauHinh(cauHinh);
  if (loi.length) throw new Error(loi.join('\n'));

  const dong: Record<string, unknown> = {
    organization_id: orgId,
    models: cauHinh.models,
    routes: cauHinh.phanViec,
    updated_by: user.id,
  };
  const khoa = dl.khoaMoi?.trim();
  if (khoa) {
    if (khoa.length < 10 || /\s/.test(khoa)) throw new Error('Khóa API có vẻ không đúng (quá ngắn hoặc có khoảng trắng).');
    dong.key_ciphertext = maHoaKhoa(khoa);
    dong.key_last4 = duoiKhoa(khoa);
  } else if (dl.xoaKhoa) {
    dong.key_ciphertext = null;
    dong.key_last4 = null;
  }
  const { error } = await supabase.from('ai_settings').upsert(dong, { onConflict: 'organization_id' });
  if (error) throw new Error(`Không lưu được Cài đặt AI: ${error.message}`);
  return docCauHinhHienThi();
}

/** Khóa đang lưu (đã giải mã) — chỉ dùng trong máy chủ. */
async function layKhoaDaLuu(): Promise<{ cauHinh: CauHinhAI; khoa: string | null }> {
  const { supabase, orgId } = await layNguoiDung();
  const d = await docDong(supabase, orgId);
  const cauHinh = { models: lamSachModels(d?.models), phanViec: lamSachPhanViec(d?.routes) };
  if (!d?.key_ciphertext || !coBiMatMayChu()) return { cauHinh, khoa: null };
  return { cauHinh, khoa: giaiMaKhoa(d.key_ciphertext) };
}

/** Trạng thái để giao diện biết nút AI bấm được chưa. Không lộ khóa. */
export async function trangThaiViecAI(viec: ViecAI): Promise<{ daCauHinh: boolean; model: string | null; lyDo?: string }> {
  try {
    const { supabase, orgId } = await layNguoiDung();
    const d = await docDong(supabase, orgId);
    const cauHinh = { models: lamSachModels(d?.models), phanViec: lamSachPhanViec(d?.routes) };
    const m = chonModelChoViec(cauHinh, viec);
    if (!d?.key_ciphertext) return { daCauHinh: false, model: null, lyDo: 'Tổ trưởng chưa nhập khóa API ở trang Cài đặt AI.' };
    if (!coBiMatMayChu()) return { daCauHinh: false, model: null, lyDo: 'Máy chủ chưa có AI_KHOA_BI_MAT.' };
    if (!m) return { daCauHinh: false, model: null, lyDo: 'Chưa chọn model cho việc này ở trang Cài đặt AI.' };
    return { daCauHinh: true, model: m.ten };
  } catch (e) {
    return { daCauHinh: false, model: null, lyDo: (e as Error).message };
  }
}

/** Gọi AI cho một việc: tự chọn model theo Cài đặt AI của trường. */
export async function goiAITheoViec(viec: ViecAI, yeuCau: YeuCauAI): Promise<KetQuaAI & { model: ModelAI }> {
  const { cauHinh, khoa } = await layKhoaDaLuu();
  if (!khoa) throw new Error('Chưa cấu hình khóa AI. Tổ trưởng vào Cài đặt AI để nhập khóa.');
  const m = chonModelChoViec(cauHinh, viec);
  if (!m) throw new Error('Chưa chọn model cho việc này. Tổ trưởng vào Cài đặt AI để chọn.');
  const kq = await goiModel(m, khoa, yeuCau);
  return { ...kq, model: m };
}

/** Thử một model (tổ trưởng). Dùng khóa vừa gõ nếu có, không thì khóa đã lưu. */
export async function thuModelBangKhoa(model: unknown, khoaVuaGo?: string): Promise<KetQuaAI> {
  await layNguoiSua();
  const [m] = lamSachModels([model]);
  const loi = kiemTraCauHinh({ models: [m], phanViec: { MAC_DINH: m.id } });
  if (loi.length) throw new Error(loi.join('\n'));
  let khoa = khoaVuaGo?.trim() || null;
  if (!khoa) khoa = (await layKhoaDaLuu()).khoa;
  if (!khoa) throw new Error('Chưa có khóa API. Nhập khóa ở mục 1 rồi bấm Kiểm tra.');
  return thuModel(m, khoa);
}
