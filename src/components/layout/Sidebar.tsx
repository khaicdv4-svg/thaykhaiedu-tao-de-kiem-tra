'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavigationForRole } from '@/core/constants/navigation';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/core/contexts/AuthContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Filter navigation items dynamically according to the user's active role
  const visibleNavItems = getNavigationForRole(activeRole);

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'} flex flex-col justify-between`}
      >
        {/* Navigation list */}
        <div className="p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {/* Header row in sidebar: Label + Collapse Toggle button */}
          <div className="flex items-center justify-between px-2 py-2">
            {!isCollapsed ? (
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Phân hệ nghiệp vụ
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 uppercase text-center w-full hidden lg:block">
                Menu
              </span>
            )}

            {/* Desktop Collapse Toggle Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={item.title}
                  className={`group flex items-center ${
                    isCollapsed ? 'lg:justify-center px-2' : 'justify-between px-3'
                  } py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className={`${isCollapsed ? 'lg:hidden' : 'block'} whitespace-nowrap`}>
                      {item.title}
                    </span>
                  </div>

                  {item.badge && !isCollapsed && (
                    <Badge variant="ai" className="text-[9px] px-1.5 py-0.2 shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          {!isCollapsed ? (
            <div className="p-2.5 rounded-lg border border-slate-200/60 bg-white">
              <p className="text-[11px] font-semibold text-slate-800">Phiên bản Hệ thống</p>
              <p className="text-[10px] text-slate-500 mt-0.5">ThayKhaiEdu Baseline v0.1.0</p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>GD Tiểu học (Khối 1-5)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center py-2 text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Trạng thái: Hoạt động" />
              <span className="text-[9px] font-bold text-slate-400 mt-1">v0.1</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
