import { NextRequest, NextResponse } from 'next/server';
import { dsBanCuaToi, xoaBanCuaToi } from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : 400 });
};
const laId = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x);

/** GET ?mon=&ky= → mọi bản ma trận riêng, đặc tả của chính mình (kể cả bản đã cất). */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    return NextResponse.json({ success: true, ban: await dsBanCuaToi(sp.get('mon') ?? '', sp.get('ky') ?? '') });
  } catch (e) {
    return loi(e);
  }
}

/** POST { maTran: id[], dacTa: id[], thucHien: boolean } → xem trước (thucHien=false) hoặc xóa bản của chính mình. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { maTran?: unknown[]; dacTa?: unknown[]; thucHien?: boolean };
    const maTran = (Array.isArray(b.maTran) ? b.maTran : []).filter(laId).slice(0, 200);
    const dacTa = (Array.isArray(b.dacTa) ? b.dacTa : []).filter(laId).slice(0, 200);
    return NextResponse.json({ success: true, ...(await xoaBanCuaToi(maTran, dacTa, b.thucHien === true)) });
  } catch (e) {
    return loi(e);
  }
}
