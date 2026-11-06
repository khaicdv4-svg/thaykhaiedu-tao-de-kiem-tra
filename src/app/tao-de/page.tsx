'use client';

/**
 * Tạo đề (MOD-05) – bước 4 của quy trình tạo đề.
 * Đề kế thừa đặc tả ĐÃ XÁC NHẬN: mỗi dòng đặc tả một câu. Thầy nhập đề bài, phương án, đáp án, hướng dẫn chấm.
 * Mức, hình thức, dạng câu, điểm lấy từ đặc tả, không sửa ở đây. Ứng dụng không tự bịa đề hay đáp án.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FilePlus2, Loader2, RefreshCw, Save, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import type { DacTa } from '@/core/dac-ta/dac-ta';
import {
  NHAN_LUA_CHON,
  cauDaXong,
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

  useEffect(() => {
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
      setDe(ban.duLieu);
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

  const tenMon = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon)?.mon ?? maMon;
  const nhan = NHAN_TRANG_THAI[trangThai];
  const tienDo = useMemo(() => (de ? tienDoDe(de) : { xong: 0, tong: 0 }), [de]);
  const nhom = useMemo(() => {
    const dong = new Map((dacTaBan?.duLieu.dong ?? []).map((r) => [r.khoa, r]));
    const m = new Map<string, CauDe[]>();
    for (const c of de?.cau ?? []) {
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
                        <textarea aria-label={`Đề bài ${nhanCau(c)}`} rows={3} className={`${o} mt-0.5 ${c.deBai.trim() ? '' : 'border-amber-400 bg-amber-50'}`} value={c.deBai} onChange={(e) => suaCau(c.khoa, { deBai: e.target.value })} />
                      </label>

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
                        {c.dang === 'VIET' || c.hinhThuc === 'TL' ? 'Hướng dẫn chấm (các ý cho điểm)' : 'Hướng dẫn chấm (nếu cần)'}
                        <textarea aria-label={`Hướng dẫn chấm ${nhanCau(c)}`} rows={2} className={`${o} mt-0.5`} value={c.huongDanCham} onChange={(e) => suaCau(c.khoa, { huongDanCham: e.target.value })} />
                      </label>
                      <label className="block text-xs text-slate-500">Hình, bảng, bài đọc đi kèm (mô tả để dàn trang)
                        <input aria-label={`Hình đi kèm ${nhanCau(c)}`} className={`${o} mt-0.5`} value={c.ghiChuHinh} onChange={(e) => suaCau(c.khoa, { ghiChuHinh: e.target.value })} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {ketQua && <div className="the-tke p-6"><ValidationPanel ketQua={ketQua} tieuDe="Kết quả kiểm tra đề" /></div>}

          {trangThai === 'SAN_SANG_DUYET' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-900">
              <span>Đề đã chuyển sang bước duyệt. Sửa bất kì câu nào, đề sẽ chuyển sang &quot;Cần kiểm tra lại&quot;.</span>
              <Link href="/tests" className={nutChinh}>Sang bước 5: Duyệt đề</Link>
            </div>
          )}

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
