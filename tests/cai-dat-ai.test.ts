import { describe, it, expect, vi } from 'vitest';
import {
  MODEL_MAU_APILIT,
  PHAN_VIEC_DE_XUAT,
  chonModelChoViec,
  chuanHoaDiaChi,
  docMangJson,
  duoiKhoa,
  hienGia,
  kiemTraCauHinh,
  lamSachModels,
  lamSachPhanViec,
  maModelMoi,
  tenCoGia,
  type ModelAI,
} from '../src/core/services/ai/cau-hinh-ai';
import { giaiMaKhoa, maHoaKhoa } from '../src/lib/ai/ma-hoa-khoa';
import { goiModel, thuModel } from '../src/lib/ai/goi-ai';
import { docDeXuatBaiDoc, phanTichTraLoiAI, taoAIBaiDoc, type TieuChiTimBaiDoc } from '../src/core/services/ai/reading-passage-ai';

const HAIKU = MODEL_MAU_APILIT[0];
const SONNET = MODEL_MAU_APILIT[1];
const GPT = MODEL_MAU_APILIT.find((m) => m.chuan === 'openai')!;
const BI_MAT = 'mot-chuoi-bi-mat-du-dai-de-thu-1234';

function phanHoi(status: number, json: unknown) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(json) } as Response;
}

describe('Bộ model thêm nhanh API-LIT', () => {
  it('đủ 18 model, chép đúng ID và cổng như app Sinh hoạt chuyên môn', () => {
    expect(MODEL_MAU_APILIT).toHaveLength(18);
    expect(HAIKU).toMatchObject({ ten: 'Claude Haiku 5.5', modelId: 'pro/claude-haiku-5-5', chuan: 'anthropic', diaChiCong: 'https://apilit.dev' });
    expect(GPT).toMatchObject({ ten: 'GPT-5.6 Luna', diaChiCong: 'https://apilit.dev/v1' });
  });
  it('bộ mẫu và phân việc đề xuất hợp lệ: Haiku việc nhẹ, Sonnet 5.5 tìm bài đọc', () => {
    expect(kiemTraCauHinh({ models: MODEL_MAU_APILIT, phanViec: PHAN_VIEC_DE_XUAT })).toEqual([]);
    const c = { models: MODEL_MAU_APILIT, phanViec: PHAN_VIEC_DE_XUAT };
    expect(chonModelChoViec(c, 'VIEC_NHE')?.ten).toBe('Claude Haiku 5.5');
    expect(chonModelChoViec(c, 'TIM_BAI_DOC')?.ten).toBe('Claude Sonnet 5.5');
    expect(chonModelChoViec(c, 'TIM_NGUON')?.ten).toBe('Claude Opus 5.5');
  });
  it('tìm nguồn chưa chọn model riêng thì dùng model của tìm bài đọc, rồi mới tới mặc định', () => {
    const c = { models: MODEL_MAU_APILIT, phanViec: { MAC_DINH: 'm1', TIM_BAI_DOC: 'm2' } };
    expect(chonModelChoViec(c, 'TIM_NGUON')?.ten).toBe('Claude Sonnet 5.5');
    expect(chonModelChoViec({ ...c, phanViec: { MAC_DINH: 'm1' } }, 'TIM_NGUON')?.ten).toBe('Claude Haiku 5.5');
  });
  it('hiện giá kiểu $0,5/$2', () => {
    expect(hienGia(HAIKU)).toBe('$0,5/$2');
    expect(tenCoGia(MODEL_MAU_APILIT[4])).toBe('Claude Opus 5 · $4,55/$22,75');
    expect(hienGia({})).toBe('');
  });
});

