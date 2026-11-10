import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_VIET_LAI_CAU, docCauAISoan, loiNhacVietLai } from '@/core/chuong-trinh/sach';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 120;

/**
 * AI viết lại một câu theo ý giáo viên ("dễ hiểu hơn", "đáp án ngắn hơn"…). Không lưu gì; thầy xem rồi mới dùng.
 * POST { mon, yeuCau, muc, hinhThuc, dang, yccd, cau: { deBai, luaChon, dapAn, huongDanCham } }
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; yeuCau?: string; muc?: number; hinhThuc?: string; dang?: string | null; yccd?: string; cau?: { deBai?: string; luaChon?: string[]; dapAn?: string; huongDanCham?: string } };
    if (!b.mon || !TEN_MON[b.mon]) return NextResponse.json({ error: 'Thiếu môn.' }, { status: 400 });
    if (!b.yeuCau?.trim()) return NextResponse.json({ error: 'Thầy ghi rõ muốn sửa thế nào (ví dụ: câu dễ hiểu hơn, đáp án ngắn hơn).' }, { status: 400 });
    if (!b.cau?.deBai?.trim()) return NextResponse.json({ error: 'Câu chưa có đề bài.' }, { status: 400 });
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const noiDung = loiNhacVietLai({
      tenMon: TEN_MON[b.mon], dang: b.dang ?? null, hinhThuc: b.hinhThuc === 'TL' ? 'TL' : 'TN', muc: b.muc ?? 1, diem: 0.5, yccd: b.yccd ?? '', baiHoc: '', trangSgk: '',
      deBai: b.cau.deBai, luaChon: b.cau.luaChon ?? [], dapAn: b.cau.dapAn ?? '', huongDanCham: b.cau.huongDanCham ?? '',
    }, b.yeuCau.trim().slice(0, 500));
    let cau = null;
    for (let lan = 0; lan < 2 && !cau; lan++) {
      const kq = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_VIET_LAI_CAU, noiDung: lan ? `${noiDung}\n\nLần trước chưa trả đúng khối JSON. Trả lại đúng định dạng.` : noiDung, toiDaToken: 2500, timWeb: false });
      cau = docCauAISoan(kq.traLoi);
    }
    if (!cau || !cau.deBai) return NextResponse.json({ error: 'AI chưa trả về câu hợp lệ. Thầy bấm viết lại.' }, { status: 422 });
    return NextResponse.json({ success: true, cau, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
