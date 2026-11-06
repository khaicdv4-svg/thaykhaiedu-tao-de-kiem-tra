/**
 * ThayKhaiEdu - Kiểm tra bài đọc trước khi vào kho / trước khi dùng làm đề.
 * Quy tắc: docs/kho-sgk/THIET-KE-KHO-SGK-VA-KHO-BAI-DOC.md, mục 7.
 *
 * loi      → chặn: không được duyệt, không được đưa vào đề.
 * canhBao  → cho dùng nhưng tổ trưởng cần xem.
 */

import type { BoNao } from '@/core/bo-nao/bo-nao';
import { countVietnameseSyllables } from '@/core/utils/vietnamese-word-counter';
import {
  DANH_SACH_KY,
  DAU_HIEU_SGK_KHAC,
  NGUONG_TRUNG_SGK,
  TEN_LOAI,
  TEN_MIEN_NGUON_PHU,
  TEN_THE_LOAI,
  khoangDoDai,
  chuDiemCuaKy,
  type KhoangDoDai,
  type KyKiemTraBaiDoc,
  type LoaiBaiDoc,
  type TheLoaiBaiDoc,
} from './quy-dinh';
import { BAI_DOC_SGK_TV4 } from './sgk-tieng-viet-4';
import { chuanHoaSoSanh } from './phan-tich';

export type TrangThaiLink = 'CHUA_KIEM' | 'CON_TON_TAI' | 'KHONG_MO_DUOC' | 'KHONG_KHOP_NOI_DUNG' | 'SACH_IN';

export interface BaiDocCanKiem {
  tieuDe: string;
  noiDung: string;
  tacGia: string;
  nguon: string;
  nguonUrl?: string;
  loai?: LoaiBaiDoc | null;
  ky?: KyKiemTraBaiDoc | null;
  theLoai?: TheLoaiBaiDoc | null;
  chuDiem?: string | null;
  trangThaiLink?: TrangThaiLink;
}

export interface VanBanSgk {
  ten: string;
  noiDung: string;
}

export interface KetQuaKiemTraBaiDoc {
  hopLe: boolean;
  loi: string[];
  canhBao: string[];
  soTieng: number;
  khoang: KhoangDoDai | null;
  trungSgk: { tiLe: number; baiSgk: string | null; theoTen: boolean };
  nguonUrlSach: string;
}

// ---------------------------------------------------------------------------
// Trùng SGK
// ---------------------------------------------------------------------------

const DO_DAI_CUM = 8;

function cacCum(s: string): Set<string> {
  const tu = chuanHoaSoSanh(s).split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + DO_DAI_CUM <= tu.length; i++) out.add(tu.slice(i, i + DO_DAI_CUM).join(' '));
  return out;
}

/** Tỉ lệ % cụm 8 tiếng của bài đọc có mặt trong văn bản SGK. */
export function tiLeTrung(noiDung: string, vanBanSgk: string): number {
  const a = cacCum(noiDung);
  if (a.size === 0) return 0;
  const b = cacCum(vanBanSgk);
  let n = 0;
  for (const c of a) if (b.has(c)) n++;
  return Math.round((n / a.size) * 1000) / 10;
}

