import { NextRequest, NextResponse } from 'next/server';
import { kiemTraLinkNguon } from '@/lib/kiem-tra-link-nguon';

/** Mở thử link nguồn, xem trang có chứa nội dung bài đọc không. */
export async function POST(req: NextRequest) {
  const { url, noiDung } = (await req.json()) as { url?: string; noiDung?: string };
  return NextResponse.json(await kiemTraLinkNguon(url, noiDung));
}
