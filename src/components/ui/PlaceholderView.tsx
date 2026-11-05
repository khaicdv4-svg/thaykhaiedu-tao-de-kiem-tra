import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './Card';
import { Badge } from './Badge';
import { LucideIcon, Clock, Layers, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PlaceholderViewProps {
  title: string;
  description: string;
  icon: LucideIcon;
  moduleCode: string;
  plannedFeatures: string[];
}

export function PlaceholderView({
  title,
  description,
  icon: Icon,
  moduleCode,
  plannedFeatures,
}: PlaceholderViewProps) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/80 shrink-0">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
              <Badge variant="outline" className="text-[11px] font-mono uppercase">
                {moduleCode}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">{description}</p>
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1.5 text-xs flex items-center space-x-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Kiến trúc sẵn sàng</span>
        </Badge>
      </div>

      {/* Main Notice Box */}
      <Card className="border-blue-200/80 bg-linear-to-br from-blue-50/40 via-white to-slate-50/50">
        <CardContent className="p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
              Thông báo lộ trình phát triển
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Chức năng sẽ được triển khai ở bước tiếp theo.
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nền móng kỹ thuật, kiểu dữ liệu TypeScript (multimodal questions, workflow status, tenant config) và giao diện điều hướng của phân hệ này đã sẵn sàng. Không giả lập logic khi chưa kết nối backend.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors shrink-0"
          >
            Quay lại Tổng quan
            <ArrowRight className="w-4 h-4 ml-1.5 text-slate-400" />
          </Link>
        </CardContent>
      </Card>

      {/* Module Architecture Roadmap Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <CardTitle>Năng lực kỹ thuật đã chuẩn bị cho module này</CardTitle>
          </div>
          <CardDescription>
            Danh sách các cấu trúc nghiệp vụ và dịch vụ kỹ thuật đã được thiết kế khung sẵn sàng kết nối.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plannedFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs font-medium text-slate-700 leading-normal">{feature}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
