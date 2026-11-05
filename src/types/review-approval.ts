/**
 * ThayKhaiEdu - Cross-Review & Approval Governance Models
 * Defines review assignments, inline question/test comments, approval records, and validation rules.
 */

export type CrossReviewStatus =
  | 'ASSIGNED'      // Đã phân công
  | 'IN_PROGRESS'   // Đang kiểm tra chéo
  | 'COMPLETED'     // Đã hoàn thành kiểm tra chéo
  | 'REJECTED';     // Yêu cầu sửa lại

export interface ReviewComment {
  id: string;
  crossReviewId: string;
  testId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  questionId?: string; // Optional: Null means comment on whole test; String means comment on specific questionId
  content: string;
  createdAt: string;
}

export interface CrossReview {
  id: string;
  testId: string;
  reviewerId: string;
  reviewerName: string;
  assignedByUserId: string;
  status: CrossReviewStatus;
  comments: ReviewComment[];
  startedAt: string;
  completedAt?: string;
}

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';

export interface ApprovalRecord {
  id: string;
  testId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: ApprovalDecision;
  comment: string;
  timestamp: string;
}

/**
 * Business Rule Validation: Creator cannot cross-review their own test
 */
export function validateCrossReviewAssignment(
  creatorId: string,
  candidateReviewerId: string
): { isValid: boolean; error?: string } {
  if (creatorId === candidateReviewerId) {
    return {
      isValid: false,
      error: 'Người tạo đề không được tự kiểm tra chéo đề kiểm tra của chính mình.',
    };
  }
  return { isValid: true };
}
