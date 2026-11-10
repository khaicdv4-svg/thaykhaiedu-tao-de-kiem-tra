'use client';

/**
 * Kiểm định đề (MOD-06): rà soát một lượt tất cả đề trong kho mà tài khoản được xem.
 * Dùng đúng bộ kiểm định ở bước Tạo đề (kiemDinhDe) nên kết quả giống nhau, kèm cảnh báo câu trùng giữa các đề.
 * Trang này chỉ đọc, không sửa đề; muốn sửa thì mở đề ở bước 4.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { kiemDinhDe, type DeKiemTra, type KetQuaKiemDinhDe } from '@/core/de/de';
import type { DacTa } from '@/core/dac-ta/dac-ta';
import { timCauTrungGiuaCacDe, type CauTrung } from '@/core/de/trung-giua-cac-de';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { DANH_SACH_KY } from '@/core/matrix/dung-tu-chuong-trinh';

interface DongKho { id: string; maDe: string; maMon: string; ky: string; trangThai: string }
interface DongKetQua extends DongKho { kq: KetQuaKiemDinhDe | null; loiTai?: string; de?: DeKiemTra }

const tenMon = (m: string) => MAU_MA_TRAN_CHUNG.find((x) => x.ma_mon === m)?.mon ?? m;
const tenKy = (k: string) => DANH_SACH_KY.find((x) => x.ma === k)?.ten ?? k;

async function lay<T>(url: string): Promise<{ ok: boolean; j: T & { error?: string } }> {
  try {
    const r = await fetch(url);
    return { ok: r.ok, j: await r.json() };
  } catch {
    return { ok: false, j: { error: 'Không kết nối được máy chủ.' } as T & { error?: string } };
  }
}

export default function ValidationPage() {
  const [dong, setDong] = useState<DongKetQua[]>([]);
  const [trung, setTrung] = useState<CauTrung[]>([]);
  const [dang, setDang] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [mo, setMo] = useState<string | null>(null);

  const quet = useCallback(async () => {
    setDang(true); setLoi(null); setDong([]); setTrung([]);
    const kho = await lay<{ de: DongKho[] }>('/api/de-kiem-tra/kho');
    if (!kho.ok) { setLoi(kho.j.error ?? 'Không đọc được kho đề.'); setDang(false); return; }
    const ds = kho.j.de ?? [];
    const dacTaTheoKy = new Map<string, Promise<{ duLieu: DacTa; phienBan: number | null } | null>>();
    const layDacTa = (mon: string, ky: string) => {
      const k = `${mon}|${ky}`;
      if (!dacTaTheoKy.has(k)) dacTaTheoKy.set(k, lay<{ moiNhat: { duLieu: DacTa; phienBan: number | null } | null }>(`/api/dac-ta?mon=${mon}&ky=${ky}`).then((r) => (r.ok ? r.j.moiNhat : null)));
      return dacTaTheoKy.get(k)!;
    };
    const kq: DongKetQua[] = [];
    for (let i = 0; i < ds.length; i += 3) {
      const lo = await Promise.all(ds.slice(i, i + 3).map(async (d): Promise<DongKetQua> => {
        const [ct, dt] = await Promise.all([lay<{ de: { duLieu: DeKiemTra } | null }>(`/api/de-kiem-tra?id=${d.id}`), layDacTa(d.maMon, d.ky)]);
        const de = ct.ok ? ct.j.de?.duLieu : undefined;
        if (!de) return { ...d, kq: null, loiTai: ct.j.error ?? 'Không đọc được nội dung đề.' };
        if (!dt) return { ...d, kq: null, de, loiTai: 'Chưa có đặc tả đã xác nhận để đối chiếu.' };
        return { ...d, de, kq: kiemDinhDe(dt.duLieu, de, { phienBanDacTaMoiNhat: dt.phienBan ?? undefined }) };
      }));
      kq.push(...lo);
      setDong([...kq]);
    }
    setTrung(timCauTrungGiuaCacDe(kq.filter((d) => d.de).map((d) => ({ id: d.id, maDe: d.maDe, maMon: d.maMon, ky: d.ky, de: d.de! }))));
    setDang(false);
  }, []);

  useEffect(() => { void quet(); }, [quet]);

  const soLoi = dong.reduce((n, d) => n + (d.kq?.loi.length ?? 0), 0);
  const soDeLoi = dong.filter((d) => d.kq && !d.kq.hopLe).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kiểm định đề</h1>
          <p className="text-sm text-slate-600 mt-1">Rà một lượt các đề trong kho đề: khớp đặc tả, tổng điểm, đáp án, câu trùng. Đây là kết quả kiểm tra tự động, thầy cô vẫn là người quyết định.</p>
        </div>
        <button type="button" className="nut-tke text-sm" onClick={() => void quet()} disabled={dang}>
          {dang ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Rà lại
        </button>
      </div>

      {loi && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loi}</div>}
      {!dang && !loi && dong.length === 0 && <div className="the-tke p-6 text-sm text-slate-600">Kho đề chưa có đề nào. Thầy cô soạn đề ở bước 4 rồi quay lại đây.</div>}

      {dong.length > 0 && (
        <div className="the-tke p-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
          <span>{dong.length} đề{dang ? ' (đang rà…)' : ''}</span>
          <span>{soDeLoi} đề còn lỗi cần sửa ({soLoi} lỗi)</span>
          <span>{trung.length} nhóm câu trùng giữa các đề</span>
        </div>
      )}

      <ul className="space-y-2">
        {dong.map((d) => {
          const m = mo === d.id;
          const hopLe = d.kq?.hopLe;
          return (
            <li key={d.id} className="the-tke p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {d.kq == null ? <AlertTriangle className="w-5 h-5 text-slate-400" /> : hopLe ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                <span className="font-semibold text-slate-900">{d.maDe} · {tenMon(d.maMon)} · {tenKy(d.ky)}</span>
                <span className="text-xs text-slate-500">{d.kq ? `${d.kq.loi.length} lỗi · ${d.kq.canhBao.length} cảnh báo` : d.loiTai}</span>
                <span className="ml-auto flex gap-3 text-sm">
                  {d.kq && (d.kq.loi.length > 0 || d.kq.canhBao.length > 0) && <button type="button" className="underline" onClick={() => setMo(m ? null : d.id)}>{m ? 'Thu gọn' : 'Xem chi tiết'}</button>}
                  <Link className="underline" href={`/tests`}>Kho đề</Link>
                  <Link className="underline" href={`/tao-de?mon=${d.maMon}&ky=${d.ky}`}>Mở bước 4</Link>
                </span>
              </div>
              {m && d.kq && (
                <div className="grid gap-2 text-sm">
                  {d.kq.loi.length > 0 && <ul className="list-disc pl-6 text-red-800 space-y-0.5">{d.kq.loi.map((l) => <li key={l}>{l}</li>)}</ul>}
                  {d.kq.canhBao.length > 0 && <ul className="list-disc pl-6 text-amber-900 space-y-0.5">{d.kq.canhBao.map((l) => <li key={l}>{l}</li>)}</ul>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {trung.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h2 className="font-semibold text-amber-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Câu giống nhau giữa các đề</h2>
          <p className="text-sm text-amber-900">Cùng đề bài và cùng phương án. Nếu hai đề dành cho hai kì khác nhau thì thầy cô nên đổi bớt để học sinh không gặp lại câu cũ.</p>
          <ul className="space-y-2 text-sm">
            {trung.map((g, i) => (
              <li key={i} className="rounded-lg bg-white p-2 border border-amber-200">
                <div className="text-slate-900 whitespace-pre-line">{g.deBai.split('\n').slice(0, 2).join('\n')}</div>
                <div className="text-xs text-slate-600 mt-1">{tenMon(g.maMon)}: {g.cacDe.map((x) => `${x.maDe} (${x.cau}, ${tenKy(x.ky)})`).join(' · ')}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
