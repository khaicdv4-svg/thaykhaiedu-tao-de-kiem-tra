'use client';

/**
 * ThayKhaiEdu - Teacher Dashboard View
 * Focused on teacher-specific workflow: own tests, peer review queue, question bank contributions.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import {
  FileEdit,
  Clock,
  FileQuestion,
  FileText,
  Plus,
  ArrowRight,
  Inbox,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

export function TeacherDashboardView() {
  const [stats, setStats] = useState({
    myExams: 0,
    peerReviews: 0,
    questions: 0,
    readingPassages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRealStats() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { count: examCount } = await supabase
          .from('tests')
          .select('id', { count: 'exact', head: true });

        setStats({
          myExams: examCount || 0,
          peerReviews: 0,
          questions: 0,
          readingPassages: 0,
        });
      } catch {
        // Keep 0 on error
      } finally {
        setIsLoading(false);
      }
    }

    loadRealStats();
  }, []);

  const statCards = [
    {
      title: 'Đề kiểm tra của tôi',
      value: isLoading ? '...' : String(stats.myExams),
      subtitle: 'Cơ sở dữ liệu thật (0 nếu rỗng)',
      icon: FileEdit,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Nhiệm vụ phản biện chéo',
      value: isLoading ? '...' : String(stats.peerReviews),
      subtitle: 'Chờ giáo viên góp ý',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      title: 'Câu hỏi đã đóng góp',
      value: isLoading ? '...' : String(stats.questions),
      subtitle: 'Chờ nạp ở Giai đoạn 3',
      icon: FileQuestion,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      title: 'Ngữ liệu Tiếng Việt đã lưu',
      value: isLoading ? '...' : String(stats.readingPassages),
      subtitle: 'Chờ nạp ở Giai đoạn 2',
      icon: FileText,
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

      {/* 2. Main Columns: My Exams & Peer Review Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: My In-Progress Exams */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileEdit className="w-4 h-4 text-blue-600" />
                <CardTitle>Đề kiểm tra của tôi</CardTitle>
              </div>
              <Link href="/test-builder">
                <Button size="sm" icon={<Plus className="w-4 h-4" />}>
                  Soạn đề mới
                </Button>
              </Link>
            </div>
            <CardDescription>
              Các đề kiểm tra Thầy/Cô đang biên soạn hoặc chờ phản hồi từ tổ chuyên môn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-10 px-4 text-center space-y-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-slate-700">Chưa có đề kiểm tra nào đang soạn</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Thầy/Cô hãy vào Xưởng tạo đề để chọn ma trận và bắt đầu ghép câu hỏi cho bài kiểm tra định kỳ.
                </p>
              </div>
              <Link href="/test-builder" className="inline-block pt-1">
                <Button variant="outline" size="sm">
                  Vào Xưởng tạo đề ngay
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Right: Peer Reviews Assigned to Me */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <CardTitle>Nhiệm vụ phản biện chéo</CardTitle>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                0 nhiệm vụ
              </span>
            </div>
            <CardDescription>
              Đề thi của đồng nghiệp trong Tổ Khối 4 được phân công cho Thầy/Cô rà soát độc lập
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-10 px-4 text-center space-y-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-slate-700">Không có đề nào cần phản biện lúc này</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Khi Tổ trưởng phân công đề của đồng nghiệp cho Thầy/Cô phản biện độc lập, danh sách và mẫu nhận xét sẽ xuất hiện tại đây.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Pedagogical Workflow Guide for Teachers */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <CardTitle>Quy trình biên soạn đề kiểm tra chuẩn sư phạm tiểu học</CardTitle>
          </div>
          <CardDescription>
            Quy trình 4 bước khép kín tuân thủ Thông tư 27/2020/TT-BGDĐT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</span>
                <h5 className="text-xs font-bold text-slate-800">Tra cứu Ma trận</h5>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Kiểm tra YCCĐ và tỷ lệ 3 mức nhận thức do Tổ trưởng ban hành.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">2</span>
                <h5 className="text-xs font-bold text-slate-800">Ghép câu hỏi</h5>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Chọn câu hỏi đúng 6 dạng tiểu học, kiểm tra tổng điểm 10.0 và bước điểm 0,5.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">3</span>
                <h5 className="text-xs font-bold text-slate-800">Phản biện chéo</h5>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gửi đề sang đồng nghiệp trong tổ rà soát độc lập, tránh sót lỗi.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">4</span>
                <h5 className="text-xs font-bold text-slate-800">BGH Ký duyệt</h5>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tổ trưởng thẩm định và chuyển Ban Giám Hiệu ký duyệt điện tử, xuất DOCX/PDF.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
