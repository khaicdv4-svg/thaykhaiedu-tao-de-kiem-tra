'use client';

/**
 * ThayKhaiEdu - Xem phân phối chương trình đã nhập: chọn môn, xem từng tiết theo tuần và YCCĐ gắn với tiết.
 * Dữ liệu: bảng ppct_tiet (lịch tiết) và curriculum_outcomes (YCCĐ) của nguồn đã lưu.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, TriangleAlert } from 'lucide-react';
import type { CurriculumSource } from '@/types/curriculum-source';

interface Tiet {
  thuTu: number;
  tuan: number | null;
  hocKi: number | null;
  chuDe: string | null;
  baiTen: string | null;
  tietTen: string;
  tietSo: number | null;
  ghiChu: string | null;
  yccd: string[];
}
interface Yccd { ma: string; maHienThi: string | null; noiDung: string; mach: string | null }

const THU_TU_MON = ['subj-tv4', 'subj-toan4', 'subj-kh4', 'subj-lsdl4', 'subj-cn4', 'subj-dd4', 'subj-hdtn4'];

/** "PPCT & YCCĐ Toán 4 (Năm học 2026-2027)" → "Toán 4" */
const tenNgan = (s: CurriculumSource) => s.name.replace(/^PPCT\s*&\s*YCCĐ\s*/i, '').replace(/\s*\(Năm học[^)]*\)\s*$/i, '');

