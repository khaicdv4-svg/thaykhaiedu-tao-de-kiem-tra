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
import { useAuth } from '@/core/contexts/AuthContext';
import { HoSoDangLam } from '@/components/dashboard/HoSoDangLam';

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

const BUOC_GIAI_THICH = [
  { so: 1, ten: 'Thiết lập', moTa: 'Chọn môn và kì kiểm tra của khối đang làm việc', href: '/test-builder' },
  { so: 2, ten: 'Ma trận riêng', moTa: 'Lấy từ ma trận chung của tổ, xem lại rồi xác nhận', href: '/matrices' },
  { so: 3, ten: 'Bản đặc tả', moTa: 'Mỗi câu một YCCĐ, mức độ, bài và tuần học', href: '/dac-ta' },
  { so: 4, ten: 'Soạn đề', moTa: 'Soạn câu theo đặc tả, kiểm tra và xuất Word', href: '/tao-de' },
  { so: 5, ten: 'Duyệt đề', moTa: 'Kiểm tra chéo, tổ trưởng duyệt, gửi Ban giám hiệu', href: '/tests' },
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
  const { profile, khoiLamViec } = useAuth();
  const [so, setSo] = useState<SoLieu>({ deDaTao: null, baiDocDaDuyet: null, maTranDaXacNhan: null, monDaNhapPpct: null });

  useEffect(() => {
    let huy = false;
    Promise.all([
      dem('de_kiem_tra', (q) => q.eq('khoi', khoiLamViec)),
      dem('reading_passages', (q) => q.eq('status', 'APPROVED').eq('grade', khoiLamViec)),
      dem('tai_lieu_ma_tran', (q) => q.eq('loai', 'CHUNG').eq('trang_thai', 'DA_XAC_NHAN').eq('khoi', khoiLamViec)),
      dem('curriculum_sources', (q) => q.eq('grade', khoiLamViec)),
    ]).then(([a, b, c, d]) => {
      if (!huy) setSo({ deDaTao: a, baiDocDaDuyet: b, maTranDaXacNhan: c, monDaNhapPpct: d });
    });
    return () => { huy = true; };
  }, [khoiLamViec]);

  return (
    <div className="space-y-5">
      {/* Lối vào chính: tiêu đề, nút tạo đề và đường 5 bước */}
      <section className="the-tke overflow-hidden" aria-labelledby="tieu-de-tao-de">
        {/* Banner: nền tím họa tiết, chữ in hoa đổ bóng 3D bên trái, hình học sinh bên phải (ẩn trên điện thoại) */}
        <div className="relative flex items-stretch justify-between overflow-hidden bg-[#3b1fa8] bg-[url('/banner-tieu-de-nen.webp')] bg-cover bg-left">
          <div className="relative z-10 flex-1 min-w-0 self-center px-6 py-8 sm:px-10 sm:py-10 xl:px-14 space-y-4">
            <span className="inline-block rounded-full bg-[#ffd23f] px-4 py-1.5 text-sm sm:text-base font-extrabold text-[#3b1fa8] shadow-[0_4px_0_#d4a20f]">
              ★ TIỂU HỌC LỚP 1–5
            </span>
            <h1 id="tieu-de-tao-de" className="chu-3d font-black uppercase tracking-wide leading-[1.12] text-[28px] sm:text-[36px] md:text-[30px] xl:text-[44px] 2xl:text-[56px]">
              <span className="whitespace-nowrap">Xưởng sản xuất</span>
              <br />
              <span className="whitespace-nowrap">đề kiểm tra <span className="chu-3d-vang">AI</span></span>
            </h1>
            <p className="inline-block rounded-xl border border-white/35 bg-white/15 px-4 py-2 text-sm sm:text-base xl:text-lg font-semibold text-white">
              ThayKhaiEdu{profile.organizationName ? ` – ${profile.organizationName}` : ''}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/banner-hoc-sinh.webp"
            alt="Hai học sinh tiểu học mặc đồng phục, cầm sách và bài kiểm tra điểm 10"
            className="hidden md:block self-end shrink-0 h-[250px] lg:h-[230px] xl:h-[300px] 2xl:h-[340px] w-auto"
          />
        </div>

        {/* Lời dẫn và các nút chính, ngay dưới banner */}
        <div className="p-5 sm:px-8 sm:py-6 flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-6">
          <p className="flex-1 text-[15px] text-slate-600">
            Đề đi qua 5 bước, bước sau kế thừa bước trước đã xác nhận. AI làm phần nặng, thầy cô xem và quyết định.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/test-builder" className="nut-tke text-base px-7 py-3.5">
              <Plus className="w-5 h-5" /> Tạo đề kiểm tra mới
            </Link>
            <div className="flex flex-col min-[430px]:flex-row gap-3">
              <Link href="/tests" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                <FolderOpen className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Kho đề của tôi</span>
              </Link>
              <Link href="#ho-so-dang-lam" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                <History className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Tiếp tục bản nháp</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Đường 5 bước: các trạm nối nhau, mỗi trạm một câu giải thích */}
        <ol className="grid grid-cols-1 md:grid-cols-5 border-t border-slate-100 bg-linear-to-b from-indigo-50/60 to-white">
          {BUOC_GIAI_THICH.map((b, i) => (
            <li key={b.so} className="relative">
              <Link href={b.href} className="group flex md:flex-col gap-3 md:gap-2 p-4 sm:px-6 sm:py-5 h-full hover:bg-white focus-visible:bg-white">
                {/* Đường nối giữa các trạm */}
                {i < BUOC_GIAI_THICH.length - 1 && (
                  <span aria-hidden className="hidden md:block absolute top-[39px] left-[calc(1.5rem+44px)] right-[calc(-1.5rem+4px)] h-0.5 bg-indigo-200" />
                )}
                {i < BUOC_GIAI_THICH.length - 1 && (
                  <span aria-hidden className="md:hidden absolute left-[35px] sm:left-[43px] top-[60px] sm:top-[64px] -bottom-3 w-0.5 bg-indigo-200" />
                )}
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-extrabold text-indigo-700 ring-2 ring-indigo-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:ring-indigo-600 transition-colors">
                  {b.so}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-slate-900 group-hover:text-indigo-700">{b.ten}</span>
                  <span className="block text-[13px] text-slate-500 leading-snug mt-0.5">{b.moTa}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Hồ sơ đề đang làm dở: vào đúng bước làm tiếp */}
      <HoSoDangLam />

      {/* Số liệu của trường */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {THE.map((t) => {
          const Icon = t.icon;
          const gt = so[t.khoa];
          return (
            <Link key={t.khoa} href={t.href} className="the-tke p-4 flex items-center gap-3 hover:border-indigo-200">
              <div className={`w-11 h-11 rounded-xl bg-linear-to-br ${t.mau} text-white flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{gt === null ? '–' : gt.toLocaleString('vi-VN')}</div>
                <div className="text-[13px] font-medium text-slate-600 leading-snug mt-1">{t.ten}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
