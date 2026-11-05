import { NextRequest, NextResponse } from 'next/server';
import { docCauHinhHienThi, luuCauHinh, LoiQuyen, type DuLieuLuu } from '@/lib/repositories/cai-dat-ai.repository';

function traLoi(err: unknown) {
  const status = err instanceof LoiQuyen ? 403 : 400;
  return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status });
}

/** Cấu hình AI của trường (chỉ tổ trưởng). Không bao giờ trả khóa, chỉ 4 ký tự cuối. */
export async function GET() {
  try {
    return NextResponse.json(await docCauHinhHienThi());
  } catch (err) {
    return traLoi(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const dl = (await req.json()) as DuLieuLuu;
    return NextResponse.json(await luuCauHinh(dl));
  } catch (err) {
    return traLoi(err);
  }
}
