'use client';

/**
 * ThayKhaiEdu - Role Perspective Selector
 * Allows switching view perspective (Teacher, Group Leader, School Admin)
 * while clearly displaying the real authenticated user identity.
 */

import React from 'react';
import { useAuth } from '@/core/contexts/AuthContext';
import { UserRole } from '@/types/permissions';
import { Shield, UserCheck, GraduationCap, Users } from 'lucide-react';

const ROLE_OPTIONS: { role: UserRole; label: string; icon: typeof UserCheck; desc: string }[] = [
  {
    role: 'TEACHER',
    label: 'Giáo viên',
    icon: GraduationCap,
    desc: 'Soạn đề, nhận phản biện chéo, đóng góp câu hỏi',
  },
  {
    role: 'GROUP_LEADER',
    label: 'Tổ trưởng',
    icon: Users,
    desc: 'Quản lý ma trận, phân công phản biện, duyệt đề tổ',
  },
  {
    role: 'SCHOOL_ADMIN',
    label: 'Ban Giám Hiệu',
    icon: Shield,
    desc: 'Phê duyệt đề cấp trường, quản trị phân quyền đơn vị',
  },
];

const TEN_VAI_TRO: Record<string, string> = { TEACHER: 'Giáo viên', GROUP_LEADER: 'Tổ trưởng', DEPUTY_GROUP_LEADER: 'Tổ phó', SCHOOL_ADMIN: 'Ban giám hiệu', SCHOOL_LEADERSHIP: 'Ban giám hiệu', SYSTEM_ADMIN: 'Quản trị hệ thống' };

export function RolePerspectiveSelector() {
  const { profile, activeRole, setActiveRole } = useAuth();

  return (
    <div className="the-tke p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <span className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
            Xem giao diện theo vai trò
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            Tài khoản đăng nhập thực tế: <strong className="text-slate-800">{profile.fullName}</strong> ({profile.email || 'Hệ thống'}) – vai trò: <span className="font-semibold text-indigo-700">{TEN_VAI_TRO[profile.role] ?? profile.role}</span>
          </p>
        </div>

        <div className="text-xs text-slate-400 sm:text-right">
          Đơn vị: <span className="font-semibold text-slate-700">{profile.organizationName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
        {ROLE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected =
            activeRole === opt.role ||
            (opt.role === 'GROUP_LEADER' && activeRole === 'DEPUTY_GROUP_LEADER') ||
            (opt.role === 'SCHOOL_ADMIN' && activeRole === 'SYSTEM_ADMIN');

          return (
            <button
              key={opt.role}
              type="button"
              onClick={() => setActiveRole(opt.role)}
              className={`flex items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-100 shadow-2xs'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 mr-2.5 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                      Đang xem
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
