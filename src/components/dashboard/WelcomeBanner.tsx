import React from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Layers, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DEFAULT_APP_CONFIG } from '@/core/config/app-config';

export function WelcomeBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-md">
      {/* Background Decorative Element */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-20 -top-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-blue-100 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Nền tảng kiểm định & Tạo đề kiểm tra AI định kỳ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Chào mừng Thầy/Cô đến với {DEFAULT_APP_CONFIG.brandName}
          </h1>

          <p className="text-sm text-blue-100/90 leading-relaxed font-normal">
            Hệ thống hỗ trợ Giáo viên Tiểu học khởi tạo, kiểm định, kiểm tra chéo, phê duyệt và xuất hồ sơ đề kiểm tra định kỳ (Khối 1 - 5) bám sát Chuẩn YCCĐ GDPT.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <Link href="/test-builder">
            <Button
              size="lg"
              className="bg-white hover:bg-slate-100 text-blue-700 border-white shadow-md font-semibold cursor-pointer"
              icon={<Plus className="w-5 h-5 text-blue-600" />}
            >
              Tạo đề mới
            </Button>
          </Link>

          <Link href="/sources">
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 border border-white/20 font-medium cursor-pointer"
              icon={<Layers className="w-4 h-4 text-blue-200" />}
            >
              Chương trình & Nguồn
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
