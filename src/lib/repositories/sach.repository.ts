/**
 * ThayKhaiEdu - Kho sách giáo khoa (SGK) và sách giáo viên (SGV). Bảng: sach, sach_trang (migration 20261107130000).
 * Xem cho mọi thành viên của trường; tải lên, xóa chỉ tổ trưởng / quản trị.
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canQuyenSua } from '@/lib/repositories/quyen-nap';
import { dsMucLucSgk } from '@/lib/repositories/chuong-trinh.repository';
import { chonTrangSgv, gopTrang, khoangTrangCuaCau, trangPdfTuTrangSach, type NguCanhSach, type TrangSach } from '@/core/chuong-trinh/sach';

const VAI_TRO_SUA = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
export const TOI_DA_TRANG_PDF = 400;
export const TOI_DA_KY_TU_MOT_TRANG = 20_000;

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  return { supabase, user, orgId: profile.organization_id as string, role: profile.role as string };
}
function loiBang(msg: string): Error {
  return new Error(/(does not exist|schema cache|Could not find)/i.test(msg) && /sach/.test(msg) ? 'Cơ sở dữ liệu chưa có bảng kho sách. Cần chạy migration 20261107130000_kho_sach.sql trên Supabase.' : msg);
}

export interface SachTomTat {
  id: string; mon: string; lop: number; loai: 'SGK' | 'SGV'; tap: number; tenFile: string;
  soTrangPdf: number; trangDauPdf: number; soTrangCoChu: number; soTrangAiDoc: number; taoLuc: string;
}

export async function dsSach(lop = 4): Promise<SachTomTat[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('sach').select('id, ma_mon, khoi, loai, tap, ten_file, so_trang_pdf, trang_dau_pdf, created_at').eq('organization_id', orgId).eq('khoi', lop).order('ma_mon').order('loai').order('tap');
  if (error) throw loiBang(`Không đọc được kho sách: ${error.message}`);
  const kq: SachTomTat[] = [];
  for (const r of (data ?? []) as any[]) {
    const dem = async (nguon: 'CHU' | 'AI_DOC') => {
      const { count } = await supabase.from('sach_trang').select('trang_pdf', { count: 'exact', head: true }).eq('sach_id', r.id).eq('nguon', nguon).neq('noi_dung', '');
      return count ?? 0;
    };
    kq.push({ id: r.id, mon: r.ma_mon, lop: r.khoi, loai: r.loai, tap: r.tap, tenFile: r.ten_file, soTrangPdf: r.so_trang_pdf, trangDauPdf: r.trang_dau_pdf, soTrangCoChu: await dem('CHU'), soTrangAiDoc: await dem('AI_DOC'), taoLuc: r.created_at });
  }
  return kq;
}

/** Tạo (hoặc thay) cuốn sách của đúng môn, loại, tập. Cuốn cũ cùng khóa và các trang của nó bị xóa. */
export async function taoSach(p: { mon: string; lop: number; loai: 'SGK' | 'SGV'; tap: number; tenFile: string; soTrangPdf: number; trangDauPdf: number }): Promise<{ id: string }> {
  if (p.loai !== 'SGK' && p.loai !== 'SGV') throw new Error('Loại sách phải là SGK hoặc SGV.');
  if (p.tap !== 1 && p.tap !== 2) throw new Error('Tập phải là 1 hoặc 2.');
  if (!(p.soTrangPdf >= 1 && p.soTrangPdf <= TOI_DA_TRANG_PDF)) throw new Error(`File PDF tối đa ${TOI_DA_TRANG_PDF} trang.`);
  if (!(p.trangDauPdf >= 1 && p.trangDauPdf <= p.soTrangPdf)) throw new Error('Trang số 1 của sách phải nằm trong file PDF.');
  const { supabase, user, orgId, role } = await layNguoiDung();
  await canQuyenSua(supabase);
  const loc = { organization_id: orgId, khoi: p.lop, ma_mon: p.mon, loai: p.loai, tap: p.tap };
  const { error: eX } = await supabase.from('sach').delete().match(loc);
  if (eX) throw loiBang(`Không thay được sách cũ: ${eX.message}`);
  const { data, error } = await supabase.from('sach').insert({ ...loc, ten_file: p.tenFile.slice(0, 200), so_trang_pdf: p.soTrangPdf, trang_dau_pdf: p.trangDauPdf, created_by: user.id }).select('id').single();
  if (error) throw loiBang(`Không tạo được sách: ${error.message}`);
  return { id: data.id as string };
}

export async function luuTrangSach(sachId: string, trangs: { trang: number; chu: string }[], nguon: 'CHU' | 'AI_DOC'): Promise<{ soTrang: number }> {
  if (!trangs.length || trangs.length > 25) throw new Error('Mỗi lần gửi từ 1 đến 25 trang.');
  const { supabase, orgId, role } = await layNguoiDung();
  await canQuyenSua(supabase);
  const { data: s, error: e0 } = await supabase.from('sach').select('id, so_trang_pdf').eq('id', sachId).eq('organization_id', orgId).maybeSingle();
  if (e0) throw loiBang(e0.message);
  if (!s) throw new Error('Không tìm thấy cuốn sách.');
  const hang = trangs.map((t) => {
    if (!Number.isInteger(t.trang) || t.trang < 1 || t.trang > (s.so_trang_pdf as number)) throw new Error(`Trang ${t.trang} nằm ngoài file PDF.`);
    return { sach_id: sachId, organization_id: orgId, trang_pdf: t.trang, noi_dung: String(t.chu ?? '').slice(0, TOI_DA_KY_TU_MOT_TRANG), nguon };
  });
  const { error } = await supabase.from('sach_trang').upsert(hang, { onConflict: 'sach_id,trang_pdf' });
  if (error) throw loiBang(`Không lưu được trang: ${error.message}`);
  return { soTrang: hang.length };
}

