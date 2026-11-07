import { NextRequest, NextResponse } from 'next/server';
import { goiAITheoViec, trangThaiViecAI } from '@/lib/repositories/cai-dat-ai.repository';
import { TEN_MON } from '@/core/chuong-trinh/mon';

export const maxDuration = 120;

const HE_THONG = `Bạn chép lại CHỮ trên ảnh một trang sách giáo khoa tiểu học Việt Nam.
Quy tắc: chép đầy đủ, đúng thứ tự đọc, giữ xuống dòng giữa các đoạn và số liệu, công thức, bảng (mỗi hàng một dòng, ô cách nhau dấu |). Chỉ chép những gì nhìn thấy, không giải thích, không thêm, không sửa. Hình minh họa: ghi một dòng ngắn trong ngoặc vuông, ví dụ [Hình: 5 quả táo]. Không dùng Markdown. Trang trống thì không trả về gì.`;

/** AI đọc chữ trên ảnh một trang sách: POST { mon, anh (base64 JPEG), trang } → { chu }. Chưa lưu; trình duyệt gửi tiếp sang /sach/trang. */
export async function POST(req: NextRequest) {
  try {
    const { mon, anh, trang } = (await req.json()) as { mon?: string; anh?: string; trang?: number };
    if (!mon || !TEN_MON[mon]) return NextResponse.json({ error: 'Thiếu hoặc sai môn.' }, { status: 400 });
    if (!anh || anh.length < 1000) return NextResponse.json({ error: 'Thiếu ảnh trang sách.' }, { status: 400 });
    if (anh.length > 3_500_000) return NextResponse.json({ error: 'Ảnh trang quá lớn.' }, { status: 413 });
    const tt = await trangThaiViecAI('DOC_TEP');
    if (!tt.daCauHinh) return NextResponse.json({ error: `Chưa dùng được AI: ${tt.lyDo ?? 'chưa cấu hình'}` }, { status: 503 });
    const kq = await goiAITheoViec('DOC_TEP', { heThong: HE_THONG, noiDung: `Ảnh trang ${trang ?? ''} của sách ${TEN_MON[mon]} lớp 4. Chép chữ trên trang.`, anh: [{ loai: 'image/jpeg', base64: anh }], toiDaToken: 3500, timWeb: false });
    return NextResponse.json({ success: true, chu: kq.traLoi.replace(/```[a-z]*\n?/g, '').trim(), model: tt.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
