'use client';

/**
 * Nhờ AI viết lại một câu theo ý giáo viên (dễ hiểu hơn, đáp án ngắn hơn…).
 * AI chỉ đề xuất bản mới; thầy xem rồi mới bấm dùng. Không tự ghi đè.
 */

import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { NoiDungCau } from '@/core/de/de';

interface Meta { muc: number; hinhThuc: string; dang: string | null; yccd: string }
interface BanMoi { deBai: string; luaChon: string[]; dapAn: string; huongDanCham: string; ghiChu: string }

const GOI_Y = ['Câu hỏi dễ hiểu hơn', 'Đáp án ngắn gọn hơn', 'Đổi số liệu khác', 'Dùng từ quen thuộc với học sinh miền Nam'];
const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white w-full';

export function VietLaiCauAI({ mon, meta, noiDung, nhanDung, onDung }: {
  mon: string; meta: Meta; noiDung: NoiDungCau; nhanDung: string; onDung: (n: NoiDungCau) => void | Promise<void>;
}) {
  const [mo, setMo] = useState(false);
  const [yeuCau, setYeuCau] = useState('');
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [ban, setBan] = useState<BanMoi | null>(null);

  const viet = async () => {
    setDang(true); setLoi(null); setBan(null);
    try {
      const r = await fetch('/api/ngan-hang/viet-lai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mon, yeuCau, muc: meta.muc, hinhThuc: meta.hinhThuc, dang: meta.dang, yccd: meta.yccd, cau: { deBai: noiDung.deBai, luaChon: noiDung.luaChon, dapAn: noiDung.dapAn, huongDanCham: noiDung.huongDanCham } }),
      });
      const j = await r.json();
      if (!r.ok) setLoi(j.error ?? 'AI chưa viết lại được.'); else setBan(j.cau);
    } catch { setLoi('Không kết nối được máy chủ.'); }
    setDang(false);
  };

  if (!mo) return <button type="button" className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-xs text-violet-800" onClick={() => setMo(true)}>Viết lại bằng AI</button>;

  return (
    <div className="w-full rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {GOI_Y.map((g) => <button key={g} type="button" className="rounded-full border border-violet-300 bg-white px-2 py-0.5 text-xs text-violet-800" onClick={() => setYeuCau(g)}>{g}</button>)}
      </div>
      <textarea aria-label="Thầy muốn sửa câu này thế nào" rows={2} className={o} placeholder="Thầy muốn sửa thế nào? Ví dụ: câu hỏi dễ hiểu hơn; đáp án ngắn hơn; đổi sang tình huống ở chợ." value={yeuCau} onChange={(e) => setYeuCau(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="nut-tke text-sm" disabled={dang || !yeuCau.trim()} onClick={() => void viet()}>
          {dang ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Viết lại
        </button>
        <button type="button" className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm" onClick={() => { setMo(false); setBan(null); setLoi(null); }}>Đóng</button>
      </div>
      {loi && <div className="text-red-700">{loi}</div>}
      {ban && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-violet-900">Bản AI đề xuất (thầy xem lại trước khi dùng)</div>
          <div className="whitespace-pre-line text-slate-900">{ban.deBai}</div>
          {ban.luaChon.filter((x) => x.trim()).map((x, i) => <div key={i} className="text-slate-800">{meta.hinhThuc === 'TN' && meta.dang !== 'DS' ? `${'ABCD'[i]}. ` : ''}{x}</div>)}
          <div><b>Đáp án:</b> {ban.dapAn || 'chưa có'}</div>
          {ban.huongDanCham && <div className="whitespace-pre-line"><b>Cách chấm:</b> {ban.huongDanCham}</div>}
          {ban.ghiChu && <div className="text-amber-800">Lưu ý của AI: {ban.ghiChu}</div>}
          <div className="flex gap-2">
            <button type="button" className="nut-tke text-sm" onClick={async () => { await onDung({ ...noiDung, deBai: ban.deBai, luaChon: ban.luaChon.length ? ban.luaChon : noiDung.luaChon, dapAn: ban.dapAn || noiDung.dapAn, huongDanCham: ban.huongDanCham }); setMo(false); setBan(null); setYeuCau(''); }}>{nhanDung}</button>
            <button type="button" className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm" onClick={() => setBan(null)}>Bỏ bản này</button>
          </div>
        </div>
      )}
    </div>
  );
}
