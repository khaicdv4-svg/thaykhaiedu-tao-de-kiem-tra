import { NextRequest, NextResponse } from 'next/server';
import { danhSachThongBao, danhDauDaDoc } from '@/lib/repositories/thong-bao.repository';

const loi = (e: unknown, status = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });

export async function GET() {
  try {
    return NextResponse.json({ success: true, thongBao: await danhSachThongBao() });
  } catch (e) {
    return loi(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids?: string[] };
    if (!Array.isArray(ids)) return loi('Thiếu danh sách thông báo.');
    await danhDauDaDoc(ids);
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e);
  }
}
