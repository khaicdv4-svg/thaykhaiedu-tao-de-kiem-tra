import { NextRequest, NextResponse } from 'next/server';
import { saoChepDe } from '@/lib/repositories/ma-tran-dac-ta.repository';

/** POST { mon, kyNguon, kyDich } → làm đề mới (bản nháp) cho kì đích từ đề đã duyệt của kì nguồn. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; kyNguon?: string; kyDich?: string };
    if (!b.mon || !b.kyNguon || !b.kyDich) return NextResponse.json({ error: 'Thiếu môn hoặc kì.' }, { status: 400 });
    const kq = await saoChepDe(b.mon, b.kyNguon, b.kyDich);
    return NextResponse.json({ success: true, daChep: kq.daChep, trong: kq.trong });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: m }, { status: /Chỉ tổ trưởng|Cần đăng nhập|Chưa cấu hình/.test(m) ? 403 : 400 });
  }
}
