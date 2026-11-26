import { NextRequest, NextResponse } from 'next/server';
import { dsTietPpct } from '@/lib/repositories/chuong-trinh.repository';
import { khoiHoacLamViec } from '@/lib/khoi-lam-viec.server';

/** Lịch tiết của một môn: GET ?mon=TOAN&lop=4 (không gửi lop thì lấy khối đang làm việc) */
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const mon = sp.get('mon');
    const lop = await khoiHoacLamViec(sp.get('lop'));
    if (!mon) return NextResponse.json({ error: 'Thiếu môn.' }, { status: 400 });
    return NextResponse.json({ success: true, tiet: await dsTietPpct(mon, lop) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
