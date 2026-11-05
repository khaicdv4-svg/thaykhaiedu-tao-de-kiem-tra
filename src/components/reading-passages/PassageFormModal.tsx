import React, { useState, useMemo } from 'react';
import {
  ReadingPassageType,
  READING_PASSAGE_CONFIG,
  ToleranceStatus,
} from '@/types/reading-passage';
import { analyzeReadingPassageLength } from '@/core/utils/vietnamese-word-counter';
import { X, CheckCircle, AlertTriangle, FileText, Info } from 'lucide-react';

interface PassageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PassageFormModal({
  isOpen,
  onClose,
  onSuccess,
}: PassageFormModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [passageType, setPassageType] = useState<ReadingPassageType>('ORAL_READING');
  const [grade, setGrade] = useState(4);
  const [genre, setGenre] = useState('');
  const [theme, setTheme] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phân tích độ dài trực tiếp theo thời gian thực
  const analysis = useMemo(() => {
    return analyzeReadingPassageLength(content, passageType);
  }, [content, passageType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Tiêu đề bài đọc là bắt buộc.');
      return;
    }
    if (!author.trim()) {
      setErrorMessage('Tác giả là bắt buộc (theo quy định nguồn chuyên môn).');
      return;
    }
    if (!sourceReference.trim()) {
      setErrorMessage('Nguồn trích dẫn / Xuất bản là bắt buộc.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Nội dung văn bản đọc không được để trống.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reading-passages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          sourceReference: sourceReference.trim(),
          passageType,
          grade,
          content: content.trim(),
          targetWordCountMin: analysis.targetMin,
          targetWordCountMax: analysis.targetMax,
          genre: genre.trim() || undefined,
          theme: theme.trim() || undefined,
          status: 'PENDING_REVIEW',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi lưu ngữ liệu');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const config = READING_PASSAGE_CONFIG[passageType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Thêm ngữ liệu đọc Tiếng Việt mới (Khối {grade})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Hàng 1: Tiêu đề & Thể loại */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên bài đọc / Tiêu đề đoạn trích <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Cây rơm mùa gặt, Điều kì diệu của đại dương..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loại ngữ liệu <span className="text-rose-500">*</span>
              </label>
              <select
                value={passageType}
                onChange={(e) => setPassageType(e.target.value as ReadingPassageType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="ORAL_READING">Đọc thành tiếng (80 - 100 tiếng, ±5 tiếng)</option>
                <option value="COMPREHENSION_READING">Đọc hiểu (250 - 320 tiếng, ±10 tiếng)</option>
                <option value="POETRY">Thơ ca (50 - 120 tiếng)</option>
                <option value="PROSE">Văn xuôi (100 - 350 tiếng)</option>
                <option value="OTHER">Ngữ liệu khác</option>
              </select>
            </div>
          </div>

          {/* Hàng 2: Tác giả & Nguồn trích dẫn (BẮT BUỘC) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tác giả <span className="text-rose-500">* (Bắt buộc)</span>
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="VD: Tô Hoài, Trần Đăng Khoa, Theo Báo Nhi đồng..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nguồn trích dẫn / Xuất bản <span className="text-rose-500">* (Bắt buộc)</span>
              </label>
              <input
                type="text"
                required
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                placeholder="VD: NXB Kim Đồng, 2023, tr. 14 hoặc Link báo..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Hàng 3: Thể loại & Chủ điểm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chủ điểm / Chủ đề
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="VD: Măng non, Quê hương em, Thiên nhiên kì thú..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Thể loại văn học
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="VD: Truyện ngắn, Tản văn, Thơ 5 chữ..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Ô nhập nội dung văn bản */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Nội dung ngữ liệu đọc <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Đang có: <strong>{analysis.wordCount}</strong> tiếng Việt
              </span>
            </div>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dán hoặc soạn thảo toàn văn ngữ liệu đọc vào đây..."
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-sans leading-relaxed focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* BẢNG ĐIỀU KHIỂN DUNG SAI SỐ TỪ THỜI GIAN THỰC */}
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
              analysis.toleranceStatus === 'EXACT'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : analysis.toleranceStatus === 'IN_RANGE'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                {analysis.toleranceStatus === 'EXACT' || analysis.toleranceStatus === 'IN_RANGE' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{analysis.message}</span>
              </div>
              <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 border">
                {analysis.wordCount} tiếng / Chuẩn: {analysis.targetMin}–{analysis.targetMax} (±{analysis.tolerance})
              </span>
            </div>
            <p className="text-[11px] opacity-80">
              Quy chuẩn {config.label}: Cho phép trong dải tiếng{' '}
              <strong>{analysis.targetMin - analysis.tolerance}</strong> đến{' '}
              <strong>{analysis.targetMax + analysis.tolerance}</strong> tiếng Việt.
            </p>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-medium"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu ngữ liệu vào kho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
