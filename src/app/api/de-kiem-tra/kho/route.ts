import { NextRequest, NextResponse } from 'next/server';
import { danhSachDe, phienBanDeDaDuyet } from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 403 : 400);

/** GET → danh sách đề của trường. GET ?mon=&ky= → thêm các phiên bản đã duyệt của đề đó. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const mon = sp.get('mon');
    const ky = sp.get('ky');
    if (mon && ky) return NextResponse.json({ success: true, phienBan: await phienBanDeDaDuyet(mon, ky) });
    return NextResponse.json({ success: true, de: await danhSachDe() });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
