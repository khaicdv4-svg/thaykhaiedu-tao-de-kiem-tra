/**
 * ThayKhaiEdu - Đọc trạng thái và đồng bộ PPCT từ kho chung PPCT HUB.
 * Kho chung nằm cùng cơ sở dữ liệu Supabase (bảng ppct_sb_*), Xưởng chỉ đọc.
 * Việc ghi lịch tiết về Xưởng do hàm tao_de_dong_bo_ppct_hub làm, hàm tự kiểm tra quyền tổ trưởng.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { docDongTrangThai, tongHopTrangThai, type KetQuaTrangThaiHub } from '@/core/curriculum/ppct-hub-ket-noi';

export const NAM_HOC_MAC_DINH = '2026-2027';

export async function layTrangThaiHub(namHoc = NAM_HOC_MAC_DINH): Promise<KetQuaTrangThaiHub> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ...tongHopTrangThai([], namHoc), ketNoi: 'CHUA_CAU_HINH', loi: 'Chưa cấu hình Supabase nên chưa nối được kho chung.' };
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ...tongHopTrangThai([], namHoc), ketNoi: 'MAT_KET_NOI', loi: 'Cần đăng nhập để xem kho chung.' };
  }
  const { data, error } = await supabase.rpc('tao_de_trang_thai_hub', { p_nam_hoc: namHoc });
  if (error) {
    return { ...tongHopTrangThai([], namHoc), ketNoi: 'MAT_KET_NOI', loi: `Không đọc được kho chung: ${error.message}` };
  }
  const kq = tongHopTrangThai(((data ?? []) as Record<string, unknown>[]).map(docDongTrangThai), namHoc);
  if (kq.mon.length === 0) kq.loi = 'Kho chung chưa có bản PPCT nào được công bố cho năm học này.';
  return kq;
}

export interface KetQuaDongBo {
  subjectId: string;
  tenMon: string;
  soTiet: number;
  phienBan: string | null;
}

export async function dongBoTuHub(lop: number, mon: string | null, namHoc = NAM_HOC_MAC_DINH): Promise<KetQuaDongBo[]> {
  if (!Number.isInteger(lop) || lop < 1 || lop > 5) throw new Error('Lớp phải từ 1 đến 5.');
  if (mon !== null && !/^subj-[a-z]{1,20}[1-5]$/.test(mon)) throw new Error('Mã môn không đúng dạng của PPCT HUB.');
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data, error } = await supabase.rpc('tao_de_dong_bo_ppct_hub', { p_lop: lop, p_mon: mon, p_nam_hoc: namHoc });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    subjectId: String(r.subject_id),
    tenMon: String(r.ten_mon ?? r.subject_id),
    soTiet: Number(r.so_tiet ?? 0),
    phienBan: (r.version_tag as string | null) ?? null,
  }));
}
