/**
 * ThayKhaiEdu - Cấu hình AI (phần dùng chung cho giao diện và máy chủ, không chứa khóa).
 *
 * Mô hình giống trang "Cài đặt AI" của app Sinh hoạt chuyên môn:
 *  1. Một khóa API dùng chung cho mọi model (lưu ở máy chủ, đã mã hóa).
 *  2. Danh sách model: tên gọi, chuẩn gọi (Anthropic / OpenAI), địa chỉ cổng, ID model, giá.
 *  3. Mỗi việc trong app dùng model nào.
 */

export type ChuanGoi = 'anthropic' | 'openai';

export interface ModelAI {
  /** Mã nội bộ, ví dụ "m1". */
  id: string;
  /** Tên gọi hiện cho người dùng, ví dụ "Claude Sonnet 5.5". */
  ten: string;
  /** ID model copy từ trang Models của nhà cung cấp, ví dụ "pro/claude-sonnet-5-5-medium". */
  modelId: string;
  chuan: ChuanGoi;
  /** Chuẩn Anthropic: không có /v1. Chuẩn OpenAI: có /v1. */
  diaChiCong: string;
  /** Giá USD cho 1 triệu token vào / ra (để tổ trưởng cân nhắc). */
  giaVao?: number;
  giaRa?: number;
}

export type ViecAI = 'MAC_DINH' | 'VIEC_NHE' | 'TIM_BAI_DOC' | 'DOC_TEP' | 'SOAN_DE';

export interface ThongTinViec {
  ma: ViecAI;
  ten: string;
  moTa: string;
  goiY: string;
}

export const DANH_SACH_VIEC: ThongTinViec[] = [
  {
    ma: 'MAC_DINH',
    ten: 'Model mặc định',
    moTa: 'Dùng cho mọi việc chưa chọn model riêng.',
    goiY: 'Nên chọn model rẻ.',
  },
  {
    ma: 'VIEC_NHE',
    ten: 'Việc nhẹ',
    moTa: 'Tách bài, nhận chủ điểm, gợi ý thể loại, viết ghi chú ngắn.',
    goiY: 'Nên chọn model rẻ, nhanh.',
  },
  {
    ma: 'TIM_BAI_DOC',
    ten: 'Tìm bài đọc',
    moTa: 'Nút "AI tìm bài đọc" trong Kho ngữ liệu Tiếng Việt. Cần tìm web để có tác giả, nguồn thật.',
    goiY: 'Nên chọn model khá, có tìm web (chuẩn Anthropic).',
  },
  {
    ma: 'DOC_TEP',
    ten: 'Đọc tệp',
    moTa: 'Phân tích tệp Word/PDF: bài đọc, đề cũ, tài liệu nguồn.',
    goiY: 'Nên chọn model khá.',
  },
  {
    ma: 'SOAN_DE',
    ten: 'Soạn đề',
    moTa: 'Soạn câu hỏi, đề và đáp án theo ma trận riêng (Xưởng tạo đề).',
    goiY: 'Nên chọn model khá hoặc mạnh.',
  },
];

export type PhanViec = Partial<Record<ViecAI, string>>;

export interface CauHinhAI {
  models: ModelAI[];
  phanViec: PhanViec;
}

/** Cấu hình gửi về giao diện: không bao giờ có khóa, chỉ có 4 ký tự cuối. */
export interface CauHinhAIHienThi extends CauHinhAI {
  coKhoa: boolean;
  khoaDuoi: string | null;
  coBiMatMayChu: boolean;
  capNhatLuc: string | null;
}

const CONG_APILIT = 'https://apilit.dev';

function mau(id: string, ten: string, modelId: string, chuan: ChuanGoi, giaVao: number, giaRa: number): ModelAI {
  return { id, ten, modelId, chuan, diaChiCong: chuan === 'anthropic' ? CONG_APILIT : `${CONG_APILIT}/v1`, giaVao, giaRa };
}

/**
 * Bộ "Thêm nhanh (API-LIT)": chép từ trang Cài đặt AI của app Sinh hoạt chuyên môn ngày 05/11/2026.
 * Giá là giá thầy ghi ở app đó; nếu cổng đổi giá thì sửa ở trang Cài đặt AI.
 */
