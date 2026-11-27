/**
 * Kho sách giáo khoa (SGK) và sách giáo viên (SGV): tra đúng trang theo đặc tả, dựng lời nhắc cho AI soạn câu và đối chiếu.
 * Hàm thuần, không đọc ghi cơ sở dữ liệu. AI chỉ được dùng chữ của những trang tra được; không có thì nói thẳng là thiếu căn cứ.
 */
import { boNhanPhuongAn, chuanHoaPhanSo, DAN_AI_PHAN_SO } from '@/core/de/phan-so';
import { quyTacTheoMon } from '@/core/de/quy-tac-soan-de';
import { huongDanTheoDang } from '@/core/de/dang-bai';

const chuanHoaTen = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();

export interface TrangSach { trang: number; noiDung: string }
export interface MucLucTra { tap: number; baiSo: number; tuan: number | null; trang: number }
export interface KhoangTrang { tap: number | null; tu: number; den: number; nguon: 'DAC_TA' | 'MUC_LUC' }

export const TOI_DA_TRANG_MOT_CAU = 6;
export const TOI_DA_KY_TU_TRANG = 2600;

/** "tr. 45", "tr. 45–46", "trang 45 - 47", "45" → [tu, den]. Không đọc được thì null. */
export function phanTichTrangSgk(s: string | null | undefined): [number, number] | null {
  const m = /(\d{1,3})(?:\s*(?:–|-|—|đến|->)\s*(\d{1,3}))?/i.exec((s ?? '').replace(/\./g, ' '));
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  if (a < 1 || b < a || b - a > 12) return null;
  return [a, b];
}

const soBai = (s: string | null | undefined) => /(?:^|[^\p{L}\d])bài\s*(\d+)\b/iu.exec(s ?? '')?.[1];

/**
 * Trang SGK của một câu trong đặc tả: ưu tiên ô "Trang SGK" thầy đã điền; không có thì suy từ mục lục theo số bài
 * (trang đầu của bài đến trước trang đầu của bài kế tiếp). Không suy ra được thì null.
 */
export function khoangTrangCuaCau(p: { baiHoc: string; trangSgk: string; tuan: number | null }, mucLuc: MucLucTra[]): KhoangTrang | null {
  const ghi = phanTichTrangSgk(p.trangSgk);
  const n = soBai(p.baiHoc);
  const dongBai = n ? mucLuc.filter((m) => String(m.baiSo) === n) : [];
  let tap: number | null = null;
  if (dongBai.length) {
    const theoTap = new Map<number, MucLucTra[]>();
    for (const d of dongBai) theoTap.set(d.tap, [...(theoTap.get(d.tap) ?? []), d]);
    const khop = [...theoTap.entries()].find(([, ds]) => p.tuan !== null && ds.some((d) => d.tuan === p.tuan));
    tap = (khop ?? [...theoTap.entries()][0])[0];
  }
  if (ghi) return { tap, tu: ghi[0], den: Math.min(ghi[1], ghi[0] + TOI_DA_TRANG_MOT_CAU - 1), nguon: 'DAC_TA' };
  if (!dongBai.length || tap === null) return null;
  const cua = dongBai.filter((d) => d.tap === tap);
  const tu = Math.min(...cua.map((d) => d.trang));
  const sau = mucLuc.filter((m) => m.tap === tap && m.baiSo > Number(n)).map((m) => m.trang).filter((t) => t > tu);
  const den = sau.length ? Math.min(...sau) - 1 : tu + 3;
  return { tap, tu, den: Math.max(tu, Math.min(den, tu + TOI_DA_TRANG_MOT_CAU - 1)), nguon: 'MUC_LUC' };
}

/** Trang sách → trang trong file PDF, khi trang số 1 của sách nằm ở trang `trangDauPdf` của file. */
export const trangPdfTuTrangSach = (trangSach: number, trangDauPdf: number) => trangSach + trangDauPdf - 1;
export const trangSachTuTrangPdf = (trangPdf: number, trangDauPdf: number) => trangPdf - trangDauPdf + 1;

