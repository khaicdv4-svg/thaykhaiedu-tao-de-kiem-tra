import { NextRequest, NextResponse } from 'next/server';
import { dsTaiLieu, themTaiLieu, xoaTaiLieu } from '@/lib/repositories/chuong-trinh.repository';
import { DANH_SACH_MON, LOAI_TAI_LIEU, type LoaiTaiLieu, type NguonTaiLieu } from '@/core/chuong-trinh/mon';
import { lamSachUrl } from '@/core/reading-passages/kiem-tra';
import { layChuTuLink } from '@/lib/doc-link-may-chu';

// Tải và đọc một cuốn SGK PDF từ Drive có thể mất vài chục giây.
export const maxDuration = 300;

const loi = (err: unknown, ma = 400) => NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: ma });

export async function GET() {
  try {
    return NextResponse.json({ success: true, taiLieu: await dsTaiLieu() });
  } catch (err) {
    return loi(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { loai?: string; mon?: string; lop?: number | null; tieuDe?: string; nguon?: string; link?: string; tenFile?: string; noiDung?: string; ghiChu?: string };
    if (!LOAI_TAI_LIEU.some((l) => l.ma === b.loai)) return loi('Chưa chọn loại tài liệu.');
    if (!DANH_SACH_MON.some((m) => m.ma === b.mon)) return loi('Chưa chọn môn.');
    const lop = b.lop ? Number(b.lop) : null;
    if (lop !== null && !(lop >= 1 && lop <= 5)) return loi('Lớp phải từ 1 đến 5.');
    if (b.loai !== 'CT_GDPT' && lop === null) return loi('SGK, SGV cần chọn lớp.');
    const nguon = (['TAI_FILE', 'LINK', 'DAN_CHU'].includes(b.nguon ?? '') ? b.nguon : 'DAN_CHU') as NguonTaiLieu;
    let noiDung = (b.noiDung ?? '').trim();
    let link: string | null = null;
    let canhBao: string | null = null;
    if (nguon === 'LINK') {
      link = lamSachUrl(b.link ?? '');
      if (!link) return loi('Chưa nhập link.');
      if (!noiDung) {
        try {
          noiDung = await layChuTuLink(link);
        } catch (e) {
          canhBao = e instanceof Error ? e.message : String(e);
        }
      }
    }
    if (nguon !== 'LINK' && !noiDung) return loi('Tài liệu không có chữ để lưu.');
    if (noiDung.length > 3_000_000) return loi('Tài liệu quá dài (tối đa khoảng 3 triệu kí tự). Thầy tách thành nhiều phần.');
    const tieuDe = (b.tieuDe ?? '').trim() || b.tenFile || 'Tài liệu chưa đặt tên';
    const tl = await themTaiLieu({ loai: b.loai as LoaiTaiLieu, mon: b.mon!, lop, tieuDe, nguon, link, tenFile: b.tenFile ?? null, noiDung, ghiChu: b.ghiChu ?? null });
    return NextResponse.json({ success: true, taiLieu: tl, canhBao: canhBao ?? (nguon === 'LINK' && !noiDung ? 'Chưa lấy được chữ từ link.' : null) });
  } catch (err) {
    return loi(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return loi('Thiếu mã tài liệu.');
    await xoaTaiLieu(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return loi(err);
  }
}
