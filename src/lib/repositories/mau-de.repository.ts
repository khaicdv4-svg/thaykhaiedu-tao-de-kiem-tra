/**
 * ThayKhaiEdu - Mẫu đề của tổ (bảng exam_templates + kho file "exam-templates").
 * Mọi người trong trường xem được. Tổ trưởng, tổ phó, quản trị tải mẫu và bỏ mẫu.
 * Mỗi ô mẫu (một môn, Tiếng Việt chung một file): bản còn dùng có phiên bản lớn nhất là bản đang dùng.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { docKhoiTuDocx, type KhoiVanBan } from '@/core/utils/docx-bang';
import { MA_SUBJECT_K4, O_MAU, docThongSoDocx, doanVanTuChuDoc, laFileDocCu, laOMau, type MaOMau, type ThongSoTrang } from '@/core/mau-de/mau-de';

const KHOI = 4;
const BUCKET = 'exam-templates';
const KY_CHUNG = 'TAT_CA';
const VAI_TRO_TAI = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const KICH_THUOC_TOI_DA = 15 * 1024 * 1024;

export interface MauDe {
  id: string;
  o: MaOMau;
  tenFile: string;
  phienBan: number;
  conDung: boolean;
  taiLenLuc: string;
  thongSo: ThongSoTrang | null;
}

async function layNguoiDung() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Cần đăng nhập.');
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error('Không tìm thấy trường của tài khoản.');
  const { data: vaiTroCao } = await supabase.rpc('get_auth_user_role');
  return { supabase, user, orgId: profile.organization_id as string, role: ((vaiTroCao as string | null) ?? (profile.role as string)) };
}

const COT = 'id, name, version, validation_status, created_at, o:header_layout->>o, thong_so:header_layout->thong_so';

const coBan = (supabase: Awaited<ReturnType<typeof layNguoiDung>>['supabase'], orgId: string) =>
  supabase
    .from('exam_templates')
    .select(COT)
    .eq('organization_id', orgId)
    .eq('grade', KHOI)
    .eq('template_type', 'ORGANIZATION_TEMPLATE')
    .eq('assessment_period', KY_CHUNG);

function sangMau(r: any): MauDe | null {
  if (!laOMau(r.o)) return null;
  return {
    id: r.id,
    o: r.o,
    tenFile: r.name,
    phienBan: r.version,
    conDung: r.validation_status !== 'DEPRECATED',
    taiLenLuc: r.created_at,
    thongSo: (r.thong_so as ThongSoTrang | null) ?? null,
  };
}

/** Mọi bản mẫu của trường (mới trước). */
export async function danhSachMauDe(): Promise<MauDe[]> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await coBan(supabase, orgId).order('version', { ascending: false });
  if (error) throw new Error(`Không đọc được mẫu đề: ${error.message}`);
  return (data ?? []).map(sangMau).filter((m): m is MauDe => !!m);
}

/** Đoạn văn, bảng của một bản mẫu để xem lại. */
export async function cauTrucMauDe(id: string): Promise<{ tenFile: string; cauTruc: KhoiVanBan[] }> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('exam_templates').select('name, cau_truc:header_layout->cau_truc').eq('organization_id', orgId).eq('id', id).single();
  if (error || !data) throw new Error('Không tìm thấy mẫu đề.');
  return { tenFile: data.name as string, cauTruc: ((data as any).cau_truc as KhoiVanBan[] | null) ?? [] };
}

/** File Word gốc của một bản mẫu. */
export async function fileMauDe(id: string): Promise<{ tenFile: string; noiDung: ArrayBuffer }> {
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase.from('exam_templates').select('name, storage_path').eq('organization_id', orgId).eq('id', id).single();
  if (error || !data?.storage_path) throw new Error('Không tìm thấy file mẫu.');
  const { data: tep, error: loiTai } = await supabase.storage.from(BUCKET).download(data.storage_path as string);
  if (loiTai || !tep) throw new Error(`Không tải được file mẫu: ${loiTai?.message ?? 'không rõ lỗi'}`);
  return { tenFile: data.name as string, noiDung: await tep.arrayBuffer() };
}

