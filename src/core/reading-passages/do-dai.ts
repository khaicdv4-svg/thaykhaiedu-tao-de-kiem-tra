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
