'use client';

/**
 * ThayKhaiEdu - Báo phiên bản mới và nhật ký cập nhật.
 *
 * 1. Có bản mới: hỏi /api/phien-ban lúc mở trang, mỗi 5 phút và khi quay lại tab. Mã khác mã của trang
 *    → hiện khung ở góc dưới, liệt kê thay đổi, nút "Cập nhật ngay" (tải lại trang) hoặc "Để sau".
 * 2. Vừa cập nhật xong: mục nhật ký chưa xem → hiện khung "Có gì mới" một lần.
 * 3. Bấm dòng phiên bản ở chân menu → xem toàn bộ nhật ký.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { NHAT_KY_CAP_NHAT, PHIEN_BAN, coBanMoi, mucMoiHon, ngayVN, soMoiNhat, type MucCapNhat } from '@/core/phien-ban/phien-ban';

export const SU_KIEN_MO_NHAT_KY = 'tke-mo-nhat-ky';
const KHOA_DA_XEM = 'tke.nhatKyDaXem';
const KHOA_DE_SAU = 'tke.phienBanDeSau';
const CHU_KY = 5 * 60 * 1000;

function docSo(khoa: string): number | null {
  try { const v = localStorage.getItem(khoa); return v === null ? null : Number(v) || 0; } catch { return null; }
}
function ghi(khoa: string, v: string) {
  try { localStorage.setItem(khoa, v); } catch { /* trình duyệt chặn lưu thì bỏ qua */ }
}

function DanhSachMuc({ muc }: { muc: MucCapNhat[] }) {
  return (
    <ul className="space-y-3">
      {muc.map((m) => (
        <li key={m.so}>
          <div className="text-sm font-bold text-slate-900">{m.tieuDe} <span className="font-normal text-xs text-slate-500">· {ngayVN(m.ngay)}</span></div>
          <ul className="mt-1 list-disc pl-5 space-y-0.5 text-[13px] text-slate-600 leading-snug">
            {m.noiDung.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function ThongBaoPhienBan() {
  const [banMoi, setBanMoi] = useState<{ phienBan: string; muc: MucCapNhat[] } | null>(null);
  const [coGiMoi, setCoGiMoi] = useState<MucCapNhat[] | null>(null);
  const [xemTatCa, setXemTatCa] = useState(false);
  const [dangTai, setDangTai] = useState(false);

  const kiemTra = useCallback(async () => {
    try {
      const r = await fetch('/api/phien-ban', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { phienBan?: string; nhatKy?: MucCapNhat[] };
      if (!coBanMoi(PHIEN_BAN, j.phienBan)) return;
      // Đã bấm "Để sau" cho đúng bản này thì không hiện lại
      try { if (localStorage.getItem(KHOA_DE_SAU) === j.phienBan) return; } catch { /* bỏ qua */ }
      setBanMoi({ phienBan: j.phienBan!, muc: mucMoiHon(j.nhatKy ?? [], soMoiNhat(NHAT_KY_CAP_NHAT)) });
    } catch {
      // Mất mạng thì thử lại lần sau
    }
  }, []);

  useEffect(() => {
    // Vừa cập nhật: có mục nhật ký chưa xem thì báo một lần. Lần đầu dùng app thì chỉ ghi nhớ, không báo.
    const daXem = docSo(KHOA_DA_XEM);
    const moiNhat = soMoiNhat(NHAT_KY_CAP_NHAT);
    if (daXem === null) ghi(KHOA_DA_XEM, String(moiNhat));
    else if (daXem < moiNhat) setCoGiMoi(mucMoiHon(NHAT_KY_CAP_NHAT, daXem));

    void kiemTra();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void kiemTra(); }, CHU_KY);
    const khiQuayLai = () => { if (document.visibilityState === 'visible') void kiemTra(); };
    const moNhatKy = () => setXemTatCa(true);
    document.addEventListener('visibilitychange', khiQuayLai);
    window.addEventListener(SU_KIEN_MO_NHAT_KY, moNhatKy);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', khiQuayLai);
      window.removeEventListener(SU_KIEN_MO_NHAT_KY, moNhatKy);
    };
  }, [kiemTra]);

  const dongCoGiMoi = () => { ghi(KHOA_DA_XEM, String(soMoiNhat(NHAT_KY_CAP_NHAT))); setCoGiMoi(null); };
  const capNhat = () => { setDangTai(true); window.location.reload(); };
  const deSau = () => { if (banMoi) ghi(KHOA_DE_SAU, banMoi.phienBan); setBanMoi(null); };

  return (
    <>
      {/* Có phiên bản mới */}
      {banMoi && (
        <div role="alertdialog" aria-labelledby="tb-phien-ban" className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-[420px] rounded-2xl border border-indigo-200 bg-white shadow-xl">
          <div className="flex items-start gap-3 p-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><RefreshCw className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 id="tb-phien-ban" className="text-base font-bold text-slate-900">Đã có phiên bản mới</h2>
              <p className="text-[13px] text-slate-600 mt-0.5">Thầy cô lưu phần đang làm rồi bấm Cập nhật ngay để dùng bản mới.</p>
            </div>
          </div>
          {banMoi.muc.length > 0 && (
            <div className="max-h-56 overflow-auto border-t border-slate-100 px-4 py-3"><DanhSachMuc muc={banMoi.muc} /></div>
          )}
          <div className="flex gap-2 justify-end border-t border-slate-100 p-3">
            <button type="button" onClick={deSau} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Để sau</button>
            <button type="button" onClick={capNhat} disabled={dangTai} className="nut-tke text-sm px-4 py-2">
              <RefreshCw className={`w-4 h-4 ${dangTai ? 'animate-spin' : ''}`} /> Cập nhật ngay
            </button>
          </div>
        </div>
      )}

      {/* Vừa cập nhật xong: có gì mới */}
      {!banMoi && coGiMoi && coGiMoi.length > 0 && (
        <div role="dialog" aria-labelledby="tb-co-gi-moi" className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-[420px] rounded-2xl border border-emerald-200 bg-white shadow-xl">
          <div className="flex items-start gap-3 p-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 id="tb-co-gi-moi" className="text-base font-bold text-slate-900">App vừa được cập nhật</h2>
              <p className="text-[13px] text-slate-600 mt-0.5">Phiên bản {PHIEN_BAN}. Những điểm mới:</p>
            </div>
            <button type="button" onClick={dongCoGiMoi} aria-label="Đóng" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="max-h-64 overflow-auto border-t border-slate-100 px-4 py-3"><DanhSachMuc muc={coGiMoi} /></div>
          <div className="flex justify-end border-t border-slate-100 p-3">
            <button type="button" onClick={dongCoGiMoi} className="nut-tke text-sm px-4 py-2">Đã hiểu</button>
          </div>
        </div>
      )}

      {/* Toàn bộ nhật ký cập nhật */}
      {xemTatCa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setXemTatCa(false)}>
          <div role="dialog" aria-labelledby="tb-nhat-ky" className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <h2 id="tb-nhat-ky" className="text-base font-bold text-slate-900">Nhật ký cập nhật</h2>
                <p className="text-xs text-slate-500">Đang dùng phiên bản {PHIEN_BAN}</p>
              </div>
              <button type="button" onClick={() => setXemTatCa(false)} aria-label="Đóng" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-auto p-4"><DanhSachMuc muc={mucMoiHon(NHAT_KY_CAP_NHAT, 0)} /></div>
          </div>
        </div>
      )}
    </>
  );
}
