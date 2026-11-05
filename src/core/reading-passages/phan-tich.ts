/**
 * ThayKhaiEdu - Phân tích văn bản nhập kho bài đọc (không cần AI).
 *
 * - Tách một file có nhiều bài thành từng bài: tên bài, nội dung, tác giả, nguồn, link.
 * - Đoán thể loại, gợi ý chủ điểm, loại bài (đọc thành tiếng / đọc hiểu) và kì.
 *
 * Mọi gợi ý đều kèm độ tin cậy. Gợi ý chỉ để điền sẵn; giáo viên sửa và tổ trưởng duyệt.
 * Khi app có khóa AI, kết quả AI thay cho phần gợi ý ở đây nhưng vẫn qua cùng bộ kiểm tra (kiem-tra.ts).
 */

import { countVietnameseSyllables } from '@/core/utils/vietnamese-word-counter';
import {
  CHU_DIEM_THEO_KY,
  CHU_DIEM_TV4,
  type KyKiemTraBaiDoc,
  type LoaiBaiDoc,
  type TenChuDiem,
  type TheLoaiBaiDoc,
} from './quy-dinh';

export type DoTinCay = 'CAO' | 'TRUNG_BINH' | 'THAP';

export interface BaiDocTach {
  tieuDe: string;
  noiDung: string;
  tacGia: string;
  nguon: string;
  nguonUrl: string;
}

export interface GoiYChuDiem {
  chuDiem: TenChuDiem;
  diem: number;
  tuKhoa: string[];
}

export interface BaiDocPhanTich extends BaiDocTach {
  soTieng: number;
  theLoai: TheLoaiBaiDoc;
  theLoaiTinCay: DoTinCay;
  chuDiem: TenChuDiem | null;
  chuDiemTinCay: DoTinCay;
  goiYChuDiem: GoiYChuDiem[];
  loai: LoaiBaiDoc;
  ky: KyKiemTraBaiDoc | null;
  ghiChu: string[];
}

// ---------------------------------------------------------------------------
// Chuẩn hóa
// ---------------------------------------------------------------------------

