'use client';

/**
 * ThayKhaiEdu - Thanh tiến trình 5 bước tạo đề (thống nhất của dự án):
 * 1. Thiết lập → 2. Ma trận → 3. Đặc tả → 4. Tạo đề → 5. Duyệt đề.
 * Bước đang làm: viên tím – xanh nổi bật; bước xong: dấu tích; bước chưa tới: nhạt.
 */

import React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, ClipboardCheck, Grid3x3, ListChecks, Settings2, Sparkles } from 'lucide-react';

export const NAM_BUOC = [
  { so: 1, ten: 'Thiết lập', href: '/test-builder', icon: Settings2 },
  { so: 2, ten: 'Ma trận', href: '/matrices', icon: Grid3x3 },
  { so: 3, ten: 'Đặc tả', href: '/dac-ta', icon: ListChecks },
  { so: 4, ten: 'Tạo đề', href: '/tao-de', icon: Sparkles },
  { so: 5, ten: 'Duyệt đề', href: '/tests', icon: ClipboardCheck },
] as const;

interface Props {
  /** Bước đang làm (1–5). Bỏ trống: chỉ hiện để dẫn đường, không tô bước nào. */
  buocHienTai?: number;
  /** Các bước đã xong (đánh dấu tích). */
  daXong?: number[];
  /** Cho bấm để chuyển trang. */
  choBam?: boolean;
}

export function TienTrinh5Buoc({ buocHienTai, daXong = [], choBam = false }: Props) {
  return (
    <nav aria-label="Tiến trình tạo đề" className="the-tke p-2 sm:p-3">
      <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
        {NAM_BUOC.map((b, i) => {
          const dangLam = buocHienTai === b.so;
          const xong = daXong.includes(b.so);
          const Icon = b.icon;
          const noiDung = (
            <span
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 sm:px-4 py-2.5 text-sm font-semibold transition
                ${dangLam
                  ? 'text-white bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30'
                  : xong
                    ? 'text-slate-800 bg-white border border-slate-200'
                    : 'text-slate-500 bg-slate-50 border border-slate-200/70'}`}
              aria-current={dangLam ? 'step' : undefined}
            >
              {xong && !dangLam ? (
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
              ) : (
                <Icon className={`w-5 h-5 ${dangLam ? 'text-white' : 'text-slate-400'}`} />
              )}
              {b.so}. {b.ten}
            </span>
          );
          return (
            <li key={b.so} className="flex items-center gap-1 sm:gap-2">
              {choBam ? <Link href={b.href} className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{noiDung}</Link> : noiDung}
              {i < NAM_BUOC.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
