/**
 * ThayKhaiEdu - Global Dynamic Configuration
 * Centralized dynamic configuration to avoid hardcoding grades, subjects, semesters, or school details.
 */

import { SubjectConfig, AcademicYearConfig, PrimaryGrade } from '@/types/curriculum';

export interface AppConfig {
  productName: string;
  brandName: string;
  tagline: string;
  supportedGrades: PrimaryGrade[];
  defaultAcademicYears: AcademicYearConfig[];
  availableSubjects: SubjectConfig[];
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  productName: 'Tạo đề kiểm tra AI',
  brandName: 'ThayKhaiEdu',
  tagline: 'Nền tảng kiểm định và khởi tạo đề kiểm tra chuẩn hóa dành cho Giáo viên Tiểu học',
  supportedGrades: [1, 2, 3, 4, 5],
  defaultAcademicYears: [
    { id: 'ay-2025-2026', code: '2025-2026', label: 'Năm học 2025 - 2026', isCurrent: true },
    { id: 'ay-2024-2025', code: '2024-2025', label: 'Năm học 2024 - 2025', isCurrent: false },
  ],
  availableSubjects: [
    {
      id: 'sub-math',
      code: 'TOAN',
      name: 'Toán',
      description: 'Môn Toán khối Tiểu học',
      applicableGrades: [1, 2, 3, 4, 5],
      hasPeriodicAssessment: true,
      isActive: true,
    },
    {
      id: 'sub-vietnamese',
      code: 'TIENG_VIET',
      name: 'Tiếng Việt',
      description: 'Môn Tiếng Việt khối Tiểu học',
      applicableGrades: [1, 2, 3, 4, 5],
      hasPeriodicAssessment: true,
      isActive: true,
    },
    {
      id: 'sub-english',
      code: 'TIENG_ANH',
      name: 'Tiếng Anh',
      description: 'Môn Tiếng Anh tiểu học',
      applicableGrades: [3, 4, 5],
      hasPeriodicAssessment: true,
      isActive: true,
    },
    {
      id: 'sub-science',
      code: 'KHOA_HOC',
      name: 'Khoa học',
      description: 'Môn Khoa học khối 4-5',
      applicableGrades: [4, 5],
      hasPeriodicAssessment: true,
      isActive: true,
    },
    {
      id: 'sub-history-geo',
      code: 'LS_DL',
      name: 'Lịch sử & Địa lý',
      description: 'Môn Lịch sử và Địa lý khối 4-5',
      applicableGrades: [4, 5],
      hasPeriodicAssessment: true,
      isActive: true,
    },
    {
      id: 'sub-tech',
      code: 'CONG_NGHE',
      name: 'Công nghệ',
      description: 'Môn Công nghệ tiểu học',
      applicableGrades: [3, 4, 5],
      hasPeriodicAssessment: true,
      isActive: true,
    },
    {
      id: 'sub-informatics',
      code: 'TIN_HOC',
      name: 'Tin học',
      description: 'Môn Tin học tiểu học',
      applicableGrades: [3, 4, 5],
      hasPeriodicAssessment: true,
      isActive: true,
    },
  ],
};

/**
 * Format Grade Label cleanly e.g. Grade 4 -> "Lớp 4"
 */
export function formatGradeLabel(grade: PrimaryGrade): string {
  return `Lớp ${grade}`;
}

/**
 * Format Assessment Period Label
 */
export function formatAssessmentPeriodLabel(period: string): string {
  switch (period) {
    case 'MID_TERM_1':
      return 'Giữa kỳ I';
    case 'END_TERM_1':
      return 'Cuối kỳ I';
    case 'MID_TERM_2':
      return 'Giữa kỳ II';
    case 'END_TERM_2':
      return 'Cuối kỳ II';
    default:
      return period;
  }
}
