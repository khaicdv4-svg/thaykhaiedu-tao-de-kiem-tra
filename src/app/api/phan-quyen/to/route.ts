import { NextRequest, NextResponse } from 'next/server';
import { apDungQuyenTo, chuyenGiaoVienSangTo, dsQuyenTo, dsToQuanLy } from '@/lib/repositories/phan-quyen.repository';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : /Chỉ /.test(m) ? 403 : 400 });
};

/** GET: danh sách tổ quản lý được; GET ?khoi=4: bảng quyền giáo viên của tổ. */
export async function GET(req: NextRequest) {
  try {
    const k = req.nextUrl.searchParams.get('khoi');
    if (!k) return NextResponse.json({ success: true, to: await dsToQuanLy() });
    const khoi = Number(k);
    if (!Number.isInteger(khoi) || khoi < 1 || khoi > 5) throw new Error('Khối từ 1 đến 5.');
    return NextResponse.json({ success: true, giaoVien: await dsQuyenTo(khoi) });
  } catch (e) { return loi(e); }
}

/** POST { viec: 'AP_DUNG', khoi, ds: [{user, quyen[]}] } hoặc { viec: 'CHUYEN', user, khoi } (chỉ quản trị). */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { viec?: string; khoi?: number; ds?: { user: string; quyen: string[] }[]; user?: string };
    if (!Number.isInteger(b.khoi) || (b.khoi as number) < 1 || (b.khoi as number) > 5) throw new Error('Khối từ 1 đến 5.');
    if (b.viec === 'AP_DUNG') return NextResponse.json({ success: true, soNguoiDoi: await apDungQuyenTo(b.khoi as number, b.ds ?? []) });
    if (b.viec === 'CHUYEN') {
      if (!b.user) throw new Error('Thiếu người cần chuyển.');
      await chuyenGiaoVienSangTo(b.user, b.khoi as number);
      return NextResponse.json({ success: true });
    }
    throw new Error('Việc không hợp lệ.');
  } catch (e) { return loi(e); }
}
