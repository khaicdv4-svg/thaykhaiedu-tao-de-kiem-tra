'use client';

/**
 * Nạp mục lục SGK (trang đầu từng phần trong từng bài) để bản đặc tả tự điền trang SGK.
 * Thầy dán bảng từ Excel hoặc chọn file CSV; ứng dụng kiểm tra, đối chiếu PPCT, thầy xem rồi mới lưu.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileUp, Loader2, ScanText, TriangleAlert } from 'lucide-react';
import { CSV_MAU, canhBaoNhamTap, docMucLuc, type TietDoiChieu } from '@/core/chuong-trinh/muc-luc-sgk';
import { DANH_SACH_MON } from '@/core/chuong-trinh/mon';
import { moPdfLamAnh, type PdfAnh } from '@/core/utils/pdf-anh';

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white';
const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const MON_CO_PPCT = ['TOAN', 'TIENG_VIET', 'KHOA_HOC', 'LS_DL', 'CONG_NGHE', 'DAO_DUC', 'HDTN'];
const LOP = 4;

export function TabMucLucSgk({ duocSua }: { duocSua: boolean }) {
  const [mon, setMon] = useState('TIENG_VIET');
  const [tap, setTap] = useState(1);
  const [chu, setChu] = useState('');
  const [tiet, setTiet] = useState<TietDoiChieu[]>([]);
  const [daLuu, setDaLuu] = useState<{ tap: number }[]>([]);
  const [dangLuu, setDangLuu] = useState(false);
  const [hoiLai, setHoiLai] = useState(false);
  const [tb, setTb] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  const [pdf, setPdf] = useState<{ ten: string; doc: PdfAnh } | null>(null);
  const [tu, setTu] = useState('');
  const [den, setDen] = useState('');
  const [tienDo, setTienDo] = useState<string | null>(null);

  const nap = useCallback(async () => {
    const [pp, ml] = await Promise.all([
      fetch(`/api/chuong-trinh/ppct?mon=${mon}&lop=${LOP}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/chuong-trinh/sgk-muc-luc?mon=${mon}&lop=${LOP}`).then((r) => r.json()).catch(() => ({})),
    ]);
    setTiet(Array.isArray(pp.tiet) ? pp.tiet : []);
    setDaLuu(Array.isArray(ml.mucLuc) ? ml.mucLuc : []);
  }, [mon]);
  useEffect(() => { void nap(); setChu(''); setTb(null); }, [nap]);

  const kq = useMemo(() => (chu.trim() ? docMucLuc(chu, tiet) : null), [chu, tiet]);
  const soDaLuu = daLuu.filter((d) => d.tap === tap).length;
  const nhamTap = useMemo(() => (kq ? canhBaoNhamTap(kq.dong, tap) : null), [kq, tap]);
  useEffect(() => { setHoiLai(false); }, [chu, mon, tap]);

  const chonFile = async (f: File) => {
    setTb(null);
    setChu(await f.text());
  };
  const chonPdf = async (f: File) => {
    setTb(null);
    try {
      setPdf({ ten: f.name, doc: await moPdfLamAnh(await f.arrayBuffer()) });
      setTu(''); setDen('');
    } catch (e) { setPdf(null); setTb({ loai: 'loi', text: `Không mở được PDF: ${e instanceof Error ? e.message : e}` }); }
  };
  const docBangAI = async () => {
    if (!pdf) return;
    const a = Number(tu), b = Number(den || tu);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a || b > pdf.doc.soTrang) { setTb({ loai: 'loi', text: `Nhập trang trong file từ 1 đến ${pdf.doc.soTrang} (trang thứ mấy của file PDF, không phải số in trên sách).` }); return; }
    if (b - a >= 6) { setTb({ loai: 'loi', text: 'Mỗi lần đọc tối đa 6 trang. Mục lục thường 2–4 trang.' }); return; }
    setTb(null);
    const dong: string[] = [];
    try {
      for (let t = a; t <= b; t++) {
        setTienDo(`Đang đọc trang ${t} (${t - a + 1}/${b - a + 1})…`);
        const anh = await pdf.doc.ve(t);
        const r = await fetch('/api/chuong-trinh/sgk-muc-luc/doc-anh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon, tap, anh, trang: t }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? `Lỗi ${r.status}`);
        dong.push(...(j.dong as string[]));
      }
      if (!dong.length) { setTb({ loai: 'loi', text: 'AI không thấy dòng mục lục nào trong các trang đã chọn. Thầy thử trang khác.' }); return; }
      setChu((c) => (c.trim() ? c.replace(/\s+$/, '') + '\n' : '') + dong.join('\n'));
      setTb({ loai: 'ok', text: `AI đã chép ${dong.length} dòng. Thầy đối chiếu với sách ở bảng xem trước rồi mới lưu.` });
    } catch (e) { setTb({ loai: 'loi', text: e instanceof Error ? e.message : String(e) }); } finally { setTienDo(null); }
  };
  const taiMau = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + CSV_MAU], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'mau_muc_luc_sgk.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const luu = async () => {
    setDangLuu(true); setTb(null); setHoiLai(false);
    try {
      const r = await fetch('/api/chuong-trinh/sgk-muc-luc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon, lop: LOP, tap, chu }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setTb({ loai: 'loi', text: j.error ?? `Lỗi ${r.status}` }); return; }
      setTb({ loai: 'ok', text: `Đã lưu ${j.soDong} dòng mục lục ${TEN(mon)} tập ${tap}. Bản đặc tả sẽ tự điền trang SGK khi thầy chọn bài.` });
      setChu('');
      await nap();
    } finally { setDangLuu(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm text-slate-600">Nhập mục lục SGK để bản đặc tả tự điền <b>trang SGK</b> khi thầy chọn bài. Thầy chép mục lục sách vào Excel (cột: Tuần, Bài, Hoạt động, Nội dung, Trang đầu), rồi dán vào ô bên dưới hoặc lưu CSV và chọn file. Ứng dụng chỉ kiểm tra và đối chiếu PPCT, không tự đoán số trang.</p>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Môn" className={o} value={mon} onChange={(e) => setMon(e.target.value)}>
            {DANH_SACH_MON.filter((m) => MON_CO_PPCT.includes(m.ma)).map((m) => <option key={m.ma} value={m.ma}>{m.ten}</option>)}
          </select>
          <select aria-label="Tập" className={o} value={tap} onChange={(e) => setTap(Number(e.target.value))}>
            <option value={1}>Tập một</option><option value={2}>Tập hai</option>
          </select>
          <span className="text-sm text-slate-600">{soDaLuu ? `Đã nạp ${soDaLuu} dòng. Nạp lại sẽ thay phần này.` : 'Chưa nạp mục lục cho môn và tập này.'}</span>
          <button type="button" className={nutPhu} onClick={taiMau}><Download className="w-4 h-4" /> Tải file mẫu</button>
        </div>
        {duocSua ? (
          <>
            <label className={`${nutPhu} cursor-pointer w-fit`}><FileUp className="w-4 h-4" /> Chọn file CSV
              <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void chonFile(f); e.target.value = ''; }} />
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="text-sm font-semibold text-slate-800">Hoặc tải PDF sách, AI đọc mục lục giúp</div>
              <div className="flex flex-wrap items-center gap-2">
                <label className={`${nutPhu} cursor-pointer`}><ScanText className="w-4 h-4" /> Chọn PDF sách
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void chonPdf(f); e.target.value = ''; }} />
                </label>
                {pdf && <span className="text-sm text-slate-600">{pdf.ten} ({pdf.doc.soTrang} trang)</span>}
              </div>
              {pdf && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  Mục lục nằm ở trang
                  <input aria-label="Từ trang" inputMode="numeric" className={`${o} w-20`} value={tu} onChange={(e) => setTu(e.target.value)} />
                  đến
                  <input aria-label="Đến trang" inputMode="numeric" className={`${o} w-20`} placeholder={tu} value={den} onChange={(e) => setDen(e.target.value)} />
                  <button type="button" className={nutChinh} disabled={!!tienDo || !tu} onClick={() => void docBangAI()}>
                    {tienDo ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}{tienDo ?? 'AI đọc mục lục'}
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500">Trang tính theo thứ tự trong file PDF (trang đầu của file là trang 1). Dòng AI chép thêm vào ô bên dưới; thầy đối chiếu với sách, sửa rồi mới lưu.</p>
            </div>
            <textarea aria-label="Bảng mục lục" className={`${o} w-full min-h-40 font-mono`} placeholder={'Dán bảng mục lục vào đây, ví dụ:\n1\t1\tĐọc\tĐiều kì diệu\t8'} value={chu} onChange={(e) => { setChu(e.target.value); setTb(null); }} />
          </>
        ) : <p className="text-xs text-amber-700">Bạn chỉ được xem. Tổ trưởng hoặc quản trị mới nạp mục lục.</p>}
      </div>

      {tb && (
        <div role="status" className={`rounded-lg border px-3 py-2 text-sm flex items-start gap-2 ${tb.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {tb.loai === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <TriangleAlert className="w-4 h-4 mt-0.5" />}{tb.text}
        </div>
      )}

      {kq && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="font-semibold text-slate-900">Xem trước: {kq.dong.length} dòng, {new Set(kq.dong.map((d) => d.bai)).size} bài</div>
          {kq.loi.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="font-semibold mb-1">Lỗi cần sửa ({kq.loi.length})</div>
              <ul className="list-disc pl-5 space-y-0.5">{kq.loi.slice(0, 15).map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          )}
          {kq.canhBao.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold mb-1">Thầy xem lại ({kq.canhBao.length})</div>
              <ul className="list-disc pl-5 space-y-0.5">{kq.canhBao.slice(0, 15).map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          )}
          {kq.dong.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b"><th className="py-1 pr-3">Tuần</th><th className="pr-3">Bài</th><th className="pr-3">Hoạt động</th><th className="pr-3">Nội dung</th><th>Trang</th></tr></thead>
                <tbody>{kq.dong.slice(0, 12).map((d, i) => <tr key={i} className="border-b border-slate-100"><td className="py-1 pr-3">{d.tuan ?? ''}</td><td className="pr-3">{d.bai}</td><td className="pr-3">{d.hoatDong}</td><td className="pr-3">{d.noiDung}</td><td>{d.trang}</td></tr>)}</tbody>
              </table>
              {kq.dong.length > 12 && <p className="text-xs text-slate-500 mt-1">… và {kq.dong.length - 12} dòng nữa.</p>}
            </div>
          )}
          {nhamTap && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 font-medium">{nhamTap}</div>}
          {duocSua && !hoiLai && (
            <button type="button" className={nutChinh} disabled={dangLuu || kq.loi.length > 0 || kq.dong.length === 0} onClick={() => setHoiLai(true)}>
              {dangLuu ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}{soDaLuu ? 'Lưu và thay mục lục cũ' : 'Lưu mục lục'}
            </button>
          )}
          {duocSua && hoiLai && (
            <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-3 space-y-2">
              <p className="text-sm text-slate-900">Thầy đang lưu <b>{TEN(mon)} – Tập {tap === 1 ? 'một' : 'hai'}</b> ({kq.dong.length} dòng){soDaLuu ? <>, <b>thay {soDaLuu} dòng cũ</b> của tập này</> : ''}. Đúng không?</p>
              <div className="flex gap-2">
                <button type="button" className={nutChinh} disabled={dangLuu} onClick={() => void luu()}>Đúng, lưu</button>
                <button type="button" className={nutPhu} onClick={() => setHoiLai(false)}>Quay lại</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TEN = (ma: string) => DANH_SACH_MON.find((m) => m.ma === ma)?.ten ?? ma;
