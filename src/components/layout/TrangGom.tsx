'use client';

/**
 * Trang gom chức năng theo vai trò (Tổ trưởng, Quản trị).
 * Mỗi phần là một nhóm việc; mỗi thẻ dẫn tới một trang. Thẻ người dùng không có quyền thì không hiện.
 */

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { getNavigationForRole } from '@/core/constants/navigation';

export interface TheChucNang {
  ten: string;
  moTa: string;
  href: string;
  icon: LucideIcon;
  /** Trang đích để xét quyền (mặc định lấy phần đường dẫn trước dấu # ). */
  xetQuyen?: string;
}
export interface PhanGom { ten: string; moTa?: string; the: TheChucNang[] }

interface Props {
  tieuDe: string;
  moTa: string;
  icon: LucideIcon;
  phan: PhanGom[];
  /** Hiện phía trên các phần (vd. tóm tắt tình trạng). */
  dauTrang?: React.ReactNode;
  /** Vai trò được vào trang; vai trò khác thấy lời nhắn. */
  choVaiTro: string[];
}

export function TrangGom({ tieuDe, moTa, icon: Icon, phan, dauTrang, choVaiTro }: Props) {
  const { activeRole, isLoading } = useAuth();
  const duocVao = new Set(getNavigationForRole(activeRole).map((m) => m.href));
  const coQuyen = (t: TheChucNang) => duocVao.has(t.xetQuyen ?? t.href.split('#')[0]);

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-6">
      <header className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
          <Icon className="w-6 h-6" />
        </span>
        <div>
          <h1 className="tieu-de-trang">{tieuDe}</h1>
          <p className="text-[15px] text-slate-600 mt-1 max-w-3xl">{moTa}</p>
        </div>
      </header>

      {!isLoading && !choVaiTro.includes(activeRole) ? (
        <div className="the-tke p-6 text-slate-700">
          Trang này dành cho {tieuDe.toLowerCase().replace(/^trang /, '')}. Tài khoản đang xem với vai trò khác nên chưa có việc nào ở đây.
        </div>
      ) : (
        <>
          {dauTrang}
          {phan.map((p) => {
            const ds = p.the.filter(coQuyen);
            if (ds.length === 0) return null;
            return (
              <section key={p.ten} aria-labelledby={`phan-${p.ten}`} className="space-y-3">
                <div>
                  <h2 id={`phan-${p.ten}`} className="text-lg font-bold text-slate-900">{p.ten}</h2>
                  {p.moTa && <p className="text-sm text-slate-500">{p.moTa}</p>}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ds.map((t) => {
                    const TIcon = t.icon;
                    return (
                      <Link
                        key={t.href + t.ten}
                        href={t.href}
                        className="group bg-white rounded-2xl border border-slate-200 p-4 flex gap-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                      >
                        <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <TIcon className="w-5 h-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900 group-hover:text-indigo-800">{t.ten}</span>
                          <span className="block text-[13px] text-slate-500 leading-snug mt-0.5">{t.moTa}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
