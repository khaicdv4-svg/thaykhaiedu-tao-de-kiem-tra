'use client';

/**
 * ThayKhaiEdu - Thanh điều hướng bên trái (phong cách tím – xanh, mục đang mở là viên trắng).
 * Cao hết màn hình; logo nằm trên cùng của thanh.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavigationForRole } from '@/core/constants/navigation';
import { useAuth } from '@/core/contexts/AuthContext';
import { ChevronLeft, ChevronRight, GraduationCap, Sparkles } from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { activeRole } = useAuth();
  const visibleNavItems = getNavigationForRole(activeRole);

  return (
    <>
      {/* Nền mờ khi mở menu trên điện thoại */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col text-white transition-all duration-300 ease-in-out lg:translate-x-0
          bg-linear-to-b from-[#3b2bb8] via-[#3f3fd0] to-[#2b5fd9] shadow-xl
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'}`}
      >
        {/* Logo */}
        <div className={`flex items-center h-20 shrink-0 ${isCollapsed ? 'lg:justify-center px-3' : 'px-5'} gap-3 border-b border-white/10`}>
          <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className={isCollapsed ? 'lg:hidden' : ''}>
            <div className="text-lg font-extrabold tracking-tight leading-none">ThayKhaiEdu</div>
            <div className="text-[11px] text-indigo-100/80 mt-1">Xưởng đề kiểm tra</div>
          </div>
        </div>

        {/* Danh sách mục */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1" aria-label="Điều hướng chính">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onCloseMobile}
                title={item.title}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-xl py-2.5 text-[13.5px] font-medium transition-all
                  ${isCollapsed ? 'lg:justify-center px-2' : 'px-3'}
                  ${isActive
                    ? 'bg-white text-indigo-700 font-semibold shadow-md shadow-indigo-900/20'
                    : 'text-indigo-50/90 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-violet-600' : 'text-indigo-100/80 group-hover:text-white'}`} />
                <span className={`${isCollapsed ? 'lg:hidden' : ''} truncate`}>{item.title}</span>
                {item.badge && !isCollapsed && (
                  <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? 'bg-violet-100 text-violet-700' : 'bg-white/15 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Chân thanh: thẻ AI + nút thu gọn */}
        <div className="p-3 shrink-0 space-y-2">
          {!isCollapsed && (
            <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 p-3 text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-amber-300" /> AI hỗ trợ, thầy cô quyết định
              </div>
              <p className="mt-1 text-indigo-100/80 leading-snug">Tiểu học lớp 1–5 · GDPT 2018 · Thông tư 27</p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs text-indigo-100/80 hover:bg-white/10 hover:text-white"
            aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Thu gọn</>}
          </button>
        </div>
      </aside>
    </>
  );
}
