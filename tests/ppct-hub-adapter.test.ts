import { describe, it, expect } from 'vitest';
import {
  extractAndFilterPpctHubData,
  validatePpctDiscrepancies,
  prepareSubjectIngestionPayload,
  parseConvertedPeriods,
} from '@/core/curriculum/ppct-hub-adapter';
import { PpctHubBackupFile } from '@/types/curriculum-source';

describe('PPCT HUB Adapter & Validation Engine', () => {
  const sampleBackup: PpctHubBackupFile = {
    app: 'THAYKHAIEDU PPCT HUB',
    version: '1.0.0',
    schemaVersion: '2.0',
    activeAcademicYear: '2026-2027',
    topics: [
      {
        id: 'top-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        name: 'Số tự nhiên',
        order: 1,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'top-math-demo',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        name: 'Chủ đề demo bỏ qua',
        order: 99,
        academicYear: '2026-2027',
        dataSource: 'demo', // Must be ignored
      },
      {
        id: 'top-math-old-year',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        name: 'Chủ đề năm cũ',
        order: 1,
        academicYear: '2025-2026', // Must be ignored
        dataSource: 'manual',
      },
      {
        id: 'top-tv1-mismatch',
        subjectId: 'subj-tv1', // Mismatch!
        gradeId: 'grade-4',
        name: 'Tiếng Việt 1 trên lớp 4',
        order: 1,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
    ],
    lessons: [
      {
        id: 'les-math-1',
        topicId: 'top-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        title: 'Bài 1: Ôn tập các số đến 100 000',
        order: 1,
        plannedPeriods: 2,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'les-orphan',
        topicId: 'top-non-existent', // Orphan lesson!
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        title: 'Bài học mồ côi',
        order: 2,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
    ],
    periods: [
      {
        id: 'per-math-1',
        lessonId: 'les-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        week: 1,
        semester: 1,
        title: 'Tiết 1: Ôn tập và đọc viết số',
        convertedPeriods: 1, // Valid
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'per-math-typo-periods',
        lessonId: 'les-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        week: 2,
        semester: 1,
        title: 'Tiết 2: Phép cộng có nhớ',
        convertedPeriods: 112, // BLOCKER: > 5
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'per-math-numeric-title',
        lessonId: 'les-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        week: 3,
        semester: 1,
        title: '2', // WARNING: Numeric title
        convertedPeriods: 1,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'per-math-duration-title',
        lessonId: 'les-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        week: 4,
        semester: 1,
        title: '2 tiết', // WARNING: Duration-only title
        convertedPeriods: 2,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'per-math-invalid-week',
        lessonId: 'les-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        week: 38, // WARNING: Week > 35
        semester: 2,
        title: 'Tiết ôn tập hè',
        convertedPeriods: 1,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'per-math-semester-mismatch',
        lessonId: 'les-math-1',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        week: 25,
        semester: 1, // WARNING: HK1 but week 25 (>18)
        title: 'Tiết lệch học kỳ',
        convertedPeriods: 1,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
      {
        id: 'per-orphan',
        lessonId: 'les-non-existent', // BLOCKER: Orphan period
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        week: 5,
        semester: 1,
        title: 'Tiết mồ côi',
        convertedPeriods: 1,
        academicYear: '2026-2027',
        dataSource: 'manual',
      },
    ],
    yccdIdeas: [
      {
        id: 'idea-math4-01',
        code: 'YCCD-T4-STN-01',
        subjectId: 'subj-toan4',
        gradeId: 'grade-4',
        originalText: 'Đọc, viết các số trong phạm vi 100 000.',
        verificationStatus: 'verified',
        linkedLessonIds: ['les-math-1'],
        linkedPeriodIds: ['per-math-1'],
      },
    ],
  };

  describe('extractAndFilterPpctHubData', () => {
    it('filters strictly Grade 4 and Year 2026-2027 and drops demo records', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');

      expect(parsed.grade).toBe(4);
      expect(parsed.academicYear).toBe('2026-2027');

      // Demo and 2025-2026 topics must be dropped
      const topicIds = parsed.topics.map((t) => t.id);
      expect(topicIds).toContain('top-math-1');
      expect(topicIds).toContain('top-tv1-mismatch'); // Still kept for discrepancy check!
      expect(topicIds).not.toContain('top-math-demo');
      expect(topicIds).not.toContain('top-math-old-year');
    });
  });

  describe('validatePpctDiscrepancies - 6 Validation Rules', () => {
    it('detects Rule 1: Grade/Subject mismatch (subj-tv1 on Grade 4) as BLOCKER', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const summary = validatePpctDiscrepancies(parsed);

      const mismatchIssue = summary.allIssues.find(
        (i) => i.category === 'GRADE_SUBJECT_MISMATCH' && i.subjectId === 'subj-tv1'
      );
      expect(mismatchIssue).toBeDefined();
      expect(mismatchIssue?.severity).toBe('BLOCKER');
    });

    it('detects Rule 2: convertedPeriods > 5 or <= 0 as BLOCKER', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const summary = validatePpctDiscrepancies(parsed);

      const invalidPeriod = summary.allIssues.find(
        (i) => i.category === 'INVALID_PERIODS_COUNT' && i.entityId === 'per-math-typo-periods'
      );
      expect(invalidPeriod).toBeDefined();
      expect(invalidPeriod?.severity).toBe('BLOCKER');
      expect(invalidPeriod?.details?.rawValue).toBe(112);
    });

    it('detects Rule 3: Numeric or duration-only title as WARNING', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const summary = validatePpctDiscrepancies(parsed);

      const numTitle = summary.allIssues.find(
        (i) => i.category === 'NUMERIC_OR_EMPTY_TITLE' && i.entityId === 'per-math-numeric-title'
      );
      expect(numTitle).toBeDefined();
      expect(numTitle?.severity).toBe('WARNING');

      const durTitle = summary.allIssues.find(
        (i) => i.category === 'NUMERIC_OR_EMPTY_TITLE' && i.entityId === 'per-math-duration-title'
      );
      expect(durTitle).toBeDefined();
      expect(durTitle?.severity).toBe('WARNING');
    });

    it('detects Rule 4: Total periods deviation from Ministry standard as BLOCKER', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const summary = validatePpctDiscrepancies(parsed);

      const devIssue = summary.allIssues.find(
        (i) => i.category === 'SUBJECT_TOTAL_PERIODS_DEVIATION' && i.subjectId === 'subj-toan4'
      );
      expect(devIssue).toBeDefined();
      expect(devIssue?.severity).toBe('BLOCKER');
      expect(devIssue?.details?.standardPeriods).toBe(175);
    });

    it('detects Rule 5: Orphan lesson and period as BLOCKER', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const summary = validatePpctDiscrepancies(parsed);

      const orphanLesson = summary.allIssues.find(
        (i) => i.category === 'ORPHAN_PERIOD_OR_LESSON' && i.entityId === 'les-orphan'
      );
      expect(orphanLesson).toBeDefined();
      expect(orphanLesson?.severity).toBe('BLOCKER');

      const orphanPeriod = summary.allIssues.find(
        (i) => i.category === 'ORPHAN_PERIOD_OR_LESSON' && i.entityId === 'per-orphan'
      );
      expect(orphanPeriod).toBeDefined();
      expect(orphanPeriod?.severity).toBe('BLOCKER');
    });

    it('detects Rule 6: Week outside 1-35 and semester-week mismatch as WARNING', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const summary = validatePpctDiscrepancies(parsed);

      const weekIssue = summary.allIssues.find(
        (i) => i.category === 'WEEK_OR_SEMESTER_OUT_OF_BOUNDS' && i.entityId === 'per-math-invalid-week'
      );
      expect(weekIssue).toBeDefined();
      expect(weekIssue?.severity).toBe('WARNING');

      const semIssue = summary.allIssues.find(
        (i) => i.category === 'WEEK_OR_SEMESTER_OUT_OF_BOUNDS' && i.entityId === 'per-math-semester-mismatch'
      );
      expect(semIssue).toBeDefined();
      expect(semIssue?.severity).toBe('WARNING');
    });

    it('blocks import for subject when blockers > 0', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const summary = validatePpctDiscrepancies(parsed);

      const toan4Result = summary.subjectsSummary['subj-toan4'];
      expect(toan4Result).toBeDefined();
      expect(toan4Result.blockersCount).toBeGreaterThan(0);
      expect(toan4Result.canImport).toBe(false);

      const tv1Result = summary.subjectsSummary['subj-tv1'];
      expect(tv1Result).toBeDefined();
      expect(tv1Result.blockersCount).toBeGreaterThan(0);
      expect(tv1Result.canImport).toBe(false);
    });
  });

  describe('prepareSubjectIngestionPayload', () => {
    it('never auto-promotes verified outcomes to OFFICIAL_RAW', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      // Pass OFFICIAL_RAW explicitly; adapter must safely downgrade to MATRIX_DERIVED or chosen safe type
      const payload = prepareSubjectIngestionPayload(parsed, 'subj-toan4', 'OFFICIAL_RAW');

      expect(payload).not.toBeNull();
      const outcome = payload!.outcomes[0];
      expect(outcome.isVerified).toBe(true); // preserved
      expect(outcome.provenanceType).toBe('MATRIX_DERIVED'); // safely downgraded
      expect(outcome.provenanceType).not.toBe('OFFICIAL_RAW');
    });

    it('preserves external_hub_id for idempotent re-import', () => {
      const parsed = extractAndFilterPpctHubData(sampleBackup, 4, '2026-2027');
      const payload = prepareSubjectIngestionPayload(parsed, 'subj-toan4', 'UNVERIFIED_PENDING');

      expect(payload!.source.externalHubId).toBe('hub-subj-toan4-4-2026-2027');
      expect(payload!.outcomes[0].externalHubId).toBe('idea-math4-01');
      expect(payload!.mappings[0].outcomeExternalHubId).toBe('idea-math4-01');
      expect(payload!.mappings[0].periodExternalId).toBe('per-math-1');
    });
  });

  describe('parseConvertedPeriods helper', () => {
    it('handles numbers and numeric strings', () => {
      expect(parseConvertedPeriods(2)).toBe(2);
      expect(parseConvertedPeriods('3')).toBe(3);
      expect(parseConvertedPeriods('  4  ')).toBe(4);
      expect(parseConvertedPeriods('invalid')).toBe(0);
      expect(parseConvertedPeriods(null)).toBe(0);
    });
  });
});
