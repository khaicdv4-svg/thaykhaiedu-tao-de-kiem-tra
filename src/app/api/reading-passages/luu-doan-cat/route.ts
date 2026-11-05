import { NextRequest, NextResponse } from 'next/server';
import { taoBaiTuDoanCat } from '@/lib/repositories/kho-bai-doc.repository';

/** Lưu đoạn cắt thành bài đọc thành tiếng mới, giữ bài gốc. */
export async function POST(req: NextRequest) {
  try {
    const { idGoc, doan } = (await req.json()) as { idGoc?: string; doan?: string };
    if (!idGoc || !doan) return NextResponse.json({ error: 'Thiếu bài gốc hoặc đoạn cắt.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await taoBaiTuDoanCat(idGoc, doan)) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
