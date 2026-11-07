import { NextResponse } from 'next/server';
import { quyenCuaToi } from '@/lib/repositories/phan-quyen.repository';

export async function GET() {
  try {
    return NextResponse.json({ success: true, quyen: await quyenCuaToi() });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : 400 });
  }
}
