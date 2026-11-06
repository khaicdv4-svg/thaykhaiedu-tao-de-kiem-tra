'use client';

/**
 * Chọn bài đọc cho đề Tiếng Việt: 1 bài đọc hiểu + 4 bài đọc thành tiếng của một kì.
 * Số tiếng, chủ điểm theo Bộ não chuyên môn; không chọn cùng một bài cho đọc hiểu và đọc thành tiếng.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Loader2, Wand2 } from 'lucide-react';
import { useBoNao } from '@/lib/hooks/useBoNao';
import { chonBonBaiDocThanhTieng, type KetQuaChonBonBai } from '@/core/reading-passages/chon-bon-bai';
import { DANH_SACH_KY, TEN_THE_LOAI, chuDiemCuaKy, khoangDoDai, type KyKiemTraBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

interface BaiDaDuyet {
  id: string; tieuDe: string; noiDung: string; tacGia: string; nguon: string;
  loai: 'DOC_THANH_TIENG' | 'DOC_HIEU' | null; chuDiem: string | null; theLoai: TheLoaiBaiDoc | null; trangThai: string; soTieng: number;
}

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function ChonBaiDocPage() {
  const boNao = useBoNao();
  const [ky, setKy] = useState<KyKiemTraBaiDoc>('CUOI_HK1');
  const [kho, setKho] = useState<BaiDaDuyet[]>([]);
  const [dang, setDang] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [hieuId, setHieuId] = useState('');
  const [kq, setKq] = useState<KetQuaChonBonBai | null>(null);
  const [daChep, setDaChep] = useState<string | null>(null);

  useEffect(() => {
    setDang(true); setLoi(null); setKq(null); setHieuId('');
    fetch(`/api/reading-passages/da-duyet?ky=${ky}`).then((r) => r.json()).then((r) => {
      if (r.error) throw new Error(r.error);
      setKho(r.baiDoc);
    }).catch((e) => setLoi(e instanceof Error ? e.message : String(e))).finally(() => setDang(false));
  }, [ky]);

  const hieu = useMemo(() => kho.filter((b) => b.loai === 'DOC_HIEU'), [kho]);
  const nguonThanhTieng = useMemo(() => kho.filter((b) => b.loai === 'DOC_THANH_TIENG'), [kho]);
  const q = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN', boNao)!;
  const baiHieu = hieu.find((b) => b.id === hieuId);

  const chon = () => {
    setKq(chonBonBaiDocThanhTieng(ky, nguonThanhTieng.map((b) => ({ id: b.id, tieuDe: b.tieuDe, noiDung: b.noiDung, trangThai: b.trangThai, chuDiem: b.chuDiem, theLoai: b.theLoai })), {
      baiDocHieuId: hieuId || null, baiDocHieuTieuDe: baiHieu?.tieuDe ?? null, boNao,
    }));
  };
  const chep = async (id: string, text: string) => { await navigator.clipboard.writeText(text); setDaChep(id); setTimeout(() => setDaChep(null), 1500); };
  const bai = (id: string) => kho.find((b) => b.id === id);

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16">
      <div>
        <Link href="/test-builder" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Xưởng tạo đề</Link>
        <h1 className="text-xl font-bold text-slate-900 mt-1">Chọn bài đọc cho đề Tiếng Việt</h1>
        <p className="text-sm text-slate-600">1 bài đọc hiểu và 4 bài đọc thành tiếng, lấy từ kho bài đã duyệt. Không chọn cùng một bài cho hai phần.</p>
      </div>

      <section className="the-tke p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">Kì kiểm tra
            <select className={o} value={ky} onChange={(e) => setKy(e.target.value as KyKiemTraBaiDoc)}>
              {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
            </select>
          </label>
          <span className="text-slate-600">Đọc thành tiếng: {q.min}–{q.max} tiếng (±{q.dungSai}) · Chủ điểm: {chuDiemCuaKy(ky, boNao).join('; ')}</span>
        </div>
        <label className="flex flex-wrap items-center gap-2 text-sm">Bài đọc hiểu của đề
          <select className={`${o} min-w-64`} value={hieuId} onChange={(e) => { setHieuId(e.target.value); setKq(null); }}>
            <option value="">– Chưa chọn –</option>
            {hieu.map((b) => <option key={b.id} value={b.id}>{b.tieuDe} ({b.soTieng} tiếng{b.chuDiem ? `, ${b.chuDiem}` : ''})</option>)}
          </select>
        </label>
        {dang && <p className="text-sm text-slate-500"><Loader2 className="inline w-4 h-4 animate-spin" /> Đang tải kho bài đã duyệt…</p>}
        {loi && <p className="text-sm text-red-700">{loi}</p>}
        {!dang && !loi && <p className="text-sm text-slate-600">Kho có {hieu.length} bài đọc hiểu và {nguonThanhTieng.length} bài đọc thành tiếng đã duyệt cho kì này.</p>}
        <button type="button" disabled={dang || nguonThanhTieng.length === 0} onClick={chon} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">
          <Wand2 className="w-4 h-4" /> Gợi ý 4 bài đọc thành tiếng
        </button>
      </section>

      {kq && (
        <section className="space-y-3">
          {kq.thieu.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              {kq.thieu.map((t, i) => <p key={i}>{t}</p>)}
              <p>Cần thêm bài đọc thành tiếng đã duyệt (hoặc cắt đoạn từ bài dài ở Hàng chờ duyệt).</p>
            </div>
          )}
          {kq.baiDoc.length === 4 && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Đủ 4 bài đọc thành tiếng, không trùng bài đọc hiểu.</div>}
          {kq.baiDoc.map((b, i) => {
            const goc = bai(b.id);
            return (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b className="text-slate-900">Bài đọc {i + 1}: {b.tieuDe}</b>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs">{b.doan.soTieng} tiếng{b.doan.trongKhoang ? '' : ' (trong dung sai)'}</span>
                  <span className="text-xs text-slate-600">{b.chuDiem}{b.theLoai ? ` · ${TEN_THE_LOAI[b.theLoai]}` : ''}</span>
                </div>
                <p className="text-xs text-slate-500">{goc?.tacGia ? `Tác giả: ${goc.tacGia}` : ''}{goc?.nguon ? ` · Nguồn: ${goc.nguon}` : ''} · {b.doan.batDau === 'DAU_BAI' ? 'đoạn từ đầu bài' : 'đoạn giữa bài'}, ngắt: …{b.doan.ketThuc}</p>
                <p className="whitespace-pre-line text-slate-800" style={{ fontFamily: "'Times New Roman', serif", fontSize: '13pt' }}>{b.doan.doan}</p>
                <button type="button" onClick={() => chep(b.id, b.doan.doan)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                  <Copy className="w-3.5 h-3.5" /> {daChep === b.id ? 'Đã chép' : 'Sao chép đoạn này'}
                </button>
              </div>
            );
          })}
          <p className="text-xs text-slate-500">Phần soạn đề hoàn chỉnh (câu hỏi, đáp án, xuất file Word) chưa nối vào đây. Hiện thầy dùng danh sách này để chọn bài.</p>
        </section>
      )}
    </div>
  );
}
