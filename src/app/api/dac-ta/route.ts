import { NextRequest, NextResponse } from 'next/server';
import { layDacTa, luuNhapDacTa, xacNhanDacTa } from '@/lib/repositories/ma-tran-dac-ta.repository';
import type { DacTa, TrangThaiDacTa } from '@/core/dac-ta/dac-ta';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Chỉ tổ trưởng|Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 403 : 400);

/** GET ?mon=TOAN&ky=CUOI_HK1 → bản nháp và phiên bản đặc tả đã xác nhận mới nhất. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    return NextResponse.json({ success: true, ...(await layDacTa(sp.get('mon') ?? '', sp.get('ky') ?? '')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}

/** POST { hanhDong: 'LUU_NHAP' | 'XAC_NHAN', mon, ky, maTranRiengId, dacTa, trangThai? } */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { hanhDong?: string; mon?: string; ky?: string; maTranRiengId?: string; dacTa?: DacTa; trangThai?: TrangThaiDacTa };
    if (!b.mon || !b.ky || !b.maTranRiengId || !b.dacTa) return loi('Thiếu môn, kì, ma trận riêng hoặc nội dung đặc tả.');
    if (b.hanhDong === 'LUU_NHAP') return NextResponse.json({ success: true, ban: await luuNhapDacTa(b.mon, b.ky, b.maTranRiengId, b.dacTa, b.trangThai ?? 'BAN_NHAP') });
    if (b.hanhDong === 'XAC_NHAN') return NextResponse.json({ success: true, ...(await xacNhanDacTa(b.mon, b.ky, b.maTranRiengId, b.dacTa)) });
    return loi('Thao tác không hợp lệ.');
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
