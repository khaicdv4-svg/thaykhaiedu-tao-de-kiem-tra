/**
 * ThayKhaiEdu - Môn và kì kiểm tra định kì theo khối (Thông tư 27/2020/TT-BGDĐT, Điều 7):
 * - Cuối HKI và cuối năm: Tiếng Việt, Toán; lớp 3: thêm Tin học, Công nghệ; lớp 4, 5: thêm Khoa học, Lịch sử và Địa lí, Tin học, Công nghệ.
 * - Lớp 4, 5 có thêm giữa HKI và giữa HKII với Tiếng Việt, Toán.
 * Tổ có kiểm tra thêm (môn hoặc kì ngoài quy định) thì tổ trưởng bật ở Bộ não chuyên môn (kiemTraThem), không gõ cứng.
 * Tiếng Anh không đưa vào (giáo viên bộ môn tự làm đề).
 * Hàm thuần.
 */

import { DANH_SACH_KY, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';

export interface MonKiemTra { ma: string; ten: string }

/** Mọi môn có kiểm tra định kì mà app hỗ trợ, theo thứ tự hiện trong ô chọn. */
export const MON_KIEM_TRA: MonKiemTra[] = [
  { ma: 'TOAN', ten: 'Toán' },
  { ma: 'TIENG_VIET', ten: 'Tiếng Việt' },
  { ma: 'KHOA_HOC', ten: 'Khoa học' },
  { ma: 'LS_DL', ten: 'Lịch sử và Địa lí' },
  { ma: 'TIN_HOC', ten: 'Tin học' },
  { ma: 'CONG_NGHE', ten: 'Công nghệ' },
];

export interface KiemTraThem { mon: string; ky: KyDung }

const MON_THEO_KHOI: Record<number, string[]> = {
  1: ['TOAN', 'TIENG_VIET'],
  2: ['TOAN', 'TIENG_VIET'],
  3: ['TOAN', 'TIENG_VIET', 'TIN_HOC', 'CONG_NGHE'],
  4: ['TOAN', 'TIENG_VIET', 'KHOA_HOC', 'LS_DL', 'TIN_HOC', 'CONG_NGHE'],
  5: ['TOAN', 'TIENG_VIET', 'KHOA_HOC', 'LS_DL', 'TIN_HOC', 'CONG_NGHE'],
};

export const tenMon = (ma: string): string => MON_KIEM_TRA.find((m) => m.ma === ma)?.ten ?? ma;
export const laMonKiemTra = (ma: string | null | undefined): ma is string => !!ma && MON_KIEM_TRA.some((m) => m.ma === ma);

/** Kì theo quy định (chưa tính phần tổ bật thêm). */
export function kyQuyDinh(khoi: number, mon: string): KyDung[] {
  if (!(MON_THEO_KHOI[khoi] ?? MON_THEO_KHOI[4]).includes(mon)) return [];
  const giuaKy = khoi >= 4 && (mon === 'TOAN' || mon === 'TIENG_VIET');
  return giuaKy ? ['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM'] : ['CUOI_HK1', 'CUOI_NAM'];
}

/** Các môn của khối: theo quy định, cộng môn tổ bật thêm. */
export function monTheoKhoi(khoi: number, them: KiemTraThem[] = []): MonKiemTra[] {
  const ma = new Set([...(MON_THEO_KHOI[khoi] ?? MON_THEO_KHOI[4]), ...them.map((t) => t.mon)]);
  return MON_KIEM_TRA.filter((m) => ma.has(m.ma));
}

/** Các kì của một môn ở một khối: theo quy định, cộng kì tổ bật thêm. Giữ thứ tự trong năm học. */
export function kyTheoMon(khoi: number, mon: string, them: KiemTraThem[] = []): KyDung[] {
  const ds = new Set<KyDung>([...kyQuyDinh(khoi, mon), ...them.filter((t) => t.mon === mon).map((t) => t.ky)]);
  return DANH_SACH_KY.map((k) => k.ma).filter((k) => ds.has(k));
}

/** Môn, kì đang chọn không còn hợp lệ ở khối này thì chuyển về lựa chọn gần nhất còn hợp lệ. */
export function chonHopLe(khoi: number, mon: string, ky: KyDung, them: KiemTraThem[] = []): { mon: string; ky: KyDung } {
  const dsMon = monTheoKhoi(khoi, them);
  const m = dsMon.some((x) => x.ma === mon) ? mon : dsMon[0]?.ma ?? 'TOAN';
  const dsKy = kyTheoMon(khoi, m, them);
  const k = dsKy.includes(ky) ? ky : dsKy.find((x) => x.startsWith('CUOI')) ?? dsKy[0] ?? 'CUOI_HK1';
  return { mon: m, ky: k };
}

/** Làm sạch danh sách kiểm tra thêm đọc từ Bộ não. */
export function lamSachKiemTraThem(v: unknown): KiemTraThem[] {
  if (!Array.isArray(v)) return [];
  const kyHopLe = new Set(DANH_SACH_KY.map((k) => k.ma));
  const thay = new Set<string>();
  const kq: KiemTraThem[] = [];
  for (const x of v.slice(0, 50)) {
    const mon = (x as KiemTraThem)?.mon;
    const ky = (x as KiemTraThem)?.ky;
    if (!laMonKiemTra(mon) || !kyHopLe.has(ky)) continue;
    const khoa = `${mon}|${ky}`;
    if (thay.has(khoa)) continue;
    thay.add(khoa);
    kq.push({ mon, ky });
  }
  return kq;
}