export const MODEL_MAU_APILIT: ModelAI[] = [
  mau('m1', 'Claude Haiku 5.5', 'pro/claude-haiku-5-5', 'anthropic', 0.5, 2),
  mau('m2', 'Claude Sonnet 5.5', 'pro/claude-sonnet-5-5-medium', 'anthropic', 2, 10),
  mau('m3', 'Claude Sonnet 5', 'pro/claude-sonnet-5-medium', 'anthropic', 2, 10),
  mau('m4', 'Claude Opus 5.5', 'pro/claude-opus-5-5-medium', 'anthropic', 6, 30),
  mau('m5', 'Claude Opus 5', 'pro/claude-opus-5-medium', 'anthropic', 4.55, 22.75),
  mau('m6', 'Claude Fable 5.1', 'pro/claude-fable-5-1-medium', 'anthropic', 10, 50),
  mau('m7', 'Claude Opus 4.8', 'pro/claude-opus-4-8-medium', 'anthropic', 6, 30),
  mau('m8', 'Claude Opus 4.7', 'pro/claude-opus-4-7-medium', 'anthropic', 6, 30),
  mau('m9', 'Claude Opus 4.6', 'pro/claude-opus-4-6-medium', 'anthropic', 5, 25),
  mau('m10', 'Claude Sonnet 4.6', 'pro/claude-sonnet-4-6-medium', 'anthropic', 3, 15),
  mau('m11', 'Claude Haiku 4.5', 'pro/claude-haiku-4-5', 'anthropic', 1, 5),
  mau('m12', 'GPT-5.6 Luna', 'pro/gpt-5.6-luna', 'openai', 1, 6.5),
  mau('m13', 'GPT-5.6 Terra', 'pro/gpt-5.6-terra', 'openai', 3.67, 22),
  mau('m14', 'GPT-5.6 Sol', 'pro/gpt-5.6-sol', 'openai', 7.33, 45),
  mau('m15', 'Kimi K3', 'pro/kimi-k3-medium', 'openai', 6, 30),
  mau('m16', 'MiniMax M2.5', 'pro/minimax-m2.5', 'openai', 0.5, 2),
  mau('m17', 'MiniMax M2.1', 'pro/minimax-m2.1', 'openai', 0.3, 1.5),
  mau('m18', 'GLM-5', 'pro/glm-5', 'openai', 1, 5),
];

/** Phân việc đề xuất khi dùng bộ API-LIT: Haiku cho việc nhẹ, Sonnet 5.5 cho việc cần chất lượng. */
export const PHAN_VIEC_DE_XUAT: PhanViec = {
  MAC_DINH: 'm1',
  VIEC_NHE: 'm1',
  TIM_BAI_DOC: 'm2',
  DOC_TEP: 'm2',
  SOAN_DE: 'm2',
};

/** Hiện giá kiểu "$0,5/$2" (dấu phẩy thập phân như app SHCM). */
export function hienGia(m: Pick<ModelAI, 'giaVao' | 'giaRa'>): string {
  if (m.giaVao == null || m.giaRa == null) return '';
  const f = (n: number) => `$${String(n).replace('.', ',')}`;
  return `${f(m.giaVao)}/${f(m.giaRa)}`;
}

export function tenCoGia(m: ModelAI): string {
  const g = hienGia(m);
  return g ? `${m.ten} · ${g}` : m.ten;
}

/** Bỏ dấu "/" cuối; chuẩn Anthropic bỏ luôn "/v1" cuối nếu lỡ dán vào. */
export function chuanHoaDiaChi(diaChi: string, chuan: ChuanGoi): string {
  let d = diaChi.trim().replace(/\/+$/, '');
  if (chuan === 'anthropic') d = d.replace(/\/v1$/i, '');
  return d;
}

