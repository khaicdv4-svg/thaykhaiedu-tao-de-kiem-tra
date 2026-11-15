import { NextRequest, NextResponse } from 'next/server';
import { datNamHienTai, docCaiDat, luuTo, luuTruong, suaNamHoc, themNamHoc } from '@/lib/repositories/cai-dat-he-thong.repository';

const loi = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: m }, { status: /Cần đăng nhập|Chưa cấu hình/.test(m) ? 401 : /chưa có quyền|Chỉ /.test(m) ? 403 : 400 });
};

/** GET: toàn bộ dữ liệu trang Cài đặt hệ thống của trường đang đăng nhập. */
export async function GET() {
  try { return NextResponse.json({ success: true, ...(await docCaiDat()) }); } catch (e) { return loi(e); }
}

/** POST { viec, ...dữ liệu }: TRUONG | NAM_HOC_THEM | NAM_HOC_SUA | NAM_HOC_HIEN_TAI | TO_LUU */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    switch (b.viec) {
      case 'TRUONG': await luuTruong(b); break;
      case 'NAM_HOC_THEM': await themNamHoc(b); break;
      case 'NAM_HOC_SUA': await suaNamHoc(b); break;
      case 'NAM_HOC_HIEN_TAI': await datNamHienTai(b.id); break;
      case 'TO_LUU': await luuTo(b); break;
      default: throw new Error('Việc không hợp lệ.');
    }
    return NextResponse.json({ success: true });
  } catch (e) { return loi(e); }
}
