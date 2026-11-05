/**
 * ThayKhaiEdu - Resource & Shared Reading Passage Data Models
 * Prepared for SGK, SGV, Reading Passages, Visual Assets, Reference Matrices, and Shared Resources.
 */

import { PrimaryGrade } from './curriculum';
import { DataScope } from './permissions';

export type ResourceType =
  | 'TEXTBOOK'          // Sách giáo khoa
  | 'TEACHER_GUIDE'     // Sách giáo viên
  | 'READING_PASSAGE'   // Ngữ liệu văn bản đọc hiểu
  | 'VISUAL_ASSET'      // Hình ảnh / Sơ đồ / Ngữ liệu trực quan
  | 'REFERENCE_MATRIX'  // Ma trận tham khảo
  | 'TEMPLATE_DOC'      // Mẫu tài liệu
  | 'OTHER_SOURCE';     // Nguồn tài liệu khác

export type ResourceSourceType =
  | 'OFFICIAL_CURRICULUM' // Chương trình / SGK chính thức
  | 'USER_SUBMITTED'      // Người dùng tự tải lên / biên soạn
  | 'AI_FOUND'            // Văn bản do AI tìm (có nguồn thực tế, không tự sáng tác)
  | 'IMPORTED';           // Nhập từ ngân hàng bên ngoài

export type ResourceReviewStatus =
  | 'DRAFT'           // Bản nháp
  | 'PENDING_REVIEW'  // Chờ giáo viên/Tổ trưởng duyệt
  | 'APPROVED'        // Đã duyệt (Sẵn sàng đưa vào kho dùng chung)
  | 'REJECTED';       // Từ chối chia sẻ

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  description?: string;
  contentUrl?: string;
  rawText?: string;
  ownerId: string;
  ownerName?: string;
  organizationId: string;
  gradeIds: PrimaryGrade[];
  subjectIds: string[];
  scope: DataScope;
  sourceType: ResourceSourceType;
  sourceReference?: string; // Tên tác giả / Tác phẩm / Nguồn gốc SGK
  sourceUrl?: string;       // Đường dẫn nguồn trực tuyến nếu có
  author?: string;          // Tên tác giả
  topic?: string;           // Chủ đề bài học
  genre?: string;           // Thể loại (Thơ, Truyện ngắn...)
  length?: number;          // Số từ / Độ dài
  reviewStatus: ResourceReviewStatus;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reading Passage Repository Entity (Kho văn bản đọc hiểu)
 * Supports user contribution, AI discovery (Văn bản do AI tìm), approval gating, and deduplication checks.
 */
export interface ReadingPassageResource extends Resource {
  type: 'READING_PASSAGE';
  passageSourceCategory: 'USER_ADDED' | 'AI_FOUND';
  genre?: string; // e.g. Truyện ngắn, Thơ, Văn miêu tả, Văn bản thông tin
  wordCount?: number;
  contentHash?: string; // Hash signature for deduplication check
  isApprovedForSharedLibrary: boolean;
  aiSearchQueryContext?: string; // Stored search prompt/context when passage is AI_FOUND
}
