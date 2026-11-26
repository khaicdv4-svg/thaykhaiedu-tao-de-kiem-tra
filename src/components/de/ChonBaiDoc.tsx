'use client';

/**
 * Bài đọc cho đề Tiếng Việt (bảng bai_doc_chon, mỗi người một bộ cho từng khối, kì; tự lưu).
 * - phan="docHieu" (bước 2, trên phần lập ma trận): 1 bài đọc hiểu, chọn từ kho, nhập tay hoặc tải file (.docx, .txt).
 *   Thể loại bài quyết định ma trận dùng phần Văn bản văn học hay Văn bản thông tin.
 * - phan="thanhTieng" (bước 1): 4 bài đọc thành tiếng, lấy từ kho (bài dài tự cắt đoạn đủ số tiếng) hoặc nhập tay.
 * Bước 4 tự lấy bài từ đây; câu hỏi, đáp án soạn ở bước 4. Không chọn cùng một bài cho đọc hiểu và đọc thành tiếng.
 */

import React, { useEffect, useRef, useState } from 'react';
import { BookOpenText, CheckCircle2, ChevronDown, ChevronUp, FileUp, Loader2, TriangleAlert, Wand2 } from 'lucide-react';
import { useBoNao } from '@/lib/hooks/useBoNao';
import { baiDocChonCoGi, baiDocChonRong, demTieng, phuongAnTheoTheLoai, type BaiDocChon, type BaiDocDe } from '@/core/de/tieng-viet';
import { chonBonBaiDocThanhTieng } from '@/core/reading-passages/chon-bon-bai';
import { catDoanTotNhat } from '@/core/reading-passages/cat-doan';
import { laCungBai } from '@/core/reading-passages/cung-bai';
import { docChuTuDocx } from '@/core/utils/docx-text';
import { TEN_THE_LOAI, chuDiemCuaKy, khoangDoDai, type KyKiemTraBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';

interface BaiKho {
  id: string; tieuDe: string; noiDung: string; tacGia: string; nguon: string;
  loai: 'DOC_THANH_TIENG' | 'DOC_HIEU' | null; chuDiem: string | null; theLoai: TheLoaiBaiDoc | null; trangThai: string; soTieng: number;
}
interface BaiPhanTich { tieuDe: string; noiDung: string; tacGia: string; nguon: string; nguonUrl: string; theLoai: TheLoaiBaiDoc; chuDiem?: string | null; kiemTra?: { loi: string[]; canhBao: string[]; trungSgk?: { tiLe: number; baiSgk: string | null } } }

const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white w-full';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const THE_LOAI_DOC_HIEU: TheLoaiBaiDoc[] = ['TRUYEN', 'MIEU_TA', 'THO', 'KICH', 'VAN_BAN_THONG_TIN'];

async function docFile(f: File): Promise<string> {
  const ten = f.name.toLowerCase();
  if (ten.endsWith('.docx')) return docChuTuDocx(await f.arrayBuffer());
  if (ten.endsWith('.txt') || ten.endsWith('.md')) return f.text();
  throw new Error('Chỉ nhận file Word (.docx) hoặc văn bản (.txt). File PDF hay .doc cũ thì mở bằng Word rồi lưu lại thành .docx.');
}

interface Props {
  ky: KyKiemTraBaiDoc;
  tenKy: string;
  phan: 'docHieu' | 'thanhTieng';
  /** Số thứ tự hiện trước tiêu đề (ví dụ "1."). */
  so?: string;
  /** Báo bài đọc hiểu hiện tại (để bước 2 chọn đúng phần VBVH / VBTT của ma trận). */
  onDocHieu?: (b: BaiDocDe | null) => void;
  /** Phần đọc thành tiếng: 'chonBai' (chọn 4 bài) hoặc 'cauHoi' (câu hỏi, đáp án cho từng bài, có AI tạo). */
  cheDoTT?: 'chonBai' | 'cauHoi';
}

export function ChonBaiDoc({ ky, tenKy, phan, so, onDocHieu, cheDoTT = 'chonBai' }: Props) {
  const laCauHoi = phan === 'thanhTieng' && cheDoTT === 'cauHoi';
  const [dangAI, setDangAI] = useState(false);
  const [loiAI, setLoiAI] = useState<string | null>(null);
  const boNao = useBoNao();
  const [kho, setKho] = useState<BaiKho[]>([]);
  const [bd, setBd] = useState<BaiDocChon>(baiDocChonRong());
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [luu, setLuu] = useState<'' | 'dang' | 'xong' | 'loi'>('');
  const [tuDe, setTuDe] = useState(false);
  const [mo, setMo] = useState(true);
  const [thieu, setThieu] = useState<string[]>([]);
  const [docFileDang, setDocFileDang] = useState(false);
  const [baoFile, setBaoFile] = useState<{ loi?: string; canh: string[] } | null>(null);
  const daSua = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const laDocHieu = phan === 'docHieu';

  useEffect(() => {
    let huy = false;
    setDangTai(true); setLoi(null); setThieu([]); setBaoFile(null); daSua.current = false;
    void Promise.all([
      fetch(`/api/reading-passages/da-duyet?ky=${ky}`).then((r) => r.json()).catch(() => ({ error: 'Không kết nối được Kho bài đọc.' })),
      fetch(`/api/bai-doc-chon?ky=${ky}`).then((r) => r.json()).catch(() => ({ error: 'Không kết nối được máy chủ.' })),
    ]).then(([k, c]) => {
      if (huy) return;
      setKho(k.baiDoc ?? []);
      if (c.error) setLoi(c.error);
      const co = baiDocChonCoGi(c.baiDoc);
      const bdMoi: BaiDocChon = co ? c.baiDoc : baiDocChonRong();
      setBd(bdMoi);
      setTuDe(!!c.tuDe);
      const phanCo = laDocHieu ? !!bdMoi.baiDocHieu.noiDung.trim() : bdMoi.baiDocThanhTieng.some((b) => b.noiDung.trim());
      setMo(laCauHoi || !phanCo);
      setDangTai(false);
    });
    return () => { huy = true; };
  }, [ky, laDocHieu, laCauHoi]);

  // Báo bài đọc hiểu cho trang cha
  useEffect(() => { if (!dangTai) onDocHieu?.(bd.baiDocHieu.noiDung.trim() || bd.baiDocHieu.theLoai ? bd.baiDocHieu : null); }, [bd.baiDocHieu, dangTai, onDocHieu]);

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

  // Bài đọc hiểu chưa có thể loại hoặc chủ điểm (bài kho cũ, bài dán tay): app tự nhận từ chữ của bài
  const daNhan = useRef('');
  const [dangNhan, setDangNhan] = useState(false);
  useEffect(() => {
    if (!laDocHieu || dangTai) return;
    const h = bd.baiDocHieu;
    if (!h.noiDung.trim() || (h.theLoai && h.chuDiem)) return;
    const khoa = `${ky}|${h.tieuDe}|${h.noiDung.length}`;
    if (daNhan.current === khoa) return;
    const t = window.setTimeout(async () => {
      daNhan.current = khoa;
      setDangNhan(true);
      try {
        const r = await fetch('/api/reading-passages/phan-tich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vanBan: `${h.tieuDe}\n${h.noiDung}`, loai: 'DOC_HIEU', ky }) });
        const j = (await r.json().catch(() => ({}))) as { baiDoc?: BaiPhanTich[] };
        const x = j.baiDoc?.[0];
        if (x) doi((b) => ({ ...b, baiDocHieu: { ...b.baiDocHieu, theLoai: b.baiDocHieu.theLoai ?? x.theLoai ?? null, chuDiem: b.baiDocHieu.chuDiem ?? x.chuDiem ?? null } }));
      } catch { /* không nhận được thì thầy cô chọn tay */ }
      setDangNhan(false);
    }, 800);
    return () => window.clearTimeout(t);
  }, [laDocHieu, dangTai, bd.baiDocHieu, ky]);
  const suaHieu = (p: Partial<BaiDocDe>) => doi((b) => ({ ...b, baiDocHieu: { ...b.baiDocHieu, ...p } }));
  const suaTT = (i: number, p: Partial<BaiDocDe>) => doi((b) => ({ ...b, baiDocThanhTieng: b.baiDocThanhTieng.map((x, k) => (k === i ? { ...x, ...p } : x)) }));

  const khoHieu = kho.filter((b) => b.loai === 'DOC_HIEU');
  const khoTT = kho.filter((b) => b.loai === 'DOC_THANH_TIENG');
  const kh = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN', boNao);
  const dsChuDiem = chuDiemCuaKy(ky, boNao);

  const tuKho = (b: BaiKho, noiDung = b.noiDung): BaiDocDe => ({ tieuDe: b.tieuDe, noiDung, tacGia: b.tacGia, nguon: b.nguon, khoId: b.id, theLoai: b.theLoai, chuDiem: b.chuDiem });
  const tuKhoTT = (b: BaiKho): BaiDocDe => {
    const d = kh ? catDoanTotNhat(b.noiDung, { min: kh.min, max: kh.max, dungSai: kh.dungSai }) : null;
    return { ...tuKho(b, d?.doan ?? b.noiDung), cauHoi: '', traLoi: '' };
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
        return goc ? { ...tuKho(goc, x.doan.doan), cauHoi: '', traLoi: '' } : cu;
      }),
    }));
  };

  /** Tải file bài đọc hiểu: app đọc chữ, nhận tên bài, tác giả, nguồn, thể loại; kiểm tra số tiếng và trùng SGK. */
  const taiFile = async (f: File | undefined) => {
    if (!f) return;
    setDocFileDang(true); setBaoFile(null);
    try {
      const vanBan = await docFile(f);
      const r = await fetch('/api/reading-passages/phan-tich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vanBan, loai: 'DOC_HIEU', ky }) });
      const j = (await r.json().catch(() => ({}))) as { baiDoc?: BaiPhanTich[]; error?: string };
      if (!r.ok || !j.baiDoc?.length) throw new Error(j.error ?? 'Không tách được bài đọc trong file.');
      const b = j.baiDoc[0];
      suaHieu({ tieuDe: b.tieuDe, noiDung: b.noiDung, tacGia: b.tacGia, nguon: b.nguon || (b.nguonUrl ? `Nguồn: ${b.nguonUrl}` : ''), khoId: null, theLoai: b.theLoai, chuDiem: b.chuDiem ?? null });
      const canh = [...(b.kiemTra?.loi ?? []), ...(b.kiemTra?.canhBao ?? [])];
      if (j.baiDoc.length > 1) canh.unshift(`File có ${j.baiDoc.length} bài, app lấy bài đầu tiên "${b.tieuDe}".`);
      setBaoFile({ canh });
    } catch (e) {
      setBaoFile({ loi: e instanceof Error ? e.message : String(e), canh: [] });
    }
    setDocFileDang(false);
  };

  /** AI soạn câu hỏi, đáp án cho các bài đọc thành tiếng còn trống câu hỏi (vietLai: soạn lại tất cả). */
  const taoCauHoiAI = async (vietLai = false) => {
    const chiSo = bd.baiDocThanhTieng.map((b, i) => ({ b, i })).filter(({ b }) => b.noiDung.trim() && (vietLai || !b.cauHoi?.trim()));
    if (!chiSo.length) { setLoiAI('Các bài đã có câu hỏi. Muốn soạn lại thì bấm "AI soạn lại tất cả".'); return; }
    setDangAI(true); setLoiAI(null);
    try {
      const r = await fetch('/api/bai-doc-chon/cau-hoi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baiDoc: chiSo.map(({ b }) => ({ tieuDe: b.tieuDe, noiDung: b.noiDung })) }) });
      const j = (await r.json().catch(() => ({}))) as { cauHoi?: { cauHoi: string; traLoi: string }[]; error?: string };
      if (!r.ok || !j.cauHoi) throw new Error(j.error ?? `Lỗi ${r.status}`);
      doi((b) => ({ ...b, baiDocThanhTieng: b.baiDocThanhTieng.map((x, i) => {
        const k = chiSo.findIndex((c) => c.i === i);
        const c = k >= 0 ? j.cauHoi![k] : null;
        return c && c.cauHoi ? { ...x, cauHoi: c.cauHoi, traLoi: c.traLoi } : x;
      }) }));
    } catch (e) {
      setLoiAI(`AI chưa tạo được câu hỏi: ${e instanceof Error ? e.message : String(e)}`);
    }
    setDangAI(false);
  };

  const hieu = bd.baiDocHieu;
  const trung = bd.baiDocThanhTieng.some((b) => (b.tieuDe.trim() || b.khoId) && (hieu.tieuDe.trim() || hieu.khoId)
    && laCungBai({ id: b.khoId ?? undefined, tieuDe: b.tieuDe }, { id: hieu.khoId ?? undefined, tieuDe: hieu.tieuDe }));
  const soXong = laDocHieu
    ? (hieu.tieuDe.trim() && hieu.noiDung.trim() ? 1 : 0)
    : laCauHoi
      ? bd.baiDocThanhTieng.filter((b) => b.cauHoi?.trim() && b.traLoi?.trim()).length
      : bd.baiDocThanhTieng.filter((b) => b.tieuDe.trim() && b.noiDung.trim()).length;
  const soCan = laDocHieu ? 1 : 4;
  const pa = phuongAnTheoTheLoai(hieu.theLoai);

  const nhanTieng = (n: number) => {
    if (!kh) return `${n} tiếng`;
    const ok = n >= kh.min - kh.dungSai && n <= kh.max + kh.dungSai;
    return <span className={ok ? 'text-emerald-700' : n ? 'text-red-700' : 'text-slate-500'}>{n} tiếng (quy định {kh.min}–{kh.max}, ±{kh.dungSai})</span>;
  };
  const chonTuKho = (ds: BaiKho[], onChon: (b: BaiKho) => void, nhan: string) => (
    <select aria-label={nhan} className={`${o} sm:w-72`} value="" onChange={(e) => { const b = ds.find((x) => x.id === e.target.value); if (b) onChon(b); }}>
      <option value="">{ds.length ? 'Chọn từ Kho bài đọc…' : 'Kho chưa có bài đã duyệt cho kì này'}</option>
      {ds.map((b) => <option key={b.id} value={b.id}>{b.tieuDe} ({b.soTieng} tiếng{b.theLoai ? `, ${TEN_THE_LOAI[b.theLoai].toLowerCase()}` : ''}{b.chuDiem ? `, ${b.chuDiem}` : ''})</option>)}
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

  const tieuDe = laDocHieu ? 'Bài đọc hiểu' : laCauHoi ? 'Câu hỏi đọc thành tiếng' : 'Bài đọc thành tiếng';
  return (
    <div className={`the-tke p-6 space-y-4 ${laDocHieu && !soXong && !dangTai ? 'border-2 border-blue-500' : ''}`}>
      <button type="button" className="w-full flex flex-wrap items-center justify-between gap-2 text-left" onClick={() => setMo((x) => !x)} aria-expanded={mo}>
        <span className="font-semibold text-slate-900 flex items-center gap-2"><BookOpenText className="w-5 h-5 text-blue-600" /> {so ? `${so} ` : ''}{tieuDe} – {tenKy}
          {laDocHieu && soXong > 0 && <span className="font-normal text-slate-600">: <b className="text-slate-900">{hieu.tieuDe}</b>{hieu.chuDiem ? ` · chủ điểm ${hieu.chuDiem}` : ''}{hieu.theLoai ? ` · ${TEN_THE_LOAI[hieu.theLoai].toLowerCase()}` : ''}{dangNhan ? ' · đang nhận thể loại…' : ''}</span>}
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          {dangTai ? <Loader2 className="w-4 h-4 animate-spin" /> : soXong === soCan && !trung ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : null}
          {dangTai ? 'Đang tải…' : laDocHieu ? (soXong ? 'Đã có bài' : 'Chưa có bài') : laCauHoi ? `Đã có câu hỏi ${soXong}/4 bài` : `Đã có ${soXong}/4 bài`}
          {luu === 'dang' && ' · đang lưu…'}{luu === 'xong' && ' · đã lưu'}{luu === 'loi' && <span className="text-red-700"> · chưa lưu được</span>}
          {mo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {mo && !dangTai && (
        <div className="space-y-4">
          {laDocHieu
            ? <p className="text-sm text-slate-600">Chọn bài từ Kho bài đọc, tải file (.docx, .txt) hoặc dán chữ vào ô Nội dung. Thể loại bài quyết định phần đọc hiểu của ma trận bên dưới: truyện, miêu tả, thơ, kịch dùng phần Văn bản văn học; văn bản thông tin dùng phần Văn bản thông tin. App tự lưu.</p>
            : <p className="text-sm text-slate-600">4 bài đọc thành tiếng{dsChuDiem.length ? ` (chủ điểm: ${dsChuDiem.join('; ')})` : ''}. App tự lưu. Chọn xong sang mục Câu hỏi để soạn câu hỏi cho từng bài (có AI tạo giúp). Bài đọc hiểu chọn ở Phần 1.</p>}
          {tuDe && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Đây là bài đọc trong đề đang soạn. Sửa ở đây thì đề ở bước 4 đổi theo.</div>}
          {loi && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{loi}</div>}
          {trung && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2"><TriangleAlert className="w-4 h-4" /> Bài đọc thành tiếng đang trùng bài đọc hiểu. Thầy cô chọn bài khác.</div>}

          {laCauHoi ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="nut-tke text-sm" disabled={dangAI || !bd.baiDocThanhTieng.some((b) => b.noiDung.trim())} onClick={() => void taoCauHoiAI()}>
                  {dangAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {dangAI ? 'AI đang soạn câu hỏi…' : 'AI tạo câu hỏi cho bài còn trống'}
                </button>
                <button type="button" className={nutPhu} disabled={dangAI} onClick={() => void taoCauHoiAI(true)}>AI soạn lại tất cả</button>
                <span className="text-xs text-slate-500">AI chỉ gợi ý; thầy cô sửa trực tiếp trong ô. App tự lưu.</span>
              </div>
              {loiAI && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{loiAI}</div>}
              {!bd.baiDocThanhTieng.some((b) => b.noiDung.trim()) && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Chưa có bài đọc thành tiếng. Chọn bài ở mục "Chọn bài" trước.</div>}
              {bd.baiDocThanhTieng.map((b, i) => (
                <div key={i} className="border-t border-slate-100 pt-3 space-y-2 first:border-0 first:pt-0">
                  <details>
                    <summary className="cursor-pointer text-sm"><b>Bài {i + 1}: {b.tieuDe || '(chưa chọn bài)'}</b> · {nhanTieng(demTieng(b.noiDung))}</summary>
                    <p className="mt-1 whitespace-pre-line text-slate-800" style={{ fontFamily: "'Times New Roman', serif", fontSize: '13pt' }}>{b.noiDung}</p>
                  </details>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-xs text-slate-500">Câu hỏi (hỏi chi tiết có trong đoạn)
                      <input aria-label={`Câu hỏi bài đọc ${i + 1}`} className={`${o} mt-0.5 ${b.cauHoi?.trim() ? '' : 'border-amber-400 bg-amber-50'}`} value={b.cauHoi ?? ''} onChange={(e) => suaTT(i, { cauHoi: e.target.value })} />
                    </label>
                    <label className="text-xs text-slate-500">Đáp án
                      <input aria-label={`Đáp án bài đọc ${i + 1}`} className={`${o} mt-0.5 ${b.traLoi?.trim() ? '' : 'border-amber-400 bg-amber-50'}`} value={b.traLoi ?? ''} onChange={(e) => suaTT(i, { traLoi: e.target.value })} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ) : laDocHieu ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {chonTuKho(khoHieu, (b) => { suaHieu(tuKho(b)); setBaoFile(null); }, 'Chọn bài đọc hiểu từ kho')}
                <input ref={fileRef} type="file" accept=".docx,.txt,.md" className="hidden" onChange={(e) => { void taiFile(e.target.files?.[0]); e.target.value = ''; }} />
                <button type="button" className={nutPhu} disabled={docFileDang} onClick={() => fileRef.current?.click()}>
                  {docFileDang ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Tải file bài đọc
                </button>
              </div>
              {baoFile?.loi && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{baoFile.loi}</div>}
              {baoFile && baoFile.canh.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{baoFile.canh.map((c, i) => <p key={i}>{c}</p>)}</div>}
              {oBai(hieu, suaHieu, 'bài đọc hiểu', 10, `${demTieng(hieu.noiDung)} tiếng`)}
              <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">Thể loại
                <select aria-label="Thể loại bài đọc hiểu" className={`${o} w-auto ${hieu.theLoai ? '' : 'border-amber-400 bg-amber-50'}`} value={hieu.theLoai ?? ''} onChange={(e) => suaHieu({ theLoai: (e.target.value || null) as TheLoaiBaiDoc | null })}>
                  <option value="">– Chọn thể loại –</option>
                  {THE_LOAI_DOC_HIEU.map((t) => <option key={t} value={t}>{TEN_THE_LOAI[t]}</option>)}
                </select>
                {pa && <span className="text-slate-600">→ ma trận dùng phần <b>{pa === 'VBTT' ? 'Văn bản thông tin' : 'Văn bản văn học'}</b></span>}
              </label>
              <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">Chủ điểm
                <input aria-label="Chủ điểm bài đọc hiểu" list="ds-chu-diem" className={`${o} w-72`} value={hieu.chuDiem ?? ''} onChange={(e) => suaHieu({ chuDiem: e.target.value || null })} />
                <datalist id="ds-chu-diem">{dsChuDiem.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
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
          )}
        </div>
      )}
    </div>
  );
}
