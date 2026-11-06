import { NextRequest, NextResponse } from 'next/server';
import { docBoNao, luuBoNao } from '@/lib/repositories/bo-nao.repository';

export async function GET() {
  try {
    return NextResponse.json({ success: true, boNao: await docBoNao() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { boNao } = (await req.json()) as { boNao?: unknown };
    return NextResponse.json({ success: true, boNao: await luuBoNao(boNao) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
