'use client';

/**
 * AI chỉnh độ dài bài đọc: thêm/bớt ít tiếng cho đúng quy định (không quá 15% bài gốc).
 * Hiện bản đề xuất với chữ thêm (đỏ, gạch dưới) và chữ bớt (đỏ, gạch ngang) để tổ trưởng xem.
 * Lưu thì thành bài mới, tác giả "Theo …", gắn nhãn "Có AI chỉnh sửa …"; bài gốc giữ nguyên.
 */

import React, { useState } from 'react';
import { Loader2, Save, Wand2 } from 'lucide-react';
import type { DoanSoSanh, KiemTraBanChinh } from '@/core/reading-passages/chinh-do-dai';

interface DeXuat {
  noiDung: string;
  ghiChu: string;
  kiemTra: KiemTraBanChinh;
  soTiengGoc: number;
  quyDinh: { min: number; max: number; dungSai: number };
  model: string | null;
}

function HienSoSanh({ doan }: { doan: DoanSoSanh[] }) {
  return (
    <p className="leading-relaxed text-slate-800" style={{ fontFamily: '"Times New Roman", serif' }}>
      {doan.map((d, i) => (
        <React.Fragment key={i}>
          {d.loai === 'GIU' ? d.chu
            : d.loai === 'THEM' ? <span className="text-red-600 underline decoration-2" title="AI thêm">{d.chu}</span>
            : <span className="text-red-600 line-through" title="AI bớt">{d.chu}</span>}
        </React.Fragment>
      ))}
    </p>
  );
}

export function ChinhDoDaiAI({ id, soTieng, khoang, onDaLuu }: {
  id: string;
  soTieng: number;
  khoang: { min: number; max: number };
  onDaLuu: (thongBao: { loai: 'ok' | 'loi'; text: string }) => void;
}) {
  const [dang, setDang] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [dx, setDx] = useState<DeXuat | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const muc = Math.min(Math.max(soTieng, khoang.min), khoang.max);
  const canDoi = Math.abs(muc - soTieng);
  const toiDa = Math.floor(soTieng * 0.15);
  const quaNhieu = canDoi > toiDa;

  const goi = async () => {
    setDang(true);
    setLoi(null);
    setDx(null);
    try {
      const r = await fetch('/api/reading-passages/ai-chinh-do-dai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setDx(r);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  };

  const luu = async () => {
    if (!dx) return;
    setDangLuu(true);
    try {
      const r = await fetch('/api/reading-passages/luu-ban-chinh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idGoc: id, noiDung: dx.noiDung }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setDx(null);
      onDaLuu(r.choDuyet > 0
        ? { loai: 'ok', text: `Đã lưu bản AI chỉnh thành bài mới (${dx.kiemTra.nhan}), đang ở mục Chờ duyệt. Bài gốc vẫn giữ nguyên.` }
        : { loai: 'loi', text: 'Đã lưu bản AI chỉnh nhưng còn lỗi, xem ở mục Bản nháp còn lỗi.' });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-700">
          Bài {soTieng} tiếng, cần {soTieng > muc ? 'bớt' : 'thêm'} khoảng {canDoi} tiếng.
          {quaNhieu && ` Lệch quá 15% (tối đa ${toiDa} tiếng) nên AI không chỉnh được${soTieng > muc ? ', thầy cắt một đoạn trọn ý trước' : ''}.`}
        </span>
        {!quaNhieu && (
          <button type="button" onClick={goi} disabled={dang} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
            {dang ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} {dx ? 'AI chỉnh lại' : 'AI chỉnh độ dài'}
          </button>
        )}
      </div>
      {loi && <p className="text-red-700">{loi}</p>}
      {dx && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium text-violet-800">{dx.kiemTra.nhan}</span>
            <span className={`rounded-full border px-2 py-0.5 ${dx.kiemTra.hopLe ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {dx.soTiengGoc} → {dx.kiemTra.soTieng} tiếng (quy định {dx.quyDinh.min}–{dx.quyDinh.max})
            </span>
            <span className="text-slate-500">Chữ đỏ gạch dưới: AI thêm · chữ đỏ gạch ngang: AI bớt</span>
          </div>
          {dx.ghiChu && <p className="text-xs text-slate-600">AI: {dx.ghiChu}</p>}
          <HienSoSanh doan={dx.kiemTra.doan} />
          {!dx.kiemTra.hopLe && <p className="text-red-700">{dx.kiemTra.loi.join(' ')} Bấm "AI chỉnh lại" để thử lần nữa.</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={luu} disabled={!dx.kiemTra.hopLe || dangLuu} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {dangLuu ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Lưu thành bài mới (ghi "Theo tác giả")
            </button>
            <button type="button" onClick={() => setDx(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">Bỏ</button>
          </div>
        </div>
      )}
    </div>
  );
}
