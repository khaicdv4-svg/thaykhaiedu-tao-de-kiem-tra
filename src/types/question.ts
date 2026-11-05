/**
 * ThayKhaiEdu - Multimodal Question Data Architecture
 * Prepared for rich content: text, images, tables, diagrams, option blocks, and answer rubrics.
 */

import { PrimaryGrade, CognitiveLevel } from './curriculum';

export type { CognitiveLevel };

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTIPLE_SELECT'
  | 'SHORT_ANSWER'
  | 'ESSAY'
  | 'MATCHING'
  | 'TRUE_FALSE'
  | 'FILL_IN_BLANK';

export type ImageSourceType =
  | 'SOURCE_DOC'    // Từ tài liệu nguồn SGK/YCCĐ
  | 'USER_UPLOAD'   // Người dùng tải lên
  | 'AI_SEARCH'     // AI tìm kiếm
  | 'AI_GENERATED'; // AI tạo ảnh

// --------------------------------------------------
// CONTENT BLOCKS
// --------------------------------------------------

export interface TextBlock {
  id: string;
  type: 'TEXT';
  content: string;
  format?: 'plain' | 'markdown' | 'latex';
}

export interface ImageBlock {
  id: string;
  type: 'IMAGE';
  url: string;
  caption?: string;
  altText?: string;
  source: ImageSourceType;
  metadata?: {
    originalFilename?: string;
    width?: number;
    height?: number;
    mimeType?: string;
    aiPrompt?: string;
  };
}

export interface TableBlock {
  id: string;
  type: 'TABLE';
  caption?: string;
  headers?: string[];
  rows: string[][];
}

export interface DiagramBlock {
  id: string;
  type: 'DIAGRAM';
  diagramType: 'FLOWCHART' | 'GRAPH' | 'CONCEPT_MAP' | 'GEOMETRY' | 'SVG' | 'OTHER';
  specData: string; // e.g. Mermaid spec, SVG markup, or JSON definition
  caption?: string;
}

export type ContentBlock = TextBlock | ImageBlock | TableBlock | DiagramBlock;

export interface OptionBlock {
  id: string;
  label: string; // e.g., 'A', 'B', 'C', 'D'
  content: ContentBlock[];
  isCorrect: boolean;
}

export interface AnswerBlock {
  id: string;
  explanation: ContentBlock[]; // Lời giải chi tiết
  markingGuide?: string;       // Hướng dẫn chấm / Thang điểm
  rubricPoints: number;        // Điểm của câu hỏi
}

export interface QuestionProvenance {
  sourceType: 'CURRICULUM_DOC' | 'TEACHER_CREATED' | 'AI_GENERATED' | 'IMPORTED_BANK';
  sourceDocumentName?: string;
  pageNumber?: number;
  confidenceScore?: number; // Scoring score for RAG source accuracy
  promptUsed?: string;
  createdById?: string;
  createdByName?: string;
}

// --------------------------------------------------
// MULTIMODAL QUESTION INTERFACE
// --------------------------------------------------

export interface MultimodalQuestion {
  id: string;
  tenantId: string;
  schoolId: string;
  subjectId: string;
  grade: PrimaryGrade;
  
  // YCCĐ Alignment
  yccdIds: string[];
  yccdCodes?: string[];
  
  // Question Classification
  questionType: QuestionType;
  cognitiveLevel: CognitiveLevel;
  
  // Content Components
  stimulus?: ContentBlock[]; // Ngữ liệu chung (bài đọc, đoạn văn, hình ảnh chung)
  prompt: ContentBlock[];    // Lệnh hỏi / Nội dung câu hỏi
  options?: OptionBlock[];   // Các phương án (nếu là trắc nghiệm/ghép đôi)
  answer: AnswerBlock;       // Đáp án & Hướng dẫn chấm
  
  // Points & Weight
  points: number;
  
  // Provenance & Source Metadata
  provenance: QuestionProvenance;
  
  // Lifecycle & Tags
  tags?: string[];
  usageCount?: number;
  isApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}
