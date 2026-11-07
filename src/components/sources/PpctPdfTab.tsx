'use client';

/**
 * Nhập PPCT từ PDF: PDF có chữ thì đọc chữ, PDF ảnh quét thì AI đọc ảnh các trang thầy chọn.
 * AI chép thành bảng, code kiểm tra, thầy xem rồi mới lưu (thay lịch tiết cũ của môn đó).
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, TriangleAlert } from 'lucide-react';
import { docBangPpct, taoBackupHub } from '@/core/chuong-trinh/ppct-tu-pdf';
import { chiaPhan } from '@/core/chuong-trinh/trich-yccd';
import { docChuTuPdf } from '@/core/utils/doc-tep';
import { moPdfLamAnh, type PdfAnh } from '@/core/utils/pdf-anh';

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white';
const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const MON = [
  ['subj-toan4', 'Toán 4'], ['subj-tv4', 'Tiếng Việt 4'], ['subj-kh4', 'Khoa học 4'], ['subj-lsdl4', 'Lịch sử và Địa lí 4'],
  ['subj-cn4', 'Công nghệ 4'], ['subj-dd4', 'Đạo đức 4'], ['subj-hdtn4', 'Hoạt động trải nghiệm 4'],
] as const;
const NAM_HOC = '2026-2027';

export function PpctPdfTab() {
  const [mon, setMon] = useState<string>('subj-toan4');
  const [tep, setTep] = useState<{ ten: string; chu: string | null; buf: ArrayBuffer } | null>(null);
  const [anhDoc, setAnhDoc] = useState<PdfAnh | null>(null);
  const [tu, setTu] = useState('');
  const [den, setDen] = useState('');
  const [chu, setChu] = useState('');
  const [tienDo, setTienDo] = useState<string | null>(null);
  const [xacNhan, setXacNhan] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [tb, setTb] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);

  const kq = useMemo(() => (chu.trim() ? docBangPpct(chu, mon) : null), [chu, mon]);

  const chonTep = async (f: File) => {
    setTb(null); setChu(''); setXacNhan(false);
    try {
      const buf = await f.arrayBuffer();
      let van: string | null = null;
      try { van = await docChuTuPdf(buf.slice(0)); } catch { van = null; }
      setTep({ ten: f.name, chu: van, buf });
      setAnhDoc(van ? null : await moPdfLamAnh(buf.slice(0)));
      setTu(''); setDen('');
    } catch (e) { setTep(null); setTb({ loai: 'loi', text: `Không mở được PDF: ${e instanceof Error ? e.message : e}` }); }
  };

  const goi = async (body: Record<string, unknown>): Promise<string[]> => {
    const r = await fetch('/api/chuong-trinh/ppct-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId: mon, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? `Lỗi ${r.status}`);
    return j.dong as string[];
  };

  const doc = async () => {
    if (!tep) return;
    setTb(null); setXacNhan(false);
    const dong: string[] = [];
    try {
      if (tep.chu) {
        const cacPhan = chiaPhan(tep.chu, 9000);
        if (cacPhan.length > 40) throw new Error(`Tài liệu quá dài (${cacPhan.length} phần). Thầy cắt file theo môn.`);
        for (let i = 0; i < cacPhan.length; i++) {
          setTienDo(`Đang đọc phần ${i + 1}/${cacPhan.length}…`);
          dong.push(...(await goi({ nguon: 'chu', phan: cacPhan[i], stt: i + 1, tong: cacPhan.length })));
        }
      } else if (anhDoc) {
        const a = Number(tu), b = Number(den || tu);
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a || b > anhDoc.soTrang) throw new Error(`Nhập trang trong file từ 1 đến ${anhDoc.soTrang}.`);
        if (b - a >= 12) throw new Error('Mỗi lần đọc tối đa 12 trang.');
        for (let t = a; t <= b; t++) {
          setTienDo(`Đang đọc trang ${t} (${t - a + 1}/${b - a + 1})…`);
          dong.push(...(await goi({ nguon: 'anh', anh: await anhDoc.ve(t) })));
        }
      }
      if (!dong.length) throw new Error('AI không thấy bảng PPCT nào. Thầy kiểm tra lại file hoặc trang đã chọn.');
      setChu(dong.join('\n'));
      setTb({ loai: 'ok', text: `AI đã chép ${dong.length} dòng. Thầy đối chiếu với file gốc ở bảng bên dưới rồi mới lưu.` });
    } catch (e) { setTb({ loai: 'loi', text: e instanceof Error ? e.message : String(e) }); } finally { setTienDo(null); }
  };

  const luu = async () => {
    if (!kq) return;
    setDangLuu(true); setTb(null);
    try {
      const hub = taoBackupHub(kq.dong, mon, 4, NAM_HOC);
      const r = await fetch('/api/curriculum-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonContent: hub, selectedSubjectIds: [mon], provenanceType: 'UNVERIFIED_PENDING', grade: 4, academicYear: NAM_HOC }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setTb({ loai: 'loi', text: j.error ?? `Lỗi ${r.status}` }); return; }
      setTb({ loai: 'ok', text: `Đã lưu ${kq.tongTiet} tiết. Môn này đã được thay lịch tiết mới; xem lại ở thẻ Kho nguồn đã lưu.` });
      setChu(''); setXacNhan(false);
    } finally { setDangLuu(false); }
  };

  const nhom = useMemo(() => {
    const m = new Map<number, { bai: string; soTiet: number; chuDe: string }[]>();
    kq?.dong.forEach((d) => m.set(d.tuan, [...(m.get(d.tuan) ?? []), { bai: d.bai, soTiet: d.soTiet, chuDe: d.chuDe }]));
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [kq]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm text-slate-600">Tải file PDF phân phối chương trình của một môn. PDF có chữ thì app đọc chữ; PDF ảnh quét thì AI đọc ảnh các trang thầy chọn. AI chỉ chép lại bảng, không tự thêm bài hay tính lại số tiết.</p>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Môn" className={o} value={mon} onChange={(e) => { setMon(e.target.value); setXacNhan(false); }}>
            {MON.map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
          </select>
          <label className={`${nutPhu} cursor-pointer`}><FileUp className="w-4 h-4" /> Chọn PDF PPCT
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void chonTep(f); e.target.value = ''; }} />
          </label>
          {tep && <span className="text-sm text-slate-600">{tep.ten} — {tep.chu ? 'PDF có chữ' : `PDF ảnh quét${anhDoc ? `, ${anhDoc.soTrang} trang` : ''}`}</span>}
        </div>
        {tep && !tep.chu && anhDoc && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Bảng PPCT nằm ở trang
            <input aria-label="Từ trang" inputMode="numeric" className={`${o} w-20`} value={tu} onChange={(e) => setTu(e.target.value)} />
            đến
            <input aria-label="Đến trang" inputMode="numeric" className={`${o} w-20`} placeholder={tu} value={den} onChange={(e) => setDen(e.target.value)} />
            <span className="text-xs text-slate-500">(trang thứ mấy trong file)</span>
          </div>
        )}
        {tep && (
          <button type="button" className={nutChinh} disabled={!!tienDo || (!tep.chu && !tu)} onClick={() => void doc()}>
            {tienDo ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}{tienDo ?? 'AI đọc PPCT'}
          </button>
        )}
      </div>

      {tb && (
        <div role="status" className={`rounded-lg border px-3 py-2 text-sm flex items-start gap-2 ${tb.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {tb.loai === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <TriangleAlert className="w-4 h-4 mt-0.5" />}{tb.text}
        </div>
      )}

      {kq && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="font-semibold text-slate-900">Xem trước: {kq.dong.length} dòng, {kq.tongTiet} tiết, {nhom.length} tuần</div>
          {kq.loi.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><div className="font-semibold mb-1">Lỗi cần sửa ({kq.loi.length})</div><ul className="list-disc pl-5">{kq.loi.slice(0, 10).map((l) => <li key={l}>{l}</li>)}</ul></div>}
          {kq.canhBao.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-semibold mb-1">Thầy xem lại ({kq.canhBao.length})</div><ul className="list-disc pl-5">{kq.canhBao.slice(0, 10).map((l) => <li key={l}>{l}</li>)}</ul></div>}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white"><tr className="text-left text-slate-500 border-b"><th className="py-1 pr-3">Tuần</th><th className="pr-3">Chủ đề</th><th className="pr-3">Bài</th><th>Tiết</th></tr></thead>
              <tbody>{nhom.flatMap(([tuan, ds]) => ds.map((d, i) => <tr key={`${tuan}-${i}`} className="border-b border-slate-100"><td className="py-1 pr-3">{i === 0 ? tuan : ''}</td><td className="pr-3">{d.chuDe}</td><td className="pr-3">{d.bai}</td><td>{d.soTiet}</td></tr>))}</tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">Cần sửa dòng nào, thầy xem lại file gốc rồi đọc lại đúng trang đó. Lưu sẽ thay toàn bộ lịch tiết cũ của môn này; YCCĐ đã lưu giữ nguyên.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={xacNhan} onChange={(e) => setXacNhan(e.target.checked)} />Tôi đã đối chiếu bảng với file gốc và đồng ý thay lịch tiết của môn này.</label>
          <button type="button" className={nutChinh} disabled={dangLuu || kq.loi.length > 0 || kq.dong.length === 0 || !xacNhan} onClick={() => void luu()}>
            {dangLuu ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}Lưu PPCT
          </button>
        </div>
      )}
    </div>
  );
}
