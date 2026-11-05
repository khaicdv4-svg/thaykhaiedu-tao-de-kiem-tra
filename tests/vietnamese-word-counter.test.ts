import { describe, it, expect } from 'vitest';
import {
  countVietnameseWords,
  analyzeReadingPassageLength,
} from '@/core/utils/vietnamese-word-counter';

describe('Vietnamese Word Counter & Reading Passage Tolerance', () => {
  describe('countVietnameseWords', () => {
    it('counts Vietnamese words correctly in standard sentences', () => {
      const sentence = 'Hoa phượng vĩ nở đỏ rực góc sân trường.';
      // Hoa (1) phượng (2) vĩ (3) nở (4) đỏ (5) rực (6) góc (7) sân (8) trường (9)
      expect(countVietnameseWords(sentence)).toBe(9);
    });

    it('handles multiple spaces, line breaks, and punctuation cleanly', () => {
      const text = `  Quê hương  em  biết bao tươi đẹp!
      Đồng lúa xanh, dòng sông uốn khúc...
      "Bác Hồ kính yêu!"  `;
      // 'Quê' (1), 'hương' (2), 'em' (3), 'biết' (4), 'bao' (5), 'tươi' (6), 'đẹp' (7),
      // 'Đồng' (8), 'lúa' (9), 'xanh' (10), 'dòng' (11), 'sông' (12), 'uốn' (13), 'khúc' (14),
      // 'Bác' (15), 'Hồ' (16), 'kính' (17), 'yêu' (18)
      expect(countVietnameseWords(text)).toBe(18);
    });

    it('counts each hyphen-joined syllable and ignores standalone punctuation', () => {
      // Hoa(1) - phượng(2) ... "-" đứng riêng không tính
      expect(countVietnameseWords('Hoa-phượng nở , đẹp .')).toBe(4);
    });

    it('returns 0 for empty or whitespace-only strings', () => {
      expect(countVietnameseWords('')).toBe(0);
      expect(countVietnameseWords('   \n\t  ')).toBe(0);
    });
  });

  describe('analyzeReadingPassageLength - ORAL_READING (Đọc thành tiếng, ±5 từ)', () => {
    // Standard Grade 4 Oral Reading: 80 - 100 words, tolerance ±5 words -> Allowed: [75, 105]
    it('marks EXACT when within 80 - 100 words', () => {
      const words = Array(90).fill('tiếng').join(' ');
      const analysis = analyzeReadingPassageLength(words, 'ORAL_READING');
      expect(analysis.wordCount).toBe(90);
      expect(analysis.toleranceStatus).toBe('EXACT');
      expect(analysis.deviation).toBe(0);
    });

    it('marks IN_RANGE when within tolerance (75 - 79 words or 101 - 105 words)', () => {
      const words78 = Array(78).fill('tiếng').join(' ');
      const analysisLower = analyzeReadingPassageLength(words78, 'ORAL_READING');
      expect(analysisLower.wordCount).toBe(78);
      expect(analysisLower.toleranceStatus).toBe('IN_RANGE');
      expect(analysisLower.deviation).toBe(-2); // 78 - 80

      const words103 = Array(103).fill('tiếng').join(' ');
      const analysisUpper = analyzeReadingPassageLength(words103, 'ORAL_READING');
      expect(analysisUpper.wordCount).toBe(103);
      expect(analysisUpper.toleranceStatus).toBe('IN_RANGE');
      expect(analysisUpper.deviation).toBe(3); // 103 - 100
    });

    it('marks WARNING_OUT_OF_RANGE when below 75 or above 105 words', () => {
      const words70 = Array(70).fill('tiếng').join(' ');
      const analysisTooShort = analyzeReadingPassageLength(words70, 'ORAL_READING');
      expect(analysisTooShort.wordCount).toBe(70);
      expect(analysisTooShort.toleranceStatus).toBe('WARNING_OUT_OF_RANGE');
      expect(analysisTooShort.message).toContain('Ngữ liệu quá ngắn');

      const words110 = Array(110).fill('tiếng').join(' ');
      const analysisTooLong = analyzeReadingPassageLength(words110, 'ORAL_READING');
      expect(analysisTooLong.wordCount).toBe(110);
      expect(analysisTooLong.toleranceStatus).toBe('WARNING_OUT_OF_RANGE');
      expect(analysisTooLong.message).toContain('Ngữ liệu quá dài');
    });
  });

  describe('analyzeReadingPassageLength - COMPREHENSION_READING (Đọc hiểu, ±10 từ)', () => {
    // Standard Grade 4 Comprehension: 250 - 320 words, tolerance ±10 words -> Allowed: [240, 330]
    it('marks EXACT when within 250 - 320 words', () => {
      const words = Array(280).fill('từ').join(' ');
      const analysis = analyzeReadingPassageLength(words, 'COMPREHENSION_READING');
      expect(analysis.wordCount).toBe(280);
      expect(analysis.toleranceStatus).toBe('EXACT');
    });

    it('marks IN_RANGE when within tolerance (240 - 249 or 321 - 330 words)', () => {
      const words245 = Array(245).fill('từ').join(' ');
      const analysis = analyzeReadingPassageLength(words245, 'COMPREHENSION_READING');
      expect(analysis.wordCount).toBe(245);
      expect(analysis.toleranceStatus).toBe('IN_RANGE');
    });

    it('marks WARNING_OUT_OF_RANGE when below 240 or above 330 words', () => {
      const words200 = Array(200).fill('từ').join(' ');
      const analysis = analyzeReadingPassageLength(words200, 'COMPREHENSION_READING');
      expect(analysis.wordCount).toBe(200);
      expect(analysis.toleranceStatus).toBe('WARNING_OUT_OF_RANGE');
    });
  });
});
