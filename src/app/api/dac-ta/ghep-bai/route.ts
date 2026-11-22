import { NextRequest, NextResponse } from 'next/server';
import { ghepBaiTuDong } from '@/lib/repositories/ghep-bai.repository';
import type { DacTa } from '@/core/dac-ta/dac-ta';

export const maxDuration = 120;

/** POST { mon, ky, dacTa } → đặc tả đã điền bài, tuần, trang cho các câu còn trống. Không lưu; trang tự lưu sau. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; ky?: string; dacTa?: DacTa };
    if (!b.mon || !b.ky || !b.dacTa?.dong) return NextResponse.json({ error: 'Thiếu môn, kì hoặc đặc tả.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await ghepBaiTuDong(b.mon, b.ky, b.dacTa)) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : 400 });
  }
}
