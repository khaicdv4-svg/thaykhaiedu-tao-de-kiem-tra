'use client';

/**
 * ThayKhaiEdu - Thanh "Hồ sơ đề" ở đầu các bước 2–5 và hook dùng chung.
 * Hiện Lớp (khối đang làm việc) · môn · kì đang làm; muốn làm đề khác thì bấm "Đổi môn, kì" về bước 1.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import { SU_KIEN_HO_SO, docHoSoDe, ganHoSo, tenKyHoSo, tenMonHoSo, type HoSoDe } from '@/core/ho-so-de/ho-so-de';
import { useAuth } from '@/core/contexts/AuthContext';

/** Hồ sơ đề hiện tại; cập nhật khi bước khác đổi hồ sơ (cùng tab hoặc tab khác). */
export function useHoSoDe(): HoSoDe | null {
  const [hoSo, setHoSo] = useState<HoSoDe | null>(null);
  useEffect(() => {
    const doc = () => setHoSo(docHoSoDe());
    doc();
    window.addEventListener(SU_KIEN_HO_SO, doc);
    window.addEventListener('storage', doc);
    window.addEventListener('popstate', doc);
    return () => {
      window.removeEventListener(SU_KIEN_HO_SO, doc);
      window.removeEventListener('storage', doc);
      window.removeEventListener('popstate', doc);
    };
  }, []);
  return hoSo;
}

interface Props {
  mon: string;
  ky: string;
  /** Thông tin thêm của bước, ví dụ "ma trận riêng phiên bản 2" */
  ghiChu?: string;
  dangTai?: boolean;
}

export function ThanhHoSoDe({ mon, ky, ghiChu, dangTai }: Props) {
  const { khoiLamViec } = useAuth();
  return (
    <div className="the-tke px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 shrink-0"><FolderOpen className="w-5 h-5" /></span>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">Hồ sơ đề đang làm</div>
          <div className="font-bold text-slate-900">Lớp {khoiLamViec} · {tenMonHoSo(mon)} · {tenKyHoSo(ky)}</div>
        </div>
      </div>
      {ghiChu && <span className="text-sm text-slate-500">{ghiChu}</span>}
      {dangTai && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" aria-label="Đang tải" />}
      <Link
        href={ganHoSo('/test-builder', { mon, ky: ky as HoSoDe['ky'] })}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <RefreshCw className="w-4 h-4" /> Đổi môn, kì
      </Link>
    </div>
  );
}
