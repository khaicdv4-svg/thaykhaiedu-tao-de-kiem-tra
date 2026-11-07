import { NextRequest, NextResponse } from 'next/server';
import { layDe, layDeTheoId, luuDe, xoaDe } from '@/lib/repositories/ma-tran-dac-ta.repository';
import type { DeKiemTra, TrangThaiDe } from '@/core/de/de';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 401 : e instanceof Error && /không có quyền|Không tìm thấy đề|Giáo viên chỉ xóa|Không được/.test(e.message) ? 403 : 400);

/** GET ?mon=&ky= → đề của chính người đăng nhập. GET ?id= → một đề theo mã (nếu được phép xem). */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    if (id) return NextResponse.json({ success: true, de: await layDeTheoId(id) });
    return NextResponse.json({ success: true, ...(await layDe(sp.get('mon') ?? '', sp.get('ky') ?? '')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}

/** POST { mon, ky, dacTaId, de, trangThai } → lưu đề của chính mình, máy chủ kiểm định lại. trangThai SAN_SANG_DUYET = gửi thẩm định. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; ky?: string; dacTaId?: string; de?: DeKiemTra; trangThai?: TrangThaiDe };
    if (!b.mon || !b.ky || !b.dacTaId || !b.de) return loi('Thiếu môn, kì, đặc tả hoặc nội dung đề.');
    return NextResponse.json({ success: true, ...(await luuDe(b.mon, b.ky, b.dacTaId, b.de, b.trangThai ?? 'BAN_NHAP')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}

/** DELETE ?id= → xóa đề (người tạo: khi còn nháp hoặc bị trả lại; Ban giám hiệu: mọi đề). Bản đã duyệt được giữ lại. */
export async function DELETE(req: NextRequest) {
  try {
    await xoaDe(req.nextUrl.searchParams.get('id') ?? '');
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
