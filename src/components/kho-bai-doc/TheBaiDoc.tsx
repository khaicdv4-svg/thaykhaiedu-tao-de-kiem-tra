'use client';

/**
 * Thẻ một bài đọc: sửa thông tin, xem kết quả kiểm tra tự động.
 * Dùng ở màn hình Nhập kho (sửa được) và Hàng chờ duyệt (chỉ xem).
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Link2, Loader2, Sparkles, XCircle } from 'lucide-react';
import {
  chuDiemCuaKy,
  CHU_DIEM_TV4,
  DANH_SACH_KY,
  TEN_LOAI,
  TEN_THE_LOAI,
  type KyKiemTraBaiDoc,
  type LoaiBaiDoc,
  type TheLoaiBaiDoc,
} from '@/core/reading-passages/quy-dinh';
import type { BoNao } from '@/core/bo-nao/bo-nao';
import { aiTimNguonChoBai } from '@/lib/ai-tim-nguon-client';
import { kiemTraBaiDoc, laDuongDanWeb, type BaiDocCanKiem, type TrangThaiLink } from '@/core/reading-passages/kiem-tra';

export interface BaiDocSua extends BaiDocCanKiem {
  khoa: string;
  chon: boolean;
  ghiChu?: string[];
  /** Nhãn khi bài do AI chỉnh độ dài. */
  nhanAI?: string | null;
  /** Tên file gốc khi bài được tách từ file tải lên. */
  tenFile?: string;
}