/** Kiểm tra cấu hình trước khi lưu. Trả danh sách lỗi (rỗng là hợp lệ). */
export function kiemTraCauHinh(c: CauHinhAI): string[] {
  const loi: string[] = [];
  const ids = new Set<string>();
  c.models.forEach((m, i) => {
    const dong = `Model dòng ${i + 1}`;
    if (!m.id?.trim()) loi.push(`${dong}: thiếu mã nội bộ.`);
    else if (ids.has(m.id)) loi.push(`${dong}: mã "${m.id}" bị trùng.`);
    ids.add(m.id);
    if (!m.ten?.trim()) loi.push(`${dong}: thiếu tên gọi.`);
    if (!m.modelId?.trim()) loi.push(`${dong}: thiếu ID model.`);
    if (m.chuan !== 'anthropic' && m.chuan !== 'openai') loi.push(`${dong}: chuẩn gọi không hợp lệ.`);
    let url: URL | null = null;
    try {
      url = new URL(m.diaChiCong);
    } catch {
      loi.push(`${dong}: địa chỉ cổng không hợp lệ.`);
    }
    if (url && url.protocol !== 'https:') loi.push(`${dong}: địa chỉ cổng phải bắt đầu bằng https://.`);
    if (url && m.chuan === 'anthropic' && /\/v1\/?$/i.test(url.pathname)) loi.push(`${dong}: chuẩn Anthropic không ghi /v1 ở cuối địa chỉ.`);
    if (url && m.chuan === 'openai' && !/\/v1\/?$/i.test(url.pathname)) loi.push(`${dong}: chuẩn OpenAI cần /v1 ở cuối địa chỉ.`);
    for (const [ten, gia] of [['giá vào', m.giaVao], ['giá ra', m.giaRa]] as const) {
      if (gia != null && (!Number.isFinite(gia) || gia < 0)) loi.push(`${dong}: ${ten} không hợp lệ.`);
    }
  });
  for (const v of DANH_SACH_VIEC) {
    const id = c.phanViec[v.ma];
    if (id && !ids.has(id)) loi.push(`Việc "${v.ten}" đang chọn model không còn trong danh sách.`);
  }
  if (c.models.length > 0 && !c.phanViec.MAC_DINH) loi.push('Cần chọn model mặc định.');
  return loi;
}

/** Model dùng cho một việc: model riêng của việc đó, không có thì model mặc định. */
export function chonModelChoViec(c: CauHinhAI, viec: ViecAI): ModelAI | null {
  const id = c.phanViec[viec] || c.phanViec.MAC_DINH;
  return c.models.find((m) => m.id === id) ?? null;
}

/** Mã nội bộ mới, không trùng mã đang có. */
export function maModelMoi(models: ModelAI[]): string {
  let n = models.length + 1;
  const co = new Set(models.map((m) => m.id));
  while (co.has(`m${n}`)) n++;
  return `m${n}`;
}

/** 4 ký tự cuối của khóa để nhận ra khóa đang dùng. */
export function duoiKhoa(khoa: string): string {
  const k = khoa.trim();
  return k.length <= 4 ? '****' : k.slice(-4);
}

/** Lấy mảng JSON đầu tiên trong câu trả lời của AI (AI hay bọc trong ```json ... ```). */
export function docMangJson<T = unknown>(traLoi: string): T[] {
  const bo = traLoi.replace(/```(?:json)?/gi, '');
  const dau = bo.indexOf('[');
  const cuoi = bo.lastIndexOf(']');
  if (dau < 0 || cuoi <= dau) throw new Error('AI không trả về danh sách JSON.');
  const kq = JSON.parse(bo.slice(dau, cuoi + 1));
  if (!Array.isArray(kq)) throw new Error('AI không trả về danh sách JSON.');
  return kq as T[];
}

/** Làm sạch dữ liệu model nhận từ giao diện. */
export function lamSachModels(dau: unknown): ModelAI[] {
  if (!Array.isArray(dau)) return [];
  return dau.slice(0, 50).map((x) => {
    const m = (x ?? {}) as Record<string, unknown>;
    const chuan: ChuanGoi = m.chuan === 'openai' ? 'openai' : 'anthropic';
    const so = (v: unknown) => (v === '' || v == null ? undefined : Number(v));
    return {
      id: String(m.id ?? '').trim().slice(0, 20),
      ten: String(m.ten ?? '').trim().slice(0, 80),
      modelId: String(m.modelId ?? '').trim().slice(0, 120),
      chuan,
      diaChiCong: chuanHoaDiaChi(String(m.diaChiCong ?? ''), chuan).slice(0, 300),
      giaVao: so(m.giaVao),
      giaRa: so(m.giaRa),
    };
  });
}

export function lamSachPhanViec(dau: unknown): PhanViec {
  const pv: PhanViec = {};
  const m = (dau ?? {}) as Record<string, unknown>;
  for (const v of DANH_SACH_VIEC) {
    const id = m[v.ma];
    if (typeof id === 'string' && id.trim()) pv[v.ma] = id.trim();
  }
  return pv;
}
