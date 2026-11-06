'use client';

/**
 * Kho đề kiểm tra (MOD-07) – bước 5: Duyệt đề.
 * Danh sách đề của trường theo môn, kì. Tổ trưởng xem lại đề, kiểm tra lần cuối, rồi Duyệt (lưu thành phiên bản không sửa được)
 * hoặc Trả lại kèm lý do. Sửa đề đã duyệt thì đề quay về "Cần kiểm tra lại" và phải duyệt lại.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ClipboardCheck, Download, Loader2, Pencil, Undo2 } from 'lucide-react';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY } from '@/core/matrix/dung-tu-chuong-trinh';
import { kiemDinhDe, nhanCau, type DeKiemTra, type KetQuaKiemDinhDe, type TrangThaiDe } from '@/core/de/de';
import { demTieng } from '@/core/de/tieng-viet';
import { xepCauTheoSo } from '@/core/de/xuat-word';
import type { DacTa } from '@/core/dac-ta/dac-ta';

interface DongKho { maMon: string; ky: string; trangThai: TrangThaiDe; phienBanDacTa: number; capNhatLuc: string; duyetLuc: string | null; phienBanDaDuyetMoiNhat: number | null }
interface BanDeApi { id: string; trangThai: TrangThaiDe; dacTaId: string; phienBanDacTa: number; duLieu: DeKiemTra; duyetLuc: string | null; ghiChuDuyet: string | null }
interface PhienBanDaDuyet { phienBan: number; phienBanDacTa: number; duyetLuc: string; ghiChu: string | null }

const NHAN: Record<TrangThaiDe, { ten: string; mau: string }> = {
  BAN_NHAP: { ten: 'Đang soạn', mau: 'bg-slate-100 text-slate-700 border-slate-200' },
  CAN_KIEM_TRA: { ten: 'Đã kiểm tra, chưa chuyển duyệt', mau: 'bg-blue-50 text-blue-700 border-blue-200' },
  CO_LOI: { ten: 'Có lỗi cần sửa', mau: 'bg-red-50 text-red-700 border-red-200' },
  SAN_SANG_DUYET: { ten: 'Chờ duyệt', mau: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  CAN_KIEM_TRA_LAI: { ten: 'Cần kiểm tra lại', mau: 'bg-amber-50 text-amber-800 border-amber-200' },
  DA_DUYET: { ten: 'Đã duyệt', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  TRA_LAI: { ten: 'Bị trả lại', mau: 'bg-red-50 text-red-700 border-red-200' },
};

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

export default function KhoDePage() {
  const [ds, setDs] = useState<DongKho[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [chon, setChon] = useState<{ mon: string; ky: string } | null>(null);
  const [de, setDe] = useState<BanDeApi | null>(null);
  const [dacTa, setDacTa] = useState<{ duLieu: DacTa; phienBan: number | null } | null>(null);
  const [phienBan, setPhienBan] = useState<PhienBanDaDuyet[]>([]);
  const [kq, setKq] = useState<KetQuaKiemDinhDe | null>(null);
  const [dangMo, setDangMo] = useState(false);
  const [ghiChu, setGhiChu] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const napDs = useCallback(async () => {
    setDangTai(true);
    const r = await goiJson<{ de: DongKho[] }>('/api/de-kiem-tra/kho');
    if (!r.ok) setLoiTai(r.j.error ?? 'Không đọc được kho đề.');
    else { setDs(r.j.de ?? []); setLoiTai(null); }
    setDangTai(false);
  }, []);

  const mo = useCallback(async (mon: string, ky: string) => {
    setChon({ mon, ky });
    setDangMo(true);
    setThongBao(null);
    setKq(null);
    setDe(null);
    setGhiChu('');
    const [d, dt, pb] = await Promise.all([
      goiJson<{ de: BanDeApi | null }>(`/api/de-kiem-tra?mon=${mon}&ky=${ky}`),
      goiJson<{ moiNhat: { duLieu: DacTa; phienBan: number | null } | null }>(`/api/dac-ta?mon=${mon}&ky=${ky}`),
      goiJson<{ phienBan: PhienBanDaDuyet[] }>(`/api/de-kiem-tra/kho?mon=${mon}&ky=${ky}`),
    ]);
    const ban = d.ok ? d.j.de : null;
    const dtm = dt.ok ? dt.j.moiNhat : null;
    setDe(ban);
    setDacTa(dtm);
    setPhienBan(pb.ok ? pb.j.phienBan ?? [] : []);
    if (ban && dtm) setKq(kiemDinhDe(dtm.duLieu, ban.duLieu, { phienBanDacTaMoiNhat: dtm.phienBan ?? undefined }));
    if (!d.ok) setThongBao(d.j.error ?? 'Không đọc được đề.');
    setDangMo(false);
  }, []);

  useEffect(() => {
    void napDs();
    const p = new URLSearchParams(window.location.search);
    const m = p.get('mon');
    const k = p.get('ky');
    if (m && k) void mo(m, k);
  }, [napDs, mo]);

  const gui = async (hanhDong: 'DUYET' | 'TRA_LAI') => {
    if (!chon) return;
    setDangGui(true);
    const r = await goiJson<{ phienBan?: number | null; taoPhienBanMoi?: boolean }>('/api/de-kiem-tra/duyet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mon: chon.mon, ky: chon.ky, hanhDong, ghiChu }),
    });
    setDangGui(false);
    if (!r.ok) { setThongBao(r.status === 403 ? `Chưa thực hiện được: ${r.j.error ?? 'tài khoản này chỉ được xem.'}` : `Chưa thực hiện được: ${r.j.error}`); return; }
    setThongBao(hanhDong === 'DUYET'
      ? (r.j.taoPhienBanMoi === false ? `Nội dung không đổi so với phiên bản ${r.j.phienBan}, giữ nguyên phiên bản đó.` : `Đã duyệt đề, lưu thành phiên bản ${r.j.phienBan} (không sửa được).`)
      : 'Đã trả đề lại cho người soạn kèm lý do.');
    await Promise.all([mo(chon.mon, chon.ky), napDs()]);
  };

  const xuatWord = () => {
    if (!chon) return;
    const luu = (k: string, mac: string) => { try { return localStorage.getItem(k) || mac; } catch { return mac; } };
    const q = new URLSearchParams({ mon: chon.mon, ky: chon.ky, truong: luu('tke.truong', 'TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN'), namHoc: luu('tke.namHoc', '2026 - 2027'), phut: luu('tke.phut', '35') });
    window.location.href = `/api/de-kiem-tra/xuat?${q}`;
  };

  const cau = useMemo(() => (de ? xepCauTheoSo(de.duLieu.cau) : []), [de]);
  const tong = Math.round(cau.reduce((s, c) => s + c.diem, 0) * 100) / 100;
  const choDuyet = de?.trangThai === 'SAN_SANG_DUYET';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <TienTrinh5Buoc buocHienTai={5} daXong={[1, 2, 3, 4]} choBam />

      <div className="the-tke p-6 flex items-start gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0"><ClipboardCheck className="w-7 h-7" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kho đề kiểm tra · Duyệt đề</h1>
          <p className="text-sm text-slate-600 mt-1">Đề soạn xong ở bước 4 và chuyển sang duyệt sẽ hiện ở đây. Tổ trưởng xem lại, kiểm tra lần cuối rồi duyệt hoặc trả lại kèm lý do. Đề đã duyệt lưu thành phiên bản không sửa được.</p>
        </div>
      </div>

      {thongBao && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{thongBao}</div>}
      {loiTai && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loiTai}</div>}

      <div className="the-tke p-4 overflow-x-auto">
        <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">Danh sách đề {dangTai && <Loader2 className="w-4 h-4 animate-spin text-blue-700" />}</h2>
        {!dangTai && !loiTai && ds.length === 0 && (
          <p className="text-sm text-slate-600">Chưa có đề nào được lưu. Thầy soạn đề ở <Link href="/tao-de" className="text-blue-700 underline">bước 4: Tạo đề</Link>.</p>
        )}
        {ds.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Môn', 'Kì', 'Trạng thái', 'Đặc tả', 'Cập nhật', 'Bản đã duyệt', ''].map((h) => <th key={h} className="border border-slate-200 px-2 py-1.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {ds.map((d) => (
                <tr key={`${d.maMon}|${d.ky}`} className={chon?.mon === d.maMon && chon.ky === d.ky ? 'bg-blue-50/50' : ''}>
                  <td className="border border-slate-200 px-2 py-1.5">{tenMon(d.maMon)}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{tenKy(d.ky)}</td>
                  <td className="border border-slate-200 px-2 py-1.5"><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${NHAN[d.trangThai].mau}`}>{NHAN[d.trangThai].ten}</span></td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center">v{d.phienBanDacTa}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{ngay(d.capNhatLuc)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center">{d.phienBanDaDuyetMoiNhat ? `v${d.phienBanDaDuyetMoiNhat}` : '—'}</td>
                  <td className="border border-slate-200 px-2 py-1.5"><button type="button" className="text-blue-700 underline" onClick={() => void mo(d.maMon, d.ky)}>Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {chon && (
        <div className="space-y-4">
          <div className="the-tke p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{tenMon(chon.mon)} · {tenKy(chon.ky)} {dangMo && <Loader2 className="inline w-4 h-4 animate-spin text-blue-700" />}</h2>
              {de && <p className="text-sm text-slate-600">{cau.length} câu · tổng {fmtDiem(tong)} điểm · <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${NHAN[de.trangThai].mau}`}>{NHAN[de.trangThai].ten}</span>{de.duyetLuc ? ` · ${ngay(de.duyetLuc)}` : ''}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/tao-de?mon=${chon.mon}&ky=${chon.ky}`} className={nutPhu}><Pencil className="w-4 h-4" /> Mở để sửa</Link>
              <button type="button" className={nutPhu} disabled={!de} onClick={xuatWord}><Download className="w-4 h-4" /> Xuất Word</button>
            </div>
          </div>

          {de?.trangThai === 'TRA_LAI' && de.ghiChuDuyet && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>Lý do trả lại:</b> {de.ghiChuDuyet}</div>
          )}

          {de && !dacTa && !dangMo && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Chưa đọc được đặc tả đã xác nhận của đề này nên chưa kiểm tra lại được.</div>}
          {kq && <div className="the-tke p-6"><ValidationPanel ketQua={kq} tieuDe="Kiểm tra đề lần cuối" /></div>}

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

          {de && (choDuyet || de.trangThai === 'DA_DUYET') && (
            <div className="the-tke p-4 space-y-3">
              {choDuyet ? (
                <>
                  <label className="block text-sm text-slate-700">Ghi chú của người duyệt (bắt buộc khi trả lại)
                    <textarea aria-label="Ghi chú duyệt" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className={nutPhu} disabled={dangGui || !ghiChu.trim()} onClick={() => void gui('TRA_LAI')}><Undo2 className="w-4 h-4" /> Trả lại để sửa</button>
                    <button type="button" className={nutChinh} disabled={dangGui || !kq?.hopLe} onClick={() => void gui('DUYET')}>
                      {dangGui ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Duyệt đề
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-emerald-800">Đề đã duyệt. Muốn đổi, thầy mở để sửa; đề sẽ quay về &quot;Cần kiểm tra lại&quot;, chuyển sang duyệt và duyệt thành phiên bản mới.</p>
              )}
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