const NHAN_LINK: Record<TrangThaiLink, { ten: string; mau: string }> = {
  CHUA_KIEM: { ten: 'Chưa kiểm link', mau: 'bg-amber-50 text-amber-800 border-amber-200' },
  CON_TON_TAI: { ten: 'Link mở được, đúng bài', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  KHONG_MO_DUOC: { ten: 'Link không mở được', mau: 'bg-red-50 text-red-700 border-red-200' },
  KHONG_KHOP_NOI_DUNG: { ten: 'Link không có bài này', mau: 'bg-red-50 text-red-700 border-red-200' },
  SACH_IN: { ten: 'Nguồn sách in', mau: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const o = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-600';

export function TheBaiDoc({
  bai,
  onDoi,
  chiXem = false,
  hanhDong,
  phuTro,
  boNao,
}: {
  bai: BaiDocSua;
  onDoi?: (b: BaiDocSua) => void;
  chiXem?: boolean;
  hanhDong?: React.ReactNode;
  /** Khối phụ hiện trên nút hành động (ví dụ gợi ý cắt đoạn, nút lưu). */
  phuTro?: React.ReactNode;
  /** Bộ não chuyên môn của trường (null: dùng số mặc định). */
  boNao?: BoNao | null;
}) {
  const [moNoiDung, setMoNoiDung] = useState(false);
  const [dangKiemLink, setDangKiemLink] = useState(false);
  const [dangTimNguon, setDangTimNguon] = useState(false);
  const [tinNguon, setTinNguon] = useState<{ ok: boolean; text: string } | null>(null);
  const kq = useMemo(() => kiemTraBaiDoc(bai, [], boNao), [bai, boNao]);
  const doi = (p: Partial<BaiDocSua>) => {
    if (!onDoi) return;
    // Đổi link thì phải kiểm lại
    const linkMoi = 'nguonUrl' in p && p.nguonUrl !== bai.nguonUrl;
    onDoi({ ...bai, ...p, ...(linkMoi ? { trangThaiLink: 'CHUA_KIEM' as const } : {}) });
  };
  const chuDiemDuocChon = bai.ky ? chuDiemCuaKy(bai.ky, boNao) : CHU_DIEM_TV4.map((c) => c.ten);

  const kiemLink = async () => {
    if (!bai.nguonUrl) return;
    setDangKiemLink(true);
    try {
      const r = await fetch('/api/reading-passages/kiem-tra-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bai.nguonUrl, noiDung: bai.noiDung }),
      }).then((x) => x.json());
      onDoi?.({ ...bai, nguonUrl: r.url || bai.nguonUrl, trangThaiLink: r.trangThai, ghiChu: [`Link: ${r.lyDo}`, ...(bai.ghiChu ?? []).filter((g) => !g.startsWith('Link:'))] });
    } finally {
      setDangKiemLink(false);
    }
  };

  const linkSaiDang = !!bai.nguonUrl?.trim() && !laDuongDanWeb(bai.nguonUrl);
  const timNguon = async () => {
    setDangTimNguon(true);
    setTinNguon(null);
    try {
      const kqNguon = await aiTimNguonChoBai(bai);
      if (kqNguon.daTim) onDoi?.(kqNguon.bai);
      setTinNguon({ ok: kqNguon.daTim, text: kqNguon.thongBao });
    } catch (e) {
      setTinNguon({ ok: false, text: e instanceof Error ? e.message : 'Không tìm nguồn được.' });
    } finally {
      setDangTimNguon(false);
    }
  };

  const link = linkSaiDang
    ? { ten: 'Ô link không phải link', mau: 'bg-red-50 text-red-700 border-red-200' }
    : NHAN_LINK[bai.nguonUrl?.trim() ? bai.trangThaiLink ?? 'CHUA_KIEM' : 'SACH_IN'];
  const doDai = kq.khoang ? `${kq.soTieng} tiếng / quy định ${kq.khoang.min}–${kq.khoang.max} (±${kq.khoang.dungSai})` : `${kq.soTieng} tiếng`;
  const doDaiMau = kq.loi.some((l) => l.includes('tiếng; quy định')) ? 'bg-red-50 text-red-700 border-red-200'
    : kq.canhBao.some((c) => c.includes('độ lệch')) ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 ${kq.hopLe ? 'border-slate-200' : 'border-red-200'}`}>
      <div className="flex flex-wrap items-start gap-3">
        {!chiXem && (
          <input type="checkbox" className="mt-2 h-4 w-4" aria-label="Chọn bài này" checked={bai.chon} onChange={(e) => doi({ chon: e.target.checked })} />
        )}
        <div className="flex-1 min-w-[220px]">
          <input className={`${o} font-semibold`} value={bai.tieuDe} disabled={chiXem} placeholder="Tên bài" onChange={(e) => doi({ tieuDe: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {bai.nhanAI && <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium text-violet-800">{bai.nhanAI}</span>}
          <span className={`rounded-full border px-2 py-0.5 ${doDaiMau}`}>{doDai}</span>
          <span className={`rounded-full border px-2 py-0.5 ${link.mau}`}>{link.ten}</span>
          <span className={`rounded-full border px-2 py-0.5 ${kq.trungSgk.tiLe >= 30 ? 'bg-red-50 text-red-700 border-red-200' : kq.trungSgk.tiLe >= 10 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {kq.trungSgk.theoTen ? 'Trùng tên bài SGK' : kq.trungSgk.tiLe > 0 ? `Trùng SGK ${kq.trungSgk.tiLe}%` : 'Không trùng SGK'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input className={o} value={bai.tacGia} disabled={chiXem} placeholder="Tác giả (bắt buộc)" onChange={(e) => doi({ tacGia: e.target.value })} />
        <input className={o} value={bai.nguon} disabled={chiXem} placeholder="Nguồn: tên sách/báo, NXB, năm, trang" onChange={(e) => doi({ nguon: e.target.value })} />
        <div className="md:col-span-2 flex gap-2">
          <input className={o} value={bai.nguonUrl ?? ''} disabled={chiXem} placeholder="Link nguồn, chỉ dán đường dẫn https://… (để trống nếu là sách in)" onChange={(e) => doi({ nguonUrl: e.target.value })} />
          {!chiXem && (
            <button type="button" onClick={kiemLink} disabled={!bai.nguonUrl || linkSaiDang || dangKiemLink} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50 disabled:opacity-50">
              {dangKiemLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Kiểm tra link
            </button>
          )}
          {!chiXem && (
            <button type="button" onClick={timNguon} disabled={dangTimNguon || !bai.noiDung.trim()} title="AI tìm trên mạng tác giả, link hoặc tên sách và trang của bài này" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50">
              {dangTimNguon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {dangTimNguon ? 'Đang tìm (1–3 phút)…' : 'AI tìm nguồn'}
            </button>
          )}
        </div>
        {tinNguon && <div className={`md:col-span-2 text-xs ${tinNguon.ok ? 'text-emerald-700' : 'text-amber-800'}`}>{tinNguon.text}</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select className={o} aria-label="Loại bài" disabled={chiXem} value={bai.loai ?? ''} onChange={(e) => doi({ loai: (e.target.value || null) as LoaiBaiDoc | null })}>
          <option value="">– Loại bài –</option>
          {(Object.keys(TEN_LOAI) as LoaiBaiDoc[]).map((k) => <option key={k} value={k}>{TEN_LOAI[k]}</option>)}
        </select>
        <select className={o} aria-label="Kì kiểm tra" disabled={chiXem} value={bai.ky ?? ''} onChange={(e) => {
          const ky = (e.target.value || null) as KyKiemTraBaiDoc | null;
          doi({ ky, chuDiem: ky && bai.chuDiem && !chuDiemCuaKy(ky, boNao).includes(bai.chuDiem) ? null : bai.chuDiem });
        }}>
          <option value="">– Kì –</option>
          {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
        </select>
        <select className={o} aria-label="Chủ điểm" disabled={chiXem} value={bai.chuDiem ?? ''} onChange={(e) => doi({ chuDiem: e.target.value || null })}>
          <option value="">– Chủ điểm –</option>
          {chuDiemDuocChon.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={o} aria-label="Thể loại" disabled={chiXem} value={bai.theLoai ?? ''} onChange={(e) => doi({ theLoai: (e.target.value || null) as TheLoaiBaiDoc | null })}>
          <option value="">– Thể loại –</option>
          {(Object.keys(TEN_THE_LOAI) as TheLoaiBaiDoc[]).map((k) => <option key={k} value={k}>{TEN_THE_LOAI[k]}</option>)}
        </select>
      </div>

      <div>
        <button type="button" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100 active:bg-blue-200" onClick={() => setMoNoiDung(!moNoiDung)}>
          {moNoiDung ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />} {moNoiDung ? 'Ẩn nội dung' : 'Xem / sửa nội dung'}
        </button>
        {moNoiDung && (
          <textarea className={`${o} mt-2 min-h-48 leading-relaxed`} style={{ fontFamily: "'Times New Roman', serif", fontSize: '13pt' }} value={bai.noiDung} disabled={chiXem} onChange={(e) => doi({ noiDung: e.target.value })} />
        )}
      </div>

      {bai.ghiChu && bai.ghiChu.filter(Boolean).length > 0 && (
        <ul className="text-xs text-slate-600 list-disc pl-5 space-y-0.5">{bai.ghiChu.filter(Boolean).map((g) => <li key={g}>{g}</li>)}</ul>
      )}
      {kq.loi.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-sm text-red-800">
          <div className="flex items-center gap-1.5 font-semibold"><XCircle className="w-4 h-4" /> Phải sửa trước khi gửi duyệt</div>
          <ul className="list-disc pl-6 mt-1">{kq.loi.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
      {kq.canhBao.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-sm text-amber-900">
          <div className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="w-4 h-4" /> Cần xem xét</div>
          <ul className="list-disc pl-6 mt-1">{kq.canhBao.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
      {kq.hopLe && kq.canhBao.length === 0 && (
        <div className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Đạt các kiểm tra tự động.</div>
      )}
      {phuTro}
      {hanhDong}
    </div>
  );
}
