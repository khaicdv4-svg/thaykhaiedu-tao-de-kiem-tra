import { NextRequest, NextResponse } from 'next/server';
import { danhSachNganHang, datKiemDinh, luuVaoNganHang, xoaKhoiNganHang } from '@/lib/repositories/ngan-hang.repository';
import type { CauDe } from '@/core/de/de';

const loi = (e: unknown, status = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });

/** GET ?mon=&muc=&hinhThuc=&dang=&q=&daKiemDinh=1 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const muc = Number(sp.get('muc'));
    return NextResponse.json({
      success: true,
      ...(await danhSachNganHang({
        mon: sp.get('mon') || undefined, muc: muc >= 1 && muc <= 3 ? muc : undefined, hinhThuc: sp.get('hinhThuc') || undefined,
        dang: sp.get('dang') || undefined, q: sp.get('q') || undefined, chiDaKiemDinh: sp.get('daKiemDinh') === '1',
      })),
    });
  } catch (e) {
    return loi(e);
  }
}

/** POST { hanhDong: 'LUU', mon, cau, chuDe } | { hanhDong: 'KIEM_DINH', id, daKiemDinh } */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { hanhDong?: string; mon?: string; cau?: CauDe; chuDe?: string; id?: string; daKiemDinh?: boolean };
    if (b.hanhDong === 'LUU') {
      if (!b.mon || !b.cau) return loi('Thiếu môn hoặc nội dung câu.');
      return NextResponse.json({ success: true, ...(await luuVaoNganHang(b.mon, b.cau, b.chuDe ?? '')) });
    }
    if (b.hanhDong === 'KIEM_DINH') {
      if (!b.id) return loi('Thiếu câu cần đánh dấu.');
      await datKiemDinh(b.id, !!b.daKiemDinh);
      return NextResponse.json({ success: true });
    }
    return loi('Thao tác không hợp lệ.');
  } catch (e) {
    return loi(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return loi('Thiếu câu cần xóa.');
    await xoaKhoiNganHang(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e);
  }
}
