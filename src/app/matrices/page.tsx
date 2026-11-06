'use client';

/**
 * Ma trận & Đặc tả (MOD-03) – bước 2 của quy trình tạo đề (Phụ lục 1.1).
 *
 * 1. Chọn môn → 2. Xem ma trận chung của tổ → 3. Lập ma trận riêng → 4. Xem trước và xác nhận.
 * Mẫu ma trận chung: src/core/matrix/templates (nguồn: docs/mau-ma-tran).
 *
 * Lưu ý: ma trận riêng hiện lưu bản nháp trên trình duyệt (localStorage).
 * Lưu vào cơ sở dữ liệu cần thêm bảng mới, chờ chủ dự án duyệt.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Grid, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import {
  apDungSuaCau,
  cacNhomLuaChon,
  chuanHoaSuaCau,
  danhSachCau,
  dungMaTranRieng,
  kiemDinhMaTranChung,
  kiemDinhMaTranRieng,
  taoMaTranRiengRong,
  trangThaiSauKhiSua,
  trangThaiSauKiemDinh,
  type KetQuaKiemDinh,
} from '@/core/matrix/matrix-template';
import type { YccdChuongTrinh } from '@/core/chuong-trinh/mon';
import type { HinhThucCau, MaTranChung, MaTranRieng, MucDo, SuaCauMaTranRieng, TrangThaiMaTran } from '@/types/matrix-template';
import { MatrixPreview } from '@/components/matrices/MatrixPreview';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { DungTuChuongTrinh } from '@/components/matrices/DungTuChuongTrinh';

const BUOC = ['Chọn môn', 'Ma trận chung', 'Lập ma trận riêng', 'Xem trước, xác nhận'] as const;

const NHAN_TRANG_THAI: Record<TrangThaiMaTran, { ten: string; mau: string }> = {
  BAN_NHAP: { ten: 'Bản nháp', mau: 'bg-slate-100 text-slate-700 border-slate-200' },
  CAN_KIEM_TRA: { ten: 'Chờ xác nhận', mau: 'bg-blue-50 text-blue-700 border-blue-200' },
  CO_LOI: { ten: 'Có lỗi cần sửa', mau: 'bg-red-50 text-red-700 border-red-200' },
  DA_XAC_NHAN: { ten: 'Đã xác nhận', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CAN_XAC_NHAN_LAI: { ten: 'Cần xác nhận lại', mau: 'bg-amber-50 text-amber-800 border-amber-200' },
};

const MA_KHUNG_DUNG = 'DUNG_TU_CHUONG_TRINH';
const laKhungDung = (m: MaTranChung | null) => m?.phien_ban_mau === MA_KHUNG_DUNG;
const khoaLuu = (m: MaTranChung) => `thaykhaiedu.maTranRieng.${m.ma_mon}.${m.ky_kiem_tra}${laKhungDung(m) ? '.ct' : ''}`;
const khoaKhung = (maMon: string) => `thaykhaiedu.khungDung.${maMon}.CUOI_HK1`;

function docKhungDung(maMon: string): MaTranChung | null {
  try {
    const raw = window.localStorage.getItem(khoaKhung(maMon));
    return raw ? (JSON.parse(raw) as MaTranChung) : null;
  } catch {
    return null;
  }
}

function docBanNhap(m: MaTranChung): MaTranRieng | null {
  try {
    const raw = window.localStorage.getItem(khoaLuu(m));
    return raw ? (JSON.parse(raw) as MaTranRieng) : null;
  } catch {
    return null;
  }
}

function ghiBanNhap(m: MaTranChung, mtr: MaTranRieng): boolean {
  try {
    window.localStorage.setItem(khoaLuu(m), JSON.stringify({ ...mtr, cap_nhat_luc: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

/** Câu chỉ có một YCCĐ thì gắn sẵn, giáo viên không phải chọn. */
function ganSanYccdDuyNhat(mtc: MaTranChung, mtr: MaTranRieng): MaTranRieng {
  if (mtr.nguon_yccd === 'CHUONG_TRINH' && !laKhungDung(mtc)) return mtr;
  const daCo = new Set(mtr.cau_hoi.map((c) => c.khoa));
  const them = danhSachCau(mtc, mtr.lua_chon_da_dung)
    .filter((c) => c.cau.dang !== 'VIET' && c.phan.kieu !== 'VIET' && c.dong.yccd.length === 1 && !daCo.has(c.khoa))
    .map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  return them.length ? { ...mtr, cau_hoi: [...mtr.cau_hoi, ...them] } : mtr;
}

