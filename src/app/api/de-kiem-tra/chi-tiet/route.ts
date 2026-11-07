import { NextRequest, NextResponse } from 'next/server';
import {
  chiaSeDe, danhDauNhanXet, doiPhamViXem, dsChiaSe, dsPhanCong, huyPhanCong, lichSuDe, nhanXetDe, phanCongThamDinh, phienBanDeDaDuyet, themNhanXet,
} from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
const maLoi = (e: unknown) => (e instanceof Error && /Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 401 : e instanceof Error && /Chỉ |không có quyền/.test(e.message) ? 403 : 400);

/** GET ?id= → lịch sử, nhận xét, phiên bản đã duyệt, người được phân công và được chia sẻ của một đề. */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return loi('Thiếu mã đề.');
    const [lichSu, nhanXet, phienBan, phanCong, chiaSe] = await Promise.all([lichSuDe(id), nhanXetDe(id), phienBanDeDaDuyet(id), dsPhanCong(id), dsChiaSe(id)]);
    return NextResponse.json({ success: true, lichSu, nhanXet, phienBan, phanCong, chiaSe });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}

/** POST { id, viec, ... } viec: NHAN_XET | XU_LY | PHAM_VI | PHAN_CONG | HUY_PHAN_CONG | CHIA_SE | BO_CHIA_SE */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { id?: string; viec?: string; thanhPhan?: string; noiDung?: string; nhanXetId?: string; daXuLy?: boolean; phamVi?: string; nguoi?: string };
    switch (b.viec) {
      case 'NHAN_XET': if (!b.id) return loi('Thiếu mã đề.'); await themNhanXet(b.id, b.thanhPhan ?? 'CHUNG', b.noiDung ?? ''); break;
      case 'XU_LY': if (!b.nhanXetId) return loi('Thiếu mã nhận xét.'); await danhDauNhanXet(b.nhanXetId, b.daXuLy !== false); break;
      case 'PHAM_VI': if (!b.id) return loi('Thiếu mã đề.'); await doiPhamViXem(b.id, b.phamVi ?? ''); break;
      case 'PHAN_CONG': if (!b.id || !b.nguoi) return loi('Thiếu mã đề hoặc người thẩm định.'); await phanCongThamDinh(b.id, b.nguoi); break;
      case 'HUY_PHAN_CONG': if (!b.id || !b.nguoi) return loi('Thiếu mã đề hoặc người thẩm định.'); await huyPhanCong(b.id, b.nguoi); break;
      case 'CHIA_SE': if (!b.id || !b.nguoi) return loi('Thiếu mã đề hoặc người nhận.'); await chiaSeDe(b.id, b.nguoi, false); break;
      case 'BO_CHIA_SE': if (!b.id || !b.nguoi) return loi('Thiếu mã đề hoặc người nhận.'); await chiaSeDe(b.id, b.nguoi, true); break;
      default: return loi('Thao tác không hợp lệ.');
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
