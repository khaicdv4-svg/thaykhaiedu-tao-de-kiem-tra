/**
 * ThayKhaiEdu - AI Service Interface
 * Secure backend API contracts for Gemini API integration.
 * NEVER expose Gemini API key or secret in frontend components.
 */

import { MultimodalQuestion, ExamMatrix, ExamValidationSummary } from '@/types';

export interface GenerateExamPromptPayload {
  grade: number;
  subjectId: string;
  semester: string;
  assessmentPeriod: string;
  matrixId?: string;
  topics?: string[];
  additionalPrompt?: string;
}

export interface IAIService {
  /**
   * Generate an exam matrix automatically based on curriculum standards & YCCĐ
   */
  generateMatrix(payload: GenerateExamPromptPayload): Promise<ExamMatrix>;

  /**
   * Generate questions aligned with a specific matrix blueprint
   */
  generateQuestionsForMatrix(matrix: ExamMatrix): Promise<MultimodalQuestion[]>;

  /**
   * Run automated AI quality validation and compliance audit on an exam
   */
  validateExamQuality(examId: string): Promise<ExamValidationSummary>;

  /**
   * Generate alternative question or passage text
   */
  regenerateQuestion(questionId: string, revisionPrompt: string): Promise<MultimodalQuestion>;
}
