import { NextRequest, NextResponse } from 'next/server';
import { layTaiLieuDayDu, luuYccdTrich } from '@/lib/repositories/chuong-trinh.repository';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_TRICH_YCCD, TOI_DA_PHAN, chiaPhan, docYccdAI, kiemTraTrich, loiNhacTrichYccd } from '@/core/chuong-trinh/trich-yccd';

export const maxDuration = 120;

/**
 * AI trích YCCĐ của một phần tài liệu (phan = 0, 1, 2…). Trình duyệt gọi lần lượt từng phần để có tiến độ.
 * Kết quả vào hàng chờ duyệt; không có gì được dùng để soạn đề trước khi tổ trưởng duyệt.
 */
export async function POST(req: NextRequest) {
  try {
    const { taiLieuId, lop, phan = 0 } = (await req.json()) as { taiLieuId?: string; lop?: number; phan?: number };
    if (!taiLieuId) return NextResponse.json({ error: 'Thiếu tài liệu.' }, { status: 400 });
    const tl = await layTaiLieuDayDu(taiLieuId);
    const lopTrich = tl.lop ?? lop;
    if (!lopTrich || lopTrich < 1 || lopTrich > 5) return NextResponse.json({ error: 'Chọn lớp cần trích YCCĐ.' }, { status: 400 });
    if (!tl.noiDung.trim()) return NextResponse.json({ error: 'Tài liệu chưa có chữ (link chưa đọc được). Thầy dán chữ hoặc tải file lên.' }, { status: 400 });
    const cacPhan = chiaPhan(tl.noiDung);
    if (cacPhan.length > TOI_DA_PHAN) return NextResponse.json({ error: `Tài liệu quá dài (${cacPhan.length} phần, tối đa ${TOI_DA_PHAN}). Thầy tách nhỏ theo môn, lớp.` }, { status: 400 });
    if (phan < 0 || phan >= cacPhan.length) return NextResponse.json({ error: 'Phần không tồn tại.' }, { status: 400 });
    const tt = await trangThaiViecAI('DOC_TEP');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });

    const noiDung = loiNhacTrichYccd({ mon: tl.mon, lop: lopTrich, loai: tl.loai, tieuDe: tl.tieuDe, phan: cacPhan[phan], stt: phan + 1, tong: cacPhan.length });
    let ds = null;
    for (let lan = 0; lan < 2 && !ds; lan++) {
      const kq = await goiAITheoViec('DOC_TEP', { heThong: HE_THONG_TRICH_YCCD, noiDung: lan ? `${noiDung}\n\nLần trước trả lời sai dạng. Chỉ trả về mảng JSON.` : noiDung, toiDaToken: 6000, timWeb: false });
      ds = docYccdAI(kq.traLoi);
    }
    if (!ds) return NextResponse.json({ error: `AI trả lời không đúng dạng ở phần ${phan + 1}. Thầy thử lại.` }, { status: 502 });
    const daKiem = kiemTraTrich(ds, cacPhan[phan]);
    const luu = await luuYccdTrich({ mon: tl.mon, lop: lopTrich, taiLieuId: tl.id, ds: daKiem });
    return NextResponse.json({ success: true, phan, tongPhan: cacPhan.length, timThay: daKiem.length, moi: luu.moi, trung: luu.trung, khongKhop: daKiem.filter((y) => !y.trichKhop).length, model: tt.model });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
