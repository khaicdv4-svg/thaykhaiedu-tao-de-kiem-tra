'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Building2,
  Calendar,
  Users,
  ShieldCheck,
  FolderTree,
  CheckCircle2,
  Lock,
  Clock,
} from 'lucide-react';
import {
  DEMO_ORGANIZATION,
  DEMO_ACADEMIC_YEARS,
  DEMO_PROFESSIONAL_GROUPS,
  DEMO_USERS,
} from '@/core/config/demo-data';
import { ROLE_PERMISSIONS, UserRole } from '@/types/permissions';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'organization' | 'years' | 'users' | 'roles' | 'groups'>('organization');

  const tabs = [
    { id: 'organization', label: 'Đơn vị trường', icon: Building2 },
    { id: 'years', label: 'Năm học', icon: Calendar },
    { id: 'users', label: 'Người dùng', icon: Users },
    { id: 'roles', label: 'Vai trò & Quyền', icon: ShieldCheck },
    { id: 'groups', label: 'Tổ chuyên môn', icon: FolderTree },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900">Quản trị & Cài đặt Hệ thống</h1>
            <Badge variant="secondary" className="text-[10px] font-mono">
              ARCHITECTURE DEMO
            </Badge>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Cấu hình đơn vị trường, phân quyền truy cập, năm học và quản lý tổ chuyên môn cho mô hình dữ liệu đa người dùng.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Mô hình Data & Permission (Sẵn sàng cho Supabase DB)</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 border-t-2 border-t-blue-600 border-x border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: ORGANIZATION */}
      {activeTab === 'organization' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <CardTitle>Cấu hình Đơn vị Trường học (Organization)</CardTitle>
              </div>
              <Badge variant="outline">Mô phỏng dữ liệu đơn vị</Badge>
            </div>
            <CardDescription>
              Thông tin hành chính đơn vị trường, tỉnh/thành, quận/huyện và danh mục khối lớp kích hoạt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Mã trường:</span>
                <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{DEMO_ORGANIZATION.code}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Tên đơn vị:</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{DEMO_ORGANIZATION.name}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Tỉnh / Thành phố:</span>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{DEMO_ORGANIZATION.province}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Quận / Huyện:</span>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{DEMO_ORGANIZATION.district}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2">
              <span className="text-xs font-semibold text-slate-700">Khối lớp áp dụng (Khối 1 - 5):</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {DEMO_ORGANIZATION.activeGrades.map((grade) => (
                  <span
                    key={grade}
                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold"
                  >
                    Khối {grade}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 2: ACADEMIC YEARS */}
      {activeTab === 'years' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <CardTitle>Quản lý Năm học (Academic Years)</CardTitle>
              </div>
              <Badge variant="outline">Cấu hình thời gian</Badge>
            </div>
            <CardDescription>
              Danh sách năm học áp dụng cho toàn bộ hoạt động tạo đề, ma trận và kiểm định.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEMO_ACADEMIC_YEARS.map((ay) => (
                <div
                  key={ay.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-800">{ay.label}</h4>
                        {ay.isCurrent && (
                          <Badge variant="success" className="text-[10px]">
                            Năm học hiện tại
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thời gian: {ay.startDate} đến {ay.endDate}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-500">{ay.code}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 3: USERS */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <CardTitle>Danh sách Người dùng (Users & Scope)</CardTitle>
              </div>
              <Badge variant="outline">{DEMO_USERS.length} tài khoản demo</Badge>
            </div>
            <CardDescription>
              Danh sách giáo viên, tổ trưởng và quản trị viên thuộc đơn vị trường.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEMO_USERS.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {user.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{user.fullName}</h4>
                      <p className="text-[11px] text-slate-500">{user.email} • {user.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-[11px]">
                      {user.role}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">
                      Khối: {user.assignedGradeIds.join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 4: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <CardTitle>Ma trận Vai trò & Quyền (Permission-Based RBAC)</CardTitle>
              </div>
              <Badge variant="ai">Bảo mật RBAC</Badge>
            </div>
            <CardDescription>
              Ánh xạ vai trò người dùng (Role) tới tập các quyền thao tác trong hệ thống (Permissions).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((role) => {
                const perms = ROLE_PERMISSIONS[role];
                return (
                  <div key={role} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 font-mono">{role}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {perms.length} Quyền kích hoạt
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {perms.map((p) => (
                        <span
                          key={p}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono border border-slate-200 flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 5: PROFESSIONAL GROUPS */}
      {activeTab === 'groups' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderTree className="w-5 h-5 text-blue-600" />
                <CardTitle>Danh sách Tổ chuyên môn (Professional Groups)</CardTitle>
              </div>
              <Badge variant="outline">{DEMO_PROFESSIONAL_GROUPS.length} Tổ chuyên môn</Badge>
            </div>
            <CardDescription>
              Quản lý phạm vi chia sẻ tài nguyên và duyệt đề theo tổ chuyên môn của trường.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEMO_PROFESSIONAL_GROUPS.map((group) => (
                <div key={group.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900">{group.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400">({group.code})</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Khối: {group.assignedGradeIds.join(', ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{group.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
