import { NextRequest, NextResponse } from 'next/server';
import { duyetBaiDoc } from '@/lib/repositories/kho-bai-doc.repository';

/** Tổ trưởng duyệt hoặc từ chối bài đọc. Máy chủ kiểm tra lại toàn bộ quy định trước khi duyệt. */
export async function POST(req: NextRequest) {
  try {
    const { id, hanhDong, ghiChu } = (await req.json()) as { id?: string; hanhDong?: 'DUYET' | 'TU_CHOI'; ghiChu?: string };
    if (!id || !hanhDong) return NextResponse.json({ error: 'Thiếu bài đọc hoặc thao tác.' }, { status: 400 });
    if (hanhDong === 'TU_CHOI' && !ghiChu?.trim()) return NextResponse.json({ error: 'Cần ghi lí do từ chối.' }, { status: 400 });
    await duyetBaiDoc(id, hanhDong, ghiChu);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
