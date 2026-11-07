'use client';

/**
 * Tạo đề (MOD-05) – bước 4 của quy trình tạo đề.
 * Đề kế thừa đặc tả ĐÃ XÁC NHẬN: mỗi dòng đặc tả một câu. Thầy nhập đề bài, phương án, đáp án, hướng dẫn chấm.
 * Mức, hình thức, dạng câu, điểm lấy từ đặc tả, không sửa ở đây. Ứng dụng không tự bịa đề hay đáp án.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Eye, FilePlus2, ImagePlus, Square, Trash2, Loader2, RefreshCw, Save, Send, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { BaiDocTiengViet } from '@/components/de/BaiDocTiengViet';
import { XemTruocDe } from '@/components/de/XemTruocDe';
import { svgSangHinh, xuLyAnhDe } from '@/core/utils/anh-de';
import { taoNoiDungTiengVietRong, type NoiDungTiengViet } from '@/core/de/tieng-viet';
import type { KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import { xepDongTheoCau, type DacTa } from '@/core/dac-ta/dac-ta';
import {
  NHAN_LUA_CHON,
  TOI_DA_HINH_MOT_CAU,
  cauDaXong,
  chenKhungVaoDeBai,
  doiKhungTrongDeBai,
  soKhungTrongDeBai,
  xoaKhungKhoiDeBai,
  type HinhCau,
  dungLaiDe,
  kiemDinhDe,
  nhanCau,
  taoDeTuDacTa,
  tienDoDe,
  trangThaiDeSauKhiSua,
  trangThaiDeSauKiemDinh,
  type CauDe,
  type DeKiemTra,
  type KetQuaKiemDinhDe,
  type NoiDungCau,
  type TrangThaiDe,
} from '@/core/de/de';

interface BanDacTaApi { id: string; phienBan: number | null; duLieu: DacTa }
interface BanDeApi { id: string; trangThai: TrangThaiDe; dacTaId: string; phienBanDacTa: number; duLieu: DeKiemTra }

const NHAN_TRANG_THAI: Record<TrangThaiDe, { ten: string; mau: string }> = {
  BAN_NHAP: { ten: 'Đang soạn', mau: 'bg-slate-100 text-slate-700 border-slate-200' },
  CAN_KIEM_TRA: { ten: 'Đã kiểm tra, chưa chuyển duyệt', mau: 'bg-blue-50 text-blue-700 border-blue-200' },
  CO_LOI: { ten: 'Có lỗi cần sửa', mau: 'bg-red-50 text-red-700 border-red-200' },
  SAN_SANG_DUYET: { ten: 'Sẵn sàng duyệt', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CAN_KIEM_TRA_LAI: { ten: 'Cần kiểm tra lại', mau: 'bg-amber-50 text-amber-800 border-amber-200' },
  DA_DUYET: { ten: 'Đã duyệt', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  TRA_LAI: { ten: 'Bị trả lại, cần sửa', mau: 'bg-red-50 text-red-700 border-red-200' },
};

const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white w-full';
const fmtDiem = (x: number) => String(x).replace('.', ',');
const TEN_MUC = ['', 'Mức 1', 'Mức 2', 'Mức 3'];
const TEN_DANG: Record<string, string> = { NLC: 'Nhiều lựa chọn', DS: 'Đúng/Sai', TLN: 'Trả lời ngắn', NOI: 'Nối', DIEN: 'Điền', VIET: 'Viết' };

async function goiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; j: T & { error?: string } }> {
  try {
    const r = await fetch(url, init);
    return { ok: r.ok, status: r.status, j: (await r.json().catch(() => ({}))) as T & { error?: string } };
  } catch {
    return { ok: false, status: 0, j: { error: 'Không kết nối được hệ thống.' } as T & { error?: string } };
  }
}

export default function TaoDePage() {
  const [maMon, setMaMon] = useState('TOAN');
  const [ky, setKy] = useState<KyDung>('CUOI_HK1');
  const [dangTai, setDangTai] = useState(false);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [dacTaBan, setDacTaBan] = useState<BanDacTaApi | null>(null); // đặc tả đã xác nhận mới nhất
  const [de, setDe] = useState<DeKiemTra | null>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiDe>('BAN_NHAP');
  const [ketQua, setKetQua] = useState<KetQuaKiemDinhDe | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [deCu, setDeCu] = useState<DeKiemTra | null>(null); // đề theo đặc tả cũ
  const [truong, setTruong] = useState('TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN');
  const [namHoc, setNamHoc] = useState('2026 - 2027');
  const [phut, setPhut] = useState(35);
  const [dangXuat, setDangXuat] = useState(false);
  const [xemTruoc, setXemTruoc] = useState(false);
  const [loiHinh, setLoiHinh] = useState<Record<string, string>>({});
  const conTro = useRef<Record<string, number>>({});
  const [veAI, setVeAI] = useState<Record<string, { mo?: boolean; moTa: string; dich: number | null; dang?: boolean; loi?: string; xem?: HinhCau }>>({});
  const [goiY, setGoiY] = useState<Record<string, { dang?: boolean; text?: string; canh?: string }>>({});

  useEffect(() => {
    try {
      setTruong(localStorage.getItem('tke.truong') || 'TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN');
      setNamHoc(localStorage.getItem('tke.namHoc') || '2026 - 2027');
      setPhut(Number(localStorage.getItem('tke.phut')) || 35);
    } catch { /* không có localStorage */ }
    const p = new URLSearchParams(window.location.search);
    const m = p.get('mon');
    const k = p.get('ky');
    if (m && MAU_MA_TRAN_CHUNG.some((x) => x.ma_mon === m)) setMaMon(m);
    if (k && DANH_SACH_KY.some((x) => x.ma === k)) setKy(k as KyDung);
  }, []);

  const nap = useCallback(async () => {
    setDangTai(true);
    setLoiTai(null);
    setThongBao(null);
    setKetQua(null);
    setDe(null);
    setDeCu(null);
    setDacTaBan(null);
    const [dt, d] = await Promise.all([
      goiJson<{ moiNhat: BanDacTaApi | null }>(`/api/dac-ta?mon=${maMon}&ky=${ky}`),
      goiJson<{ de: BanDeApi | null }>(`/api/de-kiem-tra?mon=${maMon}&ky=${ky}`),
    ]);
    if (!dt.ok) { setLoiTai(dt.j.error ?? 'Không đọc được bản đặc tả.'); setDangTai(false); return; }
    const moiNhat = dt.j.moiNhat;
    setDacTaBan(moiNhat);
    if (!moiNhat) { setDangTai(false); return; }
    if (!d.ok) { setLoiTai(d.j.error ?? 'Không đọc được đề kiểm tra.'); setDangTai(false); return; }
    const ban = d.j.de;
    if (ban) {
      setDe(maMon === 'TIENG_VIET' && !ban.duLieu.tiengViet ? { ...ban.duLieu, tiengViet: taoNoiDungTiengVietRong() } : ban.duLieu);
      setTrangThai(ban.trangThai);
      if (ban.phienBanDacTa < (moiNhat.phienBan ?? 0)) {
        setDeCu(ban.duLieu);
        setTrangThai('CAN_KIEM_TRA_LAI');
      }
    } else setTrangThai('BAN_NHAP');
    setDangTai(false);
  }, [maMon, ky]);

  useEffect(() => { void nap(); }, [nap]);

  const taoMoi = () => {
    if (!dacTaBan) return;
    setDe(taoDeTuDacTa(dacTaBan.duLieu, dacTaBan.phienBan ?? 1));
    setTrangThai('BAN_NHAP');
    setKetQua(null);
    setThongBao('Đã tạo khung đề từ đặc tả. Nhập đề bài, phương án và đáp án cho từng câu rồi lưu bản nháp.');
  };

  const dungLai = () => {
    if (!dacTaBan || !deCu) return;
    const kq = dungLaiDe(dacTaBan.duLieu, dacTaBan.phienBan ?? 1, deCu);
    setDe(kq.de);
    setDeCu(null);
    setTrangThai('CAN_KIEM_TRA_LAI');
    setKetQua(null);
    setThongBao(`Đã dựng lại theo đặc tả phiên bản ${dacTaBan.phienBan}, giữ nội dung câu còn lại.${kq.moi.length ? ` Câu mới cần soạn: ${kq.moi.length}.` : ''}${kq.bo.length ? ` Câu không còn trong đặc tả: ${kq.bo.length}.` : ''}`);
  };

  const suaCau = (khoa: string, p: Partial<NoiDungCau>) => {
    setDe((d) => (d ? { ...d, cau: d.cau.map((c) => (c.khoa === khoa ? { ...c, ...p } : c)) } : d));
    setTrangThai((t) => trangThaiDeSauKhiSua(t));
    setKetQua(null);
  };
  const suaLuaChon = (c: CauDe, i: number, v: string) => {
    const moi = [...c.luaChon];
    while (moi.length <= i) moi.push('');
    moi[i] = v;
    suaCau(c.khoa, { luaChon: moi });
  };

  const nhoAI = async (c: CauDe) => {
    setGoiY((g) => ({ ...g, [c.khoa]: { dang: true } }));
    const r = await goiJson<{ huongDan?: string; lechDiem?: number | null }>('/api/de-kiem-tra/goi-y-cham', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mon: maMon, cau: { deBai: c.deBai, luaChon: c.luaChon, dapAn: c.dapAn, diem: c.diem, dang: c.dang, hinhThuc: c.hinhThuc, muc: c.muc, yccd: c.yccd } }),
    });
    if (!r.ok || !r.j.huongDan) { setGoiY((g) => ({ ...g, [c.khoa]: { canh: r.j.error ?? 'AI chưa trả lời được.' } })); return; }
    setGoiY((g) => ({ ...g, [c.khoa]: { text: r.j.huongDan, canh: r.j.lechDiem != null ? `Tổng điểm các ý AI ghi là ${fmtDiem(r.j.lechDiem)}, chưa bằng ${fmtDiem(c.diem)}. Thầy sửa lại điểm từng ý.` : undefined } }));
  };

  const KHUNG_TRONG: HinhCau = { ten: '', chuThich: '', anh: '', rong: 0, cao: 0 };

  const themKhung = (c: CauDe) => {
    const co = c.hinh ?? [];
    if (co.length >= TOI_DA_HINH_MOT_CAU) { setLoiHinh((l) => ({ ...l, [c.khoa]: `Mỗi câu tối đa ${TOI_DA_HINH_MOT_CAU} hình.` })); return; }
    setLoiHinh((l) => ({ ...l, [c.khoa]: '' }));
    suaCau(c.khoa, { deBai: chenKhungVaoDeBai(c.deBai, co.length + 1, conTro.current[c.khoa]), hinh: [...co, { ...KHUNG_TRONG }] });
  };
  const taiVaoKhung = async (c: CauDe, i: number, f: File | undefined) => {
    if (!f) return;
    try {
      const h = await xuLyAnhDe(f);
      suaCau(c.khoa, { hinh: (c.hinh ?? []).map((x, k) => (k === i ? { ...h, chuThich: x.chuThich } : x)) });
      setLoiHinh((l) => ({ ...l, [c.khoa]: '' }));
    } catch (e) { setLoiHinh((l) => ({ ...l, [c.khoa]: e instanceof Error ? e.message : String(e) })); }
  };
  /** Tải nhiều ảnh: ảnh lần lượt vào các khung còn trống, thừa thì thành hình mới (in thành hàng sau đề bài). */
  const themHinh = async (c: CauDe, files: FileList | null) => {
    if (!files?.length) return;
    const ds = [...(c.hinh ?? [])];
    const loi: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const h = await xuLyAnhDe(f);
        const trong = ds.findIndex((x) => !x.anh);
        if (trong >= 0) ds[trong] = { ...h, chuThich: ds[trong].chuThich };
        else if (ds.length >= TOI_DA_HINH_MOT_CAU) { loi.push(`Mỗi câu tối đa ${TOI_DA_HINH_MOT_CAU} hình.`); break; } else ds.push(h);
      } catch (e) { loi.push(e instanceof Error ? e.message : String(e)); }
    }
    setLoiHinh((l) => ({ ...l, [c.khoa]: loi.join(' ') }));
    suaCau(c.khoa, { hinh: ds });
  };
  const suaHinh = (c: CauDe, i: number, p: { chuThich?: string; xoa?: boolean; doi?: number }) => {
    const ds = [...(c.hinh ?? [])];
    let deBai = c.deBai;
    if (p.xoa) { ds.splice(i, 1); deBai = xoaKhungKhoiDeBai(deBai, i + 1); }
    else if (p.doi) { const j = i + p.doi; if (j >= 0 && j < ds.length) { [ds[i], ds[j]] = [ds[j], ds[i]]; deBai = doiKhungTrongDeBai(deBai, i + 1, j + 1); } }
    else ds[i] = { ...ds[i], chuThich: p.chuThich ?? ds[i].chuThich };
    suaCau(c.khoa, { hinh: ds, deBai });
  };

  const moVeAI = (c: CauDe, dich: number | null) => setVeAI((v) => ({ ...v, [c.khoa]: { moTa: (dich !== null ? c.hinh?.[dich]?.moTa : v[c.khoa]?.moTa) ?? '', dich, mo: true } }));
  const veHinhAI = async (c: CauDe) => {
    const cu = veAI[c.khoa];
    if (!cu) return;
    setVeAI((v) => ({ ...v, [c.khoa]: { ...cu, dang: true, loi: undefined, xem: undefined } }));
    const r = await goiJson<{ svg?: string; rong?: number; cao?: number }>('/api/de-kiem-tra/ve-hinh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mon: maMon, deBai: c.deBai, luaChon: c.luaChon, moTa: cu.moTa }),
    });
    if (!r.ok || !r.j.svg) { setVeAI((v) => ({ ...v, [c.khoa]: { ...cu, loi: r.j.error ?? 'AI chưa vẽ được.' } })); return; }
    try {
      const h = await svgSangHinh(r.j.svg, r.j.rong ?? 400, r.j.cao ?? 250, cu.moTa);
      setVeAI((v) => ({ ...v, [c.khoa]: { ...cu, xem: h } }));
    } catch (e) { setVeAI((v) => ({ ...v, [c.khoa]: { ...cu, loi: e instanceof Error ? e.message : String(e) } })); }
  };
  /** Dùng hình AI vẽ: vào khung được chọn, hoặc khung trống đầu tiên, hoặc khung mới (tự đặt vị trí ở cuối đề bài, trước các phương án). */
  const dungHinhAI = (c: CauDe) => {
    const v = veAI[c.khoa];
    if (!v?.xem) return;
    const ds = [...(c.hinh ?? [])];
    let deBai = c.deBai;
    let i = v.dich !== null && v.dich < ds.length ? v.dich : ds.findIndex((x) => !x.anh);
    if (i < 0) {
      if (ds.length >= TOI_DA_HINH_MOT_CAU) { setVeAI((x) => ({ ...x, [c.khoa]: { ...v, loi: `Mỗi câu tối đa ${TOI_DA_HINH_MOT_CAU} hình. Xóa bớt một hình.` } })); return; }
      ds.push({ ...KHUNG_TRONG });
      i = ds.length - 1;
      deBai = chenKhungVaoDeBai(deBai, i + 1);
    }
    ds[i] = { ...v.xem, chuThich: ds[i].chuThich };
    suaCau(c.khoa, { hinh: ds, deBai });
    setVeAI((x) => ({ ...x, [c.khoa]: { moTa: v.moTa, dich: null } }));
  };

  const suaTiengViet = (g: NoiDungTiengViet) => {
    setDe((d) => (d ? { ...d, tiengViet: g } : d));
    setTrangThai((t) => trangThaiDeSauKhiSua(t));
    setKetQua(null);
  };

  const kiemTra = (): KetQuaKiemDinhDe | null => {
    if (!dacTaBan || !de) return null;
    const kq = kiemDinhDe(dacTaBan.duLieu, de, { phienBanDacTaMoiNhat: dacTaBan.phienBan ?? undefined });
    setKetQua(kq);
    setTrangThai((t) => trangThaiDeSauKiemDinh(t, kq));
    return kq;
  };

  const gui = async (tt: TrangThaiDe) => {
    if (!dacTaBan || !de) return;
    setDangGui(true);
    const r = await goiJson<{ ban?: BanDeApi; kiemDinh?: KetQuaKiemDinhDe }>('/api/de-kiem-tra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mon: maMon, ky, dacTaId: dacTaBan.id, de, trangThai: tt }),
    });
    setDangGui(false);
    if (!r.ok) { setThongBao(r.status === 403 ? `Chưa lưu được: ${r.j.error ?? 'tài khoản này chỉ được xem.'}` : `Chưa lưu được: ${r.j.error}`); return; }
    if (r.j.ban) setTrangThai(r.j.ban.trangThai);
    if (r.j.kiemDinh) setKetQua(r.j.kiemDinh);
    setThongBao(tt === 'SAN_SANG_DUYET' ? 'Đã chuyển đề sang bước duyệt. Cả tổ cùng thấy bản này.' : 'Đã lưu đề lên hệ thống. Cả tổ cùng thấy bản này.');
  };

  const xuatWord = async (hoSo = false) => {
    setDangXuat(true);
    try {
      try { localStorage.setItem('tke.truong', truong); localStorage.setItem('tke.namHoc', namHoc); localStorage.setItem('tke.phut', String(phut)); } catch { /* bỏ qua */ }
      const q = new URLSearchParams({ mon: maMon, ky, truong, namHoc, phut: String(phut), ...(hoSo ? { goi: 'hoso' } : {}) });
      const r = await fetch(`/api/de-kiem-tra/xuat?${q}`);
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setThongBao(`Chưa xuất được: ${j.error ?? 'lỗi không rõ.'}`);
      } else {
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = `${hoSo ? 'HoSo' : 'De'}-${maMon}-${ky}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        setThongBao(hoSo ? 'Đã xuất bộ hồ sơ (ma trận, đặc tả, đề, hướng dẫn chấm) từ bản đề đã lưu.' : 'Đã xuất tệp Word (đề và hướng dẫn chấm) từ bản đề đã lưu. Nếu vừa sửa, thầy bấm Lưu bản nháp trước khi xuất.');
      }
    } catch {
      setThongBao('Chưa xuất được: không kết nối được hệ thống.');
    }
    setDangXuat(false);
  };

  const tenMon = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon)?.mon ?? maMon;
  const nhan = NHAN_TRANG_THAI[trangThai];
  const tienDo = useMemo(() => (de ? tienDoDe(de) : { xong: 0, tong: 0 }), [de]);
  const nhom = useMemo(() => {
    const dong = new Map((dacTaBan?.duLieu.dong ?? []).map((r) => [r.khoa, r]));
    const m = new Map<string, CauDe[]>();
    for (const c of xepDongTheoCau(de?.cau ?? [])) {
      const r = dong.get(c.khoa);
      const ten = r ? `${r.baiKiemTra}${r.phan ? ` – ${r.phan}` : ''}` : 'Câu khác';
      m.set(ten, [...(m.get(ten) ?? []), c]);
    }
    return [...m.entries()];
  }, [de, dacTaBan]);
  const tongDiem = Math.round((de?.cau.reduce((s, c) => s + c.diem, 0) ?? 0) * 100) / 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <TienTrinh5Buoc buocHienTai={4} daXong={[1, 2, 3]} choBam />

      <div className="the-tke p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0"><Sparkles className="w-7 h-7" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tạo đề kiểm tra</h1>
            <p className="text-sm text-slate-600 mt-1">Mỗi dòng đặc tả là một câu. Thầy nhập đề bài, phương án, đáp án và hướng dẫn chấm; mức, dạng câu và điểm lấy từ đặc tả.</p>
          </div>
        </div>
        {de && <span className={`self-start md:self-auto rounded-full border px-3 py-1 text-sm font-medium ${nhan.mau}`}>{nhan.ten}</span>}
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
        <span className="text-sm text-slate-500 pb-2">Lớp 4{dacTaBan?.phienBan ? ` · đặc tả phiên bản ${dacTaBan.phienBan}` : ''}</span>
        {dangTai && <Loader2 className="w-4 h-4 animate-spin text-blue-700 mb-2.5" />}
      </div>

      {thongBao && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{thongBao}</div>}
      {loiTai && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loiTai}</div>}

      {!dangTai && !loiTai && !dacTaBan && (
        <div className="the-tke p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Chưa có đặc tả đã xác nhận</h2>
          <p className="text-sm text-slate-600">Đề chỉ tạo từ đặc tả đã xác nhận của {tenMon}, {DANH_SACH_KY.find((k) => k.ma === ky)?.ten}. Thầy lập và xác nhận đặc tả ở bước 3.</p>
          <Link href={`/dac-ta?mon=${maMon}&ky=${ky}`} className={nutChinh}><ArrowLeft className="w-4 h-4" /> Về bước 3: Đặc tả</Link>
        </div>
      )}

      {dacTaBan && !de && !dangTai && !loiTai && (
        <div className="the-tke p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Tạo khung đề cho {tenMon}</h2>
          <p className="text-sm text-slate-600">Ứng dụng dựng sẵn {dacTaBan.duLieu.dong.length} câu theo đặc tả phiên bản {dacTaBan.phienBan}. Nội dung để trống, thầy nhập từng câu.</p>
          <button type="button" className={nutChinh} onClick={taoMoi}><FilePlus2 className="w-4 h-4" /> Tạo khung đề từ đặc tả</button>
        </div>
      )}

      {deCu && dacTaBan && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span>Đặc tả đã có phiên bản {dacTaBan.phienBan}, đề này đang theo phiên bản {deCu.phien_ban_dac_ta}. Dựng lại để khớp đặc tả mới; nội dung các câu còn lại được giữ nguyên.</span>
          <button type="button" className={nutChinh} onClick={dungLai}><RefreshCw className="w-4 h-4" /> Dựng lại theo đặc tả mới</button>
        </div>
      )}

      {de && dacTaBan && !deCu && (
        <>
          <div className="the-tke p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700">
            <span>{de.cau.length} câu · tổng <b>{fmtDiem(tongDiem)}</b> điểm</span>
            <span>Đã soạn xong <b>{tienDo.xong}/{tienDo.tong}</b> câu</span>
            <div className="h-2 w-40 rounded-full bg-slate-200 overflow-hidden" aria-hidden>
              <div className="h-full bg-emerald-500" style={{ width: `${tienDo.tong ? (tienDo.xong / tienDo.tong) * 100 : 0}%` }} />
            </div>
          </div>

          {de.tiengViet && <BaiDocTiengViet ky={ky as KyKiemTraBaiDoc} gia={de.tiengViet} onDoi={suaTiengViet} />}

          <div className="space-y-4">
            {nhom.map(([ten, cauNhom]) => (
              <div key={ten} className="the-tke p-4 space-y-3">
                <h2 className="font-semibold text-slate-900">{ten}</h2>
                <div className="divide-y divide-slate-100">
                  {cauNhom.map((c) => (
                    <div key={c.khoa} className="py-4 space-y-2">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-semibold text-slate-900">{nhanCau(c)}{c.yNho ? ` (${c.yNho.join(', ')})` : ''}</span>
                        <span className="text-xs text-slate-500">{TEN_MUC[c.muc]} · {c.hinhThuc}{c.dang ? ` · ${TEN_DANG[c.dang] ?? c.dang}` : ''} · {fmtDiem(c.diem)} điểm</span>
                        {cauDaXong(c) && <span className="text-xs text-emerald-700">Đã đủ</span>}
                      </div>
                      <div className="text-xs text-slate-500">YCCĐ: {c.yccd || 'chưa có'}</div>

                      <label className="block text-xs text-slate-500">Đề bài
                        <textarea aria-label={`Đề bài ${nhanCau(c)}`} rows={3} className={`${o} mt-0.5 ${c.deBai.trim() ? '' : 'border-amber-400 bg-amber-50'}`} value={c.deBai} onChange={(e) => { conTro.current[c.khoa] = e.target.selectionStart; suaCau(c.khoa, { deBai: e.target.value }); }} onSelect={(e) => { conTro.current[c.khoa] = e.currentTarget.selectionStart; }} onBlur={(e) => { conTro.current[c.khoa] = e.currentTarget.selectionStart; }} />
                      </label>

                      <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">Hình minh họa</span>
                          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => themKhung(c)}>
                            <Square className="w-3.5 h-3.5" /> Thêm khung hình tại vị trí con trỏ
                          </button>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <ImagePlus className="w-3.5 h-3.5" /> Tải hình từ máy
                            <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={`Thêm hình ${nhanCau(c)}`} onChange={(e) => { void themHinh(c, e.target.files); e.target.value = ''; }} />
                          </label>
                          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100" onClick={() => moVeAI(c, null)}>
                            <Wand2 className="w-3.5 h-3.5" /> AI vẽ hình theo đề bài
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">Muốn hình nằm đúng chỗ: đặt con trỏ vào đề bài rồi bấm &quot;Thêm khung hình&quot;. Khung hiện thành dòng [Hình 1] trong đề bài, sau đó thầy tải hình hoặc nhờ AI vẽ vào khung. Hình không có khung sẽ in thành một hàng dưới đề bài. Tối đa {TOI_DA_HINH_MOT_CAU} hình, app tự chuyển đen trắng.</p>
                        {loiHinh[c.khoa] && <div className="text-xs text-red-700">{loiHinh[c.khoa]}</div>}

                        {veAI[c.khoa]?.mo && (
                          <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                            <div className="text-xs font-semibold text-violet-900">AI vẽ hình{veAI[c.khoa]?.dich != null ? ` cho khung hình ${(veAI[c.khoa]!.dich as number) + 1}` : ''}</div>
                            <textarea aria-label={`Mô tả hình ${nhanCau(c)}`} rows={2} className={o} placeholder="Mô tả hình cần vẽ (không bắt buộc). Ví dụ: 4 góc xếp một hàng, nhãn A, B, C, D: góc nhọn, góc vuông, góc tù, góc bẹt." value={veAI[c.khoa]?.moTa ?? ''} onChange={(e) => setVeAI((v) => ({ ...v, [c.khoa]: { ...v[c.khoa], moTa: e.target.value } }))} />
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className={nutChinh} disabled={veAI[c.khoa]?.dang || (!c.deBai.trim() && !veAI[c.khoa]?.moTa.trim())} onClick={() => void veHinhAI(c)}>
                                {veAI[c.khoa]?.dang ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {veAI[c.khoa]?.xem ? 'Vẽ lại' : 'Vẽ hình'}
                              </button>
                              <button type="button" className={nutPhu} onClick={() => setVeAI((v) => ({ ...v, [c.khoa]: { moTa: v[c.khoa]?.moTa ?? '', dich: null } }))}>Đóng</button>
                            </div>
                            {veAI[c.khoa]?.loi && <div className="text-xs text-amber-800">{veAI[c.khoa]?.loi}</div>}
                            {veAI[c.khoa]?.xem && (
                              <div className="space-y-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={veAI[c.khoa]!.xem!.anh} alt="Hình AI vẽ" className="mx-auto max-h-60 border border-slate-200 bg-white object-contain" />
                                <div className="text-xs text-violet-900">Hình do AI vẽ. Thầy kiểm tra số lượng, số đo và nhãn có đúng đề bài không, chưa vừa ý thì bấm Vẽ lại (có thể ghi thêm mô tả).</div>
                                <button type="button" className={nutChinh} onClick={() => dungHinhAI(c)}>Dùng hình này</button>
                              </div>
                            )}
                          </div>
                        )}

                        {(c.hinh ?? []).length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(c.hinh ?? []).map((h, i) => {
                              const coKhung = soKhungTrongDeBai(c.deBai).includes(i + 1);
                              return (
                                <div key={i} className="rounded-lg border border-slate-200 bg-white p-2 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <b>Khung hình {i + 1}</b>
                                    <span className={coKhung ? 'text-emerald-700' : 'text-slate-500'}>{coKhung ? `đã đặt ở [Hình ${i + 1}]` : 'in dưới đề bài'}</span>
                                  </div>
                                  {h.anh ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={h.anh} alt={h.chuThich || h.ten} className="mx-auto max-h-28 object-contain" />
                                  ) : (
                                    <div className="flex h-20 items-center justify-center rounded border-2 border-dashed border-slate-300 text-xs text-slate-500">Khung trống, chờ hình</div>
                                  )}
                                  <input aria-label={`Chú thích hình ${i + 1} ${nhanCau(c)}`} className={o} placeholder="Chú thích (vd: Hình A)" value={h.chuThich} onChange={(e) => suaHinh(c, i, { chuThich: e.target.value })} />
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">{h.anh ? 'Đổi hình' : 'Tải hình'}
                                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={`Tải hình vào khung ${i + 1} ${nhanCau(c)}`} onChange={(e) => { void taiVaoKhung(c, i, e.target.files?.[0]); e.target.value = ''; }} />
                                    </label>
                                    <button type="button" className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-violet-800" onClick={() => moVeAI(c, i)}>AI vẽ</button>
                                    <button type="button" className="rounded border px-1.5 py-1 disabled:opacity-40" disabled={i === 0} onClick={() => suaHinh(c, i, { doi: -1 })} aria-label="Dời khung lên trước">◀</button>
                                    <button type="button" className="rounded border px-1.5 py-1 disabled:opacity-40" disabled={i === (c.hinh ?? []).length - 1} onClick={() => suaHinh(c, i, { doi: 1 })} aria-label="Dời khung ra sau">▶</button>
                                    <button type="button" className="ml-auto inline-flex items-center gap-1 text-red-700" onClick={() => suaHinh(c, i, { xoa: true })}><Trash2 className="w-3 h-3" /> Xóa</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {c.dang === 'DS' ? (
                        <div className="space-y-1.5">
                          {(c.yNho ?? c.luaChon.map((_, i) => String.fromCharCode(97 + i))).map((y, i) => (
                            <label key={y} className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="w-6 font-semibold text-slate-700">{y})</span>
                              <input aria-label={`Ý ${y} ${nhanCau(c)}`} className={o} value={c.luaChon[i] ?? ''} onChange={(e) => suaLuaChon(c, i, e.target.value)} />
                            </label>
                          ))}
                        </div>
                      ) : c.hinhThuc === 'TN' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {NHAN_LUA_CHON.map((n, i) => (
                            <label key={n} className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="w-6 font-semibold text-slate-700">{n}.</span>
                              <input aria-label={`Phương án ${n} ${nhanCau(c)}`} className={o} placeholder={c.dang === 'NLC' ? '' : 'nếu có'} value={c.luaChon[i] ?? ''} onChange={(e) => suaLuaChon(c, i, e.target.value)} />
                            </label>
                          ))}
                        </div>
                      ) : null}

                      {c.dang !== 'VIET' && (
                        <label className="block text-xs text-slate-500">
                          {c.dang === 'NLC' ? 'Đáp án (A, B, C hoặc D)' : c.dang === 'DS' ? 'Đáp án (Đ hoặc S theo từng ý, ví dụ ĐSĐS)' : 'Đáp án'}
                          {c.dang === 'NLC' ? (
                            <select aria-label={`Đáp án ${nhanCau(c)}`} className={`${o} mt-0.5 sm:w-32`} value={c.dapAn} onChange={(e) => suaCau(c.khoa, { dapAn: e.target.value })}>
                              <option value="">Chọn…</option>
                              {NHAN_LUA_CHON.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          ) : (
                            <input aria-label={`Đáp án ${nhanCau(c)}`} className={`${o} mt-0.5 ${c.dapAn.trim() ? '' : 'border-amber-400 bg-amber-50'}`} value={c.dapAn} onChange={(e) => suaCau(c.khoa, { dapAn: e.target.value })} />
                          )}
                        </label>
                      )}

                      <label className="block text-xs text-slate-500">
                        {c.dang === 'VIET' || c.hinhThuc === 'TL' ? 'Hướng dẫn chấm (từng bước làm, điểm từng ý, lưu ý chấm)' : 'Hướng dẫn chấm (nếu cần)'}
                        <textarea aria-label={`Hướng dẫn chấm ${nhanCau(c)}`} rows={c.hinhThuc === 'TL' ? 4 : 2} className={`${o} mt-0.5`} placeholder={c.hinhThuc === 'TL' && c.dang !== 'VIET' ? 'Ví dụ:\nĐổi 3 tấn = 3 000 kg (0,5 điểm)\nĐổi 5 yến = 50 kg; 3 000 + 50 = 3 050 kg (0,5 điểm)\nLưu ý chấm: thiếu đơn vị trừ 0,25 điểm.' : ''} value={c.huongDanCham} onChange={(e) => suaCau(c.khoa, { huongDanCham: e.target.value })} />
                      </label>
                      {c.dang !== 'VIET' && c.deBai.trim() && c.dapAn.trim() && (
                        <div className="space-y-1.5">
                          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50" disabled={goiY[c.khoa]?.dang} onClick={() => void nhoAI(c)}>
                            {goiY[c.khoa]?.dang ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} AI viết hướng dẫn chấm chi tiết
                          </button>
                          {goiY[c.khoa]?.canh && <div className="text-xs text-amber-800">{goiY[c.khoa]?.canh}</div>}
                          {goiY[c.khoa]?.text && (
                            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                              <div className="text-xs font-semibold text-violet-900">Gợi ý của AI (thầy kiểm tra kĩ trước khi dùng)</div>
                              <div className="text-sm text-slate-800 whitespace-pre-line">{goiY[c.khoa]?.text}</div>
                              <div className="flex gap-2">
                                <button type="button" className={nutChinh} onClick={() => { suaCau(c.khoa, { huongDanCham: goiY[c.khoa]!.text! }); setGoiY((g) => ({ ...g, [c.khoa]: {} })); }}>Dùng gợi ý này</button>
                                <button type="button" className={nutPhu} onClick={() => setGoiY((g) => ({ ...g, [c.khoa]: {} }))}>Bỏ</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <label className="block text-xs text-slate-500">Hình, bảng, bài đọc đi kèm (mô tả để dàn trang)
                        <input aria-label={`Hình đi kèm ${nhanCau(c)}`} className={`${o} mt-0.5`} value={c.ghiChuHinh} onChange={(e) => suaCau(c.khoa, { ghiChuHinh: e.target.value })} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={nutPhu} onClick={() => setXemTruoc((v) => !v)}><Eye className="w-4 h-4" /> {xemTruoc ? 'Ẩn bản xem trước' : 'Xem trước đề và đáp án'}</button>
          </div>
          {xemTruoc && <XemTruocDe de={de} truong={truong} tenMon={tenMon} phut={phut} />}

          {ketQua && <div className="the-tke p-6"><ValidationPanel ketQua={ketQua} tieuDe="Kết quả kiểm tra đề" /></div>}

          {trangThai === 'SAN_SANG_DUYET' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-900">
              <span>Đề đã chuyển sang bước duyệt. Sửa bất kì câu nào, đề sẽ chuyển sang &quot;Cần kiểm tra lại&quot;.</span>
              <Link href={`/tests?mon=${maMon}&ky=${ky}`} className={nutChinh}>Sang bước 5: Duyệt đề</Link>
            </div>
          )}

          <div className="the-tke p-4 flex flex-wrap items-end gap-3 text-sm">
            <label className="flex-1 min-w-60">
              <span className="block text-slate-600 mb-1">Tên trường (in ở đầu đề)</span>
              <input aria-label="Tên trường" className={o} value={truong} onChange={(e) => setTruong(e.target.value)} />
            </label>
            <label>
              <span className="block text-slate-600 mb-1">Năm học</span>
              <input aria-label="Năm học" className={`${o} w-32`} value={namHoc} onChange={(e) => setNamHoc(e.target.value)} />
            </label>
            <label>
              <span className="block text-slate-600 mb-1">Thời gian (phút)</span>
              <input aria-label="Thời gian làm bài" type="number" min={5} max={120} className={`${o} w-28`} value={phut} onChange={(e) => setPhut(Number(e.target.value) || 35)} />
            </label>
            <button type="button" className={nutPhu} disabled={dangXuat} onClick={() => void xuatWord(false)}>
              {dangXuat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Xuất Word (đề + hướng dẫn chấm)
            </button>
            <button type="button" className={nutPhu} disabled={dangXuat} onClick={() => void xuatWord(true)}>
              <Download className="w-4 h-4" /> Xuất bộ hồ sơ
            </button>
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <Link href={`/dac-ta?mon=${maMon}&ky=${ky}`} className={nutPhu}><ArrowLeft className="w-4 h-4" /> Về đặc tả</Link>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={nutPhu} disabled={dangGui} onClick={() => void gui('BAN_NHAP')}><Save className="w-4 h-4" /> Lưu bản nháp</button>
              <button type="button" className={nutPhu} onClick={kiemTra}><ShieldCheck className="w-4 h-4" /> Kiểm tra đề</button>
              <button type="button" className={nutChinh} disabled={dangGui} onClick={() => { const kq = kiemTra(); if (kq?.hopLe) void gui('SAN_SANG_DUYET'); }}>
                {dangGui ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Chuyển sang duyệt
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
