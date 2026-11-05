/**
 * ThayKhaiEdu - Matrix & Specification Validation Engine
 * Validates primary exam matrices based on 3 cognitive levels: LEVEL_1, LEVEL_2, LEVEL_3.
 * Enforces total score = 10.0, non-empty fields, and valid question distribution.
 */

import { CognitiveLevel, MatrixSpecificationItem, ExamMatrix } from '@/types/curriculum';

export interface MatrixValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalCalculatedPoints: number;
  totalQuestions: number;
  distributionByLevel: Record<CognitiveLevel, { questions: number; points: number }>;
}

export function validateExamMatrix(
  matrix: Partial<ExamMatrix>,
  expectedTotalPoints: number = 10.0
): MatrixValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const items = matrix.items || [];
  if (items.length === 0) {
    return {
      isValid: false,
      errors: ['Ma trận đề kiểm tra chưa có dòng đặc tả nào.'],
      warnings: [],
      totalCalculatedPoints: 0,
      totalQuestions: 0,
      distributionByLevel: {
        LEVEL_1: { questions: 0, points: 0 },
        LEVEL_2: { questions: 0, points: 0 },
        LEVEL_3: { questions: 0, points: 0 },
      },
    };
  }

  let totalCalculatedPoints = 0;
  let totalQuestions = 0;
  const distributionByLevel: Record<CognitiveLevel, { questions: number; points: number }> = {
    LEVEL_1: { questions: 0, points: 0 },
    LEVEL_2: { questions: 0, points: 0 },
    LEVEL_3: { questions: 0, points: 0 },
  };

  const allowedLevels: CognitiveLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

  items.forEach((item, index) => {
    const rowNum = index + 1;

    // Check cognitive level validity (Only 3 levels: LEVEL_1, LEVEL_2, LEVEL_3)
    if (!allowedLevels.includes(item.cognitiveLevel)) {
      errors.push(`Dòng ${rowNum}: Mức độ nhận thức không hợp lệ. Chỉ chấp nhận Mức 1, Mức 2, Mức 3.`);
    }

    // Check topic & YCCĐ
    if (!item.topicName || item.topicName.trim() === '') {
      errors.push(`Dòng ${rowNum}: Mạch kiến thức / Chủ đề không được để trống.`);
    }
    if (!item.yccdId || item.yccdId.trim() === '') {
      errors.push(`Dòng ${rowNum}: Yêu cầu cần đạt (YCCĐ) không được để trống.`);
    }

    // Check question count
    if (!item.questionCount || item.questionCount <= 0 || !Number.isInteger(item.questionCount)) {
      errors.push(`Dòng ${rowNum}: Số lượng câu hỏi phải là số nguyên dương lớn hơn 0.`);
    }

    // Check points per question
    if (item.pointsPerQuestion === undefined || item.pointsPerQuestion <= 0) {
      errors.push(`Dòng ${rowNum}: Điểm cho mỗi câu hỏi phải lớn hơn 0.`);
    } else {
      // Step check: Points should typically be multiples of 0.25 or 0.5
      if ((item.pointsPerQuestion * 100) % 25 !== 0) {
        warnings.push(`Dòng ${rowNum}: Điểm cho mỗi câu (${item.pointsPerQuestion}đ) không theo bước chia 0,25đ hoặc 0,5đ thông dụng.`);
      }
    }

    const rowPoints = (item.questionCount || 0) * (item.pointsPerQuestion || 0);
    totalCalculatedPoints += rowPoints;
    totalQuestions += item.questionCount || 0;

    if (allowedLevels.includes(item.cognitiveLevel)) {
      distributionByLevel[item.cognitiveLevel].questions += item.questionCount || 0;
      distributionByLevel[item.cognitiveLevel].points += rowPoints;
    }
  });

  // Check total points against target
  // Use precision rounding to avoid floating point comparison issues (e.g. 9.9999999)
  const roundedCalculatedPoints = Math.round(totalCalculatedPoints * 100) / 100;
  if (Math.abs(roundedCalculatedPoints - expectedTotalPoints) > 0.01) {
    errors.push(`Tổng điểm của ma trận (${roundedCalculatedPoints}đ) không khớp với thang điểm yêu cầu (${expectedTotalPoints}đ).`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalCalculatedPoints: roundedCalculatedPoints,
    totalQuestions,
    distributionByLevel,
  };
}
