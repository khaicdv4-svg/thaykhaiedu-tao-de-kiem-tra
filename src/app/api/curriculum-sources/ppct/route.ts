import { NextRequest, NextResponse } from 'next/server';
import { CurriculumSourceRepository } from '@/lib/repositories/curriculum-source.repository';

/** Lịch tiết và YCCĐ đã nhập của một môn: GET ?sourceId=... */
export async function GET(req: NextRequest) {
  try {
    const sourceId = new URL(req.url).searchParams.get('sourceId');
    if (!sourceId) return NextResponse.json({ error: 'Thiếu sourceId.' }, { status: 400 });
    const data = await new CurriculumSourceRepository().layPpctDaNhap(sourceId);
    return NextResponse.json({ success: true, ...data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
