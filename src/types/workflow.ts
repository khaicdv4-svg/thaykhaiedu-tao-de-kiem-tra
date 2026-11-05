/**
 * ThayKhaiEdu - Exam Lifecycle Workflow & Governance Types
 * Defines statuses according to SPEC 9.2 state machine, role transitions, audit trails, and versioning.
 * State machine flow:
 * DRAFT -> READY -> SUBMITTED_LOCKED -> CROSS_REVIEW -> REVIEWED -> SHORTLISTED (Top 3) -> TEAM_REVIEW -> PRINCIPAL_REVIEW -> APPROVED -> PUBLISHED / ARCHIVED
 * Branches: RETURNED_FOR_REVISION, REJECTED, SUPERSEDED
 */

export type ExamWorkflowStatus =
  | 'DRAFT'                     // 1. Bản nháp (Đang soạn thảo)
  | 'READY'                     // 2. Sẵn sàng (Đã soạn xong, chuẩn bị nộp)
  | 'SUBMITTED_LOCKED'          // 3. Đã nộp & Khóa (Tạo snapshot bất biến)
  | 'CROSS_REVIEW'              // 4. Đang kiểm tra chéo
  | 'REVIEWED'                  // 5. Đã kiểm tra chéo (Có nhận xét)
  | 'SHORTLISTED'               // 6. Tổ trưởng chọn (1 trong 3 đề được chọn)
  | 'TEAM_REVIEW'               // 7. Góp ý tập thể tổ chuyên môn
  | 'PRINCIPAL_REVIEW'          // 8. Trình Ban giám hiệu phê duyệt
  | 'APPROVED'                  // 9. Ban giám hiệu đã phê duyệt
  | 'PUBLISHED'                 // 10. Đã xuất bản (Sẵn sàng in ấn và dùng chính thức)
  | 'ARCHIVED'                  // 11. Lưu trữ
  // Nhánh phụ:
  | 'RETURNED_FOR_REVISION'     // Yêu cầu chỉnh sửa lại
  | 'REJECTED'                  // Bị từ chối
  | 'SUPERSEDED';               // Đã có bản thay thế

export interface StatusBadgeConfig {
  label: string;
  variant: 'default' | 'secondary' | 'warning' | 'danger' | 'success' | 'info';
  description: string;
}

export const WORKFLOW_STATUS_CONFIG: Record<ExamWorkflowStatus, StatusBadgeConfig> = {
  DRAFT: {
    label: 'Bản nháp',
    variant: 'secondary',
    description: 'Đề kiểm tra đang được tạo hoặc chỉnh sửa bởi giáo viên.',
  },
  READY: {
    label: 'Sẵn sàng nộp',
    variant: 'info',
    description: 'Giáo viên đã soạn xong nội dung, sẵn sàng nộp và khóa bản đề.',
  },
  SUBMITTED_LOCKED: {
    label: 'Đã nộp & Khóa',
    variant: 'warning',
    description: 'Đã nộp, khóa phiên bản để phân công kiểm tra chéo.',
  },
  CROSS_REVIEW: {
    label: 'Đang kiểm tra chéo',
    variant: 'info',
    description: 'Đang được người kiểm tra chéo rà soát và ghi chú lỗi.',
  },
  REVIEWED: {
    label: 'Đã kiểm tra chéo',
    variant: 'info',
    description: 'Đã hoàn thành kiểm tra chéo, chờ Tổ trưởng xem xét.',
  },
  SHORTLISTED: {
    label: 'Được chọn (Top 3)',
    variant: 'success',
    description: 'Được Tổ trưởng chuyên môn chọn vào danh sách 3 đề xem xét chung.',
  },
  TEAM_REVIEW: {
    label: 'Góp ý tập thể',
    variant: 'warning',
    description: 'Đang mở cho tập thể tổ chuyên môn đóng góp ý kiến hoàn thiện.',
  },
  PRINCIPAL_REVIEW: {
    label: 'Chờ BGH duyệt',
    variant: 'warning',
    description: 'Tổ trưởng đã tổng hợp và trình Ban Giám Hiệu phê duyệt chính thức.',
  },
  APPROVED: {
    label: 'BGH đã phê duyệt',
    variant: 'success',
    description: 'Ban Giám Hiệu đã phê duyệt chính thức làm đề kiểm tra.',
  },
  PUBLISHED: {
    label: 'Đã xuất bản',
    variant: 'success',
    description: 'Đã hoàn tất định dạng in ấn và sẵn sàng tổ chức kiểm tra.',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    variant: 'default',
    description: 'Đề kiểm tra đã hoàn thành đợt thi và được đưa vào kho lưu trữ.',
  },
  RETURNED_FOR_REVISION: {
    label: 'Yêu cầu sửa lại',
    variant: 'warning',
    description: 'Cần chỉnh sửa lại theo góp ý của người kiểm tra chéo hoặc cấp trên.',
  },
  REJECTED: {
    label: 'Bị từ chối',
    variant: 'danger',
    description: 'Đề không đạt yêu cầu chuyên môn và không được lựa chọn.',
  },
  SUPERSEDED: {
    label: 'Đã thay thế',
    variant: 'default',
    description: 'Đã có phiên bản đề mới hơn thay thế cho đề này.',
  },
};

