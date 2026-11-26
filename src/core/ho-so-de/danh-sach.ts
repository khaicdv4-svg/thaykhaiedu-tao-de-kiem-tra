/**
 * ThayKhaiEdu - Danh sách hồ sơ đề (môn × kì) đang làm, tính từ ma trận riêng, đặc tả (chung của tổ)
 * và đề của chính người đăng nhập. Hàm thuần, phần đọc dữ liệu ở repository.
 */

import { TRANG_THAI_NHAP, type TrangThaiDe } from '@/core/de/de';

export interface HangBuoc {
  ma_mon: string;
  ky_kiem_tra: string;
  la_ban_nhap?: boolean;
  trang_thai?: string;
  updated_at: string | null;
}

export interface DongHoSoDe {
  mon: string;
  ky: string;
  /** Bước làm tiếp: 2 ma trận, 3 đặc tả, 4 soạn đề, 5 theo dõi duyệt */
  buocTiep: 2 | 3 | 4 | 5;
  /** Câu ngắn cho thầy cô biết hồ sơ đang ở đâu */
  tinhTrang: string;
  xong: boolean;
  capNhatLuc: string | null;
}

const TEN_TT_DE: Partial<Record<TrangThaiDe, string>> = {
  SAN_SANG_DUYET: 'đề đã gửi, chờ thẩm định',
  DANG_THAM_DINH: 'đề đang được thẩm định',
  TRA_LAI: 'đề bị trả lại, cần sửa',
  DA_DUYET_CHEO: 'đề đã được duyệt chéo, chờ duyệt cấp tổ',
  DA_XAC_NHAN_TO: 'tổ đã duyệt đề',
  CHO_BGH_DUYET: 'đề chờ Ban giám hiệu duyệt',
  DA_DUYET: 'đề đã duyệt',
  DA_PHAT_HANH: 'đề đã phát hành',
  DA_LUU_TRU: 'đề đã lưu trữ',
};

const moiHon = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

export function tinhDanhSachHoSo(mtr: HangBuoc[], dt: HangBuoc[], de: HangBuoc[]): DongHoSoDe[] {
  const nhom = new Map<string, { mtr: HangBuoc[]; dt: HangBuoc[]; de: HangBuoc[] }>();
  const them = (ds: HangBuoc[], loai: 'mtr' | 'dt' | 'de') => {
    for (const h of ds) {
      const k = `${h.ma_mon}|${h.ky_kiem_tra}`;
      const g = nhom.get(k) ?? { mtr: [], dt: [], de: [] };
      g[loai].push(h);
      nhom.set(k, g);
    }
  };
  them(mtr, 'mtr');
  them(dt, 'dt');
  them(de, 'de');

  const out: DongHoSoDe[] = [];
  for (const [k, g] of nhom) {
    const [mon, ky] = k.split('|');
    const capNhatLuc = [...g.mtr, ...g.dt, ...g.de].reduce<string | null>((m, h) => moiHon(m, h.updated_at), null);
    const mtrXN = g.mtr.some((h) => !h.la_ban_nhap);
    const dtXN = g.dt.some((h) => !h.la_ban_nhap);
    const ttDe = g.de[0]?.trang_thai as TrangThaiDe | undefined;
    let buocTiep: DongHoSoDe['buocTiep'];
    let tinhTrang: string;
    if (ttDe && !TRANG_THAI_NHAP.includes(ttDe)) {
      buocTiep = ttDe === 'TRA_LAI' ? 4 : 5;
      tinhTrang = TEN_TT_DE[ttDe] ?? ttDe;
    } else if (ttDe) {
      buocTiep = 4;
      tinhTrang = 'đang soạn đề';
    } else if (dtXN) {
      buocTiep = 4;
      tinhTrang = 'đặc tả đã xác nhận, chưa soạn đề';
    } else if (mtrXN) {
      buocTiep = 3;
      tinhTrang = g.dt.length ? 'đặc tả đang làm, chưa xác nhận' : 'ma trận riêng đã xác nhận, chưa làm đặc tả';
    } else {
      buocTiep = 2;
      tinhTrang = 'ma trận riêng đang làm, chưa xác nhận';
    }
    const xong = !!ttDe && ['DA_DUYET', 'DA_PHAT_HANH', 'DA_LUU_TRU'].includes(ttDe);
    out.push({ mon, ky, buocTiep, tinhTrang, xong, capNhatLuc });
  }
  // Hồ sơ đang dở lên trước, rồi theo lần cập nhật gần nhất
  return out.sort((a, b) => Number(a.xong) - Number(b.xong) || (b.capNhatLuc ?? '').localeCompare(a.capNhatLuc ?? ''));
}
