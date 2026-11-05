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
import { useAuth } from '@/core/contexts/AuthContext';

export default function DashboardPage() {
  const { activeRole } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Lời chào & Ngữ cảnh sản phẩm */}
      <WelcomeBanner />

      {/* 2. Bộ chuyển đổi góc nhìn vai trò (RBAC) */}
      <RolePerspectiveSelector />

      {/* 3. Bố cục Dashboard chuyên biệt theo vai trò */}
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
