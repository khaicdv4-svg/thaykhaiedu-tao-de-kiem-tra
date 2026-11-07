import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_GOI_Y_CHAM, lamSachGoiY, loiNhacGoiYCham, tongDiemTrongHuongDan } from '@/core/de/goi-y-cham';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 90;

/** AI gợi ý hướng dẫn chấm chi tiết cho một câu. Không lưu gì; thầy xem rồi mới dùng. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; cau?: { deBai?: string; luaChon?: string[]; dapAn?: string; diem?: number; dang?: string | null; hinhThuc?: string; muc?: number; yccd?: string } };
    const c = b.cau;
    if (!b.mon || !TEN_MON[b.mon] || !c) return NextResponse.json({ error: 'Thiếu môn hoặc câu.' }, { status: 400 });
    if (!c.deBai?.trim() || !c.dapAn?.trim()) return NextResponse.json({ error: 'Cần có đề bài và đáp án trước khi nhờ AI viết hướng dẫn chấm.' }, { status: 400 });
    if (!(typeof c.diem === 'number' && c.diem > 0 && c.diem <= 10)) return NextResponse.json({ error: 'Điểm của câu không hợp lệ.' }, { status: 400 });
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const noiDung = loiNhacGoiYCham({
      tenMon: TEN_MON[b.mon],
      c: { deBai: c.deBai, luaChon: (c.luaChon ?? []).slice(0, 6).map(String), dapAn: c.dapAn, diem: c.diem, dang: (c.dang as never) ?? null, hinhThuc: (c.hinhThuc as never) ?? 'TL', muc: (c.muc as never) ?? 1, yccd: c.yccd ?? '' },
    });
    let huongDan = '';
    let tong = 0;
    for (let lan = 0; lan < 2; lan++) {
      const kq = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_GOI_Y_CHAM, noiDung: lan ? `${noiDung}\n\nLần trước tổng điểm các ý chưa bằng ${String(c.diem).replace('.', ',')}. Chia lại cho đúng.` : noiDung, toiDaToken: 1500, timWeb: false });
      huongDan = lamSachGoiY(kq.traLoi);
      tong = tongDiemTrongHuongDan(huongDan);
      if (tong === c.diem) break;
    }
    return NextResponse.json({ success: true, huongDan, lechDiem: tong === c.diem ? null : tong, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
