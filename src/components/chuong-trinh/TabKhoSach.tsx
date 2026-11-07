'use client';

/**
 * Kho sách: thầy tải SGK và SGV (PDF) lên. Ứng dụng chỉ lưu CHỮ của từng trang (không lưu file PDF),
 * để khi tạo đề, AI tìm đúng bài, trang như trong bản đặc tả mà soạn câu và đối chiếu.
 * Trang là ảnh quét thì cho AI đọc theo khoảng trang thầy chọn.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Loader2, ScanText, Trash2, Upload } from 'lucide-react';
import { DANH_SACH_MON, TEN_MON } from '@/core/chuong-trinh/mon';
import { moPdfDocChu, type PdfDocChu } from '@/core/utils/doc-tep';
import { moPdfLamAnh, type PdfAnh } from '@/core/utils/pdf-anh';

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white';
const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const LOP = 4;
const TOI_DA_TRANG_PDF = 400;

interface Sach { id: string; mon: string; loai: 'SGK' | 'SGV'; tap: number; tenFile: string; soTrangPdf: number; trangDauPdf: number; soTrangCoChu: number; soTrangAiDoc: number }

export function TabKhoSach({ duocSua }: { duocSua: boolean }) {
  const [ds, setDs] = useState<Sach[]>([]);
  const [mon, setMon] = useState('TOAN');
  const [loai, setLoai] = useState<'SGK' | 'SGV'>('SGK');
  const [tap, setTap] = useState(1);
  const [trangDau, setTrangDau] = useState('1');
  const [tep, setTep] = useState<{ ten: string; buf: ArrayBuffer } | null>(null);
  const [tienDo, setTienDo] = useState<string | null>(null);
  const [tb, setTb] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  // Đọc ảnh quét
  const [anh, setAnh] = useState<{ sach: Sach; doc: PdfAnh } | null>(null);
  const [tu, setTu] = useState('');
  const [den, setDen] = useState('');

  const nap = useCallback(async () => {
    const r = await fetch(`/api/chuong-trinh/sach?lop=${LOP}`).then((x) => x.json()).catch(() => ({}));
    if (r.error) setTb({ loai: 'loi', text: r.error });
    setDs(Array.isArray(r.sach) ? r.sach : []);
  }, []);
  useEffect(() => { void nap(); }, [nap]);

  const chonTep = async (f: File | undefined) => {
    if (!f) return;
    setTb(null);
    if (!/\.pdf$/i.test(f.name)) { setTb({ loai: 'loi', text: 'Chỉ nhận file PDF.' }); return; }
    setTep({ ten: f.name, buf: await f.arrayBuffer() });
  };

  const luuNhom = async (sachId: string, nguon: 'CHU' | 'AI_DOC', trang: { trang: number; chu: string }[]) => {
    const r = await fetch('/api/chuong-trinh/sach/trang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sachId, nguon, trang }) }).then((x) => x.json());
    if (r.error) throw new Error(r.error);
  };

  const taiLen = async () => {
    if (!tep) return;
    setTb(null);
    try {
      setTienDo('Đang mở file…');
      const doc: PdfDocChu = await moPdfDocChu(tep.buf);
      if (doc.soTrang > TOI_DA_TRANG_PDF) throw new Error(`File có ${doc.soTrang} trang, vượt giới hạn ${TOI_DA_TRANG_PDF} trang. Thầy tách file rồi tải từng phần.`);
      const tr = await fetch('/api/chuong-trinh/sach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon, lop: LOP, loai, tap, tenFile: tep.ten, soTrangPdf: doc.soTrang, trangDauPdf: Math.max(1, Number(trangDau) || 1) }) }).then((x) => x.json());
      if (tr.error) throw new Error(tr.error);
      let nhom: { trang: number; chu: string }[] = [];
      let coChu = 0;
      for (let i = 1; i <= doc.soTrang; i++) {
        setTienDo(`Đang đọc chữ trang ${i}/${doc.soTrang}…`);
        const chu = await doc.chu(i);
        if (chu) coChu++;
        nhom.push({ trang: i, chu });
        if (nhom.length >= 20 || i === doc.soTrang) { await luuNhom(tr.id, 'CHU', nhom); nhom = []; }
      }
      setTep(null);
      setTb({ loai: 'ok', text: coChu === 0 ? `Đã lưu ${doc.soTrang} trang nhưng file là ảnh quét, chưa có chữ. Thầy bấm "AI đọc ảnh" ở dòng sách vừa tải để đọc các trang cần dùng.` : `Đã lưu chữ của ${coChu}/${doc.soTrang} trang.${coChu < doc.soTrang ? ' Trang nào còn trống là ảnh quét, thầy bấm "AI đọc ảnh" nếu cần.' : ''}` });
      await nap();
    } catch (e) {
      setTb({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally { setTienDo(null); }
  };

  const xoa = async (s: Sach) => {
    if (!confirm(`Xóa ${s.loai} ${TEN_MON[s.mon]} tập ${s.tap} khỏi kho?`)) return;
    const r = await fetch(`/api/chuong-trinh/sach?id=${s.id}`, { method: 'DELETE' }).then((x) => x.json());
    if (r.error) setTb({ loai: 'loi', text: r.error }); else await nap();
  };

  const moDocAnh = async (s: Sach) => {
    const f = await new Promise<File | undefined>((res) => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf';
      i.onchange = () => res(i.files?.[0]); i.click();
    });
    if (!f) return;
    try {
      const doc = await moPdfLamAnh(await f.arrayBuffer());
      if (doc.soTrang !== s.soTrangPdf) throw new Error(`File này có ${doc.soTrang} trang, khác cuốn đã tải (${s.soTrangPdf} trang). Thầy chọn đúng file.`);
      setAnh({ sach: s, doc }); setTu(''); setDen(''); setTb(null);
    } catch (e) { setTb({ loai: 'loi', text: e instanceof Error ? e.message : String(e) }); }
  };

  const chayDocAnh = async () => {
    if (!anh) return;
    const a = Math.max(1, Number(tu) || 0);
    const b = Math.min(anh.sach.soTrangPdf, Number(den) || 0);
    if (!a || !b || b < a) { setTb({ loai: 'loi', text: 'Thầy nhập khoảng trang trong file PDF, ví dụ từ 12 đến 30.' }); return; }
    if (b - a + 1 > 40) { setTb({ loai: 'loi', text: 'Mỗi lần đọc tối đa 40 trang. Thầy chia nhỏ khoảng trang.' }); return; }
    try {
      let xong = 0;
      for (let p = a; p <= b; p++) {
        setTienDo(`AI đang đọc trang ${p} (${p - a + 1}/${b - a + 1})…`);
        const ve = await anh.doc.ve(p);
        const r = await fetch('/api/chuong-trinh/sach/doc-anh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon: anh.sach.mon, anh: ve, trang: p }) }).then((x) => x.json());
        if (r.error) throw new Error(`Trang ${p}: ${r.error}`);
        await luuNhom(anh.sach.id, 'AI_DOC', [{ trang: p, chu: r.chu }]);
        xong++;
      }
      setTb({ loai: 'ok', text: `AI đã đọc ${xong} trang. Chữ do AI đọc có thể sai chỗ nhỏ, thầy xem lại khi AI soạn câu.` });
      setAnh(null);
      await nap();
    } catch (e) {
      setTb({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
      await nap();
    } finally { setTienDo(null); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">Kho sách giáo khoa và sách giáo viên lớp 4</p>
        <p className="mt-1">Thầy tải file PDF lên một lần. Ứng dụng chỉ giữ chữ của từng trang để AI tìm đúng bài, đúng trang trong bản đặc tả khi soạn câu và đối chiếu. Sách là của trường, chỉ dùng nội bộ; AI không chép nguyên bài tập trong sách vào đề.</p>
      </div>

      {tb && <p className={`rounded-lg px-3 py-2 text-sm ${tb.loai === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{tb.text}</p>}

      {duocSua && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <select className={o} value={mon} onChange={(e) => setMon(e.target.value)}>{DANH_SACH_MON.map((m) => <option key={m.ma} value={m.ma}>{m.ten}</option>)}</select>
            <select className={o} value={loai} onChange={(e) => setLoai(e.target.value as 'SGK' | 'SGV')}><option value="SGK">Sách giáo khoa</option><option value="SGV">Sách giáo viên</option></select>
            <select className={o} value={tap} onChange={(e) => setTap(Number(e.target.value))}><option value={1}>Tập 1</option><option value={2}>Tập 2</option></select>
          </div>
          <label className="block text-sm text-slate-700">Trang số 1 của sách nằm ở trang thứ mấy của file PDF?
            <input className={`${o} ml-2 w-20`} inputMode="numeric" value={trangDau} onChange={(e) => setTrangDau(e.target.value.replace(/\D/g, ''))} />
            <span className="ml-2 text-xs text-slate-500">(File có bìa, lời nói đầu thì số này lớn hơn 1. Để 1 nếu file bắt đầu đúng từ trang 1.)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`${nutPhu} cursor-pointer`}><Upload className="h-4 w-4" />{tep ? tep.ten : 'Chọn file PDF'}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => void chonTep(e.target.files?.[0])} />
            </label>
            <button type="button" className={nutChinh} disabled={!tep || !!tienDo} onClick={() => void taiLen()}>{tienDo ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} Tải lên và đọc chữ</button>
          </div>
          <p className="text-xs text-slate-500">Tải lại cùng môn, loại, tập sẽ thay cuốn cũ.</p>
        </div>
      )}

      {tienDo && <p className="text-sm text-slate-600 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{tienDo}</p>}

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-3 py-2">Môn</th><th className="px-3 py-2">Sách</th><th className="px-3 py-2">Trang PDF</th><th className="px-3 py-2">Có chữ</th><th className="px-3 py-2">AI đọc</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {ds.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500"><BookOpen className="mx-auto mb-1 h-5 w-5" />Chưa có sách nào trong kho.</td></tr>}
            {ds.map((s) => {
              const trong = s.soTrangPdf - s.soTrangCoChu - s.soTrangAiDoc;
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{TEN_MON[s.mon] ?? s.mon}</td>
                  <td className="px-3 py-2">{s.loai} tập {s.tap}<div className="text-xs text-slate-500">{s.tenFile}</div></td>
                  <td className="px-3 py-2">{s.soTrangPdf} (trang 1 sách = trang {s.trangDauPdf} PDF)</td>
                  <td className="px-3 py-2">{s.soTrangCoChu}</td>
                  <td className="px-3 py-2">{s.soTrangAiDoc}{trong > 0 && <div className="text-xs text-amber-700">{trong} trang trống</div>}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {duocSua && trong > 0 && <button type="button" className={nutPhu} onClick={() => void moDocAnh(s)} disabled={!!tienDo}><ScanText className="h-4 w-4" />AI đọc ảnh</button>}{' '}
                    {duocSua && <button type="button" className={nutPhu} onClick={() => void xoa(s)} aria-label="Xóa"><Trash2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {anh && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
          <p className="font-semibold text-amber-900">AI đọc ảnh: {anh.sach.loai} {TEN_MON[anh.sach.mon]} tập {anh.sach.tap} ({anh.sach.soTrangPdf} trang PDF)</p>
          <p>Chỉ đọc những trang cần dùng (bài sắp ra đề). Mỗi lần tối đa 40 trang.</p>
          <div className="flex flex-wrap items-center gap-2">
            Từ trang PDF <input className={`${o} w-20`} inputMode="numeric" value={tu} onChange={(e) => setTu(e.target.value.replace(/\D/g, ''))} />
            đến <input className={`${o} w-20`} inputMode="numeric" value={den} onChange={(e) => setDen(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className={nutChinh} disabled={!!tienDo} onClick={() => void chayDocAnh()}>Bắt đầu đọc</button>
            <button type="button" className={nutPhu} disabled={!!tienDo} onClick={() => setAnh(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
