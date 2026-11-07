import { NextRequest, NextResponse } from 'next/server';
import { danhSachDe } from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 401 : 400);

/** GET → các đề người đăng nhập được xem, kèm thao tác được phép. */
export async function GET(_req: NextRequest) {
  try {
    return NextResponse.json({ success: true, de: await danhSachDe() });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
