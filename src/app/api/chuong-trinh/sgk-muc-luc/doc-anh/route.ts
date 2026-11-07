import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_DOC_MUC_LUC, loiNhacDocMucLuc, loaiDongChuaDung } from '@/core/chuong-trinh/doc-muc-luc-anh';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 120;

/**
 * AI đọc chữ trên ảnh một trang mục lục SGK: POST { mon, tap, anh (base64 JPEG), trang }.
 * Chỉ trả về chữ (các dòng CSV) để hiện trong ô xem trước; chưa lưu gì. Thầy xem, sửa rồi mới bấm Lưu.
 */
export async function POST(req: NextRequest) {
  try {
    const { mon, tap, anh, trang } = (await req.json()) as { mon?: string; tap?: number; anh?: string; trang?: number };
    if (!mon || !TEN_MON[mon]) return NextResponse.json({ error: 'Thiếu hoặc sai môn.' }, { status: 400 });
    if (!anh || anh.length < 1000) return NextResponse.json({ error: 'Thiếu ảnh trang sách.' }, { status: 400 });
    if (anh.length > 3_500_000) return NextResponse.json({ error: 'Ảnh trang quá lớn, thầy chọn ít trang hơn.' }, { status: 413 });
    const tt = await trangThaiViecAI('DOC_TEP');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const kq = await goiAITheoViec('DOC_TEP', {
      heThong: HE_THONG_DOC_MUC_LUC,
      noiDung: loiNhacDocMucLuc({ mon: TEN_MON[mon], tap: tap ?? 1, trang: trang ?? 0 }),
      anh: [{ loai: 'image/jpeg', base64: anh }],
      toiDaToken: 3000,
      timWeb: false,
    });
    const dong = loaiDongChuaDung(kq.traLoi);
    return NextResponse.json({ success: true, dong, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
