'use client';

/**
 * ThayKhaiEdu - Thẻ theo dõi kết nối với kho chung PPCT HUB.
 * Cho biết từng môn của từng lớp: bản trên kho chung, bản Xưởng đang dùng, có khớp không.
 * Tổ trưởng, tổ phó, quản trị bấm Đồng bộ để lấy bản mới về; giáo viên chỉ xem.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, CircleCheck, Network, RefreshCw, TriangleAlert, Unplug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/core/contexts/AuthContext';
import { baoCapNhatHub, useTrangThaiHub } from '@/lib/hooks/useTrangThaiHub';
import {
  canDongBo,
  NHAN_KET_NOI,
  NHAN_TRANG_THAI_MON,
  ngayGio,
  type TrangThaiKetNoi,
  type TrangThaiMon,
} from '@/core/curriculum/ppct-hub-ket-noi';

const VAI_TRO_DONG_BO = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

export const MAU_KET_NOI: Record<TrangThaiKetNoi, { cham: string; khung: string }> = {
  DONG_BO: { cham: 'bg-emerald-500', khung: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  CAN_DONG_BO: { cham: 'bg-amber-500', khung: 'bg-amber-50 border-amber-200 text-amber-800' },
  MAT_KET_NOI: { cham: 'bg-red-500', khung: 'bg-red-50 border-red-200 text-red-800' },
  CHUA_CAU_HINH: { cham: 'bg-slate-400', khung: 'bg-slate-50 border-slate-200 text-slate-700' },
};

const MAU_MON: Record<TrangThaiMon, string> = {
  khop: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  co_ban_moi: 'bg-amber-50 text-amber-800 border-amber-200',
  lech_so_tiet: 'bg-amber-50 text-amber-800 border-amber-200',
  chua_dong_bo: 'bg-slate-50 text-slate-700 border-slate-200',
  hub_da_go: 'bg-red-50 text-red-800 border-red-200',
};

export function TrangThaiPpctHub({ lopMacDinh: lopTruyen }: { lopMacDinh?: number }) {
  const { khoiLamViec } = useAuth();
  const lopMacDinh = lopTruyen ?? khoiLamViec;
  const { trangThai, dangTai, napLai } = useTrangThaiHub();
  const { activeRole } = useAuth();
  const duocDongBo = VAI_TRO_DONG_BO.includes(activeRole);

  const [lopChon, setLopChon] = useState<number | null>(null);
  const [dangDongBo, setDangDongBo] = useState<string | null>(null);
  const [thongDiep, setThongDiep] = useState<{ loai: 'ok' | 'loi'; chu: string } | null>(null);

  const dsLop = trangThai?.lop ?? [];
  // Mở sẵn tab lớp của khối đang làm việc; đổi khối ở Tổng quan thì tab đổi theo
  const coDsLop = dsLop.length > 0;
  useEffect(() => {
    if (!coDsLop) return;
    setLopChon(dsLop.some((l) => l.lop === lopMacDinh) ? lopMacDinh : dsLop[0].lop);
  }, [coDsLop, lopMacDinh]);

  const monCuaLop = useMemo(() => (trangThai?.mon ?? []).filter((m) => m.lop === lopChon), [trangThai, lopChon]);
  const tongLop = dsLop.find((l) => l.lop === lopChon);

  const dongBo = async (lop: number, mon: string | null) => {
    const khoa = mon ?? `lop-${lop}`;
    setDangDongBo(khoa);
    setThongDiep(null);
    try {
      const r = await fetch('/api/ppct-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lop, mon, namHoc: trangThai?.namHoc }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Đồng bộ không thành công.');
      const ds = d.ketQua as { tenMon: string; soTiet: number }[];
      setThongDiep({
        loai: 'ok',
        chu: ds.length === 1
          ? `Đã lấy ${ds[0].tenMon} lớp ${lop} về Xưởng (${ds[0].soTiet} tiết).`
          : `Đã lấy ${ds.length} môn lớp ${lop} về Xưởng (${ds.reduce((s, m) => s + m.soTiet, 0)} tiết).`,
      });
      baoCapNhatHub(d.trangThai);
    } catch (e) {
      setThongDiep({ loai: 'loi', chu: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangDongBo(null);
    }
  };

  const ketNoi: TrangThaiKetNoi = trangThai?.ketNoi ?? 'CHUA_CAU_HINH';
  const mau = MAU_KET_NOI[ketNoi];

  return (
    <Card id="ppct-hub">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Network className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <CardTitle>Kết nối kho chung PPCT HUB</CardTitle>
              <CardDescription>
                Xưởng lấy phân phối chương trình (tuần, bài, tiết) từ kho chung. Khi kho chung công bố bản mới, bấm Đồng bộ để ra đề theo bản đó.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {trangThai ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${mau.khung}`}>
                <span className={`h-2 w-2 rounded-full ${mau.cham}`} />
                {NHAN_KET_NOI[ketNoi]}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Đang kiểm tra…</span>
            )}
            <button
              type="button"
              onClick={napLai}
              disabled={dangTai}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              title="Kiểm tra lại kết nối"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dangTai ? 'animate-spin' : ''}`} />
              Kiểm tra lại
            </button>
          </div>
        </div>
        {trangThai && (
          <p className="mt-2 text-[11px] text-slate-500">
            Năm học {trangThai.namHoc} · kiểm tra lúc {ngayGio(trangThai.kiemTraLuc)}
            {trangThai.tong.tongMon > 0 && ` · ${trangThai.tong.khop}/${trangThai.tong.tongMon} môn khớp trên toàn kho`}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {trangThai?.loi && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <Unplug className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{trangThai.loi}</span>
          </div>
        )}

        {dsLop.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Chọn lớp">
            {dsLop.map((l) => {
              const chon = l.lop === lopChon;
              return (
                <button
                  key={l.lop}
                  type="button"
                  role="tab"
                  aria-selected={chon}
                  onClick={() => setLopChon(l.lop)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    chon ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Lớp {l.lop}
                  <span className={`rounded px-1 text-[10px] ${chon ? 'bg-white/20' : l.canDongBo && l.lanDongBoGanNhat ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {l.lanDongBoGanNhat ? `${l.khop}/${l.tongMon}` : 'chưa lấy'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {lopChon !== null && monCuaLop.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Môn</th>
                    <th className="px-3 py-2 text-left font-semibold">Kho chung</th>
                    <th className="px-3 py-2 text-left font-semibold">Trong Xưởng</th>
                    <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                    {duocDongBo && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monCuaLop.map((m) => (
                    <tr key={m.subjectId} className="align-top">
                      <td className="px-3 py-2 font-medium text-slate-900">{m.tenMon}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {m.hubSoTiet !== null ? (
                          <>
                            {m.hubSoTiet} tiết
                            <div className="text-[11px] text-slate-500">công bố {ngayGio(m.hubCongBoLuc)}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {m.xuongDongBoLuc ? (
                          <>
                            {m.xuongSoTiet ?? 0} tiết
                            <div className="text-[11px] text-slate-500">lấy về {ngayGio(m.xuongDongBoLuc)}</div>
                          </>
                        ) : <span className="text-slate-400">Chưa có</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${MAU_MON[m.trangThai]}`}
                          title={NHAN_TRANG_THAI_MON[m.trangThai].giaiThich}
                        >
                          {m.trangThai === 'khop' ? <CircleCheck className="w-3 h-3" /> : canDongBo(m.trangThai) ? <TriangleAlert className="w-3 h-3" /> : null}
                          {NHAN_TRANG_THAI_MON[m.trangThai].chu}
                        </span>
                      </td>
                      {duocDongBo && (
                        <td className="px-3 py-2 text-right">
                          {m.trangThai !== 'hub_da_go' && (
                            <button
                              type="button"
                              disabled={dangDongBo !== null}
                              onClick={() => dongBo(m.lop, m.subjectId)}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50 ${
                                canDongBo(m.trangThai) ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-indigo-700 hover:bg-indigo-50'
                              }`}
                            >
                              {dangDongBo === m.subjectId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowDownToLine className="w-3 h-3" />}
                              {canDongBo(m.trangThai) ? 'Đồng bộ' : 'Lấy lại'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">
                {tongLop?.lanDongBoGanNhat
                  ? `Lớp ${lopChon}: ${tongLop.khop}/${tongLop.tongMon} môn khớp, lần đồng bộ gần nhất ${ngayGio(tongLop.lanDongBoGanNhat)}.`
                  : `Lớp ${lopChon} chưa lấy môn nào về Xưởng.`}
                {!duocDongBo && ' Tổ trưởng hoặc tổ phó bấm đồng bộ khi kho chung có bản mới.'}
              </p>
              {duocDongBo && (
                <button
                  type="button"
                  disabled={dangDongBo !== null}
                  onClick={() => dongBo(lopChon, null)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {dangDongBo === `lop-${lopChon}` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                  Đồng bộ cả lớp {lopChon}
                </button>
              )}
            </div>
          </>
        )}

        {thongDiep && (
          <div className={`rounded-lg border px-3 py-2 text-xs ${thongDiep.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {thongDiep.chu}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
