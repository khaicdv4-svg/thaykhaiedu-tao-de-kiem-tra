/**
 * ThayKhaiEdu - Phase 2 Curriculum Sources, Outcomes, Documents and Adapter Types
 * Master Project Specification V1.0 (Sections 3, 11.2, 15)
 */

export type PrimaryGrade = 1 | 2 | 3 | 4 | 5;

/**
 * 5 cấp độ nguồn gốc chuyên môn (Provenance Type)
 * Nghiêm cấm tự động suy diễn nâng cấp lên OFFICIAL_RAW
 */
export type ProvenanceType =
  | 'OFFICIAL_RAW'             // YCCĐ nguyên văn Bộ GD&ĐT ban hành
  | 'MATRIX_DERIVED'           // Diễn giải từ ma trận/đặc tả đề
  | 'TEACHER_GUIDE_OBJECTIVE'  // Mục tiêu bài học từ Sách giáo viên (SGV)
  | 'ALGORITHM_EXTRACTED'      // Thuật toán bóc tách tự động
  | 'UNVERIFIED_PENDING';      // Chưa đối chiếu văn bản gốc (cần kiểm tra)

export interface ProvenanceTypeConfig {
  code: ProvenanceType;
  label: string;
  shortLabel: string;
  badgeClass: string;
  bgLightClass: string;
  borderClass: string;
  textClass: string;
  description: string;
  requiresReview: boolean;
}

export const PROVENANCE_TYPE_MAP: Record<ProvenanceType, ProvenanceTypeConfig> = {
  OFFICIAL_RAW: {
    code: 'OFFICIAL_RAW',
    label: 'YCCĐ nguyên văn (Bộ GD&ĐT)',
    shortLabel: 'Nguyên văn Bộ',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
    bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    description: 'Trích xuất trực tiếp nguyên văn từ Chương trình GDPT 2018 (Thông tư 32/2018/TT-BGDĐT).',
    requiresReview: false,
  },
  MATRIX_DERIVED: {
    code: 'MATRIX_DERIVED',
    label: 'Diễn giải từ ma trận đề',
    shortLabel: 'Từ ma trận',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
    bgLightClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-300 dark:border-blue-800',
    textClass: 'text-blue-700 dark:text-blue-400',
    description: 'Nội dung YCCĐ được cô đọng/diễn giải từ khung ma trận đề kiểm tra của nhà trường/tổ khối.',
    requiresReview: false,
  },
  TEACHER_GUIDE_OBJECTIVE: {
    code: 'TEACHER_GUIDE_OBJECTIVE',
    label: 'Mục tiêu SGV',
    shortLabel: 'Mục tiêu SGV',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700',
    bgLightClass: 'bg-purple-50 dark:bg-purple-950/30',
    borderClass: 'border-purple-300 dark:border-purple-800',
    textClass: 'text-purple-700 dark:text-purple-400',
    description: 'Mục tiêu kiến thức, năng lực lấy từ Sách giáo viên (SGV) Kết nối tri thức.',
    requiresReview: true,
  },
  ALGORITHM_EXTRACTED: {
    code: 'ALGORITHM_EXTRACTED',
    label: 'Thuật toán tách tự động',
    shortLabel: 'Tách tự động',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
    bgLightClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-300 dark:border-amber-800',
    textClass: 'text-amber-700 dark:text-amber-400',
    description: 'Nội dung bóc tách tự động từ file Word/Excel/JSON; cần giáo viên đối soát lại.',
    requiresReview: true,
  },
  UNVERIFIED_PENDING: {
    code: 'UNVERIFIED_PENDING',
    label: 'Chưa đủ căn cứ đối chiếu',
    shortLabel: 'Chưa đối chiếu',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
    bgLightClass: 'bg-rose-50 dark:bg-rose-950/30',
    borderClass: 'border-rose-300 dark:border-rose-800',
    textClass: 'text-rose-700 dark:text-rose-400',
    description: 'Tài liệu nhập chưa rõ nguồn gốc hoặc thiếu số trang, quyết định ban hành cụ thể.',
    requiresReview: true,
  },
};

export type CurriculumSourceType =
  | 'PPCT_HUB_JSON'
  | 'DOCX_IMPORT'
  | 'XLSX_IMPORT'
  | 'MANUAL_ENTRY'
  | 'MINISTRY_OFFICIAL';