export function PpctDaNhapView({ sources, onNhapLai }: { sources: CurriculumSource[]; onNhapLai: () => void }) {
  const dsMon = useMemo(
    () => [...sources].sort((a, b) => {
      const ia = THU_TU_MON.indexOf(a.subjectId ?? ''), ib = THU_TU_MON.indexOf(b.subjectId ?? '');
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }),
    [sources],
  );
  const [chon, setChon] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [tiet, setTiet] = useState<Tiet[]>([]);
  const [yccd, setYccd] = useState<Yccd[]>([]);
  const [hocKi, setHocKi] = useState<0 | 1 | 2>(0);
  const [tim, setTim] = useState('');
  const [xem, setXem] = useState<'tiet' | 'yccd'>('tiet');

  const nguon = dsMon.find((s) => s.id === chon) ?? dsMon[0] ?? null;

  useEffect(() => {
    if (!nguon) return;
    let huy = false;
    setDangTai(true);
    setLoi(null);
    fetch(`/api/curriculum-sources/ppct?sourceId=${nguon.id}`)
      .then((r) => r.json())
      .then((r) => {
        if (huy) return;
        if (r.error) throw new Error(r.error);
        setTiet(r.tiet);
        setYccd(r.yccd);
      })
      .catch((e) => !huy && setLoi(e instanceof Error ? e.message : String(e)))
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [nguon]);

  const yccdTheoMa = useMemo(() => new Map(yccd.map((y) => [y.ma, y])), [yccd]);

  const tietLoc = useMemo(() => {
    const t = tim.trim().toLowerCase();
    return tiet.filter((x) =>
      (hocKi === 0 || x.hocKi === hocKi) &&
      (!t || [x.chuDe, x.baiTen, x.tietTen, x.ghiChu].some((v) => v?.toLowerCase().includes(t)) || (x.tuan !== null && String(x.tuan) === t)),
    );
  }, [tiet, hocKi, tim]);

  const yccdLoc = useMemo(() => {
    const t = tim.trim().toLowerCase();
    return t ? yccd.filter((y) => [y.noiDung, y.mach, y.maHienThi].some((v) => v?.toLowerCase().includes(t))) : yccd;
  }, [yccd, tim]);

  if (!nguon) return null;
  const soTuan = new Set(tiet.map((x) => x.tuan).filter((x) => x !== null)).size;
  const soBai = new Set(tiet.map((x) => x.baiTen).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      {/* Chọn môn */}
      <div className="flex flex-wrap gap-2">
        {dsMon.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setChon(s.id); setTim(''); setHocKi(0); }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${s.id === nguon.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {tenNgan(s)}
          </button>
        ))}
      </div>

      <div className="the-tke p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{tenNgan(nguon)}</h3>
            <p className="text-sm text-slate-600">
              {dangTai ? 'Đang tải…' : `${tiet.length} tiết · ${soBai} bài · ${soTuan} tuần · ${yccd.length} YCCĐ`}
              {' '}(trong file: {nguon.totalLessons} bài, {nguon.totalPeriods} tiết)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm">
              {(['tiet', 'yccd'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setXem(k)} className={`px-3 py-1.5 ${xem === k ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}>
                  {k === 'tiet' ? 'Lịch tiết' : 'YCCĐ'}
                </button>
              ))}
            </div>
            {xem === 'tiet' && (
              <select aria-label="Học kì" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={hocKi} onChange={(e) => setHocKi(Number(e.target.value) as 0 | 1 | 2)}>
                <option value={0}>Cả năm</option>
                <option value={1}>Học kì I</option>
                <option value={2}>Học kì II</option>
              </select>
            )}
            <label className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2 text-slate-400" />
              <input className="rounded-lg border border-slate-300 pl-7 pr-2 py-1.5 text-sm w-56" placeholder={xem === 'tiet' ? 'Tìm bài, tiết hoặc số tuần' : 'Tìm YCCĐ'} value={tim} onChange={(e) => setTim(e.target.value)} />
            </label>
          </div>
        </div>

        {loi && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loi}</div>}

        {!dangTai && !loi && tiet.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Môn này mới lưu tổng số bài, số tiết, chưa có lịch từng tiết. Lần nhập trước diễn ra khi app chưa biết lưu lịch tiết.
              Thầy cô nhập lại file sao lưu PPCT HUB mới nhất là thấy đủ tuần, bài, tiết.{' '}
              <button type="button" className="font-semibold underline" onClick={onNhapLai}>Nhập lại file sao lưu</button>
            </div>
          </div>
        )}

        {dangTai ? (
          <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Đang tải…</div>
        ) : xem === 'tiet' ? (
          tietLoc.length > 0 && (
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="text-left p-2 w-16">Tuần</th>
                    <th className="text-left p-2">Chủ đề / Bài</th>
                    <th className="text-left p-2">Tiết</th>
                    <th className="text-left p-2 w-[38%]">YCCĐ</th>
                  </tr>
                </thead>
                <tbody>
                  {tietLoc.map((x, i) => {
                    const dauTuan = i === 0 || tietLoc[i - 1].tuan !== x.tuan;
                    const dauBai = dauTuan || tietLoc[i - 1].baiTen !== x.baiTen;
                    return (
                      <tr key={x.thuTu} className={dauTuan ? 'border-t-2 border-slate-300' : 'border-t border-slate-100'}>
                        <td className="p-2 align-top font-semibold text-slate-900">{dauTuan ? x.tuan ?? '–' : ''}</td>
                        <td className="p-2 align-top">
                          {dauBai && (
                            <>
                              {x.chuDe && <div className="text-xs text-slate-500">{x.chuDe}</div>}
                              <div className="font-medium text-slate-900">{x.baiTen}</div>
                            </>
                          )}
                        </td>
                        <td className="p-2 align-top text-slate-800">
                          {x.tietSo !== null && <span className="text-xs text-slate-500 mr-1">T{x.tietSo}</span>}
                          {x.tietTen}
                          {x.ghiChu && <div className="text-xs text-slate-500">{x.ghiChu}</div>}
                        </td>
                        <td className="p-2 align-top text-xs text-slate-700">
                          {x.yccd.map((m) => {
                            const y = yccdTheoMa.get(m);
                            return <div key={m} className="mb-0.5">• {y ? y.noiDung : <span className="text-slate-400">{m}</span>}</div>;
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : yccdLoc.length === 0 ? (
          <p className="text-sm text-slate-500">Môn này chưa có YCCĐ trong dữ liệu đã nhập.</p>
        ) : (
          <ol className="space-y-1.5 text-sm text-slate-800 list-decimal pl-6 max-h-[70vh] overflow-y-auto">
            {yccdLoc.map((y) => (
              <li key={y.ma}>
                {y.noiDung}
                {y.mach && <span className="text-xs text-slate-500"> · {y.mach}</span>}
              </li>
            ))}
          </ol>
        )}
        {!dangTai && xem === 'tiet' && tiet.length > 0 && tietLoc.length === 0 && <p className="text-sm text-slate-500">Không có tiết nào khớp.</p>}
      </div>
    </div>
  );
}
