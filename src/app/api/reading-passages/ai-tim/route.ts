import { NextRequest, NextResponse } from 'next/server';
import { loiNhacTimBaiDoc, taoAIBaiDoc, type TieuChiTimBaiDoc } from '@/core/services/ai/reading-passage-ai';
import { phanTichBaiDoc } from '@/core/reading-passages/phan-tich';
import { kiemTraBaiDoc } from '@/core/reading-passages/kiem-tra';
import { layVanBanSgkTiengViet } from '@/lib/repositories/kho-bai-doc.repository';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';

/** Tìm web có thể mất vài phút. */
export const maxDuration = 300;

/** Nút AI bấm được chưa (theo Cài đặt AI, việc "Tìm bài đọc"). */
export async function GET() {
  return NextResponse.json(await trangThaiViecAI('TIM_BAI_DOC'));
}

/** AI tìm bài đọc theo tiêu chí. Kết quả chỉ là đề xuất, phải qua kiểm tra và tổ trưởng duyệt. */
export async function POST(req: NextRequest) {
  const tieuChi = (await req.json()) as TieuChiTimBaiDoc;
  const tt = await trangThaiViecAI('TIM_BAI_DOC');
  if (!tt.daCauHinh) {
    return NextResponse.json(
      { error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}`, loiNhac: loiNhacTimBaiDoc(tieuChi, await docBoNaoNeuCo()) },
      { status: 503 },
    );
  }
  try {
    const boNao = await docBoNaoNeuCo();
    const ai = taoAIBaiDoc((y) => goiAITheoViec('TIM_BAI_DOC', { ...y, choToiDa: 240_000 }), boNao);
    const sgk = await layVanBanSgkTiengViet().catch(() => []);
    const { baiDoc: deXuat, chanDoan } = await ai.timBaiDocChiTiet({ ...tieuChi, soBai: Math.min(Math.max(tieuChi.soBai || 3, 1), 8) });
    const baiDoc = deXuat.map((d) => {
      const pt = phanTichBaiDoc(d, { loai: tieuChi.loai, ky: tieuChi.ky });
      const bai = { ...pt, theLoai: d.theLoai || pt.theLoai, chuDiem: (d.chuDiem as typeof pt.chuDiem) || pt.chuDiem, ghiChu: [d.lyDoPhuHop, ...pt.ghiChu] };
      return { ...bai, kiemTra: kiemTraBaiDoc(bai, sgk, boNao) };
    });
    return NextResponse.json({ success: true, baiDoc, model: tt.model, chanDoan });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
