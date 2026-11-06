import { NextRequest, NextResponse } from 'next/server';
import { countVietnameseSyllables } from '@/core/utils/vietnamese-word-counter';
import { khoangDoDai } from '@/core/reading-passages/quy-dinh';
import { HE_THONG_CHINH_DO_DAI, chinhDuoc, docBanChinhAI, kiemTraBanChinh, loiNhacChinhDoDai } from '@/core/reading-passages/chinh-do-dai';
import { heThongCoQuyDinhRieng } from '@/core/services/ai/reading-passage-ai';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { layBaiDoc } from '@/lib/repositories/kho-bai-doc.repository';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';

export const maxDuration = 180;

/**
 * AI chỉnh độ dài một bài trong kho (thêm/bớt ít tiếng). Chỉ trả về bản đề xuất để tổ trưởng xem,
 * chưa lưu. Code đếm tiếng và so với bài gốc; sai thì cho AI thử lại một lần.
 */
export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Thiếu bài đọc.' }, { status: 400 });
    const g = await layBaiDoc(id);
    if (!g.loai || !g.ky || !g.theLoai) return NextResponse.json({ error: 'Bài chưa chọn đủ loại bài, kì, thể loại.' }, { status: 400 });
    const boNao = await docBoNaoNeuCo();
    const k = khoangDoDai(g.loai, g.ky, g.theLoai, boNao);
    if (!k) return NextResponse.json({ error: 'Tổ chưa quy định độ dài cho loại bài này.' }, { status: 400 });
    const soTieng = countVietnameseSyllables(g.noiDung);
    const cd = chinhDuoc(soTieng, k);
    if (cd.canDoi === 0) return NextResponse.json({ error: 'Bài đã đúng độ dài, không cần chỉnh.' }, { status: 400 });
    if (!cd.duoc) {
      return NextResponse.json({ error: `Bài lệch ${cd.canDoi} tiếng, quá 15% (tối đa ${cd.toiDa} tiếng). ${soTieng > k.max ? 'Cắt một đoạn trọn ý trước rồi mới chỉnh.' : 'Bài quá ngắn, nên chọn bài khác.'}` }, { status: 400 });
    }
    const tt = await trangThaiViecAI('TIM_BAI_DOC');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });

    const heThong = heThongCoQuyDinhRieng(HE_THONG_CHINH_DO_DAI, boNao);
    let noiDung = loiNhacChinhDoDai(g.tieuDe, g.noiDung, soTieng, k);
    let lanCuoi: { noiDung: string; ghiChu: string } | null = null;
    let kt = null;
    for (let lan = 0; lan < 2; lan++) {
      const kq = await goiAITheoViec('TIM_BAI_DOC', { heThong, noiDung, toiDaToken: 4000, timWeb: false });
      lanCuoi = docBanChinhAI(kq.traLoi);
      if (!lanCuoi) continue;
      kt = kiemTraBanChinh(g.noiDung, lanCuoi.noiDung, k);
      if (kt.hopLe) break;
      noiDung += `\n\nLần trước chưa đạt: ${kt.loi.join(' ')} Hãy làm lại từ bài gốc.`;
    }
    if (!lanCuoi || !kt) return NextResponse.json({ error: 'AI trả lời không đúng dạng. Thầy thử lại.' }, { status: 502 });
    return NextResponse.json({ success: true, noiDung: lanCuoi.noiDung, ghiChu: lanCuoi.ghiChu, kiemTra: kt, soTiengGoc: soTieng, quyDinh: k, model: tt.model });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
