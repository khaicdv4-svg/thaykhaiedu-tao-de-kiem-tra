'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  Inbox,
  FileUp,
} from 'lucide-react';
import Link from 'next/link';
import {
  ReadingPassage,
  ReadingPassageType,
  READING_PASSAGE_CONFIG,
} from '@/types/reading-passage';
import { PassageFormModal } from '@/components/reading-passages/PassageFormModal';
import { EmptyPassagesState } from '@/components/reading-passages/EmptyPassagesState';

export default function ReadingPassagesPage() {
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedPassageForView, setSelectedPassageForView] = useState<ReadingPassage | null>(null);

  const fetchPassages = async () => {
    setIsLoading(true);
    try {
      let url = '/api/reading-passages?grade=4';
      if (selectedType !== 'ALL') url += `&passageType=${selectedType}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPassages(data.passages || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải ngữ liệu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPassages();
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPassages();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ngữ liệu "${title}"?`)) return;

    try {
      const res = await fetch(`/api/reading-passages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPassages(passages.filter((p) => p.id !== id));
      } else {
        alert('Không thể xóa ngữ liệu: Bạn chỉ có thể xóa bài nháp của mình hoặc cần quyền quản trị.');
      }
    } catch {
      alert('Lỗi kết nối khi xóa ngữ liệu.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề trang */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Kho Ngữ liệu Đọc Tiếng Việt Tiểu học</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Giai đoạn 2: Quản lý ngân hàng văn bản đọc thành tiếng và đọc hiểu độc lập cho Khối 4, kiểm soát dung sai số tiếng chuẩn Bộ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reading-passages/duyet"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 transition-colors"
          >
            <Inbox className="w-3.5 h-3.5" />
            Hàng chờ duyệt
          </Link>
          <Link
            href="/reading-passages/nhap"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" />
            Nhập bài đọc (file / AI tìm)
          </Link>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm ngữ liệu mới
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm & Bộ lọc */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bài, tác giả, nguồn trích dẫn..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Thể loại:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="ALL">Tất cả thể loại</option>
            <option value="ORAL_READING">Đọc thành tiếng (80 - 100 tiếng)</option>
            <option value="COMPREHENSION_READING">Đọc hiểu (250 - 320 tiếng)</option>
            <option value="POETRY">Thơ ca</option>
            <option value="PROSE">Văn xuôi</option>
            <option value="OTHER">Ngữ liệu khác</option>
          </select>

          <button
            type="button"
            onClick={fetchPassages}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* DANH SÁCH NGỮ LIỆU */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          Đang tải kho ngữ liệu Tiếng Việt...
        </div>
      ) : passages.length === 0 ? (
        <EmptyPassagesState onAddNew={() => setIsModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {passages.map((p) => {
            const config = READING_PASSAGE_CONFIG[p.passageType] || READING_PASSAGE_CONFIG.ORAL_READING;
            const isExact = p.toleranceStatus === 'EXACT';
            const isInRange = p.toleranceStatus === 'IN_RANGE';

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between hover:border-blue-400 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {config.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isExact
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                          : isInRange
                          ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {p.wordCount} tiếng ({isExact ? 'Chuẩn' : isInRange ? 'Trong dung sai' : 'Lệch chuẩn'})
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {p.title}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>
                      <strong>Tác giả:</strong> {p.author}
                    </p>
                    <p className="truncate" title={p.sourceReference}>
                      <strong>Nguồn:</strong> {p.sourceReference}
                    </p>
                    {p.theme && (
                      <p>
                        <strong>Chủ điểm:</strong> {p.theme}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    {p.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Khung: {p.targetWordCountMin}–{p.targetWordCountMax} tiếng
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPassageForView(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Xem toàn văn"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Xóa ngữ liệu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal tạo mới ngữ liệu */}
      <PassageFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchPassages()}
      />

      {/* Modal xem chi tiết toàn văn */}
      {selectedPassageForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedPassageForView.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPassageForView(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-slate-500">
              <p><strong>Tác giả:</strong> {selectedPassageForView.author}</p>
              <p><strong>Nguồn xuất bản:</strong> {selectedPassageForView.sourceReference}</p>
              <p><strong>Độ dài:</strong> {selectedPassageForView.wordCount} tiếng Việt (Khối {selectedPassageForView.grade})</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border leading-relaxed text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
              {selectedPassageForView.content}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPassageForView(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
