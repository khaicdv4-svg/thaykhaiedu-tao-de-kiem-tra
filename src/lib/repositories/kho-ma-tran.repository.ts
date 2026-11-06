/**
 * ThayKhaiEdu - Kho ma trận của tổ (bảng tai_lieu_ma_tran, migration 20261106140000).
 * Mọi thành viên trong trường đọc được. Tổ trưởng, tổ phó, quản trị tải lên.
 * Chỉ tổ trưởng và quản trị xác nhận. Bản đã xác nhận không sửa, không xóa.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DANH_SACH_KY_MA_TRAN, DANH_SACH_MON, type KyMaTran, type LoaiMaTranTo } from '@/core/kho-ma-tran/phan-loai';

const KHOI = 4;
const VAI_TRO_TAI = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const VAI_TRO_XAC_NHAN = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
export const SO_KY_TU_TOI_DA = 500_000;

export interface TaiLieuMaTran {
  id: string;
  loai: LoaiMaTranTo;
  maMon: string;
  ky: KyMaTran | null;
  phienBan: number;
  tenFile: string;
  duongDan: string | null;
  kichThuoc: number | null;
  soKyTu: number;
  trangThai: 'CHO_XAC_NHAN' | 'DA_XAC_NHAN';
  taiLenLuc: string;
  xacNhanLuc: string | null;
}

export interface FileTaiLen {
  loai: LoaiMaTranTo;
  maMon: string;
  ky: KyMaTran | null;
  tenFile: string;
  duongDan?: string;
  kichThuoc?: number;
  noiDung: string;
}

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  return { supabase, user, orgId: profile.organization_id as string, role: profile.role as string };
}

const COT = 'id, loai, ma_mon, ky_kiem_tra, phien_ban, ten_file, duong_dan, kich_thuoc, trang_thai, created_at, xac_nhan_luc, so_ky_tu';

function sangDoiTuong(r: any): TaiLieuMaTran {
  return {
    id: r.id,
    loai: r.loai,
    maMon: r.ma_mon,
    ky: r.ky_kiem_tra,
    phienBan: r.phien_ban,
    tenFile: r.ten_file,
    duongDan: r.duong_dan,
    kichThuoc: r.kich_thuoc,
    soKyTu: r.so_ky_tu ?? 0,
    trangThai: r.trang_thai,
    taiLenLuc: r.created_at,
    xacNhanLuc: r.xac_nhan_luc,
  };
}

/** Kiểm tra một file trước khi lưu. Trả về lỗi (rỗng = hợp lệ). */
export function kiemTraFileTaiLen(f: FileTaiLen): string | null {
  if (f.loai !== 'CA_NAM' && f.loai !== 'CHUNG') return 'Loại ma trận không hợp lệ.';
  if (!DANH_SACH_MON.some((m) => m.ma === f.maMon)) return 'Chưa chọn môn.';
  if (f.loai === 'CHUNG' && !DANH_SACH_KY_MA_TRAN.some((k) => k.ma === f.ky)) return 'Ma trận chung phải chọn kì.';
  if (!f.tenFile?.trim()) return 'Thiếu tên file.';
  if (!f.noiDung?.trim()) return 'File không có chữ (có thể là ảnh chụp hoặc file hỏng).';
  if (f.noiDung.length > SO_KY_TU_TOI_DA) return 'File quá dài.';
  return null;
}

/** Danh sách file của một loại (không kèm nội dung, chỉ số ký tự). */
export async function danhSachTaiLieu(loai: LoaiMaTranTo): Promise<TaiLieuMaTran[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase
    .from('tai_lieu_ma_tran')
    .select(COT)
    .eq('organization_id', orgId)
    .eq('khoi', KHOI)
    .eq('loai', loai)
    .order('ma_mon')
    .order('phien_ban', { ascending: false });
  if (error) throw new Error(`Không đọc được kho ma trận: ${error.message}`);
  return (data ?? []).map(sangDoiTuong);
}

