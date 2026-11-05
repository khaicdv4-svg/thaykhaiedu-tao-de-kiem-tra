import { NextRequest, NextResponse } from 'next/server';
import { CurriculumSourceRepository } from '@/lib/repositories/curriculum-source.repository';
import {
  extractAndFilterPpctHubData,
  prepareSubjectIngestionPayload,
} from '@/core/curriculum/ppct-hub-adapter';
import { ProvenanceType } from '@/types/curriculum-source';

const repo = new CurriculumSourceRepository();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = parseInt(searchParams.get('grade') || '4', 10);
    const academicYear = searchParams.get('academicYear') || '2026-2027';

    const sources = await repo.listSources(grade, academicYear);
    return NextResponse.json({ success: true, sources });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      jsonContent,
      selectedSubjectIds,
      provenanceType = 'UNVERIFIED_PENDING',
      grade = 4,
      academicYear = '2026-2027',
    } = body;

    if (!jsonContent || !Array.isArray(selectedSubjectIds) || selectedSubjectIds.length === 0) {
      return NextResponse.json(
        { error: 'Thiếu dữ liệu tệp hoặc chưa chọn môn học cần nhập' },
        { status: 400 }
      );
    }

    const parsed = extractAndFilterPpctHubData(jsonContent, Number(grade), academicYear);
    const results = [];

    for (const subjectId of selectedSubjectIds) {
      const payload = prepareSubjectIngestionPayload(
        parsed,
        subjectId,
        provenanceType as ProvenanceType
      );

      if (payload) {
        const saved = await repo.ingestSubjectSource(payload);
        results.push({
          subjectId,
          sourceId: saved.sourceId,
          outcomesSaved: saved.outcomesSaved,
          mappingsSaved: saved.mappingsSaved,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã lưu thành công ${results.length} môn học vào kho chuyên môn.`,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
