import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { History, FileCheck, Sparkles, CheckCircle2, UserCheck, Inbox } from 'lucide-react';
import { getAppDataMode } from '@/lib/supabase/config';

export function RecentTasks() {
  const isRealData = getAppDataMode() === 'REAL_DATA';

  const recentActivities = [
    {
      id: 'act-1',
      title: 'Khởi tạo Ma trận & Đặc tả kiểm tra Toán 4',
      description: 'Giữa kỳ I - Năm học 2025-2026',
      time: '15 phút trước',
      type: 'Tạo ma trận',
      icon: Sparkles,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      id: 'act-2',
      title: 'Gửi đề kiểm tra Tiếng Việt 3 kiểm tra chéo',
      description: 'Chờ phản hồi từ Giáo viên duyệt chéo',
      time: '1 giờ trước',
      type: 'Kiểm tra chéo',
      icon: UserCheck,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      id: 'act-3',
      title: 'Kiểm định chất lượng câu hỏi Multimodal Khoa học 5',
      description: 'Đã hoàn tất kiểm tra chuẩn YCCĐ',
      time: '3 giờ trước',
      type: 'Kiểm định',
      icon: FileCheck,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'act-4',
      title: 'Phê duyệt bộ đề kiểm tra Tiếng Anh 4',
      description: 'Chốt đề và sẵn sàng xuất bản',
      time: 'Hôm qua',
      type: 'Phê duyệt',
      icon: CheckCircle2,
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600" />
            <CardTitle>Công việc gần đây</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {!isRealData ? (
              <Badge variant="warning" className="text-[10px]">
                DỮ LIỆU MẪU
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px]">
                Nhật ký thao tác
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Các hoạt động chỉnh sửa, kiểm tra chéo và cập nhật trạng thái mới nhất
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isRealData ? (
          <div className="py-12 px-4 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">Chưa có nhật ký hoạt động nào</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Lịch sử khởi tạo ma trận, soạn câu hỏi, kiểm tra chéo và duyệt đề sẽ được tự động ghi nhận tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div
                  key={act.id}
                  className="flex items-start justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg border ${act.iconColor} shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{act.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap ml-2">
                    {act.time}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
