import { NextRequest, NextResponse } from 'next/server';
import { fileMauDe } from '@/lib/repositories/mau-de.repository';

export const runtime = 'nodejs';

/** GET ?id= → file Word gốc của bản mẫu */
export async function GET(req: NextRequest) {
  try {
    const { tenFile, noiDung } = await fileMauDe(req.nextUrl.searchParams.get('id') ?? '');
    return new NextResponse(new Uint8Array(noiDung), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(tenFile)}`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
