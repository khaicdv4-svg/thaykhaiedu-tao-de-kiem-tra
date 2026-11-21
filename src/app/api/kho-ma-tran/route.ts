import { NextRequest, NextResponse } from 'next/server';
import { danhSachTaiLieu, luuNhieuFile, xoaTaiLieu, type FileTaiLen } from '@/lib/repositories/kho-ma-tran.repository';
import { capNhatSauMaTranChung, type BuocLienKet } from '@/lib/repositories/lien-ket.repository';

const loi = (e: unknown, status = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });

export async function GET(req: NextRequest) {
  try {
    const loai = new URL(req.url).searchParams.get('loai');
    if (loai !== 'CA_NAM' && loai !== 'CHUNG') return loi('Thiếu loại ma trận (CA_NAM hoặc CHUNG).');
    return NextResponse.json({ success: true, taiLieu: await danhSachTaiLieu(loai) });
  } catch (e) {
    return loi(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { files } = (await req.json()) as { files?: FileTaiLen[] };
    if (!Array.isArray(files)) return loi('Thiếu danh sách file.');
    const ketQua = await luuNhieuFile(files);
    // Ma trận chung vừa tự xác nhận: cập nhật luôn ma trận riêng, đặc tả của môn, kì đó (mỗi ô một lần)
    const daLam = new Set<string>();
    const lienKet: { maMon: string; ky: string; buoc: BuocLienKet[] }[] = [];
    for (const k of ketQua) {
      if (!k.daXacNhan || k.loai !== 'CHUNG' || !k.maMon || !k.ky || daLam.has(`${k.maMon}|${k.ky}`)) continue;
      daLam.add(`${k.maMon}|${k.ky}`);
      try {
        lienKet.push({ maMon: k.maMon, ky: k.ky, buoc: await capNhatSauMaTranChung(k.maMon, k.ky) });
      } catch (e) {
        lienKet.push({ maMon: k.maMon, ky: k.ky, buoc: [{ buoc: 'MA_TRAN_RIENG', ok: false, thongBao: `Chưa cập nhật được ma trận riêng: ${e instanceof Error ? e.message : String(e)}` }] });
      }
    }
    return NextResponse.json({ success: true, ketQua, lienKet });
  } catch (e) {
    return loi(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return loi('Thiếu id.');
    await xoaTaiLieu(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return loi(e);
  }
}
