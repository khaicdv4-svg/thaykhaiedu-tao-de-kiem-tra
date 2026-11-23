'use client';

/**
 * Bước 1 – Lịch sử ma trận riêng, đặc tả của chính mình cho môn, kì đang chọn; chọn bản rồi xóa.
 * Xóa được cả bộ đang dùng. Trước khi xóa luôn xem trước: xóa ma trận thì đặc tả lập từ nó và đề còn ở bước soạn đi theo.
 * Bản có đề đã gửi duyệt hoặc đã duyệt dựa vào thì không chọn được.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, History, Loader2, Trash2, TriangleAlert } from 'lucide-react';

interface Ban {
  id: string;
  loai: 'MA_TRAN' | 'DAC_TA';
  phienBan: number | null;
  banNhap: boolean;
  daCat: boolean;
  dangDung: boolean;
  capNhatLuc: string;
  maTranRiengId?: string | null;
  phienBanMaTranRieng?: number | null;
  giuLai: boolean;
}
interface MucXoa { id: string; phienBan: number | null; banNhap: boolean; daCat: boolean }
interface XemTruoc { maTran: MucXoa[]; dacTa: MucXoa[]; de: { id: string; trangThai: string }[]; chan: string[] }

const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const ngay = (s: string) => { try { return new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const tenBan = (b: { phienBan: number | null; banNhap: boolean }) => (b.banNhap ? 'Bản nháp' : `Phiên bản ${b.phienBan ?? '?'}`);
const dsTen = (ds: MucXoa[]) => ds.map((x) => `${tenBan(x)}${x.daCat ? ' (đã cất)' : ''}`).join(', ');

export function LichSuBan({ maMon, ky, tenMonKy, onDaXoa }: { maMon: string; ky: string; tenMonKy: string; onDaXoa: () => void }) {
  const [mo, setMo] = useState(false);
  const [ds, setDs] = useState<Ban[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [xem, setXem] = useState<XemTruoc | null>(null);
  const [dang, setDang] = useState<'xem' | 'xoa' | null>(null);
  const [tb, setTb] = useState<string | null>(null);

  const nap = useCallback(async () => {
    setLoi(null);
    try {
      const r = await fetch(`/api/ho-so-de/ban?mon=${maMon}&ky=${ky}`);
      const j = (await r.json()) as { ban?: Ban[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? `Lỗi ${r.status}`);
      setDs(j.ban ?? []);
    } catch (e) { setDs(null); setLoi(e instanceof Error ? e.message : String(e)); }
  }, [maMon, ky]);

  useEffect(() => { setChon(new Set()); setXem(null); setTb(null); setDs(null); void nap(); }, [nap]);

  const maTran = useMemo(() => (ds ?? []).filter((b) => b.loai === 'MA_TRAN'), [ds]);
  const dacTa = useMemo(() => (ds ?? []).filter((b) => b.loai === 'DAC_TA'), [ds]);
  const pbMaTran = useMemo(() => new Map(maTran.map((m) => [m.id, m])), [maTran]);
  const chonDuoc = (b: Ban) => !b.giuLai;

  const datChon = (ids: string[]) => { setChon(new Set(ids)); setXem(null); setTb(null); };
  const bat = (id: string) => { const s = new Set(chon); if (s.has(id)) s.delete(id); else s.add(id); datChon([...s]); };
  const banCu = (ds ?? []).filter((b) => !b.dangDung && chonDuoc(b)).map((b) => b.id);
  const boDangDung = (ds ?? []).filter((b) => b.dangDung && chonDuoc(b)).map((b) => b.id);

  const goi = async (thucHien: boolean) => {
    const ids = [...chon];
    const body = { maTran: ids.filter((id) => pbMaTran.has(id)), dacTa: ids.filter((id) => !pbMaTran.has(id)), thucHien };
    const r = await fetch('/api/ho-so-de/ban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as XemTruoc & { daXoa?: boolean; error?: string };
    if (!r.ok) throw new Error(j.error ?? `Lỗi ${r.status}`);
    return j;
  };

  const xemTruoc = async () => {
    setDang('xem'); setTb(null);
    try { setXem(await goi(false)); } catch (e) { setTb(`Chưa xem trước được: ${e instanceof Error ? e.message : e}`); }
    setDang(null);
  };

  const xoa = async () => {
    setDang('xoa'); setTb(null);
    try {
      const xoaDangDung = (ds ?? []).some((b) => b.dangDung && b.loai === 'MA_TRAN' && xem?.maTran.some((m) => m.id === b.id));
      const j = await goi(true);
      if (!j.daXoa) { setXem(j); throw new Error(j.chan[0] ?? 'Không xóa được.'); }
      // Xóa bản ma trận đang dùng: bỏ luôn bản nháp còn lưu trên máy để bước 2 bắt đầu sạch
      if (xoaDangDung) {
        try { for (const k of Object.keys(window.localStorage)) if (k.startsWith(`thaykhaiedu.maTranRieng.${maMon}.${ky}`)) window.localStorage.removeItem(k); } catch { /* không có localStorage */ }
      }
      setTb(`Đã xóa ${j.maTran.length} ma trận riêng, ${j.dacTa.length} đặc tả${j.de.length ? `, ${j.de.length} đề đang soạn` : ''}.`);
      setChon(new Set()); setXem(null);
      await nap();
      onDaXoa();
    } catch (e) { setTb(`Chưa xóa được: ${e instanceof Error ? e.message : e}`); }
    setDang(null);
  };

  const nhan = (b: Ban) => {
    const tt = b.daCat ? 'Đã cất' : b.dangDung ? 'Đang dùng' : 'Phiên bản cũ';
    const mau = b.daCat ? 'bg-slate-100 text-slate-600' : b.dangDung ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800';
    return <span className={`rounded-full px-2 py-0.5 text-xs ${mau}`}>{tt}</span>;
  };

  const dong = (b: Ban) => (
    <li key={b.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="w-4 h-4 accent-red-600"
        aria-label={`Chọn ${b.loai === 'MA_TRAN' ? 'ma trận riêng' : 'đặc tả'} ${tenBan(b)}`}
        disabled={!chonDuoc(b) || !!dang}
        checked={chon.has(b.id)}
        onChange={() => bat(b.id)}
      />
      <span className="font-medium text-slate-800">{tenBan(b)}</span>
      {nhan(b)}
      {b.loai === 'DAC_TA' && b.maTranRiengId && (
        <span className="text-xs text-slate-500">theo ma trận {pbMaTran.get(b.maTranRiengId) ? tenBan(pbMaTran.get(b.maTranRiengId)!).toLowerCase() : `phiên bản ${b.phienBanMaTranRieng ?? '?'}`}</span>
      )}
      <span className="text-xs text-slate-400">{ngay(b.capNhatLuc)}</span>
      {b.giuLai && <span className="text-xs text-slate-500">· Có đề đã gửi duyệt hoặc đã duyệt, giữ lại</span>}
    </li>
  );

  const tong = (ds ?? []).length;

  return (
    <div className="the-tke p-6 space-y-3">
      <button type="button" onClick={() => setMo(!mo)} className="w-full flex items-center justify-between gap-2 text-left" aria-expanded={mo}>
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <History className="w-5 h-5 text-slate-500" /> Lịch sử ma trận riêng, đặc tả · xóa bản
          {ds && <span className="text-sm font-normal text-slate-500">({maTran.length} ma trận, {dacTa.length} đặc tả)</span>}
        </span>
        {mo ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>

      {mo && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Các bản của thầy cô cho {tenMonKy}. Đánh dấu bản cần xóa rồi bấm Xóa; app cho xem trước những gì bị xóa theo. Xóa rồi không lấy lại được.</p>
          {loi && <div className="text-sm text-red-700">{loi}</div>}
          {!ds && !loi && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang đọc…</div>}
          {ds && tong === 0 && <div className="text-sm text-slate-500">Chưa có bản nào.</div>}
          {ds && tong > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={nutPhu} disabled={!banCu.length || !!dang} onClick={() => datChon(banCu)}>Chọn các bản cũ ({banCu.length})</button>
                <button type="button" className={nutPhu} disabled={!boDangDung.length || !!dang} onClick={() => datChon(boDangDung)}>Chọn bộ đang dùng</button>
                <button type="button" className={nutPhu} disabled={!chon.size || !!dang} onClick={() => datChon([])}>Bỏ chọn</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Ma trận riêng</div>
                  {maTran.length ? <ul className="divide-y divide-slate-100">{maTran.map(dong)}</ul> : <div className="text-sm text-slate-500 py-2">Không có.</div>}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Bản đặc tả</div>
                  {dacTa.length ? <ul className="divide-y divide-slate-100">{dacTa.map(dong)}</ul> : <div className="text-sm text-slate-500 py-2">Không có.</div>}
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" disabled={!chon.size || !!dang} onClick={() => void xemTruoc()}>
                  {dang === 'xem' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Xóa các bản đã chọn ({chon.size})
                </button>
              </div>
            </>
          )}

          {xem && (
            <div className={`rounded-lg border p-4 text-sm space-y-2 ${xem.chan.length ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-red-300 bg-red-50 text-red-900'}`}>
              {xem.chan.length ? (
                <>
                  <div className="flex items-center gap-2 font-semibold"><TriangleAlert className="w-4 h-4" /> Không xóa được, chưa xóa gì:</div>
                  <ul className="list-disc pl-6">{xem.chan.map((c) => <li key={c}>{c}</li>)}</ul>
                  <div>Thầy cô bỏ chọn bản liên quan rồi thử lại.</div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Sẽ xóa vĩnh viễn:</div>
                  <ul className="list-disc pl-6">
                    {xem.maTran.length > 0 && <li>{xem.maTran.length} ma trận riêng: {dsTen(xem.maTran)}</li>}
                    {xem.dacTa.length > 0 && <li>{xem.dacTa.length} bản đặc tả: {dsTen(xem.dacTa)}</li>}
                    {xem.de.length > 0 && <li>{xem.de.length} đề đang soạn theo các đặc tả này</li>}
                  </ul>
                  {xem.dacTa.length > [...chon].filter((id) => !pbMaTran.has(id)).length && (
                    <div className="text-xs">Đặc tả lập từ ma trận bị xóa phải xóa theo.</div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" disabled={!!dang} onClick={() => void xoa()}>
                      {dang === 'xoa' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Đồng ý xóa
                    </button>
                    <button type="button" className={nutPhu} disabled={!!dang} onClick={() => setXem(null)}>Thôi, không xóa</button>
                  </div>
                </>
              )}
            </div>
          )}
          {tb && <div className="text-sm text-slate-700">{tb}</div>}
        </div>
      )}
    </div>
  );
}
