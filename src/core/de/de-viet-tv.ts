/**
 * ThayKhaiEdu - Đề bài Viết môn Tiếng Việt.
 * Không cần trang SGK: app tự gom các tiết Viết và tiết Ôn tập có cùng kiểu bài trong SGK (đến tuần kiểm tra)
 * để AI tham khảo dạng đề, rồi buộc đề mới diễn đạt khác, không trùng đề học sinh đã làm trên lớp.
 */
import type { KyKiemTra } from '@/types/matrix-template';

/** Tuần cuối của từng kì (theo khung 35 tuần). */
export const TUAN_CUOI_KY: Record<KyKiemTra, number> = { GIUA_HK1: 9, CUOI_HK1: 18, GIUA_HK2: 27, CUOI_NAM: 35 };

export interface MucSgkViet {
  /** "Bài 29", "Tuần 18"… */
  nhan: string;
  ten: string;
  trangTu: number;
  trangDen: number;
  laOnTap: boolean;
  noiDung: string;
}

export interface NguCanhViet {
  /** Đoạn trích phần Viết của các tiết cùng kiểu bài, ghép sẵn cho lời nhắc. */
  thamKhao: string;
  /** Các đề bài viết có trong SGK (để cấm trùng). */
  deSgk: string[];
  /** Nguồn đã dùng, ví dụ "Bài 29, tr. 125–128". */
  nguon: string[];
}

const bo = (s: string) => s.normalize('NFC').toLowerCase();

/** Từ khóa nhận kiểu bài từ tên kiểu bài / YCCĐ. Không nhận ra thì trả null. */
export function tuKhoaKieuBai(...chu: (string | null | undefined)[]): RegExp | null {
  const t = bo(chu.filter(Boolean).join(' '));
  if (/tưởng tượng/.test(t)) return /tưởng tượng/i;
  if (/miêu tả|\btả\b/.test(t)) {
    if (/con vật/.test(t)) return /con vật/i;
    if (/cây/.test(t)) return /cây cối|tả (một )?(cây|cái cây)|cây (hoa|ăn quả|bóng mát)/i;
    if (/đồ vật/.test(t)) return /đồ vật/i;
    if (/phong cảnh|cảnh/.test(t)) return /phong cảnh|tả cảnh/i;
    if (/người/.test(t)) return /tả (một )?người/i;
    return /miêu tả/i;
  }
  if (/kể lại|câu chuyện/.test(t)) return /kể lại (một )?câu chuyện/i;
  if (/thuật lại/.test(t)) return /thuật lại/i;
  if (/thư\b/.test(t)) return /viết thư|lá thư|bức thư/i;
  if (/đơn\b/.test(t)) return /viết đơn|lá đơn/i;
  if (/hướng dẫn/.test(t)) return /hướng dẫn/i;
  if (/ý kiến/.test(t)) return /ý kiến/i;
  if (/tình cảm|cảm xúc/.test(t)) return /tình cảm|cảm xúc/i;
  return null;
}

const DAU_VIET = /(^|\n)\s*(?:[A-ZĐ]\.\s*)?VI[ỆẾE]T\b[^\n]*/g;

