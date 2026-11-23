import { NextRequest, NextResponse } from 'next/server';
import { maTranChungTuKho } from '@/lib/repositories/kho-ma-tran.repository';
import { dsMucLucSgk, dsTietPpct } from '@/lib/repositories/chuong-trinh.repository';
import { docBaiMach, luuBaiMach } from '@/lib/repositories/bo-nao.repository';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { TEN_MON } from '@/core/chuong-trinh/mon';
import { HE_THONG_GOI_Y_MACH, cacMachCuaMaTran, docGoiYMach, loiNhacGoiYMach } from '@/core/matrix/ti-le-tiet';

export const maxDuration = 60;

const loi = (e: unknown, ma = 400) => {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: /Cần đăng nhập|Chưa cấu hình/.test(msg) ? 401 : /Chỉ tổ trưởng/.test(msg) ? 403 : ma });
};
const chuoiLoi = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * GET ?mon=&ky= → dữ liệu cho báo cáo tỉ lệ theo số tiết (tham khảo) ở Ma trận chung:
 * ma trận chung đã xác nhận, các tiết PPCT, mục lục SGK, bảng Bài → Mạch. Trình duyệt tự tính khi tổ trưởng đổi tuần, loại tiết.
 * Thiếu phần nào thì báo phần đó, không làm hỏng phần còn lại.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const mon = sp.get('mon') ?? '';
    const ky = sp.get('ky') ?? '';
    const lop = 4;
    const [mt, tiet, mucLuc, baiMach] = await Promise.all([
      maTranChungTuKho(mon, ky),
      dsTietPpct(mon, lop).then((x) => ({ ok: true as const, x }), (e) => ({ ok: false as const, loi: chuoiLoi(e) })),
      dsMucLucSgk(mon, lop).catch(() => []),
      docBaiMach(mon).catch(() => ({})),
    ]);
    return NextResponse.json({
      success: true,
      mtc: mt.mtc,
      phienBan: mt.phienBan ?? null,
      tiet: tiet.ok ? tiet.x : [],
      loiPpct: tiet.ok ? null : tiet.loi,
      mucLuc: mucLuc.map((m) => ({ tap: m.tap, baiSo: m.baiSo, noiDung: m.noiDung, trang: m.trang })),
      baiMach,
    });
  } catch (e) {
    return loi(e);
  }
}

/** PUT { mon, baiMach } → lưu bảng Bài → Mạch (tổ trưởng, quản trị). */
export async function PUT(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; baiMach?: Record<string, string> };
    if (!b.mon || !TEN_MON[b.mon] || !b.baiMach || typeof b.baiMach !== 'object') return loi('Thiếu môn hoặc bảng Bài → Mạch.');
    return NextResponse.json({ success: true, baiMach: await luuBaiMach(b.mon, b.baiMach) });
  } catch (e) {
    return loi(e);
  }
}

/**
 * POST { mon, ky, bai: [{ khoa, ten, tenTiet }] } → AI gợi ý mạch cho các bài (chỉ chọn trong các mạch của ma trận chung).
 * Chỉ là gợi ý: tổ trưởng xem, sửa rồi bấm Lưu. Không lưu gì ở đây.
 */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { mon?: string; ky?: string; bai?: { khoa: string; ten: string; tenTiet?: string[] }[] };
    if (!b.mon || !TEN_MON[b.mon] || !b.ky || !Array.isArray(b.bai) || !b.bai.length) return loi('Thiếu môn, kì hoặc danh sách bài.');
    const { mtc } = await maTranChungTuKho(b.mon, b.ky);
    if (!mtc) return loi('Môn, kì này chưa có ma trận chung đã xác nhận để lấy tên các mạch.');
    const mach = cacMachCuaMaTran(mtc);
    if (!mach.length) return loi('Ma trận chung chưa ghi mạch kiến thức.');
    const tt = await trangThaiViecAI('DOC_TEP');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const noiDungMach = mach.map((m) => ({
      ten: m,
      noiDung: [...new Set(mtc.bai_kiem_tra.flatMap((x) => x.phan.flatMap((p) => [...p.dong, ...(p.lua_chon?.phuong_an.flatMap((pa) => pa.dong) ?? [])])).filter((d) => d.mach.trim().toLowerCase() === m.toLowerCase()).map((d) => d.noi_dung ?? '').filter(Boolean))],
    }));
    const ds = b.bai.slice(0, 120).map((x) => ({ khoa: String(x.khoa).slice(0, 200), ten: String(x.ten ?? '').slice(0, 200), tenTiet: Array.isArray(x.tenTiet) ? x.tenTiet.slice(0, 3).map((t) => String(t).slice(0, 120)) : [] }));
    const kq: Record<string, string> = {};
    // Chia lượt 40 bài để câu trả lời không quá dài
    for (let i = 0; i < ds.length; i += 40) {
      const phan = ds.slice(i, i + 40);
      const noiDung = loiNhacGoiYMach({ tenMon: TEN_MON[b.mon], mach: noiDungMach, bai: phan });
      for (let lan = 0; lan < 2; lan++) {
        const r = await goiAITheoViec('DOC_TEP', { heThong: HE_THONG_GOI_Y_MACH, noiDung: lan ? `${noiDung}\n\nLần trước trả lời sai dạng. Chỉ trả về một đối tượng JSON.` : noiDung, toiDaToken: 2500, timWeb: false });
        const doc = docGoiYMach(r.traLoi, phan, mach);
        if (Object.keys(doc).length) { Object.assign(kq, doc); break; }
      }
    }
    return NextResponse.json({ success: true, baiMach: kq, model: tt.model });
  } catch (e) {
    return loi(e, 500);
  }
}
