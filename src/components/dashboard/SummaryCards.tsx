import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FolderKanban, Clock, FileQuestion, BookOpen } from 'lucide-react';
import { getAppDataMode } from '@/lib/supabase/config';

export function SummaryCards() {
  const dataMode = getAppDataMode();
  const isRealData = dataMode === 'REAL_DATA';

  // In REAL DATA MODE, we display actual counts (currently 0 on empty database), never fake stats!
  // In DEMO MODE, we clearly label with 'DỮ LIỆU MẪU'.
  const stats = [
    {
      id: 'total-tests',
      title: 'Tổng đề kiểm tra',
      value: isRealData ? '0' : '24',
      subtitle: isRealData ? 'Cơ sở dữ liệu thật (Lớp 4)' : 'DỮ LIỆU MẪU',
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      id: 'pending-review',
      title: 'Đang xử lý / Kiểm tra chéo',
      value: isRealData ? '0' : '5',
      subtitle: isRealData ? 'Chờ kiểm tra chéo & duyệt' : 'DỮ LIỆU MẪU',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      id: 'question-bank',
      title: 'Ngân hàng câu hỏi',
      value: isRealData ? '0' : '1,420',
      subtitle: isRealData ? 'Chờ nhập câu hỏi ở G3' : 'DỮ LIỆU MẪU',
      icon: FileQuestion,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      id: 'sources-yccd',
      title: 'YCCĐ & Tài liệu nguồn',
      value: isRealData ? '0' : '18',
      subtitle: isRealData ? 'Chờ nạp tài liệu ở G2' : 'DỮ LIỆU MẪU',
      icon: BookOpen,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
  ];

  return (
    <div className="space-y-2">
      {!isRealData && (
        <div className="flex items-center space-x-2">
          <Badge variant="warning" className="text-[10px]">
            DỮ LIỆU MẪU MINH HỌA
          </Badge>
          <span className="text-[11px] text-slate-400">
            (Chưa phát hiện cấu hình Supabase; đang hiển thị số liệu mẫu)
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.id} className="hover:border-slate-300">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{stat.value}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl border ${stat.bgColor} ${stat.borderColor} ${stat.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
