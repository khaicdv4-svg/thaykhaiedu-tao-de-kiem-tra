import React from 'react';
import { BookOpen, UploadCloud, FileText, ArrowRight } from 'lucide-react';

interface EmptySourcesStateProps {
  onStartImportJson?: () => void;
  onStartImportDocx?: () => void;
}

export function EmptySourcesState({
  onStartImportJson,
  onStartImportDocx,
}: EmptySourcesStateProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center bg-white dark:bg-slate-900 shadow-xs max-w-2xl mx-auto my-8 space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
        <BookOpen className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Chưa có nguồn chuyên môn
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Kho Chương trình & YCCĐ Khối 4 hiện đang trống
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
          Hệ thống yêu cầu nguồn PPCT và cây Yêu cầu cần đạt (YCCĐ) chính thức để làm căn cứ chuyên môn bắt buộc cho việc soạn ma trận và ra đề kiểm tra ở các giai đoạn sau.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onStartImportJson && (
          <button
            type="button"
            onClick={onStartImportJson}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Nhập sao lưu từ PPCT HUB (.json)
          </button>
        )}

        {onStartImportDocx && (
          <button
            type="button"
            onClick={onStartImportDocx}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Nhập từ Word / Excel
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Quy trình nhập nguồn chuẩn:</p>
        <p>1. Chọn tệp sao lưu JSON từ app THAYKHAIEDU PPCT HUB hoặc tệp Word/Excel theo mẫu.</p>
        <p>2. Hệ thống tự động lọc Khối 4, năm học 2026–2027, bỏ dữ liệu demo.</p>
        <p>3. Bộ kiểm tra sai lệch quét 6 tiêu chuẩn (môn, số tiết, tiêu đề, chuẩn Bộ, quan hệ bài/tiết, tuần/kỳ).</p>
        <p>4. Giáo viên chọn nhãn nguồn gốc <code>provenance_type</code> và bấm lưu vào kho chuyên môn trường.</p>
      </div>
    </div>
  );
}
