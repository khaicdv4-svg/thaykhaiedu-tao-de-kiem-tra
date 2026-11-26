import { NextRequest, NextResponse } from 'next/server';
import { docBaiDocChon, luuBaiDocChon } from '@/lib/repositories/bai-doc-chon.repository';

const ma = (msg: string) => (/Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : 400);

/** GET ?ky= → bài đọc Tiếng Việt đã chọn ở bước 1 (chưa chọn thì lấy từ đề cũ nếu có). */
export async function GET(req: NextRequest) {
  try {
    const ky = req.nextUrl.searchParams.get('ky') ?? '';
    return NextResponse.json({ success: true, ...(await docBaiDocChon(ky)) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: ma(msg) });
  }
}

/** PUT { ky, baiDoc } → lưu bài đọc của mình cho kì đó. */
export async function PUT(req: NextRequest) {
  try {
    const { ky, baiDoc } = (await req.json()) as { ky?: string; baiDoc?: unknown };
    return NextResponse.json({ success: true, baiDoc: await luuBaiDocChon(ky ?? '', baiDoc) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: ma(msg) });
  }
}
