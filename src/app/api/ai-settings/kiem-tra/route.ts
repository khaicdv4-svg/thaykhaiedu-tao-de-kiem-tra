import { NextRequest, NextResponse } from 'next/server';
import { LoiQuyen, thuModelBangKhoa } from '@/lib/repositories/cai-dat-ai.repository';

/** Gửi một câu ngắn tới model để xem khóa, địa chỉ cổng và ID model có đúng không. */
export async function POST(req: NextRequest) {
  try {
    const { model, khoaVuaGo } = (await req.json()) as { model?: unknown; khoaVuaGo?: string };
    const kq = await thuModelBangKhoa(model, khoaVuaGo);
    return NextResponse.json({ ok: true, traLoi: kq.traLoi.slice(0, 60), thoiGianMs: kq.thoiGianMs });
  } catch (err) {
    const status = err instanceof LoiQuyen ? 403 : 200;
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status });
  }
}
