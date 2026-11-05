import { describe, it, expect } from 'vitest';
import { validateExamMatrix } from '../src/core/validation/matrix-validator';
import { MatrixSpecificationItem } from '../src/types/curriculum';

describe('Primary Exam Matrix Validation (3 Cognitive Levels)', () => {
  const validSampleItems: MatrixSpecificationItem[] = [
    {
      id: 'row-1',
      matrixId: 'mat-01',
      yccdId: 'YCCD-T4-01',
      topicName: 'Số và phép tính',
      cognitiveLevel: 'LEVEL_1', // Mức 1
      questionType: 'MULTIPLE_CHOICE',
      questionCount: 4,
      pointsPerQuestion: 0.5,
      totalPoints: 2.0,
      percentageWeight: 20,
    },
    {
      id: 'row-2',
      matrixId: 'mat-01',
      yccdId: 'YCCD-T4-02',
      topicName: 'Số và phép tính',
      cognitiveLevel: 'LEVEL_2', // Mức 2
      questionType: 'SHORT_ANSWER',
      questionCount: 4,
      pointsPerQuestion: 1.0,
      totalPoints: 4.0,
      percentageWeight: 40,
    },
    {
      id: 'row-3',
      matrixId: 'mat-01',
      yccdId: 'YCCD-T4-03',
      topicName: 'Hình học và Đo lường',
      cognitiveLevel: 'LEVEL_2', // Mức 2
      questionType: 'ESSAY',
      questionCount: 2,
      pointsPerQuestion: 1.0,
      totalPoints: 2.0,
      percentageWeight: 20,
    },
    {
      id: 'row-4',
      matrixId: 'mat-01',
      yccdId: 'YCCD-T4-04',
      topicName: 'Giải toán có lời văn',
      cognitiveLevel: 'LEVEL_3', // Mức 3
      questionType: 'ESSAY',
      questionCount: 1,
      pointsPerQuestion: 2.0,
      totalPoints: 2.0,
      percentageWeight: 20,
    },
  ];

  it('validates a properly structured 10-point matrix with 3 levels', () => {
    const result = validateExamMatrix({ items: validSampleItems }, 10.0);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.totalCalculatedPoints).toBe(10.0);
    expect(result.totalQuestions).toBe(11);
    expect(result.distributionByLevel.LEVEL_1.points).toBe(2.0);
    expect(result.distributionByLevel.LEVEL_2.points).toBe(6.0);
    expect(result.distributionByLevel.LEVEL_3.points).toBe(2.0);
  });

  it('blocks a matrix if total points do not sum up to 10.0', () => {
    // Only 8 points total
    const incompleteItems = validSampleItems.slice(0, 3);
    const result = validateExamMatrix({ items: incompleteItems }, 10.0);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('không khớp với thang điểm yêu cầu'))).toBe(true);
  });

  it('blocks invalid cognitive levels (strictly enforces LEVEL_1, LEVEL_2, LEVEL_3)', () => {
    const invalidLevelItems = [
      ...validSampleItems.slice(0, 3),
      {
        ...validSampleItems[3],
        cognitiveLevel: 'LEVEL_4' as any, // 4th level is prohibited
      },
    ];
    const result = validateExamMatrix({ items: invalidLevelItems }, 10.0);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Chỉ chấp nhận Mức 1, Mức 2, Mức 3'))).toBe(true);
  });

  it('blocks rows with empty topic or empty YCCĐ', () => {
    const emptyTopicItems = [
      {
        ...validSampleItems[0],
        topicName: '   ',
      },
      ...validSampleItems.slice(1),
    ];
    const result = validateExamMatrix({ items: emptyTopicItems }, 10.0);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Mạch kiến thức / Chủ đề không được để trống'))).toBe(true);
  });

  it('blocks matrix with no items', () => {
    const result = validateExamMatrix({ items: [] }, 10.0);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('chưa có dòng đặc tả nào'))).toBe(true);
  });
});