export function chuanHoaVanBan(s: string): string {
  return (s || '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Chữ thường, bỏ dấu câu, dùng để so trùng. Giữ dấu thanh tiếng Việt. */
export function chuanHoaSoSanh(s: string): string {
  return (s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\-–—]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RE_URL = /https?:\/\/[^\s)>\]]+/i;
const RE_NGUON = /^\(?\s*(nguồn|nguon)\s*[:：]\s*(.+?)\s*\)?$/i;
const RE_THEO = /^\(?\s*(theo|trích|sưu tầm|phỏng theo|dịch)\b\s*(.*?)\s*\)?$/i;
const RE_TAC_GIA_NGOAC = /^\(\s*([\p{Lu}][\p{L}.]*(?:\s+[\p{Lu}][\p{L}.]*){1,5})\s*\)$/u;
const RE_GACH_TEN = /^[–—-]\s*([\p{Lu}][\p{L}.]*(?:\s+[\p{Lu}][\p{L}.]*){1,5})\s*$/u;
const RE_DAU_BAI = /^(bài\s*(đọc)?\s*(số\s*)?\d+|đoạn\s*\d+|văn bản\s*\d+)\s*[:.\-–]?\s*/i;
const RE_PHAN_CACH = /^(-{3,}|\*{3,}|_{3,}|={3,})$/;

function laDongNguon(l: string) {
  return RE_NGUON.test(l) || /^\(?\s*https?:\/\//i.test(l);
}
function laDongTacGia(l: string) {
  return RE_THEO.test(l) || RE_TAC_GIA_NGOAC.test(l) || RE_GACH_TEN.test(l);
}
function laDongGhiCong(l: string) {
  return laDongNguon(l) || laDongTacGia(l);
}

function boNgoac(s: string) {
  return s.replace(/^\(\s*/, '').replace(/\s*\)$/, '').trim();
}

function layTacGia(l: string): string {
  const t = RE_THEO.exec(l);
  if (t) return boNgoac(t[2] || '');
  const n = RE_TAC_GIA_NGOAC.exec(l) || RE_GACH_TEN.exec(l);
  return n ? n[1].trim() : '';
}

/** Dòng có dáng tên bài: ngắn, không kết thúc bằng dấu câu của câu văn. */
function coDangTieuDe(l: string): boolean {
  if (!l || laDongGhiCong(l)) return false;
  if (RE_DAU_BAI.test(l)) return true;
  const n = countVietnameseSyllables(l);
  return n > 0 && n <= 12 && !/[.,;:!?…]$/.test(l);
}

// ---------------------------------------------------------------------------
// Tách bài
// ---------------------------------------------------------------------------

/**
 * Tách văn bản thành các bài đọc. Một bài kết thúc ở dòng tác giả / nguồn,
 * hoặc ở dòng "Bài đọc n", hoặc dòng phân cách (---, ***).
 * Dòng đầu mỗi bài, nếu có dáng tên bài, được lấy làm tên bài.
 */
export function tachBaiDoc(vanBan: string): BaiDocTach[] {
  const dong = chuanHoaVanBan(vanBan).split('\n');
  const ketQua: BaiDocTach[] = [];
  let cur: { tieuDe: string; than: string[]; tacGia: string; nguon: string; nguonUrl: string; daGhiCong: boolean } | null = null;

  const dong_lai = () => {
    if (!cur) return;
    const noiDung = cur.than.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (noiDung || cur.tieuDe) {
      ketQua.push({ tieuDe: cur.tieuDe, noiDung, tacGia: cur.tacGia, nguon: cur.nguon, nguonUrl: cur.nguonUrl });
    }
    cur = null;
  };
  const moi = () => ({ tieuDe: '', than: [] as string[], tacGia: '', nguon: '', nguonUrl: '', daGhiCong: false });

  for (const l of dong) {
    if (RE_PHAN_CACH.test(l)) { dong_lai(); continue; }

    if (RE_DAU_BAI.test(l)) {
      dong_lai();
      cur = moi();
      const ten = l.replace(RE_DAU_BAI, '').trim();
      if (ten) cur.tieuDe = ten;
      continue;
    }

    if (laDongGhiCong(l)) {
      if (!cur) cur = moi();
      if (laDongNguon(l)) {
        const m = RE_NGUON.exec(l);
        const text = m ? m[2] : boNgoac(l);
        const url = RE_URL.exec(text)?.[0] ?? '';
        cur.nguonUrl = cur.nguonUrl || url;
        cur.nguon = cur.nguon || text.replace(RE_URL, '').replace(/[,;\s–-]+$/, '').trim();
      } else {
        cur.tacGia = cur.tacGia || layTacGia(l);
        // "Theo ... (báo/sách ...)" giữ nguyên làm nguồn nếu chưa có dòng nguồn riêng
        if (!cur.nguon && /báo|tạp chí|nxb|nhà xuất bản|tuyển tập|sách/i.test(l)) cur.nguon = boNgoac(l);
      }
      cur.daGhiCong = true;
      continue;
    }

    if (!l) {
      if (cur) cur.than.push('');
      continue;
    }

    // Dòng nội dung đầu tiên sau phần ghi công → bắt đầu bài mới
    if (!cur || cur.daGhiCong) {
      dong_lai();
      cur = moi();
      if (coDangTieuDe(l)) { cur.tieuDe = l; continue; }
    } else if (!cur.tieuDe && cur.than.every((x) => !x) && coDangTieuDe(l)) {
      cur.tieuDe = l;
      continue;
    }
    cur.than.push(l);
  }
  dong_lai();

  // Gộp mảnh không có nội dung (chỉ có tên) vào bài sau
  const gon: BaiDocTach[] = [];
  for (const b of ketQua) {
    const truoc = gon[gon.length - 1];
    if (truoc && !truoc.noiDung && !truoc.tacGia && !b.tieuDe) { b.tieuDe = truoc.tieuDe; gon.pop(); }
    gon.push(b);
  }
  return gon.filter((b) => b.noiDung);
}

// ---------------------------------------------------------------------------
// Nhận diện thể loại
// ---------------------------------------------------------------------------

const TU_TRUYEN = ['một hôm', 'ngày xưa', 'ngày xửa', 'bỗng', 'liền', 'hỏi', 'đáp', 'nói', 'kể', 'từ đó', 'thấy vậy', 'một lần', 'hôm ấy', 'cậu bé', 'cô bé', 'bà cụ', 'ông lão'];
const TU_MIEU_TA = ['xanh', 'đỏ', 'vàng', 'trắng', 'tím', 'tròn', 'nhỏ xíu', 'mượt', 'óng', 'lấp lánh', 'thân', 'cành', 'lá', 'cánh', 'đôi mắt', 'bộ lông', 'trông như', 'như một', 'thơm', 'rực rỡ'];
const TU_THONG_TIN = ['gồm', 'được chia', 'diện tích', 'khoảng', 'theo thống kê', 'năm', 'ki-lô-mét', 'km', 'mét', '%', 'phần trăm', 'thông tin', 'hướng dẫn', 'bước', 'tổ chức', 'hoạt động', 'triệu', 'nghìn'];

function demTuKhoa(vb: string, ds: string[]) {
  const s = ` ${chuanHoaSoSanh(vb)} `;
  let n = 0;
  for (const t of ds) {
    const k = chuanHoaSoSanh(t);
    if (!k) continue;
    n += s.split(` ${k} `).length - 1;
  }
  return n;
}

export function nhanDienTheLoai(noiDung: string): { theLoai: TheLoaiBaiDoc; tinCay: DoTinCay } {
  const dong = noiDung.split('\n').map((l) => l.trim()).filter(Boolean);
  if (dong.length >= 4) {
    const ngan = dong.filter((l) => countVietnameseSyllables(l) <= 9).length;
    const khongCham = dong.filter((l) => !/[.!?…]$/.test(l)).length;
    if (ngan / dong.length >= 0.75 && khongCham / dong.length >= 0.5) return { theLoai: 'THO', tinCay: 'CAO' };
  }
  if (/^\s*[\p{Lu}][\p{L}\s]{1,20}\s*:\s*[–—-]?\s*\S/mu.test(noiDung) && (noiDung.match(/^\s*[\p{Lu}][\p{L}\s]{1,20}:/gmu) || []).length >= 3) {
    return { theLoai: 'KICH', tinCay: 'TRUNG_BINH' };
  }
  const so = (noiDung.match(/\d+/g) || []).length;
  const truyen = demTuKhoa(noiDung, TU_TRUYEN) + (noiDung.match(/[–—-]\s+\p{Lu}|[“"]/gu) || []).length;
  const mieuTa = demTuKhoa(noiDung, TU_MIEU_TA);
  const thongTin = demTuKhoa(noiDung, TU_THONG_TIN) + so;
  const max = Math.max(truyen, mieuTa, thongTin);
  if (max === 0) return { theLoai: 'TRUYEN', tinCay: 'THAP' };
  const thu2 = [truyen, mieuTa, thongTin].sort((a, b) => b - a)[1];
  const tinCay: DoTinCay = max >= 4 && max >= thu2 * 2 ? 'TRUNG_BINH' : 'THAP';
  if (max === thongTin && so >= 3) return { theLoai: 'VAN_BAN_THONG_TIN', tinCay };
  if (max === mieuTa && mieuTa > truyen) return { theLoai: 'MIEU_TA', tinCay };
  return { theLoai: 'TRUYEN', tinCay };
}

// ---------------------------------------------------------------------------
// Gợi ý chủ điểm
// ---------------------------------------------------------------------------

const TU_CHU_DIEM: Record<TenChuDiem, string[]> = {
  'Mỗi người một vẻ': ['mỗi người', 'riêng', 'khác nhau', 'tính cách', 'sở thích', 'nét riêng', 'tài năng', 'đặc biệt', 'độc đáo', 'không giống', 'năng khiếu'],
  'Trải nghiệm và khám phá': ['khám phá', 'trải nghiệm', 'phát hiện', 'tìm hiểu', 'chuyến đi', 'thám hiểm', 'lần đầu', 'tò mò', 'bí ẩn', 'thử', 'quan sát'],
  'Niềm vui sáng tạo': ['sáng tạo', 'phát minh', 'sáng chế', 'ý tưởng', 'vẽ', 'bức tranh', 'nghệ thuật', 'âm nhạc', 'bản nhạc', 'chế tạo', 'khéo léo', 'làm ra', 'nhà khoa học'],
  'Chắp cánh ước mơ': ['ước mơ', 'mơ ước', 'ước', 'tương lai', 'khát vọng', 'mong muốn', 'lớn lên', 'trở thành', 'bay', 'giấc mơ'],
  'Sống để yêu thương': ['yêu thương', 'giúp đỡ', 'chia sẻ', 'quan tâm', 'nhân hậu', 'lòng tốt', 'an ủi', 'tình thương', 'bao dung', 'chăm sóc', 'thương'],
  'Uống nước nhớ nguồn': ['biết ơn', 'tổ tiên', 'truyền thống', 'lịch sử', 'anh hùng', 'nguồn cội', 'công ơn', 'dân tộc', 'giỗ', 'thầy giáo', 'cô giáo', 'ông bà', 'tưởng nhớ', 'chiến sĩ'],
  'Quê hương trong tôi': ['quê hương', 'quê', 'làng', 'xóm', 'cánh đồng', 'đồng lúa', 'dòng sông', 'con đò', 'lũy tre', 'mái nhà', 'đầu làng', 'phố', 'đất nước'],
  'Vì một thế giới bình yên': ['hòa bình', 'hoà bình', 'bình yên', 'môi trường', 'trái đất', 'thế giới', 'bảo vệ', 'hoang dã', 'chiến tranh', 'ô nhiễm', 'rác', 'các nước', 'bạn bè quốc tế'],
};

export function goiYChuDiem(noiDung: string, gioiHan?: TenChuDiem[]): { chuDiem: TenChuDiem | null; tinCay: DoTinCay; xepHang: GoiYChuDiem[] } {
  const vb = ` ${chuanHoaSoSanh(noiDung)} `;
  const ds = (gioiHan && gioiHan.length ? gioiHan : CHU_DIEM_TV4.map((c) => c.ten)) as TenChuDiem[];
  const xepHang = ds
    .map((cd) => {
      const tuKhoa: string[] = [];
      let diem = 0;
      for (const t of TU_CHU_DIEM[cd]) {
        const k = chuanHoaSoSanh(t);
        const n = vb.split(` ${k} `).length - 1;
        if (n > 0) { diem += n; tuKhoa.push(t); }
      }
      return { chuDiem: cd, diem, tuKhoa };
    })
    .sort((a, b) => b.diem - a.diem);
  const [dau, sau] = xepHang;
  if (!dau || dau.diem === 0) return { chuDiem: null, tinCay: 'THAP', xepHang };
  const tinCay: DoTinCay = dau.diem >= 3 && dau.diem >= 2 * (sau?.diem ?? 0) ? 'TRUNG_BINH' : 'THAP';
  return { chuDiem: dau.chuDiem, tinCay, xepHang };
}

export function kyCuaChuDiem(cd: TenChuDiem): KyKiemTraBaiDoc {
  return (Object.keys(CHU_DIEM_THEO_KY) as KyKiemTraBaiDoc[]).find((k) => CHU_DIEM_THEO_KY[k].includes(cd))!;
}

// ---------------------------------------------------------------------------
// Phân tích trọn gói
// ---------------------------------------------------------------------------

export interface TuyChonPhanTich {
  /** Giáo viên chọn sẵn thì dùng, không đoán. */
  loai?: LoaiBaiDoc;
  ky?: KyKiemTraBaiDoc;
}

export function phanTichBaiDoc(b: BaiDocTach, tuyChon: TuyChonPhanTich = {}): BaiDocPhanTich {
  const ghiChu: string[] = [];
  const soTieng = countVietnameseSyllables(b.noiDung);
  const tl = nhanDienTheLoai(b.noiDung);
  const cd = goiYChuDiem(`${b.tieuDe}\n${b.noiDung}`, tuyChon.ky ? CHU_DIEM_THEO_KY[tuyChon.ky] : undefined);
  const loai: LoaiBaiDoc = tuyChon.loai ?? (soTieng <= 100 && !(tl.theLoai === 'THO' && soTieng >= 90) ? 'DOC_THANH_TIENG' : 'DOC_HIEU');
  const ky = tuyChon.ky ?? (cd.chuDiem ? kyCuaChuDiem(cd.chuDiem) : null);

  if (!b.tieuDe) ghiChu.push('Chưa nhận ra tên bài.');
  if (!b.tacGia) ghiChu.push('Chưa nhận ra tác giả.');
  if (!b.nguon && !b.nguonUrl) ghiChu.push('Chưa nhận ra nguồn.');
  if (!tuyChon.loai) ghiChu.push(`Loại bài đoán theo độ dài (${soTieng} tiếng).`);
  if (!cd.chuDiem) ghiChu.push('Chưa đoán được chủ điểm, cần chọn tay.');
  else if (cd.tinCay === 'THAP') ghiChu.push(`Chủ điểm "${cd.chuDiem}" chỉ là gợi ý yếu, cần xem lại.`);
  if (tl.tinCay === 'THAP') ghiChu.push('Thể loại chỉ là gợi ý, cần xem lại.');

  return {
    ...b,
    soTieng,
    theLoai: tl.theLoai,
    theLoaiTinCay: tl.tinCay,
    chuDiem: cd.chuDiem,
    chuDiemTinCay: cd.tinCay,
    goiYChuDiem: cd.xepHang.slice(0, 3),
    loai,
    ky,
    ghiChu,
  };
}
