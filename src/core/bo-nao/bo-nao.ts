/**
 * ThayKhaiEdu - "Bộ não chuyên môn" của tổ: các quy định lấy từ ma trận chung đã tải lên
 * (độ dài bài đọc, tốc độ đọc thành tiếng, chủ điểm theo kì) và quy định riêng do tổ tự viết.
 * Kì nào chưa có trong bộ não thì app dùng số mặc định trong quy-dinh.ts.
 */

import type { KyKiemTraBaiDoc, TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

export interface QuyDinhMotKy {
  ky: KyKiemTraBaiDoc;
  /** Tốc độ đọc thành tiếng (tiếng/phút) = số tiếng của bài đọc thành tiếng. */
  tocDo: { min: number; max: number } | null;
  /** Độ dài bài đọc hiểu theo thể loại: [min, max]. */
  doDai: Partial<Record<TheLoaiBaiDoc, [number, number]>>;
  chuDiem: string[];
  /** Tên file ma trận đã tải, để biết số liệu từ đâu ra. */
  tenFile?: string;
}

export interface BoNao {
  dungSai: { thanhTieng: number; docHieu: number };
  ky: Partial<Record<KyKiemTraBaiDoc, QuyDinhMotKy>>;
  /** Quy định riêng của tổ (viết tay hoặc lấy từ file). Chỉ để AI đọc, không tự thành luật kiểm tra. */
  quyDinhRieng: string;
}

export const DUNG_SAI_MAC_DINH = { thanhTieng: 5, docHieu: 10 } as const;

export function boNaoTrong(): BoNao {
  return { dungSai: { ...DUNG_SAI_MAC_DINH }, ky: {}, quyDinhRieng: '' };
}

const SO = (v: unknown, mac: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1000 ? Math.round(v) : mac);

/** Làm sạch dữ liệu đọc từ cơ sở dữ liệu hoặc từ trình duyệt gửi lên. */
export function lamSachBoNao(v: unknown): BoNao {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, any>;
  const kq = boNaoTrong();
  kq.dungSai = { thanhTieng: SO(o.dungSai?.thanhTieng, 5), docHieu: SO(o.dungSai?.docHieu, 10) };
  kq.quyDinhRieng = typeof o.quyDinhRieng === 'string' ? o.quyDinhRieng.slice(0, 20000) : '';
  const KY: KyKiemTraBaiDoc[] = ['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM'];
  const THE_LOAI: TheLoaiBaiDoc[] = ['TRUYEN', 'MIEU_TA', 'THO', 'VAN_BAN_THONG_TIN', 'KICH', 'KHAC'];
  for (const ky of KY) {
    const m = o.ky?.[ky];
    if (!m || typeof m !== 'object') continue;
    const doDai: QuyDinhMotKy['doDai'] = {};
    for (const tl of THE_LOAI) {
      const c = m.doDai?.[tl];
      if (Array.isArray(c) && c.length === 2 && c[0] > 0 && c[1] >= c[0] && c[1] < 1000) doDai[tl] = [Math.round(c[0]), Math.round(c[1])];
    }
    const td = m.tocDo;
    kq.ky[ky] = {
      ky,
      tocDo: td && td.min > 0 && td.max >= td.min && td.max < 1000 ? { min: Math.round(td.min), max: Math.round(td.max) } : null,
      doDai,
      chuDiem: Array.isArray(m.chuDiem) ? m.chuDiem.filter((x: unknown) => typeof x === 'string').slice(0, 6) : [],
      tenFile: typeof m.tenFile === 'string' ? m.tenFile.slice(0, 200) : undefined,
    };
  }
  return kq;
}
