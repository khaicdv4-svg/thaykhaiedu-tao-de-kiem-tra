import { NextRequest, NextResponse } from 'next/server';
import { dsTietPpct } from '@/lib/repositories/chuong-trinh.repository';

/** Lịch tiết của một môn lớp 4: GET ?mon=TOAN&lop=4 */
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const mon = sp.get('mon');
    const lop = Number(sp.get('lop') ?? 4);
    if (!mon) return NextResponse.json({ error: 'Thiếu môn.' }, { status: 400 });
    return NextResponse.json({ success: true, tiet: await dsTietPpct(mon, lop) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
