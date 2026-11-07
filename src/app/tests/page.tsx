'use client';

/**
 * Kho đề kiểm tra (MOD-07) – bước 5: Duyệt đề.
 * Danh sách đề của trường theo môn, kì. Tổ trưởng xem lại đề, kiểm tra lần cuối, rồi Duyệt (lưu thành phiên bản không sửa được)
 * hoặc Trả lại kèm lý do. Sửa đề đã duyệt thì đề quay về "Cần kiểm tra lại" và phải duyệt lại.
 * Quy trình nhiều cấp: gửi thẩm định → tổ trưởng/người được phân công thẩm định → tổ trưởng xác nhận → Ban giám hiệu phê duyệt → phát hành.
 * Ai được bấm nút nào do cơ sở dữ liệu quyết định; trang này chỉ hiện các nút máy chủ báo là được phép.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Download, Loader2, Pencil } from 'lucide-react';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY } from '@/core/matrix/dung-tu-chuong-trinh';
import { kiemDinhDe, nhanCau, type DeKiemTra, type KetQuaKiemDinhDe, type TrangThaiDe } from '@/core/de/de';
import { demTieng } from '@/core/de/tieng-viet';
import { xepCauTheoSo } from '@/core/de/xuat-word';
import type { DacTa } from '@/core/dac-ta/dac-ta';

interface DongKho { id: string; maDe: string; maMon: string; ky: string; trangThai: TrangThaiDe; phamViXem: string; phienBanDacTa: number; capNhatLuc: string; duyetLuc: string | null; phienBanDaDuyetMoiNhat: number | null; nguoiTao: string | null; laChuDe: boolean; duocXoa: boolean; hanhDong: string[] }
interface BanDeApi { id: string; maDe: string; trangThai: TrangThaiDe; dacTaId: string; phienBanDacTa: number; duLieu: DeKiemTra; duyetLuc: string | null; ghiChuDuyet: string | null; phamViXem: string; laChuDe: boolean; nguoiTao: string | null; maMon: string; ky: string; hanhDong: string[] }
interface PhienBanDaDuyet { phienBan: number; phienBanDacTa: number; duyetLuc: string; ghiChu: string | null }
interface DongLichSu { id: string; hanhDong: string; tu: string | null; den: string | null; nguoi: string | null; vaiTro: string | null; ghiChu: string | null; phienBan: number | null; luc: string }
interface NhanXet { id: string; thanhPhan: string; noiDung: string; tacGia: string | null; daXuLy: boolean; luc: string }
interface NguoiDs { nguoi: string; ten: string | null }
interface ThanhVien { id: string; ten: string; vaiTro: string[] }
interface Quyen { duocPhanCong: boolean; laBgh: boolean; laToTruong: boolean; laQuanTri: boolean; vaiTro: string[] }

const NHAN: Record<TrangThaiDe, { ten: string; mau: string }> = {
  BAN_NHAP: { ten: 'Đang soạn', mau: 'bg-slate-100 text-slate-700 border-slate-200' },
  CAN_KIEM_TRA: { ten: 'Đang soạn (đã kiểm tra)', mau: 'bg-blue-50 text-blue-700 border-blue-200' },
  CO_LOI: { ten: 'Đang soạn (còn lỗi)', mau: 'bg-red-50 text-red-700 border-red-200' },
  CAN_KIEM_TRA_LAI: { ten: 'Cần kiểm tra lại', mau: 'bg-amber-50 text-amber-800 border-amber-200' },
  SAN_SANG_DUYET: { ten: 'Chờ thẩm định', mau: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DANG_THAM_DINH: { ten: 'Đang thẩm định', mau: 'bg-sky-50 text-sky-700 border-sky-200' },
  TRA_LAI: { ten: 'Bị trả lại', mau: 'bg-red-50 text-red-700 border-red-200' },
  DA_XAC_NHAN_TO: { ten: 'Tổ trưởng đã xác nhận', mau: 'bg-teal-50 text-teal-700 border-teal-200' },
  CHO_BGH_DUYET: { ten: 'Chờ Ban giám hiệu duyệt', mau: 'bg-violet-50 text-violet-700 border-violet-200' },
  DA_DUYET: { ten: 'Đã duyệt', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DA_PHAT_HANH: { ten: 'Đã phát hành', mau: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  DA_LUU_TRU: { ten: 'Đã lưu trữ', mau: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const TEN_HANH_DONG: Record<string, string> = {
  GUI_THAM_DINH: 'Gửi thẩm định', THU_HOI_VE_NHAP: 'Thu hồi về bản nháp', TAO_PHIEN_BAN_MOI: 'Tạo phiên bản mới để sửa', BAT_DAU_THAM_DINH: 'Bắt đầu thẩm định',
  DE_NGHI_DAT: 'Ghi nhận: đề đạt', YEU_CAU_CHINH_SUA: 'Yêu cầu chỉnh sửa', XAC_NHAN_TO: 'Xác nhận cấp tổ', CHUYEN_BGH: 'Chuyển lên Ban giám hiệu',
  PHE_DUYET: 'Phê duyệt', PHAT_HANH: 'Phát hành', THU_HOI_DE: 'Thu hồi đề', LUU_TRU: 'Lưu trữ', TAO_DE: 'Tạo đề', XOA_DE: 'Xóa đề',
};
const CAN_LY_DO = ['YEU_CAU_CHINH_SUA', 'THU_HOI_DE'];
const THU_TU_NUT = ['GUI_THAM_DINH', 'BAT_DAU_THAM_DINH', 'DE_NGHI_DAT', 'XAC_NHAN_TO', 'CHUYEN_BGH', 'PHE_DUYET', 'PHAT_HANH', 'YEU_CAU_CHINH_SUA', 'THU_HOI_VE_NHAP', 'TAO_PHIEN_BAN_MOI', 'THU_HOI_DE', 'LUU_TRU'];
const TEN_PHAM_VI: Record<string, string> = { RIENG_TU: 'Riêng tư (chỉ mình tôi, người được chia sẻ và người thẩm định)', TO: 'Cả tổ chuyên môn', TRUONG: 'Cả trường' };
const TEN_VAI_TRO_SD = (v: string | null) => (!v ? '' : v.startsWith('UY_QUYEN') ? 'được ủy quyền' : ({ CHU_DE: 'người soạn', TO_TRUONG: 'tổ trưởng', BGH: 'Ban giám hiệu', BGH_NGOAI_LE: 'Ban giám hiệu (thay tổ trưởng)', THAM_DINH_PHAN_CONG: 'người thẩm định được phân công' } as Record<string, string>)[v] ?? v);

const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const fmtDiem = (x: number) => String(x).replace('.', ',');
const tenMon = (ma: string) => MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === ma)?.mon ?? ma;
const tenKy = (ma: string) => DANH_SACH_KY.find((k) => k.ma === ma)?.ten ?? ma;
const ngay = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '');

async function goiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; j: T & { error?: string } }> {
  try {
    const r = await fetch(url, init);
    return { ok: r.ok, status: r.status, j: (await r.json().catch(() => ({}))) as T & { error?: string } };
  } catch {
    return { ok: false, status: 0, j: { error: 'Không kết nối được hệ thống.' } as T & { error?: string } };
  }
}
const post = (url: string, body: unknown) => goiJson<object>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function KhoDePage() {
  const [ds, setDs] = useState<DongKho[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [chonId, setChonId] = useState<string | null>(null);
  const [de, setDe] = useState<BanDeApi | null>(null);
  const [dacTa, setDacTa] = useState<{ duLieu: DacTa; phienBan: number | null } | null>(null);
  const [phienBan, setPhienBan] = useState<PhienBanDaDuyet[]>([]);
  const [lichSu, setLichSu] = useState<DongLichSu[]>([]);
  const [nhanXet, setNhanXet] = useState<NhanXet[]>([]);
  const [phanCong, setPhanCong] = useState<NguoiDs[]>([]);
  const [chiaSe, setChiaSe] = useState<NguoiDs[]>([]);
  const [thanhVien, setThanhVien] = useState<ThanhVien[]>([]);
  const [quyen, setQuyen] = useState<Quyen | null>(null);
  const [kq, setKq] = useState<KetQuaKiemDinhDe | null>(null);
  const [dangMo, setDangMo] = useState(false);
  const [kyDich, setKyDich] = useState('');
  const [dangChep, setDangChep] = useState(false);
  const [ketQuaChep, setKetQuaChep] = useState<{ ok: boolean; text: string; ky?: string } | null>(null);
  const [ghiChu, setGhiChu] = useState('');
  const [nhanXetMoi, setNhanXetMoi] = useState('');
  const [chonNguoi, setChonNguoi] = useState('');
  const [chonNguoiChiaSe, setChonNguoiChiaSe] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const napDs = useCallback(async () => {
    setDangTai(true);
    const r = await goiJson<{ de: DongKho[] }>('/api/de-kiem-tra/kho');
    if (!r.ok) setLoiTai(r.j.error ?? 'Không đọc được kho đề.');
    else { setDs(r.j.de ?? []); setLoiTai(null); }
    setDangTai(false);
  }, []);

  const xoa = async (d: DongKho) => {
    const ghi = d.phienBanDaDuyetMoiNhat ? '\n(Các phiên bản đã duyệt vẫn được giữ lại, việc xóa được ghi vào lịch sử.)' : '\n(Việc xóa được ghi vào lịch sử.)';
    if (!confirm(`Xóa đề ${tenMon(d.maMon)} – ${tenKy(d.ky)} của ${d.nguoiTao ?? 'người soạn'}? Không khôi phục được.${ghi}`)) return;
    const r = await goiJson<object>(`/api/de-kiem-tra?id=${d.id}`, { method: 'DELETE' });
    if (!r.ok) { setThongBao(`Chưa xóa được: ${r.j.error}`); return; }
    if (chonId === d.id) setChonId(null);
    setThongBao('Đã xóa đề.');
    await napDs();
  };

  const mo = useCallback(async (id: string) => {
    setChonId(id);
    setDangMo(true);
    setThongBao(null);
    setKq(null);
    setDe(null);
    setGhiChu('');
    const d = await goiJson<{ de: BanDeApi | null }>(`/api/de-kiem-tra?id=${id}`);
    const ban = d.ok ? d.j.de : null;
    setDe(ban);
    if (!d.ok) setThongBao(d.j.error ?? 'Không đọc được đề.');
    if (ban) {
      const [dt, ct] = await Promise.all([
        goiJson<{ moiNhat: { duLieu: DacTa; phienBan: number | null } | null }>(`/api/dac-ta?mon=${ban.maMon}&ky=${ban.ky}`),
        goiJson<{ lichSu: DongLichSu[]; nhanXet: NhanXet[]; phienBan: PhienBanDaDuyet[]; phanCong: NguoiDs[]; chiaSe: NguoiDs[] }>(`/api/de-kiem-tra/chi-tiet?id=${id}`),
      ]);
      const dtm = dt.ok ? dt.j.moiNhat : null;
      setDacTa(dtm);
      setLichSu(ct.j.lichSu ?? []); setNhanXet(ct.j.nhanXet ?? []); setPhienBan(ct.j.phienBan ?? []); setPhanCong(ct.j.phanCong ?? []); setChiaSe(ct.j.chiaSe ?? []);
      if (dtm) setKq(kiemDinhDe(dtm.duLieu, ban.duLieu, { phienBanDacTaMoiNhat: dtm.phienBan ?? undefined }));
    }
    setDangMo(false);
  }, []);

  useEffect(() => {
    void napDs();
    void goiJson<{ quyen: Quyen }>('/api/phan-quyen/toi').then((r) => { if (r.ok) setQuyen(r.j.quyen); });
    void goiJson<{ thanhVien: ThanhVien[] }>('/api/phan-quyen/thanh-vien').then((r) => { if (r.ok) setThanhVien(r.j.thanhVien ?? []); });
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) void mo(id);
  }, [napDs, mo]);

  const lamLai = async () => { if (chonId) await Promise.all([mo(chonId), napDs()]); };

  const chuyen = async (hanhDong: string) => {
    if (!de) return;
    setDangGui(true);
    const r = await post('/api/de-kiem-tra/chuyen', { id: de.id, hanhDong, ghiChu });
    setDangGui(false);
    if (!r.ok) { setThongBao(`Chưa thực hiện được: ${r.j.error}`); return; }
    const j = r.j as { phienBan?: number | null; taoPhienBanMoi?: boolean };
    setThongBao(hanhDong === 'PHE_DUYET'
      ? (j.taoPhienBanMoi === false ? `Nội dung không đổi so với phiên bản ${j.phienBan}, giữ nguyên phiên bản đó.` : `Đã phê duyệt, lưu thành phiên bản ${j.phienBan} (không sửa được).`)
      : `Đã thực hiện: ${TEN_HANH_DONG[hanhDong] ?? hanhDong}.`);
    setGhiChu('');
    await lamLai();
  };

  const viec = async (v: string, extra: Record<string, unknown> = {}) => {
    if (!de) return;
    const r = await post('/api/de-kiem-tra/chi-tiet', { id: de.id, viec: v, ...extra });
    if (!r.ok) { setThongBao(`Chưa thực hiện được: ${r.j.error}`); return false; }
    await lamLai();
    return true;
  };

  const xuatWord = (hoSo = false) => {
    if (!de) return;
    const luu = (k: string, mac: string) => { try { return localStorage.getItem(k) || mac; } catch { return mac; } };
    const q = new URLSearchParams({ id: de.id, truong: luu('tke.truong', 'TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN'), namHoc: luu('tke.namHoc', '2026 - 2027'), phut: luu('tke.phut', '35'), ...(hoSo ? { goi: 'hoso' } : {}) });
    window.location.href = `/api/de-kiem-tra/xuat?${q}`;
  };

  const saoChep = async () => {
    if (!de || !kyDich) return;
    setDangChep(true); setKetQuaChep(null);
    try {
      const r = await fetch('/api/de-kiem-tra/sao-chep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mon: de.maMon, kyNguon: de.ky, kyDich }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setKetQuaChep({ ok: false, text: j.error ?? `Lỗi ${r.status}` });
      else setKetQuaChep({ ok: true, ky: kyDich, text: `Đã tạo bản nháp cho ${tenKy(kyDich)}: chép ${j.daChep} câu, ${j.trong} câu để trống vì khác hình thức hoặc dạng so với đặc tả mới.` });
    } finally { setDangChep(false); }
  };

  const cau = useMemo(() => (de ? xepCauTheoSo(de.duLieu.cau) : []), [de]);
  const tong = Math.round(cau.reduce((s, c) => s + c.diem, 0) * 100) / 100;
  const nut = de ? THU_TU_NUT.filter((h) => de.hanhDong.includes(h)) : [];
  const nguoiKhac = thanhVien;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <TienTrinh5Buoc buocHienTai={5} daXong={[1, 2, 3, 4]} choBam />

      <div className="the-tke p-6 flex items-start gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0"><ClipboardCheck className="w-7 h-7" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kho đề kiểm tra · Thẩm định và phê duyệt</h1>
          <p className="text-sm text-slate-600 mt-1">Mỗi giáo viên có đề riêng. Đề gửi thẩm định sẽ qua tổ trưởng xác nhận rồi Ban giám hiệu phê duyệt; không ai tự duyệt đề của mình. Bạn chỉ thấy đề mình được phép xem, và chỉ có các nút mình được phép bấm.</p>
        </div>
      </div>

      {thongBao && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{thongBao}</div>}
      {loiTai && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loiTai}</div>}

      <div className="the-tke p-4 overflow-x-auto">
        <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">Danh sách đề {dangTai && <Loader2 className="w-4 h-4 animate-spin text-blue-700" />}</h2>
        {!dangTai && !loiTai && ds.length === 0 && (
          <p className="text-sm text-slate-600">Chưa có đề nào bạn được xem. Soạn đề ở <Link href="/tao-de" className="text-blue-700 underline">bước 4: Tạo đề</Link>.</p>
        )}
        {ds.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Mã', 'Môn', 'Kì', 'Trạng thái', 'Người tạo', 'Cập nhật', 'Bản đã duyệt', ''].map((h) => <th key={h} className="border border-slate-200 px-2 py-1.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {ds.map((d) => (
                <tr key={d.id} className={chonId === d.id ? 'bg-blue-50/50' : ''}>
                  <td className="border border-slate-200 px-2 py-1.5 font-mono text-xs">{d.maDe}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{tenMon(d.maMon)}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{tenKy(d.ky)}</td>
                  <td className="border border-slate-200 px-2 py-1.5"><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${NHAN[d.trangThai].mau}`}>{NHAN[d.trangThai].ten}</span></td>
                  <td className="border border-slate-200 px-2 py-1.5">{d.laChuDe ? 'Tôi' : d.nguoiTao ?? '—'}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{ngay(d.capNhatLuc)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center">{d.phienBanDaDuyetMoiNhat ? `v${d.phienBanDaDuyetMoiNhat}` : '—'}</td>
                  <td className="border border-slate-200 px-2 py-1.5"><button type="button" className="text-blue-700 underline" onClick={() => void mo(d.id)}>Xem</button>{d.duocXoa && <button type="button" className="ml-3 text-red-700 underline" onClick={() => void xoa(d)}>Xóa</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {chonId && (
        <div className="space-y-4">
          <div className="the-tke p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{de ? `${tenMon(de.maMon)} · ${tenKy(de.ky)}` : 'Đề'} {dangMo && <Loader2 className="inline w-4 h-4 animate-spin text-blue-700" />}</h2>
              {de && <p className="text-sm text-slate-600">Mã {de.maDe} · {de.laChuDe ? 'đề của tôi' : `người soạn: ${de.nguoiTao ?? '—'}`} · {cau.length} câu · tổng {fmtDiem(tong)} điểm · <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${NHAN[de.trangThai].mau}`}>{NHAN[de.trangThai].ten}</span>{de.duyetLuc ? ` · ${ngay(de.duyetLuc)}` : ''}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {de?.laChuDe && <Link href={`/tao-de?mon=${de.maMon}&ky=${de.ky}`} className={nutPhu}><Pencil className="w-4 h-4" /> Mở để sửa</Link>}
              <button type="button" className={nutPhu} disabled={!de} onClick={() => xuatWord()}><Download className="w-4 h-4" /> Xuất Word</button>
              <button type="button" className={nutPhu} disabled={!de} onClick={() => xuatWord(true)}><Download className="w-4 h-4" /> Xuất bộ hồ sơ</button>
            </div>
          </div>

          {de && nut.length > 0 && (
            <div className="the-tke p-4 space-y-3">
              <h3 className="font-semibold text-slate-900">Việc bạn làm được với đề này</h3>
              {nut.some((h) => CAN_LY_DO.includes(h) || h === 'PHE_DUYET' || h === 'XAC_NHAN_TO' || h === 'DE_NGHI_DAT') && (
                <label className="block text-sm text-slate-700">Ghi chú (bắt buộc khi yêu cầu chỉnh sửa hoặc thu hồi đề)
                  <textarea aria-label="Ghi chú" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {nut.map((h) => {
                  const chinh = ['GUI_THAM_DINH', 'XAC_NHAN_TO', 'CHUYEN_BGH', 'PHE_DUYET', 'PHAT_HANH'].includes(h);
                  const khoa = dangGui || (CAN_LY_DO.includes(h) && !ghiChu.trim()) || (['PHE_DUYET', 'XAC_NHAN_TO', 'GUI_THAM_DINH'].includes(h) && !!kq && !kq.hopLe);
                  return (
                    <button key={h} type="button" className={chinh ? nutChinh : nutPhu} disabled={khoa} onClick={() => void chuyen(h)}>
                      {dangGui ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {TEN_HANH_DONG[h]}
                    </button>
                  );
                })}
              </div>
              {kq && !kq.hopLe && nut.some((h) => ['PHE_DUYET', 'XAC_NHAN_TO', 'GUI_THAM_DINH'].includes(h)) && <p className="text-xs text-red-700">Đề còn lỗi ở phần kiểm tra bên dưới nên chưa gửi, xác nhận hay duyệt được.</p>}
            </div>
          )}
          {de && nut.length === 0 && !dangMo && <p className="text-sm text-slate-500">Hiện không có thao tác nào dành cho bạn với đề ở trạng thái này.</p>}

          {de?.trangThai === 'TRA_LAI' && de.ghiChuDuyet && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>Lý do trả lại:</b> {de.ghiChuDuyet}</div>
          )}

          {de && !dacTa && !dangMo && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Chưa đọc được đặc tả đã xác nhận của đề này nên chưa kiểm tra lại được.</div>}
          {kq && <div className="the-tke p-6"><ValidationPanel ketQua={kq} tieuDe="Kiểm tra đề lần cuối" /></div>}

          {de && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="the-tke p-4 space-y-2 text-sm">
                <h3 className="font-semibold text-slate-900">Người thẩm định được phân công</h3>
                {phanCong.length === 0 ? <p className="text-slate-500">Chưa phân công ai. Tổ trưởng vẫn thẩm định được đề trong khối.</p> : (
                  <ul className="space-y-1">{phanCong.map((p) => <li key={p.nguoi} className="flex items-center justify-between">{p.ten ?? p.nguoi}{quyen?.duocPhanCong && <button type="button" className="text-red-700 underline" onClick={() => void viec('HUY_PHAN_CONG', { nguoi: p.nguoi })}>Bỏ</button>}</li>)}</ul>
                )}
                {quyen?.duocPhanCong && (
                  <div className="flex gap-2">
                    <select aria-label="Người thẩm định" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 bg-white" value={chonNguoi} onChange={(e) => setChonNguoi(e.target.value)}>
                      <option value="">Chọn người thẩm định</option>
                      {nguoiKhac.map((t) => <option key={t.id} value={t.id}>{t.ten}</option>)}
                    </select>
                    <button type="button" className={nutPhu} disabled={!chonNguoi} onClick={async () => { if (await viec('PHAN_CONG', { nguoi: chonNguoi })) setChonNguoi(''); }}>Phân công</button>
                  </div>
                )}
              </div>
              <div className="the-tke p-4 space-y-2 text-sm">
                <h3 className="font-semibold text-slate-900">Ai xem được đề này</h3>
                {de.laChuDe ? (
                  <select aria-label="Phạm vi xem" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 bg-white" value={de.phamViXem} onChange={(e) => void viec('PHAM_VI', { phamVi: e.target.value })}>
                    {Object.entries(TEN_PHAM_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : <p className="text-slate-600">{TEN_PHAM_VI[de.phamViXem]}</p>}
                {de.laChuDe && (
                  <>
                    {chiaSe.length > 0 && <ul className="space-y-1">{chiaSe.map((p) => <li key={p.nguoi} className="flex items-center justify-between">{p.ten ?? p.nguoi}<button type="button" className="text-red-700 underline" onClick={() => void viec('BO_CHIA_SE', { nguoi: p.nguoi })}>Bỏ</button></li>)}</ul>}
                    <div className="flex gap-2">
                      <select aria-label="Chia sẻ cho" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 bg-white" value={chonNguoiChiaSe} onChange={(e) => setChonNguoiChiaSe(e.target.value)}>
                        <option value="">Chia sẻ riêng cho một người</option>
                        {nguoiKhac.map((t) => <option key={t.id} value={t.id}>{t.ten}</option>)}
                      </select>
                      <button type="button" className={nutPhu} disabled={!chonNguoiChiaSe} onClick={async () => { if (await viec('CHIA_SE', { nguoi: chonNguoiChiaSe })) setChonNguoiChiaSe(''); }}>Chia sẻ</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {de && phienBan.length > 0 && (
            <div className="the-tke p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">Làm đề mới cho kì khác từ đề này</h3>
              <p className="text-sm text-slate-600">Chép nội dung phiên bản đã duyệt mới nhất sang một kì khác của {tenMon(de.maMon)} thành bản nháp của bạn. Kì đó phải có đặc tả đã xác nhận và bạn chưa có đề ở kì đó. Đề này giữ nguyên.</p>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Kì đích" className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" value={kyDich} onChange={(e) => { setKyDich(e.target.value); setKetQuaChep(null); }}>
                  <option value="">Chọn kì cần làm đề</option>
                  {DANH_SACH_KY.filter((k) => k.ma !== de.ky).map((k) => <option key={k.ma} value={k.ma}>{k.ten}</option>)}
                </select>
                <button type="button" className={nutPhu} disabled={!kyDich || dangChep} onClick={() => void saoChep()}>{dangChep ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Tạo bản nháp</button>
              </div>
              {ketQuaChep && (
                <div className={`rounded-lg border p-3 text-sm ${ketQuaChep.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                  {ketQuaChep.text}
                  {ketQuaChep.ok && ketQuaChep.ky && <> <Link href={`/tao-de?mon=${de.maMon}&ky=${ketQuaChep.ky}`} className="underline font-medium">Mở ở bước 4 để rà lại</Link></>}
                </div>
              )}
            </div>
          )}

          {de && (
            <div className="the-tke p-4 space-y-3">
              <h3 className="font-semibold text-slate-900">Nội dung đề</h3>
              {de.duLieu.tiengViet && (
                <div className="text-sm text-slate-700 space-y-0.5">
                  <div>Bài đọc hiểu: <b>{de.duLieu.tiengViet.baiDocHieu.tieuDe || '(chưa có)'}</b> · {demTieng(de.duLieu.tiengViet.baiDocHieu.noiDung)} tiếng</div>
                  {de.duLieu.tiengViet.baiDocThanhTieng.map((b, i) => <div key={i}>Bài đọc thành tiếng {i + 1}: <b>{b.tieuDe || '(chưa có)'}</b> · {demTieng(b.noiDung)} tiếng</div>)}
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {cau.map((c) => (
                  <div key={c.khoa} className="py-2.5 text-sm space-y-0.5">
                    <div><b>{nhanCau(c)}</b> <span className="text-xs text-slate-500">· Mức {c.muc} · {fmtDiem(c.diem)} điểm</span></div>
                    <div className="whitespace-pre-line text-slate-800">{c.deBai}</div>
                    {c.luaChon.some((x) => x.trim()) && <div className="text-slate-700 pl-4">{c.luaChon.map((x, i) => (x.trim() ? <div key={i}>{c.dang === 'DS' ? `${String.fromCharCode(97 + i)})` : `${'ABCD'[i]}.`} {x}</div> : null))}</div>}
                    <div className="text-emerald-800">Đáp án: {c.dapAn || (c.huongDanCham ? '' : '—')}</div>
                    {c.huongDanCham && <div className="text-slate-600 whitespace-pre-line">{c.huongDanCham}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {de && (
            <div className="the-tke p-4 space-y-3 text-sm">
              <h3 className="font-semibold text-slate-900">Nhận xét</h3>
              {nhanXet.length === 0 && <p className="text-slate-500">Chưa có nhận xét.</p>}
              <ul className="space-y-2">
                {nhanXet.map((n) => (
                  <li key={n.id} className={`rounded-lg border p-2 ${n.daXuLy ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-amber-200 bg-amber-50 text-slate-800'}`}>
                    <div className="text-xs text-slate-500">{n.tacGia ?? 'Không rõ'} · {ngay(n.luc)}{n.daXuLy ? ' · đã xử lý' : ''}</div>
                    <div className="whitespace-pre-line">{n.noiDung}</div>
                    {de.laChuDe && <button type="button" className="mt-1 text-xs text-blue-700 underline" onClick={() => void viec('XU_LY', { nhanXetId: n.id, daXuLy: !n.daXuLy })}>{n.daXuLy ? 'Đánh dấu chưa xử lý' : 'Đánh dấu đã xử lý'}</button>}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input aria-label="Nhận xét mới" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5" placeholder="Viết nhận xét về đề" value={nhanXetMoi} onChange={(e) => setNhanXetMoi(e.target.value)} />
                <button type="button" className={nutPhu} disabled={!nhanXetMoi.trim()} onClick={async () => { if (await viec('NHAN_XET', { noiDung: nhanXetMoi })) setNhanXetMoi(''); }}>Gửi nhận xét</button>
              </div>
            </div>
          )}

          {de && lichSu.length > 0 && (
            <div className="the-tke p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Lịch sử xử lý (không sửa, không xóa được)</h3>
              <ul className="text-sm text-slate-700 space-y-1">
                {lichSu.map((h) => (
                  <li key={h.id}>
                    {ngay(h.luc)} · <b>{TEN_HANH_DONG[h.hanhDong] ?? h.hanhDong}</b> · {h.nguoi ?? 'Không rõ'}{h.vaiTro ? ` (${TEN_VAI_TRO_SD(h.vaiTro)})` : ''}
                    {h.den ? ` → ${NHAN[h.den as TrangThaiDe]?.ten ?? h.den}` : ''}{h.phienBan ? ` · phiên bản ${h.phienBan}` : ''}{h.ghiChu ? ` · ${h.ghiChu}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phienBan.length > 0 && (
            <div className="the-tke p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Các phiên bản đã duyệt</h3>
              <ul className="text-sm text-slate-700 space-y-1">
                {phienBan.map((p) => <li key={p.phienBan}>Phiên bản {p.phienBan} · theo đặc tả v{p.phienBanDacTa} · {ngay(p.duyetLuc)}{p.ghiChu ? ` · ${p.ghiChu}` : ''}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
