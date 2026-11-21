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

/** POST multipart: các cặp file + o (ô mẫu). Lưu lần lượt, trả kết quả từng file. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('file').filter((f): f is File => f instanceof File);
    const o = form.getAll('o').map(String);
    if (!files.length) return loi('Chưa chọn file.');
    if (files.length > 12) return loi('Mỗi lần tải tối đa 12 file.');
    const ketQua: { tenFile: string; ok: boolean; loi?: string; phienBan?: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const m = await taiLenMauDe(o[i] ?? '', files[i].name, await files[i].arrayBuffer());
        ketQua.push({ tenFile: files[i].name, ok: true, phienBan: m.phienBan });
      } catch (e) {
        ketQua.push({ tenFile: files[i].name, ok: false, loi: e instanceof Error ? e.message : String(e) });
      }
    }
    return NextResponse.json({ success: true, ketQua });
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
