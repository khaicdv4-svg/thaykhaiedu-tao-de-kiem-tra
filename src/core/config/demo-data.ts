/**
 * ============================================================================
 * THAYKHAIEDU - CENTRALIZED DEMO / PLACEHOLDER CONFIGURATION DATA
 * NOTE: This file acts as a single source of truth for mock/demo data.
 * All UI components reference this centralized file instead of scattering mock data.
 * ============================================================================
 */

import { Organization, AcademicYear, ProfessionalGroup, AppUser } from '@/types/organization';
import { TestRecord } from '@/types/exam';
import { Resource } from '@/types/resource';
import { ExamTemplate, DEFAULT_GROUP_4_TEMPLATE } from '@/types/template';

// ----------------------------------------------------------------------------
// 1. DEMO ORGANIZATION (TRƯỜNG HỌC)
// ----------------------------------------------------------------------------
export const DEMO_ORGANIZATION: Organization = {
  id: 'org-th-chuan-01',
  code: 'TH-CHUAN-01',
  name: 'Trường Tiểu học Chuẩn Quốc gia',
  province: 'Thành phố Hà Nội',
  district: 'Quận Cầu Giấy',
  address: 'Số 10, Phố Giáo Dục, Quận Cầu Giấy',
  activeGrades: [1, 2, 3, 4, 5],
  createdAt: '2025-01-10T08:00:00Z',
  updatedAt: '2025-09-01T08:00:00Z',
};

// ----------------------------------------------------------------------------
// 2. DEMO ACADEMIC YEARS (NĂM HỌC)
// ----------------------------------------------------------------------------
export const DEMO_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay-2025-2026',
    code: '2025-2026',
    label: 'Năm học 2025 - 2026',
    startDate: '2025-09-05',
    endDate: '2026-05-31',
    isCurrent: true,
  },
  {
    id: 'ay-2024-2025',
    code: '2024-2025',
    label: 'Năm học 2024 - 2025',
    startDate: '2024-09-05',
    endDate: '2025-05-31',
    isCurrent: false,
  },
];

// ----------------------------------------------------------------------------
// 3. DEMO PROFESSIONAL GROUPS (TỔ CHUYÊN MÔN)
// ----------------------------------------------------------------------------
export const DEMO_PROFESSIONAL_GROUPS: ProfessionalGroup[] = [
  {
    id: 'group-k4',
    organizationId: 'org-th-chuan-01',
    code: 'TO_KHOI_4',
    name: 'Tổ Chuyên môn Khối 4',
    description: 'Phụ trách chuyên môn chương trình GDPT Khối 4',
    assignedGradeIds: [4],
    assignedSubjectIds: ['sub-math', 'sub-vietnamese', 'sub-science', 'sub-history-geo'],
    leaderUserId: 'user-to-truong-01',
    deputyLeaderUserId: 'user-to-pho-01',
    createdAt: '2025-08-15T08:00:00Z',
    updatedAt: '2025-09-01T08:00:00Z',
  },
  {
    id: 'group-k5',
    organizationId: 'org-th-chuan-01',
    code: 'TO_KHOI_5',
    name: 'Tổ Chuyên môn Khối 5',
    description: 'Phụ trách chuyên môn chương trình GDPT Khối 5',
    assignedGradeIds: [5],
    assignedSubjectIds: ['sub-math', 'sub-vietnamese', 'sub-science', 'sub-history-geo'],
    leaderUserId: 'user-to-truong-02',
    createdAt: '2025-08-15T08:00:00Z',
    updatedAt: '2025-09-01T08:00:00Z',
  },
];

