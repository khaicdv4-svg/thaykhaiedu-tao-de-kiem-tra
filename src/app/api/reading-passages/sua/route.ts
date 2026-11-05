import { NextRequest, NextResponse } from 'next/server';
import { suaBaiDocChoDuyet, type ThayDoiBaiDoc } from '@/lib/repositories/kho-bai-doc.repository';

/** Tổ trưởng sửa bài trong hàng chờ (loại bài, kì, chủ điểm, nội dung...). Máy chủ kiểm tra lại. */
export async function POST(req: NextRequest) {
  try {
    const { id, bai } = (await req.json()) as { id?: string; bai?: ThayDoiBaiDoc };
    if (!id || !bai) return NextResponse.json({ error: 'Thiếu bài đọc.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await suaBaiDocChoDuyet(id, bai)) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
