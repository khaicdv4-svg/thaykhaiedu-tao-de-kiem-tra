import React from 'react';
import { FileText, Plus, BookOpen } from 'lucide-react';

interface EmptyPassagesStateProps {
  onAddNew: () => void;
}

export function EmptyPassagesState({ onAddNew }: EmptyPassagesStateProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center bg-white dark:bg-slate-900 shadow-xs max-w-2xl mx-auto my-8 space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
        <FileText className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Chưa có ngữ liệu Tiếng Việt
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Kho văn bản Đọc Tiếng Việt Khối 4 hiện đang trống
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
          Ngữ liệu đọc là kho văn bản độc lập dùng cho đề kiểm tra định kỳ môn Tiếng Việt, giúp tránh lặp lại bài đọc trong SGK và đảm bảo tính khách quan trong đánh giá năng lực học sinh.
        </p>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm ngữ liệu mới
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Quy định thẩm định ngữ liệu tiểu học:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <strong>Đọc thành tiếng:</strong> giữa HKI 80 – 85 tiếng, các kì sau 80 – 90 tiếng (lệch tối đa ±5).
          </div>
          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <strong>Đọc hiểu:</strong> theo kì và thể loại (ví dụ cuối HKI: truyện 280 – 300, miêu tả 200 – 220, thơ 100 – 110, văn bản thông tin 150 – 160 tiếng; lệch tối đa ±10).
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          * Bắt buộc có tên tác giả và nguồn trích dẫn xuất bản hợp lệ; không dùng ngữ liệu tự sáng tác thiếu kiểm chứng.
        </p>
      </div>
    </div>
  );
}
