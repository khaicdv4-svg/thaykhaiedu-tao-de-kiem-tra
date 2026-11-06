import { NextRequest, NextResponse } from 'next/server';
import { danhSachTaiLieu, luuNhieuFile, xoaTaiLieuChuaXacNhan, type FileTaiLen } from '@/lib/repositories/kho-ma-tran.repository';

const loi = (e: unknown, status = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });

export async function GET(req: NextRequest) {
  try {
    const loai = new URL(req.url).searchParams.get('loai');
    if (loai !== 'CA_NAM' && loai !== 'CHUNG') return loi('Thiếu loại ma trận (CA_NAM hoặc CHUNG).');
    return NextResponse.json({ success: true, taiLieu: await danhSachTaiLieu(loai) });
  } catch (e) {
    return loi(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { files } = (await req.json()) as { files?: FileTaiLen[] };
    if (!Array.isArray(files)) return loi('Thiếu danh sách file.');
    return NextResponse.json({ success: true, ketQua: await luuNhieuFile(files) });
  } catch (e) {
    return loi(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return loi('Thiếu id.');
    await xoaTaiLieuChuaXacNhan(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e);
  }
}