/** Nội dung chữ của một file (để xem và để các phần khác đọc). */
export async function noiDungTaiLieu(id: string): Promise<{ tenFile: string; noiDung: string }> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('tai_lieu_ma_tran').select('ten_file, noi_dung').eq('organization_id', orgId).eq('id', id).single();
  if (error || !data) throw new Error('Không tìm thấy file.');
  return { tenFile: data.ten_file, noiDung: data.noi_dung };
}

/** Lưu nhiều file. Mỗi file là phiên bản mới của ô (môn × kì). Trả về kết quả từng file. */
export async function luuNhieuFile(ds: FileTaiLen[]): Promise<{ tenFile: string; ok: boolean; loi?: string; phienBan?: number }[]> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_TAI.includes(role)) throw new Error('Chỉ tổ trưởng, tổ phó hoặc quản trị mới được tải ma trận lên.');
  if (ds.length === 0) return [];
  if (ds.length > 60) throw new Error('Mỗi lần tải tối đa 60 file.');

  const kq: { tenFile: string; ok: boolean; loi?: string; phienBan?: number }[] = [];
  for (const f of ds) {
    const loi = kiemTraFileTaiLen(f);
    if (loi) { kq.push({ tenFile: f.tenFile, ok: false, loi }); continue; }
    const ky = f.loai === 'CHUNG' ? f.ky : null;

    let q = supabase.from('tai_lieu_ma_tran').select('phien_ban').eq('organization_id', orgId).eq('khoi', KHOI).eq('loai', f.loai).eq('ma_mon', f.maMon);
    q = ky ? q.eq('ky_kiem_tra', ky) : q.is('ky_kiem_tra', null);
    const { data: cu } = await q.order('phien_ban', { ascending: false }).limit(1);
    const phienBan = (cu?.[0]?.phien_ban ?? 0) + 1;

    const { error } = await supabase.from('tai_lieu_ma_tran').insert({
      organization_id: orgId,
      khoi: KHOI,
      loai: f.loai,
      ma_mon: f.maMon,
      ky_kiem_tra: ky,
      phien_ban: phienBan,
      ten_file: f.tenFile.slice(0, 300),
      duong_dan: f.duongDan?.slice(0, 1000) ?? null,
      kich_thuoc: typeof f.kichThuoc === 'number' ? Math.round(f.kichThuoc) : null,
      noi_dung: f.noiDung,
      tai_len_boi: user.id,
    });
    kq.push(error ? { tenFile: f.tenFile, ok: false, loi: error.message } : { tenFile: f.tenFile, ok: true, phienBan });
  }
  return kq;
}

export async function xacNhanTaiLieu(id: string): Promise<void> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_XAC_NHAN.includes(role)) throw new Error('Chỉ tổ trưởng hoặc quản trị mới được xác nhận ma trận.');
  const { data, error } = await supabase
    .from('tai_lieu_ma_tran')
    .update({ trang_thai: 'DA_XAC_NHAN', xac_nhan_boi: user.id, xac_nhan_luc: new Date().toISOString() })
    .eq('organization_id', orgId)
    .eq('id', id)
    .eq('trang_thai', 'CHO_XAC_NHAN')
    .select('id');
  if (error) throw new Error(`Không xác nhận được: ${error.message}`);
  if (!data?.length) throw new Error('File không còn ở trạng thái chờ xác nhận.');
}

export async function xoaTaiLieuChuaXacNhan(id: string): Promise<void> {
  const { supabase, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_TAI.includes(role)) throw new Error('Không có quyền xóa.');
  const { data, error } = await supabase
    .from('tai_lieu_ma_tran')
    .delete()
    .eq('organization_id', orgId)
    .eq('id', id)
    .eq('trang_thai', 'CHO_XAC_NHAN')
    .select('id');
  if (error) throw new Error(`Không xóa được: ${error.message}`);
  if (!data?.length) throw new Error('Chỉ xóa được file chưa xác nhận.');
}
