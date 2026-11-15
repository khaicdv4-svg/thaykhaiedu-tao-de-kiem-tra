/**
 * ThayKhaiEdu - Kết nối Xưởng tạo đề với kho chung PPCT HUB.
 * Phần thuần (không gọi mạng): đọc dòng trạng thái từ hàm tao_de_trang_thai_hub và gom lại để hiển thị.
 */

export type TrangThaiMon = 'khop' | 'co_ban_moi' | 'lech_so_tiet' | 'chua_dong_bo' | 'hub_da_go';

/** Trạng thái chung của kết nối, hiện ở thanh trên cùng và đầu thẻ theo dõi. */
export type TrangThaiKetNoi = 'DONG_BO' | 'CAN_DONG_BO' | 'MAT_KET_NOI' | 'CHUA_CAU_HINH';

export interface DongTrangThaiHub {
  lop: number;
  subjectId: string;
  tenMon: string;
  hubPhienBan: string | null;
  hubCongBoLuc: string | null;
  hubSoTiet: number | null;
  hubSoBai: number | null;
  xuongPhienBan: string | null;
  xuongDongBoLuc: string | null;
  xuongSoTiet: number | null;
  trangThai: TrangThaiMon;
}

export interface TongHopLop {
  lop: number;
  tongMon: number;
  khop: number;
  canDongBo: number;
  lanDongBoGanNhat: string | null;
}

export interface KetQuaTrangThaiHub {
  ketNoi: TrangThaiKetNoi;
  kiemTraLuc: string;
  namHoc: string;
  loi?: string;
  mon: DongTrangThaiHub[];
  lop: TongHopLop[];
  tong: { tongMon: number; khop: number; canDongBo: number };
}

const TRANG_THAI_HOP_LE: TrangThaiMon[] = ['khop', 'co_ban_moi', 'lech_so_tiet', 'chua_dong_bo', 'hub_da_go'];

const so = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const chu = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Chuyển một dòng trả về từ Postgres (snake_case) sang dạng app dùng. */
export function docDongTrangThai(r: Record<string, unknown>): DongTrangThaiHub {
  const tt = String(r.trang_thai ?? '') as TrangThaiMon;
  return {
    lop: so(r.lop) ?? 0,
    subjectId: String(r.subject_id ?? ''),
    tenMon: chu(r.ten_mon) ?? String(r.subject_id ?? ''),
    hubPhienBan: chu(r.hub_version),
    hubCongBoLuc: chu(r.hub_published_at),
    hubSoTiet: so(r.hub_so_tiet),
    hubSoBai: so(r.hub_so_bai),
    xuongPhienBan: chu(r.xuong_version),
    xuongDongBoLuc: chu(r.xuong_dong_bo_luc),
    xuongSoTiet: so(r.xuong_so_tiet),
    trangThai: TRANG_THAI_HOP_LE.includes(tt) ? tt : 'chua_dong_bo',
  };
}

/** Môn cần thầy bấm đồng bộ: Hub có bản mới, số tiết lệch, hoặc chưa lấy về lần nào. */
export const canDongBo = (t: TrangThaiMon): boolean => t === 'co_ban_moi' || t === 'lech_so_tiet' || t === 'chua_dong_bo';

/** Gom trạng thái theo lớp và tính trạng thái chung. */
export function tongHopTrangThai(mon: DongTrangThaiHub[], namHoc: string, kiemTraLuc = new Date().toISOString()): KetQuaTrangThaiHub {
  const theoLop = new Map<number, DongTrangThaiHub[]>();
  mon.forEach((m) => theoLop.set(m.lop, [...(theoLop.get(m.lop) ?? []), m]));

  const lop: TongHopLop[] = [...theoLop.entries()]
    .sort(([a], [b]) => a - b)
    .map(([l, ds]) => ({
      lop: l,
      tongMon: ds.length,
      khop: ds.filter((m) => m.trangThai === 'khop').length,
      canDongBo: ds.filter((m) => canDongBo(m.trangThai)).length,
      lanDongBoGanNhat: ds.reduce<string | null>((g, m) => (m.xuongDongBoLuc && (!g || m.xuongDongBoLuc > g) ? m.xuongDongBoLuc : g), null),
    }));

  const tong = {
    tongMon: mon.length,
    khop: mon.filter((m) => m.trangThai === 'khop').length,
    canDongBo: mon.filter((m) => canDongBo(m.trangThai)).length,
  };

  // Chỉ tính các lớp trường đã lấy về ít nhất một môn; lớp chưa dùng thì không báo "cần đồng bộ".
  const lopDangDung = new Set(lop.filter((l) => l.lanDongBoGanNhat).map((l) => l.lop));
  const canDongBoLopDangDung = mon.some((m) => lopDangDung.has(m.lop) && canDongBo(m.trangThai));

  return {
    ketNoi: mon.length === 0 ? 'MAT_KET_NOI' : canDongBoLopDangDung || lopDangDung.size === 0 ? 'CAN_DONG_BO' : 'DONG_BO',
    kiemTraLuc,
    namHoc,
    mon,
    lop,
    tong,
  };
}

export const NHAN_TRANG_THAI_MON: Record<TrangThaiMon, { chu: string; giaiThich: string }> = {
  khop: { chu: 'Khớp', giaiThich: 'Xưởng đang dùng đúng bản mới nhất trên kho chung.' },
  co_ban_moi: { chu: 'Hub có bản mới', giaiThich: 'Kho chung vừa công bố bản mới, cần đồng bộ để ra đề theo bản này.' },
  lech_so_tiet: { chu: 'Lệch số tiết', giaiThich: 'Số tiết trong Xưởng khác kho chung, nên đồng bộ lại.' },
  chua_dong_bo: { chu: 'Chưa lấy về', giaiThich: 'Môn này có trên kho chung nhưng Xưởng chưa lấy về.' },
  hub_da_go: { chu: 'Hub đã gỡ', giaiThich: 'Kho chung không còn bản công bố của môn này. Xưởng vẫn giữ bản cũ.' },
};

export const NHAN_KET_NOI: Record<TrangThaiKetNoi, string> = {
  DONG_BO: 'Đã đồng bộ',
  CAN_DONG_BO: 'Cần đồng bộ',
  MAT_KET_NOI: 'Mất kết nối',
  CHUA_CAU_HINH: 'Chưa cấu hình',
};

/** "15/11/2026 13:40" theo giờ Việt Nam. */
export function ngayGio(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
