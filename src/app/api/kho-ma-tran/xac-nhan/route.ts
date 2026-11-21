import { NextRequest, NextResponse } from 'next/server';
import { xacNhanTaiLieu } from '@/lib/repositories/kho-ma-tran.repository';
import { capNhatSauMaTranChung, type BuocLienKet } from '@/lib/repositories/lien-ket.repository';

export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Thiếu id.' }, { status: 400 });
    const tl = await xacNhanTaiLieu(id);
    let lienKet: BuocLienKet[] = [];
    if (tl.loai === 'CHUNG' && tl.ky) {
      try {
        lienKet = await capNhatSauMaTranChung(tl.maMon, tl.ky);
      } catch (e) {
        lienKet = [{ buoc: 'MA_TRAN_RIENG', ok: false, thongBao: `Chưa cập nhật được ma trận riêng: ${e instanceof Error ? e.message : String(e)}` }];
      }
    }
    return NextResponse.json({ success: true, lienKet });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
