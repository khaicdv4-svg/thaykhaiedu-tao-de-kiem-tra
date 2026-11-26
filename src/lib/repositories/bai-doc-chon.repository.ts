/**
 * ThayKhaiEdu - Bài đọc Tiếng Việt chọn ở bước 1 (bảng bai_doc_chon, migration 20261126180000).
 * Mỗi người một bộ cho từng khối, kì. Chưa chọn ở bước 1 mà đề cũ đã có bài đọc thì trả bài trong đề.
 */

import { layKhoiLamViec } from '@/lib/khoi-lam-viec.server';
import { layNguoiDung } from '@/lib/repositories/ma-tran-dac-ta.repository';
import { baiDocChonTuDe, lamSachBaiDocChon, type BaiDocChon, type NoiDungTiengViet } from '@/core/de/tieng-viet';

const KY = ['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM'];
function kiemKy(ky: string) {
  if (!KY.includes(ky)) throw new Error('Kì kiểm tra không hợp lệ.');
}

export async function docBaiDocChon(ky: string): Promise<{ baiDoc: BaiDocChon | null; tuDe: boolean; capNhatLuc: string | null }> {
  kiemKy(ky);
  const KHOI = await layKhoiLamViec();
  const { supabase, user, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('bai_doc_chon').select('du_lieu, updated_at')
    .eq('organization_id', orgId).eq('chu_so_huu', user.id).eq('khoi', KHOI).eq('ky_kiem_tra', ky).maybeSingle();
  if (error) throw new Error(`Không đọc được bài đọc đã chọn: ${error.message}`);
  if (data) return { baiDoc: lamSachBaiDocChon(data.du_lieu), tuDe: false, capNhatLuc: data.updated_at as string };
  const { data: de } = await supabase.from('de_kiem_tra').select('du_lieu')
    .eq('organization_id', orgId).eq('khoi', KHOI).eq('ma_mon', 'TIENG_VIET').eq('ky_kiem_tra', ky).eq('created_by', user.id).maybeSingle();
  const tuDe = baiDocChonTuDe((de?.du_lieu as { tiengViet?: NoiDungTiengViet } | undefined)?.tiengViet);
  return { baiDoc: tuDe, tuDe: !!tuDe, capNhatLuc: null };
}

export async function luuBaiDocChon(ky: string, baiDoc: unknown): Promise<BaiDocChon> {
  kiemKy(ky);
  const KHOI = await layKhoiLamViec();
  const { supabase, user, orgId } = await layNguoiDung();
  const sach = lamSachBaiDocChon(baiDoc);
  const { error } = await supabase.from('bai_doc_chon').upsert(
    { organization_id: orgId, chu_so_huu: user.id, khoi: KHOI, ky_kiem_tra: ky, du_lieu: sach },
    { onConflict: 'chu_so_huu,khoi,ky_kiem_tra' },
  );
  if (error) throw new Error(`Không lưu được bài đọc: ${error.message}`);
  return sach;
}