/**
 * File Word của mẫu đang dùng cho một môn (bản còn dùng, phiên bản lớn nhất), để xuất đề theo mẫu.
 * Môn chưa có mẫu thì trả null. Mẫu là file .doc cũ thì kèm lí do (chỉ ghép được với .docx).
 */
export async function fileMauDangDung(maMon: string): Promise<{ tenFile: string; noiDung: ArrayBuffer | null; lyDo?: string } | null> {
  const o = O_MAU.find((x) => x.maMon === maMon)?.ma;
  if (!o) return null;
  const { supabase, orgId } = await layNguoiDung();
  const { data, error } = await supabase
    .from('exam_templates')
    .select('name, storage_path, version')
    .eq('organization_id', orgId)
    .eq('grade', KHOI)
    .eq('template_type', 'ORGANIZATION_TEMPLATE')
    .eq('assessment_period', KY_CHUNG)
    .eq('validation_status', 'VALIDATED')
    .eq('header_layout->>o', o)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw new Error(`Không đọc được mẫu đề: ${error.message}`);
  const m = data?.[0];
  if (!m?.storage_path) return null;
  if (laFileDocCu(m.name as string) || String(m.storage_path).endsWith('.doc')) return { tenFile: m.name as string, noiDung: null, lyDo: 'mẫu là file .doc cũ, cần lưu lại thành .docx' };
  const { data: tep, error: loiTai } = await supabase.storage.from(BUCKET).download(m.storage_path as string);
  if (loiTai || !tep) throw new Error(`Không tải được file mẫu: ${loiTai?.message ?? 'không rõ lỗi'}`);
  return { tenFile: m.name as string, noiDung: await tep.arrayBuffer() };
}

/**
 * Chỗ tải lên cho một file mẫu: trình duyệt tải thẳng vào kho file (không qua máy chủ app,
 * vì máy chủ giới hạn dung lượng mỗi lần gửi), rồi báo lại đường dẫn để lưu.
 */
