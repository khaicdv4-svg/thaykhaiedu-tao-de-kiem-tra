'use client';

/**
 * ThayKhaiEdu - Group Leader Dashboard View
 * Focused on professional group management: matrix tracking, peer review assignments, and test approval queue.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Grid,
  Clock,
  FolderKanban,
  UserCheck,
  Inbox,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface TeacherItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function GroupLeaderDashboardView() {
  const [stats, setStats] = useState({
    totalGroupExams: 0,
    pendingApproval: 0,
    matricesCount: 0,
    teachersCount: 0,
  });
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGroupData() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        // Real count of tests
        const { count: examCount } = await supabase
          .from('tests')
          .select('id', { count: 'exact', head: true });

        // Real count & list of teachers in profiles
        const { data: profileRows, count: profileCount } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, is_active', { count: 'exact' });

        setStats({
          totalGroupExams: examCount || 0,
          pendingApproval: 0,
          matricesCount: 0,
          teachersCount: profileCount || 0,
        });

        if (profileRows) {
          setTeachers(
            profileRows.map((p) => ({
              id: p.id,
              fullName: p.full_name,
              email: p.email,
              role: p.role,
              isActive: p.is_active,
            }))
          );
        }
      } catch {
        // Fallback safely
      } finally {
        setIsLoading(false);
      }
    }

    loadGroupData();
  }, []);

  const statCards = [
    {
      title: 'Tổng đề Tổ Khối 4',
      value: isLoading ? '...' : String(stats.totalGroupExams),
      subtitle: 'Cơ sở dữ liệu thật (0 nếu rỗng)',
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Đề chờ tổ trưởng duyệt',
      value: isLoading ? '...' : String(stats.pendingApproval),
      subtitle: 'Đã qua phản biện chéo',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      title: 'Ma trận đã ban hành',
      value: isLoading ? '...' : String(stats.matricesCount),
      subtitle: 'Chờ thiết lập ở Giai đoạn 3',
      icon: Grid,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      title: 'Giáo viên trong tổ',
      value: isLoading ? '...' : String(stats.teachersCount),
      subtitle: 'Hồ sơ thật từ DB',
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card key={idx} className="hover:border-slate-300">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{item.title}</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{item.value}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl border ${item.bgColor} ${item.borderColor} ${item.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 2. Main Columns: Approval Queue & Teachers in Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Approval Queue */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <CardTitle>Hàng đợi thẩm định & Duyệt đề Tổ Khối 4</CardTitle>
              </div>
              <Link href="/matrices">
                <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Xem Ma trận
                </Button>
              </Link>
            </div>
            <CardDescription>
              Các đề kiểm tra đã hoàn thành bước phản biện chéo, chờ Tổ trưởng thẩm định đạt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-10 px-4 text-center space-y-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-slate-700">Chưa có đề nào trong hàng đợi duyệt</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Đề sau khi giáo viên biên soạn và hoàn tất phản biện chéo độc lập sẽ được gửi lên đây để Thầy thẩm định.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Teachers in Professional Group */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <CardTitle>Giáo viên & Phân công phản biện</CardTitle>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {teachers.length} thành viên
              </span>
            </div>
            <CardDescription>
              Danh sách nhân sự sư phạm thuộc tổ, sẵn sàng nhận nhiệm vụ phản biện chéo đề kiểm tra
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Đang tải danh sách giáo viên từ database...
              </div>
            ) : (
              <div className="space-y-2.5">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {teacher.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 leading-tight">
                          {teacher.fullName}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {teacher.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={teacher.role === 'GROUP_LEADER' ? 'ai' : 'outline'}
                        className="text-[10px] px-2 py-0.5"
                      >
                        {teacher.role === 'GROUP_LEADER' ? 'Tổ trưởng' : 'Giáo viên'}
                      </Badge>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          teacher.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={teacher.isActive ? 'Đang hoạt động' : 'Chờ kích hoạt'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Grade 4 Periodical Assessment Matrix Outline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Grid className="w-4 h-4 text-indigo-600" />
              <CardTitle>Khung kế hoạch Ma trận định kỳ Khối 4</CardTitle>
            </div>
            <Link
              href="/matrices"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center"
            >
              Xem chi tiết
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
          <CardDescription>
            Các môn kiểm tra định kỳ Khối 4 theo quy định Thông tư 27 (Giai đoạn 3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Toán 4 — Giữa Học kỳ I</span>
                <Badge variant="outline" className="text-[10px]">Chờ Giai đoạn 3</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Thang điểm 10.0, bước điểm 0,5, 3 mức độ nhận thức (Mức 1, 2, 3).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Tiếng Việt 4 — Giữa Học kỳ I</span>
                <Badge variant="outline" className="text-[10px]">Chờ Giai đoạn 3</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Đọc hiểu & Kiến thức tiếng Việt + Bài kiểm tra Viết.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
