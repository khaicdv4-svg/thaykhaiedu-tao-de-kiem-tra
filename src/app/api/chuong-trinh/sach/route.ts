import { NextRequest, NextResponse } from 'next/server';
import { dsSach, taoSach, xoaSach } from '@/lib/repositories/sach.repository';
import { TEN_MON } from '@/core/chuong-trinh/mon';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Chỉ tổ trưởng|Cần đăng nhập|Chưa cấu hình/.test(m) ? 403 : 400 });
};

/** Danh sách sách đã tải lên của lớp: GET ?lop=4 */
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ success: true, sach: await dsSach(Number(req.nextUrl.searchParams.get('lop') ?? 4)) });
  } catch (e) { return loi(e); }
}

/** Tạo cuốn sách rỗng (thay cuốn cũ cùng môn, loại, tập): POST { mon, lop, loai, tap, tenFile, soTrangPdf, trangDauPdf } → { id } */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; lop?: number; loai?: 'SGK' | 'SGV'; tap?: number; tenFile?: string; soTrangPdf?: number; trangDauPdf?: number };
    if (!b.mon || !TEN_MON[b.mon]) return NextResponse.json({ error: 'Thiếu hoặc sai môn.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await taoSach({ mon: b.mon, lop: b.lop ?? 4, loai: b.loai as 'SGK' | 'SGV', tap: Number(b.tap), tenFile: b.tenFile ?? '', soTrangPdf: Number(b.soTrangPdf), trangDauPdf: Number(b.trangDauPdf ?? 1) })) });
  } catch (e) { return loi(e); }
}

/** Xóa một cuốn sách và chữ của nó: DELETE ?id= */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu mã sách.' }, { status: 400 });
    await xoaSach(id);
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}