describe('Kiểm tra cấu hình', () => {
  const m = (thay: Partial<ModelAI> = {}): ModelAI => ({ ...HAIKU, ...thay });
  it('bắt địa chỉ sai chuẩn và http', () => {
    expect(kiemTraCauHinh({ models: [m({ diaChiCong: 'https://apilit.dev/v1' })], phanViec: { MAC_DINH: 'm1' } }).join()).toContain('không ghi /v1');
    expect(kiemTraCauHinh({ models: [m({ chuan: 'openai', diaChiCong: 'https://apilit.dev' })], phanViec: { MAC_DINH: 'm1' } }).join()).toContain('cần /v1');
    expect(kiemTraCauHinh({ models: [m({ diaChiCong: 'http://apilit.dev' })], phanViec: { MAC_DINH: 'm1' } }).join()).toContain('https://');
  });
  it('bắt thiếu ID, trùng mã, thiếu model mặc định, việc chọn model đã xóa', () => {
    const loi = kiemTraCauHinh({ models: [m({ modelId: '' }), m()], phanViec: { TIM_BAI_DOC: 'm9' } }).join('\n');
    expect(loi).toContain('thiếu ID model');
    expect(loi).toContain('bị trùng');
    expect(loi).toContain('model mặc định');
    expect(loi).toContain('không còn trong danh sách');
  });
  it('việc chưa chọn riêng thì dùng model mặc định', () => {
    const c = { models: [HAIKU, SONNET], phanViec: { MAC_DINH: 'm1' } };
    expect(chonModelChoViec(c, 'SOAN_DE')?.id).toBe('m1');
    expect(chonModelChoViec({ models: [], phanViec: {} }, 'SOAN_DE')).toBeNull();
  });
  it('làm sạch dữ liệu từ giao diện: bỏ /v1 thừa ở chuẩn Anthropic, bỏ việc lạ', () => {
    const [x] = lamSachModels([{ id: 'm1', ten: ' A ', modelId: 'x', chuan: 'anthropic', diaChiCong: 'https://a.dev/v1/', giaVao: '' }]);
    expect(x).toMatchObject({ ten: 'A', diaChiCong: 'https://a.dev', giaVao: undefined });
    expect(lamSachPhanViec({ MAC_DINH: 'm1', LA: 'm2' })).toEqual({ MAC_DINH: 'm1' });
    expect(lamSachModels('khong-phai-mang')).toEqual([]);
    expect(chuanHoaDiaChi('https://a.dev/v1//', 'openai')).toBe('https://a.dev/v1');
  });
  it('mã model mới không trùng; chỉ lộ 4 ký tự cuối của khóa', () => {
    expect(maModelMoi([HAIKU, SONNET])).toBe('m3');
    expect(maModelMoi([{ ...HAIKU, id: 'm2' }])).toBe('m3');
    expect(duoiKhoa('sk-abcdefQszz')).toBe('Qszz');
  });
});

describe('Mã hóa khóa API', () => {
  it('mã hóa rồi giải mã ra đúng khóa; mỗi lần mã hóa một chuỗi khác', () => {
    const a = maHoaKhoa('sk-khoa-that-123', BI_MAT);
    const b = maHoaKhoa('sk-khoa-that-123', BI_MAT);
    expect(a).not.toBe(b);
    expect(a).not.toContain('sk-khoa');
    expect(giaiMaKhoa(a, BI_MAT)).toBe('sk-khoa-that-123');
  });
  it('sai mã bí mật hoặc thiếu mã bí mật thì báo lỗi', () => {
    const a = maHoaKhoa('sk-khoa-that-123', BI_MAT);
    expect(() => giaiMaKhoa(a, 'mot-chuoi-bi-mat-khac-hoan-toan')).toThrow('Không giải mã được');
    expect(() => maHoaKhoa('x', 'ngan')).toThrow('AI_KHOA_BI_MAT');
  });
});

