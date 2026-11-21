import { NextRequest, NextResponse } from 'next/server';
import { maTranChungTuKho } from '@/lib/repositories/kho-ma-tran.repository';

/** GET ?mon=&ky= → ma trận chung đã xác nhận mới nhất của tổ, đọc từ bảng trong file Word đã tải lên. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    return NextResponse.json({ success: true, ...(await maTranChungTuKho(sp.get('mon') ?? '', sp.get('ky') ?? '')) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : 400 });
  }
}
