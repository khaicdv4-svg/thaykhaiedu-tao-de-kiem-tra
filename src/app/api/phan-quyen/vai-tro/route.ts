import { NextRequest, NextResponse } from 'next/server';
import { capVaiTro, dsVaiTroCapThem, thuHoiVaiTro } from '@/lib/repositories/phan-quyen.repository';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : /Chỉ quản trị/.test(m) ? 403 : 400 });
};

export async function GET() {
  try { return NextResponse.json({ success: true, vaiTro: await dsVaiTroCapThem() }); } catch (e) { return loi(e); }
}

/** POST { userId, vaiTro, khoi?, den?, lyDo } — chỉ quản trị viên hệ thống. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { userId?: string; vaiTro?: string; khoi?: number | null; den?: string | null; lyDo?: string };
    if (!b.userId || !b.vaiTro) throw new Error('Thiếu người dùng hoặc vai trò.');
    await capVaiTro(b.userId, b.vaiTro, b.khoi ?? null, b.den || null, b.lyDo ?? '');
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    await thuHoiVaiTro(req.nextUrl.searchParams.get('id') ?? '');
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}
