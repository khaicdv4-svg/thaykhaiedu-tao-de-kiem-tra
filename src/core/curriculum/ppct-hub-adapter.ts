/**
 * ThayKhaiEdu - THAYKHAIEDU PPCT HUB Ingestion Adapter & Discrepancy Engine
 * Master Project Specification V1.0 (Section 3.2, 3.3, 11.2, 15)
 */

import {
  PpctHubBackupFile,
  PpctHubTopic,
  PpctHubLesson,
  PpctHubPeriod,
  PpctHubYccdIdea,
  DiscrepancyItem,
  SubjectValidationResult,
  ValidationSummary,
  ProvenanceType,
} from '@/types/curriculum-source';

// Chuẩn số tiết năm học của Bộ GD&ĐT cho Lớp 4 (Thông tư 32/2018/TT-BGDĐT)
export const MINISTRY_STANDARD_PERIODS_GRADE_4: Record<string, { name: string; standardPeriods: number }> = {
  'subj-toan4': { name: 'Toán 4', standardPeriods: 175 },
  'subj-tv4': { name: 'Tiếng Việt 4', standardPeriods: 245 },
  'subj-kh4': { name: 'Khoa học 4', standardPeriods: 70 },
  'subj-lsdl4': { name: 'Lịch sử và Địa lí 4', standardPeriods: 70 },
  'subj-cn4': { name: 'Công nghệ 4', standardPeriods: 35 },
  'subj-dd4': { name: 'Đạo đức 4', standardPeriods: 35 },
  'subj-hdtn4': { name: 'Hoạt động trải nghiệm 4', standardPeriods: 105 },
};

export interface ParsedPpctHubData {
  academicYear: string;
  grade: number;
  topics: PpctHubTopic[];
  lessons: PpctHubLesson[];
  periods: PpctHubPeriod[];
  outcomes: PpctHubYccdIdea[];
  rawBackup: PpctHubBackupFile;
}

/**
 * Lấy tên hiển thị thân thiện cho môn học
 */
export function getSubjectDisplayName(subjectId: string): string {
  if (MINISTRY_STANDARD_PERIODS_GRADE_4[subjectId]) {
    return MINISTRY_STANDARD_PERIODS_GRADE_4[subjectId].name;
  }
  if (subjectId === 'subj-tv1') return 'Tiếng Việt 1 (Lệch khối)';
  if (subjectId.startsWith('subj-toan')) return 'Toán';
  if (subjectId.startsWith('subj-tv')) return 'Tiếng Việt';
  if (subjectId.startsWith('subj-kh')) return 'Khoa học';
  if (subjectId.startsWith('subj-lsdl')) return 'Lịch sử và Địa lí';
  if (subjectId.startsWith('subj-cn')) return 'Công nghệ';
  if (subjectId.startsWith('subj-dd')) return 'Đạo đức';
  if (subjectId.startsWith('subj-hdtn')) return 'Hoạt động trải nghiệm';
  return subjectId;
}

/**
 * Chuẩn hóa số tiết convertedPeriods (xử lý cả number và chuỗi số)
 */
