/**
 * ThayKhaiEdu - Đánh giá số tiếng của bài đọc theo quy định của kì kiểm tra.
 * Độ dài thay đổi theo thời điểm kiểm tra (xem khoangDoDai trong quy-dinh.ts).
 */

import type { BoNao } from '@/core/bo-nao/bo-nao';
import type { KyKiemTraBaiDoc, LoaiBaiDoc, TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import { khoangDoDai } from '@/core/reading-passages/quy-dinh';

export interface DanhGiaDoDai {
  nhan: string;
  mau: 'xanh' | 'vang' | 'do';
  /** Dùng được cho kì này (đọc thành tiếng: bài dài hơn vẫn dùng được nhờ cắt đoạn). */
  dungDuoc: boolean;
}

/** null khi tổ chưa quy định độ dài cho thể loại đó ở kì này. */
export function danhGiaDoDai(soTieng: number, loai: LoaiBaiDoc, ky: KyKiemTraBaiDoc, theLoai: TheLoaiBaiDoc, boNao?: BoNao | null): DanhGiaDoDai | null {
  const kh = khoangDoDai(loai, ky, theLoai, boNao);
  if (!kh) return null;
  const { min, max, dungSai } = kh;
  if (loai === 'DOC_THANH_TIENG') {
    if (soTieng >= min - dungSai && soTieng <= max + dungSai) return { nhan: 'Đủ tiếng, dùng nguyên bài', mau: 'xanh', dungDuoc: true };
    if (soTieng > max + dungSai) return { nhan: `Dài hơn ${soTieng - max} tiếng, cắt đoạn ${min}–${max}`, mau: 'vang', dungDuoc: true };
    return { nhan: `Thiếu ${min - soTieng} tiếng, không đủ`, mau: 'do', dungDuoc: false };
  }
  if (soTieng >= min && soTieng <= max) return { nhan: `Đúng ${min}–${max} tiếng`, mau: 'xanh', dungDuoc: true };
  if (soTieng >= min - dungSai && soTieng <= max + dungSai) return { nhan: `Trong dung sai ±${dungSai}`, mau: 'vang', dungDuoc: true };
  return { nhan: soTieng < min ? `Thiếu ${min - soTieng} tiếng` : `Thừa ${soTieng - max} tiếng`, mau: 'do', dungDuoc: false };
}

const KY_HOP_LE: KyKiemTraBaiDoc[] = ['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM'];
const THE_LOAI_HOP_LE: TheLoaiBaiDoc[] = ['TRUYEN', 'MIEU_TA', 'THO', 'VAN_BAN_THONG_TIN', 'KICH', 'KHAC'];

/**
 * Đánh giá bài theo chính kì, loại bài, thể loại đã gắn cho bài (không theo khung cố định cũ).
 * null khi bài chưa gắn kì / loại bài, hoặc tổ chưa quy định cho thể loại đó.
 */
export function danhGiaTheoBai(
  p: { wordCount: number; assessmentPeriod?: string | null; readingUse?: string | null; literaryForm?: string | null },
  boNao?: BoNao | null,
): DanhGiaDoDai | null {
  const ky = KY_HOP_LE.find((k) => k === p.assessmentPeriod);
  const loai: LoaiBaiDoc | undefined = p.readingUse === 'DOC_THANH_TIENG' || p.readingUse === 'DOC_HIEU' ? p.readingUse : undefined;
  if (!ky || !loai) return null;
  const theLoai = THE_LOAI_HOP_LE.find((t) => t === p.literaryForm) ?? 'KHAC';
  return danhGiaDoDai(p.wordCount, loai, ky, theLoai, boNao);
}
