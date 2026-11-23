'use client';

/**
 * Báo cáo tỉ lệ theo số tiết của từng mạch kiến thức – tham khảo cho tổ trưởng ở Ma trận chung.
 * Không phải lỗi, không chặn lưu, không tự sửa ma trận. Tổ trưởng tự quyết có điều chỉnh hay không.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronRight, Loader2, Save, Wand2 } from 'lucide-react';
import type { MaTranChung } from '@/types/matrix-template';
import { khoangTuanTheoKy, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import { cacMachCuaMaTran, tinhTiLeMach, type MucLucTiLe, type TietTiLe } from '@/core/matrix/ti-le-tiet';

const MON_AP_DUNG = ['TOAN', 'KHOA_HOC', 'LS_DL', 'CONG_NGHE'];
const fmt = (x: number) => String(x).replace('.', ',');
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const nutChinh = 'nut-tke text-sm';

interface DuLieu { mtc: MaTranChung | null; phienBan: number | null; tiet: (TietTiLe & { hocKi: number | null })[]; loiPpct: string | null; mucLuc: MucLucTiLe[]; baiMach: Record<string, string> }

export function TiLeTheoSoTiet({ mon, ky, duocSua }: { mon: string; ky: string; duocSua: boolean }) {
  const [du, setDu] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [tuanTu, setTuanTu] = useState(1);
  const [tuanDen, setTuanDen] = useState(18);
  const [tinhOnTap, setTinhOnTap] = useState(true);
  const [tinhKiemTra, setTinhKiemTra] = useState(false);
  const [bang, setBang] = useState<Record<string, string>>({});
  const [chuaLuu, setChuaLuu] = useState(false);
  const [moXep, setMoXep] = useState(false);
  const [dangAI, setDangAI] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [tin, setTin] = useState<string | null>(null);

  const nap = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    try {
      const r = await fetch(`/api/kho-ma-tran/ti-le-tiet?mon=${mon}&ky=${ky}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Không đọc được dữ liệu.');
      setDu(j);
      setBang(j.baiMach ?? {});
      setChuaLuu(false);
      if (j.tiet?.length) {
        const k = khoangTuanTheoKy(j.tiet, ky as KyDung);
        setTuanTu(k.tuanTu);
        setTuanDen(k.tuanDen);
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
    setDangTai(false);
  }, [mon, ky]);

  useEffect(() => { if (MON_AP_DUNG.includes(mon)) void nap(); }, [nap, mon]);

  const baoCao = useMemo(() => (du?.mtc && du.tiet.length
    ? tinhTiLeMach({ tiet: du.tiet, mucLuc: du.mucLuc, tuyChon: { tuanTu, tuanDen, tinhOnTap, tinhKiemTra }, baiMach: bang, mtc: du.mtc })
    : null), [du, tuanTu, tuanDen, tinhOnTap, tinhKiemTra, bang]);
  const cacMach = useMemo(() => (du?.mtc ? cacMachCuaMaTran(du.mtc) : []), [du]);

  if (!MON_AP_DUNG.includes(mon)) return null;

  const goiYAI = async () => {
    if (!baoCao) return;
    const can = baoCao.bai.filter((b) => !bang[b.khoa]);
    if (!can.length) { setTin('Các bài đều đã xếp mạch.'); return; }
    setDangAI(true);
    setTin(null);
    try {
      const r = await fetch('/api/kho-ma-tran/ti-le-tiet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon, ky, bai: can.map((b) => ({ khoa: b.khoa, ten: b.ten, tenTiet: b.tenTiet })) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'AI chưa gợi ý được.');
      const goiY = j.baiMach as Record<string, string>;
      setBang((b) => ({ ...goiY, ...b }));
      if (Object.keys(goiY).length) setChuaLuu(true);
      setTin(`AI gợi ý mạch cho ${Object.keys(goiY).length}/${can.length} bài. Thầy cô xem lại từng bài rồi bấm Lưu.`);
    } catch (e) {
      setTin(e instanceof Error ? e.message : String(e));
    }
    setDangAI(false);
  };

  const luu = async () => {
    setDangLuu(true);
    setTin(null);
    try {
      const r = await fetch('/api/kho-ma-tran/ti-le-tiet', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon, baiMach: bang }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Chưa lưu được.');
      setChuaLuu(false);
      setTin('Đã lưu bảng Bài → Mạch. Bảng dùng chung cho cả 4 kì của môn này.');
    } catch (e) {
      setTin(e instanceof Error ? e.message : String(e));
    }
    setDangLuu(false);
  };

  const lech = (a: number, b: number, buoc: number) => Math.abs(a - b) >= buoc;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <BarChart3 className="w-5 h-5 text-sky-700 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Tỉ lệ theo số tiết của từng mạch (tham khảo)</h3>
          <p className="text-xs text-slate-600">Cộng số tiết trong phân phối chương trình theo mạch, ra tỉ lệ, số điểm và số câu gợi ý, đặt cạnh ma trận chung đang dùng. Chỉ để tổ trưởng tham khảo, không phải lỗi; mỗi môn có đặc điểm riêng nên tổ trưởng tự quyết có điều chỉnh hay không.</p>
        </div>
      </div>

      {dangTai && <div className="text-sm text-slate-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang đọc phân phối chương trình…</div>}
      {loi && <div className="text-sm text-red-700">{loi}</div>}
      {du && !du.mtc && <div className="text-sm text-slate-600">Môn, kì này chưa có ma trận chung đã xác nhận nên chưa so sánh được.</div>}
      {du && du.loiPpct && <div className="text-sm text-amber-800">{du.loiPpct}</div>}

      {du?.mtc && baoCao && (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-1.5">Từ tuần
              <input aria-label="Từ tuần" type="number" min={1} max={40} className="w-16 rounded border border-slate-300 px-2 py-1" value={tuanTu} onChange={(e) => setTuanTu(Number(e.target.value) || 1)} />
            </label>
            <label className="flex items-center gap-1.5">đến tuần
              <input aria-label="Đến tuần" type="number" min={1} max={40} className="w-16 rounded border border-slate-300 px-2 py-1" value={tuanDen} onChange={(e) => setTuanDen(Number(e.target.value) || 1)} />
            </label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={tinhOnTap} onChange={(e) => setTinhOnTap(e.target.checked)} /> Tính tiết ôn tập</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={tinhKiemTra} onChange={(e) => setTinhKiemTra(e.target.checked)} /> Tính tiết kiểm tra</label>
            <span className="text-xs text-slate-500">{baoCao.tongTiet} tiết trong phạm vi · ma trận {fmt(baoCao.tongDiem)} điểm, {baoCao.tongCau} câu{du.phienBan ? ` (bản ${du.phienBan})` : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50">
                  <th rowSpan={2} className="border border-slate-300 px-2 py-1.5 text-left">Mạch kiến thức</th>
                  <th colSpan={4} className="border border-slate-300 px-2 py-1">Theo số tiết PPCT (gợi ý)</th>
                  <th colSpan={3} className="border border-slate-300 px-2 py-1">Ma trận chung hiện có</th>
                </tr>
                <tr className="bg-slate-50 text-xs">
                  {['Số tiết', 'Tỉ lệ', 'Điểm', 'Số câu', 'Điểm', 'Số câu', 'Tỉ lệ'].map((h, i) => <th key={i} className="border border-slate-300 px-2 py-1">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {baoCao.dong.map((d) => {
                  const khacDiem = lech(d.diemGoiY, d.diemMaTran, 0.5);
                  const khacCau = d.cauGoiY !== d.cauMaTran;
                  return (
                    <tr key={d.mach}>
                      <td className="border border-slate-300 px-2 py-1.5">{d.mach}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{d.soTiet}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{fmt(d.tiLe)}%</td>
                      <td className={`border border-slate-300 px-2 py-1.5 text-center ${khacDiem ? 'bg-amber-50' : ''}`}>{fmt(d.diemGoiY)}</td>
                      <td className={`border border-slate-300 px-2 py-1.5 text-center ${khacCau ? 'bg-amber-50' : ''}`}>{d.cauGoiY}</td>
                      <td className={`border border-slate-300 px-2 py-1.5 text-center ${khacDiem ? 'bg-amber-50' : ''}`}>{fmt(d.diemMaTran)}</td>
                      <td className={`border border-slate-300 px-2 py-1.5 text-center ${khacCau ? 'bg-amber-50' : ''}`}>{d.cauMaTran}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{fmt(d.tiLeMaTran)}%</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="border border-slate-300 px-2 py-1.5">Cộng</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{baoCao.tongTiet - baoCao.tietChuaXep}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{baoCao.tongTiet - baoCao.tietChuaXep ? '100%' : ''}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{fmt(Math.round(baoCao.dong.reduce((s, d) => s + d.diemGoiY, 0) * 100) / 100)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{baoCao.dong.reduce((s, d) => s + d.cauGoiY, 0)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{fmt(baoCao.tongDiem)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{baoCao.tongCau}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">Ô tô nhạt: số gợi ý khác ma trận (lệch từ 0,5 điểm hoặc khác số câu). Điểm gợi ý chia theo bước 0,5 cho tròn tổng; số câu tính theo số câu của ma trận.</p>
          {baoCao.ghiChu.map((g) => <div key={g} className="text-xs text-amber-800">{g}</div>)}

          <div className="border-t border-sky-200 pt-2">
            <button type="button" className="flex items-center gap-1.5 text-sm font-semibold text-slate-800" onClick={() => setMoXep((v) => !v)}>
              {moXep ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Xếp bài vào mạch ({baoCao.bai.length} bài trong phạm vi, {baoCao.bai.filter((b) => !bang[b.khoa]).length} bài chưa xếp){chuaLuu ? ' · chưa lưu' : ''}
            </button>
            {moXep && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-600">Mỗi bài thuộc một mạch. Bảng dùng chung cho cả 4 kì của môn này. {duocSua ? 'Bấm "AI gợi ý" cho các bài chưa xếp, xem lại rồi bấm Lưu.' : 'Chỉ tổ trưởng sửa được bảng này.'}</p>
                {duocSua && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={nutPhu} disabled={dangAI} onClick={() => void goiYAI()}>{dangAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} AI gợi ý cho bài chưa xếp</button>
                    <button type="button" className={nutChinh} disabled={dangLuu || !chuaLuu} onClick={() => void luu()}>{dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu bảng Bài → Mạch</button>
                  </div>
                )}
                {tin && <div className="text-sm text-sky-900">{tin}</div>}
                <div className="max-h-[480px] overflow-y-auto rounded border border-slate-200 bg-white divide-y divide-slate-100">
                  {baoCao.bai.map((b) => (
                    <div key={b.khoa} className="p-2 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2 items-center">
                      <div>
                        <div className="text-sm text-slate-900">{b.ten}</div>
                        <div className="text-xs text-slate-500">Tuần {b.tuanDau}{b.tuanCuoi > b.tuanDau ? `–${b.tuanCuoi}` : ''} · {b.soTiet} tiết{b.tenTiet.length ? ` · ${b.tenTiet.slice(0, 3).join('; ')}` : ''}</div>
                      </div>
                      <select aria-label={`Mạch của ${b.ten}`} disabled={!duocSua} className={`rounded-lg border px-2 py-1.5 text-sm ${bang[b.khoa] ? 'border-slate-300' : 'border-amber-400 bg-amber-50'}`}
                        value={bang[b.khoa] ?? ''} onChange={(e) => { const v = e.target.value; setBang((x) => { const m = { ...x }; if (v) m[b.khoa] = v; else delete m[b.khoa]; return m; }); setChuaLuu(true); }}>
                        <option value="">Chưa xếp mạch</option>
                        {cacMach.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
