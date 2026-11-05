/**
 * ThayKhaiEdu - Cắt đoạn từ bài đọc dài cho phần đọc thành tiếng.
 *
 * Tổ cho phép lấy từ đầu bài đến một vị trí đủ số tiếng, hoặc lấy một đoạn giữa bài,
 * ngắt ở cuối câu, cuối dòng cho tự nhiên. Việc đếm tiếng do code làm (AI đếm tiếng Việt hay sai),
 * AI chỉ nên gợi ý chỗ bắt đầu nếu cần.
 */

import { countVietnameseSyllables } from '@/core/utils/vietnamese-word-counter';

export type KieuNgat = 'CUOI_CAU' | 'CUOI_DONG' | 'DAU_PHAY' | 'GIUA_CAU';

export interface DoanCat {
  doan: string;
  soTieng: number;
  kieuNgat: KieuNgat;
  /** Bắt đầu từ đầu bài hay từ giữa bài. */
  batDau: 'DAU_BAI' | 'GIUA_BAI';
  /** Vài chữ cuối của đoạn, để hiển thị cho thầy kiểm tra chỗ ngắt. */
  ketThuc: string;
  /** true nếu số tiếng nằm trong khoảng quy định; false nếu chỉ nằm trong phần dung sai. */
  trongKhoang: boolean;
}

export interface TuyChonCatDoan {
  min: number;
  max: number;
  /** Dung sai (tiếng) tổ cho phép lệch ra ngoài khoảng; mặc định 0. */
  dungSai?: number;
  /** Số gợi ý tối đa trả về. */
  toiDa?: number;
}

/** Thứ tự ưu tiên chỗ ngắt: cuối câu hoặc cuối dòng tốt nhất, giữa câu là cách cuối cùng. */
const UU_TIEN: Record<KieuNgat, number> = { CUOI_CAU: 0, CUOI_DONG: 0, DAU_PHAY: 1, GIUA_CAU: 2 };

const CUOI_CAU = /[.!?…]["”’']?$|["”][.!?…]$/;
const DAU_PHAY = /[,;:]["”’']?$/;

function phanLoaiChoNgat(tu: string, saoTu: string): KieuNgat {
  if (CUOI_CAU.test(tu)) return 'CUOI_CAU';
  // Câu dẫn lời thoại (kết thúc bằng dấu hai chấm) chưa trọn ý, không coi là chỗ ngắt tốt.
  if (/:["”’']?$/.test(tu)) return 'DAU_PHAY';
  if (/^[ \t]*\r?\n/.test(saoTu) || saoTu === '') return 'CUOI_DONG';
  if (DAU_PHAY.test(tu)) return 'DAU_PHAY';
  return 'GIUA_CAU';
}

/** Tìm chỗ ngắt tốt nhất khi bắt đầu từ vị trí `batDau` của văn bản; null nếu không đủ số tiếng. */
function catTu(vanBan: string, batDau: number, min: number, max: number, dungSai: number): DoanCat | null {
  const phanConLai = vanBan.slice(batDau);
  const re = /\S+/g;
  let ungVien: { het: number; kieu: KieuNgat; so: number; trong: boolean } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(phanConLai)) !== null) {
    const het = m.index + m[0].length;
    const so = countVietnameseSyllables(phanConLai.slice(0, het));
    if (so > max + dungSai) break;
    if (so < min - dungSai) continue;
    const kieu = phanLoaiChoNgat(m[0], phanConLai.slice(het));
    const trong = so >= min && so <= max;
    // Ưu tiên chỗ ngắt tốt hơn; cùng chất lượng thì ưu tiên nằm trong khoảng, rồi lấy chỗ đến trước.
    const tot = !ungVien || UU_TIEN[kieu] < UU_TIEN[ungVien.kieu] || (UU_TIEN[kieu] === UU_TIEN[ungVien.kieu] && trong && !ungVien.trong);
    if (tot) ungVien = { het, kieu, so, trong };
  }
  if (!ungVien) return null;
  const doan = phanConLai.slice(0, ungVien.het).trim();
  return {
    doan,
    soTieng: ungVien.so,
    kieuNgat: ungVien.kieu,
    batDau: batDau === 0 ? 'DAU_BAI' : 'GIUA_BAI',
    ketThuc: doan.split(/\s+/).slice(-5).join(' '),
    trongKhoang: ungVien.trong,
  };
}

/**
 * Gợi ý các đoạn đủ số tiếng từ một bài dài.
 * Thử bắt đầu từ đầu bài, rồi từ đầu từng dòng; ưu tiên đoạn từ đầu bài, ngắt cuối câu.
 */
export function goiYCatDoan(noiDung: string, { min, max, dungSai = 0, toiDa = 5 }: TuyChonCatDoan): DoanCat[] {
  const vanBan = (noiDung || '').replace(/\r\n?/g, '\n').trim();
  if (!vanBan || countVietnameseSyllables(vanBan) < min - dungSai) return [];
  const diemBatDau = [0];
  const reDong = /\n+/g;
  let m: RegExpExecArray | null;
  while ((m = reDong.exec(vanBan)) !== null) {
    const viTri = m.index + m[0].length;
    if (viTri < vanBan.length) diemBatDau.push(viTri);
  }
  const ketQua: DoanCat[] = [];
  for (const d of diemBatDau) {
    const c = catTu(vanBan, d, min, max, dungSai);
    if (c) ketQua.push(c);
  }
  return ketQua
    .sort(
      (a, b) =>
        UU_TIEN[a.kieuNgat] - UU_TIEN[b.kieuNgat] ||
        Number(b.trongKhoang) - Number(a.trongKhoang) ||
        (a.batDau === b.batDau ? 0 : a.batDau === 'DAU_BAI' ? -1 : 1),
    )
    .slice(0, toiDa);
}

/** Đoạn tốt nhất (nếu có). */
export function catDoanTotNhat(noiDung: string, tuyChon: TuyChonCatDoan): DoanCat | null {
  return goiYCatDoan(noiDung, { ...tuyChon, toiDa: 1 })[0] ?? null;
}
