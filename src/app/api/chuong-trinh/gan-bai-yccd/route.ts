import { NextRequest, NextResponse } from 'next/server';
import { dsYccd } from '@/lib/repositories/chuong-trinh.repository';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { HE_THONG_GAN_YCCD_THEO_BAI, docGanYccdTheoBai, loiNhacGanYccdTheoBai } from '@/core/matrix/dung-tu-chuong-trinh';

export const maxDuration = 60;

/**
 * AI gợi ý YCCĐ đã duyệt cho từng bài của một chủ đề trong PPCT. Chỉ chọn id có trong Kho, không viết YCCĐ mới.
 * Kết quả chỉ là gợi ý: giáo viên xem và sửa trước khi dựng khung ma trận.
 */
export async function POST(req: NextRequest) {
  try {
    const { mon, lop = 4, chuDe, bai } = (await req.json()) as { mon?: string; lop?: number; chuDe?: string; bai?: string[] };
    if (!mon || !chuDe || !Array.isArray(bai)) return NextResponse.json({ error: 'Thiếu môn, chủ đề hoặc danh sách bài.' }, { status: 400 });
    const ds = await dsYccd({ mon, lop, trangThai: 'DA_DUYET' });
    if (ds.length === 0) return NextResponse.json({ error: 'Kho chương trình chưa có YCCĐ đã duyệt cho môn này.' }, { status: 400 });
    const tt = await trangThaiViecAI('DOC_TEP');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });

    const rutGon = ds.map((y) => ({ id: y.id, noiDung: y.noiDung, mach: y.mach }));
    const hopLe = new Set(rutGon.map((y) => y.id));
    const dsBai = bai.slice(0, 40);
    const noiDung = loiNhacGanYccdTheoBai({ mon, lop, chuDe, bai: dsBai, yccd: rutGon });
    let kqBai: string[][] | null = null;
    for (let lan = 0; lan < 2 && !kqBai; lan++) {
      const kq = await goiAITheoViec('DOC_TEP', { heThong: HE_THONG_GAN_YCCD_THEO_BAI, noiDung: lan ? `${noiDung}\n\nLần trước trả lời sai dạng. Chỉ trả về một đối tượng JSON.` : noiDung, toiDaToken: 3000, timWeb: false });
      kqBai = docGanYccdTheoBai(kq.traLoi, dsBai.length, hopLe);
    }
    if (!kqBai) return NextResponse.json({ error: 'AI trả lời không đúng dạng. Thầy thử lại.' }, { status: 502 });
    return NextResponse.json({ success: true, theoBai: kqBai, model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
