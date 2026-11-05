/**
 * ThayKhaiEdu - Export Service Interface
 * Prepared for exporting standardized exam packages to Word (DOCX) and PDF.
 */

import { Exam } from '@/types';

export interface ExportOptions {
  includeAnswerKey: boolean;
  includeRubric: boolean;
  includeMatrix: boolean;
  watermarkText?: string;
  paperSize?: 'A4' | 'LETTER';
  fontSizePoints?: number;
}

export interface ExportResult {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
  generatedAt: string;
}

export interface IExportService {
  exportToDocx(exam: Exam, options: ExportOptions): Promise<ExportResult>;
  exportToPdf(exam: Exam, options: ExportOptions): Promise<ExportResult>;
  exportAnswerKeyDocx(exam: Exam): Promise<ExportResult>;
}
