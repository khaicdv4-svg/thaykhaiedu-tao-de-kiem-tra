import { NextRequest, NextResponse } from 'next/server';
import { choTaiLenMauDe } from '@/lib/repositories/mau-de.repository';

/** POST { o, tenFile } → chỗ tải lên (đường dẫn + mã) để trình duyệt tải file thẳng vào kho file. */
export async function POST(req: NextRequest) {
  try {
    const { o, tenFile } = (await req.json()) as { o?: string; tenFile?: string };
    return NextResponse.json({ success: true, ...(await choTaiLenMauDe(o ?? '', tenFile ?? '')) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : /Chỉ tổ trưởng/.test(msg) ? 403 : 400 });
  }
}
