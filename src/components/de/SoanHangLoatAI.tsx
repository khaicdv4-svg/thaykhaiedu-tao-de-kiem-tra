'use client';

/**
 * Nhờ AI soạn hàng loạt câu cho một yêu cầu cần đạt, dựa trên trang SGK của bài.
 * AI chỉ soạn bản nháp; thầy tích chọn, có thể nhờ AI viết lại từng câu, rồi mới lưu vào ngân hàng.
 * Câu lưu từ đây luôn ở trạng thái "chưa kiểm định".
 */

import React, { useEffect, useState } from 'react';
import { ChuPhanSo } from '@/components/de/ChuPhanSo';
import { Loader2, Sparkles } from 'lucide-react';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { VietLaiCauAI } from './VietLaiCauAI';
import type { NoiDungCau } from '@/core/de/de';

interface Yccd { id: string; noiDung: string; bai: string | null }
interface Nhap { noiDung: NoiDungCau; chon: boolean }

const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white';
const TEN_DANG: Record<string, string> = { NLC: 'Nhiều lựa chọn', DS: 'Đúng/Sai', TLN: 'Trả lời ngắn', NOI: 'Nối', DIEN: 'Điền', VIET: 'Viết' };

export function SoanHangLoatAI({ onDaLuu }: { onDaLuu: () => void }) {
  const [mo, setMo] = useState(false);
  const [mon, setMon] = useState('TOAN');
  const [ds, setDs] = useState<Yccd[]>([]);
  const [yccdId, setYccdId] = useState('');
  const [baiHoc, setBaiHoc] = useState('');
  const [trang, setTrang] = useState('');
  const [muc, setMuc] = useState(1);
  const [hinhThuc, setHinhThuc] = useState<'TN' | 'TL'>('TN');
  const [dang, setDang] = useState('NLC');
  const [soCau, setSoCau] = useState(3);
  const [ghiChu, setGhiChu] = useState('');
  const [dangSoan, setDangSoan] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [tin, setTin] = useState<string | null>(null);
  const [nhap, setNhap] = useState<Nhap[]>([]);

  const yccd = ds.find((y) => y.id === yccdId);

  useEffect(() => {
    if (!mo) return;
    setYccdId(''); setDs([]);
    void fetch(`/api/chuong-trinh/yccd?mon=${mon}&lop=4&trangThai=DA_DUYET`).then((r) => r.json()).then((j) => setDs(j.yccd ?? [])).catch(() => setDs([]));
  }, [mon, mo]);

  useEffect(() => { if (yccd?.bai) setBaiHoc(yccd.bai); }, [yccd]);
  useEffect(() => { if (hinhThuc === 'TL' && ['NLC', 'DS'].includes(dang)) setDang('TLN'); if (hinhThuc === 'TN' && !['NLC', 'DS', 'NOI', 'DIEN'].includes(dang)) setDang('NLC'); }, [hinhThuc, dang]);

  const soan = async () => {
    setDangSoan(true); setLoi(null); setTin(null); setNhap([]);
    try {
      const r = await fetch('/api/ngan-hang/soan-hang-loat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mon, yccd: yccd?.noiDung, baiHoc, trangSgk: trang, muc, hinhThuc, dang, soCau, ghiChu }),
      });
      const j = await r.json();
      if (!r.ok) setLoi([j.error, ...(j.thieu ?? [])].filter(Boolean).join(' ') || 'AI chưa soạn được.');
      else setNhap((j.cau as NoiDungCau[]).map((c) => ({ noiDung: { deBai: c.deBai, luaChon: c.luaChon, dapAn: c.dapAn, huongDanCham: c.huongDanCham, ghiChuHinh: '', hinh: [] }, chon: true })));
    } catch { setLoi('Không kết nối được máy chủ.'); }
    setDangSoan(false);
  };

  const luu = async () => {
    const chon = nhap.filter((n) => n.chon);
    if (!chon.length) return;
    setDangLuu(true); setLoi(null);
    let moi = 0; let co = 0; let hong: string | null = null;
    for (const n of chon) {
      const r = await fetch('/api/ngan-hang', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'LUU', mon, chuDe: baiHoc, cau: { ...n.noiDung, muc, hinhThuc, dang, yccd: yccd?.noiDung ?? '', diem: hinhThuc === 'TN' ? 0.5 : 1, hinh: [] } }),
      });
      const j = await r.json();
      if (!r.ok) { hong = j.error ?? 'Không lưu được.'; break; }
      if (j.daCo) co++; else moi++;
    }
    setDangLuu(false);
    if (hong) { setLoi(hong); return; }
    setTin(`Đã lưu ${moi} câu mới vào ngân hàng${co ? `, ${co} câu đã có sẵn` : ''}. Các câu này chưa kiểm định.`);
    setNhap([]);
    onDaLuu();
  };

  if (!mo) return <button type="button" className="nut-tke text-sm" onClick={() => setMo(true)}><Sparkles className="w-4 h-4" /> Nhờ AI soạn câu cho ngân hàng</button>;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">AI soạn câu hàng loạt theo yêu cầu cần đạt</h2>
        <button type="button" className="text-slate-600 underline" onClick={() => setMo(false)}>Đóng</button>
      </div>
      <p className="text-slate-600">AI soạn dựa trên trang sách giáo khoa của bài trong Kho sách và không chép nguyên bài tập trong sách. Đây chỉ là bản nháp, thầy xem kỹ rồi mới lưu.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label>Môn
          <select aria-label="Môn" className={`${o} w-full mt-0.5`} value={mon} onChange={(e) => setMon(e.target.value)}>
            {MAU_MA_TRAN_CHUNG.filter((m, i, a) => a.findIndex((x) => x.ma_mon === m.ma_mon) === i).map((m) => <option key={m.ma_mon} value={m.ma_mon}>{m.mon}</option>)}
          </select>
        </label>
        <label>Yêu cầu cần đạt
          <select aria-label="Yêu cầu cần đạt" className={`${o} w-full mt-0.5`} value={yccdId} onChange={(e) => setYccdId(e.target.value)}>
            <option value="">{ds.length ? 'Chọn yêu cầu cần đạt' : 'Chưa có YCCĐ đã duyệt cho môn này'}</option>
            {ds.map((y) => <option key={y.id} value={y.id}>{(y.bai ? `${y.bai}: ` : '') + y.noiDung.slice(0, 110)}</option>)}
          </select>
        </label>
        <label>Bài học
          <input aria-label="Bài học" className={`${o} w-full mt-0.5`} placeholder="Ví dụ: Bài 12. Làm tròn số" value={baiHoc} onChange={(e) => setBaiHoc(e.target.value)} />
        </label>
        <label>Trang SGK (không bắt buộc)
          <input aria-label="Trang SGK" className={`${o} w-full mt-0.5`} placeholder="Ví dụ: tr. 45-47" value={trang} onChange={(e) => setTrang(e.target.value)} />
        </label>
        <label>Mức
          <select aria-label="Mức" className={`${o} w-full mt-0.5`} value={muc} onChange={(e) => setMuc(Number(e.target.value))}><option value={1}>Mức 1</option><option value={2}>Mức 2</option><option value={3}>Mức 3</option></select>
        </label>
        <label>Hình thức
          <select aria-label="Hình thức" className={`${o} w-full mt-0.5`} value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value as 'TN' | 'TL')}><option value="TN">Trắc nghiệm</option><option value="TL">Tự luận</option></select>
        </label>
        <label>Dạng câu
          <select aria-label="Dạng câu" className={`${o} w-full mt-0.5`} value={dang} onChange={(e) => setDang(e.target.value)}>
            {Object.entries(TEN_DANG).filter(([k]) => (hinhThuc === 'TN' ? ['NLC', 'DS', 'NOI', 'DIEN'] : ['TLN', 'VIET', 'DIEN']).includes(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Số câu (1 đến 6)
          <input aria-label="Số câu" type="number" min={1} max={6} className={`${o} w-full mt-0.5`} value={soCau} onChange={(e) => setSoCau(Math.max(1, Math.min(6, Number(e.target.value) || 1)))} />
        </label>
      </div>
      <label className="block">Yêu cầu riêng (không bắt buộc)
        <input aria-label="Yêu cầu riêng" className={`${o} w-full mt-0.5`} placeholder="Ví dụ: tình huống ở chợ, số liệu nhỏ, đáp án ngắn" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
      </label>
      <button type="button" className="nut-tke text-sm" disabled={dangSoan || !yccd} onClick={() => void soan()}>
        {dangSoan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Soạn {soCau} câu
      </button>
      {loi && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{loi}</div>}
      {tin && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{tin}</div>}

      {nhap.length > 0 && (
        <div className="space-y-2">
          <ul className="space-y-2">
            {nhap.map((n, i) => (
              <li key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" aria-label={`Lưu câu ${i + 1}`} checked={n.chon} onChange={(e) => setNhap((v) => v.map((x, k) => (k === i ? { ...x, chon: e.target.checked } : x)))} />
                  <span className="space-y-0.5">
                    <span className="block font-semibold text-slate-900">Câu {i + 1}</span>
                    <span className="block whitespace-pre-line text-slate-900"><ChuPhanSo chu={n.noiDung.deBai} /></span>
                    {n.noiDung.luaChon.filter((x) => x.trim()).map((x, k) => <span key={k} className="block text-slate-800">{hinhThuc === 'TN' && dang !== 'DS' ? `${'ABCD'[k]}. ` : ''}<ChuPhanSo chu={x} /></span>)}
                    <span className="block"><b>Đáp án:</b> {n.noiDung.dapAn || 'chưa có'}</span>
                    {n.noiDung.huongDanCham && <span className="block whitespace-pre-line"><b>Cách chấm:</b> {n.noiDung.huongDanCham}</span>}
                  </span>
                </label>
                <VietLaiCauAI mon={mon} meta={{ muc, hinhThuc, dang, yccd: yccd?.noiDung ?? '' }} noiDung={n.noiDung} nhanDung="Thay câu này bằng bản mới" onDung={(nd) => setNhap((v) => v.map((x, k) => (k === i ? { ...x, noiDung: nd } : x)))} />
              </li>
            ))}
          </ul>
          <button type="button" className="nut-tke text-sm" disabled={dangLuu || !nhap.some((n) => n.chon)} onClick={() => void luu()}>
            {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Lưu {nhap.filter((n) => n.chon).length} câu đã chọn vào ngân hàng
          </button>
        </div>
      )}
    </div>
  );
}
