/**
 * ThayKhaiEdu - Phase 2 Vietnamese Reading Passages (Kho ngữ liệu Đọc Tiếng Việt Tiểu học)
 * Master Project Specification V1.0 (Section 3.1, 11.2)
 */

export type ReadingPassageType =
  | 'ORAL_READING'            // Đọc thành tiếng (Dung sai: +-5 từ)
  | 'COMPREHENSION_READING'   // Đọc hiểu (Dung sai: +-10 từ)
  | 'POETRY'                  // Thơ
  | 'PROSE'                   // Văn xuôi
  | 'OTHER';                  // Khác

export type ToleranceStatus = 'IN_RANGE' | 'WARNING_OUT_OF_RANGE' | 'EXACT';

export type PassageReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface ReadingPassageConfig {
  type: ReadingPassageType;
  label: string;
  description: string;
  standardMinWordsGrade4: number;
  standardMaxWordsGrade4: number;
  wordCountTolerance: number; // +- words
}

export const READING_PASSAGE_CONFIG: Record<ReadingPassageType, ReadingPassageConfig> = {
  ORAL_READING: {
    type: 'ORAL_READING',
    label: 'Đọc thành tiếng',
    description: 'Văn bản đọc thành tiếng dành cho kiểm tra định kỳ (chuẩn 80 - 100 từ, dung sai ±5 từ)',
    standardMinWordsGrade4: 80,
    standardMaxWordsGrade4: 100,
    wordCountTolerance: 5,
  },
  COMPREHENSION_READING: {
    type: 'COMPREHENSION_READING',
    label: 'Đọc hiểu',
    description: 'Văn bản đọc hiểu trả lời câu hỏi trắc nghiệm/tự luận (chuẩn 250 - 320 từ, dung sai ±10 từ)',
    standardMinWordsGrade4: 250,
    standardMaxWordsGrade4: 320,
    wordCountTolerance: 10,
  },
  POETRY: {
    type: 'POETRY',
    label: 'Thơ ca',
    description: 'Văn bản thơ tiểu học (chuẩn 12 - 20 dòng thơ hoặc 60 - 120 từ)',
    standardMinWordsGrade4: 50,
    standardMaxWordsGrade4: 120,
    wordCountTolerance: 10,
  },
  PROSE: {
    type: 'PROSE',
    label: 'Văn xuôi / Đoạn trích',
    description: 'Đoạn trích truyện kể, bài văn miêu tả tiểu học',
    standardMinWordsGrade4: 100,
    standardMaxWordsGrade4: 350,
    wordCountTolerance: 15,
  },
  OTHER: {
    type: 'OTHER',
    label: 'Ngữ liệu khác',
    description: 'Bản tin ngắn, ca dao, tục ngữ, văn bản thông tin',
    standardMinWordsGrade4: 30,
    standardMaxWordsGrade4: 350,
    wordCountTolerance: 20,
  },
};

export interface ReadingPassage {
  id: string;
  organizationId: string;
  title: string;
  author: string;                  // Bắt buộc tác giả
  sourceReference: string;         // Bắt buộc nguồn trích dẫn
  passageType: ReadingPassageType;
  grade: number;                   // 1 - 5
  content: string;
  wordCount: number;
  targetWordCountMin?: number;
  targetWordCountMax?: number;
  toleranceStatus: ToleranceStatus;
  genre?: string;
  theme?: string;
  status: PassageReviewStatus;
  /** Kì kiểm tra: GIUA_HK1, CUOI_HK1, GIUA_HK2, CUOI_NAM. */
  assessmentPeriod?: string | null;
  /** DOC_THANH_TIENG hoặc DOC_HIEU. */
  readingUse?: string | null;
  /** TRUYEN, MIEU_TA, THO, VAN_BAN_THONG_TIN, KICH, KHAC. */
  literaryForm?: string | null;
  /** Nhãn khi bài do AI chỉnh độ dài, ví dụ "Có AI chỉnh sửa bớt 18 tiếng". */
  nhanAI?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WordCountAnalysis {
  wordCount: number;
  charCount: number;
  lineCount: number;
  paragraphCount: number;
  targetMin: number;
  targetMax: number;
  tolerance: number;
  toleranceStatus: ToleranceStatus;
  deviation: number; // 0 if inside min..max, negative if below min, positive if above max
  message: string;
}
