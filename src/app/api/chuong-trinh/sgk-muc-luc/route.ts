import { NextRequest, NextResponse } from 'next/server';
import { docMucLuc } from '@/core/chuong-trinh/muc-luc-sgk';
import { dsMucLucSgk, dsTietPpct, thayMucLucSgk } from '@/lib/repositories/chuong-trinh.repository';

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

/**
 * Nạp mục lục SGK: POST { mon, lop, tap, chu } (chu là nội dung CSV hoặc bảng dán từ Excel).
 * Máy chủ đọc và kiểm tra lại; có lỗi thì không lưu. Chỉ tổ trưởng trở lên.
 */
export async function POST(req: NextRequest) {
  try {
    const { mon, lop = 4, tap, chu } = (await req.json()) as { mon?: string; lop?: number; tap?: number; chu?: string };
    if (!mon || !tap || typeof chu !== 'string') return NextResponse.json({ error: 'Thiếu môn, tập hoặc nội dung mục lục.' }, { status: 400 });
    let tiet: { tuan: number | null; baiTen: string | null }[] = [];
    try { tiet = await dsTietPpct(mon, lop); } catch { /* môn chưa có PPCT thì chỉ bỏ qua đối chiếu */ }
    const kq = docMucLuc(chu, tiet);
    if (kq.loi.length) return NextResponse.json({ error: kq.loi.slice(0, 5).join(' ') }, { status: 400 });
    const { soDong } = await thayMucLucSgk(mon, lop, tap, kq.dong);
    return NextResponse.json({ success: true, soDong, canhBao: kq.canhBao });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
