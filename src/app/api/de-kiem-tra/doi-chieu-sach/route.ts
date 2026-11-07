import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { nguCanhChoCau } from '@/lib/repositories/sach.repository';
import { HE_THONG_DOI_CHIEU_SACH, docKetQuaDoiChieu, loiNhacDoiChieu } from '@/core/chuong-trinh/sach';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 120;

interface Dong { baiHoc?: string; trangSgk?: string; tuan?: number | null; yccd?: string; dang?: string | null; hinhThuc?: string; muc?: number; diem?: number }
interface Cau { deBai?: string; luaChon?: string[]; dapAn?: string; huongDanCham?: string }

/**
 * AI đối chiếu một câu thầy đã soạn với đúng bài, trang trong đặc tả (SGK) và SGV nếu có.
 * POST { mon, dong, cau }. Không lưu, không sửa đề; chỉ nhận xét để thầy quyết định.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; dong?: Dong; cau?: Cau };
    const d = b.dong;
    const c = b.cau;
    if (!b.mon || !TEN_MON[b.mon] || !d || !c) return NextResponse.json({ error: 'Thiếu môn, dòng đặc tả hoặc câu.' }, { status: 400 });
    if (!c.deBai?.trim()) return NextResponse.json({ error: 'Câu chưa có đề bài để đối chiếu.' }, { status: 400 });
    const tt = await trangThaiViecAI('SOAN_DE');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const ngu = await nguCanhChoCau(b.mon, 4, { baiHoc: d.baiHoc ?? '', trangSgk: d.trangSgk ?? '', tuan: typeof d.tuan === 'number' ? d.tuan : null });
    if (!ngu.sgk.trim() && !ngu.sgv.trim()) return NextResponse.json({ error: `Chưa có trang sách làm căn cứ để đối chiếu. ${ngu.thieu.filter((x) => !/không bắt buộc/.test(x)).join(' ')}`, thieu: ngu.thieu }, { status: 422 });
    const noiDung = loiNhacDoiChieu({ tenMon: TEN_MON[b.mon], dang: d.dang ?? null, hinhThuc: d.hinhThuc ?? 'TL', muc: d.muc ?? 1, diem: d.diem ?? 0.5, yccd: d.yccd ?? '', baiHoc: d.baiHoc ?? '', trangSgk: d.trangSgk ?? '', deBai: c.deBai.slice(0, 2500), luaChon: (c.luaChon ?? []).slice(0, 6).map((x) => String(x).slice(0, 300)), dapAn: (c.dapAn ?? '').slice(0, 300), huongDanCham: (c.huongDanCham ?? '').slice(0, 1500) }, ngu);
    let kq = null;
    for (let lan = 0; lan < 2 && !kq; lan++) {
      const r = await goiAITheoViec('SOAN_DE', { heThong: HE_THONG_DOI_CHIEU_SACH, noiDung: lan ? `${noiDung}\n\nLần trước chưa trả đúng khối JSON. Trả lại đúng định dạng.` : noiDung, toiDaToken: 1800, timWeb: false });
      kq = docKetQuaDoiChieu(r.traLoi);
    }
    if (!kq) return NextResponse.json({ error: 'AI chưa trả về kết quả hợp lệ. Thầy bấm đối chiếu lại.' }, { status: 422 });
    return NextResponse.json({ success: true, ketQua: kq, khoang: ngu.khoang, trangDaDung: ngu.trangSgkCoChu, thieu: ngu.thieu, coSgv: !!ngu.sgv, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
