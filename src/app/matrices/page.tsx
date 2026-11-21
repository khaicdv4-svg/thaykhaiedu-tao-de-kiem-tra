'use client';

/**
 * Ma trận & Đặc tả (MOD-03) – bước 2 của quy trình tạo đề (Phụ lục 1.1).
 *
 * 1. Chọn môn → 2. Xem ma trận chung của tổ → 3. Lập ma trận riêng → 4. Xem trước và xác nhận.
 * Mẫu ma trận chung: src/core/matrix/templates (nguồn: docs/mau-ma-tran).
 *
 * Lưu: tổ trưởng, tổ phó, quản trị lưu bản nháp và xác nhận phiên bản lên hệ thống (bảng ma_tran_rieng).
 * Tài khoản khác, hoặc khi chưa kết nối được, chỉ lưu bản nháp trên trình duyệt (localStorage).
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Grid, ListChecks, Loader2, Plus, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import {
  apDungSuaCau,
  cacNhomLuaChon,
  chuanHoaSuaCau,
  chuyenMaTranRiengSangBanMoi,
  danhSachCau,
  dungMaTranRieng,
  ganSanYccdDuyNhat as ganSanYccdCore,
  kiemDinhMaTranChung,
  kiemDinhMaTranRieng,
  taoMaTranRiengRong,
  trangThaiSauKhiSua,
  trangThaiSauKiemDinh,
  soYccdToiDa,
  type KetQuaKiemDinh,
} from '@/core/matrix/matrix-template';
import type { YccdChuongTrinh } from '@/core/chuong-trinh/mon';
import type { HinhThucCau, MaTranChung, MaTranRieng, MucDo, SuaCauMaTranRieng, TrangThaiMaTran } from '@/types/matrix-template';
import { MatrixPreview } from '@/components/matrices/MatrixPreview';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { DungTuChuongTrinh } from '@/components/matrices/DungTuChuongTrinh';
import { DungTiengViet } from '@/components/matrices/DungTiengViet';
import { DANH_SACH_KY, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import { docHoSoDe, luuHoSoDe } from '@/core/ho-so-de/ho-so-de';
import { useAuth } from '@/core/contexts/AuthContext';

/** Tổ trưởng, quản trị: bấm Lưu là app tự kiểm tra, xác nhận và cập nhật đặc tả. */
const VAI_TRO_TU_XAC_NHAN = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

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
const khoaKhung = (maMon: string, ky: string) => `thaykhaiedu.khungDung.${maMon}.${ky}`;

