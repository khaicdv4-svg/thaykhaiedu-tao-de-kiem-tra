import { NextRequest, NextResponse } from 'next/server';
import { dsMucLucSgk } from '@/lib/repositories/chuong-trinh.repository';

/** Mục lục SGK của một môn lớp 4: GET ?mon=TIENG_VIET&lop=4 */
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const mon = sp.get('mon');
    const lop = Number(sp.get('lop') ?? 4);
    if (!mon) return NextResponse.json({ error: 'Thiếu môn.' }, { status: 400 });
    return NextResponse.json({ success: true, mucLuc: await dsMucLucSgk(mon, lop) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
