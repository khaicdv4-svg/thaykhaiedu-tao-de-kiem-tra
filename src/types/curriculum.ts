/**
 * ThayKhaiEdu - Curriculum & Assessment Models
 * Grade 1-5 Primary Education Standards and Matrix Specifications
 */

export type PrimaryGrade = 1 | 2 | 3 | 4 | 5;

export interface SubjectConfig {
  id: string;
  code: string;
  name: string;
  description?: string;
  applicableGrades: PrimaryGrade[];
  hasPeriodicAssessment: boolean;
  isActive: boolean;
}

export type SemesterPeriod = 'SEMESTER_1' | 'SEMESTER_2';

export type AssessmentPeriod =
  | 'MID_TERM_1'  // Giữa kỳ 1
  | 'END_TERM_1'  // Cuối kỳ 1
  | 'MID_TERM_2'  // Giữa kỳ 2
  | 'END_TERM_2'; // Cuối kỳ 2

export interface AcademicYearConfig {
  id: string;
  code: string; // e.g., '2025-2026'
  label: string; // e.g., 'Năm học 2025 - 2026'
  isCurrent: boolean;
}

/**
 * Mức độ nhận thức trong đánh giá định kỳ Tiểu học theo Thông tư 27/2020/TT-BGDĐT
 * Chỉ có 3 mức: Mức 1, Mức 2, Mức 3.
 */
export type CognitiveLevel =
  | 'LEVEL_1'  // Mức 1: Nhận biết, nhắc lại hoặc mô tả được nội dung đã học
  | 'LEVEL_2'  // Mức 2: Thông hiểu, kết nối, sắp xếp được một số nội dung đã học
  | 'LEVEL_3'; // Mức 3: Vận dụng được các nội dung đã học để giải quyết vấn đề mới

export const COGNITIVE_LEVEL_CONFIG: Record<CognitiveLevel, { label: string; description: string }> = {
  LEVEL_1: {
    label: 'Mức 1',
    description: 'Nhận biết, nhắc lại hoặc mô tả được nội dung đã học và áp dụng trực tiếp để giải quyết một số tình huống quen thuộc.',
  },
  LEVEL_2: {
    label: 'Mức 2',
    description: 'Thông hiểu, kết nối, sắp xếp được một số nội dung đã học để giải quyết vấn đề có nội dung tương tự.',
  },
  LEVEL_3: {
    label: 'Mức 3',
    description: 'Vận dụng các nội dung đã học để giải quyết vấn đề mới hoặc đưa ra những phản hồi hợp lý trong học tập và cuộc sống.',
  },
};

/**
 * Yêu cầu cần đạt (YCCĐ) - Knowledge/Competency Requirement from Curriculum
 */
export interface YCCDRequirement {
  id: string;
  subjectId: string;
  grade: PrimaryGrade;
  topicOrDomain: string; // Mạch kiến thức / Chủ đề
  code: string; // Mã YCCĐ (e.g. YCCD-T4-01)
  description: string;
  cognitiveLevelDefault?: CognitiveLevel;
  sourceDocumentId?: string;
}

/**
 * Ma trận đề kiểm tra (Exam Matrix Item)
 */
export interface MatrixSpecificationItem {
  id: string;
  matrixId: string;
  yccdId: string;
  topicName: string;
  cognitiveLevel: CognitiveLevel;
  questionType: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY' | 'MATCHING' | 'TRUE_FALSE';
  questionCount: number;
  pointsPerQuestion: number;
  totalPoints: number;
  percentageWeight: number;
}

export interface ExamMatrix {
  id: string;
  title: string;
  subjectId: string;
  grade: PrimaryGrade;
  semester: SemesterPeriod;
  assessmentPeriod: AssessmentPeriod;
  durationMinutes: number;
  totalPoints: number;
  items: MatrixSpecificationItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
