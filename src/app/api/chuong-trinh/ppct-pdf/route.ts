import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_DOC_PPCT, loaiDongPpct, loiNhacDocPpct } from '@/core/chuong-trinh/ppct-tu-pdf';
import { getSubjectDisplayName } from '@/core/curriculum/ppct-hub-adapter';

export const maxDuration = 120;

/**
 * AI chép bảng PPCT từ một phần chữ hoặc một ảnh trang: POST { subjectId, nguon: 'chu' | 'anh', phan, stt, tong, anh }.
 * Chỉ trả về các dòng đã lọc để hiện xem trước; chưa lưu gì.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { subjectId?: string; nguon?: string; phan?: string; stt?: number; tong?: number; anh?: string };
    if (!b.subjectId || !/^subj-[a-z0-9]+$/.test(b.subjectId)) return NextResponse.json({ error: 'Thiếu hoặc sai môn.' }, { status: 400 });
    const mon = getSubjectDisplayName(b.subjectId);
    const laAnh = b.nguon === 'anh';
    if (laAnh ? !b.anh || b.anh.length < 1000 : !b.phan?.trim()) return NextResponse.json({ error: 'Thiếu nội dung cần đọc.' }, { status: 400 });
    if (laAnh && b.anh!.length > 3_500_000) return NextResponse.json({ error: 'Ảnh trang quá lớn.' }, { status: 413 });
    if (!laAnh && b.phan!.length > 20_000) return NextResponse.json({ error: 'Phần chữ quá dài.' }, { status: 413 });
    const tt = await trangThaiViecAI('DOC_TEP');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const kq = await goiAITheoViec('DOC_TEP', {
      heThong: HE_THONG_DOC_PPCT,
      noiDung: loiNhacDocPpct({ mon, lop: 4, nguon: laAnh ? 'anh' : 'chu', phan: b.phan, stt: b.stt, tong: b.tong }),
      anh: laAnh ? [{ loai: 'image/jpeg', base64: b.anh! }] : undefined,
      toiDaToken: 6000,
      timWeb: false,
    });
    return NextResponse.json({ success: true, dong: loaiDongPpct(kq.traLoi), model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