function docKhungDung(maMon: string, ky: string): MaTranChung | null {
  try {
    const raw = window.localStorage.getItem(khoaKhung(maMon, ky));
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
const ganSanYccdDuyNhat = (mtc: MaTranChung, mtr: MaTranRieng): MaTranRieng => ganSanYccdCore(mtc, mtr, laKhungDung(mtc));

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
  const [kyDung, setKyDung] = useState<KyDung>('CUOI_HK1');
  /** Ma trận chung đọc từ file tổ đã tải lên và xác nhận (Kho ma trận chung) */
  const [khoMtc, setKhoMtc] = useState<{ coFile: boolean; mtc: MaTranChung | null; canhBao: string[]; loi?: string; tenFile?: string; phienBan?: number; banChoXacNhan?: { phienBan: number; taiLenLuc: string } | null } | null>(null);
  const [dangTaiKho, setDangTaiKho] = useState(false);
  /** Tổ chưa tải ma trận chung Cuối HKI: cho dùng mẫu có sẵn trong app như trước */
  const [dungMauCo, setDungMauCo] = useState(false);
  const [khungDung, setKhungDung] = useState<MaTranChung | null>(null);
  /** Số phiên bản ma trận riêng đã xác nhận trên hệ thống (null: chưa có). */
  const [phienBanXacNhan, setPhienBanXacNhan] = useState<number | null>(null);
  const [chungMoiHon, setChungMoiHon] = useState<{ phienBan: number; xacNhanLuc: string } | null>(null);
  const [dangLuuHeThong, setDangLuuHeThong] = useState(false);
  const { activeRole } = useAuth();
  const tuXacNhan = VAI_TRO_TU_XAC_NHAN.includes(activeRole as string);

  const mtc = useMemo(
    () => (cachLap === 'CHUONG_TRINH'
      ? khungDung
      : khoMtc?.mtc ?? (dungMauCo && kyDung === 'CUOI_HK1' ? MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon) ?? null : null)),
    [maMon, cachLap, khungDung, khoMtc, dungMauCo, kyDung],
  );

  // Nhận hồ sơ đề (môn, kì) từ bước 1: địa chỉ ?mon=&ky= hoặc hồ sơ lưu trên máy
  const [daDocHoSo, setDaDocHoSo] = useState(false);
  useEffect(() => {
    const h = docHoSoDe();
    if (h) { setMaMon(h.mon); setKyDung(h.ky); }
    setDaDocHoSo(true);
  }, []);
  // Đổi môn, kì ở đây thì hồ sơ đề cho các bước sau cũng đổi theo
  useEffect(() => { if (daDocHoSo && maMon) luuHoSoDe({ mon: maMon, ky: kyDung }); }, [daDocHoSo, maMon, kyDung]);

  // Lấy ma trận chung của tổ (bản đã xác nhận mới nhất) theo môn × kì
  useEffect(() => {
    setKhoMtc(null);
    setDungMauCo(false);
    if (cachLap !== 'MA_TRAN_CHUNG' || !maMon) return;
    let huy = false;
    setDangTaiKho(true);
    fetch(`/api/kho-ma-tran/ma-tran-chung?mon=${maMon}&ky=${kyDung}`)
      .then((r) => r.json())
      .then((j) => { if (!huy) setKhoMtc(j.error ? { coFile: false, mtc: null, canhBao: [], loi: j.error } : j); })
      .catch(() => { if (!huy) setKhoMtc({ coFile: false, mtc: null, canhBao: [], loi: 'Không tải được kho ma trận chung.' }); })
      .finally(() => { if (!huy) setDangTaiKho(false); });
    return () => { huy = true; };
  }, [cachLap, maMon, kyDung]);
  const khungDaLuu = useMemo(() => (cachLap === 'CHUONG_TRINH' && maMon && typeof window !== 'undefined' ? docKhungDung(maMon, kyDung) : null), [cachLap, maMon, kyDung, khungDung]);
  const khungDungHienTai = laKhungDung(mtc);
  const tenMonDangChon = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon)?.mon ?? '';
  const kqChung = useMemo(() => (mtc ? kiemDinhMaTranChung(mtc) : null), [mtc]);

  // Nạp bản nháp (nếu có) khi chọn môn
  useEffect(() => {
    if (!mtc) return;
    const nhapGoc = docBanNhap(mtc);
    // Bản nháp lập theo phiên bản ma trận chung khác (ví dụ mẫu viết sẵn 1.0 → file của tổ trong kho):
    // chuyển sang phiên bản mới, giữ YCCĐ và chỗ sửa còn khớp
    const chuyen = nhapGoc && nhapGoc.phien_ban_ma_tran_chung !== mtc.phien_ban_mau ? chuyenMaTranRiengSangBanMoi(mtc, nhapGoc) : null;
    const nhap = chuyen ? chuyen.mtr : nhapGoc;
    // Tiếng Việt: khung có sẵn danh sách YCCĐ từng dòng (một phần lấy từ tên tiết Luyện từ và câu, không có trong Kho),
    // nên chọn YCCĐ theo dòng của khung. Các môn khác: chọn từ Kho chương trình.
    const khoiTao = laKhungDung(mtc) && mtc.ma_mon !== 'TIENG_VIET' ? { ...taoMaTranRiengRong(mtc), nguon_yccd: 'CHUONG_TRINH' as const } : taoMaTranRiengRong(mtc);
    setMtr(ganSanYccdDuyNhat(mtc, nhap ?? khoiTao));
    setKetQua(null);
    setDaXemTruoc(false);
    setThongBao(chuyen
      ? `Ma trận chung đã đổi (bản ${nhapGoc!.phien_ban_ma_tran_chung} → ${mtc.phien_ban_mau}). App đã chuyển bản nháp sang ma trận chung mới: giữ ${chuyen.giu} YCCĐ đã chọn${chuyen.bo ? `, bỏ ${chuyen.bo} chỗ không còn khớp` : ''}. Thầy cô kiểm tra lại rồi xác nhận.`
      : nhap ? 'Đã mở lại bản nháp ma trận riêng đã lưu.' : null);
    setPhienBanXacNhan(null);
    setChungMoiHon(null);

    // Bản lưu trên hệ thống (cả tổ cùng thấy) được ưu tiên hơn bản lưu trên máy
    let huy = false;
    fetch(`/api/ma-tran-rieng?mon=${mtc.ma_mon}&ky=${mtc.ky_kiem_tra}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { banNhap?: { duLieu?: { ma_tran_chung?: MaTranChung; ma_tran_rieng?: MaTranRieng }; capNhatLuc?: string } | null; moiNhat?: { phienBan?: number | null } | null; maTranChungMoiHon?: { phienBan: number; xacNhanLuc: string } | null } | null) => {
        if (huy || !j) return;
        setPhienBanXacNhan(j.moiNhat?.phienBan ?? null);
        setChungMoiHon(j.maTranChungMoiHon ?? null);
        const d = j.banNhap?.duLieu;
        // Chỉ dùng khi đúng cùng ma trận chung (khung dựng từ chương trình có thể đã khác)
        if (d?.ma_tran_rieng && d.ma_tran_chung && JSON.stringify(d.ma_tran_chung) === JSON.stringify(mtc)) {
          setMtr(ganSanYccdDuyNhat(mtc, d.ma_tran_rieng));
          setThongBao(`Đã mở bản nháp ma trận riêng lưu trên hệ thống${j.moiNhat?.phienBan ? ` (đã xác nhận đến phiên bản ${j.moiNhat.phienBan})` : ''}.`);
        } else if (d?.ma_tran_rieng && !nhapGoc && d.ma_tran_rieng.phien_ban_ma_tran_chung !== mtc.phien_ban_mau) {
          // Bản nháp trên hệ thống lập theo ma trận chung cũ: chuyển sang bản mới, giữ phần còn khớp
          const c = chuyenMaTranRiengSangBanMoi(mtc, d.ma_tran_rieng);
          setMtr(ganSanYccdDuyNhat(mtc, c.mtr));
          setThongBao(`Ma trận chung đã đổi (bản ${d.ma_tran_rieng.phien_ban_ma_tran_chung} → ${mtc.phien_ban_mau}). App đã chuyển bản nháp trên hệ thống sang ma trận chung mới: giữ ${c.giu} YCCĐ đã chọn${c.bo ? `, bỏ ${c.bo} chỗ không còn khớp` : ''}. Thầy cô kiểm tra lại rồi xác nhận.`);
        }
      })
      .catch(() => { /* không có mạng hoặc chưa đăng nhập: dùng bản trên máy */ });
    return () => { huy = true; };
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
      window.localStorage.setItem(khoaKhung(m.ma_mon, m.ky_kiem_tra), JSON.stringify(m));
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
    capNhat((m) => {
      const cu = m.cau_hoi.find((c) => c.khoa === khoa);
      const them = (cu?.yccd_them ?? []).filter((y) => y && y !== yccd);
      return { ...m, cau_hoi: [...m.cau_hoi.filter((c) => c.khoa !== khoa), ...(yccd ? [{ khoa, yccd, ...(them.length ? { yccd_them: them } : {}) }] : [])] };
    });

  /** Câu nhiều ý nhỏ: YCCĐ thêm (ví dụ Câu 8 a, b cộng trừ; c, d nhân chia). */
  const datYccdThem = (khoa: string, ds: string[]) =>
    capNhat((m) => ({
      ...m,
      cau_hoi: m.cau_hoi.map((c) => {
        if (c.khoa !== khoa) return c;
        const them = [...new Set(ds.filter((y) => y && y !== c.yccd))];
        const { yccd_them: _bo, ...goc } = c;
        void _bo;
        return them.length ? { ...goc, yccd_them: them } : goc;
      }),
    }));

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

  /** Gửi lên hệ thống. Trả về: 'OK', 'KHONG_QUYEN' (chỉ lưu được trên máy), hoặc thông báo lỗi. */
  const guiHeThong = async (hanhDong: 'LUU_NHAP' | 'XAC_NHAN', m: MaTranRieng): Promise<{ ket: 'OK' | 'KHONG_QUYEN' | 'LOI'; thongBao?: string; phienBan?: number | null; taoMoi?: boolean }> => {
    if (!mtc) return { ket: 'LOI' };
    try {
      const r = await fetch('/api/ma-tran-rieng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong, mon: mtc.ma_mon, ky: mtc.ky_kiem_tra, duLieu: { ma_tran_chung: mtc, ma_tran_rieng: m } }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; ban?: { phienBan?: number | null }; taoPhienBanMoi?: boolean };
      if (r.ok) return { ket: 'OK', phienBan: j.ban?.phienBan ?? null, taoMoi: j.taoPhienBanMoi };
      if (r.status === 403) return { ket: 'KHONG_QUYEN', thongBao: j.error };
      return { ket: 'LOI', thongBao: j.error ?? `Lỗi ${r.status}` };
    } catch {
      return { ket: 'KHONG_QUYEN', thongBao: 'Không kết nối được hệ thống.' };
    }
  };

  const luuNhap = async () => {
    if (!mtc || !mtr) return;
    setDangLuuHeThong(true);
    const kq = await guiHeThong('LUU_NHAP', mtr);
    setDangLuuHeThong(false);
    if (kq.ket === 'OK') { ghiBanNhap(mtc, mtr); setThongBao('Đã lưu bản nháp lên hệ thống. Cả tổ cùng thấy bản này.'); return; }
    if (kq.ket === 'LOI') { setThongBao(`Chưa lưu lên hệ thống: ${kq.thongBao}`); return; }
    setThongBao(ghiBanNhap(mtc, mtr) ? `Đã lưu bản nháp trên máy này (${kq.thongBao ?? 'tài khoản chưa được lưu lên hệ thống'}).` : 'Không lưu được bản nháp trên trình duyệt này.');
  };

  /** Tổ trưởng bấm Lưu: hệ thống tự kiểm tra; không có lỗi thì xác nhận luôn và cập nhật đặc tả. */
  const luuTuDong = async () => {
    if (!mtc || !mtr) return;
    const kq = kiemDinhMaTranRieng(mtc, mtr, dsYccdCT);
    setKetQua(kq);
    setDangLuuHeThong(true);
    let r: Response | null = null;
    let j: { error?: string; daXacNhan?: boolean; loiXacNhan?: string; taoPhienBanMoi?: boolean; ban?: { phienBan?: number | null }; lienKet?: { ok: boolean; thongBao: string }[] } = {};
    try {
      r = await fetch('/api/ma-tran-rieng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'LUU', mon: mtc.ma_mon, ky: mtc.ky_kiem_tra, duLieu: { ma_tran_chung: mtc, ma_tran_rieng: mtr } }),
      });
      j = await r.json().catch(() => ({}));
    } catch {
      /* mất mạng: xử lí ở dưới */
    }
    setDangLuuHeThong(false);
    if (!r || !r.ok) {
      setThongBao(ghiBanNhap(mtc, mtr) ? `Chưa lưu lên hệ thống (${j.error ?? 'không kết nối được'}). Đã giữ bản nháp trên máy này.` : `Chưa lưu được: ${j.error ?? 'không kết nối được'}`);
      return;
    }
    if (j.daXacNhan) {
      const daXacNhan: MaTranRieng = { ...mtr, trang_thai: 'DA_XAC_NHAN' };
      setMtr(daXacNhan);
      ghiBanNhap(mtc, daXacNhan);
      setPhienBanXacNhan(j.ban?.phienBan ?? null);
      const dacTa = (j.lienKet ?? []).map((b) => b.thongBao).join(' ');
      setThongBao(`${j.taoPhienBanMoi === false ? `Đã lưu. Nội dung không đổi so với phiên bản ${j.ban?.phienBan}.` : `Đã lưu và dùng ngay, phiên bản ${j.ban?.phienBan}.`}${dacTa ? ` ${dacTa}` : ' Bước tiếp theo: bản đặc tả.'}`);
      return;
    }
    ghiBanNhap(mtc, mtr);
    setThongBao(`Đã lưu bản nháp. Chưa dùng được vì còn lỗi: ${j.loiXacNhan ?? 'xem kết quả kiểm tra bên dưới'}. Sửa xong bấm Lưu lại.`);
  };

  const xacNhan = async () => {
    if (!mtc || !mtr) return;
    const kq = kiemDinhMaTranRieng(mtc, mtr, dsYccdCT);
    setKetQua(kq);
    if (!kq.hopLe || !daXemTruoc) return;
    const daXacNhan: MaTranRieng = { ...mtr, trang_thai: 'DA_XAC_NHAN' };
    setDangLuuHeThong(true);
    const gui = await guiHeThong('XAC_NHAN', mtr);
    setDangLuuHeThong(false);
    if (gui.ket === 'LOI') { setThongBao(`Chưa xác nhận được: ${gui.thongBao}`); return; }
    setMtr(daXacNhan);
    ghiBanNhap(mtc, daXacNhan);
    if (gui.ket === 'OK') {
      setPhienBanXacNhan(gui.phienBan ?? null);
      setThongBao(gui.taoMoi === false
        ? `Nội dung không đổi so với phiên bản ${gui.phienBan}, giữ nguyên phiên bản đó. Bước tiếp theo: bản đặc tả.`
        : `Đã xác nhận ma trận riêng, phiên bản ${gui.phienBan}. Bước tiếp theo: bản đặc tả.`);
    } else {
      setThongBao(`Đã xác nhận trên máy này. Chưa lưu lên hệ thống nên chưa lập được bản đặc tả: ${gui.thongBao ?? 'cần tài khoản tổ trưởng, tổ phó hoặc quản trị'}.`);
    }
  };

  // Xếp theo số câu trong đề (câu không đánh số, như bài viết, để cuối) cho dễ rà từ câu 1.
  const cauList = useMemo(() => {
    if (!mtc || !mtr) return [];
    const so = (x: string) => (/^\d+$/.test(x) ? Number(x) : Number.POSITIVE_INFINITY);
    return danhSachCau(apDungSuaCau(mtc, mtr.sua_cau), mtr.lua_chon_da_dung)
      .map((c, i) => ({ c, i }))
      .sort((a, b) => so(a.c.cau.cau) - so(b.c.cau.cau) || a.i - b.i)
      .map((x) => x.c);
  }, [mtc, mtr]);
  const cauGoc = useMemo(() => new Map(mtc && mtr ? danhSachCau(mtc, mtr.lua_chon_da_dung).map((c) => [c.khoa, c.cau]) : []), [mtc, mtr]);
  const tongDiemSua = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cauList) m.set(c.bai.ten, (m.get(c.bai.ten) ?? 0) + c.cau.diem);
    return m;
  }, [cauList]);
  const daChon = useMemo(() => new Map((mtr?.cau_hoi ?? []).map((c) => [c.khoa, c.yccd])), [mtr]);
  const daChonThem = useMemo(() => new Map((mtr?.cau_hoi ?? []).map((c) => [c.khoa, c.yccd_them ?? []])), [mtr]);
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

      {chungMoiHon && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Ma trận chung của tổ vừa được cập nhật (bản {chungMoiHon.phienBan}, xác nhận {new Date(chungMoiHon.xacNhanLuc).toLocaleDateString('vi-VN')}) sau khi ma trận riêng này được xác nhận.
          Thầy cô mở lại, đối chiếu với ma trận chung mới rồi xác nhận lại. Bản đặc tả và đề làm từ ma trận riêng này cũng cần kiểm tra lại.
        </div>
      )}
      {cachLap === 'MA_TRAN_CHUNG' && khoMtc?.banChoXacNhan && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span>
            Ma trận chung có <b>bản {khoMtc.banChoXacNhan.phienBan}</b> (sửa lúc {new Date(khoMtc.banChoXacNhan.taiLenLuc).toLocaleString('vi-VN')}) đang <b>chờ xác nhận</b>.
            Bước này vẫn dùng bản {khoMtc.phienBan ?? 'đã xác nhận'}. Tổ trưởng xác nhận bản mới thì ma trận riêng, đặc tả mới cập nhật theo.
          </span>
          <Link href="/ma-tran-chung" className={nutChinh}>Mở Ma trận chung để xác nhận</Link>
        </div>
      )}
      {thongBao && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{thongBao}</div>}

      {buoc === 0 && dangDung && maMon && (
        maMon === 'TIENG_VIET'
          ? <DungTiengViet key={`${maMon}-${kyDung}`} ky={kyDung} onDung={nhanKhungDung} onQuayLai={() => setDangDung(false)} />
          : <DungTuChuongTrinh key={`${maMon}-${kyDung}`} maMon={maMon} tenMon={tenMonDangChon} ky={kyDung} onDung={nhanKhungDung} onQuayLai={() => setDangDung(false)} />
      )}

      {/* Bước 1: chọn môn */}
      {buoc === 0 && !dangDung && (
        <div className="the-tke p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chọn môn kiểm tra</h2>
            <p className="text-sm text-slate-600">Năm học 2026 – 2027, Lớp 4. Chọn môn và kì kiểm tra.</p>
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
                onClick={() => setMaMon(m.ma_mon)}
                className={`rounded-xl border p-4 text-left transition ${maMon === m.ma_mon ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
              >
                <div className="font-semibold text-slate-900">{m.mon}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {m.bai_kiem_tra.length > 1 ? 'Bài Đọc và bài Viết, mỗi bài 10 điểm' : '10 điểm'}
                  {m.thoi_gian_phut ? ` · ${m.thoi_gian_phut} phút` : ''}
                </div>
              </button>
            ))}
          </div>
          {(
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900 mb-1">Kì kiểm tra</legend>
              <div className="flex flex-wrap gap-2">
                {DANH_SACH_KY.map((k) => (
                  <label key={k.ma} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${kyDung === k.ma ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" className="sr-only" name="ky-kiem-tra" checked={kyDung === k.ma} onChange={() => setKyDung(k.ma)} />
                    {k.ten}
                  </label>
                ))}
              </div>
              {cachLap === 'CHUONG_TRINH' && <p className="text-xs text-slate-500 mt-1">Ứng dụng tự lọc các bài đúng giai đoạn của kì đã chọn, thầy tick bài cần dùng ở bước sau.</p>}
            </fieldset>
          )}
          {cachLap === 'MA_TRAN_CHUNG' && maMon && (
            dangTaiKho ? (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang đọc ma trận chung trong kho…</div>
            ) : khoMtc?.mtc ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                Dùng ma trận chung tổ đã xác nhận: <b>{khoMtc.tenFile}</b> (bản {khoMtc.phienBan}).
                {khoMtc.canhBao.length > 0 && <> App đọc bảng có <b>{khoMtc.canhBao.length} chỗ cần xem lại</b>, hiện ở bước sau.</>}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                <div>
                  {khoMtc?.loi
                    ? <>Chưa dùng được ma trận chung{khoMtc.tenFile ? <> <b>{khoMtc.tenFile}</b></> : null}: {khoMtc.loi}</>
                    : <>Tổ chưa có ma trận chung đã xác nhận cho môn và kì này. Tổ trưởng tải file ở mục <Link href="/ma-tran-chung" className="underline font-medium">Ma trận chung</Link>, hoặc chọn &quot;Dựng từ chương trình&quot;.</>}
                </div>
                {kyDung === 'CUOI_HK1' && !dungMauCo && (
                  <button type="button" className={nutPhu} onClick={() => setDungMauCo(true)}>Tạm dùng mẫu Cuối HKI có sẵn trong app</button>
                )}
                {dungMauCo && <div className="text-xs">Đang dùng mẫu có sẵn trong app (Cuối HKI). Mẫu này không tự cập nhật theo file của tổ.</div>}
              </div>
            )
          )}
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
              Mỗi câu gắn một YCCĐ; câu có nhiều ý nhỏ (a, b, c…) gắn thêm được, tối đa bằng số ý. Nguồn Ma trận chung: câu chỉ có một YCCĐ được chọn sẵn. Số câu, mức, TN/TL, điểm lấy theo ma trận chung; cần thì sửa ngay tại câu, ô đã sửa có viền vàng và nút khôi phục.
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
                        (() => {
                          const luaChonYccd = (giaTri: string) => (nguonCT && !khungDungHienTai ? (
                            <>
                              {giaTri && !dsYccdCT?.includes(giaTri) && <option value={giaTri}>{giaTri} (không có trong Kho chương trình)</option>}
                              {nhomYccdCT.map(([mach, ds]) => (
                                <optgroup key={mach} label={mach}>{ds.map((y) => <option key={y} value={y}>{y}</option>)}</optgroup>
                              ))}
                            </>
                          ) : c.dong.yccd.map((y) => <option key={y} value={y}>{y}</option>));
                          const them = daChonThem.get(c.khoa) ?? [];
                          const toiDa = soYccdToiDa(c.cau);
                          const conYccdKhac = nguonCT && !khungDungHienTai ? true : c.dong.yccd.some((y) => y !== gt && !them.includes(y));
                          return (
                            <div className="space-y-1.5">
                              <select
                                aria-label={`YCCĐ của câu ${c.cau.cau}`}
                                className={`w-full rounded-lg border px-3 py-2 text-sm ${gt ? 'border-slate-300' : 'border-amber-400 bg-amber-50'}`}
                                value={gt}
                                onChange={(e) => chonYccd(c.khoa, e.target.value)}
                              >
                                <option value="">– Chọn YCCĐ –</option>
                                {luaChonYccd(gt)}
                              </select>
                              {them.map((y, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <select
                                    aria-label={`YCCĐ thêm ${i + 1} của câu ${c.cau.cau}`}
                                    className="w-full rounded-lg border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-sm"
                                    value={y}
                                    onChange={(e) => datYccdThem(c.khoa, them.map((x, j) => (j === i ? e.target.value : x)))}
                                  >
                                    <option value="">– Chọn YCCĐ –</option>
                                    {luaChonYccd(y)}
                                  </select>
                                  <button type="button" className="p-1.5 rounded hover:bg-red-50 text-red-700 shrink-0" title="Bỏ YCCĐ này" aria-label={`Bỏ YCCĐ thêm ${i + 1} của câu ${c.cau.cau}`} onClick={() => datYccdThem(c.khoa, them.filter((_, j) => j !== i))}>
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              {toiDa > 1 && gt && 1 + them.length < toiDa && conYccdKhac && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
                                  onClick={() => {
                                    const goiY = nguonCT && !khungDungHienTai ? '' : c.dong.yccd.find((x) => x !== gt && !them.includes(x)) ?? '';
                                    datYccdThem(c.khoa, [...them, goiY]);
                                  }}
                                >
                                  <Plus className="w-4 h-4" /> Thêm YCCĐ cho ý khác (câu có {toiDa} ý {c.cau.y_nho?.join(', ')})
                                </button>
                              )}
                            </div>
                          );
                        })()
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
              <button type="button" className={nutPhu} disabled={dangLuuHeThong} onClick={() => void (tuXacNhan ? luuTuDong() : luuNhap())} title={tuXacNhan ? 'Lưu, app tự kiểm tra; không có lỗi thì dùng ngay và cập nhật đặc tả' : undefined}>{dangLuuHeThong ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {tuXacNhan ? 'Lưu' : 'Lưu bản nháp'}</button>
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
              <button type="button" className={nutPhu} disabled={dangLuuHeThong} onClick={() => void (tuXacNhan ? luuTuDong() : luuNhap())} title={tuXacNhan ? 'Lưu, app tự kiểm tra; không có lỗi thì dùng ngay và cập nhật đặc tả' : undefined}>{dangLuuHeThong ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {tuXacNhan ? 'Lưu' : 'Lưu bản nháp'}</button>
              {mtr.trang_thai === 'DA_XAC_NHAN' && phienBanXacNhan !== null ? (
                <Link href={`/dac-ta?mon=${mtc.ma_mon}&ky=${mtc.ky_kiem_tra}`} className={nutChinh}>
                  <ListChecks className="w-4 h-4" /> Sang bước 3: Đặc tả
                </Link>
              ) : (
                !tuXacNhan && <button type="button" className={nutChinh} disabled={!daXemTruoc || mtr.trang_thai === 'DA_XAC_NHAN' || dangLuuHeThong} onClick={() => void xacNhan()}>
                  <CheckCircle2 className="w-4 h-4" /> {mtr.trang_thai === 'DA_XAC_NHAN' ? 'Đã xác nhận' : 'Xác nhận ma trận'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
