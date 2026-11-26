'use client';

/**
 * Bước 1 – Bài đọc cho đề Tiếng Việt: 1 bài đọc hiểu + 4 bài đọc thành tiếng của kì đang chọn.
 * Lấy từ Kho bài đọc đã duyệt (bài dài tự cắt đoạn đủ số tiếng) hoặc nhập tay. Tự lưu lên hệ thống (bảng bai_doc_chon),
 * máy tính và điện thoại dùng chung. Bước 4 tự lấy bài từ đây; câu hỏi, đáp án soạn ở bước 4.
 * Không chọn cùng một bài cho đọc hiểu và đọc thành tiếng.
 */

import React, { useEffect, useRef, useState } from 'react';
import { BookOpenText, CheckCircle2, ChevronDown, ChevronUp, Loader2, TriangleAlert, Wand2 } from 'lucide-react';
import { useBoNao } from '@/lib/hooks/useBoNao';
import { baiDocChonCoGi, baiDocChonRong, demTieng, type BaiDocChon, type BaiDocDe } from '@/core/de/tieng-viet';
import { chonBonBaiDocThanhTieng } from '@/core/reading-passages/chon-bon-bai';
import { catDoanTotNhat } from '@/core/reading-passages/cat-doan';
import { laCungBai } from '@/core/reading-passages/cung-bai';
import { chuDiemCuaKy, khoangDoDai, type KyKiemTraBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

interface BaiKho {
  id: string; tieuDe: string; noiDung: string; tacGia: string; nguon: string;
  loai: 'DOC_THANH_TIENG' | 'DOC_HIEU' | null; chuDiem: string | null; theLoai: TheLoaiBaiDoc | null; trangThai: string; soTieng: number;
}

const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white w-full';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export function ChonBaiDoc({ ky, tenKy }: { ky: KyKiemTraBaiDoc; tenKy: string }) {
  const boNao = useBoNao();
  const [kho, setKho] = useState<BaiKho[]>([]);
  const [bd, setBd] = useState<BaiDocChon>(baiDocChonRong());
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [luu, setLuu] = useState<'' | 'dang' | 'xong' | 'loi'>('');
  const [tuDe, setTuDe] = useState(false);
  const [mo, setMo] = useState(true);
  const [thieu, setThieu] = useState<string[]>([]);
  const daSua = useRef(false);

  useEffect(() => {
    let huy = false;
    setDangTai(true); setLoi(null); setThieu([]); daSua.current = false;
    void Promise.all([
      fetch(`/api/reading-passages/da-duyet?ky=${ky}`).then((r) => r.json()).catch(() => ({ error: 'Không kết nối được Kho bài đọc.' })),
      fetch(`/api/bai-doc-chon?ky=${ky}`).then((r) => r.json()).catch(() => ({ error: 'Không kết nối được máy chủ.' })),
    ]).then(([k, c]) => {
      if (huy) return;
      setKho(k.baiDoc ?? []);
      if (c.error) setLoi(c.error);
      const co = baiDocChonCoGi(c.baiDoc);
      setBd(co ? c.baiDoc : baiDocChonRong());
      setTuDe(!!c.tuDe);
      setMo(!co);
      setDangTai(false);
    });
    return () => { huy = true; };
  }, [ky]);

  // Tự lưu 1,5 giây sau lần sửa cuối
  useEffect(() => {
    if (!daSua.current) return;
    setLuu('dang');
    const t = window.setTimeout(async () => {
      try {
        const r = await fetch('/api/bai-doc-chon', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ky, baiDoc: bd }) });
        setLuu(r.ok ? 'xong' : 'loi');
        if (r.ok) setTuDe(false);
      } catch { setLuu('loi'); }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [bd, ky]);

  const doi = (f: (b: BaiDocChon) => BaiDocChon) => { daSua.current = true; setBd(f); };
  const suaHieu = (p: Partial<BaiDocDe>) => doi((b) => ({ ...b, baiDocHieu: { ...b.baiDocHieu, ...p } }));
  const suaTT = (i: number, p: Partial<BaiDocDe>) => doi((b) => ({ ...b, baiDocThanhTieng: b.baiDocThanhTieng.map((x, k) => (k === i ? { ...x, ...p } : x)) }));

  const khoHieu = kho.filter((b) => b.loai === 'DOC_HIEU');
  const khoTT = kho.filter((b) => b.loai === 'DOC_THANH_TIENG');
  const kh = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN', boNao);
  const dsChuDiem = chuDiemCuaKy(ky, boNao);

  const tuKho = (b: BaiKho, noiDung = b.noiDung): BaiDocDe => ({ tieuDe: b.tieuDe, noiDung, tacGia: b.tacGia, nguon: b.nguon, khoId: b.id });
  /** Bài đọc thành tiếng lấy từ kho: dài hơn quy định thì cắt một đoạn đủ số tiếng. */
  const tuKhoTT = (b: BaiKho): BaiDocDe => {
    const d = kh ? catDoanTotNhat(b.noiDung, { min: kh.min, max: kh.max, dungSai: kh.dungSai }) : null;
    return tuKho(b, d?.doan ?? b.noiDung);
  };

  const goiY = () => {
    const kq = chonBonBaiDocThanhTieng(ky, khoTT.map((b) => ({ id: b.id, tieuDe: b.tieuDe, noiDung: b.noiDung, trangThai: b.trangThai, chuDiem: b.chuDiem, theLoai: b.theLoai })), {
      baiDocHieuId: bd.baiDocHieu.khoId ?? null, baiDocHieuTieuDe: bd.baiDocHieu.tieuDe || null, boNao,
    });
    setThieu(kq.thieu);
    doi((b) => ({
      ...b,
      baiDocThanhTieng: b.baiDocThanhTieng.map((cu, i) => {
        const x = kq.baiDoc[i];
        const goc = x && kho.find((k) => k.id === x.id);
        return goc ? tuKho(goc, x.doan.doan) : cu;
      }),
    }));
  };

  const hieu = bd.baiDocHieu;
  const trung = bd.baiDocThanhTieng.some((b) => (b.tieuDe.trim() || b.khoId) && (hieu.tieuDe.trim() || hieu.khoId)
    && laCungBai({ id: b.khoId ?? undefined, tieuDe: b.tieuDe }, { id: hieu.khoId ?? undefined, tieuDe: hieu.tieuDe }));
  const soXong = [hieu, ...bd.baiDocThanhTieng].filter((b) => b.tieuDe.trim() && b.noiDung.trim()).length;

  const nhanTieng = (n: number) => {
    if (!kh) return `${n} tiếng`;
    const ok = n >= kh.min - kh.dungSai && n <= kh.max + kh.dungSai;
    return <span className={ok ? 'text-emerald-700' : n ? 'text-red-700' : 'text-slate-500'}>{n} tiếng (quy định {kh.min}–{kh.max}, ±{kh.dungSai})</span>;
  };
  const chonTuKho = (ds: BaiKho[], onChon: (b: BaiKho) => void, nhan: string) => (
    <select aria-label={nhan} className={`${o} sm:w-72`} value="" onChange={(e) => { const b = ds.find((x) => x.id === e.target.value); if (b) onChon(b); }}>
      <option value="">{ds.length ? 'Chọn từ Kho bài đọc…' : 'Kho chưa có bài đã duyệt cho kì này'}</option>
      {ds.map((b) => <option key={b.id} value={b.id}>{b.tieuDe} ({b.soTieng} tiếng{b.chuDiem ? `, ${b.chuDiem}` : ''})</option>)}
    </select>
  );
  const oBai = (b: BaiDocDe, sua: (p: Partial<BaiDocDe>) => void, ten: string, dong: number, tieng: React.ReactNode) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-xs text-slate-500">Tên bài<input aria-label={`Tên ${ten}`} className={`${o} mt-0.5`} value={b.tieuDe} onChange={(e) => sua({ tieuDe: e.target.value })} /></label>
        <label className="text-xs text-slate-500">Tác giả<input aria-label={`Tác giả ${ten}`} className={`${o} mt-0.5`} value={b.tacGia} onChange={(e) => sua({ tacGia: e.target.value })} /></label>
        <label className="text-xs text-slate-500">Nguồn<input aria-label={`Nguồn ${ten}`} className={`${o} mt-0.5`} placeholder="(Nguồn: …)" value={b.nguon} onChange={(e) => sua({ nguon: e.target.value })} /></label>
      </div>
      <label className="block text-xs text-slate-500">Nội dung · {tieng}
        <textarea aria-label={`Nội dung ${ten}`} rows={dong} className={`${o} mt-0.5`} value={b.noiDung} onChange={(e) => sua({ noiDung: e.target.value })} />
      </label>
    </>
  );

  return (
    <div className="the-tke p-6 space-y-4">
      <button type="button" className="w-full flex flex-wrap items-center justify-between gap-2 text-left" onClick={() => setMo((x) => !x)} aria-expanded={mo}>
        <span className="font-semibold text-slate-900 flex items-center gap-2"><BookOpenText className="w-5 h-5 text-blue-600" /> Bài đọc cho đề Tiếng Việt – {tenKy}</span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          {dangTai ? <Loader2 className="w-4 h-4 animate-spin" /> : soXong === 5 && !trung ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : null}
          {dangTai ? 'Đang tải…' : `Đã có ${soXong}/5 bài`}
          {luu === 'dang' && ' · đang lưu…'}{luu === 'xong' && ' · đã lưu'}{luu === 'loi' && <span className="text-red-700"> · chưa lưu được</span>}
          {mo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {mo && !dangTai && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">1 bài đọc hiểu và 4 bài đọc thành tiếng{dsChuDiem.length ? ` (chủ điểm: ${dsChuDiem.join('; ')})` : ''}. App tự lưu; bước 4 tự lấy bài từ đây, thầy cô chỉ soạn câu hỏi.</p>
          {tuDe && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Đây là bài đọc trong đề đang soạn. Sửa ở đây thì đề ở bước 4 đổi theo.</div>}
          {loi && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{loi}</div>}
          {trung && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2"><TriangleAlert className="w-4 h-4" /> Bài đọc thành tiếng đang trùng bài đọc hiểu. Thầy cô chọn bài khác.</div>}

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">Bài đọc hiểu</span>
              {chonTuKho(khoHieu, (b) => suaHieu(tuKho(b)), 'Chọn bài đọc hiểu từ kho')}
            </div>
            {oBai(hieu, suaHieu, 'bài đọc hiểu', 8, `${demTieng(hieu.noiDung)} tiếng`)}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">Bốn bài đọc thành tiếng</span>
              <button type="button" className={nutPhu} disabled={!khoTT.length} onClick={goiY}><Wand2 className="w-4 h-4" /> Gợi ý 4 bài từ kho</button>
            </div>
            {thieu.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{thieu.map((t, i) => <p key={i}>{t}</p>)}</div>}
            {bd.baiDocThanhTieng.map((b, i) => (
              <div key={i} className="border-t border-slate-100 pt-3 space-y-2 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">Bài đọc {i + 1}</span>
                  {chonTuKho(khoTT, (x) => suaTT(i, tuKhoTT(x)), `Chọn bài đọc thành tiếng ${i + 1} từ kho`)}
                </div>
                {oBai(b, (p) => suaTT(i, p), `bài đọc thành tiếng ${i + 1}`, 4, nhanTieng(demTieng(b.noiDung)))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
