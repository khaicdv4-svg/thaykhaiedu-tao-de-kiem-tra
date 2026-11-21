/**
 * ThayKhaiEdu - Mẫu đề của tổ: mỗi môn một file Word mẫu (Tiếng Việt: Đọc, Viết, hướng dẫn chấm chung một file),
 * dùng chung cho cả 4 kì. Tải bản mới là bản mới được dùng; bản cũ vẫn giữ trong lịch sử.
 *
 * Lưu ở bảng exam_templates (đã có sẵn) và kho file "exam-templates":
 *  - subject_id: mã môn trong bảng subjects (subj-toan4…), assessment_period: 'TAT_CA'
 *  - header_layout: { o: mã ô mẫu, cau_truc: khối đoạn văn / bảng để xem lại, thong_so }
 *  - validation_status: 'VALIDATED' = còn dùng được; 'DEPRECATED' = đã bỏ
 *
 * Phần thuần (không đọc ghi cơ sở dữ liệu) để dùng được cả ở trình duyệt và máy chủ.
 */

import { docTepTrongZip } from '@/core/utils/docx-text';

export type MaOMau = 'TOAN' | 'TIENG_VIET' | 'KHOA_HOC' | 'LS_DL' | 'CONG_NGHE';

export const O_MAU: { ma: MaOMau; ten: string; maMon: string; moTa: string }[] = [
  { ma: 'TOAN', ten: 'Toán', maMon: 'TOAN', moTa: 'Đề Toán' },
  { ma: 'TIENG_VIET', ten: 'Tiếng Việt', maMon: 'TIENG_VIET', moTa: 'Đọc hiểu, Viết, đọc thành tiếng và hướng dẫn chấm trong một file' },
  { ma: 'KHOA_HOC', ten: 'Khoa học', maMon: 'KHOA_HOC', moTa: 'Đề Khoa học' },
  { ma: 'LS_DL', ten: 'Lịch sử và Địa lí', maMon: 'LS_DL', moTa: 'Đề Lịch sử và Địa lí' },
  { ma: 'CONG_NGHE', ten: 'Công nghệ', maMon: 'CONG_NGHE', moTa: 'Đề Công nghệ' },
];

/** Mã môn của app → mã môn trong bảng subjects (khối 4) */
export const MA_SUBJECT_K4: Record<string, string> = {
  TOAN: 'subj-toan4',
  TIENG_VIET: 'subj-tv4',
  KHOA_HOC: 'subj-kh4',
  LS_DL: 'subj-lsdl4',
  CONG_NGHE: 'subj-cn4',
};

export const laOMau = (s: unknown): s is MaOMau => typeof s === 'string' && O_MAU.some((o) => o.ma === s);

const chuan = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Đoán ô mẫu từ tên file (và thư mục). Không chắc thì trả null để thầy cô chọn. */
export function doanOMau(duongDan: string): MaOMau | null {
  const t = chuan(duongDan);
  if (/tieng viet|\btv\b/.test(t)) return 'TIENG_VIET';
  if (/\btoan\b/.test(t)) return 'TOAN';
  if (/khoa hoc|\bkh\b/.test(t)) return 'KHOA_HOC';
  if (/lich su|dia li|dia ly|ls ?(&|va)? ?dl|\blsdl\b|su ?dia/.test(t)) return 'LS_DL';
  if (/cong nghe|\bcn\b/.test(t)) return 'CONG_NGHE';
  return null;
}

export interface ThongSoTrang {
  /** Khổ giấy đoán từ kích thước trang */
  khoGiay: string;
  /** Lề trang (mm) */
  le: { top: number; bottom: number; left: number; right: number };
  /** Phông, cỡ chữ mặc định của file (pt) */
  phong: string | null;
  coChu: number | null;
  ngang: boolean;
}

const twipSangMm = (t: number) => Math.round((t / 1440) * 25.4 * 10) / 10;

function thuocTinh(xml: string, the: string, ten: string): number | null {
  const m = xml.match(new RegExp(`<w:${the}\\b[^>]*\\bw:${ten}="(-?\\d+)"`));
  return m ? Number(m[1]) : null;
}