/** SGV đánh số trang riêng: tìm các trang nhắc tên bài (nhiều lần nhất trước), lấy liền kề trang đầu tiên khớp. */
export function chonTrangSgv(trangs: TrangSach[], baiHoc: string, toiDa = 4): TrangSach[] {
  const ten = chuanHoaTen(baiHoc.replace(/^\s*bài\s*\d+\s*[.:\-–]?\s*/i, ''));
  if (ten.length < 4) return [];
  const diem = trangs.map((t) => ({ t, d: (chuanHoaTen(t.noiDung).split(ten).length - 1) })).filter((x) => x.d > 0);
  if (!diem.length) return [];
  const tot = [...diem].sort((a, b) => b.d - a.d || a.t.trang - b.t.trang)[0];
  return trangs.filter((t) => t.trang >= tot.t.trang && t.trang < tot.t.trang + toiDa);
}

/** Gộp chữ các trang thành một khối có ghi số trang, mỗi trang cắt ngắn để vừa lời nhắc. */
export function gopTrang(nhan: string, trangs: TrangSach[], gioiHan = TOI_DA_KY_TU_TRANG): string {
  return trangs
    .filter((t) => t.noiDung.trim())
    .map((t) => `[${nhan} trang ${t.trang}]\n${t.noiDung.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, gioiHan)}`)
    .join('\n\n');
}

export interface BaiSgkChu { soBai: string; ten: string; trangTu: number; trangDen: number; noiDung: string }
export const TOI_DA_BAI_SGK = 3;
export const GHI_CHU_OCR = 'Chữ SGK ở đây do máy quét đọc từ ảnh, chưa được kiểm; phân số, công thức, bảng và hình có thể bị thiếu hoặc sai. Không suy đoán phần thiếu.';

/** Chữ SGK theo từng bài (kho SGK chung), chọn các bài giao với khoảng trang [tu, den], tối đa 3 bài. */
export function gopBaiSgk(bais: BaiSgkChu[], tu: number, den: number, gioiHan = TOI_DA_KY_TU_TRANG): string {
  return bais
    .filter((b) => b.noiDung.trim() && b.trangTu <= den && b.trangDen >= tu)
    .sort((a, b) => a.trangTu - b.trangTu)
    .slice(0, TOI_DA_BAI_SGK)
    .map((b) => `[SGK ${b.soBai ? `Bài ${b.soBai} ` : ''}${b.ten}, tr. ${b.trangTu}–${b.trangDen}]\n${b.noiDung.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, gioiHan)}`)
    .join('\n\n');
}

export interface NguCanhSach {
  sgk: string;
  sgv: string;
  khoang: KhoangTrang | null;
  trangSgkCoChu: number[];
  thieu: string[];
}

// --- Lời nhắc AI -----------------------------------------------------------------------------------------------

export const HE_THONG_SOAN_CAU_TU_SACH = `Bạn là giáo viên tiểu học Việt Nam soạn MỘT câu cho đề kiểm tra định kì lớp 4, bám sát sách giáo khoa.
Quy tắc bắt buộc:
- Tuân thủ "QUY TẮC CỦA TỔ KHỐI 4" ghi cuối yêu cầu: mức độ, số liệu đúng tầm lớp 4, giới hạn kĩ thuật của kì. Đây là quy định bắt buộc của tổ chuyên môn.
- Chỉ dùng kiến thức, số liệu, ngữ liệu có trong các trang sách được cung cấp ("SGK") hoặc kiến thức cơ bản của đúng bài đó. TUYỆT ĐỐI không bịa nội dung sách. Nếu các trang không đủ để soạn đúng yêu cầu, trả JSON có "khongDuCanCu": true và giải thích ngắn ở "ghiChu".
- KHÔNG chép nguyên bài tập, câu hỏi, đoạn văn có trong sách. Đổi số liệu, tình huống, tên gọi nhưng giữ đúng yêu cầu cần đạt, mức độ và dạng bài.
- Đúng yêu cầu cần đạt, mức độ, dạng câu và điểm trong yêu cầu. Câu ngắn, từ ngữ quen thuộc với học sinh miền Nam, không đánh đố.
- Trắc nghiệm nhiều lựa chọn: đúng 4 phương án, chỉ MỘT đáp án đúng, các phương án gây nhiễu hợp lí, độ dài tương đương. Đúng sai: mỗi ý một nhận định, đáp án là chuỗi Đ/S theo thứ tự ý.
- Sách giáo viên ("SGV") nếu có chỉ để tham khảo cách hiểu bài và gợi ý đáp án; không chép lời giải của sách.
- Toán: tính lại đáp án thật cẩn thận; "dapAn" ghi kết quả từng ý (ví dụ: a) 29 475; b) 434 382). Không dùng định dạng Markdown.
- Câu có nhiều ý a), b), c)…: soạn đủ số ý được yêu cầu, không bớt ý.
- "huongDanCham" (câu tự luận) viết ngắn gọn theo cách tính điểm: điểm từng ý, phần nào được bao nhiêu điểm, trường hợp đúng một phần. KHÔNG diễn giải từng bước tính (không viết kiểu "6 cộng 9 bằng 15, viết 5 nhớ 1"). ${DAN_AI_PHAN_SO}
- Phương án viết thẳng nội dung, KHÔNG ghi sẵn chữ cái "A.", "B." ở đầu.
- Chỉ trả về MỘT khối JSON, không lời dẫn: {"deBai": string, "luaChon": string[], "dapAn": string, "huongDanCham": string, "khongDuCanCu": boolean, "ghiChu": string}.
  luaChon: 4 phương án (NLC) hoặc các ý (Đúng sai) hoặc [] cho dạng khác. huongDanCham: cách cho điểm từng ý (không diễn giải từng bước tính) cho câu tự luận, "" cho trắc nghiệm.`;

