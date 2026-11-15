import { NextRequest, NextResponse } from 'next/server';
import { dongBoTuHub, layTrangThaiHub, NAM_HOC_MAC_DINH } from '@/lib/repositories/ppct-hub.repository';

export const dynamic = 'force-dynamic';

/** Trạng thái kết nối với kho chung PPCT HUB: GET ?namHoc=2026-2027 */
export async function GET(req: NextRequest) {
  const namHoc = new URL(req.url).searchParams.get('namHoc') || NAM_HOC_MAC_DINH;
  const kq = await layTrangThaiHub(namHoc);
  return NextResponse.json({ success: true, ...kq }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Lấy PPCT từ kho chung về Xưởng: POST { lop: 4, mon?: "subj-tv4", namHoc? } */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { lop?: unknown; mon?: unknown; namHoc?: unknown };
    const lop = Number(body.lop);
    const mon = typeof body.mon === 'string' && body.mon ? body.mon : null;
    const namHoc = typeof body.namHoc === 'string' && body.namHoc ? body.namHoc : NAM_HOC_MAC_DINH;
    const ketQua = await dongBoTuHub(lop, mon, namHoc);
    if (ketQua.length === 0) {
      return NextResponse.json({ error: 'Kho chung chưa có bản công bố nào cho lựa chọn này.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ketQua, trangThai: await layTrangThaiHub(namHoc) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
