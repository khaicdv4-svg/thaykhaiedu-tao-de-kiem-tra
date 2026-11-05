import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, FilePlus, Copy, Clock, CheckCircle2 } from 'lucide-react';

export default function TestBuilderPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/80 shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Xưởng tạo đề kiểm tra</h1>
              <Badge variant="outline" className="text-[11px] font-mono uppercase">
                MOD-05
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Quy trình tạo đề kiểm tra định kỳ chuẩn hóa Lớp 4 bám sát YCCĐ và Ma trận theo 2 chế độ độc lập.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1.5 text-xs flex items-center space-x-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Đang xây dựng theo lộ trình</span>
        </Badge>
      </div>

      {/* 2 Chế độ tạo đề theo SPEC mục 7.1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chế độ A: Tạo đề mới */}
        <Card className="border-blue-200/90 hover:shadow-md transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <FilePlus className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Chế độ A – Tạo đề mới
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                Quy trình chuẩn
              </Badge>
            </div>
            <CardDescription>
              Tạo đề mới từ ma trận, phạm vi YCCĐ/PPCT và câu hỏi trong ngân hàng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>1. Chọn Lớp 4, môn (Toán / Tiếng Việt), kỳ kiểm tra.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>2. Chọn phạm vi tuần/bài học theo phân phối chương trình.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>3. Chọn ma trận chuẩn (Mức 1, Mức 2, Mức 3).</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>4. Chọn câu hỏi từ ngân hàng hoặc đề xuất nội dung.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>5. Kiểm định độc lập (tổng điểm, số câu, đáp án) & lưu bản nháp.</span>
              </li>
            </ul>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Sẵn sàng triển khai ở Giai đoạn 4</span>
              <button
                disabled
                className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
              >
                Tạo đề mới (Giai đoạn 4)
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Chế độ B: Dùng lại đề trong kho */}
        <Card className="border-slate-200 hover:shadow-md transition-all bg-slate-50/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Copy className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Chế độ B – Dùng lại đề trong kho
                </CardTitle>
              </div>
              <Badge variant="warning" className="text-[11px]">
                Sắp có
              </Badge>
            </div>
            <CardDescription>
              Tái sử dụng đề đã có trong kho đề kiểm tra dưới dạng bản sao độc lập
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>1. Tìm đề kiểm tra tương ứng trong kho đề trường / tổ.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>2. Tạo bản sao độc lập (Clone), tuyệt đối không ghi đè đề gốc.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>3. Thay thế câu hỏi tương đương theo đúng YCCĐ & Mức độ.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>4. Chạy kiểm định lại toàn bộ và lưu thành mã đề mới.</span>
              </li>
            </ul>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Tạo bản sao độc lập – Không ghi đè</span>
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
                Sắp có
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