export const HE_THONG_DOI_CHIEU_SACH = `Bạn là giáo viên tiểu học Việt Nam kiểm tra MỘT câu của đề kiểm tra lớp 4 so với sách giáo khoa.
Quy tắc bắt buộc:
- Chỉ căn cứ vào các trang sách được cung cấp ("SGK", "SGV") và yêu cầu cần đạt. Nếu các trang không đủ căn cứ cho một mục, ghi "khong_du_can_cu", KHÔNG đoán.
- Kiểm tra: (1) nội dung câu có nằm trong phạm vi bài và trang đã cho không; (2) kiến thức, số liệu, tên riêng, định nghĩa trong câu có khớp sách không; (3) đáp án của giáo viên có đúng không (Toán: tính lại); (4) câu có chép nguyên bài tập, câu hỏi hoặc đoạn văn trong sách không.
- Ở mỗi nhận xét nêu rõ trang sách làm căn cứ. Ngắn gọn, không văn máy, không dùng Markdown.
- KHÔNG sửa đề, KHÔNG đổi đáp án. Chỉ nhận xét và gợi ý để giáo viên quyết định.
- Chỉ trả về MỘT khối JSON, không lời dẫn: {"trongPhamVi": "co"|"khong"|"khong_du_can_cu", "khopSach": "co"|"khong"|"khong_du_can_cu", "dapAnDung": "co"|"khong"|"khong_du_can_cu", "chepNguyenSach": "co"|"khong"|"khong_du_can_cu", "nhanXet": string[], "goiY": string}.`;

export interface CauChoAI {
  tenMon: string; dang: string | null; hinhThuc: string; muc: number; diem: number; yccd: string; baiHoc: string; trangSgk: string;
  deBai?: string; luaChon?: string[]; dapAn?: string; huongDanCham?: string; yeuCauHinh?: string; ghiChuThay?: string;
  /** Dạng bài cụ thể giáo viên chọn ở đặc tả (thu hẹp YCCĐ). Bắt buộc theo. */
  dangBai?: string;
  /** Các ý nhỏ của câu theo ma trận, ví dụ ['a', 'b', 'c', 'd']. */
  yNho?: string[] | null;
  /** Mã môn, kì, tuần: để đưa quy tắc số liệu, giới hạn kĩ thuật đúng giai đoạn. */
  maMon?: string | null;
  ky?: string | null;
  tuan?: number | null;
  /** Khối lớp của đề; thiếu thì coi là khối 4 */
  khoi?: number;
}

/** Câu có từ hai ý trở lên: nhắc AI soạn đủ ý, chia điểm, ý ứng với YCCĐ nào. */
function moTaYNho(c: CauChoAI): string {
  const y = c.yNho ?? [];
  if (y.length < 2) return '';
  const nhan = y.map((x) => `${x})`).join(', ');
  const moiY = Math.round((c.diem / y.length) * 100) / 100;
  const nhieuYccd = c.yccd.includes(';');
  return `\nCâu gồm ĐÚNG ${y.length} ý: ${nhan}. BẮT BUỘC soạn đủ ${y.length} ý, mỗi ý một dòng, mở đầu bằng ${nhan.replace(/, /g, ' / ')}.`
    + `${c.dang === 'DS' ? ' Mỗi ý là một nhận định trong "luaChon".' : ''} Điểm mỗi ý khoảng ${String(moiY).replace('.', ',')} điểm (tổng ${String(c.diem).replace('.', ',')} điểm).`
    + `${nhieuYccd ? ' Câu có nhiều YCCĐ (ngăn bởi dấu ;): chia các ý cho đủ các YCCĐ đó, theo thứ tự.' : ''}`;
}

