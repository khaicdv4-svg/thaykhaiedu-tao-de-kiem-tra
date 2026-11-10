import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { nguCanhChoCau } from '@/lib/repositories/sach.repository';
import { HE_THONG_SOAN_NHIEU_CAU, docNhieuCauAISoan, loiNhacSoanNhieuCau } from '@/core/chuong-trinh/sach';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 180;

const TOI_DA_CAU = 6;

/**
 * AI soạn nhiều câu từ một yêu cầu cần đạt, dựa trên các trang SGK của bài trong Kho sách.
 * POST { mon, yccd, baiHoc, trangSgk?, muc, hinhThuc, dang, soCau, ghiChu? }. Không lưu gì; thầy xem rồi mới lưu vào ngân hàng.
 * Thiếu căn cứ sách thì trả về lý do, không soạn bừa.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; yccd?: string; baiHoc?: string; trangSgk?: string; muc?: number; hinhThuc?: string; dang?: string | null; soCau?: number; ghiChu?: string };
    if (!b.mon || !TEN_MON[b.mon]) return NextResponse.json({ error: 'Chưa chọn môn.' }, { status: 400 });
    if (!b.yccd?.trim()) return NextResponse.json({ error: 'Chưa chọn yêu cầu cần đạt.' }, { status: 400 });
    const muc = b.muc && b.muc >= 1 && b.muc <= 3 ? b.muc : 1;
    const hinhThuc = b.hinhThuc === 'TL' ? 'TL' : 'TN';
    const soCau = Math.max(1, Math.min(TOI_DA_CAU, Math.floor(b.soCau ?? 3)));
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const ngu = await nguCanhChoCau(b.mon, 4, { baiHoc: b.baiHoc ?? '', trangSgk: b.trangSgk ?? '', tuan: null });
    if (!ngu.sgk.trim()) return NextResponse.json({ error: `Chưa có trang SGK làm căn cứ để soạn. ${ngu.thieu.filter((x) => !/không bắt buộc/.test(x)).join(' ')}`, thieu: ngu.thieu }, { status: 422 });
    const noiDung = loiNhacSoanNhieuCau({ tenMon: TEN_MON[b.mon], dang: b.dang ?? null, hinhThuc, muc, diem: 0.5, yccd: b.yccd, baiHoc: b.baiHoc ?? '', trangSgk: b.trangSgk ?? '', ghiChuThay: (b.ghiChu ?? '').slice(0, 500) }, soCau, ngu);
    let kq = null;
    for (let lan = 0; lan < 2 && !kq; lan++) {
      const tl = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_SOAN_NHIEU_CAU, noiDung: lan ? `${noiDung}\n\nLần trước chưa trả đúng khối JSON. Trả lại đúng định dạng.` : noiDung, toiDaToken: 1500 * soCau + 500, timWeb: false });
      kq = docNhieuCauAISoan(tl.traLoi);
    }
    if (!kq) return NextResponse.json({ error: 'AI chưa trả về câu hợp lệ. Thầy bấm soạn lại.' }, { status: 422 });
    if (kq.khongDuCanCu || !kq.cau.length) return NextResponse.json({ error: kq.ghiChu || 'Các trang sách chưa đủ căn cứ để soạn.', thieu: ngu.thieu }, { status: 422 });
    return NextResponse.json({ success: true, cau: kq.cau.slice(0, soCau), khoang: ngu.khoang, trangDaDung: ngu.trangSgkCoChu, thieu: ngu.thieu, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
