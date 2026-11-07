import { NextRequest, NextResponse } from 'next/server';
import { dsUyQuyen, giaoUyQuyen, thuHoiUyQuyen } from '@/lib/repositories/phan-quyen.repository';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : /Chỉ /.test(m) ? 403 : 400 });
};

export async function GET() {
  try { return NextResponse.json({ success: true, uyQuyen: await dsUyQuyen() }); } catch (e) { return loi(e); }
}

/** POST { nguoiNhan, hanhDong[], khoi?, den, lyDo } — tổ trưởng hoặc Ban giám hiệu. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { nguoiNhan?: string; hanhDong?: string[]; khoi?: number | null; den?: string; lyDo?: string };
    if (!b.nguoiNhan || !b.den) throw new Error('Thiếu người nhận hoặc ngày hết hạn.');
    await giaoUyQuyen(b.nguoiNhan, b.hanhDong ?? [], b.khoi ?? null, b.den, b.lyDo ?? '');
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    await thuHoiUyQuyen(req.nextUrl.searchParams.get('id') ?? '');
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}