export async function choTaiLenMauDe(o: string, tenFile: string): Promise<{ duongDan: string; token: string }> {
  const { supabase, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_TAI.includes(role)) throw new Error('Chỉ tổ trưởng, tổ phó hoặc quản trị mới được tải mẫu đề.');
  if (!laOMau(o)) throw new Error('Chưa chọn mẫu này dùng cho môn nào.');
  if (!/\.docx?$/i.test(tenFile)) throw new Error('Mẫu đề phải là file Word (.docx hoặc .doc).');
  const duoi = laFileDocCu(tenFile) ? 'doc' : 'docx';
  const duongDan = `${orgId}/khoi-${KHOI}/${o}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${duoi}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(duongDan);
  if (error || !data) throw new Error(`Không mở được chỗ tải file: ${error?.message ?? 'không rõ lỗi'}`);
  return { duongDan, token: data.token };
}

/** Lưu một file mẫu đã tải vào kho cho một ô. Thành bản mới nhất, được dùng ngay; bản cũ vẫn giữ. */
/** Đọc chữ của file Word cũ (.doc). Thư viện chỉ chạy trên máy chủ nên nạp khi cần. */
async function chuTuFileDoc(noiDung: ArrayBuffer): Promise<string> {
  const { default: WordExtractor } = await import('word-extractor');
  const tl = await new WordExtractor().extract(Buffer.from(noiDung));
  return tl.getBody();
}

export async function taiLenMauDe(o: string, tenFile: string, duongDan: string): Promise<MauDe> {
  const { supabase, user, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_TAI.includes(role)) throw new Error('Chỉ tổ trưởng, tổ phó hoặc quản trị mới được tải mẫu đề.');
  if (!laOMau(o)) throw new Error('Chưa chọn mẫu này dùng cho môn nào.');
  if (!duongDan.startsWith(`${orgId}/khoi-${KHOI}/${o}/`) || duongDan.includes('..')) throw new Error('Đường dẫn file không hợp lệ.');

  const boFile = () => supabase.storage.from(BUCKET).remove([duongDan]);
  const { data: tep, error: loiDoc } = await supabase.storage.from(BUCKET).download(duongDan);
  if (loiDoc || !tep) throw new Error(`Không đọc được file vừa tải: ${loiDoc?.message ?? 'không rõ lỗi'}`);
  if (tep.size > KICH_THUOC_TOI_DA) {
    await boFile();
    throw new Error('File mẫu quá lớn (tối đa 15 MB).');
  }
  const noiDung = await tep.arrayBuffer();

  const laDoc = laFileDocCu(tenFile) || duongDan.endsWith('.doc');
  let thongSo: ThongSoTrang | null;
  let cauTruc: KhoiVanBan[];
  try {
    if (laDoc) {
      // Word cũ: chỉ có chữ, chưa có lề, phông, khung bảng
      thongSo = null;
      cauTruc = doanVanTuChuDoc(await chuTuFileDoc(noiDung));
      if (!cauTruc.length) throw new Error('rỗng');
    } else {
      [thongSo, cauTruc] = await Promise.all([docThongSoDocx(noiDung), docKhoiTuDocx(noiDung)]);
    }
  } catch {
    await boFile();
    throw new Error('Không đọc được file Word này. Thầy cô mở file bằng Word, lưu lại rồi tải lên lại.');
  }
  if (JSON.stringify(cauTruc).length > 1_500_000) cauTruc = cauTruc.slice(0, 400);

  const { data: cu } = await coBan(supabase, orgId).eq('header_layout->>o', o).order('version', { ascending: false }).limit(1);
  const phienBan = ((cu?.[0] as any)?.version ?? 0) + 1;

  const ten = O_MAU.find((x) => x.ma === o)!;
  const { data, error } = await supabase
    .from('exam_templates')
    .insert({
      name: tenFile.slice(0, 250),
      description: `Mẫu đề ${ten.ten} – Lớp 4`,
      owner_id: user.id,
      organization_id: orgId,
      grade: KHOI,
      subject_id: MA_SUBJECT_K4[ten.maMon],
      assessment_period: KY_CHUNG,
      template_type: 'ORGANIZATION_TEMPLATE',
      scope: 'GROUP',
      version: phienBan,
      validation_status: 'VALIDATED',
      header_layout: { o, cau_truc: cauTruc, thong_so: thongSo, dinh_dang: laDoc ? 'doc' : 'docx' },
      paper_size: thongSo?.khoGiay.slice(0, 20) ?? 'A4',
      font_family: thongSo?.phong?.slice(0, 100) ?? null,
      font_size_points: thongSo?.coChu ? Math.round(thongSo.coChu) : null,
      ...(thongSo ? { page_margin_mm: thongSo.le } : {}),
      storage_path: duongDan,
    })
    .select(COT)
    .single();
  if (error || !data) {
    await boFile();
    throw new Error(`Không lưu được mẫu đề: ${error?.message ?? 'không rõ lỗi'}`);
  }
  return sangMau(data)!;
}

/** Bỏ một bản mẫu (không xóa hẳn, để còn xem lại). Bản còn dùng mới nhất của ô sẽ được dùng. */
export async function boMauDe(id: string): Promise<void> {
  const { supabase, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_TAI.includes(role)) throw new Error('Chỉ tổ trưởng, tổ phó hoặc quản trị mới được bỏ mẫu đề.');
  const { data, error } = await supabase.from('exam_templates').update({ validation_status: 'DEPRECATED', updated_at: new Date().toISOString() }).eq('organization_id', orgId).eq('id', id).select('id');
  if (error) throw new Error(`Không bỏ được mẫu: ${error.message}`);
  if (!data?.length) throw new Error('Không bỏ được mẫu này (mẫu do người khác tải: nhờ tổ trưởng bỏ).');
}

/** Dùng lại một bản đã bỏ. */
export async function dungLaiMauDe(id: string): Promise<void> {
  const { supabase, orgId, role } = await layNguoiDung();
  if (!VAI_TRO_TAI.includes(role)) throw new Error('Chỉ tổ trưởng, tổ phó hoặc quản trị mới được đổi mẫu đề.');
  const { data, error } = await supabase.from('exam_templates').update({ validation_status: 'VALIDATED', updated_at: new Date().toISOString() }).eq('organization_id', orgId).eq('id', id).select('id');
  if (error || !data?.length) throw new Error(`Không dùng lại được mẫu: ${error?.message ?? 'không có quyền'}`);
}
