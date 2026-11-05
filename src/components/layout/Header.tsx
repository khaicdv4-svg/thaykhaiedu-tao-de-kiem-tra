'use client';

import React from 'react';
import { Sparkles, School, Bell, Menu, X, Database, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { DEFAULT_APP_CONFIG } from '@/core/config/app-config';
import { getAppDataMode } from '@/lib/supabase/config';
import { useAuth } from '@/core/contexts/AuthContext';
import { UserRole } from '@/types/permissions';

interface HeaderProps {
  onToggleMobileNav?: () => void;
  isMobileOpen?: boolean;
}

const ROLE_TITLE_MAP: Record<UserRole, string> = {
  TEACHER: 'Giáo viên Bộ môn',
  GROUP_LEADER: 'Tổ trưởng Chuyên môn Khối 4',
  DEPUTY_GROUP_LEADER: 'Tổ phó Chuyên môn Khối 4',
  SCHOOL_ADMIN: 'Ban Giám Hiệu',
  SYSTEM_ADMIN: 'Quản trị viên Hệ thống',
};

export function Header({ onToggleMobileNav, isMobileOpen }: HeaderProps) {
  const dataMode = getAppDataMode();
  const { profile, activeRole, signOut } = useAuth();

  const roleTitle = ROLE_TITLE_MAP[activeRole] || 'Giáo viên';
  const initials = profile.fullName ? profile.fullName.trim().split(' ').pop()?.substring(0, 2).toUpperCase() || 'TK' : 'TK';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Brand & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileNav}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xs font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base">
                  {DEFAULT_APP_CONFIG.brandName}
                </span>
                <Badge variant="ai" className="text-[10px] px-1.5 py-0.2">
                  AI PRO
                </Badge>
              </div>
              <p className="text-xs font-medium text-slate-500 hidden sm:block">
                {DEFAULT_APP_CONFIG.productName}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Context Header */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Data Mode Indicator */}
          {dataMode === 'REAL_DATA' ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>DỮ LIỆU THẬT</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span>DỮ LIỆU MẪU</span>
            </div>
          )}

          {/* Active Organization / School Indicator */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg">
            <School className="w-4 h-4 text-slate-500" />
            <div className="text-left">
              <p className="text-[11px] font-medium text-slate-400 leading-none">
                Đơn vị trường
              </p>
              <p className="text-xs font-semibold text-slate-700 leading-tight">
                {profile.organizationName}
              </p>
            </div>
          </div>

          {/* Notifications Indicator */}
          <button
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
            title="Thông báo hệ thống"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {/* User Profile & Role */}
          <div className="flex items-center space-x-2.5 border-l border-slate-200 pl-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {profile.fullName}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {roleTitle} • {profile.department}
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
