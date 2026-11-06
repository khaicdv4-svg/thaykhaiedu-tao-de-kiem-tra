import { NextRequest, NextResponse } from 'next/server';
import { layMaTranRieng, luuNhapMaTranRieng, xacNhanMaTranRieng, type DuLieuMaTranRieng } from '@/lib/repositories/ma-tran-dac-ta.repository';

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });
/** Lỗi do không có quyền hoặc chưa đăng nhập trả 403 để trang biết quay về lưu trên máy. */
const maLoi = (e: unknown) => (e instanceof Error && /Chỉ tổ trưởng|Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 403 : 400);

/** GET ?mon=TOAN&ky=CUOI_HK1 → bản nháp, phiên bản đã xác nhận mới nhất, danh sách phiên bản. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    return NextResponse.json({ success: true, ...(await layMaTranRieng(sp.get('mon') ?? '', sp.get('ky') ?? '')) });
  } catch (e) {
    return loi(e, maLoi(e));
  }
}

/** POST { hanhDong: 'LUU_NHAP' | 'XAC_NHAN', mon, ky, duLieu: { ma_tran_chung, ma_tran_rieng } } */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { hanhDong?: string; mon?: string; ky?: string; duLieu?: DuLieuMaTranRieng };
    if (!b.mon || !b.ky || !b.duLieu) return loi('Thiếu môn, kì hoặc nội dung ma trận.');
    if (b.hanhDong === 'LUU_NHAP') return NextResponse.json({ success: true, ban: await luuNhapMaTranRieng(b.mon, b.ky, b.duLieu) });
    if (b.hanhDong === 'XAC_NHAN') return NextResponse.json({ success: true, ...(await xacNhanMaTranRieng(b.mon, b.ky, b.duLieu)) });
    return loi('Thao tác không hợp lệ.');
  } catch (e) {
    return loi(e, maLoi(e));
  }
}
