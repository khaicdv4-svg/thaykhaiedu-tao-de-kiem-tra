/**
 * ThayKhaiEdu - Vietnamese Syllable (tiếng) Counter & Passage Tolerance Analyzer
 * Master Project Specification V1.0 (Section 3.1)
 */

import {
  ReadingPassageType,
  READING_PASSAGE_CONFIG,
  WordCountAnalysis,
  ToleranceStatus,
} from '@/types/reading-passage';

/**
 * Đếm số tiếng (âm tiết) tiếng Việt cho ngữ liệu tiểu học.
 * Theo quy ước của tổ: mỗi tiếng là một cụm chữ cách nhau bởi khoảng trắng.
 * Dấu gạch nối giữa các tiếng (ví dụ "Hoa-phượng") được tính là hai tiếng.
 * Dấu câu đứng riêng không được tính.
 */
export function countVietnameseSyllables(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Chuẩn hóa Unicode NFC
  const normalized = text.normalize('NFC').trim();
  if (normalized.length === 0) {
    return 0;
  }

  // Tách theo khoảng trắng và dấu gạch nối
  const tokens = normalized.split(/[\s\-–—]+/);
  let count = 0;

  for (const token of tokens) {
    // Loại bỏ dấu câu quanh tiếng
    const cleaned = token.replace(/^[.,\/#!$%\^&\*;:{}=_`~()'"“”‘’«»?<>\[\]]+|[.,\/#!$%\^&\*;:{}=_`~()'"“”‘’«»?<>\[\]]+$/g, '');
    if (cleaned.length > 0) {
      count++;
    }
  }

  return count;
}

/**
 * Giữ tên cũ để các nơi đang gọi hàm không bị lỗi. Kết quả là số tiếng.
 * @deprecated Dùng countVietnameseSyllables.
 */
export const countVietnameseWords = countVietnameseSyllables;

/**
 * Phân tích độ dài ngữ liệu theo số tiếng, kiểm tra dung sai theo thể loại và khối lớp
 */
export function analyzeReadingPassageLength(
  text: string,
  passageType: ReadingPassageType,
  customMin?: number,
  customMax?: number,
  customTolerance?: number
): WordCountAnalysis {
  const wordCount = countVietnameseSyllables(text);
  const normalized = (text || '').normalize('NFC').trim();
  const charCount = normalized.length;
  const lines = normalized.length > 0 ? normalized.split(/\r?\n/).filter((l) => l.trim().length > 0) : [];
  const lineCount = lines.length;
  const paragraphCount = normalized.length > 0 ? normalized.split(/\r?\n\s*\r?\n/).filter((p) => p.trim().length > 0).length : 0;

  const config = READING_PASSAGE_CONFIG[passageType] || READING_PASSAGE_CONFIG.ORAL_READING;
  const targetMin = customMin !== undefined && customMin > 0 ? customMin : config.standardMinWordsGrade4;
  const targetMax = customMax !== undefined && customMax > 0 ? customMax : config.standardMaxWordsGrade4;
  const tolerance = customTolerance !== undefined && customTolerance >= 0 ? customTolerance : config.wordCountTolerance;

  const allowedMin = Math.max(0, targetMin - tolerance);
  const allowedMax = targetMax + tolerance;

  let toleranceStatus: ToleranceStatus = 'IN_RANGE';
  let deviation = 0;
  let message = '';

  if (wordCount >= targetMin && wordCount <= targetMax) {
    toleranceStatus = 'EXACT';
    deviation = 0;
    message = `Độ dài chuẩn: ${wordCount} tiếng (Khung chuẩn: ${targetMin} - ${targetMax} tiếng).`;
  } else if (wordCount >= allowedMin && wordCount <= allowedMax) {
    toleranceStatus = 'IN_RANGE';
    deviation = wordCount < targetMin ? wordCount - targetMin : wordCount - targetMax;
    message = `Trong khoảng dung sai cho phép (±${tolerance} tiếng): ${wordCount} tiếng (Chuẩn: ${targetMin} - ${targetMax}).`;
  } else {
    toleranceStatus = 'WARNING_OUT_OF_RANGE';
    deviation = wordCount < allowedMin ? wordCount - targetMin : wordCount - targetMax;
    if (wordCount < allowedMin) {
      message = `Ngữ liệu quá ngắn: ${wordCount} tiếng (Thiếu ${Math.abs(deviation)} tiếng so với mức tối thiểu ${targetMin}). Dung sai cho phép: ${allowedMin} - ${allowedMax} tiếng.`;
    } else {
      message = `Ngữ liệu quá dài: ${wordCount} tiếng (Vượt ${deviation} tiếng so với mức tối đa ${targetMax}). Dung sai cho phép: ${allowedMin} - ${allowedMax} tiếng.`;
    }
  }

  return {
    wordCount,
    charCount,
    lineCount,
    paragraphCount: Math.max(1, paragraphCount),
    targetMin,
    targetMax,
    tolerance,
    toleranceStatus,
    deviation,
    message,
  };
}
