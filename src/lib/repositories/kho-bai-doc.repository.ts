/**
 * ThayKhaiEdu - Kho bài đọc: lưu hàng chờ duyệt, duyệt / từ chối, lấy chữ SGK để kiểm tra trùng.
 * Bảng: reading_passages (thêm cột ở migration 20261105113604_kho_bai_doc_va_kho_sgk).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { kiemTraBaiDoc, type BaiDocCanKiem, type TrangThaiLink, type VanBanSgk } from '@/core/reading-passages/kiem-tra';
import { khoangDoDai, type KyKiemTraBaiDoc, type LoaiBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import { kiemTraBanChinh, tacGiaTheo } from '@/core/reading-passages/chinh-do-dai';
import { dauVetBaiDoc } from '@/core/reading-passages/phan-tich';

export interface BaiDocNhapKho extends BaiDocCanKiem {
  nguonGoc: 'TAI_FILE' | 'AI_TIM' | 'NHAP_TAY';
  tenFile?: string;
  ghiChuAI?: Record<string, unknown>;
}

export interface BaiDocTrongKho {
  id: string;
  tieuDe: string;
  noiDung: string;
  tacGia: string;
  nguon: string;
  nguonUrl: string | null;
  loai: LoaiBaiDoc | null;
  ky: KyKiemTraBaiDoc | null;
  theLoai: TheLoaiBaiDoc | null;
  chuDiem: string | null;
  soTieng: number;
  trangThai: string;
  trangThaiLink: TrangThaiLink;
  nguonGoc: string;
  ketQuaKiemTra: { loi?: string[]; canhBao?: string[] };
  nguoiTao: string | null;
  taoLuc: string;
  ghiChuDuyet: string | null;
  /** Nhãn khi bài do AI chỉnh độ dài, ví dụ "Có AI chỉnh sửa bớt 18 tiếng". */
  nhanAI: string | null;
}

const CHUA_RO = '(chưa rõ)';

function anhXa(r: Record<string, any>): BaiDocTrongKho {
  return {
    id: r.id,
    tieuDe: r.title,
    noiDung: r.content,
    tacGia: r.author === CHUA_RO ? '' : r.author,
    nguon: r.source_reference === CHUA_RO ? '' : r.source_reference,
    nguonUrl: r.source_url,
    loai: r.reading_use,
    ky: r.assessment_period,
    theLoai: r.literary_form,
    chuDiem: r.theme,
    soTieng: r.word_count,
    trangThai: r.status,
    trangThaiLink: r.source_check_status ?? 'CHUA_KIEM',
    nguonGoc: r.origin ?? 'NHAP_TAY',
    ketQuaKiemTra: r.check_result ?? {},
    nguoiTao: r.created_by,
    taoLuc: r.created_at,
    ghiChuDuyet: r.review_note,
    nhanAI: typeof r.ai_notes?.chinhDoDai?.nhan === 'string' ? r.ai_notes.chinhDoDai.nhan : null,
  };
}

const LOAI_CU: Record<LoaiBaiDoc, string> = { DOC_THANH_TIENG: 'ORAL_READING', DOC_HIEU: 'COMPREHENSION_READING' };

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  return { supabase, user, orgId: profile.organization_id as string, role: profile.role as string };
}

/** Chữ các bài đọc SGK đã nhận dạng (bản đang dùng) để so trùng theo nội dung. */
export async function layVanBanSgkTiengViet(): Promise<VanBanSgk[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sgk_sections')
    .select('title, text_content, sgk_books!inner(subject_id, edition, status)')
    .eq('kind', 'BAI_DOC')
    .not('text_content', 'is', null)
    .eq('sgk_books.edition', '2026-2027')
    .neq('sgk_books.status', 'NGUNG_DUNG');
  if (error || !data) return [];
  return data.map((r: any) => ({ ten: r.title, noiDung: r.text_content }));
}