/** Tên bài trùng (hoặc chứa trọn) tên một bài đọc SGK Tiếng Việt 4 đang dạy. */
export function trungTenSgk(tieuDe: string): string | null {
  const t = chuanHoaSoSanh(tieuDe);
  if (!t) return null;
  for (const b of BAI_DOC_SGK_TV4) {
    const s = chuanHoaSoSanh(b.ten);
    if (t === s || (s.split(' ').length >= 3 && ` ${t} `.includes(` ${s} `))) {
      return `${b.ten} (SGK Tiếng Việt 4, tập ${b.tap === 1 ? 'một' : 'hai'}, Bài ${b.bai}, trang ${b.trang})`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Link nguồn
// ---------------------------------------------------------------------------

/** Bỏ tham số theo dõi (utm_..., fbclid, gclid). */
export function lamSachUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    for (const k of [...u.searchParams.keys()]) {
      if (/^utm_/i.test(k) || ['fbclid', 'gclid', 'ref', 'source'].includes(k.toLowerCase())) u.searchParams.delete(k);
    }
    const s = u.toString();
    return s.endsWith('?') ? s.slice(0, -1) : s;
  } catch {
    return url.trim();
  }
}

// ---------------------------------------------------------------------------
// Kiểm tra trọn gói
// ---------------------------------------------------------------------------

export function kiemTraBaiDoc(b: BaiDocCanKiem, vanBanSgk: VanBanSgk[] = [], boNao?: BoNao | null): KetQuaKiemTraBaiDoc {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const soTieng = countVietnameseSyllables(b.noiDung || '');

  // Thông tin bắt buộc
  if (!b.tieuDe?.trim()) loi.push('Thiếu tên bài.');
  if (!b.noiDung?.trim()) loi.push('Thiếu nội dung bài đọc.');
  if (!b.tacGia?.trim()) loi.push('Thiếu tác giả. Bài đọc phải là tác phẩm có thật, ghi đúng tác giả.');
  if (!b.nguon?.trim() && !b.nguonUrl?.trim()) loi.push('Thiếu nguồn (sách, báo hoặc trang web).');

  // Nguồn không được là SGK
  const nguonGop = `${b.nguon || ''} ${b.nguonUrl || ''}`;
  if (DAU_HIEU_SGK_KHAC.some((re) => re.test(nguonGop))) {
    loi.push('Nguồn ghi là sách giáo khoa. Không lấy bài đọc từ SGK đang dạy hay SGK bộ khác.');
  }

  // Link
  const url = b.nguonUrl?.trim() || '';
  const urlSach = url ? lamSachUrl(url) : '';
  if (url) {
    if (urlSach !== url) canhBao.push('Link nguồn có tham số theo dõi (utm…), đã bỏ đi.');
    if (TEN_MIEN_NGUON_PHU.some((d) => urlSach.toLowerCase().includes(d))) {
      canhBao.push('Link là trang đề thi / lời giải. Nên ghi nguồn chính là sách, báo, tác giả.');
    }
    switch (b.trangThaiLink ?? 'CHUA_KIEM') {
      case 'CHUA_KIEM': loi.push('Chưa kiểm tra link nguồn có mở được không.'); break;
      case 'KHONG_MO_DUOC': loi.push('Link nguồn không mở được.'); break;
      case 'KHONG_KHOP_NOI_DUNG': loi.push('Trang nguồn mở được nhưng không thấy nội dung bài đọc.'); break;
    }
  }

  // Xếp chỗ trong kho
  if (!b.loai) loi.push('Chưa chọn loại bài (đọc thành tiếng / đọc hiểu).');
  if (!b.ky) loi.push('Chưa chọn kì kiểm tra.');
  if (!b.theLoai) loi.push('Chưa chọn thể loại.');
  if (!b.chuDiem) loi.push('Chưa chọn chủ điểm.');
  if (b.ky && b.chuDiem && !chuDiemCuaKy(b.ky, boNao).includes(b.chuDiem)) {
    const tenKy = DANH_SACH_KY.find((k) => k.ma === b.ky)?.ten ?? b.ky;
    loi.push(`Chủ điểm "${b.chuDiem}" không thuộc ${tenKy} (${chuDiemCuaKy(b.ky, boNao).join('; ')}).`);
  }

  // Độ dài
  let khoang: KhoangDoDai | null = null;
  if (b.loai && b.ky && b.theLoai) {
    khoang = khoangDoDai(b.loai, b.ky, b.theLoai, boNao);
    if (!khoang) {
      canhBao.push(`Tổ chưa quy định độ dài cho ${TEN_LOAI[b.loai].toLowerCase()} thể loại ${TEN_THE_LOAI[b.theLoai].toLowerCase()}.`);
    } else if (b.loai === 'DOC_THANH_TIENG' && soTieng > khoang.max + khoang.dungSai) {
      // Bài dài vẫn dùng được: tổ cho phép cắt một đoạn đủ số tiếng (xem cat-doan.ts).
      canhBao.push(`Bài có ${soTieng} tiếng, dài hơn quy định (${khoang.min} – ${khoang.max}). Khi soạn đề sẽ cắt một đoạn đủ số tiếng.`);
    } else if (soTieng < khoang.min - khoang.dungSai || soTieng > khoang.max + khoang.dungSai) {
      loi.push(`Bài có ${soTieng} tiếng; quy định ${khoang.min} – ${khoang.max} tiếng, lệch tối đa ±${khoang.dungSai}.`);
    } else if (soTieng < khoang.min || soTieng > khoang.max) {
      canhBao.push(`Bài có ${soTieng} tiếng, nằm trong độ lệch cho phép (quy định ${khoang.min} – ${khoang.max}).`);
    }
  }

  // Trùng SGK: theo tên, rồi theo nội dung (khi đã có chữ SGK)
  let trungSgk = { tiLe: 0, baiSgk: null as string | null, theoTen: false };
  const theoTen = b.tieuDe ? trungTenSgk(b.tieuDe) : null;
  if (theoTen) {
    trungSgk = { tiLe: 100, baiSgk: theoTen, theoTen: true };
    loi.push(`Tên bài trùng bài đọc SGK đang dạy: ${theoTen}.`);
  }
  if (!trungSgk.theoTen) {
    for (const sgk of vanBanSgk) {
      const tl = tiLeTrung(b.noiDung || '', sgk.noiDung);
      if (tl > trungSgk.tiLe) trungSgk = { tiLe: tl, baiSgk: sgk.ten, theoTen: false };
    }
  }
  if (!trungSgk.theoTen) {
    if (trungSgk.tiLe >= NGUONG_TRUNG_SGK.chan) loi.push(`Nội dung trùng ${trungSgk.tiLe}% với bài SGK "${trungSgk.baiSgk}".`);
    else if (trungSgk.tiLe >= NGUONG_TRUNG_SGK.canhBao) canhBao.push(`Nội dung trùng ${trungSgk.tiLe}% với bài SGK "${trungSgk.baiSgk}" (có thể có trích đoạn).`);
  }

  return { hopLe: loi.length === 0, loi, canhBao, soTieng, khoang, trungSgk, nguonUrlSach: urlSach };
}
