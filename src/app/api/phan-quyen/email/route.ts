import { NextRequest, NextResponse } from 'next/server';
import { dangKyEmail, dsEmailVaiTro, goEmail } from '@/lib/repositories/phan-quyen.repository';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : /Chỉ quản trị/.test(m) ? 403 : 400 });
};

export async function GET() {
  try { return NextResponse.json({ success: true, email: await dsEmailVaiTro() }); } catch (e) { return loi(e); }
}

/** POST { email, vaiTro, khoi?, ghiChu? } — chỉ quản trị hệ thống. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { email?: string; vaiTro?: string; khoi?: number | null; ghiChu?: string };
    if (!b.email || !b.vaiTro) throw new Error('Thiếu Gmail hoặc vai trò.');
    await dangKyEmail(b.email, b.vaiTro, b.khoi ?? null, b.ghiChu ?? '');
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    await goEmail(req.nextUrl.searchParams.get('id') ?? '');
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}
