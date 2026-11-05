'use client';

/**
 * Hàng chờ duyệt bài đọc. Tổ trưởng xem kết quả kiểm tra tự động, duyệt hoặc từ chối (ghi lí do).
 * Máy chủ kiểm tra lại toàn bộ quy định trước khi duyệt; giáo viên không tự duyệt được.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FilePlus2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { TheBaiDoc, type BaiDocSua } from '@/components/kho-bai-doc/TheBaiDoc';
import type { TrangThaiLink } from '@/core/reading-passages/kiem-tra';

interface BaiTrongKho {
  id: string; tieuDe: string; noiDung: string; tacGia: string; nguon: string; nguonUrl: string | null;
  loai: BaiDocSua['loai']; ky: BaiDocSua['ky']; theLoai: BaiDocSua['theLoai']; chuDiem: string | null;
  trangThai: string; trangThaiLink: TrangThaiLink; nguonGoc: string; taoLuc: string;
}

const NGUON_GOC: Record<string, string> = { TAI_FILE: 'Tải file', AI_TIM: 'AI tìm', NHAP_TAY: 'Nhập tay' };

export default function HangChoDuyetPage() {
  const [ds, setDs] = useState<BaiTrongKho[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);
  const [lyDo, setLyDo] = useState<Record<string, string>>({});
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);

  const tai = async () => {
    setDangTai(true);
    try {
      const r = await fetch('/api/reading-passages/hang-cho').then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setDs(r.baiDoc);
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangTai(false);
    }
  };
  useEffect(() => { tai(); }, []);

  const xuLy = async (id: string, hanhDong: 'DUYET' | 'TU_CHOI') => {
    setDangXuLy(id);
    setThongBao(null);
    try {
      const r = await fetch('/api/reading-passages/duyet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, hanhDong, ghiChu: lyDo[id] }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setDs((cu) => cu.filter((b) => b.id !== id));
      setThongBao({ loai: 'ok', text: hanhDong === 'DUYET' ? 'Đã duyệt, bài đã vào kho để làm đề.' : 'Đã từ chối và ghi lí do.' });
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangXuLy(null);
    }
  };

  const choDuyet = ds.filter((b) => b.trangThai === 'PENDING_REVIEW');
  const banNhap = ds.filter((b) => b.trangThai === 'DRAFT');

  const the = (b: BaiTrongKho, coNut: boolean) => (
    <TheBaiDoc
      key={b.id}
      chiXem
      bai={{ khoa: b.id, chon: false, tieuDe: b.tieuDe, noiDung: b.noiDung, tacGia: b.tacGia, nguon: b.nguon, nguonUrl: b.nguonUrl ?? '', loai: b.loai, ky: b.ky, theLoai: b.theLoai, chuDiem: b.chuDiem, trangThaiLink: b.trangThaiLink, ghiChu: [`Nguồn gốc: ${NGUON_GOC[b.nguonGoc] ?? b.nguonGoc} · ${new Date(b.taoLuc).toLocaleDateString('vi-VN')}`] }}
      hanhDong={coNut ? (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <input className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Lí do (bắt buộc khi từ chối)" value={lyDo[b.id] ?? ''} onChange={(e) => setLyDo({ ...lyDo, [b.id]: e.target.value })} />
          <button type="button" disabled={dangXuLy === b.id} onClick={() => xuLy(b.id, 'TU_CHOI')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"><XCircle className="w-4 h-4" /> Từ chối</button>
          <button type="button" disabled={dangXuLy === b.id} onClick={() => xuLy(b.id, 'DUYET')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {dangXuLy === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Duyệt vào kho
          </button>
        </div>
      ) : null}
    />
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reading-passages" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Kho bài đọc</Link>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Hàng chờ duyệt bài đọc</h1>
          <p className="text-sm text-slate-600">Tổ trưởng duyệt bài đạt yêu cầu; bài bị từ chối cần ghi lí do để giáo viên sửa.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={tai} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"><RefreshCw className="w-4 h-4" /> Tải lại</button>
          <Link href="/reading-passages/nhap" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><FilePlus2 className="w-4 h-4" /> Nhập bài đọc</Link>
        </div>
      </div>

      {thongBao && <div className={`rounded-lg border p-3 text-sm ${thongBao.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{thongBao.text}</div>}
      {dangTai && <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>}

      {!dangTai && (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Chờ duyệt ({choDuyet.length})</h2>
            {choDuyet.length === 0 ? <p className="text-sm text-slate-500">Không có bài nào chờ duyệt.</p> : choDuyet.map((b) => the(b, true))}
          </section>
          {banNhap.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-slate-900">Bản nháp còn lỗi ({banNhap.length})</h2>
              <p className="text-sm text-slate-500">Các bài này chưa đạt kiểm tra nên chưa gửi duyệt được. Giáo viên nhập lại bản đã sửa.</p>
              {banNhap.map((b) => the(b, false))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
