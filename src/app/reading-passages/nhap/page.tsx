'use client';

/**
 * Nhập kho bài đọc: tải một hoặc nhiều file (Word, văn bản) cho máy phân tích, hoặc nhờ AI tìm bài.
 * Nhiều file được đọc ở trình duyệt rồi gửi phân tích lần lượt từng file; mỗi bài giữ tên file gốc.
 * Máy tự tách bài, nhận tác giả, nguồn, gợi ý chủ điểm, kì, loại bài, thể loại, kiểm tra độ dài và trùng SGK.
 * Giáo viên sửa lại, chọn bài, gửi vào hàng chờ; tổ trưởng duyệt ở /reading-passages/duyet.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileText, FileUp, Inbox, Loader2, Search, Send, Sparkles, Trash2, X, XCircle } from 'lucide-react';
import { docChuTuDocx } from '@/core/utils/docx-text';
import { CHU_DIEM_THEO_KY, chuDiemCuaKy, DANH_SACH_KY, TEN_LOAI, TEN_THE_LOAI, type KyKiemTraBaiDoc, type LoaiBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import { useBoNao } from '@/lib/hooks/useBoNao';
import { kiemTraBaiDoc } from '@/core/reading-passages/kiem-tra';
import { TheBaiDoc, type BaiDocSua } from '@/components/kho-bai-doc/TheBaiDoc';

type Tab = 'FILE' | 'AI';
const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const nutChinh = 'nut-tke text-sm';

/** Số file tối đa mỗi lần tải. */
const TOI_DA_FILE = 30;

type TrangThaiTep = 'DANG_DOC' | 'SAN_SANG' | 'LOI' | 'DANG_PHAN_TICH' | 'XONG';
interface TepNhap {
  id: string;
  ten: string;
  kichThuoc: number;
  trangThai: TrangThaiTep;
  vanBan: string;
  loi?: string;
  soBai?: number;
}

/** Đọc chữ từ một file ở trình duyệt. Lỗi thì ném ra câu báo dễ hiểu. */
async function docChuFile(f: File): Promise<string> {
  const ten = f.name.toLowerCase();
  if (ten.endsWith('.docx')) return docChuTuDocx(await f.arrayBuffer());
  if (ten.endsWith('.txt') || ten.endsWith('.md')) return f.text();
  if (ten.endsWith('.pdf') || ten.endsWith('.doc')) throw new Error('Chưa đọc được PDF và .doc cũ. Mở file bằng Word rồi lưu lại thành .docx.');
  throw new Error('Chỉ nhận file .docx hoặc .txt.');
}

interface KetQuaPhanTich {
  tieuDe: string; noiDung: string; tacGia: string; nguon: string; nguonUrl: string;
  loai: LoaiBaiDoc; ky: KyKiemTraBaiDoc | null; theLoai: TheLoaiBaiDoc; chuDiem: string | null; ghiChu: string[];
}

