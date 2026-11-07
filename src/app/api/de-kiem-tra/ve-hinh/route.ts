import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_VE_HINH, lamSachSvg, loiNhacVeHinh } from '@/core/de/ve-hinh';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 120;

/** AI vẽ hình minh họa cho một câu: POST { mon, deBai, luaChon, moTa, kieu }. Trả về SVG đã làm sạch; chưa lưu gì. */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; deBai?: string; luaChon?: string[]; moTa?: string; kieu?: string };
    if (!b.mon || !TEN_MON[b.mon]) return NextResponse.json({ error: 'Thiếu hoặc sai môn.' }, { status: 400 });
    if (!b.deBai?.trim() && !b.moTa?.trim()) return NextResponse.json({ error: 'Cần có đề bài hoặc mô tả hình thì AI mới vẽ được.' }, { status: 400 });
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const noiDung = loiNhacVeHinh({ tenMon: TEN_MON[b.mon], deBai: (b.deBai ?? '').slice(0, 2000), luaChon: (b.luaChon ?? []).slice(0, 6).map((x) => String(x).slice(0, 200)), moTa: (b.moTa ?? '').slice(0, 800), kieu: b.kieu });
    let ket = lamSachSvg('');
    for (let lan = 0; lan < 2; lan++) {
      const kq = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_VE_HINH, noiDung: lan ? `${noiDung}\n\nLần trước mã SVG chưa dùng được (${ket.lyDo}). Vẽ lại, chỉ dùng các thẻ cho phép.` : noiDung, toiDaToken: 7000, choToiDa: 100_000, timWeb: false });
      ket = lamSachSvg(kq.traLoi);
      if (ket.svg || /không cần hình|không thể/i.test(ket.lyDo ?? '')) break;
    }
    if (!ket.svg) return NextResponse.json({ error: ket.lyDo ?? 'AI chưa vẽ được.' }, { status: 422 });
    return NextResponse.json({ success: true, svg: ket.svg, rong: ket.rong, cao: ket.cao, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
