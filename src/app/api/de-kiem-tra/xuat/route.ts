import { tenMon as tenMonKT } from '@/core/ho-so-de/mon-ky';
import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { layDe, layDeTheoId, layDacTaCuaDe } from '@/lib/repositories/ma-tran-dac-ta.repository';
import { dungHoSoDe, dungTaiLieuDe, dungTaiLieuTiengViet, type ThongTinDe } from '@/core/de/xuat-word';
import { ghepDauBaiTheoMau } from '@/core/mau-de/ghep-mau';
import { fileMauDangDung } from '@/lib/repositories/mau-de.repository';
import { layKhoiLamViec } from '@/lib/khoi-lam-viec.server';

export const runtime = 'nodejs';

const TEN_KY: Record<string, string> = { GIUA_HK1: 'GIỮA HKI', CUOI_HK1: 'CUỐI HKI', GIUA_HK2: 'GIỮA HKII', CUOI_NAM: 'CUỐI NĂM' };
/**
 * Thay đầu bài do app dựng bằng đầu bài trong mẫu đề của tổ (nếu môn đã có mẫu).
 * Có trục trặc thì vẫn trả tệp theo khung mặc định, kèm lí do trong tiêu đề X-Mau-De để giao diện báo lại.
 */
async function theoMau(buf: Uint8Array, mon: string, coMau: boolean): Promise<{ tep: Uint8Array; mau: string }> {
  if (!coMau) return { tep: buf, mau: 'tat' };
  try {
    const m = await fileMauDangDung(mon);
    if (!m) return { tep: buf, mau: 'chua-co' };
    if (!m.noiDung) return { tep: buf, mau: `loi:${m.lyDo ?? 'không đọc được mẫu'}` };
    const kq = ghepDauBaiTheoMau(buf, new Uint8Array(m.noiDung));
    return { tep: kq.tep, mau: `da-dung:${m.tenFile}` };
  } catch (e) {
    return { tep: buf, mau: `loi:${e instanceof Error ? e.message : String(e)}` };
  }
}

const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });

/** GET ?mon=&ky=&truong=&namHoc=&phut=[&goi=hoso][&mau=0: không dùng mẫu đề của tổ] → tệp Word: đề + hướng dẫn chấm, hoặc cả bộ hồ sơ (ma trận, đặc tả, đề, hướng dẫn chấm). */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    const de = id ? await layDeTheoId(id) : (await layDe(sp.get('mon') ?? '', sp.get('ky') ?? '')).de;
    const mon = de?.maMon ?? sp.get('mon') ?? '';
    const ky = de?.ky ?? sp.get('ky') ?? '';
    if (!de) return loi('Chưa có đề để xuất, hoặc bạn không có quyền xem đề này. Hãy lưu đề ở bước 4 trước.', 404);

    const tenMon = tenMonKT(mon).toUpperCase();
    const namHoc = (sp.get('namHoc') ?? '2026 - 2027').slice(0, 20);
    const coMau = sp.get('mau') !== '0';
    const phut = Math.min(120, Math.max(5, Number(sp.get('phut')) || 35));
    const tt: ThongTinDe = {
      tenTruong: (sp.get('truong') ?? 'TRƯỜNG TIỂU HỌC').toUpperCase().slice(0, 80),
      tieuDeKy: `KTĐK ${TEN_KY[ky] ?? ky} - NĂM HỌC ${namHoc}`,
      tenMon,
      thoiGianPhut: phut,
      lop: await layKhoiLamViec(),
    };
    if (sp.get('goi') === 'hoso') {
      const dt = await layDacTaCuaDe(mon, ky, de.dacTaId);
      const kq = await theoMau(new Uint8Array(await Packer.toBuffer(dungHoSoDe(tt, dt.duLieu, de.duLieu))), mon, coMau);
      return new NextResponse(kq.tep as BodyInit, {
        headers: {
          'X-Mau-De': encodeURIComponent(kq.mau),
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="HoSo-${mon}-${ky}.docx"`,
        },
      });
    }
    const tl = mon === 'TIENG_VIET' ? dungTaiLieuTiengViet(tt, de.duLieu) : dungTaiLieuDe(tt, de.duLieu);
    const kq = await theoMau(new Uint8Array(await Packer.toBuffer(tl)), mon, coMau);
    const ten = `De-${mon}-${ky}.docx`;
    return new NextResponse(kq.tep as BodyInit, {
      headers: {
        'X-Mau-De': encodeURIComponent(kq.mau),
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${ten}"`,
      },
    });
  } catch (e) {
    return loi(e, e instanceof Error && /Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 403 : 400);
  }
}
