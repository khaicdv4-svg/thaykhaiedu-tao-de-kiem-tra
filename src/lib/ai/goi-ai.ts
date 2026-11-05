/**
 * ThayKhaiEdu - Gọi model AI theo chuẩn Anthropic hoặc chuẩn OpenAI.
 * CHỈ dùng ở máy chủ. Khóa không bao giờ gửi về trình duyệt.
 */

import type { ModelAI } from '@/core/services/ai/cau-hinh-ai';

export interface YeuCauAI {
  heThong?: string;
  noiDung: string;
  toiDaToken?: number;
  /** Cho model tìm web (chỉ chuẩn Anthropic). Cổng không hỗ trợ thì tự gọi lại không tìm web. */
  timWeb?: boolean;
  /** Thời gian chờ tối đa (mili giây). */
  choToiDa?: number;
}

export interface KetQuaAI {
  traLoi: string;
  daTimWeb: boolean;
  tokenVao?: number;
  tokenRa?: number;
  thoiGianMs: number;
}

type HamFetch = typeof fetch;

const CONG_CU_TIM_WEB = { type: 'web_search_20250305', name: 'web_search', max_uses: 5 };

async function guiJson(f: HamFetch, url: string, headers: Record<string, string>, body: unknown, choToiDa: number) {
  const ctl = new AbortController();
  const hen = setTimeout(() => ctl.abort(), choToiDa);
  try {
    const r = await f(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const chu = await r.text();
    let json: any = null;
    try {
      json = chu ? JSON.parse(chu) : null;
    } catch {
      /* cổng trả về không phải JSON */
    }
    return { ok: r.ok, status: r.status, json, chu };
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error(`Model không trả lời trong ${Math.round(choToiDa / 1000)} giây.`);
    throw new Error(`Không kết nối được tới cổng AI: ${(e as Error).message}`);
  } finally {
    clearTimeout(hen);
  }
}

function moTaLoi(status: number, json: any, chu: string): string {
  const tin = json?.error?.message || json?.message || (typeof json?.error === 'string' ? json.error : '') || chu.slice(0, 200);
  if (status === 401 || status === 403) return `Khóa API không đúng hoặc không có quyền dùng model này (${status}). ${tin}`.trim();
  if (status === 404) return `Không tìm thấy model hoặc địa chỉ cổng sai (404). Kiểm tra ID model và địa chỉ cổng. ${tin}`.trim();
  if (status === 429) return `Cổng AI báo gọi quá nhiều hoặc hết hạn mức (429). ${tin}`.trim();
  return `Cổng AI báo lỗi ${status}. ${tin}`.trim();
}

async function goiAnthropic(f: HamFetch, m: ModelAI, khoa: string, y: YeuCauAI, timWeb: boolean) {
  const body: Record<string, unknown> = {
    model: m.modelId,
    max_tokens: y.toiDaToken ?? 4000,
    messages: [{ role: 'user', content: y.noiDung }],
  };
  if (y.heThong) body.system = y.heThong;
  if (timWeb) body.tools = [CONG_CU_TIM_WEB];
  return guiJson(
    f,
    `${m.diaChiCong.replace(/\/+$/, '')}/v1/messages`,
    { 'x-api-key': khoa, 'anthropic-version': '2023-06-01' },
    body,
    y.choToiDa ?? 120_000,
  );
}

async function goiOpenAI(f: HamFetch, m: ModelAI, khoa: string, y: YeuCauAI) {
  const messages = [] as { role: string; content: string }[];
  if (y.heThong) messages.push({ role: 'system', content: y.heThong });
  messages.push({ role: 'user', content: y.noiDung });
  return guiJson(
    f,
    `${m.diaChiCong.replace(/\/+$/, '')}/chat/completions`,
    { authorization: `Bearer ${khoa}` },
    { model: m.modelId, max_tokens: y.toiDaToken ?? 4000, messages },
    y.choToiDa ?? 120_000,
  );
}

/** Lỗi do cổng không nhận công cụ tìm web (để gọi lại không tìm web). */
function loiDoTimWeb(status: number, json: any, chu: string): boolean {
  if (status !== 400 && status !== 422) return false;
  const t = `${json?.error?.message ?? ''} ${chu}`.toLowerCase();
  return t.includes('web_search') || t.includes('tool');
}

export async function goiModel(m: ModelAI, khoa: string, y: YeuCauAI, f: HamFetch = fetch): Promise<KetQuaAI> {
  const batDau = Date.now();
  if (m.chuan === 'openai') {
    const r = await goiOpenAI(f, m, khoa, y);
    if (!r.ok) throw new Error(moTaLoi(r.status, r.json, r.chu));
    const traLoi = r.json?.choices?.[0]?.message?.content;
    if (typeof traLoi !== 'string') throw new Error('Cổng AI trả về dữ liệu lạ (không có choices[0].message.content).');
    return { traLoi, daTimWeb: false, tokenVao: r.json?.usage?.prompt_tokens, tokenRa: r.json?.usage?.completion_tokens, thoiGianMs: Date.now() - batDau };
  }

  let daTimWeb = !!y.timWeb;
  let r = await goiAnthropic(f, m, khoa, y, daTimWeb);
  if (!r.ok && daTimWeb && loiDoTimWeb(r.status, r.json, r.chu)) {
    daTimWeb = false;
    r = await goiAnthropic(f, m, khoa, y, false);
  }
  if (!r.ok) throw new Error(moTaLoi(r.status, r.json, r.chu));
  const khoi = Array.isArray(r.json?.content) ? r.json.content : [];
  const traLoi = khoi.filter((k: any) => k?.type === 'text').map((k: any) => k.text).join('');
  if (!traLoi) throw new Error('Model không trả lời chữ nào.');
  const coTimThat = khoi.some((k: any) => k?.type === 'web_search_tool_result' || k?.type === 'server_tool_use');
  return {
    traLoi,
    daTimWeb: daTimWeb && coTimThat,
    tokenVao: r.json?.usage?.input_tokens,
    tokenRa: r.json?.usage?.output_tokens,
    thoiGianMs: Date.now() - batDau,
  };
}

/** Gửi một câu ngắn để thử khóa + model. */
export async function thuModel(m: ModelAI, khoa: string, f: HamFetch = fetch): Promise<KetQuaAI> {
  return goiModel(m, khoa, { noiDung: 'Trả lời đúng một chữ: OK', toiDaToken: 20, choToiDa: 30_000 }, f);
}