/** Dấu vết các bài đã có trong kho (nháp, chờ duyệt, đã duyệt). Bài bị từ chối thì cho nhập lại. */
export async function layDauVetBaiDaCo(): Promise<Set<string>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return new Set();
  const { data, error } = await supabase.from('reading_passages').select('title, content').neq('status', 'REJECTED');
  if (error || !data) return new Set();
  return new Set(data.map((r: any) => dauVetBaiDoc(r.title ?? '', r.content ?? '')));
}

/** Lưu các bài đã phân tích. Bài không còn lỗi → chờ duyệt; còn lỗi → bản nháp để sửa tiếp. */
export async function luuVaoHangCho(dsGoc: BaiDocNhapKho[]): Promise<{ choDuyet: number; banNhap: number; boQuaTrung: number; ids: string[] }> {
  const { supabase, user, orgId } = await layNguoiDung();
  // Bài đã có trong kho (hoặc trùng nhau trong chính lần lưu này) thì bỏ qua
  const daCo = await layDauVetBaiDaCo();
  const ds = dsGoc.filter((b) => {
    const k = dauVetBaiDoc(b.tieuDe, b.noiDung);
    if (daCo.has(k)) return false;
    daCo.add(k);
    return true;
  });
  const boQuaTrung = dsGoc.length - ds.length;
  if (!ds.length) return { choDuyet: 0, banNhap: 0, boQuaTrung, ids: [] };
  const sgk = await layVanBanSgkTiengViet();
  const boNao = await docBoNaoNeuCo();
  const rows = ds.map((b) => {
    const kq = kiemTraBaiDoc(b, sgk, boNao);
    return {
      organization_id: orgId,
      title: b.tieuDe.trim(),
      author: b.tacGia.trim() || CHUA_RO,
      source_reference: (b.nguon || b.nguonUrl || '').trim() || CHUA_RO,
      source_url: kq.nguonUrlSach || null,
      source_check_status: b.nguonUrl ? (b.trangThaiLink ?? 'CHUA_KIEM') : 'SACH_IN',
      source_checked_at: b.trangThaiLink && b.trangThaiLink !== 'CHUA_KIEM' ? new Date().toISOString() : null,
      passage_type: b.loai ? LOAI_CU[b.loai] : 'OTHER',
      reading_use: b.loai ?? null,
      assessment_period: b.ky ?? null,
      literary_form: b.theLoai ?? null,
      theme: b.chuDiem ?? null,
      genre: b.theLoai ?? null,
      grade: 4,
      content: b.noiDung.trim(),
      word_count: kq.soTieng,
      target_word_count_min: kq.khoang?.min ?? null,
      target_word_count_max: kq.khoang?.max ?? null,
      tolerance_status: !kq.khoang ? 'IN_RANGE'
        : kq.soTieng >= kq.khoang.min && kq.soTieng <= kq.khoang.max ? 'EXACT'
        : kq.loi.some((l) => l.includes('tiếng; quy định')) ? 'WARNING_OUT_OF_RANGE' : 'IN_RANGE',
      sgk_overlap_ratio: kq.trungSgk.tiLe,
      sgk_overlap_title: kq.trungSgk.baiSgk,
      sgk_checked_at: new Date().toISOString(),
      origin: b.nguonGoc,
      import_file_name: b.tenFile ?? null,
      check_result: { loi: kq.loi, canhBao: kq.canhBao },
      ai_notes: b.ghiChuAI ?? {},
      status: kq.hopLe ? 'PENDING_REVIEW' : 'DRAFT',
      created_by: user.id,
    };
  });
  const { data, error } = await supabase.from('reading_passages').insert(rows).select('id, status');
  if (error) throw new Error(`Không lưu được: ${error.message}`);
  return {
    choDuyet: (data ?? []).filter((r) => r.status === 'PENDING_REVIEW').length,
    banNhap: (data ?? []).filter((r) => r.status === 'DRAFT').length,
    boQuaTrung,
    ids: (data ?? []).map((r) => r.id),
  };
}

