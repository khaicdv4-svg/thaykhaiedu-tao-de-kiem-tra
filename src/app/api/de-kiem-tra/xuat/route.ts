import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { layDe } from '@/lib/repositories/ma-tran-dac-ta.repository';
import { dungTaiLieuDe, dungTaiLieuTiengViet, type ThongTinDe } from '@/core/de/xuat-word';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';

export const runtime = 'nodejs';

const TEN_KY: Record<string, string> = { GIUA_HK1: 'GIỮA HKI', CUOI_HK1: 'CUỐI HKI', GIUA_HK2: 'GIỮA HKII', CUOI_NAM: 'CUỐI NĂM' };
const loi = (e: unknown, ma = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: ma });

/** GET ?mon=&ky=&truong=&namHoc=&phut= → tệp Word gồm đề và hướng dẫn chấm của đề đang soạn. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const mon = sp.get('mon') ?? '';
    const ky = sp.get('ky') ?? '';
    const { de } = await layDe(mon, ky);
    if (!de) return loi('Chưa có đề để xuất. Hãy lưu đề ở bước 4 trước.', 404);

    const tenMon = (MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === mon)?.mon ?? mon).toUpperCase();
    const namHoc = (sp.get('namHoc') ?? '2026 - 2027').slice(0, 20);
    const phut = Math.min(120, Math.max(5, Number(sp.get('phut')) || 35));
    const tt: ThongTinDe = {
      tenTruong: (sp.get('truong') ?? 'TRƯỜNG TIỂU HỌC').toUpperCase().slice(0, 80),
      tieuDeKy: `KTĐK ${TEN_KY[ky] ?? ky} - NĂM HỌC ${namHoc}`,
      tenMon,
      thoiGianPhut: phut,
    };
    const tl = mon === 'TIENG_VIET' ? dungTaiLieuTiengViet(tt, de.duLieu) : dungTaiLieuDe(tt, de.duLieu);
    const buf = await Packer.toBuffer(tl);
    const ten = `De-${mon}-${ky}.docx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${ten}"`,
      },
    });
  } catch (e) {
    return loi(e, e instanceof Error && /Cần đăng nhập|Chưa cấu hình/.test(e.message) ? 403 : 400);
  }
}
