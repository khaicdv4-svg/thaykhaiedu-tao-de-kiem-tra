'use client';

/**
 * Khung nhập bài đọc cho đề Tiếng Việt: một bài đọc hiểu và bốn bài đọc thành tiếng (mỗi bài một câu hỏi, một đáp án).
 * Có thể chọn bài đã duyệt trong Kho bài đọc hoặc tự nhập. Đếm tiếng ngay khi nhập, báo khi lệch quy định.
 */

import React, { useEffect, useState } from 'react';
import { demTieng, type BaiDocDe, type BaiDocThanhTieng, type NoiDungTiengViet } from '@/core/de/tieng-viet';
import { khoangDoDai, type KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';

interface BaiTrongKho { id: string; tieuDe: string; noiDung: string; tacGia: string; nguon: string; loai: string | null; soTieng: number }

const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white w-full';

interface Props {
  ky: KyKiemTraBaiDoc;
  gia: NoiDungTiengViet;
  onDoi: (g: NoiDungTiengViet) => void;
}

export function BaiDocTiengViet({ ky, gia, onDoi }: Props) {
  const [kho, setKho] = useState<BaiTrongKho[]>([]);
  const [loiKho, setLoiKho] = useState<string | null>(null);

  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const r = await fetch(`/api/reading-passages/da-duyet?ky=${ky}`);
        const j = (await r.json().catch(() => ({}))) as { baiDoc?: BaiTrongKho[]; error?: string };
        if (huy) return;
        if (!r.ok) setLoiKho(j.error ?? 'Không đọc được Kho bài đọc.');
        else { setKho(j.baiDoc ?? []); setLoiKho(null); }
      } catch {
        if (!huy) setLoiKho('Không kết nối được Kho bài đọc.');
      }
    })();
    return () => { huy = true; };
  }, [ky]);

  const khoDocHieu = kho.filter((b) => b.loai === 'DOC_HIEU');
  const khoThanhTieng = kho.filter((b) => b.loai === 'DOC_THANH_TIENG');
  const kh = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN');

  const suaHieu = (p: Partial<BaiDocDe>) => onDoi({ ...gia, baiDocHieu: { ...gia.baiDocHieu, ...p } });
  const suaTT = (i: number, p: Partial<BaiDocThanhTieng>) => onDoi({ ...gia, baiDocThanhTieng: gia.baiDocThanhTieng.map((b, k) => (k === i ? { ...b, ...p } : b)) });
  const tuKho = (b: BaiTrongKho): BaiDocDe => ({ tieuDe: b.tieuDe, noiDung: b.noiDung, tacGia: b.tacGia, nguon: b.nguon, khoId: b.id });

  const chonKho = (ds: BaiTrongKho[], onChon: (b: BaiTrongKho) => void, nhan: string) => (
    <select aria-label={nhan} className={`${o} sm:w-72`} value="" onChange={(e) => { const b = ds.find((x) => x.id === e.target.value); if (b) onChon(b); }}>
      <option value="">{ds.length ? 'Chọn từ Kho bài đọc…' : 'Kho chưa có bài đã duyệt cho kì này'}</option>
      {ds.map((b) => <option key={b.id} value={b.id}>{b.tieuDe} ({b.soTieng} tiếng)</option>)}
    </select>
  );

  const nhanTieng = (n: number) => {
    if (!kh) return `${n} tiếng`;
    const ok = n >= kh.min - kh.dungSai && n <= kh.max + kh.dungSai;
    return <span className={ok ? 'text-emerald-700' : n ? 'text-red-700' : 'text-slate-500'}>{n} tiếng (quy định {kh.min}–{kh.max}, lệch tối đa ±{kh.dungSai})</span>;
  };

  return (
    <div className="space-y-4">
      {loiKho && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{loiKho} Thầy vẫn nhập bài tay được.</div>}

      <div className="the-tke p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Bài đọc hiểu</h2>
          {chonKho(khoDocHieu, (b) => suaHieu(tuKho(b)), 'Chọn bài đọc hiểu từ kho')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs text-slate-500">Tên bài<input aria-label="Tên bài đọc hiểu" className={`${o} mt-0.5`} value={gia.baiDocHieu.tieuDe} onChange={(e) => suaHieu({ tieuDe: e.target.value })} /></label>
          <label className="text-xs text-slate-500">Tác giả<input aria-label="Tác giả bài đọc hiểu" className={`${o} mt-0.5`} value={gia.baiDocHieu.tacGia} onChange={(e) => suaHieu({ tacGia: e.target.value })} /></label>
          <label className="text-xs text-slate-500">Nguồn<input aria-label="Nguồn bài đọc hiểu" className={`${o} mt-0.5`} placeholder="(Nguồn: …)" value={gia.baiDocHieu.nguon} onChange={(e) => suaHieu({ nguon: e.target.value })} /></label>
        </div>
        <label className="block text-xs text-slate-500">Nội dung ({demTieng(gia.baiDocHieu.noiDung)} tiếng)
          <textarea aria-label="Nội dung bài đọc hiểu" rows={8} className={`${o} mt-0.5`} value={gia.baiDocHieu.noiDung} onChange={(e) => suaHieu({ noiDung: e.target.value })} />
        </label>
      </div>

      <div className="the-tke p-4 space-y-4">
        <h2 className="font-semibold text-slate-900">Bốn bài đọc thành tiếng (mỗi bài một câu hỏi)</h2>
        {gia.baiDocThanhTieng.map((b, i) => (
          <div key={i} className="border-t border-slate-100 pt-3 space-y-2 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-800">Bài đọc {i + 1}</span>
              {chonKho(khoThanhTieng, (x) => suaTT(i, tuKho(x)), `Chọn bài đọc thành tiếng ${i + 1} từ kho`)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="text-xs text-slate-500">Tên bài<input aria-label={`Tên bài đọc ${i + 1}`} className={`${o} mt-0.5`} value={b.tieuDe} onChange={(e) => suaTT(i, { tieuDe: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Tác giả<input aria-label={`Tác giả bài đọc ${i + 1}`} className={`${o} mt-0.5`} value={b.tacGia} onChange={(e) => suaTT(i, { tacGia: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Nguồn<input aria-label={`Nguồn bài đọc ${i + 1}`} className={`${o} mt-0.5`} placeholder="(Nguồn: …)" value={b.nguon} onChange={(e) => suaTT(i, { nguon: e.target.value })} /></label>
            </div>
            <label className="block text-xs text-slate-500">Nội dung đoạn đọc · {nhanTieng(demTieng(b.noiDung))}
              <textarea aria-label={`Nội dung bài đọc ${i + 1}`} rows={5} className={`${o} mt-0.5`} value={b.noiDung} onChange={(e) => suaTT(i, { noiDung: e.target.value })} />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs text-slate-500">Câu hỏi (hỏi chi tiết có trong đoạn)<input aria-label={`Câu hỏi bài đọc ${i + 1}`} className={`${o} mt-0.5 ${b.cauHoi.trim() ? '' : 'border-amber-400 bg-amber-50'}`} value={b.cauHoi} onChange={(e) => suaTT(i, { cauHoi: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Đáp án<input aria-label={`Đáp án bài đọc ${i + 1}`} className={`${o} mt-0.5 ${b.traLoi.trim() ? '' : 'border-amber-400 bg-amber-50'}`} value={b.traLoi} onChange={(e) => suaTT(i, { traLoi: e.target.value })} /></label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
