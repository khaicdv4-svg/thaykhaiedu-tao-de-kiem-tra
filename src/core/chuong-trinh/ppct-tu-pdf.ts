/**
 * Đọc phân phối chương trình (PPCT) từ PDF: AI chép bảng thành các dòng, code kiểm tra rồi đổi
 * sang dạng sao lưu PPCT HUB để dùng lại đường lưu sẵn có. AI chỉ chép chữ trong tài liệu; thầy xem rồi mới lưu.
 */
import { MINISTRY_STANDARD_PERIODS_GRADE_4 } from '@/core/curriculum/ppct-hub-adapter';
import type { PpctHubBackupFile, PpctHubLesson, PpctHubPeriod, PpctHubTopic } from '@/types/curriculum-source';

export interface DongPpct { tuan: number; chuDe: string; bai: string; soTiet: number }
export interface KetQuaPpct { dong: DongPpct[]; loi: string[]; canhBao: string[]; tongTiet: number }

export const HE_THONG_DOC_PPCT = `Bạn chép PHÂN PHỐI CHƯƠNG TRÌNH một môn học tiểu học từ tài liệu thầy cô cung cấp thành bảng.
Quy tắc bắt buộc:
- Chỉ chép những gì CÓ trong tài liệu. Không đoán, không thêm bài, không tự tính lại số tiết.
- Mỗi dòng: một bài (hoặc một phần bài) học trong MỘT tuần. Đúng 4 cột, ngăn cách bằng dấu Tab: Tuần, Chủ đề, Tên bài, Số tiết.
- "Tuần": số tuần (1 đến 35). "Số tiết": số tiết của bài đó trong tuần đó (1 đến 5).
- Bài học trải qua nhiều tuần thì mỗi tuần một dòng, số tiết là số tiết dạy trong tuần đó.
- "Chủ đề": tên chủ đề/chương/chủ điểm của bài; lặp lại ở mọi dòng thuộc chủ đề đó, kể cả khi sang trang mới. Tài liệu không có thì để trống.
- "Tên bài": giữ đúng như tài liệu, kể cả chữ "Bài 1" nếu có.
- Bỏ dòng tiêu đề bảng, dòng tổng cộng, ghi chú, tiết kiểm tra nếu không có tên bài. Tiết ôn tập/kiểm tra có tên thì vẫn chép.
- Không viết lời giải thích, không dùng dấu \`\`\`. Đoạn không có bảng PPCT thì không trả về gì.`;

export function loiNhacDocPpct(p: { mon: string; lop: number; nguon: 'chu' | 'anh'; phan?: string; stt?: number; tong?: number }): string {
  const dau = `Môn ${p.mon} lớp ${p.lop}.`;
  if (p.nguon === 'anh') return `${dau} Đây là ảnh một trang tài liệu phân phối chương trình. Chép các dòng trên trang này theo đúng quy tắc.`;
  return `${dau} Đây là phần ${p.stt}/${p.tong} của tài liệu phân phối chương trình. Chép các dòng trong phần này theo đúng quy tắc.\n\n<tai_lieu>\n${p.phan}\n</tai_lieu>`;
}