export async function xoaSach(id: string): Promise<void> {
  const { supabase, orgId, role } = await layNguoiDung();
  await canQuyenSua(supabase);
  const { error } = await supabase.from('sach').delete().eq('id', id).eq('organization_id', orgId);
  if (error) throw loiBang(`Không xóa được sách: ${error.message}`);
}

async function trangCuaSach(supabase: any, sachId: string, tuPdf?: number, denPdf?: number): Promise<{ trangPdf: number; noiDung: string }[]> {
  let q = supabase.from('sach_trang').select('trang_pdf, noi_dung').eq('sach_id', sachId).neq('noi_dung', '').order('trang_pdf');
  if (tuPdf !== undefined) q = q.gte('trang_pdf', tuPdf);
  if (denPdf !== undefined) q = q.lte('trang_pdf', denPdf);
  const { data, error } = await q.limit(400);
  if (error) throw loiBang(error.message);
  return ((data ?? []) as any[]).map((r) => ({ trangPdf: r.trang_pdf as number, noiDung: r.noi_dung as string }));
}

/**
 * Ngữ cảnh sách cho một câu: trang SGK theo đặc tả (hoặc mục lục) và trang SGV tìm theo tên bài.
 * Thiếu sách, thiếu trang, trang chưa có chữ đều được ghi vào `thieu` để AI và thầy biết căn cứ chưa đủ.
 */
export async function nguCanhChoCau(mon: string, lop: number, dong: { baiHoc: string; trangSgk: string; tuan: number | null }): Promise<NguCanhSach> {
  const { supabase, orgId } = await layNguoiDung();
  const thieu: string[] = [];
  const mucLuc = (await dsMucLucSgk(mon, lop).catch(() => [])).map((m) => ({ tap: m.tap, baiSo: m.baiSo, tuan: m.tuan, trang: m.trang }));
  const khoang = khoangTrangCuaCau(dong, mucLuc);
  const { data: ds, error } = await supabase.from('sach').select('id, loai, tap, trang_dau_pdf').eq('organization_id', orgId).eq('khoi', lop).eq('ma_mon', mon);
  if (error) throw loiBang(error.message);
  const sach = (ds ?? []) as { id: string; loai: 'SGK' | 'SGV'; tap: number; trang_dau_pdf: number }[];
  const rong: NguCanhSach = { sgk: '', sgv: '', khoang, trangSgkCoChu: [], thieu };

  if (!khoang) thieu.push('Chưa xác định được trang SGK của câu: ô "Trang SGK" trong đặc tả để trống và mục lục không có bài này. Thầy điền trang SGK ở bước 3.');
  const tap = khoang?.tap ?? ((dong.tuan ?? 0) > 18 ? 2 : 1);
  const sgk = sach.find((s) => s.loai === 'SGK' && s.tap === tap) ?? (sach.filter((s) => s.loai === 'SGK').length === 1 ? sach.find((s) => s.loai === 'SGK') : undefined);
  if (khoang) {
    if (!sgk) thieu.push(`Chưa tải SGK tập ${tap} của môn này lên Kho sách.`);
    else {
      const tu = trangPdfTuTrangSach(khoang.tu, sgk.trang_dau_pdf);
      const den = trangPdfTuTrangSach(khoang.den, sgk.trang_dau_pdf);
      const t = await trangCuaSach(supabase, sgk.id, tu, den);
      const trangs: TrangSach[] = t.map((x) => ({ trang: x.trangPdf - sgk.trang_dau_pdf + 1, noiDung: x.noiDung }));
      rong.sgk = gopTrang('SGK', trangs);
      rong.trangSgkCoChu = trangs.map((x) => x.trang);
      if (!trangs.length) thieu.push(`SGK tr. ${khoang.tu}–${khoang.den} chưa có chữ (PDF ảnh quét chưa được đọc hoặc trang nằm ngoài file). Thầy kiểm tra "Trang số 1 của sách" khi tải lên, hoặc cho AI đọc các trang này.`);
      else if (trangs.length < khoang.den - khoang.tu + 1) thieu.push(`Chỉ có chữ của ${trangs.length}/${khoang.den - khoang.tu + 1} trang SGK trong khoảng tr. ${khoang.tu}–${khoang.den}.`);
    }
  }
  const sgvSach = sach.find((s) => s.loai === 'SGV' && s.tap === tap) ?? sach.find((s) => s.loai === 'SGV');
  if (!sgvSach) thieu.push('Chưa tải SGV của môn này lên Kho sách (không bắt buộc).');
  else if (dong.baiHoc.trim()) {
    const t = await trangCuaSach(supabase, sgvSach.id);
    const trangs: TrangSach[] = t.map((x) => ({ trang: x.trangPdf - sgvSach.trang_dau_pdf + 1, noiDung: x.noiDung }));
    const chon = chonTrangSgv(trangs, dong.baiHoc);
    rong.sgv = gopTrang('SGV', chon);
    if (!chon.length) thieu.push('Không tìm thấy trang SGV nhắc tên bài này.');
  }
  return rong;
}
