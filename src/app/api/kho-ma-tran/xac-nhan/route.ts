import { NextRequest, NextResponse } from 'next/server';
import { xacNhanTaiLieu } from '@/lib/repositories/kho-ma-tran.repository';

export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Thiếu id.' }, { status: 400 });
    await xacNhanTaiLieu(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
