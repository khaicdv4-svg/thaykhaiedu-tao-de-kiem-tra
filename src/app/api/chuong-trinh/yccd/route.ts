import { NextRequest, NextResponse } from 'next/server';
import { capNhatYccd, doiTrangThaiNhieu, dsYccd, themYccdTay, xoaYccd } from '@/lib/repositories/chuong-trinh.repository';
import { DANH_SACH_MON, type TrangThaiYccd } from '@/core/chuong-trinh/mon';

const loi = (err: unknown, ma = 400) => NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: ma });
const TT = ['CHO_DUYET', 'DA_DUYET', 'TU_CHOI'];

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const lop = Number(p.get('lop')) || undefined;
    const tt = p.get('trangThai');
    const ds = await dsYccd({ mon: p.get('mon') || undefined, lop, trangThai: tt && TT.includes(tt) ? (tt as TrangThaiYccd) : undefined, taiLieuId: p.get('taiLieuId') || undefined });
    return NextResponse.json({ success: true, yccd: ds });
  } catch (err) {
    return loi(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; lop?: number; mach?: string; chuDe?: string; bai?: string; noiDung?: string };
    if (!DANH_SACH_MON.some((m) => m.ma === b.mon)) return loi('Chưa chọn môn.');
    if (!b.lop || b.lop < 1 || b.lop > 5) return loi('Chưa chọn lớp.');
    if (!b.noiDung?.trim()) return loi('Chưa nhập nội dung YCCĐ.');
    return NextResponse.json({ success: true, yccd: await themYccdTay({ mon: b.mon!, lop: b.lop, mach: b.mach, chuDe: b.chuDe, bai: b.bai, noiDung: b.noiDung }) });
  } catch (err) {
    return loi(err);
  }
}

/** Sửa một YCCĐ (body có id) hoặc duyệt / từ chối nhiều YCCĐ (body có ids + trangThai). */
export async function PATCH(req: NextRequest) {
  try {
    const b = (await req.json()) as { id?: string; ids?: string[]; trangThai?: string; noiDung?: string; mach?: string | null; chuDe?: string | null; bai?: string | null };
    const tt = b.trangThai && TT.includes(b.trangThai) ? (b.trangThai as TrangThaiYccd) : undefined;
    if (b.ids?.length) {
      if (!tt) return loi('Thiếu trạng thái.');
      return NextResponse.json({ success: true, soLuong: await doiTrangThaiNhieu(b.ids, tt) });
    }
    if (!b.id) return loi('Thiếu mã YCCĐ.');
    await capNhatYccd(b.id, { noiDung: b.noiDung, mach: b.mach, chuDe: b.chuDe, bai: b.bai, trangThai: tt });
    return NextResponse.json({ success: true });
  } catch (err) {
    return loi(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean);
    if (!ids.length) return loi('Thiếu mã YCCĐ.');
    await xoaYccd(ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    return loi(err);
  }
}
