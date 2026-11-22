import { NextRequest, NextResponse } from 'next/server';
import { batDauLai } from '@/lib/repositories/ma-tran-dac-ta.repository';

/** POST { mon, ky } → cất ma trận riêng, đặc tả của chính mình vào lịch sử để làm mới từ ma trận chung hiện tại. */
export async function POST(req: NextRequest) {
  try {
    const { mon, ky } = (await req.json()) as { mon?: string; ky?: string };
    if (!mon || !ky) return NextResponse.json({ error: 'Thiếu môn hoặc kì.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await batDauLai(mon, ky)) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : 400 });
  }
}
