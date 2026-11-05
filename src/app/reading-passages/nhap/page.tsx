'use client';

/**
 * Nhập kho bài đọc: tải file (Word, văn bản) cho máy phân tích, hoặc nhờ AI tìm bài.
 * Máy tự tách bài, nhận tác giả, nguồn, gợi ý chủ điểm, kì, loại bài, thể loại, kiểm tra độ dài và trùng SGK.
 * Giáo viên sửa lại, chọn bài, gửi vào hàng chờ; tổ trưởng duyệt ở /reading-passages/duyet.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileUp, Inbox, Loader2, Search, Send, Sparkles } from 'lucide-react';
import { docChuTuDocx } from '@/core/utils/docx-text';
import { CHU_DIEM_THEO_KY, DANH_SACH_KY, TEN_LOAI, TEN_THE_LOAI, type KyKiemTraBaiDoc, type LoaiBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import { kiemTraBaiDoc } from '@/core/reading-passages/kiem-tra';
import { TheBaiDoc, type BaiDocSua } from '@/components/kho-bai-doc/TheBaiDoc';

type Tab = 'FILE' | 'AI';
const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const nutChinh = 'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';

interface KetQuaPhanTich {
  tieuDe: string; noiDung: string; tacGia: string; nguon: string; nguonUrl: string;
  loai: LoaiBaiDoc; ky: KyKiemTraBaiDoc | null; theLoai: TheLoaiBaiDoc; chuDiem: string | null; ghiChu: string[];
}

export default function NhapKhoBaiDocPage() {
  const [tab, setTab] = useState<Tab>('FILE');
  const [vanBan, setVanBan] = useState('');
  const [tenFile, setTenFile] = useState('');
  const [loaiChon, setLoaiChon] = useState<LoaiBaiDoc | ''>('');
  const [kyChon, setKyChon] = useState<KyKiemTraBaiDoc | ''>('');
  const [ds, setDs] = useState<BaiDocSua[]>([]);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  const [nguonGoc, setNguonGoc] = useState<'TAI_FILE' | 'AI_TIM'>('TAI_FILE');
  const [ai, setAi] = useState<{ daCauHinh: boolean; model?: string | null; lyDo?: string } | null>(null);
  const [tieuChi, setTieuChi] = useState({ loai: 'DOC_HIEU' as LoaiBaiDoc, ky: 'CUOI_HK1' as KyKiemTraBaiDoc, chuDiem: CHU_DIEM_THEO_KY.CUOI_HK1[0] as string, theLoai: 'TRUYEN' as TheLoaiBaiDoc, soBai: 3 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/reading-passages/ai-tim').then((r) => r.json()).then(setAi).catch(() => setAi({ daCauHinh: false }));
  }, []);

  const napKetQua = (baiDoc: KetQuaPhanTich[], goc: 'TAI_FILE' | 'AI_TIM') => {
    setNguonGoc(goc);
    setDs(baiDoc.map((b, i) => ({
      khoa: `${Date.now()}-${i}`,
      chon: true,
      tieuDe: b.tieuDe, noiDung: b.noiDung, tacGia: b.tacGia, nguon: b.nguon, nguonUrl: b.nguonUrl,
      loai: b.loai, ky: b.ky, theLoai: b.theLoai, chuDiem: b.chuDiem,
      trangThaiLink: b.nguonUrl ? 'CHUA_KIEM' : undefined,
      ghiChu: b.ghiChu,
    })));
  };

  const docFile = async (f: File) => {
    setThongBao(null);
    setTenFile(f.name);
    const ten = f.name.toLowerCase();
    try {
      if (ten.endsWith('.docx')) setVanBan(await docChuTuDocx(await f.arrayBuffer()));
      else if (ten.endsWith('.txt') || ten.endsWith('.md')) setVanBan(await f.text());
      else if (ten.endsWith('.pdf') || ten.endsWith('.doc')) {
        setThongBao({ loai: 'loi', text: 'Chưa đọc được file PDF và .doc cũ. Thầy cô lưu lại thành .docx, hoặc mở file, chép chữ rồi dán vào ô bên dưới.' });
      } else setThongBao({ loai: 'loi', text: 'Chỉ nhận file .docx hoặc .txt.' });
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : 'Không đọc được file.' });
    }
  };

  const phanTich = async () => {
    setDangXuLy(true);
    setThongBao(null);
    try {
      const r = await fetch('/api/reading-passages/phan-tich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vanBan, loai: loaiChon || undefined, ky: kyChon || undefined }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      napKetQua(r.baiDoc, 'TAI_FILE');
      setThongBao({ loai: 'ok', text: `Tách được ${r.baiDoc.length} bài. Xem lại từng bài, sửa chỗ máy đoán sai rồi gửi duyệt.${r.coChuSgk ? '' : ' (Kho SGK chưa có chữ bài đọc nên mới kiểm tra trùng theo tên bài.)'}` });
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangXuLy(false);
    }
  };

  const aiTim = async () => {
    setDangXuLy(true);
    setThongBao(null);
    try {
      const r = await fetch('/api/reading-passages/ai-tim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tieuChi) }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      napKetQua(r.baiDoc, 'AI_TIM');
      if (r.baiDoc.length === 0) {
        const cd = r.chanDoan as { daTimWeb: boolean; doDaiTraLoi: number; soAIGui: number; biLoai: { tieuDe: string; lyDo: string }[]; trichDau: string } | undefined;
        const chiTiet = cd
          ? ` AI gửi về ${cd.soAIGui} bài${cd.biLoai.length ? `, bị loại: ${cd.biLoai.map((b) => `${b.tieuDe} (${b.lyDo})`).join('; ')}` : ''}. ${cd.daTimWeb ? 'AI đã tìm web.' : 'AI không tìm được web (model hoặc cổng không hỗ trợ).'}${cd.soAIGui === 0 && cd.trichDau ? ` Phản hồi của AI: ${cd.trichDau}` : ''}`
          : '';
        setThongBao({ loai: 'loi', text: `AI không đề xuất được bài nào.${chiTiet} Thử đổi chủ điểm, thể loại hoặc model khác.` });
      } else {
        setThongBao({ loai: 'ok', text: `AI đề xuất ${r.baiDoc.length} bài. Kiểm tra link từng bài trước khi gửi duyệt.` });
      }
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangXuLy(false);
    }
  };

  const daChon = ds.filter((b) => b.chon);
  const soDat = daChon.filter((b) => kiemTraBaiDoc(b).hopLe).length;

  const guiDuyet = async () => {
    setDangXuLy(true);
    try {
      const r = await fetch('/api/reading-passages/hang-cho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baiDoc: daChon.map(({ khoa, chon, ghiChu, ...b }) => ({ ...b, nguonGoc, tenFile: tenFile || undefined, ghiChuAI: ghiChu?.length ? { ghiChu } : undefined })) }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setDs((cu) => cu.filter((b) => !b.chon));
      setThongBao({ loai: 'ok', text: `Đã lưu: ${r.choDuyet} bài chờ tổ trưởng duyệt${r.banNhap ? `, ${r.banNhap} bài còn lỗi lưu thành bản nháp` : ''}.` });
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangXuLy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reading-passages" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Kho bài đọc</Link>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Nhập bài đọc vào kho</h1>
          <p className="text-sm text-slate-600">Bài đọc phải ngoài SGK đang dạy, có tác giả và nguồn thật. Mọi bài đều qua tổ trưởng duyệt.</p>
        </div>
        <Link href="/reading-passages/duyet" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"><Inbox className="w-4 h-4" /> Hàng chờ duyệt</Link>
      </div>

      <div className="flex gap-2">
        {([['FILE', 'Tải file lên', FileUp], ['AI', 'AI tìm bài đọc', Sparkles]] as const).map(([k, ten, Icon]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border ${tab === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-700'}`}>
            <Icon className="w-4 h-4" /> {ten}
          </button>
        ))}
      </div>

      {tab === 'FILE' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div
            className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-blue-400"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) docFile(f); }}
          >
            <FileUp className="w-8 h-8 mx-auto text-slate-400" />
            <div className="mt-2 font-medium text-slate-800">{tenFile || 'Chọn hoặc kéo thả file Word (.docx) / văn bản (.txt)'}</div>
            <div className="text-xs text-slate-500 mt-1">Một file có thể chứa nhiều bài. Mỗi bài nên có tên bài, nội dung, dòng "(Theo …)" và dòng "(Nguồn: …)".</div>
            <input ref={fileRef} type="file" accept=".docx,.txt,.md,.pdf,.doc" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) docFile(f); e.target.value = ''; }} />
          </div>
          <textarea className={`${o} w-full min-h-40`} placeholder="…hoặc dán chữ vào đây" value={vanBan} onChange={(e) => setVanBan(e.target.value)} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">Loại bài<br />
              <select className={o} value={loaiChon} onChange={(e) => setLoaiChon(e.target.value as LoaiBaiDoc | '')}>
                <option value="">Máy tự nhận theo độ dài</option>
                {(Object.keys(TEN_LOAI) as LoaiBaiDoc[]).map((k) => <option key={k} value={k}>{TEN_LOAI[k]}</option>)}
              </select>
            </label>
            <label className="text-sm">Kì kiểm tra<br />
              <select className={o} value={kyChon} onChange={(e) => setKyChon(e.target.value as KyKiemTraBaiDoc | '')}>
                <option value="">Máy tự nhận theo chủ điểm</option>
                {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
              </select>
            </label>
            <button type="button" className={nutChinh} disabled={!vanBan.trim() || dangXuLy} onClick={phanTich}>
              {dangXuLy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Phân tích
            </button>
          </div>
        </div>
      )}

      {tab === 'AI' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          {ai && !ai.daCauHinh && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Chưa dùng được AI: {ai.lyDo ?? 'chưa cấu hình'}{' '}
              <Link href="/ai-settings" className="font-semibold underline">Mở Cài đặt AI</Link>
            </div>
          )}
          {ai?.daCauHinh && (
            <p className="text-xs text-slate-500">
              Model đang dùng: <b>{ai.model}</b>. AI tìm web nên có thể mất 1–3 phút. Bài AI đưa ra vẫn phải kiểm tra link và chờ tổ trưởng duyệt.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <label className="text-sm">Loại bài<br />
              <select className={`${o} w-full`} value={tieuChi.loai} onChange={(e) => setTieuChi({ ...tieuChi, loai: e.target.value as LoaiBaiDoc })}>
                {(Object.keys(TEN_LOAI) as LoaiBaiDoc[]).map((k) => <option key={k} value={k}>{TEN_LOAI[k]}</option>)}
              </select>
            </label>
            <label className="text-sm">Kì<br />
              <select className={`${o} w-full`} value={tieuChi.ky} onChange={(e) => { const ky = e.target.value as KyKiemTraBaiDoc; setTieuChi({ ...tieuChi, ky, chuDiem: CHU_DIEM_THEO_KY[ky][0] }); }}>
                {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
              </select>
            </label>
            <label className="text-sm">Chủ điểm<br />
              <select className={`${o} w-full`} value={tieuChi.chuDiem} onChange={(e) => setTieuChi({ ...tieuChi, chuDiem: e.target.value })}>
                {CHU_DIEM_THEO_KY[tieuChi.ky].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">Thể loại<br />
              <select className={`${o} w-full`} value={tieuChi.theLoai} onChange={(e) => setTieuChi({ ...tieuChi, theLoai: e.target.value as TheLoaiBaiDoc })}>
                {(['TRUYEN', 'MIEU_TA', 'THO', 'VAN_BAN_THONG_TIN'] as TheLoaiBaiDoc[]).map((k) => <option key={k} value={k}>{TEN_THE_LOAI[k]}</option>)}
              </select>
            </label>
            <label className="text-sm">Số bài<br />
              <input type="number" min={1} max={8} className={`${o} w-full`} value={tieuChi.soBai} onChange={(e) => setTieuChi({ ...tieuChi, soBai: Number(e.target.value) || 3 })} />
            </label>
          </div>
          <button type="button" className={nutChinh} disabled={!ai?.daCauHinh || dangXuLy} onClick={aiTim}>
            {dangXuLy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI tìm bài đọc
          </button>
        </div>
      )}

      {thongBao && (
        <div className={`rounded-lg border p-3 text-sm ${thongBao.loai === 'ok' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{thongBao.text}</div>
      )}

      {ds.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Kết quả ({ds.length} bài)</h2>
            <span className="text-sm text-slate-600">Đã chọn {daChon.length} bài, {soDat} bài đạt kiểm tra</span>
          </div>
          {ds.map((b) => (
            <TheBaiDoc key={b.khoa} bai={b} onDoi={(m) => setDs((cu) => cu.map((x) => (x.khoa === m.khoa ? m : x)))} />
          ))}
          <div className="sticky bottom-3 flex justify-end">
            <button type="button" className={`${nutChinh} shadow-lg`} disabled={!daChon.length || dangXuLy} onClick={guiDuyet}>
              {dangXuLy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gửi {daChon.length} bài vào hàng chờ duyệt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