/**
 * Valid state transitions table as specified in SPEC 9.2
 */
export const VALID_WORKFLOW_TRANSITIONS: Record<ExamWorkflowStatus, ExamWorkflowStatus[]> = {
  DRAFT: ['READY'],
  READY: ['DRAFT', 'SUBMITTED_LOCKED'],
  SUBMITTED_LOCKED: ['CROSS_REVIEW', 'RETURNED_FOR_REVISION'],
  CROSS_REVIEW: ['REVIEWED', 'RETURNED_FOR_REVISION'],
  REVIEWED: ['SHORTLISTED', 'RETURNED_FOR_REVISION', 'REJECTED'],
  SHORTLISTED: ['TEAM_REVIEW', 'REJECTED'],
  TEAM_REVIEW: ['PRINCIPAL_REVIEW', 'RETURNED_FOR_REVISION'],
  PRINCIPAL_REVIEW: ['APPROVED', 'RETURNED_FOR_REVISION', 'REJECTED'],
  APPROVED: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED', 'SUPERSEDED'],
  RETURNED_FOR_REVISION: ['DRAFT', 'READY'],
  REJECTED: ['ARCHIVED'],
  ARCHIVED: ['SUPERSEDED'],
  SUPERSEDED: [],
};

/**
 * Validates whether a transition from one status to another is permitted by the state machine
 */
export function canTransitionWorkflow(
  from: ExamWorkflowStatus,
  to: ExamWorkflowStatus
): boolean {
  const allowed = VALID_WORKFLOW_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE_CONTENT'
  | 'MARK_READY'
  | 'SUBMIT_AND_LOCK'
  | 'ASSIGN_CROSS_REVIEW'
  | 'START_CROSS_REVIEW'
  | 'FINISH_CROSS_REVIEW'
  | 'SHORTLIST'
  | 'START_TEAM_REVIEW'
  | 'SUBMIT_PRINCIPAL_REVIEW'
  | 'REQUEST_REVISION'
  | 'REVISE'
  | 'APPROVE'
  | 'REJECT'
  | 'PUBLISH'
  | 'ARCHIVE'
  | 'SUPERSEDE'
  | 'EXPORT_DOCX'
  | 'EXPORT_PDF';

export type EntityType =
  | 'TEST'
  | 'QUESTION'
  | 'RESOURCE'
  | 'TEMPLATE'
  | 'ORGANIZATION'
  | 'USER'
  | 'PROFESSIONAL_GROUP';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditActionType;
  entityType: EntityType;
  entityId: string;
  fromStatus?: ExamWorkflowStatus;
  toStatus?: ExamWorkflowStatus;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TestVersion {
  id: string;
  testId: string;
  versionNumber: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  changeSummary: string;
  snapshotUrl?: string;
  snapshotData?: Record<string, unknown>;
}

// Backward compatibility aliases
export type AuditLogItem = AuditLog;
export type ExamVersionHistory = TestVersion;
