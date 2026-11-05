import { NextRequest, NextResponse } from 'next/server';
import { danhSachHangCho, luuVaoHangCho, type BaiDocNhapKho } from '@/lib/repositories/kho-bai-doc.repository';

export async function GET() {
  try {
    return NextResponse.json({ success: true, baiDoc: await danhSachHangCho() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

/** Lưu các bài đã phân tích vào hàng chờ duyệt (bài còn lỗi lưu thành bản nháp). */
export async function POST(req: NextRequest) {
  try {
    const { baiDoc } = (await req.json()) as { baiDoc?: BaiDocNhapKho[] };
    if (!baiDoc?.length) return NextResponse.json({ error: 'Chưa chọn bài nào.' }, { status: 400 });
    if (baiDoc.length > 50) return NextResponse.json({ error: 'Mỗi lần lưu tối đa 50 bài.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await luuVaoHangCho(baiDoc)) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
