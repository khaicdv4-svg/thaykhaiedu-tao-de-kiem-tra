import { NextRequest, NextResponse } from 'next/server';
import { taoBaiTuBanChinh } from '@/lib/repositories/kho-bai-doc.repository';

/** Lưu bản AI chỉnh độ dài thành bài mới, bài gốc giữ nguyên. */
export async function POST(req: NextRequest) {
  try {
    const { idGoc, noiDung } = (await req.json()) as { idGoc?: string; noiDung?: string };
    if (!idGoc || !noiDung) return NextResponse.json({ error: 'Thiếu bài gốc hoặc nội dung.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await taoBaiTuBanChinh(idGoc, noiDung)) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
