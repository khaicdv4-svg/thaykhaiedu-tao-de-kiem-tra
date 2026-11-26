import { NextRequest, NextResponse } from 'next/server';
import { chonDeChinh, phanCongXoayVong } from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : /Chỉ |chưa có quyền/.test(m) ? 403 : 400 });
};

/**
 * Việc của tổ với các đề của một môn, kì (khối đang làm việc):
 * POST { viec: 'XOAY_VONG', mon, ky } → phân công kiểm tra chéo xoay vòng.
 * POST { viec: 'CHON_DE_CHINH', mon, ky, ds: [id...] } → chọn tối đa 3 đề chính nộp Ban giám hiệu.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { viec?: string; mon?: string; ky?: string; ds?: string[] };
    if (!b.mon || !b.ky) throw new Error('Chưa chọn môn, kì.');
    if (b.viec === 'XOAY_VONG') return NextResponse.json({ success: true, phanCong: await phanCongXoayVong(b.mon, b.ky) });
    if (b.viec === 'CHON_DE_CHINH') return NextResponse.json({ success: true, soDe: await chonDeChinh(b.mon, b.ky, Array.isArray(b.ds) ? b.ds : []) });
    throw new Error('Việc không hợp lệ.');
  } catch (e) { return loi(e); }
}
