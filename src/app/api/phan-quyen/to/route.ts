import { NextRequest, NextResponse } from 'next/server';
import { apDungQuyenTo, chuyenGiaoVienSangTo, datChucVuTo, dsPhuTrachMon, dsQuyenTo, dsToQuanLy, giaoPhuTrachMon } from '@/lib/repositories/phan-quyen.repository';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : /Chỉ /.test(m) ? 403 : 400 });
};

/** GET: danh sách tổ quản lý được; GET ?khoi=4: bảng quyền, chức vụ của thành viên và người phụ trách từng môn. */
export async function GET(req: NextRequest) {
  try {
    const k = req.nextUrl.searchParams.get('khoi');
    if (!k) return NextResponse.json({ success: true, to: await dsToQuanLy() });
    const khoi = Number(k);
    if (!Number.isInteger(khoi) || khoi < 1 || khoi > 5) throw new Error('Khối từ 1 đến 5.');
    const [giaoVien, phuTrach] = await Promise.all([dsQuyenTo(khoi), dsPhuTrachMon(khoi)]);
    return NextResponse.json({ success: true, giaoVien, phuTrach });
  } catch (e) { return loi(e); }
}

/**
 * POST { viec: 'AP_DUNG', khoi, ds: [{user, quyen[]}] } · { viec: 'CHUYEN', user, khoi } (chỉ quản trị)
 * · { viec: 'CHUC_VU', khoi, user, chucVu } · { viec: 'PHU_TRACH', khoi, mon, user | null }.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { viec?: string; khoi?: number; ds?: { user: string; quyen: string[] }[]; user?: string | null; chucVu?: string; mon?: string };
    if (!Number.isInteger(b.khoi) || (b.khoi as number) < 1 || (b.khoi as number) > 5) throw new Error('Khối từ 1 đến 5.');
    if (b.viec === 'AP_DUNG') return NextResponse.json({ success: true, soNguoiDoi: await apDungQuyenTo(b.khoi as number, b.ds ?? []) });
    if (b.viec === 'CHUYEN') {
      if (!b.user) throw new Error('Thiếu người cần chuyển.');
      await chuyenGiaoVienSangTo(b.user, b.khoi as number);
      return NextResponse.json({ success: true });
    }
    if (b.viec === 'CHUC_VU') {
      if (!b.user || !b.chucVu) throw new Error('Thiếu người hoặc chức vụ.');
      await datChucVuTo(b.khoi as number, b.user, b.chucVu);
      return NextResponse.json({ success: true });
    }
    if (b.viec === 'PHU_TRACH') {
      if (!b.mon) throw new Error('Chưa chọn môn.');
      await giaoPhuTrachMon(b.khoi as number, b.mon, b.user || null);
      return NextResponse.json({ success: true });
    }
    throw new Error('Việc không hợp lệ.');
  } catch (e) { return loi(e); }
}