function Stepper({ buoc, xong }: { buoc: number; xong: boolean[] }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 mb-2">Bước {buoc + 1}/{BUOC.length}</div>
      <ol className="flex flex-wrap gap-2">
        {BUOC.map((ten, i) => {
          const hienTai = i === buoc;
          return (
            <li
              key={ten}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                hienTai ? 'border-blue-600 bg-blue-600 text-white' : xong[i] ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {xong[i] && !hienTai ? <CheckCircle2 className="w-4 h-4" /> : <span className="font-semibold">{i + 1}.</span>}
              {ten}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const fmtDiem = (x: number) => String(x).replace('.', ',');
const CAC_DIEM = Array.from({ length: 20 }, (_, i) => (i + 1) / 2); // 0,5 → 10

/** Sửa số câu, mức, TN/TL, điểm của một câu ngay trong danh sách. */
function SuaThongTinCau({
  cau,
  goc,
  onSua,
}: {
  cau: { cau: string; y_nho: string[] | null; muc: MucDo; hinh_thuc: HinhThucCau; diem: number };
  goc: { cau: string; muc: MucDo; hinh_thuc: HinhThucCau; diem: number };
  onSua: (s: SuaCauMaTranRieng | null) => void;
}) {
  const [soCau, setSoCau] = useState(cau.cau);
  useEffect(() => setSoCau(cau.cau), [cau.cau]);
  const khac = { cau: cau.cau !== goc.cau, muc: cau.muc !== goc.muc, hinh_thuc: cau.hinh_thuc !== goc.hinh_thuc, diem: cau.diem !== goc.diem };
  const daSua = Object.values(khac).some(Boolean);
  const o = (doi: boolean) => `rounded-md border px-1.5 py-1 text-sm bg-white ${doi ? 'border-amber-500 ring-1 ring-amber-300 bg-amber-50' : 'border-slate-300'}`;
  const goi = (doi: boolean, ten: string) => (doi ? `Ma trận chung: ${ten}` : undefined);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-slate-900">Câu</span>
        <input
          aria-label="Số câu"
          title={goi(khac.cau, `Câu ${goc.cau}`)}
          className={`${o(khac.cau)} w-14 font-semibold`}
          value={soCau}
          onChange={(e) => setSoCau(e.target.value)}
          onBlur={() => (soCau.trim() ? onSua({ cau: soCau.trim() }) : setSoCau(cau.cau))}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
        {cau.y_nho && <span className="text-sm text-slate-600">({cau.y_nho.join(', ')})</span>}
        {daSua && (
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-xs text-amber-800 hover:underline" onClick={() => onSua(null)} title="Trả về như ma trận chung">
            <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label="Mức" title={goi(khac.muc, `Mức ${goc.muc}`)} className={o(khac.muc)} value={cau.muc} onChange={(e) => onSua({ muc: Number(e.target.value) as MucDo })}>
          {[1, 2, 3].map((m) => <option key={m} value={m}>Mức {m}</option>)}
        </select>
        <select aria-label="Hình thức" title={goi(khac.hinh_thuc, goc.hinh_thuc)} className={o(khac.hinh_thuc)} value={cau.hinh_thuc} onChange={(e) => onSua({ hinh_thuc: e.target.value as HinhThucCau })}>
          <option value="TN">TN</option>
          <option value="TL">TL</option>
        </select>
        <select aria-label="Điểm" title={goi(khac.diem, `${fmtDiem(goc.diem)} điểm`)} className={o(khac.diem)} value={cau.diem} onChange={(e) => onSua({ diem: Number(e.target.value) })}>
          {(CAC_DIEM.includes(cau.diem) ? CAC_DIEM : [...CAC_DIEM, cau.diem].sort((a, b) => a - b)).map((d) => <option key={d} value={d}>{fmtDiem(d)} điểm</option>)}
        </select>
      </div>
    </div>
  );
}

const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function MatricesPage() {
  const [buoc, setBuoc] = useState(0);
  const [maMon, setMaMon] = useState<string | null>(null);
  const [mtr, setMtr] = useState<MaTranRieng | null>(null);
  const [ketQua, setKetQua] = useState<KetQuaKiemDinh | null>(null);
  const [daXemTruoc, setDaXemTruoc] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [yccdCT, setYccdCT] = useState<YccdChuongTrinh[] | null>(null);
  const [loiCT, setLoiCT] = useState<string | null>(null);
  const [cachLap, setCachLap] = useState<'MA_TRAN_CHUNG' | 'CHUONG_TRINH'>('MA_TRAN_CHUNG');
  const [dangDung, setDangDung] = useState(false);
  const [khungDung, setKhungDung] = useState<MaTranChung | null>(null);

  const mtc = useMemo(
    () => (cachLap === 'CHUONG_TRINH' ? khungDung : MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon) ?? null),
    [maMon, cachLap, khungDung],
  );
  const khungDaLuu = useMemo(() => (cachLap === 'CHUONG_TRINH' && maMon && typeof window !== 'undefined' ? docKhungDung(maMon) : null), [cachLap, maMon, khungDung]);
  const khungDungHienTai = laKhungDung(mtc);
  const tenMonDangChon = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon)?.mon ?? '';
  const kqChung = useMemo(() => (mtc ? kiemDinhMaTranChung(mtc) : null), [mtc]);

  // Nạp bản nháp (nếu có) khi chọn môn
  useEffect(() => {
    if (!mtc) return;
    const nhap = docBanNhap(mtc);
    const khoiTao = laKhungDung(mtc) ? { ...taoMaTranRiengRong(mtc), nguon_yccd: 'CHUONG_TRINH' as const } : taoMaTranRiengRong(mtc);
    setMtr(ganSanYccdDuyNhat(mtc, nhap ?? khoiTao));
    setKetQua(null);
    setDaXemTruoc(false);
    setThongBao(nhap ? 'Đã mở lại bản nháp ma trận riêng đã lưu.' : null);
  }, [mtc]);

  // Khi chọn nguồn Chương trình: lấy YCCĐ đã duyệt của môn, lớp này trong Kho chương trình
  const lopSo = mtc ? Number(mtc.lop.replace(/\D/g, '')) || 4 : 4;
  const nguonCT = mtr?.nguon_yccd === 'CHUONG_TRINH';
  useEffect(() => {
    if (!mtc || !nguonCT) return;
    let huy = false;
    setYccdCT(null);
    setLoiCT(null);
    fetch(`/api/chuong-trinh/yccd?mon=${mtc.ma_mon}&lop=${lopSo}&trangThai=DA_DUYET`)
      .then((r) => r.json())
      .then((j: { yccd?: YccdChuongTrinh[]; error?: string }) => { if (!huy) { if (j.error) setLoiCT(j.error); else setYccdCT(j.yccd ?? []); } })
      .catch(() => { if (!huy) setLoiCT('Không tải được Kho chương trình.'); });
    return () => { huy = true; };
  }, [mtc, nguonCT, lopSo]);
  const dsYccdCT = useMemo(() => yccdCT?.map((y) => y.noiDung), [yccdCT]);
  const nhomYccdCT = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const y of yccdCT ?? []) m.set(y.mach ?? 'Chưa rõ mạch', [...(m.get(y.mach ?? 'Chưa rõ mạch') ?? []), y.noiDung]);
    return [...m.entries()];
  }, [yccdCT]);

  const nhanKhungDung = (m: MaTranChung) => {
    try {
      window.localStorage.removeItem(khoaLuu(m)); // khung mới thì bản nháp ma trận riêng cũ không còn khớp
      window.localStorage.setItem(khoaKhung(m.ma_mon), JSON.stringify(m));
    } catch {
      /* không lưu được thì vẫn dùng trong phiên này */
    }
    setKhungDung(m);
    setDangDung(false);
    setBuoc(1);
  };

  const doiNguonYccd = (nguon: 'MA_TRAN_CHUNG' | 'CHUONG_TRINH') => capNhat((m) => ({ ...m, nguon_yccd: nguon }));

  const capNhat = (fn: (m: MaTranRieng) => MaTranRieng) => {
    if (!mtc) return;
    setMtr((cu) => {
      if (!cu) return cu;
      const moi = ganSanYccdDuyNhat(mtc, fn(cu));
      return { ...moi, trang_thai: trangThaiSauKhiSua(cu) };
    });
    setKetQua(null);
    setDaXemTruoc(false);
  };

  const chonPhuongAn = (maNhom: string, maPa: string) =>
    capNhat((m) => {
      const lc = { ...m.lua_chon_da_dung, [maNhom]: maPa };
      // Bỏ YCCĐ của những câu không còn trong phương án mới
      const conLai = new Set(danhSachCau(mtc!, lc).map((c) => c.khoa));
      return { ...m, lua_chon_da_dung: lc, cau_hoi: m.cau_hoi.filter((c) => conLai.has(c.khoa)) };
    });

  const chonYccd = (khoa: string, yccd: string) =>
    capNhat((m) => ({ ...m, cau_hoi: [...m.cau_hoi.filter((c) => c.khoa !== khoa), ...(yccd ? [{ khoa, yccd }] : [])] }));

  /** Sửa số câu, mức, TN/TL, điểm của một câu. Chỉ giữ chỗ khác ma trận chung. */
  const suaCau = (khoa: string, s: SuaCauMaTranRieng | null) =>
    capNhat((m) => {
      const moi = { ...(m.sua_cau ?? {}) };
      if (s === null) delete moi[khoa];
      else moi[khoa] = { ...moi[khoa], ...s };
      const chuan = chuanHoaSuaCau(mtc!, moi);
      const { sua_cau: _bo, ...conLai } = m;
      void _bo;
      return Object.keys(chuan).length ? { ...conLai, sua_cau: chuan } : conLai;
    });

  const kiemTra = () => {
    if (!mtc || !mtr) return null;
    const kq = kiemDinhMaTranRieng(mtc, mtr, dsYccdCT);
    setKetQua(kq);
    setMtr({ ...mtr, trang_thai: trangThaiSauKiemDinh(mtr, kq) });
    return kq;
  };

  const luuNhap = () => {
    if (!mtc || !mtr) return;
    setThongBao(ghiBanNhap(mtc, mtr) ? 'Đã lưu bản nháp trên máy này.' : 'Không lưu được bản nháp trên trình duyệt này.');
  };

  const xacNhan = () => {
    if (!mtc || !mtr) return;
    const kq = kiemDinhMaTranRieng(mtc, mtr, dsYccdCT);
    setKetQua(kq);
    if (!kq.hopLe || !daXemTruoc) return;
    const daXacNhan: MaTranRieng = { ...mtr, trang_thai: 'DA_XAC_NHAN' };
    setMtr(daXacNhan);
    setThongBao(ghiBanNhap(mtc, daXacNhan) ? 'Đã xác nhận ma trận riêng. Bước tiếp theo: bản đặc tả.' : 'Đã xác nhận, nhưng chưa lưu được trên trình duyệt này.');
  };

  const cauList = useMemo(() => (mtc && mtr ? danhSachCau(apDungSuaCau(mtc, mtr.sua_cau), mtr.lua_chon_da_dung) : []), [mtc, mtr]);
  const cauGoc = useMemo(() => new Map(mtc && mtr ? danhSachCau(mtc, mtr.lua_chon_da_dung).map((c) => [c.khoa, c.cau]) : []), [mtc, mtr]);
  const tongDiemSua = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cauList) m.set(c.bai.ten, (m.get(c.bai.ten) ?? 0) + c.cau.diem);
    return m;
  }, [cauList]);
  const daChon = useMemo(() => new Map((mtr?.cau_hoi ?? []).map((c) => [c.khoa, c.yccd])), [mtr]);
  const nhomLuaChon = mtc ? cacNhomLuaChon(mtc) : [];
  const chonDuPhuongAn = !!mtr && nhomLuaChon.every((n) => mtr.lua_chon_da_dung[n.ma]);
  const banTrinhBay = useMemo(() => (mtc && mtr && chonDuPhuongAn ? dungMaTranRieng(mtc, mtr) : null), [mtc, mtr, chonDuPhuongAn]);

  const xong = [!!mtc, !!mtc && buoc > 1, !!ketQua?.hopLe, mtr?.trang_thai === 'DA_XAC_NHAN'];
  const trangThai = mtr ? NHAN_TRANG_THAI[mtr.trang_thai] : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <TienTrinh5Buoc buocHienTai={2} daXong={[1]} choBam />
      <div className="the-tke p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
            <Grid className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Ma trận đề kiểm tra</h1>
            <p className="text-sm text-slate-600 mt-1">Lập ma trận riêng từ ma trận chung của tổ khối 4, kiểm tra rồi xác nhận trước khi sang bản đặc tả.</p>
          </div>
        </div>
        {trangThai && (
          <span className={`self-start md:self-auto rounded-full border px-3 py-1 text-sm font-medium ${trangThai.mau}`}>{trangThai.ten}</span>
        )}
      </div>

      <div className="the-tke p-4">
        <Stepper buoc={buoc} xong={xong} />
      </div>

      {thongBao && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{thongBao}</div>}

      {buoc === 0 && dangDung && maMon && (
        <DungTuChuongTrinh maMon={maMon} tenMon={tenMonDangChon} onDung={nhanKhungDung} onQuayLai={() => setDangDung(false)} />
      )}

      {/* Bước 1: chọn môn */}
      {buoc === 0 && !dangDung && (
        <div className="the-tke p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chọn môn kiểm tra</h2>
            <p className="text-sm text-slate-600">Kì kiểm tra: Cuối học kì I, năm học 2026 – 2027, Lớp 4.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ['MA_TRAN_CHUNG', 'Dùng ma trận chung của tổ', 'Tổ đã có ma trận chung. Lập ma trận riêng từ đó.'],
              ['CHUONG_TRINH', 'Dựng từ chương trình', 'Tổ chưa có ma trận chung. Dựng khung từ phân phối chương trình và YCCĐ đã duyệt.'],
            ] as const).map(([k, ten, mt]) => (
              <button key={k} type="button" aria-pressed={cachLap === k} onClick={() => { setCachLap(k); setKhungDung(null); setBuoc(0); }} className={`text-left rounded-lg border p-3 ${cachLap === k ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                <div className={`text-sm font-semibold ${cachLap === k ? 'text-blue-800' : 'text-slate-800'}`}>{cachLap === k ? '● ' : '○ '}{ten}</div>
                <div className="text-xs text-slate-600 mt-0.5">{mt}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MAU_MA_TRAN_CHUNG.map((m) => (
              <button
                key={m.ma_mon}
                type="button"
                disabled={cachLap === 'CHUONG_TRINH' && m.ma_mon === 'TIENG_VIET'}
                onClick={() => setMaMon(m.ma_mon)}
                className={`rounded-xl border p-4 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${maMon === m.ma_mon ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
              >
                <div className="font-semibold text-slate-900">{m.mon}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {m.bai_kiem_tra.length > 1 ? 'Bài Đọc và bài Viết, mỗi bài 10 điểm' : '10 điểm'}
                  {m.thoi_gian_phut ? ` · ${m.thoi_gian_phut} phút` : ''}
                  {cachLap === 'CHUONG_TRINH' && m.ma_mon === 'TIENG_VIET' ? ' · cần ma trận chung (có Đọc thành tiếng, Đọc hiểu, Viết)' : ''}
                </div>
              </button>
            ))}
          </div>
          {cachLap === 'CHUONG_TRINH' ? (
            <div className="flex flex-wrap justify-end gap-2">
              {khungDaLuu && maMon && (
                <button type="button" className={nutPhu} onClick={() => { setKhungDung(khungDaLuu); setBuoc(1); }}>
                  Mở lại khung đã dựng
                </button>
              )}
              <button type="button" className={nutChinh} disabled={!maMon} onClick={() => setDangDung(true)}>
                Dựng khung từ chương trình <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" className={nutChinh} disabled={!mtc} onClick={() => setBuoc(1)}>
                Tiếp tục <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bước 2: ma trận chung */}
      {buoc === 1 && mtc && kqChung && (
        <div className="space-y-4">
          <div className="the-tke p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{khungDungHienTai ? 'Khung ma trận dựng từ chương trình' : 'Ma trận chung của tổ'} – {mtc.mon}</h2>
            <p className="text-sm text-slate-600">
              {khungDungHienTai
                ? 'Khung do ứng dụng dựng từ phân phối chương trình và YCCĐ đã duyệt, chưa phải khung tổ đã thống nhất. Số câu, mức, hình thức và điểm là gợi ý, thầy chỉnh ở bước sau.'
                : 'Đây là khung tổ đã thống nhất. Ma trận riêng giữ nguyên số câu, mức, hình thức và điểm của từng câu.'}
            </p>
            {mtc.van_de_can_xac_nhan && mtc.van_de_can_xac_nhan.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-semibold mb-1">Tổ trưởng cần xác nhận trong ma trận chung</div>
                <ul className="list-disc pl-6 space-y-0.5">
                  {mtc.van_de_can_xac_nhan.map((v) => <li key={v}>{v}</li>)}
                </ul>
              </div>
            )}
            <ValidationPanel ketQua={kqChung} />
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <MatrixPreview maTran={mtc} />
          </div>
          <div className="flex justify-between">
            <button type="button" className={nutPhu} onClick={() => { setBuoc(0); setDangDung(khungDungHienTai); }}><ArrowLeft className="w-4 h-4" /> Quay lại</button>
            <button type="button" className={nutChinh} disabled={!kqChung.hopLe} onClick={() => setBuoc(2)}>
              Lập ma trận riêng <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bước 3: lập ma trận riêng */}
      {buoc === 2 && mtc && mtr && (
        <div className="space-y-4">
          {nhomLuaChon.length > 0 && (
            <div className="the-tke p-6 space-y-4">
              {nhomLuaChon.map((nhom) => (
                <fieldset key={nhom.ma}>
                  <legend className="font-semibold text-slate-900 mb-2">{nhom.ten}</legend>
                  <div className="flex flex-wrap gap-2">
                    {nhom.phuong_an.map((pa) => (
                      <label key={pa.ma} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${mtr.lua_chon_da_dung[nhom.ma] === pa.ma ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200'}`}>
                        <input type="radio" className="sr-only" name={nhom.ma} checked={mtr.lua_chon_da_dung[nhom.ma] === pa.ma} onChange={() => chonPhuongAn(nhom.ma, pa.ma)} />
                        {pa.ten}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {khungDungHienTai ? (
            <div className="the-tke p-6 text-sm text-slate-700">
              <h2 className="text-lg font-semibold text-slate-900">Nguồn yêu cầu cần đạt (YCCĐ)</h2>
              <p className="mt-1">YCCĐ lấy từ Kho chương trình GDPT 2018 (đã duyệt), theo chủ đề thầy đã ghép ở bước dựng khung. Mỗi câu chọn đúng một YCCĐ của chủ đề đó.</p>
            </div>
          ) : (
          <div className="the-tke p-6">
            <h2 className="text-lg font-semibold text-slate-900">Nguồn yêu cầu cần đạt (YCCĐ)</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ['MA_TRAN_CHUNG', 'Ma trận chung của tổ', 'YCCĐ ghi sẵn trong ma trận chung tổ đã soạn và tải lên.'],
                ['CHUONG_TRINH', 'Chương trình GDPT 2018', 'YCCĐ đã duyệt trong Kho chương trình (AI trích từ CT GDPT, SGK, SGV).'],
              ] as const).map(([k, ten, mt]) => {
                const dang = (mtr?.nguon_yccd ?? 'MA_TRAN_CHUNG') === k;
                return (
                  <button key={k} type="button" aria-pressed={dang} onClick={() => !dang && doiNguonYccd(k)} className={`text-left rounded-lg border p-3 ${dang ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                    <div className={`text-sm font-semibold ${dang ? 'text-blue-800' : 'text-slate-800'}`}>{dang ? '● ' : '○ '}{ten}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{mt}</div>
                  </button>
                );
              })}
            </div>
            {nguonCT && loiCT && <p className="text-sm text-red-700 mt-2">{loiCT}</p>}
            {nguonCT && !loiCT && yccdCT && yccdCT.length === 0 && (
              <p className="text-sm text-amber-800 mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                Kho chương trình chưa có YCCĐ đã duyệt cho {mtc?.mon} lớp {lopSo}. Vào <a className="underline" href="/chuong-trinh">Kho chương trình GDPT 2018</a> nạp tài liệu, cho AI trích rồi duyệt; hoặc chọn lại Ma trận chung.
              </p>
            )}
            {nguonCT && yccdCT && yccdCT.length > 0 && <p className="text-xs text-slate-500 mt-2">Có {yccdCT.length} YCCĐ đã duyệt của {mtc?.mon} lớp {lopSo}. Câu đã chọn YCCĐ không nằm trong danh sách này sẽ bị báo lỗi khi kiểm tra.</p>}
          </div>
          )}

          <div className="the-tke p-6">
            <h2 className="text-lg font-semibold text-slate-900">Chọn yêu cầu cần đạt, chỉnh câu cho từng câu</h2>
            <p className="text-sm text-slate-600 mb-4">
              Mỗi câu gắn đúng một YCCĐ. Nguồn Ma trận chung: câu chỉ có một YCCĐ được chọn sẵn. Số câu, mức, TN/TL, điểm lấy theo ma trận chung; cần thì sửa ngay tại câu, ô đã sửa có viền vàng và nút khôi phục.
            </p>
            {!chonDuPhuongAn ? (
              <p className="text-sm text-slate-500">Chọn phương án ở trên trước.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {cauList.map((c) => {
                  const baiViet = c.cau.dang === 'VIET' || c.phan.kieu === 'VIET';
                  const gt = daChon.get(c.khoa) ?? '';
                  return (
                    <div key={c.khoa} className="py-3 grid grid-cols-1 md:grid-cols-[330px_1fr] gap-2">
                      <div>
                        {baiViet ? (
                          <>
                            <div className="font-semibold text-slate-900">Bài viết</div>
                            <div className="text-xs text-slate-500">Mức {c.cau.muc} · {c.cau.hinh_thuc} · {fmtDiem(c.cau.diem)} điểm</div>
                          </>
                        ) : (
                          <SuaThongTinCau
                            cau={c.cau}
                            goc={cauGoc.get(c.khoa) ?? c.cau}
                            onSua={(s) => suaCau(c.khoa, s)}
                          />
                        )}
                        <div className="text-xs text-slate-500 mt-1">
                          {c.bai.phan.length > 1 || c.bai.tong_diem !== 10 ? `${c.phan.ten} · ` : ''}{c.dong.noi_dung ?? c.dong.mach}
                        </div>
                      </div>
                      {baiViet ? (
                        <div className="text-sm text-slate-600">Bài viết chấm theo toàn bộ YCCĐ của thể loại, không cần chọn.</div>
                      ) : (
                        <select
                          aria-label={`YCCĐ của câu ${c.cau.cau}`}
                          className={`w-full rounded-lg border px-3 py-2 text-sm ${gt ? 'border-slate-300' : 'border-amber-400 bg-amber-50'}`}
                          value={gt}
                          onChange={(e) => chonYccd(c.khoa, e.target.value)}
                        >
                          <option value="">– Chọn YCCĐ –</option>
                          {nguonCT && !khungDungHienTai ? (
                            <>
                              {gt && !dsYccdCT?.includes(gt) && <option value={gt}>{gt} (không có trong Kho chương trình)</option>}
                              {nhomYccdCT.map(([mach, ds]) => (
                                <optgroup key={mach} label={mach}>{ds.map((y) => <option key={y} value={y}>{y}</option>)}</optgroup>
                              ))}
                            </>
                          ) : c.dong.yccd.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {chonDuPhuongAn && mtr.sua_cau && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Đã sửa {Object.keys(mtr.sua_cau).length} câu so với ma trận chung.{' '}
              {mtc.bai_kiem_tra.map((b) => {
                const t = Math.round((tongDiemSua.get(b.ten) ?? 0) * 100) / 100;
                return b.phan.every((p) => (p.kieu ?? 'CAU_HOI') === 'CAU_HOI')
                  ? <span key={b.ma} className={Math.abs(t - b.tong_diem) > 0.001 ? 'font-semibold text-red-700' : ''}>{b.ten}: {fmtDiem(t)}/{fmtDiem(b.tong_diem)} điểm. </span>
                  : null;
              })}
              Bấm Kiểm tra để soát tổng điểm, thứ tự câu, tỉ lệ mức.
            </div>
          )}

          {ketQua && <div className="the-tke p-6"><ValidationPanel ketQua={ketQua} tieuDe="Kết quả kiểm tra ma trận riêng" /></div>}

          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className={nutPhu} onClick={() => setBuoc(1)}><ArrowLeft className="w-4 h-4" /> Quay lại</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={nutPhu} onClick={luuNhap}><Save className="w-4 h-4" /> Lưu bản nháp</button>
              <button type="button" className={nutPhu} onClick={kiemTra}><ShieldCheck className="w-4 h-4" /> Kiểm tra</button>
              <button
                type="button"
                className={nutChinh}
                onClick={() => {
                  const kq = kiemTra();
                  if (kq?.hopLe) setBuoc(3);
                }}
              >
                <Eye className="w-4 h-4" /> Xem trước ma trận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bước 4: xem trước và xác nhận */}
      {buoc === 3 && mtc && mtr && banTrinhBay && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <MatrixPreview maTran={banTrinhBay} />
          </div>
          {ketQua && !ketQua.hopLe && <div className="the-tke p-6"><ValidationPanel ketQua={ketQua} /></div>}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={daXemTruoc} onChange={(e) => setDaXemTruoc(e.target.checked)} />
            Tôi đã xem kĩ ma trận riêng ở trên.
          </label>
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className={nutPhu} onClick={() => setBuoc(2)}><ArrowLeft className="w-4 h-4" /> Chỉnh sửa ma trận</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={nutPhu} onClick={luuNhap}><Save className="w-4 h-4" /> Lưu bản nháp</button>
              <button type="button" className={nutChinh} disabled={!daXemTruoc || mtr.trang_thai === 'DA_XAC_NHAN'} onClick={xacNhan}>
                <CheckCircle2 className="w-4 h-4" /> {mtr.trang_thai === 'DA_XAC_NHAN' ? 'Đã xác nhận' : 'Xác nhận ma trận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
