/** Kiểm tra quyền nạp mục lục và kho sách (do cơ sở dữ liệu quyết định). */
import type { SupabaseClient } from '@supabase/supabase-js';

/** Tổ trưởng, tổ phó, quản trị, hoặc giáo viên được tổ trưởng tích quyền nạp mục lục và kho sách. */
export async function canQuyenSua(supabase: SupabaseClient) {
  const { data } = await supabase.rpc('co_quyen_ghi', { p_quyen: 'NAP_MUC_LUC_SACH' });
  if (data !== true) throw new Error('Bạn chưa được cấp quyền nạp mục lục và kho sách. Nhờ tổ trưởng tích quyền này cho bạn.');
}
