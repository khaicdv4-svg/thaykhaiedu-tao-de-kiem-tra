import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { nguCanhChoCau } from '@/lib/repositories/sach.repository';
import { HE_THONG_SOAN_CAU_TU_SACH, docCauAISoan, loiNhacSoanCau, soYTrongCau } from '@/core/chuong-trinh/sach';
import { TEN_MON } from '@/core/chuong-trinh/mon';
import { kiemTraDangBai } from '@/core/de/dang-bai';

export const maxDuration = 120;

interface Dong { yNho?: string[] | null; baiHoc?: string; trangSgk?: string; tuan?: number | null; yccd?: string; dang?: string | null; hinhThuc?: string; muc?: number; diem?: number; yeuCauHinh?: string; dangBai?: string }

/**
 * AI soạn một câu theo đúng bài, trang trong đặc tả, dựa trên chữ của các trang SGK (và SGV nếu có) trong Kho sách.
 * POST { mon, dong, ghiChu?, baiDoc? }. baiDoc: bài đọc hiểu của đề Tiếng Việt (câu đọc hiểu soạn theo bài này). Không lưu gì; thầy xem rồi mới dùng. Thiếu căn cứ thì trả về lý do, không soạn bừa.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; ky?: string; dong?: Dong; ghiChu?: string; baiDoc?: { tieuDe?: string; noiDung?: string; tacGia?: string } };
    const d = b.dong;
    if (!b.mon || !TEN_MON[b.mon] || !d) return NextResponse.json({ error: 'Thiếu môn hoặc dòng đặc tả.' }, { status: 400 });
    if (!d.yccd?.trim()) return NextResponse.json({ error: 'Dòng đặc tả chưa có yêu cầu cần đạt, chưa soạn được.' }, { status: 400 });
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const ngu = await nguCanhChoCau(b.mon, 4, { baiHoc: d.baiHoc ?? '', trangSgk: d.trangSgk ?? '', tuan: typeof d.tuan === 'number' ? d.tuan : null });
    const baiDoc = b.baiDoc?.noiDung?.trim() ? b.baiDoc : null;
    if (!ngu.sgk.trim() && !baiDoc) return NextResponse.json({ error: `Chưa có trang SGK làm căn cứ để soạn. ${ngu.thieu.filter((x) => !/không bắt buộc/.test(x)).join(' ')}`, thieu: ngu.thieu }, { status: 422 });
    const noiDungGoc = loiNhacSoanCau({ tenMon: TEN_MON[b.mon], dang: d.dang ?? null, hinhThuc: d.hinhThuc ?? 'TL', muc: d.muc ?? 1, diem: d.diem ?? 0.5, yccd: d.yccd, baiHoc: d.baiHoc ?? '', trangSgk: d.trangSgk ?? '', yeuCauHinh: d.yeuCauHinh, yNho: Array.isArray(d.yNho) ? d.yNho.slice(0, 8) : null, maMon: b.mon, ky: b.ky ?? null, tuan: typeof d.tuan === 'number' ? d.tuan : null, ghiChuThay: (b.ghiChu ?? '').slice(0, 500), dangBai: (d.dangBai ?? '').slice(0, 300) }, ngu);
    const noiDung = baiDoc
      ? `${noiDungGoc}\n\nBÀI ĐỌC HIỂU CỦA ĐỀ (câu hỏi phải dựa vào bài đọc này, không dùng bài đọc trong SGK; được trích ý trong bài đọc này):\nTên bài: ${baiDoc.tieuDe ?? ''}${baiDoc.tacGia ? ` (${baiDoc.tacGia})` : ''}\n${(baiDoc.noiDung ?? '').slice(0, 6000)}`
      : noiDungGoc;
    // Câu nhiều ý: thiếu ý thì nhắc AI soạn lại cho đủ
    const soY = Array.isArray(d.yNho) && d.yNho.length >= 2 ? d.yNho.length : 0;
    let cau = null;
    let nhac = '';
    let lechDang: string[] = [];
    for (let lan = 0; lan < 3; lan++) {
      const kq = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_SOAN_CAU_TU_SACH, noiDung: nhac ? `${noiDung}\n\n${nhac}` : noiDung, toiDaToken: 2500 + 400 * soY, timWeb: false });
      const x = docCauAISoan(kq.traLoi);
      if (!x) { nhac = 'Lần trước chưa trả đúng khối JSON. Trả lại đúng định dạng.'; continue; }
      cau = x;
      if (x.khongDuCanCu) break;
      // Sai dạng bài giáo viên chọn ở đặc tả (ví dụ đặc tả là đổi đơn vị đo mà AI ra bài toán có lời văn): bắt soạn lại
      lechDang = kiemTraDangBai(d.dangBai, x);
      const co = soY ? soYTrongCau(x.deBai, x.luaChon, d.dang ?? null) : 0;
      const thieuY = soY > 0 && co < soY;
      if (!lechDang.length && !thieuY) break;
      nhac = [
        lechDang.length ? `Lần trước SAI DẠNG BÀI: ${lechDang.join(' ')} Soạn lại đúng dạng "${d.dangBai}".` : '',
        thieuY ? `Lần trước chỉ có ${co} ý, thiếu ý. Câu này phải có đủ ${soY} ý: ${d.yNho!.map((y) => `${y})`).join(', ')}. Soạn lại đủ ${soY} ý.` : '',
      ].filter(Boolean).join('\n');
    }
    if (!cau) return NextResponse.json({ error: 'AI chưa trả về câu hợp lệ. Thầy bấm soạn lại.' }, { status: 422 });
    return NextResponse.json({ success: true, cau, lechDang, khoang: ngu.khoang, trangDaDung: ngu.trangSgkCoChu, thieu: ngu.thieu, coSgv: !!ngu.sgv, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
