'use client';

/**
 * Bản đặc tả (MOD-03) – bước 3 của quy trình tạo đề.
 * Tạo đặc tả → Xem trước → Kiểm tra → Chỉnh sửa → Xác nhận → Tạo đề.
 * Đặc tả kế thừa phiên bản ma trận riêng ĐÃ XÁC NHẬN: mức, hình thức, điểm, YCCĐ lấy từ ma trận (không sửa ở đây).
 * Thầy điền bài học, tuần, trang SGK cho từng câu. Ứng dụng không tự đoán: chỉ gợi ý khi khớp Kho chương trình.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, ListChecks, Loader2, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY, khoangTuanTheoKy, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import {
  dienLaiTuPpct,
  dungLaiDacTa,
  kiemDinhDacTa,
  minhChungTuBai,
  taoDacTa,
  taoGoiYTheoYccd,
  trangThaiDacTaSauKhiSua,
  trangThaiDacTaSauKiemDinh,
  xepDongTheoCau,
  type DacTa,
  type DongDacTa,
  type KetQuaKiemDinhDacTa,
  type KieuHinhKem,
  TEN_KIEU_HINH,
  type MinhChungCau,
  type MucLucSgk,
  type TrangThaiDacTa,
} from '@/core/dac-ta/dac-ta';
import type { MaTranChung, MaTranRieng } from '@/types/matrix-template';

interface BanMaTranRieng { id: string; phienBan: number | null; xacNhanLuc: string | null; duLieu: { ma_tran_chung: MaTranChung; ma_tran_rieng: MaTranRieng } }
interface BanDacTaApi { id: string; phienBan: number | null; trangThai: TrangThaiDacTa; maTranRiengId: string; phienBanMaTranRieng: number; duLieu: DacTa }
interface Tiet { thuTu: number; tuan: number | null; hocKi: number | null; chuDe: string | null; baiTen: string | null }
interface Yccd { noiDung: string; bai: string | null }

const NHAN_TRANG_THAI: Record<TrangThaiDacTa, { ten: string; mau: string }> = {
  BAN_NHAP: { ten: 'Bản nháp', mau: 'bg-slate-100 text-slate-700 border-slate-200' },
  CAN_KIEM_TRA: { ten: 'Chờ xác nhận', mau: 'bg-blue-50 text-blue-700 border-blue-200' },
  CO_LOI: { ten: 'Có lỗi cần sửa', mau: 'bg-red-50 text-red-700 border-red-200' },
  DA_XAC_NHAN: { ten: 'Đã xác nhận', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CAN_XAC_NHAN_LAI: { ten: 'Cần xác nhận lại', mau: 'bg-amber-50 text-amber-800 border-amber-200' },
};

const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white w-full';
const fmtDiem = (x: number) => String(x).replace('.', ',');
const TEN_MUC = ['', 'Mức 1', 'Mức 2', 'Mức 3'];
const TEN_DANG: Record<string, string> = { NLC: 'Nhiều lựa chọn', DS: 'Đúng/Sai', TLN: 'Trả lời ngắn', NOI: 'Nối', DIEN: 'Điền', VIET: 'Viết' };
const LOP = 4;

async function goiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; j: T & { error?: string } }> {
  try {
    const r = await fetch(url, init);
    return { ok: r.ok, status: r.status, j: (await r.json().catch(() => ({}))) as T & { error?: string } };
  } catch {
    return { ok: false, status: 0, j: { error: 'Không kết nối được hệ thống.' } as T & { error?: string } };
  }
}

export default function DacTaPage() {
  const [maMon, setMaMon] = useState('TOAN');
  const [ky, setKy] = useState<KyDung>('CUOI_HK1');
  const [dangTai, setDangTai] = useState(false);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [mtrBan, setMtrBan] = useState<BanMaTranRieng | null>(null); // phiên bản ma trận riêng đã xác nhận mới nhất
  const [dacTa, setDacTa] = useState<DacTa | null>(null);
  const [daLuuId, setDaLuuId] = useState<string | null>(null); // đặc tả (bản nháp hoặc bản xác nhận) đã đọc từ hệ thống
  const [phienBanXacNhan, setPhienBanXacNhan] = useState<number | null>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiDacTa>('BAN_NHAP');
  const [ketQua, setKetQua] = useState<KetQuaKiemDinhDacTa | null>(null);
  const [cheDo, setCheDo] = useState<'sua' | 'xem'>('sua');
  const [daXemTruoc, setDaXemTruoc] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [tiet, setTiet] = useState<Tiet[]>([]);
  const [mucLuc, setMucLuc] = useState<MucLucSgk[]>([]);
  const [yccdKho, setYccdKho] = useState<Yccd[]>([]);
  const [baiCu, setBaiCu] = useState<DacTa | null>(null); // đặc tả cũ khi ma trận đã có phiên bản mới hơn

  // Đọc ?mon=&ky= từ địa chỉ (trang ma trận dẫn sang)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('mon');
    const k = p.get('ky');
    if (m && MAU_MA_TRAN_CHUNG.some((x) => x.ma_mon === m)) setMaMon(m);
    if (k && DANH_SACH_KY.some((x) => x.ma === k)) setKy(k as KyDung);
  }, []);

  const tuanKiemTra = useMemo(() => (tiet.length ? khoangTuanTheoKy(tiet, ky).tuanDen : null), [tiet, ky]);
  const goiY = useMemo(() => taoGoiYTheoYccd(yccdKho, tiet), [yccdKho, tiet]);
  const dsBaiPpct = useMemo(() => [...new Set(tiet.map((t) => t.baiTen?.replace(/\s+/g, ' ').trim()).filter((b): b is string => !!b))], [tiet]);

  const nap = useCallback(async () => {
    setDangTai(true);
    setLoiTai(null);
    setThongBao(null);
    setKetQua(null);
    setDaXemTruoc(false);
    setCheDo('sua');
    setBaiCu(null);
    setDacTa(null);
    setMtrBan(null);

    const [mtr, dt, pp, yc, ml] = await Promise.all([
      goiJson<{ moiNhat: BanMaTranRieng | null }>(`/api/ma-tran-rieng?mon=${maMon}&ky=${ky}`),
      goiJson<{ banNhap: BanDacTaApi | null; moiNhat: BanDacTaApi | null }>(`/api/dac-ta?mon=${maMon}&ky=${ky}`),
      goiJson<{ tiet: Tiet[] }>(`/api/chuong-trinh/ppct?mon=${maMon}&lop=${LOP}`),
      goiJson<{ yccd: Yccd[] }>(`/api/chuong-trinh/yccd?mon=${maMon}&lop=${LOP}&trangThai=DA_DUYET`),
      goiJson<{ mucLuc: MucLucSgk[] }>(`/api/chuong-trinh/sgk-muc-luc?mon=${maMon}&lop=${LOP}`),
    ]);
    setTiet(pp.ok ? pp.j.tiet ?? [] : []);
    setMucLuc(ml.ok ? ml.j.mucLuc ?? [] : []);
    setYccdKho(yc.ok ? yc.j.yccd ?? [] : []);
    if (!mtr.ok) { setLoiTai(mtr.j.error ?? 'Không đọc được ma trận riêng.'); setDangTai(false); return; }
    const moiNhat = mtr.j.moiNhat;
    setMtrBan(moiNhat);
    if (!moiNhat) { setDangTai(false); return; }
    if (!dt.ok) { setLoiTai(dt.j.error ?? 'Không đọc được bản đặc tả.'); setDangTai(false); return; }

    setPhienBanXacNhan(dt.j.moiNhat?.phienBan ?? null);
    const nhap = dt.j.banNhap;
    if (nhap) {
      setDaLuuId(nhap.id);
      setTrangThai(nhap.trangThai);
      if (nhap.phienBanMaTranRieng < (moiNhat.phienBan ?? 0)) {
        setBaiCu(nhap.duLieu); // đặc tả theo phiên bản ma trận cũ
        setDacTa(nhap.duLieu);
        setTrangThai('CAN_XAC_NHAN_LAI');
      } else setDacTa(nhap.duLieu);
    } else {
      setDaLuuId(null);
      setTrangThai('BAN_NHAP');
    }
    setDangTai(false);
  }, [maMon, ky]);

  useEffect(() => { void nap(); }, [nap]);

  const taoMoi = () => {
    if (!mtrBan) return;
    const { ma_tran_chung: mtc, ma_tran_rieng: mtr } = mtrBan.duLieu;
    setDacTa(dienLaiTuPpct(taoDacTa(mtc, mtr, mtrBan.phienBan ?? 1, { tuanKiemTra, goiYTheoYccd: goiY, tiet }), goiY, tiet, mucLuc).dacTa);
    setTrangThai('BAN_NHAP');
    setKetQua(null);
    setDaXemTruoc(false);
    setThongBao('Đã tạo đặc tả từ ma trận riêng. Điền bài học, tuần, trang SGK cho từng câu. Ô có gợi ý từ Kho chương trình thầy xem lại cho đúng.');
  };

  const dungLai = () => {
    if (!mtrBan || !baiCu) return;
    const { ma_tran_chung: mtc, ma_tran_rieng: mtr } = mtrBan.duLieu;
    const kq = dungLaiDacTa(mtc, mtr, mtrBan.phienBan ?? 1, baiCu);
    setDacTa(kq.dacTa);
    setBaiCu(null);
    setTrangThai('CAN_XAC_NHAN_LAI');
    setKetQua(null);
    setDaXemTruoc(false);
    setThongBao(`Đã dựng lại theo ma trận phiên bản ${mtrBan.phienBan}, giữ phần thầy đã điền.${kq.moi.length ? ` Câu mới cần điền: ${kq.moi.join('; ')}.` : ''}${kq.bo.length ? ` Câu không còn trong ma trận: ${kq.bo.join('; ')}.` : ''}`);
  };

  const sua = (fn: (d: DacTa) => DacTa) => {
    setDacTa((d) => (d ? fn(d) : d));
    setTrangThai((t) => trangThaiDacTaSauKhiSua(t));
    setKetQua(null);
    setDaXemTruoc(false);
  };
  // Chọn đúng một bài trong PPCT thì tự điền tuần, trang SGK vào ô còn trống (không ghi đè ô thầy đã điền)
  const chonBai = (r: DongDacTa, giaTri: string) => {
    const g = minhChungTuBai(giaTri, tiet, mucLuc);
    suaDong(r.khoa, g ? { baiHoc: g.baiHoc, ...(r.tuan === null && g.tuan !== undefined ? { tuan: g.tuan } : {}), ...(!r.trangSgk.trim() && g.trangSgk ? { trangSgk: g.trangSgk } : {}) } : { baiHoc: giaTri });
  };
  const suaDong = (khoa: string, p: Partial<MinhChungCau>) => sua((d) => ({ ...d, dong: d.dong.map((r) => (r.khoa === khoa ? { ...r, ...p } : r)) }));

  const kiemTra = (): KetQuaKiemDinhDacTa | null => {
    if (!mtrBan || !dacTa) return null;
    const { ma_tran_chung: mtc, ma_tran_rieng: mtr } = mtrBan.duLieu;
    const kq = kiemDinhDacTa(mtc, mtr, dacTa, { phienBanMaTranRiengMoiNhat: mtrBan.phienBan ?? undefined });
    setKetQua(kq);
    setTrangThai((t) => trangThaiDacTaSauKiemDinh(t, kq));
    return kq;
  };

  const gui = async (hanhDong: 'LUU_NHAP' | 'XAC_NHAN') => {
    if (!mtrBan || !dacTa) return;
    setDangGui(true);
    const r = await goiJson<{ ban?: BanDacTaApi; taoPhienBanMoi?: boolean }>('/api/dac-ta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanhDong, mon: maMon, ky, maTranRiengId: mtrBan.id, dacTa, trangThai }),
    });
    setDangGui(false);
    if (!r.ok) { setThongBao(r.status === 403 ? `Chưa lưu được: ${r.j.error ?? 'tài khoản này chỉ được xem.'}` : `Chưa ${hanhDong === 'XAC_NHAN' ? 'xác nhận' : 'lưu'} được: ${r.j.error}`); return; }
    if (hanhDong === 'LUU_NHAP') { setThongBao('Đã lưu bản nháp đặc tả lên hệ thống. Cả tổ cùng thấy bản này.'); return; }
    setTrangThai('DA_XAC_NHAN');
    setPhienBanXacNhan(r.j.ban?.phienBan ?? null);
    setThongBao(r.j.taoPhienBanMoi === false ? `Nội dung không đổi so với phiên bản ${r.j.ban?.phienBan}, giữ nguyên phiên bản đó.` : `Đã xác nhận đặc tả, phiên bản ${r.j.ban?.phienBan}. Bước tiếp theo: tạo đề.`);
  };

  const xemTruoc = () => {
    const kq = kiemTra();
    if (kq?.hopLe) setCheDo('xem');
  };

  const tenMon = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon)?.mon ?? maMon;
  const nhan = NHAN_TRANG_THAI[trangThai];
  const tongDiem = useMemo(() => Math.round((dacTa?.dong.reduce((s, r) => s + r.diem, 0) ?? 0) * 100) / 100, [dacTa]);
  // Hiển thị theo thứ tự câu trong đề (không gom theo bài) để thầy rà từ câu 1 đến hết.
  const nhom = useMemo((): [string, DongDacTa[]][] => (dacTa ? [['Các câu theo thứ tự trong đề', xepDongTheoCau(dacTa.dong)]] : []), [dacTa]);
  const dienLai = () => {
    if (!dacTa) return;
    const kq = dienLaiTuPpct(dacTa, goiY, tiet, mucLuc);
    setDacTa(kq.dacTa);
    setThongBao(kq.soDong ? `Đã điền bài, tuần cho ${kq.soDong} câu từ phân phối chương trình. Thầy xem lại và ghi chú nếu cần.` : tiet.length ? 'Không có ô trống nào tìm được bài khớp trong phân phối chương trình. Thầy nhập tay giúp.' : 'Môn này chưa có phân phối chương trình trong hệ thống. Thầy nhập ở mục Phân phối chương trình trước.');
  };
  const daXacNhan = trangThai === 'DA_XAC_NHAN';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <TienTrinh5Buoc buocHienTai={3} daXong={[1, 2]} choBam />

      <div className="the-tke p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0"><ListChecks className="w-7 h-7" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bản đặc tả đề kiểm tra</h1>
            <p className="text-sm text-slate-600 mt-1">Kế thừa ma trận riêng đã xác nhận. Mỗi câu một dòng: YCCĐ, mức, hình thức, điểm, kèm bài, tuần, trang SGK làm minh chứng.</p>
          </div>
        </div>
        {dacTa && <span className={`self-start md:self-auto rounded-full border px-3 py-1 text-sm font-medium ${nhan.mau}`}>{nhan.ten}</span>}
      </div>

      <div className="the-tke p-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Môn</span>
          <select aria-label="Môn" className={`${o} min-w-40`} value={maMon} onChange={(e) => setMaMon(e.target.value)}>
            {MAU_MA_TRAN_CHUNG.map((m) => <option key={m.ma_mon} value={m.ma_mon}>{m.mon}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Kì kiểm tra</span>
          <select aria-label="Kì kiểm tra" className={`${o} min-w-40`} value={ky} onChange={(e) => setKy(e.target.value as KyDung)}>
            {DANH_SACH_KY.map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
          </select>
        </label>
        <span className="text-sm text-slate-500 pb-2">Lớp 4{mtrBan?.phienBan ? ` · ma trận riêng phiên bản ${mtrBan.phienBan}` : ''}</span>
        {dangTai && <Loader2 className="w-4 h-4 animate-spin text-blue-700 mb-2.5" />}
      </div>

      {thongBao && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{thongBao}</div>}
      {loiTai && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loiTai}</div>}

      {!dangTai && !loiTai && !mtrBan && (
        <div className="the-tke p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Chưa có ma trận riêng đã xác nhận</h2>
          <p className="text-sm text-slate-600">Đặc tả chỉ lập từ ma trận riêng đã xác nhận của {tenMon}, {DANH_SACH_KY.find((k) => k.ma === ky)?.ten}. Thầy lập và xác nhận ma trận ở bước 2.</p>
          <Link href="/matrices" className={nutChinh}><ArrowLeft className="w-4 h-4" /> Về bước 2: Ma trận</Link>
        </div>
      )}

      {mtrBan && !dacTa && !dangTai && !loiTai && (
        <div className="the-tke p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Tạo đặc tả cho {tenMon}</h2>
          <p className="text-sm text-slate-600">Ứng dụng lấy từng câu, YCCĐ, mức, hình thức, điểm từ ma trận riêng phiên bản {mtrBan.phienBan}. Thầy chỉ phải điền bài học, tuần, trang SGK.</p>
          <button type="button" className={nutChinh} onClick={taoMoi}><ListChecks className="w-4 h-4" /> Tạo đặc tả từ ma trận riêng</button>
        </div>
      )}

      {baiCu && mtrBan && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span>Ma trận riêng đã có phiên bản {mtrBan.phienBan}, đặc tả này đang theo phiên bản {baiCu.phien_ban_ma_tran_rieng}. Dựng lại để khớp ma trận mới; phần bài, tuần, trang thầy đã điền được giữ nguyên.</span>
          <button type="button" className={nutChinh} onClick={dungLai}><RefreshCw className="w-4 h-4" /> Dựng lại theo ma trận mới</button>
        </div>
      )}

      {dacTa && !baiCu && (
        <>
          <div className="the-tke p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700">
            <span>{dacTa.dong.length} dòng · tổng <b>{fmtDiem(tongDiem)}</b> điểm</span>
            <label className="flex items-center gap-2">
              Tuần kiểm tra:
              <input
                aria-label="Tuần kiểm tra"
                type="number" min={1} max={40}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                disabled={cheDo === 'xem' || daXacNhan}
                value={dacTa.tuan_kiem_tra ?? ''}
                onChange={(e) => sua((d) => ({ ...d, tuan_kiem_tra: e.target.value ? Number(e.target.value) : null }))}
              />
              <span className="text-xs text-slate-500">Bài dạy sau tuần này là chưa học.</span>
            </label>
            {!daXacNhan && cheDo === 'sua' && <button type="button" className={nutPhu} onClick={dienLai}>Điền bài, tuần từ PPCT</button>}
            {phienBanXacNhan !== null && <span className="text-emerald-700">Đã có phiên bản xác nhận: {phienBanXacNhan}</span>}
          </div>

          {cheDo === 'sua' ? (
            <div className="space-y-4">
              <datalist id="ds-bai-ppct">{dsBaiPpct.map((b) => <option key={b} value={b} />)}</datalist>
              {nhom.map(([ten, dong]) => (
                <div key={ten} className="the-tke p-4 space-y-3">
                  <h2 className="font-semibold text-slate-900">{ten}</h2>
                  <div className="divide-y divide-slate-100">
                    {dong.map((r) => (
                      <div key={r.khoa} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(260px,1.2fr)_2fr] gap-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            Câu {r.cau}{r.yNho ? ` (${r.yNho.join(', ')})` : ''}
                            <span className="ml-2 text-xs font-normal text-slate-500">{TEN_MUC[r.muc]} · {r.hinhThuc}{r.dang ? ` · ${TEN_DANG[r.dang] ?? r.dang}` : ''} · {fmtDiem(r.diem)} điểm</span>
                          </div>
                          <div className="text-xs text-slate-500">{r.noiDung ?? r.mach}</div>
                          <div className="text-sm text-slate-700">{r.yccd || <span className="text-amber-700">Chưa có YCCĐ</span>}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[2fr_90px_1fr] gap-2 items-start">
                          <label className="text-xs text-slate-500">Bài học (theo PPCT)
                            <input aria-label={`Bài học câu ${r.cau}`} list="ds-bai-ppct" className={`${o} mt-0.5 ${r.baiHoc ? '' : 'border-amber-400 bg-amber-50'}`} disabled={daXacNhan} value={r.baiHoc} onChange={(e) => chonBai(r, e.target.value)} />
                          </label>
                          <label className="text-xs text-slate-500">Tuần
                            <input aria-label={`Tuần câu ${r.cau}`} type="number" min={1} max={40} className={`${o} mt-0.5 ${r.tuan !== null ? '' : 'border-amber-400 bg-amber-50'}`} disabled={daXacNhan} value={r.tuan ?? ''} onChange={(e) => suaDong(r.khoa, { tuan: e.target.value ? Number(e.target.value) : null })} />
                          </label>
                          <label className="text-xs text-slate-500">Trang SGK
                            <input aria-label={`Trang SGK câu ${r.cau}`} className={`${o} mt-0.5`} placeholder="tr. 45" disabled={daXacNhan} value={r.trangSgk} onChange={(e) => suaDong(r.khoa, { trangSgk: e.target.value })} />
                          </label>
                          <label className="text-xs text-slate-500 sm:col-span-1">Hình kèm theo
                            <select aria-label={`Hình kèm theo câu ${r.cau}`} className={`${o} mt-0.5`} disabled={daXacNhan} value={r.hinhKem ?? 'KHONG'} onChange={(e) => suaDong(r.khoa, { hinhKem: e.target.value as KieuHinhKem })}>
                              {(Object.keys(TEN_KIEU_HINH) as KieuHinhKem[]).map((k) => <option key={k} value={k}>{TEN_KIEU_HINH[k]}</option>)}
                            </select>
                          </label>
                          {(r.hinhKem ?? 'KHONG') !== 'KHONG' && (
                            <label className="text-xs text-slate-500 sm:col-span-2">Mô tả hình cần có (ngắn gọn)
                              <input aria-label={`Mô tả hình câu ${r.cau}`} className={`${o} mt-0.5`} placeholder="Ví dụ: 4 góc nhọn, vuông, tù, bẹt; nhãn A, B, C, D" disabled={daXacNhan} value={r.moTaHinh ?? ''} onChange={(e) => suaDong(r.khoa, { moTaHinh: e.target.value })} />
                            </label>
                          )}
                          <label className="text-xs text-slate-500 sm:col-span-3">Ghi chú (nếu thầy có yêu cầu riêng cho câu này)
                            <input aria-label={`Ghi chú câu ${r.cau}`} className={`${o} mt-0.5`} disabled={daXacNhan} value={r.ghiChu} onChange={(e) => suaDong(r.khoa, { ghiChu: e.target.value })} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="the-tke p-4 overflow-x-auto">
              <h2 className="font-semibold text-slate-900 mb-2">Xem trước bản đặc tả – {tenMon}, {DANH_SACH_KY.find((k) => k.ma === ky)?.ten}</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    {['Câu', 'Mạch, nội dung', 'YCCĐ', 'Mức', 'Hình thức, dạng', 'Điểm', 'Bài (PPCT)', 'Tuần', 'Trang SGK', 'Ghi chú'].map((h) => <th key={h} className="border border-slate-300 px-2 py-1.5 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {nhom.map(([ten, dong]) => (
                    <React.Fragment key={ten}>
                      <tr><td colSpan={10} className="border border-slate-300 bg-slate-100 px-2 py-1 font-semibold">{ten}</td></tr>
                      {dong.map((r) => (
                        <tr key={r.khoa} className="align-top">
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.cau}{r.yNho ? ` (${r.yNho.join(', ')})` : ''}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.noiDung ?? r.mach}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.yccd}</td>
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.muc}</td>
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.hinhThuc}{r.dang ? `, ${TEN_DANG[r.dang] ?? r.dang}` : ''}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right">{fmtDiem(r.diem)}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.baiHoc}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center">{r.tuan}</td>
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.trangSgk}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.ghiChu}{(r.hinhKem ?? 'KHONG') !== 'KHONG' && <div className="text-violet-800">Hình: {TEN_KIEU_HINH[r.hinhKem!]}{r.moTaHinh ? ` (${r.moTaHinh})` : ''}</div>}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr className="font-semibold"><td colSpan={5} className="border border-slate-300 px-2 py-1.5 text-right">Tổng</td><td className="border border-slate-300 px-2 py-1.5 text-right">{fmtDiem(tongDiem)}</td><td colSpan={4} className="border border-slate-300" /></tr>
                </tbody>
              </table>
            </div>
          )}

          {ketQua && <div className="the-tke p-6"><ValidationPanel ketQua={ketQua} tieuDe="Kết quả kiểm tra đặc tả" /></div>}

          {cheDo === 'xem' && !daXacNhan && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={daXemTruoc} onChange={(e) => setDaXemTruoc(e.target.checked)} />
              Tôi đã xem kĩ bản đặc tả ở trên.
            </label>
          )}

          {daXacNhan && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-900">
              <span>Đặc tả đã xác nhận (phiên bản {phienBanXacNhan}). Sửa bất kì ô nào, đặc tả sẽ chuyển sang &quot;Cần xác nhận lại&quot; và tạo phiên bản mới khi xác nhận.</span>
              <Link href={`/tao-de?mon=${maMon}&ky=${ky}`} className={nutChinh}>Sang bước 4: Tạo đề</Link>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2">
            {cheDo === 'xem'
              ? <button type="button" className={nutPhu} onClick={() => setCheDo('sua')}><ArrowLeft className="w-4 h-4" /> Chỉnh sửa đặc tả</button>
              : <Link href="/matrices" className={nutPhu}><ArrowLeft className="w-4 h-4" /> Về ma trận</Link>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={nutPhu} disabled={dangGui || daXacNhan} onClick={() => void gui('LUU_NHAP')}><Save className="w-4 h-4" /> Lưu bản nháp</button>
              <button type="button" className={nutPhu} onClick={kiemTra}><ShieldCheck className="w-4 h-4" /> Kiểm tra</button>
              {cheDo === 'sua'
                ? <button type="button" className={nutChinh} onClick={xemTruoc}><Eye className="w-4 h-4" /> Xem trước đặc tả</button>
                : <button type="button" className={nutChinh} disabled={!daXemTruoc || daXacNhan || dangGui} onClick={() => void gui('XAC_NHAN')}>
                    {dangGui ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {daXacNhan ? 'Đã xác nhận' : 'Xác nhận đặc tả'}
                  </button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
