'use client';

/**
 * Danh sách ngân hàng câu hỏi của trường. Dùng ở trang Ngân hàng câu hỏi (quản lý)
 * và ở bước Tạo đề (chọn một câu để đưa vào chỗ đang soạn).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Loader2, Search, Trash2 } from 'lucide-react';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import type { NoiDungCau } from '@/core/de/de';

interface Cau {
  id: string; maMon: string; muc: number; hinhThuc: 'TN' | 'TL'; dang: string | null; yccd: string; chuDe: string;
  diemGoiY: number | null; noiDung: NoiDungCau; daKiemDinh: boolean; taoLuc: string; cuaToi: boolean;
}

const TEN_DANG: Record<string, string> = { NLC: 'Nhiều lựa chọn', DS: 'Đúng/Sai', TLN: 'Trả lời ngắn', NOI: 'Nối', DIEN: 'Điền', VIET: 'Viết' };
const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white';

interface Props {
  /** Cố định môn (ở bước Tạo đề); bỏ trống thì cho chọn. */
  mon?: string;
  muc?: number;
  hinhThuc?: string;
  dang?: string | null;
  /** Có hàm này thì mỗi câu có nút "Dùng câu này". */
  onChon?: (c: Cau) => void;
}

export function NganHangCauHoi({ mon: monCoDinh, muc: mucMacDinh, hinhThuc: htMacDinh, dang: dangMacDinh, onChon }: Props) {
  const [mon, setMon] = useState(monCoDinh ?? '');
  const [muc, setMuc] = useState(mucMacDinh ? String(mucMacDinh) : '');
  const [hinhThuc, setHinhThuc] = useState(htMacDinh ?? '');
  const [dang, setDang] = useState(dangMacDinh ?? '');
  const [q, setQ] = useState('');
  const [chiDuyet, setChiDuyet] = useState(false);
  const [ds, setDs] = useState<Cau[]>([]);
  const [duocDuyet, setDuocDuyet] = useState(false);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [mo, setMo] = useState<string | null>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    const sp = new URLSearchParams();
    if (mon) sp.set('mon', mon);
    if (muc) sp.set('muc', muc);
    if (hinhThuc) sp.set('hinhThuc', hinhThuc);
    if (dang) sp.set('dang', dang);
    if (q.trim()) sp.set('q', q.trim());
    if (chiDuyet) sp.set('daKiemDinh', '1');
    try {
      const r = await fetch(`/api/ngan-hang?${sp}`);
      const j = await r.json();
      if (!r.ok) { setLoi(j.error ?? 'Không đọc được ngân hàng câu hỏi.'); setDs([]); } else { setDs(j.cau ?? []); setDuocDuyet(!!j.duocDuyet); }
    } catch { setLoi('Không kết nối được máy chủ.'); }
    setDangTai(false);
  }, [mon, muc, hinhThuc, dang, q, chiDuyet]);

  useEffect(() => { void tai(); }, [tai]);

  const xoa = async (c: Cau) => {
    if (!window.confirm('Xóa câu này khỏi ngân hàng? Đề đã dùng câu này không bị ảnh hưởng.')) return;
    const r = await fetch(`/api/ngan-hang?id=${c.id}`, { method: 'DELETE' });
    if (!r.ok) setLoi((await r.json()).error ?? 'Không xóa được.'); else void tai();
  };
  const datKiemDinh = async (c: Cau) => {
    const r = await fetch('/api/ngan-hang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hanhDong: 'KIEM_DINH', id: c.id, daKiemDinh: !c.daKiemDinh }) });
    if (!r.ok) setLoi((await r.json()).error ?? 'Không cập nhật được.'); else void tai();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        {!monCoDinh && (
          <select aria-label="Môn" className={o} value={mon} onChange={(e) => setMon(e.target.value)}>
            <option value="">Tất cả môn</option>
            {MAU_MA_TRAN_CHUNG.filter((m, i, a) => a.findIndex((x) => x.ma_mon === m.ma_mon) === i).map((m) => <option key={m.ma_mon} value={m.ma_mon}>{m.mon}</option>)}
          </select>
        )}
        <select aria-label="Mức" className={o} value={muc} onChange={(e) => setMuc(e.target.value)}>
          <option value="">Mọi mức</option><option value="1">Mức 1</option><option value="2">Mức 2</option><option value="3">Mức 3</option>
        </select>
        <select aria-label="Hình thức" className={o} value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)}>
          <option value="">Trắc nghiệm và tự luận</option><option value="TN">Trắc nghiệm</option><option value="TL">Tự luận</option>
        </select>
        <select aria-label="Dạng câu" className={o} value={dang} onChange={(e) => setDang(e.target.value)}>
          <option value="">Mọi dạng</option>
          {Object.entries(TEN_DANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
          <input aria-label="Tìm câu hỏi" className={`${o} w-full pl-8`} placeholder="Tìm theo chữ trong đề, YCCĐ, chủ đề" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="flex items-center gap-1.5 text-slate-700"><input type="checkbox" checked={chiDuyet} onChange={(e) => setChiDuyet(e.target.checked)} /> Chỉ câu đã kiểm định</label>
      </div>

      {loi && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loi}</div>}
      {dangTai && <div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>}
      {!dangTai && !loi && ds.length === 0 && <div className="text-sm text-slate-500">Chưa có câu nào phù hợp. Khi soạn đề, bấm "Lưu vào ngân hàng" ở câu muốn dùng lại.</div>}

      <ul className="divide-y divide-slate-100">
        {ds.map((c) => {
          const dangMo = mo === c.id;
          return (
            <li key={c.id} className="py-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === c.maMon)?.mon ?? c.maMon}</span>
                <span>Mức {c.muc} · {c.hinhThuc === 'TN' ? 'Trắc nghiệm' : 'Tự luận'}{c.dang ? ` · ${TEN_DANG[c.dang] ?? c.dang}` : ''}{c.diemGoiY != null ? ` · ${String(c.diemGoiY).replace('.', ',')} điểm` : ''}</span>
                {c.daKiemDinh && <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck className="w-3.5 h-3.5" /> Đã kiểm định</span>}
                {(c.noiDung.hinh ?? []).some((h) => h.anh) && <span>Có hình</span>}
              </div>
              <div className="text-sm text-slate-900 whitespace-pre-line">{dangMo ? c.noiDung.deBai : c.noiDung.deBai.split('\n').slice(0, 3).join('\n')}</div>
              {dangMo && (
                <div className="text-sm text-slate-700 space-y-1 rounded-lg bg-slate-50 p-2">
                  {c.noiDung.luaChon.filter((x) => x.trim()).map((x, i) => <div key={i}>{c.hinhThuc === 'TN' && c.dang !== 'DS' ? `${'ABCD'[i]}. ` : ''}{x}</div>)}
                  <div><b>Đáp án:</b> {c.noiDung.dapAn || 'chưa có'}</div>
                  {c.noiDung.huongDanCham && <div className="whitespace-pre-line"><b>Cách chấm:</b> {c.noiDung.huongDanCham}</div>}
                  {c.yccd && <div className="text-xs text-slate-500">YCCĐ: {c.yccd}</div>}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button type="button" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" onClick={() => setMo(dangMo ? null : c.id)}>{dangMo ? 'Thu gọn' : 'Xem đủ'}</button>
                {onChon && <button type="button" className="nut-tke text-xs" onClick={() => onChon(c)}>Dùng câu này</button>}
                {duocDuyet && <button type="button" className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800" onClick={() => void datKiemDinh(c)}>{c.daKiemDinh ? 'Bỏ đánh dấu kiểm định' : 'Đánh dấu đã kiểm định'}</button>}
                {(c.cuaToi || duocDuyet) && <button type="button" className="ml-auto inline-flex items-center gap-1 text-red-700" onClick={() => void xoa(c)}><Trash2 className="w-3 h-3" /> Xóa</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
