import { NextRequest, NextResponse } from 'next/server';
import { chuyenTrangThaiDe } from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 401 : e instanceof Error && /Chỉ |Không được|không được phân công|không có quyền|Bạn đã/.test(e.message) ? 403 : 400);

/** POST { id, hanhDong, ghiChu? } → chuyển đề sang bước tiếp theo. Cơ sở dữ liệu quyết định ai được làm gì. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { id?: string; hanhDong?: string; ghiChu?: string };
    if (!b.id || !b.hanhDong) return loi('Thiếu mã đề hoặc thao tác.');
    return NextResponse.json({ success: true, ...(await chuyenTrangThaiDe(b.id, b.hanhDong, b.ghiChu ?? '')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
