'use client';

/**
 * Bước 1 – Thiết lập: chọn môn và kì kiểm tra, xem bộ của mình (ma trận riêng, đặc tả, đề) đã xong tới đâu,
 * rồi chọn: tiếp tục phần đang làm dở, hoặc tạo mới theo ma trận chung hiện tại của tổ (bộ cũ được cất vào lịch sử).
 * Chọn luôn cách lập ma trận riêng (ma trận chung của tổ / dựng từ chương trình) để bước 2 mở thẳng trang lập ma trận.
 * Khung Lịch sử: xem mọi bản ma trận riêng, đặc tả của mình và xóa bản không cần.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpenText, CheckCircle2, CircleDashed, FilePlus2, Loader2, TriangleAlert } from 'lucide-react';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import { docCachLap, docHoSoDe, luuCachLap, luuHoSoDe, type CachLap } from '@/core/ho-so-de/ho-so-de';
import { LichSuBan } from '@/components/ho-so-de/LichSuBan';

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white';
const nutChinh = 'nut-tke text-base px-6 py-3';

interface Ban { phienBan?: number | null; trangThai?: string; phienBanMaTranRieng?: number }
interface TrangThaiBuoc { mtr: { moiNhat: Ban | null; banNhap: Ban | null } | null; dt: { moiNhat: Ban | null; banNhap: Ban | null } | null; de: { trangThai: string; phienBanDacTa?: number } | null; loi?: string }

const TEN_TT_DE: Record<string, string> = {
  BAN_NHAP: 'bản nháp', CAN_KIEM_TRA: 'cần kiểm tra', CO_LOI: 'còn lỗi', SAN_SANG_DUYET: 'sẵn sàng duyệt',
  CAN_KIEM_TRA_LAI: 'cần kiểm tra lại', DA_DUYET: 'đã duyệt', TRA_LAI: 'bị trả lại',
};

async function lay<T>(url: string): Promise<T | null> {
  try { const r = await fetch(url); const j = await r.json(); return r.ok ? (j as T) : null; } catch { return null; }
}

export default function TestBuilderPage() {
  const [maMon, setMaMon] = useState('TOAN');
  const [ky, setKy] = useState<KyDung>('CUOI_HK1');
  const [tt, setTt] = useState<TrangThaiBuoc | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [daDocHoSo, setDaDocHoSo] = useState(false);
  const [dangTaoMoi, setDangTaoMoi] = useState(false);
  const [loiTaoMoi, setLoiTaoMoi] = useState<string | null>(null);
  const [cachLap, setCachLap] = useState<CachLap>('MA_TRAN_CHUNG');
  // Tăng lên để đọc lại trạng thái các bước (sau khi xóa bản)
  const [lanDoc, setLanDoc] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const h = docHoSoDe();
    if (h) { setMaMon(h.mon); setKy(h.ky); }
    setDaDocHoSo(true);
  }, []);

  // Chọn môn, kì ở đây là chọn hồ sơ đề cho cả 5 bước
  useEffect(() => { if (daDocHoSo) luuHoSoDe({ mon: maMon, ky }); }, [daDocHoSo, maMon, ky]);
  // Cách lập nhớ theo từng môn, kì
  useEffect(() => { if (daDocHoSo) setCachLap(docCachLap(maMon, ky)); }, [daDocHoSo, maMon, ky]);
  const chonCachLap = (c: CachLap) => { setCachLap(c); luuCachLap(maMon, ky, c); };

  useEffect(() => {
    let huy = false;
    setDangTai(true); setTt(null);
    void Promise.all([
      lay<{ moiNhat: Ban | null; banNhap: Ban | null }>(`/api/ma-tran-rieng?mon=${maMon}&ky=${ky}`),
      lay<{ moiNhat: Ban | null; banNhap: Ban | null }>(`/api/dac-ta?mon=${maMon}&ky=${ky}`),
      lay<{ de: { trangThai: string; phienBanDacTa?: number } | null }>(`/api/de-kiem-tra?mon=${maMon}&ky=${ky}`),
    ]).then(([mtr, dt, de]) => {
      if (huy) return;
      setTt({ mtr, dt, de: de?.de ?? null, loi: !mtr && !dt && !de ? 'Chưa đọc được trạng thái. Thầy đăng nhập lại hoặc thử lại sau.' : undefined });
      setDangTai(false);
    });
    return () => { huy = true; };
  }, [maMon, ky, lanDoc]);

  const tenMon = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon)?.mon ?? maMon;
  const tenKy = DANH_SACH_KY.find((k) => k.ma === ky)?.ten ?? ky;
  const q = `mon=${maMon}&ky=${ky}`;

  const buoc = useMemo(() => {
    const mtr = tt?.mtr?.moiNhat ?? null;
    const dt = tt?.dt?.moiNhat ?? null;
    const de = tt?.de ?? null;
    // Bước sau đang theo bản cũ của bước trước thì báo rõ, không coi là xong
    const dtCu = !!mtr && !!dt && (dt.phienBanMaTranRieng ?? 0) < (mtr.phienBan ?? 0);
    const deCu = !!dt && !!de && (de.phienBanDacTa ?? 0) < (dt.phienBan ?? 0);
    return [
      {
        so: 2, ten: 'Ma trận riêng', xong: !!mtr,
        nhan: mtr ? `Đang dùng phiên bản ${mtr.phienBan ?? 1}` : tt?.mtr?.banNhap ? 'Có bản nháp, chưa lưu xong' : 'Chưa làm',
        href: `/matrices?${q}`, viec: mtr ? 'Xem, sửa ma trận' : 'Làm ma trận',
      },
      {
        so: 3, ten: 'Bản đặc tả', xong: !!dt && !dtCu, canhBao: dtCu,
        nhan: !mtr ? 'Cần ma trận trước' : dtCu ? `Đang theo ma trận cũ (phiên bản ${dt?.phienBanMaTranRieng}). Mở để cập nhật theo ma trận mới.` : dt ? `Đang dùng phiên bản ${dt.phienBan ?? 1}` : tt?.dt?.banNhap ? 'Có bản nháp, chưa lưu xong' : 'Chưa làm',
        href: `/dac-ta?${q}`, viec: dt ? 'Xem, sửa đặc tả' : 'Làm đặc tả', khoa: !mtr,
      },
      {
        so: 4, ten: 'Soạn đề', xong: !!de && !deCu && de.trangThai === 'DA_DUYET', canhBao: deCu,
        nhan: !dt ? 'Cần đặc tả trước' : deCu ? `Đề đang theo đặc tả cũ (phiên bản ${de?.phienBanDacTa}). Mở để chuyển sang đặc tả mới; câu đổi yêu cầu sẽ phải soạn lại.` : de ? `Đề ${TEN_TT_DE[de.trangThai] ?? de.trangThai}` : 'Chưa soạn',
        href: `/tao-de?${q}`, viec: de ? 'Mở đề' : 'Soạn đề', khoa: !dt,
      },
    ];
  }, [tt, q]);

  // Bước đang dở: bước đầu tiên chưa xong (hoặc đang theo bản cũ); xong hết thì mở đề
  const dangDo = buoc.find((b) => !b.xong && !('khoa' in b && b.khoa)) ?? buoc[buoc.length - 1];
  const daCoGi = !!(tt?.mtr?.moiNhat || tt?.mtr?.banNhap || tt?.dt?.moiNhat || tt?.dt?.banNhap || tt?.de);

  /** Tạo mới: cất bộ của mình (ma trận riêng, đặc tả) vào lịch sử rồi lập lại từ ma trận chung hiện tại. */
  const taoMoi = async () => {
    if (daCoGi && !window.confirm(`Tạo mới ${tenMon}, ${tenKy} theo ma trận chung hiện tại của tổ?\n\nMa trận riêng, đặc tả đang có được cất vào lịch sử (không xóa). Đề sẽ soạn lại từ đầu; đề đã duyệt vẫn giữ trong kho đề.`)) return;
    setDangTaoMoi(true);
    setLoiTaoMoi(null);
    try {
      const r = await fetch('/api/ho-so-de/bat-dau-lai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon: maMon, ky }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? `Lỗi ${r.status}`);
      // Bản nháp cũ còn lưu trên máy cũng bỏ, để bước 2 bắt đầu sạch
      try {
        for (const k of Object.keys(window.localStorage)) if (k.startsWith(`thaykhaiedu.maTranRieng.${maMon}.${ky}`)) window.localStorage.removeItem(k);
      } catch { /* không có localStorage */ }
      router.push(`/matrices?${q}`);
    } catch (e) {
      setLoiTaoMoi(e instanceof Error ? e.message : String(e));
      setDangTaoMoi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      <TienTrinh5Buoc buocHienTai={1} choBam />

      <div className="the-tke p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bước 1. Thiết lập đề kiểm tra</h1>
          <p className="text-sm text-slate-600 mt-1">Chọn môn và kì kiểm tra của Lớp 4. Mỗi thầy cô có bộ riêng, đi lần lượt: <b>Ma trận riêng</b> (chọn từ ma trận chung của tổ) <b>→ Đặc tả → Soạn đề → Duyệt</b>. Bấm Lưu ở mỗi bước là dùng ngay; bước sau tự đổi theo bước trước.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label="Môn" className={`${o} min-w-44`} value={maMon} onChange={(e) => setMaMon(e.target.value)}>
            {MAU_MA_TRAN_CHUNG.map((m) => <option key={m.ma_mon} value={m.ma_mon}>{m.mon}</option>)}
          </select>
          <select aria-label="Kì kiểm tra" className={`${o} min-w-44`} value={ky} onChange={(e) => setKy(e.target.value as KyDung)}>
            {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
          </select>
          <span className="text-sm text-slate-500">Lớp 4 · {tenMon} · {tenKy}</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900 mb-1">Lập ma trận riêng từ</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ['MA_TRAN_CHUNG', 'Ma trận chung của tổ', 'Tổ đã có ma trận chung. Lập ma trận riêng từ đó.'],
              ['CHUONG_TRINH', 'Dựng từ chương trình', 'Tổ chưa có ma trận chung. Dựng khung từ phân phối chương trình và YCCĐ đã duyệt.'],
            ] as const).map(([k, ten, mt]) => (
              <button key={k} type="button" aria-pressed={cachLap === k} onClick={() => chonCachLap(k)} className={`text-left rounded-lg border p-3 ${cachLap === k ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                <div className={`text-sm font-semibold ${cachLap === k ? 'text-blue-800' : 'text-slate-800'}`}>{cachLap === k ? '● ' : '○ '}{ten}</div>
                <div className="text-xs text-slate-600 mt-0.5">{mt}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="the-tke p-6 space-y-3">
        <h2 className="font-semibold text-slate-900">Bộ đề của thầy cô: {tenMon}, {tenKy}</h2>
        {dangTai && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang đọc trạng thái…</div>}
        {tt?.loi && <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><TriangleAlert className="w-4 h-4 mt-0.5" />{tt.loi}</div>}
        {tt && !tt.loi && (
          <ul className="divide-y divide-slate-100">
            {buoc.map((b) => (
              <li key={b.so} className="py-3 flex flex-wrap items-center gap-3">
                {'canhBao' in b && b.canhBao
                  ? <TriangleAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  : b.xong ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <CircleDashed className="w-5 h-5 text-slate-400 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">Bước {b.so}. {b.ten}</div>
                  <div className={`text-xs ${'canhBao' in b && b.canhBao ? 'text-amber-800' : 'text-slate-500'}`}>{b.nhan}</div>
                </div>
                {'khoa' in b && b.khoa
                  ? <span className="text-xs text-slate-400">Chưa mở</span>
                  : <Link href={b.href} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">{b.viec}</Link>}
              </li>
            ))}
          </ul>
        )}
        {tt && !tt.loi && (
          <div className="pt-2 grid gap-3 sm:grid-cols-2">
            {daCoGi ? (
              <Link href={dangDo.href} className="rounded-xl border-2 border-indigo-600 bg-indigo-600 p-4 text-white hover:bg-indigo-700">
                <div className="flex items-center gap-2 text-base font-semibold"><ArrowRight className="w-5 h-5" /> Tiếp tục bản đang làm</div>
                <div className="text-sm text-indigo-100 mt-1">Mở Bước {dangDo.so}. {dangDo.ten}. Bước nào đổi theo ma trận mới, app tự cập nhật và báo chỗ cần làm lại.</div>
              </Link>
            ) : (
              <Link href={`/matrices?${q}`} className="rounded-xl border-2 border-indigo-600 bg-indigo-600 p-4 text-white hover:bg-indigo-700">
                <div className="flex items-center gap-2 text-base font-semibold"><ArrowRight className="w-5 h-5" /> Bắt đầu: Bước 2. Ma trận riêng</div>
                <div className="text-sm text-indigo-100 mt-1">Lập ma trận riêng của thầy cô từ ma trận chung của tổ.</div>
              </Link>
            )}
            {daCoGi && (
              <button type="button" disabled={dangTaoMoi} onClick={() => void taoMoi()} className="text-left rounded-xl border-2 border-slate-300 bg-white p-4 hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60">
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  {dangTaoMoi ? <Loader2 className="w-5 h-5 animate-spin" /> : <FilePlus2 className="w-5 h-5 text-indigo-600" />} Tạo mới theo ma trận chung hiện tại
                </div>
                <div className="text-sm text-slate-600 mt-1">Làm lại từ đầu, không mang nội dung cũ. Bản cũ được cất vào lịch sử, đề đã duyệt vẫn giữ.</div>
              </button>
            )}
            {loiTaoMoi && <div className="sm:col-span-2 text-sm text-red-700">Chưa tạo mới được: {loiTaoMoi}</div>}
          </div>
        )}
      </div>

      {daDocHoSo && <LichSuBan maMon={maMon} ky={ky} tenMonKy={`${tenMon}, ${tenKy}`} onDaXoa={() => setLanDoc((x) => x + 1)} />}

      {maMon === 'TIENG_VIET' && (
        <div className="the-tke p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-2"><BookOpenText className="w-5 h-5 text-blue-600" /> Bài đọc cho đề Tiếng Việt</div>
            <p className="text-sm text-slate-600">Chọn bài đọc thành tiếng và đọc hiểu đã duyệt, đúng chủ đề và số tiếng.</p>
          </div>
          <Link href="/test-builder/bai-doc" className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Chọn bài đọc</Link>
        </div>
      )}

      <p className="text-xs text-slate-500">Muốn sửa đề đã duyệt hoặc xem các phiên bản cũ, thầy vào <Link href="/tests" className="text-blue-700 underline">Bước 5: Duyệt đề &amp; kho đề</Link>.</p>
    </div>
  );
}
