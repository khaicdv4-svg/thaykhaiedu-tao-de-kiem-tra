/**
 * Tự ghép mỗi câu của đặc tả với bài học trong PPCT (rồi lấy tuần, trang SGK từ PPCT và mục lục sách).
 *
 * Kho YCCĐ chưa ghi bài, PPCT chưa gắn YCCĐ, nên app phải tự ghép:
 * - Chỉ chọn trong các bài dạy trong phạm vi tuần của kì kiểm tra (bỏ tiết Luyện tập, Ôn tập, Kiểm tra).
 * - Cách 1 (máy chủ có AI): AI chọn một bài trong danh sách cho mỗi câu theo YCCĐ; chọn ngoài danh sách thì bỏ.
 * - Cách 2 (không có AI, hoặc AI không chọn được): chấm điểm từ chung giữa YCCĐ, nội dung câu và tên bài.
 * Chỉ điền ô còn trống; ô thầy cô đã điền thì giữ nguyên. Kết quả là gợi ý để thầy cô xem lại.
 */
import { khoaTenBai, minhChungTuBai, type DacTa, type MucLucSgk, type TietGoiY } from './dac-ta';

export interface TietCoKi extends TietGoiY { hocKi?: number | null }

export interface BaiUngVien {
  so: number;
  /** Tên bài để hiện, có số bài nếu biết: "Bài 12: Các số trong phạm vi lớp triệu". */
  ten: string;
  tuan?: number;
  trangSgk?: string;
}

export interface CauCanGhep {
  khoa: string;
  yccd: string;
  noiDung?: string | null;
  mach?: string | null;
}

const TIET_CHUNG = /^(luyện tập|ôn tập|kiểm tra|đánh giá|tiết dự phòng|dự phòng|thực hành chung)/iu;

/** Các bài dạy trong khoảng tuần của kì, mỗi bài một dòng (gộp các tiết, tiết "tiếp theo"). */
export function danhSachBaiUngVien(tiet: TietCoKi[], mucLuc: MucLucSgk[], tuanTu: number, tuanDen: number): BaiUngVien[] {
  const daCo = new Set<string>();
  const ds: BaiUngVien[] = [];
  for (const t of tiet) {
    if (!t.baiTen || t.tuan === null || t.tuan < tuanTu || t.tuan > tuanDen) continue;
    const khoa = khoaTenBai(t.baiTen);
    if (!khoa || daCo.has(khoa)) continue;
    const tenThuong = t.baiTen.replace(/\s+/g, ' ').replace(/^bài\s*\d+\s*[:.\-–]?\s*/iu, '').trim();
    if (TIET_CHUNG.test(tenThuong)) continue;
    daCo.add(khoa);
    const mc = minhChungTuBai(t.baiTen, tiet, mucLuc);
    ds.push({ so: ds.length + 1, ten: mc?.baiHoc ?? tenThuong, tuan: mc?.tuan, trangSgk: mc?.trangSgk });
  }
  return ds;
}

// Từ quá phổ biến trong YCCĐ, không giúp phân biệt bài
const TU_BO = new Set([
  'được', 'các', 'của', 'một', 'và', 'với', 'trong', 'những', 'cho', 'có', 'là', 'để', 'từ', 'theo', 'về', 'đã', 'này', 'đó', 'khi',
  'thực', 'hiện', 'nhận', 'biết', 'nêu', 'vận', 'dụng', 'giải', 'quyết', 'vấn', 'đề', 'gắn', 'việc', 'liên', 'quan', 'đến', 'bài', 'ví', 'dụ',
  'hoặc', 'như', 'thông', 'qua', 'trường', 'hợp', 'đơn', 'giản', 'số', 'hai',
]);

const tachTu = (s: string) => s.normalize('NFC').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);

function dacTrung(s: string): Set<string> {
  const tu = tachTu(s);
  const kq = new Set<string>();
  for (let i = 0; i < tu.length; i++) {
    if (!TU_BO.has(tu[i])) kq.add(tu[i]);
    // Cụm hai tiếng chỉ tính khi có ít nhất một tiếng có nghĩa ("một số", "của các" thì bỏ)
    if (i + 1 < tu.length && !(TU_BO.has(tu[i]) && TU_BO.has(tu[i + 1]))) kq.add(`${tu[i]} ${tu[i + 1]}`);
  }
  return kq;
}

