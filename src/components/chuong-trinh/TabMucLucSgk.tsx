'use client';

/**
 * Nạp mục lục SGK (trang đầu từng phần trong từng bài) để bản đặc tả tự điền trang SGK.
 * Thầy dán bảng từ Excel hoặc chọn file CSV; ứng dụng kiểm tra, đối chiếu PPCT, thầy xem rồi mới lưu.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileUp, Loader2, TriangleAlert } from 'lucide-react';
import { CSV_MAU, docMucLuc, type TietDoiChieu } from '@/core/chuong-trinh/muc-luc-sgk';
import { DANH_SACH_MON } from '@/core/chuong-trinh/mon';

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
  const [tb, setTb] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);

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

  const chonFile = async (f: File) => {
    setTb(null);
    setChu(await f.text());
  };
  const taiMau = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + CSV_MAU], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'mau_muc_luc_sgk.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const luu = async () => {
    setDangLuu(true); setTb(null);
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
          {duocSua && (
            <button type="button" className={nutChinh} disabled={dangLuu || kq.loi.length > 0 || kq.dong.length === 0} onClick={() => void luu()}>
              {dangLuu ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}{soDaLuu ? 'Lưu và thay mục lục cũ' : 'Lưu mục lục'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const TEN = (ma: string) => DANH_SACH_MON.find((m) => m.ma === ma)?.ten ?? ma;
