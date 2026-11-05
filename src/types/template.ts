/**
 * ThayKhaiEdu - Test Template Governance Models
 * Template structures control visual presentation, header layout, and paper formatting.
 * Mẫu mặc định: "Mẫu tổ khối 4" theo quy chuẩn thực tế của tổ chuyên môn.
 */

import { PrimaryGrade, AssessmentPeriod } from './curriculum';
import { DataScope } from './permissions';

export type TemplateType =
  | 'GROUP_DEFAULT_TEMPLATE'  // Mẫu chuẩn tổ chuyên môn khối 4 (mặc định)
  | 'PERSONAL_TEMPLATE'        // Mẫu cá nhân
  | 'ORGANIZATION_TEMPLATE'    // Mẫu chuẩn đơn vị trường
  | 'SYSTEM_TEMPLATE';         // Mẫu chuẩn hệ thống (Bộ/Sở GD&ĐT)

export type TemplateValidationStatus =
  | 'DRAFT'        // Bản nháp
  | 'VALIDATED'    // Đã kiểm định & duyệt dùng
  | 'DEPRECATED';   // Đã ngừng sử dụng

export type TemplateLayoutDensity =
  | 'COMPACT'      // Bố cục gọn: đúng 2 trang (mặc định cho Lịch sử & Địa lí, Khoa học, Công nghệ, TV đọc hiểu)
  | 'SPACIOUS';    // Bố cục thoáng: có thể nhiều trang hơn

export interface TemplateHeaderLayout {
  headerLeftSchool: string;          // Bên trái: Tên trường
  headerLeftStudentName: string;      // HỌ TÊN HS: .......................................
  headerLeftGrade: string;            // LỚP: Lớp 4 (Không ghi 4/1, 4/2)
  headerLeftExamDate: string;         // NGÀY KIỂM TRA: .................................
  headerRightExamTitle: string;       // Bên phải: Tên bài kiểm tra
  headerRightInvigilator1: string;    // GV coi KT 1: ...................................
  headerRightInvigilator2: string;    // GV coi KT 2: ...................................
  headerRightStudentOrder: string;    // Số thứ tự: .....................................
  includeScoreSummaryTable: boolean;  // Bảng: Điểm / Nhận xét / GV chấm 1 / GV chấm 2
  includeStudentSectionDivider: boolean; // Dòng phân cách: "PHẦN BÀI LÀM CỦA HỌC SINH"
}

export interface ExamTemplate {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName?: string;
  organizationId: string;
  grade: PrimaryGrade;
  subjectId: string;
  assessmentPeriod: AssessmentPeriod;
  templateType: TemplateType;
  scope: DataScope;
  version: number;
  validationStatus: TemplateValidationStatus;
  
  // Specific format specs for Group 4 template
  isDefaultGroup4Template: boolean;
  layoutDensity: TemplateLayoutDensity;
  hasScoreColumnOnLeft: boolean;      // Cột điểm bên trái: ".../0,5đ", ngăn bằng đường kẻ dọc
  hasDottedWritingLines: boolean;     // Dòng kẻ chấm trải ngang đủ chỗ học sinh viết
  isMonochromeOnly: boolean;          // Đen trắng, không màu

  // Typography & Page Specifications
  headerLayout: TemplateHeaderLayout;
  paperSize: 'A4' | 'LETTER';
  fontFamily: string;                 // 'Times New Roman'
  fontSizePoints: number;             // 13pt
  lineSpacing: number;                // 1.2 đến 1.5
  pageMarginMm: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Mẫu chuẩn Tổ Khối 4 (Mẫu in mặc định theo mục 5.3 YEU_CAU_ANTIGRAVITY)
 */
export const DEFAULT_GROUP_4_TEMPLATE: ExamTemplate = {
  id: 'tpl-to-khoi-4-mac-dinh',
  name: 'Mẫu tổ khối 4 (Mặc định)',
  description: 'Mẫu in chuẩn của tổ khối 4: Font Times New Roman 13, in đen trắng, cột điểm bên trái (.../0,5đ), khung tiêu đề chuẩn trường, bố cục gọn 2 trang.',
  ownerId: 'to-truong-khoi-4',
  ownerName: 'Tổ trưởng chuyên môn Khối 4',
  organizationId: 'org-th-tran-van-on',
  grade: 4,
  subjectId: 'sub-math',
  assessmentPeriod: 'MID_TERM_1',
  templateType: 'GROUP_DEFAULT_TEMPLATE',
  scope: 'GROUP',
  version: 1,
  validationStatus: 'VALIDATED',
  isDefaultGroup4Template: true,
  layoutDensity: 'COMPACT',
  hasScoreColumnOnLeft: true,
  hasDottedWritingLines: true,
  isMonochromeOnly: true,
  headerLayout: {
    headerLeftSchool: 'Trường TH Trần Văn Ơn',
    headerLeftStudentName: 'Họ và tên: ................................................................',
    headerLeftGrade: 'Lớp 4',
    headerLeftExamDate: 'Ngày kiểm tra: ..... / ..... / 2026',
    headerRightExamTitle: 'BÀI KIỂM TRA ĐỊNH KỲ GIỮA HỌC KỲ I',
    headerRightInvigilator1: 'GV coi KT 1: .....................................',
    headerRightInvigilator2: 'GV coi KT 2: .....................................',
    headerRightStudentOrder: 'Số thứ tự: ...........',
    includeScoreSummaryTable: true,
    includeStudentSectionDivider: true,
  },
  paperSize: 'A4',
  fontFamily: 'Times New Roman',
  fontSizePoints: 13,
  lineSpacing: 1.3,
  pageMarginMm: { top: 20, bottom: 20, left: 25, right: 20 },
  createdAt: '2026-11-03T00:00:00Z',
  updatedAt: '2026-11-03T00:00:00Z',
};
