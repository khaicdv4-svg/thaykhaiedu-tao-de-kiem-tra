'use client';

/**
 * ThayKhaiEdu - Đầu trang chủ: thẻ số liệu thật, nút "Tạo đề kiểm tra mới", "Kho đề của tôi",
 * "Tiếp tục bản nháp" và thanh tiến trình 5 bước.
 * Số liệu đọc thẳng từ cơ sở dữ liệu của trường; chưa đọc được thì hiện "–", không dùng số mẫu.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, FileText, FolderOpen, History, Layers, Plus, Table2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';

interface SoLieu {
  deDaTao: number | null;
  baiDocDaDuyet: number | null;
  maTranDaXacNhan: number | null;
  monDaNhapPpct: number | null;
}

const THE: { khoa: keyof SoLieu; ten: string; ghiChu: string; icon: typeof FileText; mau: string; href: string }[] = [
  { khoa: 'deDaTao', ten: 'Đề đã tạo', ghiChu: 'trong kho đề của trường', icon: FileText, mau: 'from-blue-500 to-indigo-500', href: '/tests' },
  { khoa: 'baiDocDaDuyet', ten: 'Bài đọc đã duyệt', ghiChu: 'kho ngữ liệu Tiếng Việt', icon: BookOpenCheck, mau: 'from-violet-500 to-fuchsia-500', href: '/reading-passages' },
  { khoa: 'maTranDaXacNhan', ten: 'Ma trận chung đã xác nhận', ghiChu: 'môn × kì kiểm tra', icon: Table2, mau: 'from-amber-400 to-orange-500', href: '/ma-tran-chung' },
  { khoa: 'monDaNhapPpct', ten: 'Môn đã nhập PPCT', ghiChu: 'phân phối chương trình', icon: Layers, mau: 'from-emerald-400 to-teal-500', href: '/sources' },
];

async function dem(bang: string, loc?: (q: any) => any): Promise<number | null> {
  const supabase = createClient();
  if (!supabase) return null;
  let q = supabase.from(bang).select('id', { count: 'exact', head: true });
  if (loc) q = loc(q);
  const { count, error } = await q;
  return error ? null : count ?? 0;
}

export function WelcomeBanner() {
  const [so, setSo] = useState<SoLieu>({ deDaTao: null, baiDocDaDuyet: null, maTranDaXacNhan: null, monDaNhapPpct: null });

  useEffect(() => {
    let huy = false;
    Promise.all([
      dem('tests'),
      dem('reading_passages', (q) => q.eq('status', 'APPROVED')),
      dem('tai_lieu_ma_tran', (q) => q.eq('loai', 'CHUNG').eq('trang_thai', 'DA_XAC_NHAN')),
      dem('curriculum_sources'),
    ]).then(([a, b, c, d]) => {
      if (!huy) setSo({ deDaTao: a, baiDocDaDuyet: b, maTranDaXacNhan: c, monDaNhapPpct: d });
    });
    return () => { huy = true; };
  }, []);

  return (
    <div className="space-y-5">
      {/* Thẻ số liệu */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {THE.map((t) => {
          const Icon = t.icon;
          const gt = so[t.khoa];
          return (
            <Link key={t.khoa} href={t.href} className="the-tke p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 hover:-translate-y-0.5 transition">
              <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${t.mau} text-white flex items-center justify-center shadow-md shrink-0`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-600 leading-snug">{t.ten}</div>
                <div className="text-2xl font-extrabold text-slate-900 leading-tight">{gt === null ? '–' : gt.toLocaleString('vi-VN')}</div>
                <div className="text-xs text-slate-400 leading-snug">{t.ghiChu}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tiến trình 5 bước */}
      <TienTrinh5Buoc choBam />

      {/* Lối vào chính */}
      <div className="the-tke p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
        <div className="absolute right-24 -bottom-20 w-56 h-56 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Tạo đề kiểm tra lớp 1–5</h1>
            <p className="text-slate-600 max-w-2xl">
              Lập đề theo ma trận và bản đặc tả đã xác nhận, bám yêu cầu cần đạt và phạm vi đã học. AI làm giúp phần nặng, thầy cô xem và quyết định.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/test-builder" className="nut-tke text-base px-7 py-4">
              <Plus className="w-5 h-5" /> Tạo đề kiểm tra mới
            </Link>
            <div className="flex gap-3">
              <Link href="/tests" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                <FolderOpen className="w-4 h-4" /> Kho đề của tôi
              </Link>
              <Link href="/tests" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                <History className="w-4 h-4" /> Tiếp tục bản nháp
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
