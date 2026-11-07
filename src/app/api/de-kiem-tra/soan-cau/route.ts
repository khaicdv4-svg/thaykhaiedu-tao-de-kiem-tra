import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { nguCanhChoCau } from '@/lib/repositories/sach.repository';
import { HE_THONG_SOAN_CAU_TU_SACH, docCauAISoan, loiNhacSoanCau } from '@/core/chuong-trinh/sach';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 120;

interface Dong { baiHoc?: string; trangSgk?: string; tuan?: number | null; yccd?: string; dang?: string | null; hinhThuc?: string; muc?: number; diem?: number; yeuCauHinh?: string }

/**
 * AI soạn một câu theo đúng bài, trang trong đặc tả, dựa trên chữ của các trang SGK (và SGV nếu có) trong Kho sách.
 * POST { mon, dong, ghiChu? }. Không lưu gì; thầy xem rồi mới dùng. Thiếu căn cứ thì trả về lý do, không soạn bừa.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; dong?: Dong; ghiChu?: string };
    const d = b.dong;
    if (!b.mon || !TEN_MON[b.mon] || !d) return NextResponse.json({ error: 'Thiếu môn hoặc dòng đặc tả.' }, { status: 400 });
    if (!d.yccd?.trim()) return NextResponse.json({ error: 'Dòng đặc tả chưa có yêu cầu cần đạt, chưa soạn được.' }, { status: 400 });
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const ngu = await nguCanhChoCau(b.mon, 4, { baiHoc: d.baiHoc ?? '', trangSgk: d.trangSgk ?? '', tuan: typeof d.tuan === 'number' ? d.tuan : null });
    if (!ngu.sgk.trim()) return NextResponse.json({ error: `Chưa có trang SGK làm căn cứ để soạn. ${ngu.thieu.filter((x) => !/không bắt buộc/.test(x)).join(' ')}`, thieu: ngu.thieu }, { status: 422 });
    const noiDung = loiNhacSoanCau({ tenMon: TEN_MON[b.mon], dang: d.dang ?? null, hinhThuc: d.hinhThuc ?? 'TL', muc: d.muc ?? 1, diem: d.diem ?? 0.5, yccd: d.yccd, baiHoc: d.baiHoc ?? '', trangSgk: d.trangSgk ?? '', yeuCauHinh: d.yeuCauHinh, ghiChuThay: (b.ghiChu ?? '').slice(0, 500) }, ngu);
    let cau = null;
    for (let lan = 0; lan < 2 && !cau; lan++) {
      const kq = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_SOAN_CAU_TU_SACH, noiDung: lan ? `${noiDung}\n\nLần trước chưa trả đúng khối JSON. Trả lại đúng định dạng.` : noiDung, toiDaToken: 2500, timWeb: false });
      cau = docCauAISoan(kq.traLoi);
    }
    if (!cau) return NextResponse.json({ error: 'AI chưa trả về câu hợp lệ. Thầy bấm soạn lại.' }, { status: 422 });
    return NextResponse.json({ success: true, cau, khoang: ngu.khoang, trangDaDung: ngu.trangSgkCoChu, thieu: ngu.thieu, coSgv: !!ngu.sgv, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
