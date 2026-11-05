/**
 * ThayKhaiEdu - RAG & Source Document Retrieval Interface
 * Prepared for pgvector semantic search and textbook content indexing.
 */

import { YCCDRequirement } from '@/types';

export interface SourceDocument {
  id: string;
  title: string;
  documentType: 'CURRICULUM_PROGRAM' | 'TEXTBOOK' | 'TEACHER_GUIDE' | 'EXAM_SPEC';
  grade: number;
  subjectId: string;
  fileUrl?: string;
  chunkCount: number;
  uploadedAt: string;
}

export interface RetrievalChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarityScore: number;
  metadata?: Record<string, unknown>;
}

export interface IRAGService {
  uploadAndIndexDocument(file: File, metadata: Partial<SourceDocument>): Promise<SourceDocument>;
  searchRelevantSources(query: string, filter: { grade: number; subjectId: string }): Promise<RetrievalChunk[]>;
  alignQuestionWithYCCD(questionText: string, grade: number, subjectId: string): Promise<YCCDRequirement[]>;
}
