import { NextRequest, NextResponse } from 'next/server';
import { noiDungTaiLieu } from '@/lib/repositories/kho-ma-tran.repository';

export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await noiDungTaiLieu(id)) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