// ----------------------------------------------------------------------------
// 4. DEMO USERS (NGƯỜI DÙNG & VAI TRÒ)
// ----------------------------------------------------------------------------
export const DEMO_USERS: AppUser[] = [
  {
    id: 'user-giao-vien-01',
    organizationId: 'org-th-chuan-01',
    organizationName: 'Trường Tiểu học Chuẩn Quốc gia',
    fullName: 'Cô Nguyễn Thị Hoa',
    email: 'nguyenhoa.gv@thkhai.edu.vn',
    role: 'TEACHER',
    department: 'Tổ Chuyên môn Khối 4',
    assignedGradeIds: [4],
    assignedSubjectIds: ['sub-math', 'sub-vietnamese'],
    professionalGroupIds: ['group-k4'],
    isActive: true,
    createdAt: '2025-08-20T08:00:00Z',
    updatedAt: '2025-09-01T08:00:00Z',
  },
  {
    id: 'user-to-truong-01',
    organizationId: 'org-th-chuan-01',
    organizationName: 'Trường Tiểu học Chuẩn Quốc gia',
    fullName: 'Thầy Trần Văn Minh',
    email: 'tranminh.totruong@thkhai.edu.vn',
    role: 'GROUP_LEADER',
    department: 'Tổ Chuyên môn Khối 4',
    assignedGradeIds: [4],
    assignedSubjectIds: ['sub-math', 'sub-science'],
    professionalGroupIds: ['group-k4'],
    isActive: true,
    createdAt: '2025-08-20T08:00:00Z',
    updatedAt: '2025-09-01T08:00:00Z',
  },
  {
    id: 'user-to-pho-01',
    organizationId: 'org-th-chuan-01',
    organizationName: 'Trường Tiểu học Chuẩn Quốc gia',
    fullName: 'Cô Lê Thị Mai',
    email: 'lemai.topho@thkhai.edu.vn',
    role: 'DEPUTY_GROUP_LEADER',
    department: 'Tổ Chuyên môn Khối 4',
    assignedGradeIds: [4],
    assignedSubjectIds: ['sub-vietnamese', 'sub-history-geo'],
    professionalGroupIds: ['group-k4'],
    isActive: true,
    createdAt: '2025-08-20T08:00:00Z',
    updatedAt: '2025-09-01T08:00:00Z',
  },
  {
    id: 'user-admin-school',
    organizationId: 'org-th-chuan-01',
    organizationName: 'Trường Tiểu học Chuẩn Quốc gia',
    fullName: 'Ban Giám Hiệu / Quản trị Đơn vị',
    email: 'bgh@thkhai.edu.vn',
    role: 'SCHOOL_ADMIN',
    department: 'Ban Giám Hiệu',
    assignedGradeIds: [1, 2, 3, 4, 5],
    assignedSubjectIds: ['sub-math', 'sub-vietnamese', 'sub-english', 'sub-science'],
    professionalGroupIds: ['group-k4', 'group-k5'],
    isActive: true,
    createdAt: '2025-08-01T08:00:00Z',
    updatedAt: '2025-09-01T08:00:00Z',
  },
];

// Active user in session demo context
export const DEMO_ACTIVE_USER: AppUser = DEMO_USERS[0]; // Nguyễn Thị Hoa (Giáo viên)

// ----------------------------------------------------------------------------
// 5. DEMO TEST RECORDS (ĐỀ KIỂM TRA MÔ PHỎNG)
// ----------------------------------------------------------------------------
export const DEMO_TEST_RECORDS: TestRecord[] = [
  {
    id: 'exam-101',
    code: 'EXAM-T4-GK1-01',
    title: 'Đề kiểm tra Định kỳ Giữa Kỳ I - Môn Toán 4',
    organizationId: 'org-th-chuan-01',
    academicYearId: 'ay-2025-2026',
    academicYear: 'Năm học 2025 - 2026',
    grade: 4,
    subjectId: 'sub-math',
    semester: 'SEMESTER_1',
    assessmentPeriod: 'MID_TERM_1',
    scope: 'GROUP',
    mode: 'PROFESSIONAL',
    headerConfig: {
      schoolName: 'Trường Tiểu học Chuẩn Quốc gia',
      examTitle: 'ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA HỌC KỲ I',
      subjectName: 'Môn: Toán - Lớp 4',
      gradeLabel: 'Lớp 4',
      academicYear: 'Năm học 2025 - 2026',
      durationMinutes: 40,
    },
    questions: [],
    totalPoints: 10,
    durationMinutes: 40,
    status: 'CROSS_REVIEW',
    creatorId: 'user-giao-vien-01',
    creatorName: 'Cô Nguyễn Thị Hoa',
    crossReviewerId: 'user-to-pho-01',
    crossReviewerName: 'Cô Lê Thị Mai (Tổ phó)',
    approverId: 'user-to-truong-01',
    approverName: 'Thầy Trần Văn Minh (Tổ trưởng)',
    currentVersion: 1,
    versions: [
      {
        id: 'ver-1',
        testId: 'exam-101',
        versionNumber: 1,
        createdBy: 'user-giao-vien-01',
        createdByName: 'Cô Nguyễn Thị Hoa',
        createdAt: '2025-09-25T10:00:00Z',
        changeSummary: 'Khởi tạo đề bản nháp và gửi kiểm tra chéo',
      },
    ],
    auditLogs: [
      {
        id: 'audit-1',
        actorId: 'user-giao-vien-01',
        actorName: 'Cô Nguyễn Thị Hoa',
        actorRole: 'TEACHER',
        action: 'ASSIGN_CROSS_REVIEW',
        entityType: 'TEST',
        entityId: 'exam-101',
        fromStatus: 'SUBMITTED_LOCKED',
        toStatus: 'CROSS_REVIEW',
        timestamp: '2025-09-25T10:00:00Z',
      },
    ],
    createdAt: '2025-09-25T09:00:00Z',
    updatedAt: '2025-09-25T10:00:00Z',
  },
  {
    id: 'exam-102',
    code: 'EXAM-TV3-CK1-02',
    title: 'Đề kiểm tra Cuối Kỳ I - Môn Tiếng Việt 3',
    organizationId: 'org-th-chuan-01',
    academicYearId: 'ay-2025-2026',
    academicYear: 'Năm học 2025 - 2026',
    grade: 3,
    subjectId: 'sub-vietnamese',
    semester: 'SEMESTER_1',
    assessmentPeriod: 'END_TERM_1',
    scope: 'SCHOOL',
    mode: 'QUICK',
    headerConfig: {
      schoolName: 'Trường Tiểu học Chuẩn Quốc gia',
      examTitle: 'ĐỀ KIỂM TRA ĐỊNH KỲ CUỐI HỌC KỲ I',
      subjectName: 'Môn: Tiếng Việt - Lớp 3',
      gradeLabel: 'Lớp 3',
      academicYear: 'Năm học 2025 - 2026',
      durationMinutes: 50,
    },
    questions: [],
    totalPoints: 10,
    durationMinutes: 50,
    status: 'PRINCIPAL_REVIEW',
    creatorId: 'user-giao-vien-01',
    creatorName: 'Cô Nguyễn Thị Hoa',
    crossReviewerId: 'user-to-truong-01',
    crossReviewerName: 'Thầy Trần Văn Minh',
    approverId: 'user-admin-school',
    approverName: 'Ban Giám Hiệu',
    currentVersion: 2,
    versions: [],
    auditLogs: [],
    createdAt: '2025-09-20T08:00:00Z',
    updatedAt: '2025-09-24T14:30:00Z',
  },
];

