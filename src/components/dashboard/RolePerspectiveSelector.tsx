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
    label: 'Tổ trưởng Khối 4',
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

export function RolePerspectiveSelector() {
  const { profile, activeRole, setActiveRole } = useAuth();

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            Góc nhìn giao diện theo vai trò (RBAC):
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tài khoản đăng nhập thực tế: <strong className="text-slate-800">{profile.fullName}</strong> ({profile.email || 'Hệ thống'}) — Vai trò gốc trong DB: <span className="font-semibold text-blue-700">{profile.role}</span>
          </p>
        </div>

        <div className="text-[11px] text-slate-400 sm:text-right">
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
                  ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-100 shadow-2xs'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 mr-2.5 ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      Đang xem
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
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
