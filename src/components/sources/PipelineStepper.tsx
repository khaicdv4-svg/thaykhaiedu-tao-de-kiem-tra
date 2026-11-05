import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export interface PipelineStep {
  step: number;
  title: string;
  shortDesc: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { step: 1, title: 'Tải tài liệu', shortDesc: 'Tệp JSON/Word/Excel' },
  { step: 2, title: 'Chọn loại nguồn', shortDesc: 'Năm học & khối' },
  { step: 3, title: 'Phân tích', shortDesc: 'Bóc tách cấu trúc' },
  { step: 4, title: 'Ánh xạ', shortDesc: 'Nối bài/tiết/YCCĐ' },
  { step: 5, title: 'Xem trước', shortDesc: 'Đối chiếu 2 cột' },
  { step: 6, title: 'Kiểm tra sai lệch', shortDesc: 'Phát hiện lỗi/cảnh báo' },
  { step: 7, title: 'Giáo viên xác nhận', shortDesc: 'Chọn nhãn nguồn gốc' },
  { step: 8, title: 'Lưu vào kho', shortDesc: 'Cập nhật CSDL trường' },
];

interface PipelineStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function PipelineStepper({ currentStep, onStepClick }: PipelineStepperProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Quy trình nhập nguồn chuyên môn 8 bước (Mục 3.2 Đặc tả V1.0)
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Bước {currentStep} / 8
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {PIPELINE_STEPS.map((s) => {
          const isCompleted = currentStep > s.step;
          const isCurrent = currentStep === s.step;
          const isPending = currentStep < s.step;

          return (
            <div
              key={s.step}
              onClick={() => onStepClick && onStepClick(s.step)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                onStepClick ? 'cursor-pointer hover:border-blue-400' : ''
              } ${
                isCurrent
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-500'
                  : isCompleted
                  ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 opacity-70'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Circle className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span
                  className={`text-xs font-bold ${
                    isCurrent
                      ? 'text-blue-700 dark:text-blue-400'
                      : isCompleted
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  B{s.step}. {s.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {s.shortDesc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