describe('Gọi model', () => {
  it('chuẩn Anthropic: gọi /v1/messages với x-api-key, có công cụ tìm web khi cần', async () => {
    const f = vi.fn(async () => phanHoi(200, {
      content: [{ type: 'server_tool_use' }, { type: 'web_search_tool_result' }, { type: 'text', text: 'Xin ' }, { type: 'text', text: 'chào' }],
      usage: { input_tokens: 10, output_tokens: 2 },
    }));
    const kq = await goiModel(SONNET, 'khoa-thu', { noiDung: 'hi', heThong: 'ht', timWeb: true }, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://apilit.dev/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('khoa-thu');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: 'pro/claude-sonnet-5-5-medium', system: 'ht' });
    expect(body.tools[0].name).toBe('web_search');
    expect(kq).toMatchObject({ traLoi: 'Xin chào', daTimWeb: true, tokenVao: 10 });
  });
  it('cổng không nhận công cụ tìm web thì tự gọi lại không tìm web', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(phanHoi(400, { error: { message: 'tool type web_search_20250305 not supported' } }))
      .mockResolvedValueOnce(phanHoi(200, { content: [{ type: 'text', text: '[]' }] }));
    const kq = await goiModel(SONNET, 'k', { noiDung: 'x', timWeb: true }, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(2);
    expect(JSON.parse((f.mock.calls[1][1] as RequestInit).body as string).tools).toBeUndefined();
    expect(kq.daTimWeb).toBe(false);
  });
  it('tìm web bị cổng dừng giữa chừng (pause_turn) thì gửi lại phần đã có để model làm tiếp', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(phanHoi(200, { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', name: 'web_search' }, { type: 'web_search_tool_result' }] }))
      .mockResolvedValueOnce(phanHoi(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"daTimThay": true}' }], usage: { output_tokens: 9 } }));
    const kq = await goiModel(SONNET, 'k', { noiDung: 'x', timWeb: true }, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(2);
    const body2 = JSON.parse((f.mock.calls[1][1] as RequestInit).body as string);
    expect(body2.messages).toHaveLength(2);
    expect(body2.messages[1].role).toBe('assistant');
    expect(kq).toMatchObject({ traLoi: '{"daTimThay": true}', daTimWeb: true, lyDoDung: 'end_turn', soLanTim: 1 });
  });
  it('báo lý do dừng khi câu trả lời bị cắt vì hết dung lượng', async () => {
    const f = vi.fn(async () => phanHoi(200, { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"daTimThay": tr' }] }));
    const kq = await goiModel(SONNET, 'k', { noiDung: 'x' }, f as unknown as typeof fetch);
    expect(kq.lyDoDung).toBe('max_tokens');
  });
  it('chuẩn OpenAI: gọi /chat/completions với Bearer', async () => {
    const f = vi.fn(async () => phanHoi(200, { choices: [{ message: { content: 'OK' } }] }));
    const kq = await thuModel(GPT, 'khoa-thu', f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://apilit.dev/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer khoa-thu');
    expect(kq.traLoi).toBe('OK');
  });
  it('báo lỗi dễ hiểu khi sai khóa hoặc sai model', async () => {
    const f401 = vi.fn(async () => phanHoi(401, { error: { message: 'invalid x-api-key' } }));
    await expect(goiModel(HAIKU, 'sai', { noiDung: 'x' }, f401 as unknown as typeof fetch)).rejects.toThrow('Khóa API không đúng');
    const f404 = vi.fn(async () => phanHoi(404, { error: { message: 'model not found' } }));
    await expect(goiModel(GPT, 'k', { noiDung: 'x' }, f404 as unknown as typeof fetch)).rejects.toThrow('ID model và địa chỉ cổng');
  });
});

describe('AI tìm bài đọc', () => {
  const tc: TieuChiTimBaiDoc = { loai: 'DOC_HIEU', ky: 'CUOI_HK1', chuDiem: 'Niềm vui sáng tạo', theLoai: 'TRUYEN', soBai: 2 };
  it('đọc mảng JSON kể cả khi AI bọc trong ```json', () => {
    expect(docMangJson('Đây:\n```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
    expect(() => docMangJson('không có gì')).toThrow('JSON');
  });
  it('bỏ bài thiếu nội dung, giữ đúng số bài, thể loại lạ thì theo tiêu chí', () => {
    const traLoi = JSON.stringify([
      { tieuDe: 'Bài 1', noiDung: 'Nội dung 1', tacGia: 'A', nguon: 'Báo X', nguonUrl: 'https://x.vn/a', theLoai: 'LA', lyDoPhuHop: 'hợp chủ điểm' },
      { tieuDe: 'Bài 2', noiDung: '' },
      { tieuDe: 'Bài 3', noiDung: 'Nội dung 3', theLoai: 'MIEU_TA' },
      { tieuDe: 'Bài 4', noiDung: 'Nội dung 4' },
    ]);
    const ds = docDeXuatBaiDoc(traLoi, tc, false);
    expect(ds.map((b) => b.tieuDe)).toEqual(['Bài 1', 'Bài 3']);
    expect(ds[0]).toMatchObject({ theLoai: 'TRUYEN', chuDiem: 'Niềm vui sáng tạo' });
    expect(ds[1].theLoai).toBe('MIEU_TA');
    expect(ds[0].lyDoPhuHop).toContain('không tìm web được');
  });
  it('chẩn đoán: nói rõ AI gửi mấy bài và vì sao bị loại', () => {
    const traLoi = JSON.stringify([
      { tieuDe: 'Bài 1', noiDung: 'Nội dung 1' },
      { tieuDe: 'Bài 2', noiDung: '' },
      { noiDung: 'Không có tiêu đề' },
      { tieuDe: 'Bài 4', noiDung: 'Nội dung 4' },
      { tieuDe: 'Bài 5', noiDung: 'Nội dung 5' },
    ]);
    const { baiDoc, chanDoan } = phanTichTraLoiAI(traLoi, tc, true);
    expect(baiDoc.map((b) => b.tieuDe)).toEqual(['Bài 1', 'Bài 4']);
    expect(chanDoan.soAIGui).toBe(5);
    expect(chanDoan.daTimWeb).toBe(true);
    expect(chanDoan.biLoai).toEqual([
      { tieuDe: 'Bài 2', lyDo: 'Thiếu nội dung bài' },
      { tieuDe: '(không có tiêu đề)', lyDo: 'Thiếu tiêu đề' },
      { tieuDe: 'Bài 5', lyDo: 'Vượt số bài yêu cầu (2)' },
    ]);
  });
  it('chẩn đoán: AI trả mảng rỗng thì có trích phản hồi', () => {
    const { baiDoc, chanDoan } = phanTichTraLoiAI('Không tìm được bài phù hợp. []', tc, true);
    expect(baiDoc).toEqual([]);
    expect(chanDoan.soAIGui).toBe(0);
    expect(chanDoan.trichDau).toContain('Không tìm được');
  });
  it('gửi lời nhắc của tổ, bật tìm web', async () => {
    const goi = vi.fn(async (_y: unknown) => ({ traLoi: '[]', daTimWeb: true }));
    expect(await taoAIBaiDoc(goi).timBaiDoc(tc)).toEqual([]);
    const yc = goi.mock.calls[0][0] as unknown as { noiDung: string; timWeb: boolean; heThong: string };
    expect(yc.timWeb).toBe(true);
    expect(yc.noiDung).toContain('280 – 300 tiếng');
    expect(yc.heThong).toContain('Không bịa');
  });
});
