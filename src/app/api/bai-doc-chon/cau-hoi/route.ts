import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_CAU_HOI_DOC_TIENG, docCauHoiDocTieng, loiNhacCauHoiDocTieng } from '@/core/de/cau-hoi-doc-tieng';

export const maxDuration = 90;

/** AI soạn câu hỏi, đáp án cho các đoạn đọc thành tiếng. Không lưu gì; thầy cô xem rồi sửa. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { baiDoc?: { tieuDe?: string; noiDung?: string }[] };
    const ds = (b.baiDoc ?? []).slice(0, 4).map((x) => ({ tieuDe: String(x.tieuDe ?? '').slice(0, 300), noiDung: String(x.noiDung ?? '').slice(0, 5000) }));
    if (!ds.length || ds.some((x) => !x.noiDung.trim())) return NextResponse.json({ error: 'Cần có nội dung bài đọc trước khi tạo câu hỏi.' }, { status: 400 });
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const kq = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_CAU_HOI_DOC_TIENG, noiDung: loiNhacCauHoiDocTieng(ds), toiDaToken: 1500, timWeb: false });
    const cauHoi = docCauHoiDocTieng(kq.traLoi, ds.length);
    if (cauHoi.every((c) => !c.cauHoi)) return NextResponse.json({ error: 'AI chưa trả về câu hỏi dùng được. Thầy cô thử lại hoặc nhập tay.' }, { status: 502 });
    return NextResponse.json({ success: true, cauHoi, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
