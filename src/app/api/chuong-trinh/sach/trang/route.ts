import { NextRequest, NextResponse } from 'next/server';
import { luuTrangSach } from '@/lib/repositories/sach.repository';

export const maxDuration = 60;

/** Lưu chữ của một nhóm trang: POST { sachId, nguon: 'CHU' | 'AI_DOC', trang: [{ trang, chu }] } (trang là số trang trong file PDF) */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { sachId?: string; nguon?: 'CHU' | 'AI_DOC'; trang?: { trang: number; chu: string }[] };
    if (!b.sachId || !Array.isArray(b.trang)) return NextResponse.json({ error: 'Thiếu mã sách hoặc các trang.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await luuTrangSach(b.sachId, b.trang, b.nguon === 'AI_DOC' ? 'AI_DOC' : 'CHU')) });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: m }, { status: /Chỉ tổ trưởng|Cần đăng nhập|Chưa cấu hình/.test(m) ? 403 : 400 });
  }
}
