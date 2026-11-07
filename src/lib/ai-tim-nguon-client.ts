/**
 * Giao diện: nhờ AI tìm nguồn cho một bài đọc, rồi điền vào các ô tác giả, nguồn, link.
 * Link AI đưa ra đã được máy chủ mở thử; nguồn sách in thì vẫn cần người đối chiếu.
 */

import type { BaiDocSua } from '@/components/kho-bai-doc/TheBaiDoc';
import { laDuongDanWeb } from '@/core/reading-passages/kiem-tra';

export interface KetQuaTimNguon {
  bai: BaiDocSua;
  daTim: boolean;
  /** Câu báo ngắn cho người dùng. */
  thongBao: string;
}

const boGhiChuCu = (g?: string[]) => (g ?? []).filter((x) => !x.startsWith('AI tìm nguồn:') && !x.startsWith('Link:'));

/** Mở thử link đã có trong bài (không dùng AI). Trả về bài đã cập nhật trạng thái link. */
export async function kiemLinkChoBai(bai: BaiDocSua): Promise<BaiDocSua> {
  const r = await fetch('/api/reading-passages/kiem-tra-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: bai.nguonUrl, noiDung: bai.noiDung }),
  }).then((x) => x.json());
  return { ...bai, nguonUrl: r.url || bai.nguonUrl, trangThaiLink: r.trangThai, ghiChu: [`Link: ${r.lyDo}`, ...boGhiChuCu(bai.ghiChu)] };
}

export async function aiTimNguonChoBai(bai: BaiDocSua): Promise<KetQuaTimNguon> {
  const r = await fetch('/api/reading-passages/ai-tim-nguon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tieuDe: bai.tieuDe, noiDung: bai.noiDung, tacGia: bai.tacGia }),
  }).then((x) => x.json());
  if (r.error) return { bai, daTim: false, thongBao: r.error };
  if (!r.daTimThay) {
    const cd = r.chanDoan as { daTimWeb: boolean; soLanTim: number; lyDoDung: string | null; giay: number; doDaiTraLoi: number; trichDau: string } | undefined;
    const chiTiet = cd
      ? ` [Chi tiết: ${cd.daTimWeb ? `AI đã tìm web ${cd.soLanTim} lần` : 'cổng không báo có tìm web'}, ${cd.giay} giây${cd.lyDoDung ? `, dừng vì ${cd.lyDoDung}` : ''}${cd.trichDau && cd.doDaiTraLoi < 400 ? `. AI trả lời: ${cd.trichDau}` : ''}]`
      : '';
    return { bai, daTim: false, thongBao: `${r.ghiChu || 'AI không tìm thấy nguồn.'}${chiTiet}` };
  }

  const coLink = !!r.nguonUrl && laDuongDanWeb(r.nguonUrl);
  const tacGiaKhac = bai.tacGia.trim() && r.tacGia && bai.tacGia.trim().toLowerCase() !== String(r.tacGia).toLowerCase();
  const ghiChu = [
    `AI tìm nguồn: ${r.ghiChu || 'đã tìm thấy nguồn'}${r.doTinCay ? ` (độ tin cậy: ${r.doTinCay === 'CAO' ? 'cao' : r.doTinCay === 'TRUNG_BINH' ? 'trung bình' : 'thấp'})` : ''}`,
    tacGiaKhac ? `AI tìm nguồn: AI cho rằng tác giả là "${r.tacGia}", ô tác giả vẫn giữ "${bai.tacGia}", thầy cô đối chiếu.` : '',
    ...boGhiChuCu(bai.ghiChu),
  ].filter(Boolean);
  const moi: BaiDocSua = {
    ...bai,
    tacGia: bai.tacGia.trim() || r.tacGia || '',
    nguon: r.nguon || bai.nguon,
    nguonUrl: coLink ? r.nguonUrl : '',
    trangThaiLink: coLink ? (r.trangThaiLink ?? 'CON_TON_TAI') : undefined,
    ghiChu,
  };
  return {
    bai: moi,
    daTim: true,
    thongBao: coLink ? 'AI tìm được nguồn, link đã mở thử và thấy đúng bài.' : 'AI tìm được nguồn sách in. Máy chưa kiểm chứng được, thầy cô đối chiếu với sách.',
  };
}