export async function danhSachHangCho(): Promise<BaiDocTrongKho[]> {
  const { supabase } = await layNguoiDung();
  const { data, error } = await supabase
    .from('reading_passages')
    .select('*')
    .in('status', ['PENDING_REVIEW', 'DRAFT'])
    .not('reading_use', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(anhXa);
}

/** Bài đã duyệt dùng được cho đề (lọc theo loại, kì, chủ điểm, thể loại). */
export async function danhSachDaDuyet(loc: { loai?: LoaiBaiDoc; ky?: KyKiemTraBaiDoc; chuDiem?: string; theLoai?: TheLoaiBaiDoc }) {
  const { supabase } = await layNguoiDung();
  let q = supabase.from('reading_passages').select('*').eq('status', 'APPROVED');
  if (loc.loai) q = q.eq('reading_use', loc.loai);
  if (loc.ky) q = q.eq('assessment_period', loc.ky);
  if (loc.chuDiem) q = q.eq('theme', loc.chuDiem);
  if (loc.theLoai) q = q.eq('literary_form', loc.theLoai);
  const { data, error } = await q.order('title');
  if (error) throw new Error(error.message);
  return (data ?? []).map(anhXa);
}

export async function duyetBaiDoc(id: string, hanhDong: 'DUYET' | 'TU_CHOI', ghiChu?: string) {
  const { supabase, role } = await layNguoiDung();
  if (!['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
    throw new Error('Chỉ tổ trưởng hoặc quản trị mới được duyệt bài đọc.');
  }
  const { data: r, error: e1 } = await supabase.from('reading_passages').select('*').eq('id', id).single();
  if (e1 || !r) throw new Error('Không tìm thấy bài đọc.');

  if (hanhDong === 'DUYET') {
    const b = anhXa(r);
    const kq = kiemTraBaiDoc(
      { tieuDe: b.tieuDe, noiDung: b.noiDung, tacGia: b.tacGia, nguon: b.nguon, nguonUrl: b.nguonUrl ?? '', loai: b.loai, ky: b.ky, theLoai: b.theLoai, chuDiem: b.chuDiem, trangThaiLink: b.trangThaiLink },
      await layVanBanSgkTiengViet(),
      await docBoNaoNeuCo(),
    );
    if (!kq.hopLe) throw new Error(`Chưa duyệt được, còn lỗi: ${kq.loi.join(' ')}`);
  }
  const { error } = await supabase
    .from('reading_passages')
    .update({ status: hanhDong === 'DUYET' ? 'APPROVED' : 'REJECTED', review_note: ghiChu ?? null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export interface ThayDoiBaiDoc {
  tieuDe: string;
  noiDung: string;
  tacGia: string;
  nguon: string;
  nguonUrl: string;
  loai: LoaiBaiDoc | null;
  ky: KyKiemTraBaiDoc | null;
  theLoai: TheLoaiBaiDoc | null;
  chuDiem: string | null;
}

/** Sửa bài đang nháp hoặc chờ duyệt; kiểm tra lại, đạt thì vào "Chờ duyệt", chưa đạt thì về "nháp". */
export async function suaBaiDocChoDuyet(id: string, d: ThayDoiBaiDoc) {
  const { supabase, role } = await layNguoiDung();
  if (!['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
    throw new Error('Chỉ tổ trưởng hoặc quản trị mới được sửa bài trong hàng chờ.');
  }
  const { data: cu, error: e1 } = await supabase.from('reading_passages').select('status, source_check_status').eq('id', id).single();
  if (e1 || !cu) throw new Error('Không tìm thấy bài đọc.');
  if (!['DRAFT', 'PENDING_REVIEW'].includes(cu.status)) throw new Error('Chỉ sửa được bài đang nháp hoặc chờ duyệt.');

  const kq = kiemTraBaiDoc(
    { ...d, nguonUrl: d.nguonUrl, trangThaiLink: (cu.source_check_status ?? 'CHUA_KIEM') as TrangThaiLink },
    await layVanBanSgkTiengViet(),
    await docBoNaoNeuCo(),
  );
  const { error } = await supabase
    .from('reading_passages')
    .update({
      title: d.tieuDe.trim(),
      content: d.noiDung,
      word_count: kq.soTieng,
      author: d.tacGia.trim() || CHUA_RO,
      source_reference: d.nguon.trim() || CHUA_RO,
      source_url: d.nguonUrl.trim() || null,
      reading_use: d.loai,
      assessment_period: d.ky,
      literary_form: d.theLoai,
      theme: d.chuDiem,
      check_result: { loi: kq.loi, canhBao: kq.canhBao },
      status: kq.hopLe ? 'PENDING_REVIEW' : 'DRAFT',
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { hopLe: kq.hopLe, loi: kq.loi, canhBao: kq.canhBao };
}

/** Lưu một đoạn cắt từ bài dài thành bài đọc thành tiếng mới (giữ nguyên bài gốc). Bài mới vào hàng chờ duyệt. */
export async function taoBaiTuDoanCat(idGoc: string, doan: string) {
  const { supabase, role } = await layNguoiDung();
  if (!['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
    throw new Error('Chỉ tổ trưởng hoặc quản trị mới được lưu đoạn cắt.');
  }
  if (!doan.trim()) throw new Error('Đoạn cắt đang trống.');
  const { data: r, error } = await supabase.from('reading_passages').select('*').eq('id', idGoc).single();
  if (error || !r) throw new Error('Không tìm thấy bài gốc.');
  const g = anhXa(r);
  const kq = await luuVaoHangCho([{
    tieuDe: g.tieuDe, noiDung: doan, tacGia: g.tacGia, nguon: g.nguon, nguonUrl: g.nguonUrl ?? '',
    loai: g.loai ?? 'DOC_THANH_TIENG', ky: g.ky, theLoai: g.theLoai, chuDiem: g.chuDiem,
    trangThaiLink: g.trangThaiLink, nguonGoc: g.nguonGoc as BaiDocNhapKho['nguonGoc'],
    tenFile: r.import_file_name ?? undefined, ghiChuAI: { doanTrichTu: idGoc },
  }]);
  return kq;
}

/** Một bài trong kho theo id (để AI chỉnh độ dài). */
export async function layBaiDoc(id: string): Promise<BaiDocTrongKho> {
  const { supabase } = await layNguoiDung();
  const { data: r, error } = await supabase.from('reading_passages').select('*').eq('id', id).single();
  if (error || !r) throw new Error('Không tìm thấy bài đọc.');
  return anhXa(r);
}

/**
 * Lưu bản AI chỉnh độ dài thành bài mới (bài gốc giữ nguyên).
 * Máy chủ so lại với bài gốc: đúng độ dài, không đổi quá 15%; tác giả ghi "Theo …", gắn nhãn AI chỉnh.
 */
export async function taoBaiTuBanChinh(idGoc: string, noiDung: string) {
  const { supabase, role } = await layNguoiDung();
  if (!['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
    throw new Error('Chỉ tổ trưởng hoặc quản trị mới được lưu bản AI chỉnh.');
  }
  const { data: r, error } = await supabase.from('reading_passages').select('*').eq('id', idGoc).single();
  if (error || !r) throw new Error('Không tìm thấy bài gốc.');
  const g = anhXa(r);
  if (!g.loai || !g.ky || !g.theLoai) throw new Error('Bài gốc chưa đủ loại bài, kì, thể loại.');
  const k = khoangDoDai(g.loai, g.ky, g.theLoai, await docBoNaoNeuCo());
  if (!k) throw new Error('Tổ chưa quy định độ dài cho loại bài này.');
  const kt = kiemTraBanChinh(g.noiDung, noiDung, k);
  if (!kt.hopLe) throw new Error(kt.loi.join(' '));
  return luuVaoHangCho([{
    tieuDe: g.tieuDe, noiDung, tacGia: tacGiaTheo(g.tacGia), nguon: g.nguon, nguonUrl: g.nguonUrl ?? '',
    loai: g.loai, ky: g.ky, theLoai: g.theLoai, chuDiem: g.chuDiem,
    trangThaiLink: g.trangThaiLink, nguonGoc: g.nguonGoc as BaiDocNhapKho['nguonGoc'],
    tenFile: r.import_file_name ?? undefined,
    ghiChuAI: { chinhDoDai: { tuBai: idGoc, them: kt.them, bot: kt.bot, nhan: kt.nhan } },
  }]);
}
