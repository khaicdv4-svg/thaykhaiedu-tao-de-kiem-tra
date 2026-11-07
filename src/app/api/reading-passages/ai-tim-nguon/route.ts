import { NextRequest, NextResponse } from 'next/server';
import { HE_THONG_TIM_NGUON, docNguonAI, loiNhacDocTrang } from '@/core/reading-passages/tim-nguon-ai';
import { laDuongDanWeb, lamSachUrl } from '@/core/reading-passages/kiem-tra';
import { heThongCoQuyDinhRieng } from '@/core/services/ai/reading-passage-ai';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { kiemTraLinkNguon } from '@/lib/kiem-tra-link-nguon';
import { timTrangChuaBai } from '@/lib/tim-web';

/** Tìm web và mở trang mất vài chục giây. */
export const maxDuration = 120;

/**
 * AI tìm nguồn cho một bài đọc đã có chữ. Link AI đưa ra được mở thử ngay ở đây;
 * link không mở được hoặc không có bài thì bỏ, không cho vào bài. Kết quả vẫn qua tổ trưởng duyệt.
 */
export async function POST(req: NextRequest) {
  try {
    const { tieuDe, noiDung, tacGia } = (await req.json()) as { tieuDe?: string; noiDung?: string; tacGia?: string };
    if (!noiDung?.trim()) return NextResponse.json({ error: 'Bài chưa có nội dung để AI tìm nguồn.' }, { status: 400 });
    const tt = await trangThaiViecAI('TIM_NGUON');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });

    // Bước 1: máy tự tìm web và mở trang, chỉ giữ trang thật sự chứa bài
    const web = await timTrangChuaBai({ tieuDe: tieuDe ?? '', tacGia, noiDung });
    const tomTatWeb = `Đã tìm ${web.soCauTim} câu bằng ${web.nhaCungCap === 'TAVILY' ? 'Tavily' : 'DuckDuckGo'}, ${web.soUngVien} trang ứng viên, mở được ${web.soTrangMo}, ${web.trang.length} trang có đúng bài.`;
    if (web.trang.length === 0) {
      const loi = web.soUngVien === 0
        ? `Máy không tìm được trang nào${web.loiTimKiem.length ? ` (${web.loiTimKiem.join(' ')})` : ''}.${web.nhaCungCap === 'DUCKDUCKGO' ? ' Nên gắn khóa Tavily (miễn phí) để tìm ổn định.' : ''}`
        : 'Không trang nào chứa đúng văn bản bài này.';
      return NextResponse.json({ daTimThay: false, ghiChu: `${loi} ${tomTatWeb}`, chanDoan: { tomTat: tomTatWeb }, model: tt.model });
    }
    // Bước 2: AI chỉ đọc các trang đã kiểm để lấy tác giả và nguồn
    const boNao = await docBoNaoNeuCo();
    const kq = await goiAITheoViec('TIM_NGUON', {
      heThong: heThongCoQuyDinhRieng(HE_THONG_TIM_NGUON, boNao),
      noiDung: loiNhacDocTrang({ tieuDe: tieuDe ?? '', tacGia }, web.trang),
      toiDaToken: 2000,
      timWeb: false,
    });
    const chanDoan = { tomTat: tomTatWeb, trang: web.trang.map((t) => t.url), giay: Math.round(kq.thoiGianMs / 1000), trichDau: kq.traLoi.trim().slice(0, 300) };
    const n = docNguonAI(kq.traLoi);
    const ghiChuKhongWeb = '';
    if (!n || !n.daTimThay) {
      const lyDo = !n
        ? 'AI trả lời không đúng dạng.'
        : n.ghiChu || 'AI không tìm thấy nguồn của bài này.';
      return NextResponse.json({ daTimThay: false, ghiChu: `${lyDo} ${ghiChuKhongWeb}`.trim(), chanDoan, model: tt.model });
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
      return NextResponse.json({ daTimThay: false, ghiChu: ghiChuLink || 'AI không tìm thấy nguồn kiểm chứng được.', chanDoan, model: tt.model });
    }
    return NextResponse.json({
      daTimThay: true,
      tacGia: n.tacGia,
      nguon: n.nguon,
      nguonUrl,
      trangThaiLink,
      doTinCay: nguonUrl ? 'CAO' : n.doTinCay,
      ghiChu: [n.ghiChu, ghiChuLink, ghiChuKhongWeb, !nguonUrl && n.nguon ? 'Nguồn sách in do AI tìm, máy chưa kiểm chứng được: cần đối chiếu sách.' : ''].filter(Boolean).join(' '),
      chanDoan,
      model: tt.model,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