/** Giữ lại dòng đủ 4 cột, tuần và số tiết là số. */
export function loaiDongPpct(traLoi: string): string[] {
  return traLoi
    .replace(/```[a-z]*\n?/g, '')
    .split(/\r?\n/)
    .map((d) => d.replace(/\s+$/, ''))
    .filter((d) => {
      const c = d.split('\t');
      return c.length === 4 && /^\d+$/.test(c[0].trim()) && /^\d+$/.test(c[3].trim()) && c[2].trim() !== '';
    });
}

const lamGon = (s: string) => s.replace(/\s+/g, ' ').trim();

export function docBangPpct(chu: string, subjectId?: string): KetQuaPpct {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const dong: DongPpct[] = [];
  chu.replace(/^﻿/, '').split(/\r?\n/).forEach((d, i) => {
    if (!d.trim()) return;
    const c = d.split('\t');
    const so = i + 1;
    if (c.length !== 4) { loi.push(`Dòng ${so}: cần đúng 4 cột (Tuần, Chủ đề, Tên bài, Số tiết).`); return; }
    const tuan = /^\d+$/.test(c[0].trim()) ? Number(c[0]) : NaN;
    const soTiet = /^\d+$/.test(c[3].trim()) ? Number(c[3]) : NaN;
    const bai = lamGon(c[2]);
    if (!(tuan >= 1 && tuan <= 35)) { loi.push(`Dòng ${so}: tuần phải là số từ 1 đến 35.`); return; }
    if (!(soTiet >= 1 && soTiet <= 5)) { loi.push(`Dòng ${so}: số tiết phải từ 1 đến 5 (đang là "${c[3].trim()}").`); return; }
    if (!bai) { loi.push(`Dòng ${so}: thiếu tên bài.`); return; }
    dong.push({ tuan, chuDe: lamGon(c[1]), bai, soTiet });
  });
  const tongTiet = dong.reduce((t, d) => t + d.soTiet, 0);
  if (dong.length) {
    for (let i = 1; i < dong.length; i++) {
      if (dong[i].tuan < dong[i - 1].tuan) { canhBao.push(`Tuần giảm ở dòng ${i + 1} (từ tuần ${dong[i - 1].tuan} về tuần ${dong[i].tuan}). Thầy xem thứ tự có đúng không.`); break; }
    }
    const co = new Set(dong.map((d) => d.tuan));
    const thieu = Array.from({ length: 35 }, (_, k) => k + 1).filter((t) => !co.has(t));
    if (thieu.length) canhBao.push(`Chưa có dòng nào cho tuần ${thieu.join(', ')}.`);
    const chuan = subjectId ? MINISTRY_STANDARD_PERIODS_GRADE_4[subjectId]?.standardPeriods : undefined;
    if (chuan && tongTiet !== chuan) canhBao.push(`Tổng ${tongTiet} tiết, chương trình quy định ${chuan} tiết. Có thể AI chép thiếu hoặc thừa, thầy đối chiếu.`);
  }
  return { dong, loi, canhBao, tongTiet };
}

/** Đổi bảng đã duyệt sang dạng sao lưu PPCT HUB để lưu qua đường nhập sẵn có. */
export function taoBackupHub(dong: DongPpct[], subjectId: string, grade: number, academicYear: string): PpctHubBackupFile {
  const gradeId = `grade-${grade}`;
  const topics: PpctHubTopic[] = [];
  const lessons: PpctHubLesson[] = [];
  const periods: PpctHubPeriod[] = [];
  const maChuDe = new Map<string, string>();
  const maBai = new Map<string, { id: string; daDay: number }>();
  let tietChung = 0;
  const pre = `pdf-${subjectId}`;
  for (const d of dong) {
    let tid = maChuDe.get(d.chuDe);
    if (tid === undefined) {
      tid = `${pre}-cd${maChuDe.size + 1}`;
      maChuDe.set(d.chuDe, tid);
      topics.push({ id: tid, subjectId, gradeId, name: d.chuDe, order: maChuDe.size, academicYear, dataSource: 'import_pdf' });
    }
    const khoaBai = `${tid}|${d.bai.toLowerCase()}`;
    let b = maBai.get(khoaBai);
    if (!b) {
      b = { id: `${pre}-b${maBai.size + 1}`, daDay: 0 };
      maBai.set(khoaBai, b);
      lessons.push({ id: b.id, topicId: tid, subjectId, gradeId, title: d.bai, order: maBai.size, academicYear, dataSource: 'import_pdf' });
    }
    for (let k = 0; k < d.soTiet; k++) {
      b.daDay++;
      tietChung++;
      periods.push({
        id: `${pre}-t${tietChung}`, lessonId: b.id, subjectId, gradeId, week: d.tuan, semester: d.tuan <= 18 ? 1 : 2,
        orderInLesson: b.daDay, globalPeriodNumber: tietChung, title: `${d.bai} (Tiết ${b.daDay})`, convertedPeriods: 1,
        academicYear, dataSource: 'import_pdf',
      });
    }
  }
  return { app: 'ThayKhaiEdu-PDF', schemaVersion: 'pdf-1', activeAcademicYear: academicYear, topics, lessons, periods };
}