export function parseConvertedPeriods(val: unknown): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (typeof val === 'string') {
    const parsed = parseInt(val.trim(), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * BƯỚC 3: Trích xuất và lọc dữ liệu từ tệp JSON của PPCT HUB
 * - Lọc nghiêm ngặt Khối 4 (gradeId = "grade-4" hoặc tương đương)
 * - Lọc nghiêm ngặt Năm học "2026-2027" (hoặc activeAcademicYear nếu khớp)
 * - Bỏ qua hoàn toàn dữ liệu demo (dataSource = "demo")
 */
export function extractAndFilterPpctHubData(
  jsonContent: string | PpctHubBackupFile,
  targetGrade = 4,
  targetAcademicYear = '2026-2027'
): ParsedPpctHubData {
  const data: PpctHubBackupFile =
    typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

  const activeYear = data.activeAcademicYear || targetAcademicYear;
  const gradeKey = `grade-${targetGrade}`;

  // 1. Lọc Chủ đề (Topics)
  const allTopics = data.topics || [];
  const filteredTopics = allTopics.filter((t) => {
    if (t.dataSource === 'demo') return false;
    const matchesGrade = t.gradeId === gradeKey || t.gradeId === String(targetGrade);
    const matchesYear = (t.academicYear || activeYear) === targetAcademicYear;
    return matchesGrade && matchesYear;
  });

  const topicIdSet = new Set(filteredTopics.map((t) => t.id));

  // 2. Lọc Bài học (Lessons)
  const allLessons = data.lessons || [];
  const filteredLessons = allLessons.filter((l) => {
    if (l.dataSource === 'demo') return false;
    const matchesYear = (l.academicYear || activeYear) === targetAcademicYear;
    // Khớp nếu thuộc topic hợp lệ hoặc có gradeId đúng
    const matchesTopic = topicIdSet.has(l.topicId);
    const matchesGrade = l.gradeId ? (l.gradeId === gradeKey || l.gradeId === String(targetGrade)) : true;
    return matchesYear && (matchesTopic || matchesGrade);
  });

  const lessonIdSet = new Set(filteredLessons.map((l) => l.id));

  // 3. Lọc Tiết học (Periods)
  const allPeriods = data.periods || [];
  const filteredPeriods = allPeriods.filter((p) => {
    if (p.dataSource === 'demo') return false;
    const matchesYear = (p.academicYear || activeYear) === targetAcademicYear;
    const matchesLesson = lessonIdSet.has(p.lessonId);
    const matchesGrade = p.gradeId ? (p.gradeId === gradeKey || p.gradeId === String(targetGrade)) : true;
    return matchesYear && (matchesLesson || matchesGrade);
  });

  // 4. Lọc YCCĐ (YccdIdeas / LearningOutcomes)
  const rawOutcomes = data.yccdIdeas || data.learningOutcomes || [];
  const filteredOutcomes = rawOutcomes.filter((o) => {
    const matchesGrade = o.gradeId === gradeKey || o.gradeId === String(targetGrade);
    return matchesGrade;
  });

  return {
    academicYear: targetAcademicYear,
    grade: targetGrade,
    topics: filteredTopics,
    lessons: filteredLessons,
    periods: filteredPeriods,
    outcomes: filteredOutcomes,
    rawBackup: data,
  };
}

/**
 * BƯỚC 6: CÔNG CỤ KIỂM TRA SAI LỆCH (VALIDATION & DISCREPANCY ENGINE)
 * Chạy tự động 6 bộ quy tắc kiểm tra theo đặc tả
 */
export function validatePpctDiscrepancies(parsed: ParsedPpctHubData): ValidationSummary {
  const issues: DiscrepancyItem[] = [];
  const { topics, lessons, periods, outcomes, grade, academicYear } = parsed;
  const gradeKey = `grade-${grade}`;

  const topicMap = new Map(topics.map((t) => [t.id, t]));
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  // Tập hợp danh sách các môn có trong dữ liệu
  const subjectIds = new Set<string>();
  topics.forEach((t) => subjectIds.add(t.subjectId));
  lessons.forEach((l) => l.subjectId && subjectIds.add(l.subjectId));
  periods.forEach((p) => p.subjectId && subjectIds.add(p.subjectId));
  outcomes.forEach((o) => o.subjectId && subjectIds.add(o.subjectId));

  // ----------------------------------------------------------------------------
  // QUY TẮC 1: Lệch môn/khối (GRADE_SUBJECT_MISMATCH) - BLOCKER
  // Ví dụ: subj-tv1 (Tiếng Việt 1) gán vào grade-4
  // ----------------------------------------------------------------------------
  const checkGradeMismatch = (
    subjectId: string,
    gradeId: string | undefined,
    entityType: 'topic' | 'lesson' | 'period' | 'outcome',
    entityId: string,
    title: string
  ) => {
    // Kiểm tra mã môn có chỉ số lớp mâu thuẫn (subj-tv1, subj-toan1, subj-tv2, ...)
    const subjectGradeMatch = subjectId.match(/subj-[a-z]+(\d)/i);
    if (subjectGradeMatch) {
      const subjectGradeNum = parseInt(subjectGradeMatch[1], 10);
      if (subjectGradeNum !== grade) {
        issues.push({
          id: `discrepancy-mismatch-${entityType}-${entityId}`,
          subjectId,
          subjectName: getSubjectDisplayName(subjectId),
          severity: 'BLOCKER',
          category: 'GRADE_SUBJECT_MISMATCH',
          title: `Lệch môn/khối: Môn Lớp ${subjectGradeNum} gán vào Lớp ${grade}`,
          description: `Thực thể ${entityType} [${title}] thuộc môn '${subjectId}' (Lớp ${subjectGradeNum}) nhưng đang nằm trong luồng Khối ${grade}.`,
          entityType,
          entityId,
          details: { subjectId, detectedGrade: subjectGradeNum, targetGrade: grade },
        });
      }
    }

    if (gradeId && gradeId !== gradeKey && gradeId !== String(grade)) {
      issues.push({
        id: `discrepancy-gradeid-${entityType}-${entityId}`,
        subjectId,
        subjectName: getSubjectDisplayName(subjectId),
        severity: 'BLOCKER',
        category: 'GRADE_SUBJECT_MISMATCH',
        title: `Lệch gradeId: '${gradeId}' khác Khối ${grade}`,
        description: `Thực thể ${entityType} [${title}] có gradeId='${gradeId}', không khớp với Khối ${grade}.`,
        entityType,
        entityId,
        details: { gradeId, targetGrade: grade },
      });
    }
  };

  topics.forEach((t) => checkGradeMismatch(t.subjectId, t.gradeId, 'topic', t.id, t.name));
  lessons.forEach((l) => l.subjectId && checkGradeMismatch(l.subjectId, l.gradeId, 'lesson', l.id, l.title || l.name || ''));
  periods.forEach((p) => p.subjectId && checkGradeMismatch(p.subjectId, p.gradeId, 'period', p.id, p.title));
  outcomes.forEach((o) => checkGradeMismatch(o.subjectId, o.gradeId, 'outcome', o.id, o.code || o.id));

  // ----------------------------------------------------------------------------
  // QUY TẮC 5: Bài mồ côi và Tiết mồ côi (ORPHAN_PERIOD_OR_LESSON) - BLOCKER
  // ----------------------------------------------------------------------------
  lessons.forEach((l) => {
    if (!l.topicId || !topicMap.has(l.topicId)) {
      const subj = l.subjectId || 'unknown';
      issues.push({
        id: `orphan-lesson-${l.id}`,
        subjectId: subj,
        subjectName: getSubjectDisplayName(subj),
        severity: 'BLOCKER',
        category: 'ORPHAN_PERIOD_OR_LESSON',
        title: `Bài học mồ côi: Thiếu chủ đề cha`,
        description: `Bài học "${l.title || l.name}" (ID: ${l.id}) trỏ tới topicId '${l.topicId}' không tồn tại trong danh sách chủ đề.`,
        entityType: 'lesson',
        entityId: l.id,
        details: { topicId: l.topicId },
      });
    }
  });

  periods.forEach((p) => {
    if (!p.lessonId || !lessonMap.has(p.lessonId)) {
      const subj = p.subjectId || 'unknown';
      issues.push({
        id: `orphan-period-${p.id}`,
        subjectId: subj,
        subjectName: getSubjectDisplayName(subj),
        severity: 'BLOCKER',
        category: 'ORPHAN_PERIOD_OR_LESSON',
        title: `Tiết học mồ côi: Thiếu bài học cha`,
        description: `Tiết "${p.title}" (ID: ${p.id}) trỏ tới lessonId '${p.lessonId}' không tồn tại trong danh sách bài học.`,
        entityType: 'period',
        entityId: p.id,
        details: { lessonId: p.lessonId },
      });
    }
  });

  // ----------------------------------------------------------------------------
  // QUY TẮC 2: Lệch số tiết (INVALID_PERIODS_COUNT) - BLOCKER
  // convertedPeriods <= 0 hoặc > 5 (ví dụ 112, 3123 là lỗi gõ từ app cũ)
  // ----------------------------------------------------------------------------
  periods.forEach((p) => {
    const converted = parseConvertedPeriods(p.convertedPeriods);
    const subj = p.subjectId || (lessonMap.get(p.lessonId)?.subjectId) || 'unknown';

    if (converted <= 0 || converted > 5) {
      issues.push({
        id: `invalid-periods-count-${p.id}`,
        subjectId: subj,
        subjectName: getSubjectDisplayName(subj),
        severity: 'BLOCKER',
        category: 'INVALID_PERIODS_COUNT',
        title: `Lệch số tiết: convertedPeriods = ${p.convertedPeriods}`,
        description: `Tiết "${p.title}" có số tiết quy đổi là ${p.convertedPeriods} (ngoài phạm vi hợp lệ 1 - 5 tiết). Cần sửa lại.`,
        entityType: 'period',
        entityId: p.id,
        details: { rawValue: p.convertedPeriods, parsedValue: converted },
      });
    }
  });

  // ----------------------------------------------------------------------------
  // QUY TẮC 3: Tiết không có tên thật (NUMERIC_OR_EMPTY_TITLE) - WARNING
  // Tiêu đề chỉ là số ("1", "2") hoặc chỉ có chữ "tiết" ("2 tiết", "3 tiết")
  // ----------------------------------------------------------------------------
  const numericTitlePattern = /^\s*\d+\s*$/;
  const durationOnlyPattern = /^\s*\d+\s*(tiết|tiet)\s*$/i;

  periods.forEach((p) => {
    const rawTitle = (p.title || '').trim();
    const subj = p.subjectId || (lessonMap.get(p.lessonId)?.subjectId) || 'unknown';

    if (!rawTitle || numericTitlePattern.test(rawTitle) || durationOnlyPattern.test(rawTitle)) {
      issues.push({
        id: `empty-or-numeric-title-${p.id}`,
        subjectId: subj,
        subjectName: getSubjectDisplayName(subj),
        severity: 'WARNING',
        category: 'NUMERIC_OR_EMPTY_TITLE',
        title: `Tiết thiếu nội dung: "${rawTitle || '(Trống)'}"`,
        description: `Tiêu đề tiết học [${rawTitle || 'Trống'}] chỉ gồm số hoặc thời lượng, thiếu nội dung chuyên môn cụ thể.`,
        entityType: 'period',
        entityId: p.id,
        details: { title: rawTitle },
      });
    }
  });

  // ----------------------------------------------------------------------------
  // QUY TẮC 6: Tuần học ngoài 1-35 hoặc học kỳ lệch tuần - WARNING
  // Học kỳ 1: tuần 1-18, Học kỳ 2: tuần 19-35
  // ----------------------------------------------------------------------------
  periods.forEach((p) => {
    const subj = p.subjectId || (lessonMap.get(p.lessonId)?.subjectId) || 'unknown';
    if (p.week !== undefined && p.week !== null) {
      if (p.week < 1 || p.week > 35) {
        issues.push({
          id: `week-out-of-bounds-${p.id}`,
          subjectId: subj,
          subjectName: getSubjectDisplayName(subj),
          severity: 'WARNING',
          category: 'WEEK_OR_SEMESTER_OUT_OF_BOUNDS',
          title: `Tuần học ngoài quy định: Tuần ${p.week}`,
          description: `Tiết "${p.title}" được xếp vào Tuần ${p.week} (chuẩn năm học tiểu học là tuần 1 đến 35).`,
          entityType: 'period',
          entityId: p.id,
          details: { week: p.week },
        });
      } else if (p.semester === 1 && p.week > 18) {
        issues.push({
          id: `semester-mismatch-hk1-${p.id}`,
          subjectId: subj,
          subjectName: getSubjectDisplayName(subj),
          severity: 'WARNING',
          category: 'WEEK_OR_SEMESTER_OUT_OF_BOUNDS',
          title: `Lệch học kỳ: HK1 nhưng tuần ${p.week}`,
          description: `Tiết "${p.title}" ghi Học kỳ 1 nhưng xếp vào Tuần ${p.week} (> Tuần 18).`,
          entityType: 'period',
          entityId: p.id,
          details: { semester: 1, week: p.week },
        });
      } else if (p.semester === 2 && p.week < 19) {
        issues.push({
          id: `semester-mismatch-hk2-${p.id}`,
          subjectId: subj,
          subjectName: getSubjectDisplayName(subj),
          severity: 'WARNING',
          category: 'WEEK_OR_SEMESTER_OUT_OF_BOUNDS',
          title: `Lệch học kỳ: HK2 nhưng tuần ${p.week}`,
          description: `Tiết "${p.title}" ghi Học kỳ 2 nhưng xếp vào Tuần ${p.week} (< Tuần 19).`,
          entityType: 'period',
          entityId: p.id,
          details: { semester: 2, week: p.week },
        });
      }
    }
  });

  // ----------------------------------------------------------------------------
  // QUY TẮC 4: Lệch tổng số tiết so với chuẩn Bộ - WARNING
  // Tính tổng số tiết theo môn và so khớp
  // ----------------------------------------------------------------------------
  const subjectPeriodTotals: Record<string, number> = {};
  periods.forEach((p) => {
    const subj = p.subjectId || (lessonMap.get(p.lessonId)?.subjectId) || 'unknown';
    const c = parseConvertedPeriods(p.convertedPeriods);
    // Chỉ cộng các giá trị hợp lý (1..5) để không bị thổi phồng bởi lỗi gõ phím
    const validC = c >= 1 && c <= 5 ? c : 1;
    subjectPeriodTotals[subj] = (subjectPeriodTotals[subj] || 0) + validC;
  });

  subjectIds.forEach((subjId) => {
    const stdConfig = MINISTRY_STANDARD_PERIODS_GRADE_4[subjId];
    if (stdConfig) {
      const actual = subjectPeriodTotals[subjId] || 0;
      if (actual !== stdConfig.standardPeriods) {
        const diff = actual - stdConfig.standardPeriods;
        issues.push({
          id: `subject-total-periods-deviation-${subjId}`,
          subjectId: subjId,
          subjectName: stdConfig.name,
          severity: 'BLOCKER',
          category: 'SUBJECT_TOTAL_PERIODS_DEVIATION',
          title: `Lệch tổng số tiết: ${actual} tiết (Chuẩn Bộ: ${stdConfig.standardPeriods} tiết)`,
          description: `Môn ${stdConfig.name} có tổng ${actual} tiết hợp lệ, chênh lệch ${diff > 0 ? `+${diff}` : diff} tiết so với khung chuẩn ${stdConfig.standardPeriods} tiết của Bộ GD&ĐT.`,
          entityType: 'topic',
          entityId: subjId,
          details: {
            actualPeriods: actual,
            standardPeriods: stdConfig.standardPeriods,
            difference: diff,
          },
        });
      }
    }
  });

  // ----------------------------------------------------------------------------
  // BẢNG TỔNG HỢP THEO MÔN
  // ----------------------------------------------------------------------------
  const subjectsSummary: Record<string, SubjectValidationResult> = {};

  subjectIds.forEach((subjId) => {
    const subjTopics = topics.filter((t) => t.subjectId === subjId);
    const subjLessons = lessons.filter(
      (l) => l.subjectId === subjId || (l.topicId && topicMap.get(l.topicId)?.subjectId === subjId)
    );
    const subjPeriods = periods.filter(
      (p) => p.subjectId === subjId || (p.lessonId && lessonMap.get(p.lessonId)?.subjectId === subjId)
    );
    const subjOutcomes = outcomes.filter((o) => o.subjectId === subjId);

    const subjIssues = issues.filter((iss) => iss.subjectId === subjId);
    const blockersCount = subjIssues.filter((iss) => iss.severity === 'BLOCKER').length;
    const warningsCount = subjIssues.filter((iss) => iss.severity === 'WARNING').length;

    const stdConfig = MINISTRY_STANDARD_PERIODS_GRADE_4[subjId];
    const standardPeriods = stdConfig?.standardPeriods || 0;
    const actualPeriods = subjectPeriodTotals[subjId] || 0;

    subjectsSummary[subjId] = {
      subjectId: subjId,
      subjectName: getSubjectDisplayName(subjId),
      grade,
      standardPeriods,
      actualPeriods,
      totalTopics: subjTopics.length,
      totalLessons: subjLessons.length,
      totalPeriods: subjPeriods.length,
      totalOutcomes: subjOutcomes.length,
      blockersCount,
      warningsCount,
      canImport: blockersCount === 0,
      issues: subjIssues,
    };
  });

  const totalBlockers = issues.filter((iss) => iss.severity === 'BLOCKER').length;
  const totalWarnings = issues.filter((iss) => iss.severity === 'WARNING').length;
  const totalInfos = issues.filter((iss) => iss.severity === 'INFO').length;

  return {
    targetGrade: grade,
    targetAcademicYear: academicYear,
    totalBlockers,
    totalWarnings,
    totalInfos,
    subjectsSummary,
    allIssues: issues,
  };
}

/**
 * BƯỚC 7 & 8: ÁNH XẠ DỮ LIỆU SANG CSDL THAYKHAIEDU
 * Chuẩn bị payload để lưu vào curriculum_sources, curriculum_outcomes, curriculum_mappings
 */
export interface IngestionPayload {
  source: {
    code: string;
    name: string;
    subjectId: string;
    grade: number;
    bookEdition: string;
    academicYear: string;
    publisher: string;
    sourceType: 'PPCT_HUB_JSON';
    externalHubId: string;
    totalLessons: number;
    totalPeriods: number;
    status: 'ACTIVE';
    metadata: Record<string, unknown>;
  };
  outcomes: Array<{
    code: string;
    subjectId: string;
    grade: number;
    strandName?: string;
    groupName?: string;
    topicName?: string;
    content: string;
    originalText?: string;
    orderIndex: number;
    provenanceType: ProvenanceType;
    isVerified: boolean;
    externalHubId: string;
    notes?: string;
    linkedLessonIds?: string[];
    linkedPeriodIds?: string[];
  }>;
  mappings: Array<{
    outcomeExternalHubId: string;
    lessonExternalId?: string;
    lessonTitle?: string;
    periodExternalId?: string;
    periodTitle?: string;
    periodNumber?: number;
    week?: number;
    semester?: number;
  }>;
  /** Lịch từng tiết theo tuần: căn cứ để biết học sinh đã học đến đâu khi ra đề. */
  periods: TietPpct[];
}

export interface TietPpct {
  periodExternalId: string;
  lessonExternalId: string | null;
  topicName: string | null;
  lessonTitle: string | null;
  lessonOrder: number | null;
  periodTitle: string;
  /** Số thứ tự tiết trong năm của môn (1, 2, 3...). */
  periodNumber: number | null;
  orderInLesson: number | null;
  week: number | null;
  semester: number | null;
  periodType: string | null;
  notes: string | null;
  yccdExternalIds: string[];
}

const soHoacNull = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/**
 * Lịch tiết của một môn, xếp theo tuần rồi số tiết.
 * Học kì: lấy từ tiết, không có thì lấy từ bài, không có nữa thì suy từ tuần (1–18: HKI, 19–35: HKII).
 */
export function lichTietCuaMon(parsed: ParsedPpctHubData, subjectId: string): TietPpct[] {
  const lessonMap = new Map(parsed.lessons.map((l) => [l.id, l]));
  const topicMap = new Map(parsed.topics.map((t) => [t.id, t.name]));
  const tiet = parsed.periods
    .filter((p) => p.subjectId === subjectId || (!p.subjectId && lessonMap.get(p.lessonId)?.subjectId === subjectId))
    .map((p): TietPpct => {
      const les = lessonMap.get(p.lessonId);
      const week = soHoacNull(p.week) ?? soHoacNull(les?.startWeek);
      const semester = soHoacNull(p.semester) ?? soHoacNull(les?.term) ?? (week ? (week <= 18 ? 1 : 2) : null);
      return {
        periodExternalId: p.id,
        lessonExternalId: les?.id ?? p.lessonId ?? null,
        topicName: les?.topicId ? topicMap.get(les.topicId) ?? null : null,
        lessonTitle: les?.title || les?.name || null,
        lessonOrder: soHoacNull(les?.order),
        periodTitle: (p.title || '').trim() || les?.title || 'Tiết học',
        periodNumber: soHoacNull(p.globalPeriodNumber) ?? soHoacNull(p.periodNumber),
        orderInLesson: soHoacNull(p.orderInLesson),
        week,
        semester,
        periodType: p.periodType ?? null,
        notes: p.notes ?? null,
        yccdExternalIds: Array.isArray(p.yccdIds) ? p.yccdIds : [],
      };
    });
  const vc = (n: number | null) => (n === null ? Number.MAX_SAFE_INTEGER : n);
  return tiet.sort((a, b) => vc(a.week) - vc(b.week) || vc(a.periodNumber) - vc(b.periodNumber) || vc(a.lessonOrder) - vc(b.lessonOrder) || vc(a.orderInLesson) - vc(b.orderInLesson));
}

export function prepareSubjectIngestionPayload(
  parsed: ParsedPpctHubData,
  subjectId: string,
  chosenProvenanceType: ProvenanceType = 'UNVERIFIED_PENDING'
): IngestionPayload | null {
  const { topics, lessons, periods, outcomes, grade, academicYear, rawBackup } = parsed;
  const subjectName = getSubjectDisplayName(subjectId);

  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const periodMap = new Map(periods.map((p) => [p.id, p]));
  const strandMap = new Map((rawBackup.strands || []).map((s) => [s.id, s.name]));
  const groupMap = new Map((rawBackup.groups || []).map((g) => [g.id, g.name]));

  // Lọc theo subjectId
  const subjTopics = topics.filter((t) => t.subjectId === subjectId);
  const subjLessons = lessons.filter((l) => l.subjectId === subjectId);
  const subjPeriods = periods.filter((p) => p.subjectId === subjectId);
  const subjOutcomes = outcomes.filter((o) => o.subjectId === subjectId);

  if (subjTopics.length === 0 && subjLessons.length === 0 && subjPeriods.length === 0 && subjOutcomes.length === 0) {
    return null;
  }

  // Luôn tôn trọng quy tắc: KHÔNG TỰ NÂNG CẤP LÊN OFFICIAL_RAW
  // verificationStatus = 'verified' -> is_verified = true, nhưng provenance_type do giáo viên chọn
  const safeProvenance: ProvenanceType =
    chosenProvenanceType === 'OFFICIAL_RAW' ? 'MATRIX_DERIVED' : chosenProvenanceType;

  const outcomePayloads = subjOutcomes.map((o, idx) => {
    const isVerified = o.verificationStatus === 'verified';
    const content = o.content || o.itemText || o.originalText || '';
    const strandName = o.strandId ? strandMap.get(o.strandId) : undefined;
    const groupName = o.groupId ? groupMap.get(o.groupId) : undefined;

    return {
      code: o.code || `YCCD-${subjectId.toUpperCase()}-${idx + 1}`,
      subjectId,
      grade,
      strandName,
      groupName,
      content,
      originalText: o.originalText || content,
      orderIndex: o.order || idx + 1,
      provenanceType: safeProvenance,
      isVerified,
      externalHubId: o.id,
      notes: o.notes || undefined,
      linkedLessonIds: o.linkedLessonIds,
      linkedPeriodIds: o.linkedPeriodIds,
    };
  });

  // Mappings
  const mappingsPayload: IngestionPayload['mappings'] = [];
  outcomePayloads.forEach((o) => {
    if (o.linkedPeriodIds && o.linkedPeriodIds.length > 0) {
      o.linkedPeriodIds.forEach((perId) => {
        const per = periodMap.get(perId);
        const les = per?.lessonId ? lessonMap.get(per.lessonId) : undefined;
        mappingsPayload.push({
          outcomeExternalHubId: o.externalHubId,
          lessonExternalId: les?.id,
          lessonTitle: les?.title || les?.name,
          periodExternalId: perId,
          periodTitle: per?.title,
          periodNumber: per?.globalPeriodNumber || per?.orderInLesson,
          week: per?.week,
          semester: per?.semester,
        });
      });
    } else if (o.linkedLessonIds && o.linkedLessonIds.length > 0) {
      o.linkedLessonIds.forEach((lesId) => {
        const les = lessonMap.get(lesId);
        mappingsPayload.push({
          outcomeExternalHubId: o.externalHubId,
          lessonExternalId: lesId,
          lessonTitle: les?.title || les?.name,
        });
      });
    }
  });

  return {
    source: {
      code: `SRC-${subjectId.toUpperCase().replace('SUBJ-', '')}-K4-${academicYear}`,
      name: `PPCT & YCCĐ ${subjectName} (Năm học ${academicYear})`,
      subjectId,
      grade,
      bookEdition: 'Kết nối tri thức với cuộc sống (Bản thống nhất 2026-2027)',
      academicYear,
      publisher: 'NXB Giáo dục Việt Nam',
      sourceType: 'PPCT_HUB_JSON',
      externalHubId: `hub-${subjectId}-${grade}-${academicYear}`,
      totalLessons: subjLessons.length,
      totalPeriods: subjPeriods.length,
      status: 'ACTIVE',
      metadata: {
        exportedAt: rawBackup.exportedAt,
        schemaVersion: rawBackup.schemaVersion,
        adapter: 'ThayKhaiEdu_PpctHubAdapter_v2',
      },
    },
    outcomes: outcomePayloads,
    mappings: mappingsPayload,
    periods: lichTietCuaMon(parsed, subjectId),
  };
}
