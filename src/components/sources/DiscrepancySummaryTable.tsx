import React, { useState } from 'react';
import {
  ValidationSummary,
  SubjectValidationResult,
  DiscrepancyItem,
} from '@/types/curriculum-source';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface DiscrepancySummaryTableProps {
  summary: ValidationSummary;
  selectedSubjectIds: string[];
  onToggleSubject: (subjectId: string) => void;
  onSelectOnlyClean: () => void;
  onSelectAllValid: () => void;
}

export function DiscrepancySummaryTable({
  summary,
  selectedSubjectIds,
  onToggleSubject,
  onSelectOnlyClean,
  onSelectAllValid,
}: DiscrepancySummaryTableProps) {
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const subjects = Object.values(summary.subjectsSummary);

  const cleanSubjectsCount = subjects.filter((s) => s.canImport).length;
  const blockedSubjectsCount = subjects.filter((s) => !s.canImport).length;

  const toggleExpand = (subjectId: string) => {
    setExpandedSubjectId(expandedSubjectId === subjectId ? null : subjectId);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-semibold text-rose-900 dark:text-rose-300">
              Lỗi chặn (BLOCKER)
            </span>
          </div>
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
            {summary.totalBlockers}
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
            Bắt buộc khắc phục hoặc bỏ qua
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">
              Cảnh báo (WARNING)
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {summary.totalWarnings}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
            Cần giáo viên đối soát lại
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
              Môn sạch lỗi chặn
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {cleanSubjectsCount} / {subjects.length}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            Đủ điều kiện lưu vào kho
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-300">
              Môn bị chặn
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
            {blockedSubjectsCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Lệch khối hoặc lỗi convertedPeriods
          </p>
        </div>
      </div>

      {/* Thanh tác vụ chọn nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Bảng tổng hợp kiểm tra sai lệch theo môn học (Bước 6)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chọn các môn học đã sạch lỗi chặn để tiếp tục quy trình nhập vào kho
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectOnlyClean}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Chỉ chọn các môn hợp lệ ({cleanSubjectsCount})
          </button>
          <button
            type="button"
            onClick={onSelectAllValid}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Đảo chọn môn hợp lệ
          </button>
        </div>
      </div>

      {/* Bảng danh sách các môn */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
              <th className="py-2.5 px-3">Môn học</th>
              <th className="py-2.5 px-3 text-center">Chủ đề</th>
              <th className="py-2.5 px-3 text-center">Bài học</th>
              <th className="py-2.5 px-3 text-center">Tiết học</th>
              <th className="py-2.5 px-3 text-center">Số tiết (Thực / Chuẩn)</th>
              <th className="py-2.5 px-3 text-center">Lỗi chặn</th>
              <th className="py-2.5 px-3 text-center">Cảnh báo</th>
              <th className="py-2.5 px-3 text-center">Trạng thái</th>
              <th className="py-2.5 px-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {subjects.map((subj) => {
              const isSelected = selectedSubjectIds.includes(subj.subjectId);
              const isExpanded = expandedSubjectId === subj.subjectId;
              const hasBlockers = subj.blockersCount > 0;

              return (
                <React.Fragment key={subj.subjectId}>
                  <tr
                    className={`transition-colors ${
                      hasBlockers
                        ? 'bg-rose-50/30 dark:bg-rose-950/10'
                        : isSelected
                        ? 'bg-blue-50/40 dark:bg-blue-950/20'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={hasBlockers}
                        onChange={() => onToggleSubject(subj.subjectId)}
                        title={hasBlockers ? 'Môn học này có lỗi chặn (BLOCKER), không thể nhập' : 'Chọn để nhập môn này'}
                        className={`rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
                          hasBlockers ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                        }`}
                      />
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                      <div className="flex flex-col">
                        <span>{subj.subjectName}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          {subj.subjectId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                      {subj.totalTopics}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                      {subj.totalLessons}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                      {subj.totalPeriods}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold ${
                          subj.standardPeriods > 0 && subj.actualPeriods === subj.standardPeriods
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {subj.actualPeriods} / {subj.standardPeriods || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {subj.blockersCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          {subj.blockersCount} lỗi
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {subj.warningsCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {subj.warningsCount}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {subj.canImport ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Hợp lệ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          Bị chặn
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleExpand(subj.subjectId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="text-[11px]">Xem ({subj.issues.length})</span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Panel mở rộng danh sách chi tiết các lỗi của môn */}
                  {isExpanded && (
                    <tr className="bg-slate-50/80 dark:bg-slate-900/80">
                      <td colSpan={10} className="p-3">
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-950">
                          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                            <span>Chi tiết vấn đề phát hiện cho: {subj.subjectName}</span>
                            <span className="text-[11px] font-normal text-slate-500">
                              Tổng cộng {subj.issues.length} mục
                            </span>
                          </h5>

                          {subj.issues.length === 0 ? (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 py-1">
                              <CheckCircle className="w-4 h-4" /> Môn học hoàn toàn sạch lỗi và cảnh báo.
                            </p>
                          ) : (
                            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                              {subj.issues.map((iss, i) => (
                                <div
                                  key={iss.id || i}
                                  className={`p-2 rounded border text-xs flex items-start gap-2 ${
                                    iss.severity === 'BLOCKER'
                                      ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                                      : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                                  }`}
                                >
                                  {iss.severity === 'BLOCKER' ? (
                                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold">{iss.title}</span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/70 dark:bg-black/40">
                                        {iss.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] opacity-90 mt-0.5">
                                      {iss.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
