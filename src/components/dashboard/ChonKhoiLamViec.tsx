'use client';

/**
 * ThayKhaiEdu - Ô chọn khối lớp làm việc ở trang Tổng quan.
 * Chọn một lần ở đây; mọi chức năng (Bộ não, ma trận, đặc tả, soạn đề, ngân hàng câu hỏi, mẫu đề,
 * kho PPCT, kho bài đọc) tự chuyển sang khối này. Khối được nhớ trong tài khoản nên máy tính, điện thoại dùng chung.
 */

import React from 'react';
import { Check, GraduationCap } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { TAT_CA_KHOI } from '@/core/khoi-lam-viec';

export function ChonKhoiLamViec() {
  const { khoiLamViec, dsKhoi, doiKhoiLamViec } = useAuth();

  return (
    <section id="chon-khoi" className="the-tke p-4 sm:p-5 scroll-mt-24" aria-labelledby="tieu-de-chon-khoi">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 id="tieu-de-chon-khoi" className="text-base font-bold text-slate-900">
              Khối lớp đang làm việc: <span className="text-indigo-700">Lớp {khoiLamViec}</span>
            </h2>
            <p className="text-[13px] text-slate-600 leading-snug mt-0.5">
              Các chức năng khác và kho phân phối chương trình tự chuyển theo khối chọn ở đây. Đổi khối không xóa dữ liệu của khối cũ.
            </p>
          </div>
        </div>

        <div role="radiogroup" aria-label="Chọn khối lớp làm việc" className="grid grid-cols-5 gap-2 shrink-0">
          {TAT_CA_KHOI.map((k) => {
            const dang = k === khoiLamViec;
            const co = dsKhoi.includes(k);
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={dang}
                disabled={!co}
                title={co ? `Làm việc với Lớp ${k}` : `Trường chưa bật Lớp ${k} (Cài đặt hệ thống)`}
                onClick={() => doiKhoiLamViec(k)}
                className={`relative min-w-14 sm:min-w-16 rounded-xl border-2 px-3 py-2.5 text-center transition-colors ${
                  dang
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : co
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
                      : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                }`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">Lớp</span>
                <span className="block text-xl font-extrabold leading-none mt-0.5">{k}</span>
                {dang && <Check aria-hidden className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 p-0.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
