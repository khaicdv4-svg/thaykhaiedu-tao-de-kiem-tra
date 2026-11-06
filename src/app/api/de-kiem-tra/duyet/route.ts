import { NextRequest, NextResponse } from 'next/server';
import { duyetDe } from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Chỉ tổ trưởng|Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 403 : 400);

/** POST { mon, ky, hanhDong: 'DUYET' | 'TRA_LAI', ghiChu? } */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; ky?: string; hanhDong?: string; ghiChu?: string };
    if (!b.mon || !b.ky) return loi('Thiếu môn hoặc kì.');
    if (b.hanhDong !== 'DUYET' && b.hanhDong !== 'TRA_LAI') return loi('Thao tác không hợp lệ.');
    return NextResponse.json({ success: true, ...(await duyetDe(b.mon, b.ky, b.hanhDong, b.ghiChu ?? '')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
