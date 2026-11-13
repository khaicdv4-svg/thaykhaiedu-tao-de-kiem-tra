/**
 * AI gợi ý hướng dẫn chấm chi tiết cho một câu: lời giải từng bước, điểm từng ý, lưu ý chấm.
 * AI chỉ dựa vào đề bài và đáp án thầy đã nhập, không đổi đáp án. Kết quả hiện ở ô gợi ý, thầy kiểm tra rồi mới dùng.
 */
import type { CauDe } from '@/core/de/de';
import { DAN_AI_PHAN_SO } from '@/core/de/phan-so';

export const HE_THONG_GOI_Y_CHAM = `Bạn là giáo viên tiểu học Việt Nam viết hướng dẫn chấm cho đề kiểm tra lớp 4.
Quy tắc bắt buộc:
- Chỉ dựa vào đề bài và đáp án giáo viên đã cho. KHÔNG đổi đáp án. Nếu nghi đáp án của giáo viên sai, ghi dòng đầu "LƯU Ý: ..." nói rõ nghi ngờ ở đâu, vẫn viết hướng dẫn theo đáp án của giáo viên.
- Viết từng bước làm bằng câu ngắn, từ ngữ quen thuộc với học sinh miền Nam, tiếng Việt chuẩn, không văn máy.
- Mỗi dòng là một bước hoặc một ý cho điểm và kết thúc bằng điểm trong ngoặc, ví dụ "Đổi 3 tấn = 3 000 kg (0,5 điểm)".
- Điểm chia theo bước 0,5 (câu 0,5 điểm thì một ý). Tổng điểm các ý ĐÚNG bằng số điểm của câu.
- Dòng cuối (nếu có): "Lưu ý chấm: ..." nêu cách xử lí lỗi thường gặp (sai phép tính nhưng đúng cách làm, thiếu đơn vị, thiếu đáp số, cách làm khác đúng).
- Toán: ghi rõ phép tính, kết quả từng bước và đáp số có đơn vị. Không dùng định dạng Markdown, không dùng dấu *, #. ${DAN_AI_PHAN_SO}
- Chỉ trả về nội dung hướng dẫn chấm, không lời dẫn.`;

export function loiNhacGoiYCham(p: { tenMon: string; c: Pick<CauDe, 'deBai' | 'luaChon' | 'dapAn' | 'diem' | 'dang' | 'hinhThuc' | 'muc' | 'yccd'> }): string {
  const { c } = p;
  const lc = c.luaChon.some((x) => x.trim()) ? `\nPhương án: ${c.luaChon.map((x, i) => `${'ABCD'[i] ?? i + 1}. ${x}`).join(' | ')}` : '';
  return `Môn ${p.tenMon} lớp 4. Câu ${c.hinhThuc === 'TL' ? 'tự luận' : 'trắc nghiệm'}, mức ${c.muc}, ${String(c.diem).replace('.', ',')} điểm.${c.yccd ? `\nYCCĐ: ${c.yccd}` : ''}
Đề bài: ${c.deBai}${lc}
Đáp án của giáo viên: ${c.dapAn}
Viết hướng dẫn chấm chi tiết.`;
}

/** Tổng các điểm ghi dạng "(0,5 điểm)" trong hướng dẫn, bỏ phần "Lưu ý chấm". */
export function tongDiemTrongHuongDan(text: string): number {
  const chinh = text.split(/\n/).filter((d) => !/^\s*(lưu ý|ghi chú)/i.test(d)).join('\n');
  let t = 0;
  for (const m of chinh.matchAll(/\((\d+(?:[.,]\d+)?)\s*điểm\)/gi)) t += Number(m[1].replace(',', '.'));
  return Math.round(t * 100) / 100;
}

export function lamSachGoiY(text: string): string {
  return text.replace(/```[a-z]*\n?/g, '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
}
