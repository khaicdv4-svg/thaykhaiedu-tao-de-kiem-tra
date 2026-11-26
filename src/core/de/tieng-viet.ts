/**
 * ThayKhaiEdu - Phần riêng của đề Tiếng Việt lớp 4: bài đọc hiểu, bốn bài đọc thành tiếng (mỗi bài một câu hỏi
 * và đáp án). Quy tắc theo skill đề Tiếng Việt của tổ và quy định độ dài ở reading-passages/quy-dinh.ts.
 * Hàm thuần, không đọc ghi cơ sở dữ liệu.
 */

import { khoangDoDai, type KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';

export interface BaiDocDe {
  tieuDe: string;
  noiDung: string;
  tacGia: string;
  /** Ví dụ "Nguồn: Wikipedia, ..." */
  nguon: string;
  /** Mã bài trong kho bài đọc (nếu lấy từ kho). */
  khoId?: string | null;
}

export interface BaiDocThanhTieng extends BaiDocDe {
  cauHoi: string;
  traLoi: string;
}

export interface NoiDungTiengViet {
  baiDocHieu: BaiDocDe;
  /** Đúng 4 bài. */
  baiDocThanhTieng: BaiDocThanhTieng[];
}

export const SO_BAI_THANH_TIENG = 4;

const bai = (): BaiDocDe => ({ tieuDe: '', noiDung: '', tacGia: '', nguon: '', khoId: null });

export function taoNoiDungTiengVietRong(): NoiDungTiengViet {
  return {
    baiDocHieu: bai(),
    baiDocThanhTieng: Array.from({ length: SO_BAI_THANH_TIENG }, () => ({ ...bai(), cauHoi: '', traLoi: '' })),
  };
}

/** Đếm tiếng: tách theo khoảng trắng, không tính tên bài, tác giả, nguồn. */
export function demTieng(noiDung: string): number {
  return noiDung.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export function kiemDinhTiengViet(ky: KyKiemTraBaiDoc, tv: NoiDungTiengViet | undefined): { loi: string[]; canhBao: string[] } {
  const loi: string[] = [];
  const canhBao: string[] = [];
  if (!tv) return { loi: ['Chưa có bài đọc hiểu và bài đọc thành tiếng cho đề Tiếng Việt.'], canhBao };

  const h = tv.baiDocHieu;
  if (!h.tieuDe.trim() || !h.noiDung.trim()) loi.push('Bài đọc hiểu: chưa có tên bài hoặc nội dung.');
  if (h.noiDung.trim() && (!h.tacGia.trim() || !h.nguon.trim())) loi.push('Bài đọc hiểu: cần ghi tác giả và nguồn.');

  if (tv.baiDocThanhTieng.length !== SO_BAI_THANH_TIENG) loi.push(`Đọc thành tiếng cần đúng ${SO_BAI_THANH_TIENG} bài đọc.`);
  const kh = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN');
  tv.baiDocThanhTieng.forEach((b, i) => {
    const t = `Bài đọc ${i + 1}`;
    if (!b.tieuDe.trim() || !b.noiDung.trim()) {
      loi.push(`${t}: chưa có tên bài hoặc nội dung.`);
      return;
    }
    if (!b.tacGia.trim() || !b.nguon.trim()) loi.push(`${t}: cần ghi tác giả và nguồn.`);
    if (!b.cauHoi.trim()) loi.push(`${t}: chưa có câu hỏi.`);
    if (!b.traLoi.trim()) loi.push(`${t}: chưa có đáp án cho câu hỏi.`);
    if (kh) {
      const n = demTieng(b.noiDung);
      if (n < kh.min - kh.dungSai || n > kh.max + kh.dungSai) loi.push(`${t}: ${n} tiếng, quy định ${kh.min}–${kh.max} tiếng (lệch tối đa ±${kh.dungSai}).`);
    }
  });
  const ten = tv.baiDocThanhTieng.map((b) => b.tieuDe.trim().toLowerCase()).filter(Boolean);
  if (new Set(ten).size < ten.length) loi.push('Hai bài đọc thành tiếng trùng tên.');
  return { loi, canhBao };
}

/**
 * Bài đọc chọn ở bước 1 (bảng bai_doc_chon): chỉ phần bài (tên, chữ, tác giả, nguồn), không có câu hỏi.
 * Câu hỏi, đáp án đọc thành tiếng soạn ở bước 4 và lưu trong đề.
 */
export interface BaiDocChon {
  baiDocHieu: BaiDocDe;
  /** Đúng 4 bài. */
  baiDocThanhTieng: BaiDocDe[];
}

const chuoi = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
function lamSachBai(v: unknown): BaiDocDe {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    tieuDe: chuoi(o.tieuDe, 300),
    noiDung: chuoi(o.noiDung, 20000),
    tacGia: chuoi(o.tacGia, 300),
    nguon: chuoi(o.nguon, 1000),
    khoId: typeof o.khoId === 'string' && o.khoId ? o.khoId.slice(0, 64) : null,
  };
}

export function baiDocChonRong(): BaiDocChon {
  return { baiDocHieu: bai(), baiDocThanhTieng: Array.from({ length: SO_BAI_THANH_TIENG }, bai) };
}

export function lamSachBaiDocChon(v: unknown): BaiDocChon {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const tt = Array.isArray(o.baiDocThanhTieng) ? o.baiDocThanhTieng : [];
  return {
    baiDocHieu: lamSachBai(o.baiDocHieu),
    baiDocThanhTieng: Array.from({ length: SO_BAI_THANH_TIENG }, (_, i) => lamSachBai(tt[i])),
  };
}

const coChu = (b: BaiDocDe) => !!(b.tieuDe.trim() || b.noiDung.trim());
export const baiDocChonCoGi = (c: BaiDocChon | null | undefined): c is BaiDocChon =>
  !!c && (coChu(c.baiDocHieu) || c.baiDocThanhTieng.some(coChu));

/** Lấy phần bài đọc của một đề (để bước 1 hiện bài đã có trong đề cũ khi chưa chọn ở bước 1). */
export function baiDocChonTuDe(tv: NoiDungTiengViet | undefined): BaiDocChon | null {
  if (!tv) return null;
  const bo = (b: BaiDocDe): BaiDocDe => ({ tieuDe: b.tieuDe, noiDung: b.noiDung, tacGia: b.tacGia, nguon: b.nguon, khoId: b.khoId ?? null });
  const c = lamSachBaiDocChon({ baiDocHieu: bo(tv.baiDocHieu), baiDocThanhTieng: tv.baiDocThanhTieng.map(bo) });
  return baiDocChonCoGi(c) ? c : null;
}

const giongBai = (a: BaiDocDe, b: BaiDocDe) =>
  a.tieuDe.trim() === b.tieuDe.trim() && a.noiDung.trim() === b.noiDung.trim() && a.tacGia.trim() === b.tacGia.trim() && a.nguon.trim() === b.nguon.trim();

/**
 * Đưa bài đọc chọn ở bước 1 vào đề (bước sau theo bước trước). Bài đọc thành tiếng nào đổi chữ thì bỏ câu hỏi, đáp án
 * cũ của bài đó để thầy cô soạn lại; bài không đổi giữ nguyên. Trả về đề mới và tên các bài đã đổi.
 */
export function apBaiDocChon(tv: NoiDungTiengViet | undefined, chon: BaiDocChon): { tv: NoiDungTiengViet; doi: string[] } {
  const goc = tv ?? taoNoiDungTiengVietRong();
  const doi: string[] = [];
  const hieu = giongBai(goc.baiDocHieu, chon.baiDocHieu) ? goc.baiDocHieu : { ...chon.baiDocHieu };
  if (hieu !== goc.baiDocHieu) doi.push('bài đọc hiểu');
  const thanhTieng = Array.from({ length: SO_BAI_THANH_TIENG }, (_, i): BaiDocThanhTieng => {
    const cu = goc.baiDocThanhTieng[i] ?? { ...bai(), cauHoi: '', traLoi: '' };
    const moi = chon.baiDocThanhTieng[i] ?? bai();
    if (giongBai(cu, moi)) return cu;
    doi.push(`bài đọc thành tiếng ${i + 1}`);
    return { ...moi, cauHoi: '', traLoi: '' };
  });
  return { tv: { baiDocHieu: hieu, baiDocThanhTieng: thanhTieng }, doi };
}