export interface CurriculumSource {
  id: string;
  organizationId: string;
  code?: string;
  name: string;
  subjectId?: string;
  grade: PrimaryGrade;
  bookEdition: string;
  academicYear: string; // Default: '2026-2027'
  publisher: string;
  sourceType: CurriculumSourceType;
  externalHubId?: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  totalLessons: number;
  totalPeriods: number;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceDocument {
  id: string;
  sourceId: string;
  organizationId: string;
  fileName: string;
  fileType: 'json' | 'docx' | 'xlsx' | 'pdf_scanned' | 'pdf_text' | 'manual_paste';
  fileSizeBytes?: number;
  storagePath?: string;
  rawContentPreview?: string;
  isScannedPdf: boolean;
  ocrNeeded: boolean;
  metadata?: Record<string, unknown>;
  uploadedBy?: string;
  createdAt: string;
}

export interface CurriculumOutcome {
  id: string;
  sourceId: string;
  organizationId: string;
  code: string;
  subjectId: string;
  grade: PrimaryGrade;
  strandName?: string;
  groupName?: string;
  topicName?: string;
  content: string;
  originalText?: string;
  orderIndex: number;
  provenanceType: ProvenanceType;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  externalHubId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumMapping {
  id: string;
  organizationId: string;
  outcomeId: string;
  lessonExternalId?: string;
  lessonTitle?: string;
  periodExternalId?: string;
  periodTitle?: string;
  periodNumber?: number;
  week?: number;
  semester?: number;
  term?: number;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// PPCT HUB JSON Backup Format (Schema 2.0)
// ------------------------------------------------------------------------------
export interface PpctHubTopic {
  id: string;
  subjectId: string;
  gradeId: string;
  name: string;
  order: number;
  academicYear: string;
  dataSource: 'demo' | 'import_docx' | 'import_sheet' | 'manual' | 'migration' | string;
}

export interface PpctHubLesson {
  id: string;
  topicId: string;
  subjectId?: string;
  gradeId?: string;
  code?: string;
  title: string;
  name?: string; // fallback
  order: number;
  plannedPeriods?: number;
  totalPeriods?: number;
  term?: number;
  startWeek?: number;
  notes?: string;
  yccdIds?: string[];
  academicYear?: string;
  dataSource?: string;
}

export interface PpctHubPeriod {
  id: string;
  lessonId: string;
  subjectId?: string;
  gradeId?: string;
  week?: number;
  semester?: number;
  orderInLesson?: number;
  globalPeriodNumber?: number;
  periodNumber?: number;
  title: string;
  periodType?: string;
  convertedPeriods: number | string;
  notes?: string;
  yccdIds?: string[];
  academicYear?: string;
  dataSource?: string;
  status?: string;
}

export interface PpctHubStrand {
  id: string;
  subjectId: string;
  gradeId: string;
  code: string;
  name: string;
  order: number;
}

export interface PpctHubGroup {
  id: string;
  strandId: string;
  subjectId: string;
  gradeId: string;
  code: string;
  name: string;
  order: number;
}

export interface PpctHubYccdIdea {
  id: string;
  code: string;
  strandId?: string;
  groupId?: string;
  subjectId: string;
  gradeId: string;
  originalText?: string;
  itemText?: string;
  content?: string; // fallback
  category?: string;
  order?: number;
  sourceDocument?: string;
  sourcePageOrSection?: string;
  sourceVersion?: string;
  verificationStatus?: 'verified' | 'unverified' | string;
  notes?: string;
  linkedLessonIds?: string[];
  linkedPeriodIds?: string[];
}

export interface PpctHubAcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
  isArchived: boolean;
  isLegacy: boolean;
  createdAt: string;
}

export interface PpctHubBackupFile {
  app?: string;
  version?: string;
  schemaVersion?: string;
  exportedAt?: string;
  academicYears?: PpctHubAcademicYear[];
  activeAcademicYear?: string;
  topics?: PpctHubTopic[];
  lessons?: PpctHubLesson[];
  periods?: PpctHubPeriod[];
  strands?: PpctHubStrand[];
  groups?: PpctHubGroup[];
  yccdIdeas?: PpctHubYccdIdea[];
  learningOutcomes?: PpctHubYccdIdea[]; // alias for compatibility
  periodSelections?: unknown[];
  historyLogs?: unknown[];
}

// ------------------------------------------------------------------------------
// Discrepancy & Validation Engine
// ------------------------------------------------------------------------------
export type DiscrepancySeverity = 'BLOCKER' | 'WARNING' | 'INFO';

export type DiscrepancyCategory =
  | 'GRADE_SUBJECT_MISMATCH'
  | 'INVALID_PERIODS_COUNT'
  | 'NUMERIC_OR_EMPTY_TITLE'
  | 'SUBJECT_TOTAL_PERIODS_DEVIATION'
  | 'ORPHAN_PERIOD_OR_LESSON'
  | 'WEEK_OR_SEMESTER_OUT_OF_BOUNDS';

export interface DiscrepancyItem {
  id: string;
  subjectId: string;
  subjectName: string;
  severity: DiscrepancySeverity;
  category: DiscrepancyCategory;
  title: string;
  description: string;
  details?: Record<string, unknown>;
  entityType: 'topic' | 'lesson' | 'period' | 'outcome';
  entityId: string;
}

export interface SubjectValidationResult {
  subjectId: string;
  subjectName: string;
  grade: number;
  standardPeriods: number;
  actualPeriods: number;
  totalTopics: number;
  totalLessons: number;
  totalPeriods: number;
  totalOutcomes: number;
  blockersCount: number;
  warningsCount: number;
  canImport: boolean; // True if blockersCount === 0
  issues: DiscrepancyItem[];
}

export interface ValidationSummary {
  targetGrade: number;
  targetAcademicYear: string;
  totalBlockers: number;
  totalWarnings: number;
  totalInfos: number;
  subjectsSummary: Record<string, SubjectValidationResult>;
  allIssues: DiscrepancyItem[];
}
