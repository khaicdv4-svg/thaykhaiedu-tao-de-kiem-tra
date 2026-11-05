import React from 'react';
import {
  ProvenanceType,
  PROVENANCE_TYPE_MAP,
} from '@/types/curriculum-source';
import { AlertCircle, ShieldCheck, Info } from 'lucide-react';

interface ProvenanceSelectorProps {
  selectedProvenance: ProvenanceType;
  onChange: (prov: ProvenanceType) => void;
}

export function ProvenanceSelector({
  selectedProvenance,
  onChange,
}: ProvenanceSelectorProps) {
  const options: ProvenanceType[] = [
    'UNVERIFIED_PENDING',
    'MATRIX_DERIVED',
    'TEACHER_GUIDE_OBJECTIVE',
    'ALGORITHM_EXTRACTED',
    'OFFICIAL_RAW',
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Xác nhận cấp độ nguồn gốc chuyên môn (Bước 7 - provenance_type)</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tuyệt đối không tự suy diễn chuyển nội dung trích xuất thành YCCĐ nguyên văn Bộ GD&ĐT
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {options.map((key) => {
          const cfg = PROVENANCE_TYPE_MAP[key];
          const isSelected = selectedProvenance === key;
          const isOfficialRaw = key === 'OFFICIAL_RAW';

          return (
            <div
              key={key}
              onClick={() => onChange(key)}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                isSelected
                  ? `ring-2 ring-blue-500 ${cfg.bgLightClass} ${cfg.borderClass}`
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                  {cfg.shortLabel}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Đang chọn
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {cfg.label}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                {cfg.description}
              </p>
              {isOfficialRaw && (
                <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Yêu cầu đối chiếu số trang Thông tư 32/2018</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
        <p>
          <strong>Khuyến nghị của Hệ thống:</strong> Đối với dữ liệu bóc tách từ PPCT HUB hoặc tài liệu Word/Excel của tổ chuyên môn, nên chọn <code>UNVERIFIED_PENDING</code> (Chưa đối chiếu) hoặc <code>MATRIX_DERIVED</code> (Diễn giải từ ma trận). Nhãn này sẽ hiển thị minh bạch xuyên suốt các phân hệ tạo đề và kiểm định câu hỏi.
        </p>
      </div>
    </div>
  );
}
