/**
 * ThayKhaiEdu - Test Record & Exam Blueprint Models
 * Supports both QUICK mode and PROFESSIONAL mode workflows with Scope & Governance.
 */

import { PrimaryGrade, SemesterPeriod, AssessmentPeriod } from './curriculum';
import { MultimodalQuestion } from './question';
import { ExamWorkflowStatus, AuditLog, TestVersion } from './workflow';
import { DataScope } from './permissions';

export type ExamCreationMode =
  | 'MODE_A_NEW'          // Chế độ A: Tạo đề mới (chọn phạm vi YCCĐ/PPCT, ma trận, chọn câu hỏi, kiểm định)
  | 'MODE_B_FROM_BANK'    // Chế độ B: Dùng lại đề trong kho (tạo bản sao độc lập, không ghi đè đề gốc)
  | 'QUICK'               // Tương thích ngược: Tạo nhanh
  | 'PROFESSIONAL';       // Tương thích ngược: Chuyên nghiệp

export interface ExamHeaderConfig {
  schoolName: string;
  departmentName?: string;
  examTitle: string;        // e.g., 'ĐỀ KIỂM TRA ĐỊNH KỲ CUỐI HỌC KỲ I'
  subjectName: string;
  gradeLabel: string;       // e.g., 'Lớp 4' (formatted dynamically)
  academicYear: string;     // e.g., 'Năm học 2025 - 2026'
  durationMinutes: number;
  allowCalculators?: boolean;
  notes?: string;
}

export interface ExamValidationSummary {
  score: number; // 0-100 quality index score
  isValidated: boolean;
  warningsCount: number;
  errorsCount: number;
  lastValidatedAt?: string;
  rulesChecked?: {
    ruleId: string;
    ruleName: string;
    passed: boolean;
    details?: string;
  }[];
}

/**
 * Main TestRecord / Exam Entity
 */
export interface TestRecord {
  id: string;
  code: string; // e.g., 'EXAM-2026-MAT4-01'
  title: string;
  
  // Organization & Scope
  organizationId: string;
  tenantId?: string; // Compatibility alias
  academicYearId: string;
  academicYear: string; // Label (e.g. '2025-2026')
  grade: PrimaryGrade;
  gradeId?: number; // Alias
  subjectId: string;
  semester: SemesterPeriod;
  assessmentPeriod: AssessmentPeriod;
  scope: DataScope;
  
  // Creation Mode & Formatting
  mode: ExamCreationMode;
  headerConfig: ExamHeaderConfig;
  
  // Matrix & Questions Content
  matrixId?: string;
  questions: MultimodalQuestion[];
  totalPoints: number;
  durationMinutes: number;
  
  // Workflow & People Governance
  status: ExamWorkflowStatus;
  creatorId: string;
  creatorName: string;
  crossReviewerId?: string;
  crossReviewerName?: string;
  approverId?: string;
  approverName?: string;
  
  // Validation
  validationSummary?: ExamValidationSummary;
  
  // Audit, Versions & Timestamps
  currentVersion: number;
  versions: TestVersion[];
  auditLogs: AuditLog[];
  
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
}

// Backward compatibility alias for Exam
export type Exam = TestRecord;