export default function NhapKhoBaiDocPage() {
  const [tab, setTab] = useState<Tab>('FILE');
  const [vanBan, setVanBan] = useState('');
  const [dsTep, setDsTep] = useState<TepNhap[]>([]);
  const [tienDo, setTienDo] = useState('');
  const [loaiChon, setLoaiChon] = useState<LoaiBaiDoc | ''>('');
  const [kyChon, setKyChon] = useState<KyKiemTraBaiDoc | ''>('');
  const [ds, setDs] = useState<BaiDocSua[]>([]);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  const [nguonGoc, setNguonGoc] = useState<'TAI_FILE' | 'AI_TIM'>('TAI_FILE');
  const [ai, setAi] = useState<{ daCauHinh: boolean; model?: string | null; lyDo?: string } | null>(null);
  const [tieuChi, setTieuChi] = useState({ loai: 'DOC_HIEU' as LoaiBaiDoc, ky: 'CUOI_HK1' as KyKiemTraBaiDoc, chuDiem: CHU_DIEM_THEO_KY.CUOI_HK1[0] as string, theLoai: 'TRUYEN' as TheLoaiBaiDoc, soBai: 3 });
  const fileRef = useRef<HTMLInputElement>(null);
  const boNao = useBoNao();

  useEffect(() => {
    fetch('/api/reading-passages/ai-tim').then((r) => r.json()).then(setAi).catch(() => setAi({ daCauHinh: false }));
  }, []);

  const doiBai = (baiDoc: KetQuaPhanTich[], tenFile?: string): BaiDocSua[] =>
    baiDoc.map((b, i) => ({
      khoa: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`,
      chon: true,
      tieuDe: b.tieuDe, noiDung: b.noiDung, tacGia: b.tacGia, nguon: b.nguon, nguonUrl: b.nguonUrl,
      loai: b.loai, ky: b.ky, theLoai: b.theLoai, chuDiem: b.chuDiem,
      trangThaiLink: b.nguonUrl ? 'CHUA_KIEM' : undefined,
      ghiChu: b.ghiChu,
      tenFile,
    }));

  const napKetQua = (baiDoc: KetQuaPhanTich[], goc: 'TAI_FILE' | 'AI_TIM') => {
    setNguonGoc(goc);
    setDs(doiBai(baiDoc));
  };

  const suaTep = (id: string, p: Partial<TepNhap>) => setDsTep((cu) => cu.map((t) => (t.id === id ? { ...t, ...p } : t)));

  /** Nhận một hoặc nhiều file: thêm vào danh sách rồi đọc chữ từng file. File trùng tên và cỡ thì bỏ qua. */
  const themFile = async (danhSach: FileList | File[]) => {
    setThongBao(null);
    const moi = Array.from(danhSach).filter((f) => !f.name.startsWith('~$'));
    const conCho = TOI_DA_FILE - dsTep.length;
    const loc = moi.filter((f) => !dsTep.some((t) => t.ten === f.name && t.kichThuoc === f.size));
    const nhan = loc.slice(0, Math.max(0, conCho));
    const boTrung = moi.length - loc.length;
    const boThua = loc.length - nhan.length;
    if (boTrung || boThua) {
      setThongBao({ loai: 'loi', text: [boTrung ? `Bỏ qua ${boTrung} file đã có trong danh sách.` : '', boThua ? `Mỗi lần nhận tối đa ${TOI_DA_FILE} file, ${boThua} file chưa được thêm.` : ''].filter(Boolean).join(' ') });
    }
    if (!nhan.length) return;
    const tep: (TepNhap & { file: File })[] = nhan.map((f, i) => ({ id: `${Date.now()}-${i}-${f.name}`, ten: f.name, kichThuoc: f.size, trangThai: 'DANG_DOC', vanBan: '', file: f }));
    setDsTep((cu) => [...cu, ...tep.map(({ file, ...t }) => t)]);
    await Promise.all(tep.map(async (t) => {
      try {
        const chu = await docChuFile(t.file);
        if (!chu.trim()) suaTep(t.id, { trangThai: 'LOI', loi: 'File không có chữ.' });
        else suaTep(t.id, { trangThai: 'SAN_SANG', vanBan: chu });
      } catch (e) {
        suaTep(t.id, { trangThai: 'LOI', loi: e instanceof Error ? e.message : 'Không đọc được file.' });
      }
    }));
  };

  const goiPhanTich = async (chu: string): Promise<{ baiDoc: KetQuaPhanTich[]; coChuSgk: boolean }> => {
    const r = await fetch('/api/reading-passages/phan-tich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vanBan: chu, loai: loaiChon || undefined, ky: kyChon || undefined }),
    }).then((x) => x.json());
    if (r.error) throw new Error(r.error);
    return { baiDoc: r.baiDoc ?? [], coChuSgk: !!r.coChuSgk };
  };

  const tepCanPhanTich = dsTep.filter((t) => t.trangThai === 'SAN_SANG' || t.trangThai === 'XONG');
  const dangDocTep = dsTep.some((t) => t.trangThai === 'DANG_DOC');
  const soNguon = tepCanPhanTich.length + (vanBan.trim() ? 1 : 0);

  /** Phân tích lần lượt từng file (và phần chữ dán thêm), gộp kết quả, bỏ bài trùng nhau giữa các file. */
  const phanTich = async () => {
    setDangXuLy(true);
    setThongBao(null);
    const nguon = [
      ...tepCanPhanTich.map((t) => ({ id: t.id, ten: t.ten, chu: t.vanBan })),
      ...(vanBan.trim() ? [{ id: '', ten: '', chu: vanBan }] : []),
    ];
    const gop: BaiDocSua[] = [];
    const loi: string[] = [];
    let coChuSgk = true;
    let soTrung = 0;
    const daThay = new Set<string>();
    const dauVet = (b: KetQuaPhanTich) => `${b.tieuDe.trim().toLowerCase()}|${b.noiDung.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 300)}`;
    for (let i = 0; i < nguon.length; i++) {
      const n = nguon[i];
      setTienDo(nguon.length > 1 ? `Đang phân tích ${i + 1}/${nguon.length}: ${n.ten || 'chữ dán vào'}` : '');
      if (n.id) suaTep(n.id, { trangThai: 'DANG_PHAN_TICH', loi: undefined });
      try {
        const kq = await goiPhanTich(n.chu);
        if (!kq.coChuSgk) coChuSgk = false;
        const khongTrung = kq.baiDoc.filter((b) => {
          const k = dauVet(b);
          if (daThay.has(k)) { soTrung++; return false; }
          daThay.add(k);
          return true;
        });
        gop.push(...doiBai(khongTrung, n.ten || undefined));
        if (n.id) suaTep(n.id, { trangThai: 'XONG', soBai: kq.baiDoc.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        loi.push(`${n.ten || 'Chữ dán vào'}: ${msg}`);
        if (n.id) suaTep(n.id, { trangThai: 'LOI', loi: msg });
      }
    }
    setTienDo('');
    setNguonGoc('TAI_FILE');
    setDs(gop);
    const tomTat = nguon.length > 1 ? `Phân tích ${nguon.length - loi.length}/${nguon.length} nguồn, tách được ${gop.length} bài` : `Tách được ${gop.length} bài`;
    const text = [
      `${tomTat}.${soTrung ? ` Bỏ ${soTrung} bài trùng nhau giữa các file.` : ''} Xem lại từng bài, sửa chỗ máy đoán sai rồi gửi duyệt.`,
      coChuSgk ? '' : '(Kho SGK chưa có chữ bài đọc nên mới kiểm tra trùng theo tên bài.)',
      loi.length ? `Lỗi: ${loi.join('; ')}` : '',
    ].filter(Boolean).join(' ');
    setThongBao({ loai: loi.length && !gop.length ? 'loi' : 'ok', text });
    setDangXuLy(false);
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
  const soDat = daChon.filter((b) => kiemTraBaiDoc(b, [], boNao).hopLe).length;

  const guiDuyet = async () => {
    setDangXuLy(true);
    try {
      const r = await fetch('/api/reading-passages/hang-cho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baiDoc: daChon.map(({ khoa, chon, ghiChu, ...b }) => ({ ...b, nguonGoc, tenFile: b.tenFile || undefined, ghiChuAI: ghiChu?.length ? { ghiChu } : undefined })) }),
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
        <div className="the-tke p-5 space-y-4">
          <div
            className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-blue-400"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) themFile(e.dataTransfer.files); }}
          >
            <FileUp className="w-8 h-8 mx-auto text-slate-400" />
            <div className="mt-2 font-medium text-slate-800">Chọn hoặc kéo thả một hay nhiều file Word (.docx) / văn bản (.txt)</div>
            <div className="text-xs text-slate-500 mt-1">Chọn nhiều file cùng lúc bằng Ctrl + bấm chuột (tối đa {TOI_DA_FILE} file). Mỗi file có thể chứa nhiều bài; mỗi bài nên có tên bài, nội dung, dòng "(Theo …)" và dòng "(Nguồn: …)".</div>
            <input ref={fileRef} type="file" multiple accept=".docx,.txt,.md,.pdf,.doc" className="hidden" onChange={(e) => { if (e.target.files?.length) themFile(e.target.files); e.target.value = ''; }} />
          </div>
          {dsTep.length > 0 && (
            <div className="rounded-lg border border-slate-200">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 text-sm">
                <span className="font-medium text-slate-800">{dsTep.length} file đã chọn</span>
                <button type="button" className="inline-flex items-center gap-1 text-slate-600 hover:text-red-700 disabled:opacity-50" disabled={dangXuLy} onClick={() => setDsTep([])}>
                  <Trash2 className="w-4 h-4" /> Bỏ hết
                </button>
              </div>
              <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {dsTep.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                    {t.trangThai === 'DANG_DOC' || t.trangThai === 'DANG_PHAN_TICH' ? <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin text-blue-600" />
                      : t.trangThai === 'LOI' ? <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                      : t.trangThai === 'XONG' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                      : <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-slate-900">{t.ten}</div>
                      <div className={`text-xs ${t.trangThai === 'LOI' ? 'text-red-700' : 'text-slate-500'}`}>
                        {t.trangThai === 'DANG_DOC' && 'Đang đọc file…'}
                        {t.trangThai === 'SAN_SANG' && `Đã đọc ${t.vanBan.length.toLocaleString('vi-VN')} kí tự, chờ phân tích`}
                        {t.trangThai === 'DANG_PHAN_TICH' && 'Đang phân tích…'}
                        {t.trangThai === 'XONG' && `Tách được ${t.soBai ?? 0} bài`}
                        {t.trangThai === 'LOI' && t.loi}
                      </div>
                    </div>
                    <button type="button" aria-label={`Bỏ ${t.ten}`} className="p-1 text-slate-400 hover:text-red-700 disabled:opacity-50" disabled={dangXuLy} onClick={() => setDsTep((cu) => cu.filter((x) => x.id !== t.id))}>
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <textarea className={`${o} w-full min-h-40`} placeholder="…hoặc dán chữ vào đây (phân tích cùng các file ở trên)" value={vanBan} onChange={(e) => setVanBan(e.target.value)} />
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
            <button type="button" className={nutChinh} disabled={!soNguon || dangXuLy || dangDocTep} onClick={phanTich}>
              {dangXuLy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {soNguon > 1 ? `Phân tích ${soNguon} nguồn` : 'Phân tích'}
            </button>
            {tienDo && <span className="text-sm text-blue-700">{tienDo}</span>}
          </div>
        </div>
      )}

      {tab === 'AI' && (
        <div className="the-tke p-5 space-y-4">
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
              <select className={`${o} w-full`} value={tieuChi.ky} onChange={(e) => { const ky = e.target.value as KyKiemTraBaiDoc; setTieuChi({ ...tieuChi, ky, chuDiem: chuDiemCuaKy(ky, boNao)[0] }); }}>
                {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
              </select>
            </label>
            <label className="text-sm">Chủ điểm<br />
              <select className={`${o} w-full`} value={tieuChi.chuDiem} onChange={(e) => setTieuChi({ ...tieuChi, chuDiem: e.target.value })}>
                {chuDiemCuaKy(tieuChi.ky, boNao).map((c) => <option key={c} value={c}>{c}</option>)}
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
            <div key={b.khoa} className="space-y-1">
              {b.tenFile && dsTep.length > 1 && <div className="text-xs text-slate-500 inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Từ file: {b.tenFile}</div>}
              <TheBaiDoc bai={b} boNao={boNao} onDoi={(m) => setDs((cu) => cu.map((x) => (x.khoa === m.khoa ? m : x)))} />
            </div>
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
