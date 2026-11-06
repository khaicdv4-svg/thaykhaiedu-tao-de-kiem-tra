import { NextRequest, NextResponse } from 'next/server';
import { danhSachDaDuyet } from '@/lib/repositories/kho-bai-doc.repository';
import type { KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';

/** Bài đã duyệt của một kì, để chọn bài đọc cho đề. */
export async function GET(req: NextRequest) {
  try {
    const ky = req.nextUrl.searchParams.get('ky') as KyKiemTraBaiDoc | null;
    if (!ky) return NextResponse.json({ error: 'Thiếu kì kiểm tra.' }, { status: 400 });
    return NextResponse.json({ success: true, baiDoc: await danhSachDaDuyet({ ky }) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