/**
 * Chọn bài theo từ chung (cụm hai tiếng được tính nặng hơn, từ hiếm trong danh sách bài được tính nặng hơn).
 * Trả undefined nếu không bài nào có điểm, hoặc hai bài đứng đầu bằng điểm (không đoán).
 */
export function chonBaiTheoTu(cau: CauCanGhep, ungVien: BaiUngVien[]): BaiUngVien | undefined {
  if (!ungVien.length) return undefined;
  const dtBai = ungVien.map((u) => dacTrung(u.ten));
  const tanSuat = new Map<string, number>();
  for (const d of dtBai) for (const k of d) tanSuat.set(k, (tanSuat.get(k) ?? 0) + 1);
  const dtCau = dacTrung(`${cau.yccd} ${cau.noiDung ?? ''}`);
  const diem = dtBai.map((d) => {
    let s = 0;
    for (const k of d) if (dtCau.has(k)) s += (k.includes(' ') ? 2 : 1) * Math.log(1 + ungVien.length / (tanSuat.get(k) ?? 1));
    return s;
  });
  const max = Math.max(...diem);
  if (max <= 0) return undefined;
  const dau = diem.map((d, i) => ({ d, i })).filter((x) => x.d === max);
  return dau.length === 1 ? ungVien[dau[0].i] : undefined;
}

export const HE_THONG_GHEP_BAI = 'Bạn là giáo viên tiểu học Việt Nam, nắm vững chương trình GDPT 2018 và sách Kết nối tri thức. '
  + 'Nhiệm vụ: với mỗi câu kiểm tra (có yêu cầu cần đạt), chọn đúng MỘT bài học trong danh sách cho sẵn mà học sinh học kiến thức đó. '
  + 'Chỉ dùng số thứ tự có trong danh sách. Không có bài nào phù hợp thì ghi null. Chỉ trả về một khối JSON, không giải thích.';

export function loiNhacGhepBai(tenMon: string, cau: CauCanGhep[], ungVien: BaiUngVien[]): string {
  const bai = ungVien.map((u) => `${u.so}. ${u.ten}${u.tuan ? ` (tuần ${u.tuan})` : ''}`).join('\n');
  const ds = cau.map((c) => `- khoa: ${c.khoa}\n  YCCĐ: ${c.yccd}${c.noiDung ? `\n  Nội dung: ${c.noiDung}` : ''}`).join('\n');
  return `Môn ${tenMon}, lớp 4.\n\nDANH SÁCH BÀI HỌC:\n${bai}\n\nCÁC CÂU CẦN GHÉP:\n${ds}\n\n`
    + 'Trả về đúng dạng: {"ghep":[{"khoa":"<khoa của câu>","bai":<số thứ tự bài hoặc null>}]}';
}

/** Đọc kết quả AI; số bài ngoài danh sách hoặc khóa lạ thì bỏ. */
export function docKetQuaGhepBai(traLoi: string, cau: CauCanGhep[], ungVien: BaiUngVien[]): Map<string, BaiUngVien> {
  const kq = new Map<string, BaiUngVien>();
  const m = traLoi.match(/\{[\s\S]*\}/);
  if (!m) return kq;
  let j: { ghep?: { khoa?: unknown; bai?: unknown }[] };
  try { j = JSON.parse(m[0]); } catch { return kq; }
  const khoa = new Set(cau.map((c) => c.khoa));
  for (const g of j.ghep ?? []) {
    const u = typeof g.bai === 'number' ? ungVien.find((x) => x.so === g.bai) : undefined;
    if (typeof g.khoa === 'string' && khoa.has(g.khoa) && u) kq.set(g.khoa, u);
  }
  return kq;
}

/** Điền bài, tuần, trang vào các ô còn trống theo kết quả ghép. Trả số câu đã điền. */
export function apDungGhepBai(d: DacTa, chon: Map<string, BaiUngVien>): { dacTa: DacTa; soDong: number } {
  let soDong = 0;
  const dong = d.dong.map((r) => {
    const u = chon.get(r.khoa);
    if (!u || r.baiHoc?.trim()) return r;
    soDong++;
    return { ...r, baiHoc: u.ten, tuan: r.tuan ?? u.tuan ?? null, trangSgk: r.trangSgk?.trim() ? r.trangSgk : u.trangSgk ?? '' };
  });
  return { dacTa: { ...d, dong }, soDong };
}
