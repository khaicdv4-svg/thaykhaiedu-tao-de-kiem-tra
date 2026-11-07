'use client';

/**
 * ThayKhaiEdu - Master Dashboard Page
 * Renders role-specific dashboards with real database stats and instant role perspective switcher.
 */

import React from 'react';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { RolePerspectiveSelector } from '@/components/dashboard/RolePerspectiveSelector';
import { TeacherDashboardView } from '@/components/dashboard/TeacherDashboardView';
import { GroupLeaderDashboardView } from '@/components/dashboard/GroupLeaderDashboardView';
import { SchoolAdminDashboardView } from '@/components/dashboard/SchoolAdminDashboardView';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import Link from 'next/link';
import { useAuth } from '@/core/contexts/AuthContext';

export default function DashboardPage() {
  const { activeRole } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Lời chào & Ngữ cảnh sản phẩm */}
      <WelcomeBanner />

      {/* 2. Bộ chuyển đổi góc nhìn vai trò (RBAC) */}
      {activeRole !== 'SCHOOL_LEADERSHIP' && <RolePerspectiveSelector />}

      {/* 3. Bố cục Dashboard chuyên biệt theo vai trò */}
      {activeRole === 'SCHOOL_LEADERSHIP' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Ban giám hiệu</h2>
          <p className="text-sm text-slate-600">Tài khoản Ban giám hiệu dùng để thẩm định, phê duyệt và phát hành đề, và ủy quyền khi vắng. Các chức năng soạn đề dành cho giáo viên và tổ trưởng.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/tests" className="inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800">Duyệt đề và kho đề</Link>
            <Link href="/phan-quyen" className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Ủy quyền</Link>
          </div>
        </div>
      )}
      {activeRole === 'TEACHER' && <TeacherDashboardView />}
      {(activeRole === 'GROUP_LEADER' || activeRole === 'DEPUTY_GROUP_LEADER') && (
        <GroupLeaderDashboardView />
      )}
      {(activeRole === 'SCHOOL_ADMIN' || activeRole === 'SYSTEM_ADMIN') && (
        <SchoolAdminDashboardView />
      )}

      {/* 4. Khu vực trạng thái hạ tầng hệ thống */}
      <SystemStatus />
    </div>
  );
}