/** Phần Viết của một tiết: từ tiêu đề "VIẾT …" khớp kiểu bài đến hết tiết (giới hạn độ dài). */
export function tachPhanViet(noiDung: string, re: RegExp, gioiHan = 1500): string | null {
  const chu = noiDung.normalize('NFC');
  let batDau = -1;
  for (const m of chu.matchAll(DAU_VIET)) {
    const dong = m[0];
    const sau = chu.slice(m.index!, m.index! + 400);
    if (re.test(dong) || re.test(sau)) { batDau = m.index!; break; }
  }
  if (batDau < 0) {
    // Ôn tập hoặc tiết không có tiêu đề rõ: lấy quanh dòng "Đề …" khớp kiểu bài
    const i = chu.search(new RegExp(`(Đề\\s*\\d*\\s*:|Viết)[^\\n]{0,160}${re.source}`, 'i'));
    if (i < 0) return null;
    batDau = Math.max(0, chu.lastIndexOf('\n', Math.max(0, i - 120)));
  }
  return chu.slice(batDau, batDau + gioiHan).replace(/\[Trang \d+[^\]]*\]\s*/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Các câu đề bài viết trong một đoạn SGK: dòng "Đề 1: …", "Viết bài văn …", "Miêu tả …" khớp kiểu bài. */
export function deBaiTrongDoan(doan: string, re: RegExp): string[] {
  const kq: string[] = [];
  const dong = doan.split('\n').map((x) => x.trim()).filter(Boolean);
  for (let i = 0; i < dong.length; i++) {
    let d = dong[i];
    if (!/^(đề\s*\d*\s*[:.]|\d+\.\s*)?\s*(viết|miêu tả|tả|kể|thuật|em hãy|hãy|tưởng tượng)/i.test(d)) continue;
    // Đề bị ngắt dòng trong bản quét: nối dòng sau nếu dòng này chưa hết câu
    while (!/[.?!:]$/.test(d) && i + 1 < dong.length && d.length < 260) d = `${d} ${dong[++i]}`;
    d = d.replace(/^đề\s*\d*\s*[:.]\s*/i, '').replace(/^\d+\.\s*/, '');
    if (re.test(d) && d.length >= 15 && !kq.includes(d)) kq.push(d);
  }
  return kq;
}

/** Gom ngữ cảnh viết từ các tiết SGK (đã lọc đến tuần kiểm tra). Tiết Ôn tập để cuối, luôn giữ. */
export function ganNguCanhViet(muc: MucSgkViet[], re: RegExp, toiDaTiet = 5): NguCanhViet {
  const coKieu = muc
    .map((m) => ({ m, doan: tachPhanViet(m.noiDung, re) }))
    .filter((x): x is { m: MucSgkViet; doan: string } => !!x.doan);
  const ontap = coKieu.filter((x) => x.m.laOnTap);
  const bai = coKieu.filter((x) => !x.m.laOnTap).slice(-Math.max(1, toiDaTiet - ontap.length));
  const chon = [...bai, ...ontap];
  const deSgk = [...new Set(chon.flatMap((x) => deBaiTrongDoan(x.doan, re)))];
  return {
    thamKhao: chon.map((x) => `[SGK ${x.m.nhan}${x.m.laOnTap ? '' : ` ${x.m.ten}`}, tr. ${x.m.trangTu}–${x.m.trangDen}${x.m.laOnTap ? ' – tiết ôn tập' : ''}]\n${x.doan}`).join('\n\n'),
    deSgk,
    nguon: chon.map((x) => `${x.m.nhan}${x.m.laOnTap ? ` (${x.m.ten})` : ''}, tr. ${x.m.trangTu}–${x.m.trangDen}`),
  };
}

// --- Kiểm tra trùng đề SGK ---------------------------------------------------------------------------------

const tu = (s: string) => bo(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
function cumTu(s: string, n = 3): Set<string> {
  const w = tu(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

/** Mức trùng giữa hai đề (0–1): tỉ lệ cụm 3 từ chung trên đề ngắn hơn. */
export function doTrungDe(a: string, b: string): number {
  const x = cumTu(a);
  const y = cumTu(b);
  if (!x.size || !y.size) return 0;
  let chung = 0;
  for (const k of x) if (y.has(k)) chung++;
  return chung / Math.min(x.size, y.size);
}

export const NGUONG_TRUNG_DE = 0.5;

/** Đề SGK bị trùng (nếu có) với đề AI vừa soạn. Chỉ so phần yêu cầu đề, bỏ phần gợi ý. */
export function deSgkBiTrung(deBai: string, deSgk: string[], nguong = NGUONG_TRUNG_DE): string | null {
  const yeuCau = deBai.split(/\n\s*(gợi ý|lưu ý|chú ý)\b/i)[0];
  let tot: { d: string; m: number } | null = null;
  for (const d of deSgk) {
    const m = doTrungDe(yeuCau, d);
    if (m >= nguong && (!tot || m > tot.m)) tot = { d, m };
  }
  return tot?.d ?? null;
}

/** Lời nhắc thêm cho AI khi soạn đề bài Viết Tiếng Việt. */
export function loiNhacDeViet(kieuBai: string, ngu: NguCanhViet): string {
  const cam = ngu.deSgk.length
    ? `\nCÁC ĐỀ HỌC SINH ĐÃ LÀM TRÊN LỚP (TUYỆT ĐỐI KHÔNG ra trùng hoặc gần giống; không chỉ đổi vài chữ):\n${ngu.deSgk.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
    : '';
  return `ĐỀ BÀI VIẾT – KIỂU BÀI: ${kieuBai}
Câu này là đề bài Tập làm văn. Không cần trang SGK cụ thể; KHÔNG trả "khongDuCanCu" vì thiếu trang sách, "luaChon" để mảng rỗng, "dapAn" để trống. Tham khảo các tiết Viết và tiết Ôn tập dưới đây để nắm dạng đề, phạm vi, mức yêu cầu học sinh đã luyện, rồi ra MỘT đề MỚI:
- Cùng kiểu bài, cùng mức độ, sát chương trình đã học.
- Diễn đạt yêu cầu (câu đề) khác SGK: đổi đối tượng, tình huống hoặc góc nhìn (ví dụ con vật khác, hoàn cảnh gặp khác, câu chuyện khác), không lặp lại câu chữ của đề trong sách.
- Soạn HAI đề khác nhau (khác đối tượng hoặc tình huống) để giáo viên chọn một; cả hai đều phải khác đề trong sách.
- Mỗi đề chỉ là câu yêu cầu, ngắn gọn, rõ ràng, từ ngữ quen thuộc với học sinh miền Nam. KHÔNG kèm gợi ý, dàn ý, lưu ý hay câu hỏi gợi mở.
- "huongDanCham" của từng đề theo thang 10 điểm của bài viết: bố cục, nội dung, dùng từ đặt câu, chữ viết – chính tả, sáng tạo; ghi điểm từng phần.
- Trả thêm trường "cacDe": [{"deBai": "...", "huongDanCham": "..."}, {"deBai": "...", "huongDanCham": "..."}]. "deBai" và "huongDanCham" ở ngoài lấy đúng đề thứ nhất.${cam}

TƯ LIỆU SGK THAM KHẢO (chỉ để nắm dạng đề, không chép):
${ngu.thamKhao || '(Kho SGK chưa có chữ tiết Viết của kiểu bài này; soạn theo yêu cầu cần đạt.)'}`;
}

/** Bỏ phần gợi ý, dàn ý, lưu ý mà AI lỡ kèm vào đề bài viết: chỉ giữ câu yêu cầu. */
export function boGoiYDeViet(deBai: string): string {
  const i = deBai.search(/(^|\n)\s*(gợi ý|goi y|dàn ý|lưu ý|chú ý|em có thể|tham khảo)(?=[\s:.,\-–]|$)[^\n]*/i);
  return (i >= 0 ? deBai.slice(0, i) : deBai).replace(/\n{2,}/g, '\n').trim();
}
