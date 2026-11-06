import { NextRequest, NextResponse } from 'next/server';
import { tachBaiDoc, phanTichBaiDoc } from '@/core/reading-passages/phan-tich';
import { kiemTraBaiDoc } from '@/core/reading-passages/kiem-tra';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { layVanBanSgkTiengViet } from '@/lib/repositories/kho-bai-doc.repository';
import type { KyKiemTraBaiDoc, LoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

/** Tách và phân tích văn bản (đã đọc từ file ở trình duyệt). Không ghi gì vào cơ sở dữ liệu. */
export async function POST(req: NextRequest) {
  try {
    const { vanBan, loai, ky } = (await req.json()) as { vanBan?: string; loai?: LoaiBaiDoc; ky?: KyKiemTraBaiDoc };
    if (!vanBan?.trim()) return NextResponse.json({ error: 'File không có chữ để phân tích.' }, { status: 400 });
    if (vanBan.length > 200_000) return NextResponse.json({ error: 'File quá dài (tối đa khoảng 200 nghìn kí tự mỗi lần).' }, { status: 400 });
    const sgk = await layVanBanSgkTiengViet().catch(() => []);
    const boNao = await docBoNaoNeuCo();
    const baiDoc = tachBaiDoc(vanBan).map((b) => {
      const pt = phanTichBaiDoc(b, { loai, ky });
      const kiemTra = kiemTraBaiDoc({ ...pt, chuDiem: pt.chuDiem }, sgk, boNao);
      return { ...pt, kiemTra };
    });
    return NextResponse.json({ success: true, baiDoc, coChuSgk: sgk.length > 0 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
