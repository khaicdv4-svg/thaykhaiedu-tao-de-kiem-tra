import { NextRequest, NextResponse } from 'next/server';
import { layDe, luuDe, xoaDe } from '@/lib/repositories/ma-tran-dac-ta.repository';
import type { DeKiemTra, TrangThaiDe } from '@/core/de/de';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Chỉ tổ trưởng|Bạn chỉ xóa|Đề đã được duyệt|Giáo viên không|Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 403 : 400);

/** GET ?mon=TOAN&ky=CUOI_HK1 → đề đang soạn. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    return NextResponse.json({ success: true, ...(await layDe(sp.get('mon') ?? '', sp.get('ky') ?? '')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}

/** POST { mon, ky, dacTaId, de, trangThai } → lưu đề, máy chủ kiểm định lại. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; ky?: string; dacTaId?: string; de?: DeKiemTra; trangThai?: TrangThaiDe };
    if (!b.mon || !b.ky || !b.dacTaId || !b.de) return loi('Thiếu môn, kì, đặc tả hoặc nội dung đề.');
    return NextResponse.json({ success: true, ...(await luuDe(b.mon, b.ky, b.dacTaId, b.de, b.trangThai ?? 'BAN_NHAP')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}

/** DELETE ?mon=&ky= → xóa đề đang soạn (quản lý: mọi đề; giáo viên: đề mình tạo, chưa duyệt). Bản đã duyệt được giữ lại. */
export async function DELETE(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    await xoaDe(sp.get('mon') ?? '', sp.get('ky') ?? '');
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
