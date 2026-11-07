/**
 * ThayKhaiEdu - AI tìm nguồn cho bài đọc đã có chữ nhưng thiếu tác giả, link hoặc tên sách và trang.
 * File này không gọi mạng: chỉ viết lời nhắc và đọc câu trả lời của AI.
 * Link AI đưa ra luôn được máy chủ mở thử và đối chiếu nội dung trước khi dùng.
 */

import { CO_SO_TRANG } from '@/core/reading-passages/quy-dinh';
import { laDuongDanWeb, type BaiDocCanKiem } from '@/core/reading-passages/kiem-tra';

export const HE_THONG_TIM_NGUON =
  'Bạn hỗ trợ tổ chuyên môn khối 4 tìm nguồn gốc thật của một văn bản tiếng Việt dùng làm bài đọc. ' +
  'Chỉ báo nguồn mà bạn thực sự tìm thấy qua tìm kiếm web. Không bịa tác giả, tên sách, số trang hay link. ' +
  'Không chắc thì để trống trường đó và trả daTimThay là false.';

export interface NguonAIDeXuat {
  daTimThay: boolean;
  tacGia: string;
  nguon: string;
  nguonUrl: string;
  doTinCay: 'CAO' | 'TRUNG_BINH' | 'THAP';
  ghiChu: string;
}

const chuoi = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Bài này còn thiếu tác giả hoặc nguồn (link đã kiểm được, hoặc sách in có số trang) không? */
export function thieuNguon(b: Pick<BaiDocCanKiem, 'tacGia' | 'nguon' | 'nguonUrl' | 'trangThaiLink'>): boolean {
  const nguon = b.nguon?.trim() ?? '';
  const url = b.nguonUrl?.trim() ?? '';
  const linkTot = !!url && laDuongDanWeb(url) && b.trangThaiLink === 'CON_TON_TAI';
  const sachTot = !url && !!nguon && CO_SO_TRANG.test(nguon);
  return !b.tacGia?.trim() || !(linkTot || sachTot);
}

/** Lời nhắc: gửi tên bài, tác giả (nếu có), đoạn đầu và đoạn cuối để AI tìm đúng văn bản. */
export function loiNhacTimNguon(b: { tieuDe: string; tacGia?: string; noiDung: string }): string {
  const chu = b.noiDung.replace(/\s+/g, ' ').trim();
  const dau = chu.slice(0, 350);
  const cuoi = chu.length > 700 ? chu.slice(-250) : '';
  return [
    'Tìm nguồn gốc thật của văn bản tiếng Việt sau (dùng làm bài đọc cho học sinh lớp 4).',
    `Tên bài: ${b.tieuDe || '(chưa có)'}`,
    `Tác giả ghi sẵn: ${b.tacGia?.trim() || '(chưa có)'}`,
    `Đoạn đầu: "${dau}"`,
    cuoi ? `Đoạn cuối: "...${cuoi}"` : '',
    'Yêu cầu:',
    '- Dùng công cụ tìm kiếm web, tìm nhiều lần bằng nhiều cách: (1) tên bài kèm "lớp 4" và tên tác giả; (2) một câu nguyên văn trong bài đặt trong ngoặc kép; (3) tên bài kèm "Tiếng Việt 4" cùng tên các bộ sách (Cánh Diều, Chân trời sáng tạo, Kết nối tri thức, sách cũ). Bài hay nằm trong SGK, vở bài tập hoặc sách thiếu nhi.',
    '- Mở trang tìm được và đối chiếu đoạn văn với văn bản trên. Chỉ báo trang hoặc sách thực sự chứa văn bản này, không báo trang chỉ có bài cùng tên.',
    '- Nếu bài nằm trong SGK nhiều bộ sách, ghi rõ tên bộ sách, tập, bài và số trang tìm được.',
    '- Tìm thấy trên web: "nguonUrl" là link đúng trang chứa bài (bỏ tham số utm); "nguon" ghi tên báo, trang web hoặc sách.',
    '- Chỉ biết là từ sách in: "nguon" ghi tên sách, nhà xuất bản, năm, số trang (ví dụ "Tiếng Việt 4, tập một, Cánh Diều, trang 25"); để trống "nguonUrl". Không biết số trang thì không đoán.',
    '- Tác giả ghi sẵn sai thì sửa lại cho đúng; chưa chắc thì để trống.',
    '- Không tìm thấy: "daTimThay": false, các trường còn lại để trống.',
    'Trả về một đối tượng JSON, không kèm lời giải thích:',
    '{"daTimThay": true, "tacGia": "", "nguon": "", "nguonUrl": "", "doTinCay": "CAO | TRUNG_BINH | THAP", "ghiChu": "nói ngắn gọn đã tìm thấy ở đâu"}',
  ].filter(Boolean).join('\n');
}

/** Đọc câu trả lời của AI (hay bọc trong ```json). Không đúng dạng thì trả null. */
export function docNguonAI(traLoi: string): NguonAIDeXuat | null {
  const bo = traLoi.replace(/```(?:json)?/gi, '');
  const dau = bo.indexOf('{');
  const cuoi = bo.lastIndexOf('}');
  if (dau < 0 || cuoi <= dau) return null;
  let x: Record<string, unknown>;
  try {
    x = JSON.parse(bo.slice(dau, cuoi + 1));
  } catch {
    return null;
  }
  const tin = chuoi(x.doTinCay).toUpperCase();
  const r: NguonAIDeXuat = {
    daTimThay: x.daTimThay === true,
    tacGia: chuoi(x.tacGia),
    nguon: chuoi(x.nguon),
    nguonUrl: chuoi(x.nguonUrl),
    doTinCay: tin === 'CAO' || tin === 'TRUNG_BINH' ? tin : 'THAP',
    ghiChu: chuoi(x.ghiChu),
  };
  // AI nói tìm thấy nhưng không đưa gì dùng được thì coi như không tìm thấy
  if (!r.tacGia && !r.nguon && !r.nguonUrl) r.daTimThay = false;
  return r;
}
