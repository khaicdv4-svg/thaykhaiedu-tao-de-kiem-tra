/**
 * Mẫu ma trận chung của tổ khối 4. Nguồn: docs/mau-ma-tran.
 * File này sinh tự động bởi scripts/sinh-mau-ma-tran.mjs.
 */
import type { MaTranChung } from '@/types/matrix-template';
import { MA_TRAN_CHUNG_CHK1_CONG_NGHE } from './chk1-cong-nghe';
import { MA_TRAN_CHUNG_CHK1_KHOA_HOC } from './chk1-khoa-hoc';
import { MA_TRAN_CHUNG_CHK1_LICH_SU_DIA_LI } from './chk1-lich-su-dia-li';
import { MA_TRAN_CHUNG_CHK1_TIENG_VIET } from './chk1-tieng-viet';
import { MA_TRAN_CHUNG_CHK1_TOAN } from './chk1-toan';

export const MAU_MA_TRAN_CHUNG: MaTranChung[] = [
  MA_TRAN_CHUNG_CHK1_CONG_NGHE,
  MA_TRAN_CHUNG_CHK1_KHOA_HOC,
  MA_TRAN_CHUNG_CHK1_LICH_SU_DIA_LI,
  MA_TRAN_CHUNG_CHK1_TIENG_VIET,
  MA_TRAN_CHUNG_CHK1_TOAN,
];

export function timMaTranChung(maMon: string, ky: MaTranChung['ky_kiem_tra']): MaTranChung | undefined {
  return MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon && m.ky_kiem_tra === ky);
}
