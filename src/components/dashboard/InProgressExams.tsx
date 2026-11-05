import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FolderKanban, ArrowUpRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { WORKFLOW_STATUS_CONFIG, ExamWorkflowStatus } from '@/types/workflow';
import { getAppDataMode } from '@/lib/supabase/config';

export function InProgressExams() {
  const isRealData = getAppDataMode() === 'REAL_DATA';

  const demoExams: {
    id: string;
    code: string;
    title: string;
    gradeSubject: string;
    period: string;
    status: ExamWorkflowStatus;
    updatedAt: string;
  }[] = [
    {
      id: 'exam-101',
      code: 'EXAM-T4-GK1-01',
      title: 'Đề kiểm tra Định kỳ Giữa Kỳ I - Môn Toán 4',
      gradeSubject: 'Khối 4 • Toán',
      period: 'Giữa Kỳ I (2025-2026)',
      status: 'CROSS_REVIEW',
      updatedAt: '30 phút trước',
    },
    {
      id: 'exam-102',
      code: 'EXAM-TV3-CK1-02',
      title: 'Đề kiểm tra Cuối Kỳ I - Tiếng Việt 3',
      gradeSubject: 'Khối 3 • Tiếng Việt',
      period: 'Cuối Kỳ I (2025-2026)',
      status: 'PRINCIPAL_REVIEW',
      updatedAt: '2 giờ trước',
    },
    {
      id: 'exam-103',
      code: 'EXAM-KH5-GK1-01',
      title: 'Đề kiểm tra Giữa Kỳ I - Khoa học 5 (Multimodal)',
      gradeSubject: 'Khối 5 • Khoa học',
      period: 'Giữa Kỳ I (2025-2026)',
      status: 'DRAFT',
      updatedAt: 'Hôm qua',
    },
    {
      id: 'exam-104',
      code: 'EXAM-TA4-CK1-01',
      title: 'Đề kiểm tra Định kỳ Cuối Kỳ I - Tiếng Anh 4',
      gradeSubject: 'Khối 4 • Tiếng Anh',
      period: 'Cuối Kỳ I (2025-2026)',
      status: 'APPROVED',
      updatedAt: '2 ngày trước',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <CardTitle>Đề đang xử lý</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {!isRealData && (
              <Badge variant="warning" className="text-[10px]">
                DỮ LIỆU MẪU
              </Badge>
            )}
            <Link
              href="/tests"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center"
            >
              Xem tất cả
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
        <CardDescription>
          Danh sách đề kiểm tra đang trong vòng đời kiểm định, kiểm tra chéo và phê duyệt
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isRealData ? (
          // In REAL DATA MODE, empty state when DB has no active exams
          <div className="py-12 px-4 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">Chưa có đề kiểm tra nào trong cơ sở dữ liệu thật</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Khi Thầy khởi tạo đề ở Giai đoạn 4, các đề đang soạn, chờ kiểm tra chéo hoặc chờ duyệt sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {demoExams.map((exam) => {
              const statusConfig = WORKFLOW_STATUS_CONFIG[exam.status];
              return (
                <div
                  key={exam.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-2xs transition-all gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {exam.code}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-500">{exam.gradeSubject}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{exam.title}</h4>
                    <p className="text-[11px] text-slate-500">{exam.period}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <Badge variant={statusConfig.variant} className="text-[11px] px-2.5 py-1">
                      {statusConfig.label}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{exam.updatedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
