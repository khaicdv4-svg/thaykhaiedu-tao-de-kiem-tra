'use client';

/**
 * ThayKhaiEdu - Chọn khối lớp làm việc ở trang Tổng quan: "Không gian làm việc của khối [danh sách xổ xuống]".
 * Chọn một lần ở đây; mọi chức năng (Bộ não, ma trận, đặc tả, soạn đề, ngân hàng câu hỏi, mẫu đề,
 * kho PPCT, kho bài đọc) tự chuyển sang khối này. Khối được nhớ trong tài khoản nên máy tính, điện thoại dùng chung.
 */

import React from 'react';
import { ChevronDown, GraduationCap } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { TAT_CA_KHOI } from '@/core/khoi-lam-viec';

export function ChonKhoiLamViec() {
  const { khoiLamViec, dsKhoi, doiKhoiLamViec } = useAuth();

  return (
    <section id="chon-khoi" className="the-tke p-4 sm:p-5 scroll-mt-24" aria-labelledby="tieu-de-chon-khoi">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="tieu-de-chon-khoi" className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-base sm:text-lg font-bold text-slate-900">
            <label htmlFor="o-chon-khoi">Không gian làm việc của khối</label>
            <span className="relative inline-flex">
              <select
                id="o-chon-khoi"
                value={khoiLamViec}
                onChange={(e) => doiKhoiLamViec(Number(e.target.value))}
                className="appearance-none cursor-pointer rounded-lg border-2 border-indigo-200 bg-indigo-50 py-1 pl-3 pr-9 text-base sm:text-lg font-extrabold text-indigo-700 hover:border-indigo-400 focus:border-indigo-600 focus:outline-none"
              >
                {TAT_CA_KHOI.map((k) => {
                  const co = dsKhoi.includes(k);
                  return (
                    <option key={k} value={k} disabled={!co}>
                      {co ? k : `${k} (trường chưa bật)`}
                    </option>
                  );
                })}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
            </span>
          </h2>
          <p className="text-[13px] text-slate-600 leading-snug mt-1">
            Các chức năng khác và kho phân phối chương trình tự chuyển theo khối chọn ở đây. Đổi khối không xóa dữ liệu của khối cũ.
          </p>
        </div>
      </div>
    </section>
  );
}
