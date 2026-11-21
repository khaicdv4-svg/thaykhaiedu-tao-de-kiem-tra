import { NextRequest, NextResponse } from 'next/server';
import { cauTrucMauDe } from '@/lib/repositories/mau-de.repository';

/** GET ?id= → đoạn văn, bảng của bản mẫu để xem lại */
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ success: true, ...(await cauTrucMauDe(req.nextUrl.searchParams.get('id') ?? '')) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