/** Đếm số ý a), b)… trong đề bài (hoặc số nhận định với câu Đúng sai). */
export function soYTrongCau(deBai: string, luaChon: string[], dang: string | null): number {
  if (dang === 'DS') return luaChon.filter((x) => x.trim()).length;
  return new Set([...deBai.matchAll(/(?:^|[\s\n(])([a-h])\)/g)].map((m) => m[1])).size;
}

/** Dạng bài giáo viên chọn: yêu cầu bắt buộc, kèm cách trình bày của các dạng hay gặp. */
function moTaDangBai(c: CauChoAI): string {
  const d = c.dangBai?.trim();
  if (!d) return '';
  const them = huongDanTheoDang(d);
  return `\nDẠNG BÀI BẮT BUỘC (giáo viên chọn ở đặc tả): ${d}. Chỉ soạn đúng dạng này trong YCCĐ, không đổi sang dạng khác dù YCCĐ rộng hơn.${them ? `\n${them}` : ''}`;
}

function mota(c: CauChoAI): string {
  const lc = c.luaChon?.some((x) => x.trim()) ? `\nPhương án/ý: ${c.luaChon.map((x, i) => `${'ABCD'[i] ?? i + 1}. ${x}`).join(' | ')}` : '';
  const khoi = c.khoi ?? 4;
  return `Môn ${c.tenMon} lớp ${khoi}. Câu ${c.hinhThuc === 'TL' ? 'tự luận' : 'trắc nghiệm'}${c.dang ? ` (dạng ${c.dang})` : ''}, mức ${c.muc}, ${String(c.diem).replace('.', ',')} điểm.
Yêu cầu cần đạt: ${c.yccd || '(chưa ghi)'}
Bài: ${c.baiHoc || '(chưa ghi)'}${c.trangSgk ? `, ${c.trangSgk}` : ''}${moTaDangBai(c)}${moTaYNho(c)}${c.yeuCauHinh ? `\nHình kèm theo (theo đặc tả): ${c.yeuCauHinh}` : ''}${c.ghiChuThay ? `\nYÊU CẦU RIÊNG CỦA GIÁO VIÊN CHO CÂU NÀY (bắt buộc theo đúng dạng bài này; YCCĐ rộng hơn thì chỉ soạn phần khớp yêu cầu, không đổi sang dạng khác): ${c.ghiChuThay}` : ''}${c.deBai ? `\nĐề bài: ${c.deBai}` : ''}${lc}${c.dapAn ? `\nĐáp án của giáo viên: ${c.dapAn}` : ''}${c.huongDanCham ? `\nHướng dẫn chấm: ${c.huongDanCham}` : ''}

QUY TẮC CỦA TỔ KHỐI ${khoi} (bắt buộc tuân theo):
${quyTacTheoMon({ maMon: c.maMon, tenMon: c.tenMon, ky: c.ky, muc: c.muc, tuan: c.tuan, khoi })}`;
}

export function loiNhacSoanCau(c: CauChoAI, ngu: Pick<NguCanhSach, 'sgk' | 'sgv'>): string {
  return `${mota(c)}\n\nCác trang sách tra được theo bài, trang trong đặc tả:\n${ngu.sgk || '(không có trang SGK)'}\n${ngu.sgv ? `\n${ngu.sgv}` : ''}\n\nSoạn câu theo đúng yêu cầu trên.`;
}

export function loiNhacDoiChieu(c: CauChoAI, ngu: Pick<NguCanhSach, 'sgk' | 'sgv'>): string {
  return `${mota(c)}\n\nCác trang sách tra được theo bài, trang trong đặc tả:\n${ngu.sgk || '(không có trang SGK)'}\n${ngu.sgv ? `\n${ngu.sgv}` : ''}\n\nĐối chiếu câu trên với sách.`;
}

