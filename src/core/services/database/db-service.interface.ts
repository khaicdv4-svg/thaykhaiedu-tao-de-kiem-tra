/**
 * ThayKhaiEdu - Database Service Abstraction
 * Prepared for PostgreSQL / Supabase Database operations.
 */

import { Exam, MultimodalQuestion, ExamMatrix, YCCDRequirement } from '@/types';

export interface IDatabaseService {
  // Exam Repository
  getExamById(id: string): Promise<Exam | null>;
  listExams(filter?: { tenantId?: string; status?: string; subjectId?: string }): Promise<Exam[]>;
  saveExam(exam: Exam): Promise<Exam>;
  deleteExam(id: string): Promise<boolean>;

  // Question Bank Repository
  getQuestionById(id: string): Promise<MultimodalQuestion | null>;
  searchQuestions(query: { subjectId?: string; grade?: number; yccdId?: string }): Promise<MultimodalQuestion[]>;
  saveQuestion(question: MultimodalQuestion): Promise<MultimodalQuestion>;

  // Matrix Repository
  getMatrixById(id: string): Promise<ExamMatrix | null>;
  saveMatrix(matrix: ExamMatrix): Promise<ExamMatrix>;

  // YCCĐ Curriculum Standards
  getYCCDRequirements(subjectId: string, grade: number): Promise<YCCDRequirement[]>;
}
