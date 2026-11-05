import { NextRequest, NextResponse } from 'next/server';
import { ReadingPassageRepository } from '@/lib/repositories/reading-passage.repository';
import { ReadingPassageType, PassageReviewStatus } from '@/types/reading-passage';

const repo = new ReadingPassageRepository();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get('grade') ? parseInt(searchParams.get('grade')!, 10) : undefined;
    const passageType = (searchParams.get('passageType') as ReadingPassageType) || undefined;
    const status = (searchParams.get('status') as PassageReviewStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const passages = await repo.listPassages({ grade, passageType, status, search });
    return NextResponse.json({ success: true, passages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await repo.createPassage(body);
    return NextResponse.json({ success: true, passage: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID ngữ liệu cần xóa' }, { status: 400 });
    }

    const success = await repo.deletePassage(id);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
