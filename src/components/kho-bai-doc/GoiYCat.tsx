'use client';

/**
 * Gợi ý đoạn cắt cho bài đọc thành tiếng quá dài. Hiện khi bài là "Đọc thành tiếng" và dài hơn quy định của kì.
 * Code đếm tiếng; AI (nếu đã cấu hình) chọn đoạn trọn ý nhất. Bấm "Lưu thành bài đọc thành tiếng mới" để tạo thêm một bài từ đoạn đó, bài gốc vẫn giữ nguyên.
 */

import React, { useState } from 'react';
import { Loader2, Scissors, Sparkles } from 'lucide-react';
import type { DoanCat } from '@/core/reading-passages/cat-doan';
import type { KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';

interface KetQua {
  doan: DoanCat[];
  quyDinh: { min: number; max: number; dungSai: number };
  aiChon: { chi: number; lyDo: string; model: string | null } | null;
  aiLoi?: string | null;
}

export function GoiYCat({ tieuDe, noiDung, ky, onLuu }: { tieuDe: string; noiDung: string; ky: KyKiemTraBaiDoc; onLuu: (doan: string) => Promise<void> }) {
  const [dangLuu, setDangLuu] = useState<number | null>(null);
  const [dang, setDang] = useState(false);
  const [kq, setKq] = useState<KetQua | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const goiY = async () => {
    setDang(true);
    setLoi(null);
    try {
      const r = await fetch('/api/reading-passages/goi-y-cat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tieuDe, noiDung, ky }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setKq(r);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  };

  // Đưa đoạn AI chọn lên đầu
  const ds = kq ? kq.doan.map((d, i) => ({ d, i })).sort((a, b) => (a.i === kq.aiChon?.chi ? -1 : b.i === kq.aiChon?.chi ? 1 : a.i - b.i)) : [];

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-700">Bài dài hơn quy định đọc thành tiếng của kì.</span>
        <button type="button" onClick={goiY} disabled={dang} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {dang ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI gợi ý đoạn cắt
        </button>
      </div>
      {loi && <p className="text-red-700">{loi}</p>}
      {kq && kq.doan.length === 0 && <p className="text-amber-800">Không tìm được đoạn nào đủ số tiếng của kì này trong bài.</p>}
      {kq?.aiLoi && <p className="text-xs text-slate-600">{kq.aiLoi}</p>}
      {kq && ds.map(({ d, i }) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {kq.aiChon?.chi === i && <span className="rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 font-semibold">AI chọn</span>}
            <b className="text-slate-900">{d.soTieng} tiếng</b>
            <span>{d.trongKhoang ? `đúng ${kq.quyDinh.min}–${kq.quyDinh.max}` : '(trong dung sai)'}</span>
            <span>· từ {d.batDau === 'DAU_BAI' ? 'đầu bài' : 'giữa bài'}, ngắt: …{d.ketThuc}</span>
          </div>
          {kq.aiChon?.chi === i && kq.aiChon.lyDo && <p className="text-xs text-violet-800">{kq.aiChon.lyDo}</p>}
          <p className="whitespace-pre-line text-slate-800" style={{ fontFamily: "'Times New Roman', serif", fontSize: '13pt' }}>{d.doan}</p>
          <button type="button" disabled={dangLuu !== null} onClick={async () => { setDangLuu(i); try { await onLuu(d.doan); } finally { setDangLuu(null); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
            {dangLuu === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />} Lưu thành bài đọc thành tiếng mới
          </button>
        </div>
      ))}
    </div>
  );
}