function layJson(t: string): Record<string, unknown> | null {
  const s = t.replace(/```[a-z]*\n?/gi, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { const j = JSON.parse(s.slice(a, b + 1)); return j && typeof j === 'object' ? (j as Record<string, unknown>) : null; } catch { return null; }
}
const chu = (x: unknown) => (typeof x === 'string' ? chuanHoaPhanSo(x.replace(/\*\*/g, '')).trim() : '');
const phuongAn = (x: unknown) => boNhanPhuongAn(chu(x));

export interface CauAISoan { deBai: string; luaChon: string[]; dapAn: string; huongDanCham: string; khongDuCanCu: boolean; ghiChu: string; cacDe?: { deBai: string; huongDanCham: string }[] }
export function docCauAISoan(traLoi: string): CauAISoan | null {
  const j = layJson(traLoi);
  if (!j) return null;
  const khong = j.khongDuCanCu === true;
  const deBai = chu(j.deBai);
  if (!khong && !deBai) return null;
  const cacDe = Array.isArray(j.cacDe)
    ? (j.cacDe as unknown[]).map((x) => (x && typeof x === 'object' ? x as Record<string, unknown> : {})).map((x) => ({ deBai: chu(x.deBai), huongDanCham: chu(x.huongDanCham) })).filter((x) => x.deBai).slice(0, 2)
    : [];
  return { deBai, luaChon: Array.isArray(j.luaChon) ? j.luaChon.map(phuongAn) : [], dapAn: chu(j.dapAn), huongDanCham: chu(j.huongDanCham), khongDuCanCu: khong, ghiChu: chu(j.ghiChu), ...(cacDe.length ? { cacDe } : {}) };
}

export type KetLuan = 'co' | 'khong' | 'khong_du_can_cu';
export interface KetQuaDoiChieu { trongPhamVi: KetLuan; khopSach: KetLuan; dapAnDung: KetLuan; chepNguyenSach: KetLuan; nhanXet: string[]; goiY: string }
const kl = (x: unknown): KetLuan => (x === 'co' || x === 'khong' ? x : 'khong_du_can_cu');
export function docKetQuaDoiChieu(traLoi: string): KetQuaDoiChieu | null {
  const j = layJson(traLoi);
  if (!j) return null;
  return {
    trongPhamVi: kl(j.trongPhamVi), khopSach: kl(j.khopSach), dapAnDung: kl(j.dapAnDung), chepNguyenSach: kl(j.chepNguyenSach),
    nhanXet: Array.isArray(j.nhanXet) ? j.nhanXet.map(chu).filter(Boolean).slice(0, 8) : [], goiY: chu(j.goiY),
  };
}

/** Soạn NHIỀU câu cùng yêu cầu cần đạt để bổ sung ngân hàng câu hỏi. */
export const HE_THONG_SOAN_NHIEU_CAU = `Bạn là giáo viên tiểu học Việt Nam soạn NHIỀU câu cho ngân hàng câu hỏi lớp 4, bám sát sách giáo khoa.
Quy tắc bắt buộc:
- Tuân thủ "QUY TẮC CỦA TỔ KHỐI 4" ghi cuối yêu cầu: mức độ, số liệu đúng tầm lớp 4, giới hạn kĩ thuật của kì. Đây là quy định bắt buộc của tổ chuyên môn.
- Chỉ dùng kiến thức, số liệu, ngữ liệu có trong các trang sách được cung cấp ("SGK") hoặc kiến thức cơ bản của đúng bài đó. TUYỆT ĐỐI không bịa nội dung sách. Nếu các trang không đủ để soạn, trả {"khongDuCanCu": true, "ghiChu": "..."}.
- KHÔNG chép nguyên bài tập, câu hỏi, đoạn văn trong sách. Các câu phải KHÁC NHAU rõ rệt về tình huống, số liệu hoặc cách hỏi, không lặp ý nhau.
- Đúng yêu cầu cần đạt, mức độ, dạng câu. Câu ngắn, từ ngữ quen thuộc với học sinh miền Nam, không đánh đố.
- Trắc nghiệm nhiều lựa chọn: đúng 4 phương án, chỉ MỘT đáp án đúng, phương án gây nhiễu hợp lí, độ dài tương đương. Đúng sai: mỗi ý một nhận định, đáp án là chuỗi Đ/S theo thứ tự ý.
- Toán: tính lại đáp án thật cẩn thận. Không dùng định dạng Markdown. ${DAN_AI_PHAN_SO}
- "huongDanCham" viết ngắn gọn theo cách tính điểm từng ý, KHÔNG diễn giải từng bước tính.
- Phương án viết thẳng nội dung, KHÔNG ghi sẵn chữ cái "A.", "B." ở đầu.
- Chỉ trả về MỘT khối JSON, không lời dẫn: {"cau": [{"deBai": string, "luaChon": string[], "dapAn": string, "huongDanCham": string}], "khongDuCanCu": boolean, "ghiChu": string}.
  luaChon: 4 phương án (NLC) hoặc các ý (Đúng sai) hoặc [] cho dạng khác. huongDanCham: cách cho điểm từng ý (không diễn giải từng bước tính) cho câu tự luận, "" cho trắc nghiệm.`;

export function loiNhacSoanNhieuCau(c: CauChoAI, soCau: number, ngu: Pick<NguCanhSach, 'sgk' | 'sgv'>): string {
  return `${mota(c)}\n\nCác trang sách tra được:\n${ngu.sgk || '(không có trang SGK)'}\n${ngu.sgv ? `\n${ngu.sgv}` : ''}\n\nSoạn đúng ${soCau} câu khác nhau theo yêu cầu trên.`;
}

export interface KetQuaSoanNhieu { cau: CauAISoan[]; khongDuCanCu: boolean; ghiChu: string }
export function docNhieuCauAISoan(traLoi: string): KetQuaSoanNhieu | null {
  const j = layJson(traLoi);
  if (!j) return null;
  const khong = j.khongDuCanCu === true;
  const ds = Array.isArray(j.cau) ? j.cau : [];
  const cau = ds
    .map((x): CauAISoan | null => (x && typeof x === 'object'
      ? { deBai: chu((x as any).deBai), luaChon: Array.isArray((x as any).luaChon) ? (x as any).luaChon.map(phuongAn) : [], dapAn: chu((x as any).dapAn), huongDanCham: chu((x as any).huongDanCham), khongDuCanCu: false, ghiChu: '' }
      : null))
    .filter((x): x is CauAISoan => !!x && !!x.deBai);
  if (!khong && !cau.length) return null;
  return { cau, khongDuCanCu: khong, ghiChu: chu(j.ghiChu) };
}

/** Viết lại MỘT câu theo ý giáo viên (dễ hiểu hơn, đáp án ngắn hơn, đổi số liệu…). */
export const HE_THONG_VIET_LAI_CAU = `Bạn là giáo viên tiểu học Việt Nam chỉnh sửa MỘT câu của đề kiểm tra lớp 4 theo đúng yêu cầu của giáo viên.
Quy tắc bắt buộc:
- Chỉ sửa theo yêu cầu của giáo viên. Giữ nguyên yêu cầu cần đạt, mức độ, dạng câu và số phương án, trừ khi giáo viên yêu cầu đổi.
- Không bịa kiến thức. Nếu yêu cầu làm câu sai kiến thức hoặc không còn đúng yêu cầu cần đạt, vẫn viết lại nhưng ghi cảnh báo ngắn ở "ghiChu".
- Đổi đề bài hay số liệu thì TÍNH LẠI đáp án và hướng dẫn chấm cho khớp (Toán: ghi phép tính). Trắc nghiệm: đúng 4 phương án, chỉ MỘT đáp án đúng.
- Giữ nguyên số điểm của câu; tổng điểm trong hướng dẫn chấm phải bằng đúng số điểm của câu. Hướng dẫn chấm viết theo cách cho điểm (điểm từng phép tính, từng ý), không diễn giải từng bước tính.
- Tuân thủ "QUY TẮC CỦA TỔ KHỐI 4" trong yêu cầu, nhất là số liệu đúng tầm lớp 4 và giới hạn kĩ thuật của kì.
- Câu ngắn, từ ngữ quen thuộc với học sinh miền Nam. Không dùng định dạng Markdown. Giữ nguyên các dòng "[Hình n]" nếu có. ${DAN_AI_PHAN_SO} Phương án viết thẳng nội dung, không ghi sẵn chữ cái "A.", "B." ở đầu.
- Chỉ trả về MỘT khối JSON, không lời dẫn: {"deBai": string, "luaChon": string[], "dapAn": string, "huongDanCham": string, "khongDuCanCu": false, "ghiChu": string}.`;

export function loiNhacVietLai(c: CauChoAI, yeuCau: string): string {
  return `${mota(c)}\n\nYÊU CẦU CỦA GIÁO VIÊN: ${yeuCau}\n\nViết lại câu theo yêu cầu trên.`;
}
