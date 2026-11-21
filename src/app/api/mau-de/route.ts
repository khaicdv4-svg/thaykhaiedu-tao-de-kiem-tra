import { NextRequest, NextResponse } from 'next/server';
import { boMauDe, danhSachMauDe, dungLaiMauDe, taiLenMauDe } from '@/lib/repositories/mau-de.repository';

export const runtime = 'nodejs';

const loi = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : /Chỉ tổ trưởng/.test(msg) ? 403 : 400 });
};

/** GET → mọi bản mẫu đề của trường */
export async function GET() {
  try {
    return NextResponse.json({ success: true, mau: await danhSachMauDe() });
  } catch (e) {
    return loi(e);
  }
}

/** POST { o, tenFile, duongDan } → lưu file mẫu trình duyệt vừa tải vào kho file. */
export async function POST(req: NextRequest) {
  try {
    const { o, tenFile, duongDan } = (await req.json()) as { o?: string; tenFile?: string; duongDan?: string };
    if (!o || !tenFile || !duongDan) return loi('Thiếu môn, tên file hoặc đường dẫn file.');
    const m = await taiLenMauDe(o, tenFile, duongDan);
    return NextResponse.json({ success: true, phienBan: m.phienBan });
  } catch (e) {
    return loi(e);
  }
}

/** PATCH { id, conDung } → bỏ mẫu hoặc dùng lại */
export async function PATCH(req: NextRequest) {
  try {
    const { id, conDung } = (await req.json()) as { id?: string; conDung?: boolean };
    if (!id) return loi('Thiếu mẫu.');
    if (conDung) await dungLaiMauDe(id);
    else await boMauDe(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e);
  }
}