/** Đọc khổ giấy, lề, phông và cỡ chữ mặc định từ document.xml và styles.xml. */
export function thongSoTuXml(documentXml: string, stylesXml: string | null): ThongSoTrang {
  // Lấy sectPr cuối (khổ trang của cả tài liệu)
  const sect = documentXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)?.pop() ?? '';
  const rong = thuocTinh(sect, 'pgSz', 'w') ?? 11906;
  const cao = thuocTinh(sect, 'pgSz', 'h') ?? 16838;
  const ngang = /w:orient="landscape"/.test(sect) || rong > cao;
  const [nho, lon] = [Math.min(rong, cao), Math.max(rong, cao)];
  const gan = (a: number, b: number) => Math.abs(a - b) < 200;
  const khoGiay = gan(nho, 11906) && gan(lon, 16838) ? 'A4' : gan(nho, 12240) && gan(lon, 15840) ? 'Letter' : gan(nho, 8391) && gan(lon, 11906) ? 'A5' : `${twipSangMm(nho)} × ${twipSangMm(lon)} mm`;
  const le = {
    top: twipSangMm(thuocTinh(sect, 'pgMar', 'top') ?? 1134),
    bottom: twipSangMm(thuocTinh(sect, 'pgMar', 'bottom') ?? 1134),
    left: twipSangMm(thuocTinh(sect, 'pgMar', 'left') ?? 1134),
    right: twipSangMm(thuocTinh(sect, 'pgMar', 'right') ?? 1134),
  };
  let phong: string | null = null;
  let coChu: number | null = null;
  if (stylesXml) {
    const mac = stylesXml.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] ?? '';
    const thuong = stylesXml.match(/<w:style\b[^>]*w:styleId="Normal"[\s\S]*?<\/w:style>/)?.[0] ?? '';
    for (const x of [thuong, mac]) {
      phong ??= x.match(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/)?.[1] ?? null;
      const sz = x.match(/<w:sz\b[^>]*w:val="(\d+)"/)?.[1];
      if (coChu === null && sz) coChu = Number(sz) / 2;
    }
  }
  // Phông, cỡ chữ ghi trực tiếp trong đoạn văn thường gặp hơn mặc định: lấy cái xuất hiện nhiều nhất
  const dem = (re: RegExp) => {
    const m = new Map<string, number>();
    for (const x of documentXml.matchAll(re)) m.set(x[1], (m.get(x[1]) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const phongNhieu = dem(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/g);
  const szNhieu = dem(/<w:sz\b[^>]*w:val="(\d+)"/g);
  return {
    khoGiay,
    le,
    phong: phongNhieu ?? phong,
    coChu: szNhieu ? Number(szNhieu) / 2 : coChu,
    ngang,
  };
}

export async function docThongSoDocx(buf: ArrayBuffer): Promise<ThongSoTrang> {
  const doc = await docTepTrongZip(buf, 'word/document.xml');
  if (!doc) throw new Error('Không tìm thấy nội dung trong file .docx.');
  const styles = await docTepTrongZip(buf, 'word/styles.xml');
  return thongSoTuXml(new TextDecoder().decode(doc), styles ? new TextDecoder().decode(styles) : null);
}

/**
 * File Word cũ (.doc): chỉ đọc được chữ (thư viện word-extractor), không có lề, phông, khung bảng.
 * Đổi chữ thành các đoạn văn để xem trước: ô bảng (dấu Tab) cách nhau bằng khoảng trắng, bỏ dòng trống lặp.
 */
export function doanVanTuChuDoc(chu: string): { loai: 'doan'; chu: string }[] {
  const out: { loai: 'doan'; chu: string }[] = [];
  let trongTruoc = true;
  for (const d of chu.replace(/\r\n?/g, '\n').split('\n')) {
    const dong = d.replace(/\t+/g, '     ').replace(/[ \u00a0]+$/g, '').replace(/^\s+(?=\S)/, (m) => (m.length > 8 ? '        ' : m));
    const trong = !dong.trim();
    if (trong && trongTruoc) continue;
    out.push({ loai: 'doan', chu: trong ? '' : dong });
    trongTruoc = trong;
  }
  while (out.length && !out[out.length - 1].chu) out.pop();
  return out;
}

export const laFileDocCu = (tenFile: string) => /\.doc$/i.test(tenFile);