// ----------------------------------------------------------------------------
// 6. DEMO RESOURCES (TÀI NGUYÊN DÙNG CHUNG)
// ----------------------------------------------------------------------------
export const DEMO_RESOURCES: Resource[] = [
  {
    id: 'res-sgk-toan4',
    type: 'TEXTBOOK',
    title: 'Sách giáo khoa Toán 4 - Bộ sách Chuẩn GDPT 2018',
    description: 'Nguồn tài liệu học liệu chính thức môn Toán Lớp 4',
    ownerId: 'system',
    ownerName: 'Bộ GD&ĐT',
    organizationId: 'org-th-chuan-01',
    gradeIds: [4],
    subjectIds: ['sub-math'],
    scope: 'SHARED_LIBRARY',
    sourceType: 'OFFICIAL_CURRICULUM',
    sourceReference: 'SGK Toán 4 - NXB Giáo dục',
    reviewStatus: 'APPROVED',
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-01T00:00:00Z',
  },
  {
    id: 'res-reading-01',
    type: 'READING_PASSAGE',
    title: 'Bài đọc: Cánh đồng tuổi thơ',
    description: 'Ngữ liệu đọc hiểu văn bản nghệ thuật dùng cho lớp 4',
    rawText: 'Một buổi sáng mùa thu, tôi cùng các bạn đi trên con đường làng rợp bóng cây...',
    ownerId: 'user-giao-vien-01',
    ownerName: 'Cô Nguyễn Thị Hoa',
    organizationId: 'org-th-chuan-01',
    gradeIds: [4],
    subjectIds: ['sub-vietnamese'],
    scope: 'GROUP',
    sourceType: 'USER_SUBMITTED',
    sourceReference: 'Sáng tác bởi GV Nguyễn Thị Hoa',
    reviewStatus: 'APPROVED',
    reviewedById: 'user-to-truong-01',
    reviewedAt: '2025-09-15T09:00:00Z',
    createdAt: '2025-09-10T08:00:00Z',
    updatedAt: '2025-09-15T09:00:00Z',
  },
];

// ----------------------------------------------------------------------------
// 7. DEMO TEMPLATES (MẪU ĐỀ CHUẨN - DỮ LIỆU MẪU)
// Mẫu mặc định: Mẫu tổ khối 4 theo mục 5.3 YEU_CAU_ANTIGRAVITY
// ----------------------------------------------------------------------------
export const DEMO_TEMPLATES: ExamTemplate[] = [
  DEFAULT_GROUP_4_TEMPLATE,
];
