/**
 * ThayKhaiEdu - Ngữ cảnh "chương trình đang học" cho AI soạn câu:
 * các bài đã học trong kì theo phân phối chương trình của trường (đến tuần kiểm tra)
 * và quy định riêng của tổ ghi ở Bộ não chuyên môn. Thiếu dữ liệu thì bỏ qua, không chặn việc soạn.
 */
import { dsTietPpct } from '@/lib/repositories/chuong-trinh.repository';
import { docBoNaoNeuCo } from '@/lib/repositories/bo-nao.repository';
import { phamViDaHoc } from '@/core/de/trinh-do-lop';
import { TUAN_CUOI_KY } from '@/core/de/de-viet-tv';
import type { KyKiemTra } from '@/types/matrix-template';

export async function nguCanhChuongTrinhDe(mon: string, khoi: number, ky: string | null | undefined, tuanKiemTra?: number | null): Promise<string> {
  const phan: string[] = [];
  const tuanDen = (typeof tuanKiemTra === 'number' && tuanKiemTra > 0 ? tuanKiemTra : null) ?? (ky ? TUAN_CUOI_KY[ky as KyKiemTra] : undefined) ?? 35;
  // Không rõ kì (soạn ngân hàng câu hỏi) thì không giới hạn theo tuần
  if (ky) try {
    const tiet = await dsTietPpct(mon, khoi);
    const pv = phamViDaHoc(tiet, ky, tuanDen);
    if (pv) phan.push(pv);
  } catch { /* môn chưa có PPCT: bỏ qua */ }
  const bn = await docBoNaoNeuCo();
  const q = bn?.quyDinhRieng?.trim();
  if (q) phan.push(`QUY ĐỊNH RIÊNG CỦA TỔ (Bộ não chuyên môn, bắt buộc tuân theo nếu liên quan đến câu này):\n${q.slice(0, 3000)}`);
  return phan.join('\n\n');
}
