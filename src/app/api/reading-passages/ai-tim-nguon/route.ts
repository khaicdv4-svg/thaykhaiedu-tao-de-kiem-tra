import { NextRequest, NextResponse } from 'next/server';
import { HE_THONG_TIM_NGUON, docNguonAI, loiNhacTimNguon } from '@/core/reading-passages/tim-nguon-ai';
import { laDuongDanWeb, lamSachUrl } from '@/core/reading-passages/kiem-tra';
import { heThongCoQuyDinhRieng } from '@/core/services/ai/reading-passage-ai';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { kiemTraLinkNguon } from '@/lib/kiem-tra-link-nguon';

/** Tìm web có thể mất vài phút. */
export const maxDuration = 300;

/**
 * AI tìm nguồn cho một bài đọc đã có chữ. Link AI đưa ra được mở thử ngay ở đây;
 * link không mở được hoặc không có bài thì bỏ, không cho vào bài. Kết quả vẫn qua tổ trưởng duyệt.
 */
export async function POST(req: NextRequest) {
  try {
    const { tieuDe, noiDung, tacGia } = (await req.json()) as { tieuDe?: string; noiDung?: string; tacGia?: string };
    if (!noiDung?.trim()) return NextResponse.json({ error: 'Bài chưa có nội dung để AI tìm nguồn.' }, { status: 400 });
    const tt = await trangThaiViecAI('TIM_BAI_DOC');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });

    const boNao = await docBoNaoNeuCo();
    const kq = await goiAITheoViec('TIM_BAI_DOC', {
      heThong: heThongCoQuyDinhRieng(HE_THONG_TIM_NGUON, boNao),
      noiDung: loiNhacTimNguon({ tieuDe: tieuDe ?? '', tacGia, noiDung }),
      toiDaToken: 2000,
      timWeb: true,
      choToiDa: 240_000,
    });
    if (!kq.daTimWeb) {
      return NextResponse.json({ daTimThay: false, ghiChu: 'Model hiện tại không tìm được web nên không tìm nguồn được. Thử đổi model ở Cài đặt AI.', model: tt.model });
    }
    const n = docNguonAI(kq.traLoi);
    if (!n || !n.daTimThay) {
      return NextResponse.json({ daTimThay: false, ghiChu: n?.ghiChu || 'AI không tìm thấy nguồn của bài này.', model: tt.model });
    }

    // Link AI đưa ra phải mở được và có nội dung bài
    let nguonUrl = '';
    let trangThaiLink: string | null = null;
    let ghiChuLink = '';
    if (n.nguonUrl) {
      if (!laDuongDanWeb(n.nguonUrl)) {
        ghiChuLink = 'AI đưa chữ không phải link, đã bỏ.';
      } else {
        const lk = await kiemTraLinkNguon(lamSachUrl(n.nguonUrl), noiDung);
        if (lk.trangThai === 'CON_TON_TAI') {
          nguonUrl = lk.url ?? lamSachUrl(n.nguonUrl);
          trangThaiLink = lk.trangThai;
        } else {
          ghiChuLink = `AI đưa link ${lamSachUrl(n.nguonUrl)} nhưng ${lk.lyDo.charAt(0).toLowerCase()}${lk.lyDo.slice(1)} Đã bỏ link này.`;
        }
      }
    }
    // Không còn link tốt và không có chữ nguồn thì coi như chưa tìm được
    if (!nguonUrl && !n.nguon && !n.tacGia) {
      return NextResponse.json({ daTimThay: false, ghiChu: ghiChuLink || 'AI không tìm thấy nguồn kiểm chứng được.', model: tt.model });
    }
    return NextResponse.json({
      daTimThay: true,
      tacGia: n.tacGia,
      nguon: n.nguon,
      nguonUrl,
      trangThaiLink,
      doTinCay: nguonUrl ? 'CAO' : n.doTinCay,
      ghiChu: [n.ghiChu, ghiChuLink, !nguonUrl && n.nguon ? 'Nguồn sách in do AI tìm, máy chưa kiểm chứng được: cần đối chiếu sách.' : ''].filter(Boolean).join(' '),
      model: tt.model,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
