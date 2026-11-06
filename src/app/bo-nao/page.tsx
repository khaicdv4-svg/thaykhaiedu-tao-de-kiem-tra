'use client';

/**
 * ThayKhaiEdu - Bộ não chuyên môn của tổ (chỉ tổ trưởng sửa).
 * 1. Tải ma trận chung (Word) → app đọc ra độ dài, tốc độ, chủ điểm → tổ trưởng xem và xác nhận.
 * 2. Quy định riêng của tổ: viết tay hoặc tải file chữ; AI đọc khi tìm bài, cắt đoạn.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Brain, CheckCircle2, FileUp, Loader2, Save, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { boNaoTrong, type BoNao, type QuyDinhMotKy } from '@/core/bo-nao/bo-nao';
import { docMaTranChung } from '@/core/bo-nao/doc-ma-tran';
import { docChuTuDocx } from '@/core/utils/docx-text';
import { CHU_DIEM_THEO_KY, DANH_SACH_KY, TEN_THE_LOAI, khoangDoDai, type KyKiemTraBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const nutChinh = 'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const VAI_TRO_SUA = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const THE_LOAI_DOC_HIEU: TheLoaiBaiDoc[] = ['TRUYEN', 'MIEU_TA', 'THO', 'VAN_BAN_THONG_TIN'];

interface ChoXacNhan { tenFile: string; ky: KyKiemTraBaiDoc | ''; quyDinh: QuyDinhMotKy | null; canhBao: string[] }

const so = (v: string) => (v === '' ? NaN : Number(v));

function BangMotKy({ q, sua }: { q: QuyDinhMotKy; sua?: (q: QuyDinhMotKy) => void }) {
  const dis = !sua;
  const doiDoDai = (tl: TheLoaiBaiDoc, i: 0 | 1, v: string) => {
    const cu = q.doDai[tl] ?? [0, 0];
    const moi: [number, number] = i === 0 ? [so(v), cu[1]] : [cu[0], so(v)];
    const doDai = { ...q.doDai };
    if (Number.isNaN(moi[0]) && Number.isNaN(moi[1])) delete doDai[tl];
    else doDai[tl] = [Number.isNaN(moi[0]) ? 0 : moi[0], Number.isNaN(moi[1]) ? 0 : moi[1]];
    sua?.({ ...q, doDai });
  };
  const doiTocDo = (i: 0 | 1, v: string) => {
    const cu = q.tocDo ?? { min: 0, max: 0 };
    sua?.({ ...q, tocDo: { ...cu, [i === 0 ? 'min' : 'max']: so(v) || 0 } });
  };
  const nho = 'w-16 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 text-center';
  return (
    <div className="text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-44 text-slate-700">Đọc thành tiếng (tiếng)</span>
        <input className={nho} disabled={dis} inputMode="numeric" value={q.tocDo?.min || ''} onChange={(e) => doiTocDo(0, e.target.value)} /> –
        <input className={nho} disabled={dis} inputMode="numeric" value={q.tocDo?.max || ''} onChange={(e) => doiTocDo(1, e.target.value)} />
      </div>
      {THE_LOAI_DOC_HIEU.map((tl) => (
        <div key={tl} className="flex flex-wrap items-center gap-2">
          <span className="w-44 text-slate-700">Đọc hiểu: {TEN_THE_LOAI[tl].toLowerCase()}</span>
          <input className={nho} disabled={dis} inputMode="numeric" value={q.doDai[tl]?.[0] || ''} onChange={(e) => doiDoDai(tl, 0, e.target.value)} /> –
          <input className={nho} disabled={dis} inputMode="numeric" value={q.doDai[tl]?.[1] || ''} onChange={(e) => doiDoDai(tl, 1, e.target.value)} />
        </div>
      ))}
      <div className="flex flex-wrap items-start gap-2">
        <span className="w-44 text-slate-700">Chủ điểm</span>
        <span className="text-slate-800">{q.chuDiem.length ? q.chuDiem.join('; ') : <i className="text-slate-400">chưa đọc được</i>}</span>
      </div>
    </div>
  );
}

export default function BoNaoPage() {
  const { activeRole } = useAuth();
  const duocSua = VAI_TRO_SUA.includes(activeRole as string);
  const [bn, setBn] = useState<BoNao>(boNaoTrong());
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [cho, setCho] = useState<ChoXacNhan[]>([]);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  const maTranRef = useRef<HTMLInputElement>(null);
  const riengRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/bo-nao').then((r) => r.json()).then((r) => {
      if (r.error) throw new Error(r.error);
      setBn(r.boNao);
    }).catch((e) => setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) })).finally(() => setDangTai(false));
  }, []);

  const docFileMaTran = async (files: FileList | null) => {
    if (!files) return;
    setThongBao(null);
    const ds: ChoXacNhan[] = [];
    for (const f of Array.from(files)) {
      if (!f.name.toLowerCase().endsWith('.docx')) {
        ds.push({ tenFile: f.name, ky: '', quyDinh: null, canhBao: ['Chỉ đọc được file .docx. File .doc cũ thầy mở bằng Word rồi lưu lại thành .docx.'] });
        continue;
      }
      try {
        const kq = docMaTranChung(await docChuTuDocx(await f.arrayBuffer()), f.name);
        ds.push({ tenFile: f.name, ky: kq.ky ?? '', quyDinh: kq.quyDinh ?? { ky: 'GIUA_HK1', tocDo: null, doDai: {}, chuDiem: [], tenFile: f.name }, canhBao: kq.canhBao });
      } catch (e) {
        ds.push({ tenFile: f.name, ky: '', quyDinh: null, canhBao: [e instanceof Error ? e.message : 'Không đọc được file.'] });
      }
    }
    setCho((c) => [...c, ...ds]);
    if (maTranRef.current) maTranRef.current.value = '';
  };

  const luu = async (moi: BoNao, thongBaoOk: string) => {
    setDangLuu(true);
    setThongBao(null);
    try {
      const r = await fetch('/api/bo-nao', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boNao: moi }) }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setBn(r.boNao);
      setThongBao({ loai: 'ok', text: thongBaoOk });
      return true;
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setDangLuu(false);
    }
  };

  const xacNhan = async (i: number) => {
    const c = cho[i];
    if (!c.quyDinh || !c.ky) return;
    const moi: BoNao = { ...bn, ky: { ...bn.ky, [c.ky]: { ...c.quyDinh, ky: c.ky, tenFile: c.tenFile } } };
    if (await luu(moi, `Đã lưu quy định ${DANH_SACH_KY.find((k) => k.ma === c.ky)?.ten.toLowerCase()} từ file ${c.tenFile}.`)) setCho((d) => d.filter((_, j) => j !== i));
  };

  const docFileRieng = async (f?: File) => {
    if (!f) return;
    try {
      const ten = f.name.toLowerCase();
      const chu = ten.endsWith('.docx') ? await docChuTuDocx(await f.arrayBuffer()) : ten.endsWith('.txt') || ten.endsWith('.md') ? await f.text() : null;
      if (chu === null) throw new Error('Chỉ nhận file .docx, .txt hoặc .md.');
      setBn((b) => ({ ...b, quyDinhRieng: (b.quyDinhRieng ? b.quyDinhRieng.trimEnd() + '\n\n' : '') + chu.trim() }));
      setThongBao({ loai: 'ok', text: 'Đã nạp chữ từ file vào ô quy định riêng. Thầy xem lại rồi bấm Lưu.' });
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    }
    if (riengRef.current) riengRef.current.value = '';
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Brain className="w-5 h-5 text-blue-600" /> Bộ não chuyên môn</h1>
        <p className="text-sm text-slate-600">Tải ma trận chung và quy định riêng của tổ. App dùng các số liệu này để kiểm tra bài đọc; kì nào chưa tải thì dùng số mặc định.</p>
      </div>

      {thongBao && <div className={`rounded-lg border p-3 text-sm ${thongBao.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{thongBao.text}</div>}
      {!duocSua && !dangTai && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Thầy cô chỉ xem được. Tổ trưởng mới tải và sửa.</div>}

      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">1. Ma trận chung (môn Tiếng Việt)</h2>
        <p className="text-sm text-slate-600">Chọn một hoặc nhiều file .docx (mỗi kì một file). App đọc ra độ dài bài đọc, tốc độ đọc và chủ điểm để thầy xem lại.</p>
        <input ref={maTranRef} type="file" multiple accept=".docx" className="hidden" onChange={(e) => docFileMaTran(e.target.files)} />
        <button type="button" disabled={!duocSua} onClick={() => maTranRef.current?.click()} className={nutPhu}><FileUp className="w-4 h-4" /> Chọn file ma trận</button>

        {cho.map((c, i) => (
          <div key={i} className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <b className="text-slate-900">{c.tenFile}</b>
              <select className={o} value={c.ky} onChange={(e) => setCho((d) => d.map((x, j) => (j === i ? { ...x, ky: e.target.value as KyKiemTraBaiDoc | '' } : x)))}>
                <option value="">– Chọn kì –</option>
                {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
              </select>
            </div>
            {c.canhBao.length > 0 && (
              <ul className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
                {c.canhBao.map((w, j) => <li key={j} className="flex gap-1.5"><TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> {w}</li>)}
              </ul>
            )}
            {c.quyDinh && <BangMotKy q={c.quyDinh} sua={(q) => setCho((d) => d.map((x, j) => (j === i ? { ...x, quyDinh: q } : x)))} />}
            <div className="flex gap-2">
              <button type="button" disabled={!c.ky || !c.quyDinh || dangLuu} onClick={() => xacNhan(i)} className={nutChinh}>
                {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Xác nhận và lưu
              </button>
              <button type="button" onClick={() => setCho((d) => d.filter((_, j) => j !== i))} className={nutPhu}>Bỏ file này</button>
            </div>
          </div>
        ))}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Đang áp dụng</h3>
          {dangTai && <p className="text-sm text-slate-500"><Loader2 className="inline w-4 h-4 animate-spin" /> Đang tải…</p>}
          {DANH_SACH_KY.map((k) => {
            const q = bn.ky[k.ma];
            return (
              <div key={k.ma} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b className="text-slate-900">{k.ten}</b>
                  {q ? <span className="text-xs text-emerald-700">theo ma trận{q.tenFile ? `: ${q.tenFile}` : ''}</span> : <span className="text-xs text-slate-500">chưa tải, đang dùng số mặc định (đọc thành tiếng {khoangDoDai('DOC_THANH_TIENG', k.ma, 'TRUYEN')!.min}–{khoangDoDai('DOC_THANH_TIENG', k.ma, 'TRUYEN')!.max}, chủ điểm {CHU_DIEM_THEO_KY[k.ma].join('; ')})</span>}
                </div>
                {q && <BangMotKy q={q} />}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-700">Dung sai cho phép:</span>
            <label className="flex items-center gap-1.5">đọc thành tiếng ± <input className="w-14 rounded border border-slate-300 px-2 py-1 text-center disabled:bg-slate-50" disabled={!duocSua} inputMode="numeric" value={bn.dungSai.thanhTieng} onChange={(e) => setBn({ ...bn, dungSai: { ...bn.dungSai, thanhTieng: so(e.target.value) || 0 } })} /> tiếng</label>
            <label className="flex items-center gap-1.5">đọc hiểu ± <input className="w-14 rounded border border-slate-300 px-2 py-1 text-center disabled:bg-slate-50" disabled={!duocSua} inputMode="numeric" value={bn.dungSai.docHieu} onChange={(e) => setBn({ ...bn, dungSai: { ...bn.dungSai, docHieu: so(e.target.value) || 0 } })} /> tiếng</label>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">2. Quy định riêng của tổ</h2>
        <p className="text-sm text-slate-600">Viết các quy định của tổ (ví dụ: ưu tiên bài có tên tác giả, tránh bài có chủ đề...) hoặc tải file chữ lên. AI đọc phần này khi tìm bài và gợi ý đoạn cắt. Các quy định này chưa tự biến thành luật kiểm tra của app.</p>
        <textarea className={`${o} w-full min-h-40`} disabled={!duocSua} value={bn.quyDinhRieng} onChange={(e) => setBn({ ...bn, quyDinhRieng: e.target.value })} placeholder="Ví dụ: Bài đọc thành tiếng nên có lời thoại ngắn; không dùng bài về thiên tai cho giữa học kì I." />
        <input ref={riengRef} type="file" accept=".docx,.txt,.md" className="hidden" onChange={(e) => docFileRieng(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!duocSua} onClick={() => riengRef.current?.click()} className={nutPhu}><FileUp className="w-4 h-4" /> Tải file quy định (.docx, .txt)</button>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" disabled={!duocSua || dangLuu} onClick={() => luu(bn, 'Đã lưu Bộ não chuyên môn.')} className={nutChinh}>
          {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu dung sai và quy định riêng
        </button>
      </div>
    </div>
  );
}
