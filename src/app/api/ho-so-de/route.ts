import { NextResponse } from 'next/server';
import { danhSachHoSoDe } from '@/lib/repositories/ma-tran-dac-ta.repository';

/** GET → các hồ sơ đề (môn × kì) đang làm của tổ và của chính mình, kèm bước làm tiếp. */
export async function GET() {
  try {
    return NextResponse.json({ success: true, hoSo: await danhSachHoSoDe() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : 400 });
  }
}
