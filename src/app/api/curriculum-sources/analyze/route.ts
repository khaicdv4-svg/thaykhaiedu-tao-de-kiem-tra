import { NextRequest, NextResponse } from 'next/server';
import {
  extractAndFilterPpctHubData,
  validatePpctDiscrepancies,
} from '@/core/curriculum/ppct-hub-adapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jsonContent, grade = 4, academicYear = '2026-2027' } = body;

    if (!jsonContent) {
      return NextResponse.json(
        { error: 'Thiếu nội dung tệp JSON sao lưu' },
        { status: 400 }
      );
    }

    const parsed = extractAndFilterPpctHubData(jsonContent, Number(grade), academicYear);
    const summary = validatePpctDiscrepancies(parsed);

    return NextResponse.json({
      success: true,
      data: {
        academicYear: parsed.academicYear,
        grade: parsed.grade,
        topicsCount: parsed.topics.length,
        lessonsCount: parsed.lessons.length,
        periodsCount: parsed.periods.length,
        outcomesCount: parsed.outcomes.length,
        summary,
        parsedData: {
          topics: parsed.topics,
          lessons: parsed.lessons,
          periods: parsed.periods,
          outcomes: parsed.outcomes,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Lỗi phân tích tệp JSON: ${message}` },
      { status: 500 }
    );
  }
}
