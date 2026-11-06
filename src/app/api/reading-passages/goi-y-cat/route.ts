import { NextRequest, NextResponse } from 'next/server';
import { goiYCatDoan } from '@/core/reading-passages/cat-doan';
import { khoangDoDai, type KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';
import { HE_THONG_CHON_DOAN, docLuaChonAI, loiNhacChonDoan } from '@/core/reading-passages/goi-y-cat-ai';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { heThongCoQuyDinhRieng } from '@/core/services/ai/reading-passage-ai';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';

export const maxDuration = 120;

/**
 * Gợi ý các đoạn cắt cho bài đọc thành tiếng. Code đếm tiếng và tìm chỗ ngắt;
 * AI (nếu đã cấu hình) chọn đoạn trọn ý nhất, còn không thì đoạn đầu danh sách là đoạn tốt nhất theo code.
 */
export async function POST(req: NextRequest) {
  try {
    const { tieuDe, noiDung, ky } = (await req.json()) as { tieuDe?: string; noiDung?: string; ky?: KyKiemTraBaiDoc };
    if (!noiDung?.trim() || !ky) return NextResponse.json({ error: 'Thiếu nội dung bài hoặc kì kiểm tra.' }, { status: 400 });
    const boNao = await docBoNaoNeuCo();
    const q = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN', boNao)!;
    const doan = goiYCatDoan(noiDung, { min: q.min, max: q.max, dungSai: q.dungSai, toiDa: 5 });
    if (doan.length === 0) return NextResponse.json({ success: true, doan: [], quyDinh: q, aiChon: null });

    let aiChon: { chi: number; lyDo: string; model: string | null } | null = null;
    let aiLoi: string | null = null;
    const tt = await trangThaiViecAI('TIM_BAI_DOC');
    if (tt.daCauHinh && doan.length > 1) {
      try {
        const kq = await goiAITheoViec('TIM_BAI_DOC', { heThong: heThongCoQuyDinhRieng(HE_THONG_CHON_DOAN, boNao), noiDung: loiNhacChonDoan(tieuDe ?? '', doan), toiDaToken: 400, timWeb: false });
        const c = docLuaChonAI(kq.traLoi, doan.length);
        if (c) aiChon = { ...c, model: tt.model };
        else aiLoi = 'AI trả lời không đúng dạng, dùng thứ tự của code.';
      } catch (e) {
        aiLoi = e instanceof Error ? e.message : String(e);
      }
    } else if (!tt.daCauHinh) {
      aiLoi = `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}. Đang dùng thứ tự gợi ý của code.`;
    }
    return NextResponse.json({ success: true, doan, quyDinh: q, aiChon, aiLoi });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
