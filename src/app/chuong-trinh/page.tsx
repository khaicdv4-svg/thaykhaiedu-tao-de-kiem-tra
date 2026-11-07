'use client';

/**
 * Kho chương trình GDPT 2018 – bộ não chung lớp 1–5.
 * 1. Nạp tài liệu (CT GDPT 2018, SGK, SGV) bằng file / link / dán chữ.
 * 2. AI trích YCCĐ từ tài liệu, kèm đoạn nguyên văn; tổ trưởng duyệt trước khi dùng.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brain, CheckCheck, FileUp, Link2, Loader2, Plus, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { DANH_SACH_MON, LOAI_TAI_LIEU, TEN_LOAI_TAI_LIEU, TEN_MON, type TaiLieuChuongTrinh, type TrangThaiYccd, type YccdChuongTrinh } from '@/core/chuong-trinh/mon';
import { docChuTuTep } from '@/core/utils/doc-tep';
import { TabMucLucSgk } from '@/components/chuong-trinh/TabMucLucSgk';

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white';
const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const VAI_TRO_SUA = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const TEN_TT: Record<TrangThaiYccd, string> = { CHO_DUYET: 'Chờ duyệt', DA_DUYET: 'Đã duyệt', TU_CHOI: 'Đã loại' };

async function goi<T>(url: string, init?: RequestInit): Promise<T & { error?: string }> {
  const r = await fetch(url, init);
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok && !j.error) return { ...j, error: `Lỗi ${r.status}` };
  return j;
}
const json = (b: unknown): RequestInit => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

export default function KhoChuongTrinhPage() {
  const { activeRole } = useAuth();
  const duocSua = VAI_TRO_SUA.includes(activeRole as string);
  const [tab, setTab] = useState<'tai-lieu' | 'yccd' | 'muc-luc'>('tai-lieu');

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Brain className="w-6 h-6 text-blue-700" /> Kho chương trình GDPT 2018</h1>
        <p className="text-sm text-slate-600 mt-1">Nguồn chung cho lớp 1–5, nhập một lần dùng cho mọi khối. AI chỉ trích YCCĐ từ tài liệu thầy cung cấp, kèm đoạn nguyên văn; tổ trưởng duyệt rồi mới dùng được.</p>
        {!duocSua && <p className="text-xs text-amber-700 mt-1">Bạn chỉ được xem. Tổ trưởng hoặc quản trị mới nạp tài liệu và duyệt YCCĐ.</p>}
      </div>
      <div className="flex gap-2 border-b border-slate-200">
        {([['tai-lieu', 'Tài liệu nguồn'], ['yccd', 'Yêu cầu cần đạt (YCCĐ)'], ['muc-luc', 'Mục lục SGK']] as const).map(([k, t]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t}</button>
        ))}
      </div>
      {tab === 'tai-lieu' ? <TabTaiLieu duocSua={duocSua} chuyenSangYccd={() => setTab('yccd')} /> : tab === 'yccd' ? <TabYccd duocSua={duocSua} /> : <TabMucLucSgk duocSua={duocSua} />}
    </div>
  );
}

function TabTaiLieu({ duocSua, chuyenSangYccd }: { duocSua: boolean; chuyenSangYccd: () => void }) {
  const [ds, setDs] = useState<TaiLieuChuongTrinh[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [tb, setTb] = useState<{ loai: 'ok' | 'loi' | 'bao'; text: string } | null>(null);
  const [hinhThuc, setHinhThuc] = useState<'file' | 'link' | 'dan'>('file');
  const [loai, setLoai] = useState('CT_GDPT');
  const [mon, setMon] = useState('TOAN');
  const [lop, setLop] = useState('');
  const [tieuDe, setTieuDe] = useState('');
  const [link, setLink] = useState('');
  const [chu, setChu] = useState('');
  const [tenFile, setTenFile] = useState('');
  const [dangDoc, setDangDoc] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [trich, setTrich] = useState<{ id: string; phan: number; tong: number; moi: number; khongKhop: number } | null>(null);
  const [lopTrich, setLopTrich] = useState<Record<string, string>>({});
  const inputFile = useRef<HTMLInputElement>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    const r = await goi<{ taiLieu: TaiLieuChuongTrinh[] }>('/api/chuong-trinh/tai-lieu');
    if (r.error) setTb({ loai: 'loi', text: r.error }); else setDs(r.taiLieu);
    setDangTai(false);
  }, []);
  useEffect(() => { void tai(); }, [tai]);

  const chonFile = async (f: File) => {
    setTb(null);
    setTenFile(f.name);
    if (!tieuDe) setTieuDe(f.name.replace(/\.[^.]+$/, ''));
    setDangDoc('Đang đọc file…');
    try {
      setChu(await docChuTuTep(f, (t, n) => setDangDoc(`Đang đọc trang ${t}/${n}…`)));
    } catch (e) {
      setChu('');
      setTb({ loai: 'loi', text: e instanceof Error ? e.message : 'Không đọc được file.' });
    }
    setDangDoc(null);
  };

  const luu = async () => {
    setDangLuu(true);
    setTb(null);
    const r = await goi<{ canhBao?: string | null }>('/api/chuong-trinh/tai-lieu', {
      method: 'POST',
      ...json({ loai, mon, lop: lop ? Number(lop) : null, tieuDe, nguon: hinhThuc === 'file' ? 'TAI_FILE' : hinhThuc === 'link' ? 'LINK' : 'DAN_CHU', link, tenFile, noiDung: chu }),
    });
    setDangLuu(false);
    if (r.error) { setTb({ loai: 'loi', text: r.error }); return; }
    setTb(r.canhBao ? { loai: 'bao', text: `Đã lưu link nhưng ${r.canhBao}` } : { loai: 'ok', text: 'Đã lưu tài liệu.' });
    setChu(''); setLink(''); setTenFile(''); setTieuDe('');
    if (inputFile.current) inputFile.current.value = '';
    await tai();
  };

  const xoa = async (t: TaiLieuChuongTrinh) => {
    if (!window.confirm(`Xóa tài liệu "${t.tieuDe}"? YCCĐ đã trích từ tài liệu này vẫn được giữ.`)) return;
    const r = await goi('/api/chuong-trinh/tai-lieu?id=' + t.id, { method: 'DELETE' });
    if (r.error) setTb({ loai: 'loi', text: r.error }); else await tai();
  };

  const chayTrich = async (t: TaiLieuChuongTrinh) => {
    const l = t.lop ?? Number(lopTrich[t.id]);
    if (!l) { setTb({ loai: 'loi', text: 'Chọn lớp cần trích YCCĐ trước.' }); return; }
    setTb(null);
    let tong = 1, moi = 0, khongKhop = 0;
    for (let p = 0; p < tong; p++) {
      setTrich({ id: t.id, phan: p + 1, tong, moi, khongKhop });
      const r = await goi<{ tongPhan: number; moi: number; khongKhop: number }>('/api/chuong-trinh/trich-yccd', { method: 'POST', ...json({ taiLieuId: t.id, lop: l, phan: p }) });
      if (r.error) { setTb({ loai: 'loi', text: r.error }); setTrich(null); await tai(); return; }
      tong = r.tongPhan; moi += r.moi; khongKhop += r.khongKhop;
    }
    setTrich(null);
    setTb({ loai: 'ok', text: `AI trích xong: ${moi} YCCĐ mới vào hàng chờ duyệt${khongKhop ? `, trong đó ${khongKhop} YCCĐ chưa khớp nguyên văn tài liệu (cần xem kĩ)` : ''}.` });
    await tai();
  };

  return (
    <div className="space-y-5">
      {tb && (
        <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${tb.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : tb.loai === 'bao' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <span className="flex-1">{tb.text}</span>
          {tb.loai === 'ok' && tb.text.startsWith('AI trích') && <button type="button" className="underline" onClick={chuyenSangYccd}>Xem hàng chờ duyệt</button>}
          <button type="button" aria-label="Đóng" onClick={() => setTb(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {duocSua && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-slate-900">Thêm tài liệu</h2>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Loại tài liệu" className={o} value={loai} onChange={(e) => setLoai(e.target.value)}>{LOAI_TAI_LIEU.map((l) => <option key={l.ma} value={l.ma}>{l.ten}</option>)}</select>
            <select aria-label="Môn" className={o} value={mon} onChange={(e) => setMon(e.target.value)}>{DANH_SACH_MON.map((m) => <option key={m.ma} value={m.ma}>{m.ten}</option>)}</select>
            <select aria-label="Lớp" className={o} value={lop} onChange={(e) => setLop(e.target.value)}>
              <option value="">{loai === 'CT_GDPT' ? 'Cả cấp (lớp 1–5)' : '– Chọn lớp –'}</option>
              {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Lớp {l}</option>)}
            </select>
            <input aria-label="Tên tài liệu" className={`${o} flex-1 min-w-48`} placeholder="Tên tài liệu (ví dụ: CT GDPT môn Toán 2018)" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} />
          </div>
          <div className="flex gap-2 text-sm">
            {([['file', 'Tải file', FileUp], ['link', 'Dán link', Link2], ['dan', 'Dán chữ', Plus]] as const).map(([k, t, Icon]) => (
              <button key={k} type="button" onClick={() => setHinhThuc(k)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${hinhThuc === k ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold' : 'border-slate-300 text-slate-600'}`}><Icon className="w-4 h-4" /> {t}</button>
            ))}
          </div>
          {hinhThuc === 'file' && (
            <div className="space-y-2">
              <input ref={inputFile} type="file" accept=".docx,.pdf,.txt,.md" className="text-sm" onChange={(e) => e.target.files?.[0] && void chonFile(e.target.files[0])} />
              <p className="text-xs text-slate-500">Nhận Word (.docx), PDF có lớp chữ, .txt. PDF scan ảnh thì chưa đọc được. File đọc ngay trên máy thầy, app chỉ lưu phần chữ.</p>
              {dangDoc && <p className="text-sm text-blue-700 flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> {dangDoc}</p>}
              {chu && !dangDoc && <p className="text-sm text-emerald-700">Đã đọc {chu.length.toLocaleString('vi-VN')} kí tự từ "{tenFile}".</p>}
            </div>
          )}
          {hinhThuc === 'link' && (
            <div className="space-y-2">
              <input aria-label="Link" className={`${o} w-full`} placeholder="https://… (link Google Drive, Google Docs/Sheets/Slides hoặc trang web)" value={link} onChange={(e) => setLink(e.target.value)} />
              <p className="text-xs text-slate-500">Đọc được file PDF (có lớp chữ), Word .docx trên Drive và Google Docs/Sheets/Slides. Trên Drive, thầy chia sẻ file ở chế độ <b>"Bất kỳ ai có đường liên kết"</b> rồi chép link. Mỗi lần dán link của một file, không dán link thư mục. File lớn như cả cuốn SGK có thể mất nửa phút đến một phút.</p>
              <textarea aria-label="Chữ dán kèm" className={`${o} w-full min-h-20`} placeholder="(Không bắt buộc) Dán chữ vào đây nếu app không lấy được từ link" value={chu} onChange={(e) => setChu(e.target.value)} />
            </div>
          )}
          {hinhThuc === 'dan' && <textarea aria-label="Chữ dán" className={`${o} w-full min-h-40`} placeholder="Dán chữ của tài liệu vào đây" value={chu} onChange={(e) => setChu(e.target.value)} />}
          <button type="button" className={nutChinh} disabled={dangLuu || !!dangDoc || (hinhThuc === 'link' ? !link.trim() : !chu.trim())} onClick={() => void luu()}>
            {dangLuu ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}{dangLuu && hinhThuc === 'link' && !chu.trim() ? 'Đang tải và đọc file từ link…' : 'Lưu tài liệu'}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">Tài liệu đã nạp {dangTai && <Loader2 className="w-4 h-4 animate-spin inline ml-1" />}</div>
        {ds.length === 0 && !dangTai ? <p className="p-4 text-sm text-slate-500">Chưa có tài liệu nào. Nạp Chương trình GDPT 2018 (từng môn) trước, rồi SGK, SGV nếu có.</p> : (
          <ul className="divide-y divide-slate-100">
            {ds.map((t) => (
              <li key={t.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-56">
                    <div className="font-medium text-slate-900">{t.tieuDe}</div>
                    <div className="text-xs text-slate-500">{TEN_LOAI_TAI_LIEU[t.loai]} · {TEN_MON[t.mon] ?? t.mon} · {t.lop ? `Lớp ${t.lop}` : 'Cả cấp'} · {t.soKyTu.toLocaleString('vi-VN')} kí tự · {t.soYccd ?? 0} YCCĐ đã trích{t.link ? <> · <a className="text-blue-700 underline" href={t.link} target="_blank" rel="noreferrer">link nguồn</a></> : null}</div>
                    {t.soKyTu === 0 && <div className="text-xs text-amber-700 mt-0.5">Chưa có chữ để AI đọc. Xóa và nạp lại bằng file hoặc dán chữ.</div>}
                  </div>
                  {duocSua && (
                    <div className="flex flex-wrap items-center gap-2">
                      {!t.lop && (
                        <select aria-label="Lớp cần trích" className={o} value={lopTrich[t.id] ?? ''} onChange={(e) => setLopTrich((c) => ({ ...c, [t.id]: e.target.value }))}>
                          <option value="">– Trích cho lớp –</option>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Lớp {l}</option>)}
                        </select>
                      )}
                      <button type="button" className={nutPhu} disabled={!!trich || t.soKyTu === 0} onClick={() => void chayTrich(t)}><Sparkles className="w-4 h-4" /> AI trích YCCĐ</button>
                      <button type="button" className={nutPhu} aria-label="Xóa tài liệu" onClick={() => void xoa(t)}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                {trich?.id === t.id && <div className="text-sm text-blue-700 flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Đang trích phần {trich.phan}/{trich.tong}… đã có {trich.moi} YCCĐ mới</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabYccd({ duocSua }: { duocSua: boolean }) {
  const [mon, setMon] = useState('TOAN');
  const [lop, setLop] = useState('4');
  const [tt, setTt] = useState<TrangThaiYccd>('CHO_DUYET');
  const [ds, setDs] = useState<YccdChuongTrinh[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [dangSua, setDangSua] = useState<{ id: string; noiDung: string } | null>(null);
  const [moi, setMoi] = useState({ mach: '', noiDung: '' });

  const tai = useCallback(async () => {
    setDangTai(true); setChon(new Set());
    const r = await goi<{ yccd: YccdChuongTrinh[] }>(`/api/chuong-trinh/yccd?mon=${mon}&lop=${lop}&trangThai=${tt}`);
    if (r.error) setThongBao(r.error); else setDs(r.yccd);
    setDangTai(false);
  }, [mon, lop, tt]);
  useEffect(() => { void tai(); }, [tai]);

  const nhom = useMemo(() => {
    const m = new Map<string, YccdChuongTrinh[]>();
    for (const y of ds) m.set(y.mach ?? 'Chưa rõ mạch', [...(m.get(y.mach ?? 'Chưa rõ mạch') ?? []), y]);
    return [...m.entries()];
  }, [ds]);

  const doiTrangThai = async (ids: string[], trangThai: TrangThaiYccd) => {
    if (!ids.length) return;
    const r = await goi('/api/chuong-trinh/yccd', { method: 'PATCH', ...json({ ids, trangThai }) });
    if (r.error) setThongBao(r.error); else await tai();
  };
  const xoaCac = async (ids: string[]) => {
    if (!ids.length || !window.confirm(`Xóa hẳn ${ids.length} YCCĐ?`)) return;
    const r = await goi('/api/chuong-trinh/yccd?ids=' + ids.join(','), { method: 'DELETE' });
    if (r.error) setThongBao(r.error); else await tai();
  };
  const luuSua = async () => {
    if (!dangSua) return;
    const r = await goi('/api/chuong-trinh/yccd', { method: 'PATCH', ...json(dangSua) });
    if (r.error) setThongBao(r.error); else { setDangSua(null); await tai(); }
  };
  const themTay = async () => {
    const r = await goi('/api/chuong-trinh/yccd', { method: 'POST', ...json({ mon, lop: Number(lop), mach: moi.mach, noiDung: moi.noiDung }) });
    if (r.error) setThongBao(r.error); else { setMoi({ mach: '', noiDung: '' }); setTt('DA_DUYET'); await tai(); }
  };
  const tatCaChon = ds.length > 0 && chon.size === ds.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select aria-label="Môn" className={o} value={mon} onChange={(e) => setMon(e.target.value)}>{DANH_SACH_MON.map((m) => <option key={m.ma} value={m.ma}>{m.ten}</option>)}</select>
        <select aria-label="Lớp" className={o} value={lop} onChange={(e) => setLop(e.target.value)}>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Lớp {l}</option>)}</select>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          {(['CHO_DUYET', 'DA_DUYET', 'TU_CHOI'] as const).map((k) => <button key={k} type="button" onClick={() => setTt(k)} className={`px-3 py-2 ${tt === k ? 'bg-blue-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{TEN_TT[k]}</button>)}
        </div>
        {dangTai && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
      </div>
      {thongBao && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex gap-2"><span className="flex-1">{thongBao}</span><button type="button" aria-label="Đóng" onClick={() => setThongBao(null)}><X className="w-4 h-4" /></button></div>}

      {duocSua && ds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={tatCaChon} onChange={() => setChon(tatCaChon ? new Set() : new Set(ds.map((y) => y.id)))} /> Chọn tất cả ({chon.size}/{ds.length})</label>
          {tt !== 'DA_DUYET' && <button type="button" className={nutChinh} disabled={!chon.size} onClick={() => void doiTrangThai([...chon], 'DA_DUYET')}><CheckCheck className="w-4 h-4 inline mr-1" />Duyệt các câu đã chọn</button>}
          {tt !== 'TU_CHOI' && <button type="button" className={nutPhu} disabled={!chon.size} onClick={() => void doiTrangThai([...chon], 'TU_CHOI')}>Loại</button>}
          {tt !== 'CHO_DUYET' && <button type="button" className={nutPhu} disabled={!chon.size} onClick={() => void doiTrangThai([...chon], 'CHO_DUYET')}>Trả về chờ duyệt</button>}
          <button type="button" className={nutPhu} disabled={!chon.size} onClick={() => void xoaCac([...chon])}><Trash2 className="w-4 h-4" /> Xóa</button>
        </div>
      )}

      {ds.length === 0 && !dangTai && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Chưa có YCCĐ {TEN_TT[tt].toLowerCase()} cho {TEN_MON[mon]} lớp {lop}. {tt === 'CHO_DUYET' ? 'Sang tab "Tài liệu nguồn", bấm "AI trích YCCĐ" ở tài liệu của môn này.' : ''}</p>}

      {nhom.map(([mach, cacY]) => (
        <div key={mach} className="rounded-xl border border-slate-200 bg-white">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-800 text-sm rounded-t-xl">{mach} <span className="font-normal text-slate-500">({cacY.length})</span></div>
          <ul className="divide-y divide-slate-100">
            {cacY.map((y) => (
              <li key={y.id} className="p-3 flex gap-3 items-start">
                {duocSua && <input type="checkbox" aria-label="Chọn" className="mt-1" checked={chon.has(y.id)} onChange={() => setChon((c) => { const n = new Set(c); if (n.has(y.id)) n.delete(y.id); else n.add(y.id); return n; })} />}
                <div className="flex-1 space-y-1">
                  {dangSua?.id === y.id ? (
                    <div className="space-y-2">
                      <textarea aria-label="Nội dung YCCĐ" className={`${o} w-full min-h-20`} value={dangSua.noiDung} onChange={(e) => setDangSua({ id: y.id, noiDung: e.target.value })} />
                      <div className="flex gap-2"><button type="button" className={nutChinh} onClick={() => void luuSua()}>Lưu</button><button type="button" className={nutPhu} onClick={() => setDangSua(null)}>Hủy</button></div>
                    </div>
                  ) : <div className="text-sm text-slate-900">{y.noiDung}</div>}
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                    {y.chuDe && <span>Chủ đề: {y.chuDe}</span>}{y.bai && <span>Bài: {y.bai}</span>}
                    <span>{y.nguon === 'AI_TRICH' ? 'AI trích từ tài liệu' : 'Nhập tay'}</span>
                    {y.nguon === 'AI_TRICH' && (y.trichKhop ? <span className="text-emerald-700">Khớp nguyên văn tài liệu</span> : <span className="text-amber-700 inline-flex items-center gap-1"><TriangleAlert className="w-3.5 h-3.5" /> Chưa khớp nguyên văn, cần đối chiếu</span>)}
                  </div>
                  {y.trichDan && y.nguon === 'AI_TRICH' && <div className="text-xs text-slate-500 italic">Nguyên văn: "{y.trichDan}"</div>}
                </div>
                {duocSua && dangSua?.id !== y.id && <button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => setDangSua({ id: y.id, noiDung: y.noiDung })}>Sửa</button>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {duocSua && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 space-y-2">
          <div className="font-semibold text-sm text-slate-900">Thêm YCCĐ bằng tay ({TEN_MON[mon]} lớp {lop}) – vào thẳng mục "Đã duyệt"</div>
          <div className="flex flex-wrap gap-2">
            <input aria-label="Mạch" className={`${o} w-56`} placeholder="Mạch (ví dụ: Số và phép tính)" value={moi.mach} onChange={(e) => setMoi({ ...moi, mach: e.target.value })} />
            <input aria-label="Nội dung YCCĐ mới" className={`${o} flex-1 min-w-64`} placeholder="Nội dung YCCĐ" value={moi.noiDung} onChange={(e) => setMoi({ ...moi, noiDung: e.target.value })} />
            <button type="button" className={nutChinh} disabled={!moi.noiDung.trim()} onClick={() => void themTay()}>Thêm</button>
          </div>
        </div>
      )}
    </div>
  );
}
