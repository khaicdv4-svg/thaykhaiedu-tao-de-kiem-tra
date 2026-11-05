import React, { useState } from 'react';
import { FileSearch, AlertTriangle, Plus, CheckCircle2, BookOpen } from 'lucide-react';
import { ProvenanceType, PROVENANCE_TYPE_MAP } from '@/types/curriculum-source';

export function ScannedPdfManualTab() {
  const [subject, setSubject] = useState('subj-toan4');
  const [week, setWeek] = useState('1');
  const [lessonTitle, setLessonTitle] = useState('');
  const [periodTitle, setPeriodTitle] = useState('');
  const [yccdContent, setYccdContent] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [rawPastedText, setRawPastedText] = useState('');
  const [provenance, setProvenance] = useState<ProvenanceType>('TEACHER_GUIDE_OBJECTIVE');
  const [submittedList, setSubmittedList] = useState<Array<{
    lessonTitle: string;
    periodTitle: string;
    yccdContent: string;
    pageNumber: string;
    provenance: ProvenanceType;
  }>>([]);

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !yccdContent.trim()) {
      alert('Vui lòng nhập tên bài học và nội dung YCCĐ!');
      return;
    }

    setSubmittedList([
      ...submittedList,
      {
        lessonTitle,
        periodTitle: periodTitle || lessonTitle,
        yccdContent,
        pageNumber,
        provenance,
      },
    ]);

    setLessonTitle('');
    setPeriodTitle('');
    setYccdContent('');
    setPageNumber('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
      {/* Cảnh báo rõ ràng cho tài liệu PDF Scan */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Tài liệu PDF Scan / Bản chụp: Yêu cầu đối chiếu thủ công</span>
        </div>
        <p className="leading-relaxed">
          Theo Đặc tả V1.0 (Mục 3.2), tài liệu PDF Scan chưa qua OCR chính thức <strong>không được coi là đã trích xuất chính xác</strong>. Giáo viên thực hiện nhập liệu đối chiếu trực tiếp giữa văn bản trang sách và các trường thông tin chuẩn bên dưới.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CỘT TRÁI: Dán văn bản thô / Ghi chú trang sách cần đối chiếu */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>1. Đoạn trích văn bản hoặc ghi chú từ trang sách</span>
          </h4>
          <p className="text-xs text-slate-500">
            Dán nội dung quét OCR thử nghiệm hoặc đoạn văn bản chụp từ SGV / SGK để đối chiếu:
          </p>
          <textarea
            rows={12}
            value={rawPastedText}
            onChange={(e) => setRawPastedText(e.target.value)}
            placeholder="Dán nội dung trang sách chụp vào đây để làm căn cứ đối chiếu..."
            className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 font-sans focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* CỘT PHẢI: Form chuẩn hóa thông tin lưu vào hệ thống */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-emerald-600" />
            <span>2. Thông tin đối chiếu chuẩn hóa vào CSDL</span>
          </h4>

          <form onSubmit={handleAddRow} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Môn học</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="subj-toan4">Toán 4</option>
                  <option value="subj-tv4">Tiếng Việt 4</option>
                  <option value="subj-kh4">Khoa học 4</option>
                  <option value="subj-lsdl4">Lịch sử & Địa lí 4</option>
                  <option value="subj-cn4">Công nghệ 4</option>
                  <option value="subj-dd4">Đạo đức 4</option>
                  <option value="subj-hdtn4">Hoạt động trải nghiệm 4</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tuần học (1 - 35)</label>
                <input
                  type="number"
                  min={1}
                  max={35}
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên bài học</label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="VD: Bài 10: Số có sáu chữ số"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiêu đề tiết</label>
                <input
                  type="text"
                  value={periodTitle}
                  onChange={(e) => setPeriodTitle(e.target.value)}
                  placeholder="VD: Tiết 1: Đọc và viết số"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vị trí trang trích dẫn</label>
                <input
                  type="text"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="VD: SGV trang 45, mục 2"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nội dung YCCĐ cần đạt</label>
              <textarea
                rows={3}
                value={yccdContent}
                onChange={(e) => setYccdContent(e.target.value)}
                placeholder="Nhập nội dung YCCĐ cần đạt tương ứng của bài..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cấp độ nguồn gốc</label>
              <select
                value={provenance}
                onChange={(e) => setProvenance(e.target.value as ProvenanceType)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="TEACHER_GUIDE_OBJECTIVE">Mục tiêu SGV (TEACHER_GUIDE_OBJECTIVE)</option>
                <option value="MATRIX_DERIVED">Diễn giải từ ma trận (MATRIX_DERIVED)</option>
                <option value="UNVERIFIED_PENDING">Chưa đối chiếu văn bản gốc (UNVERIFIED_PENDING)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm dòng đối chiếu vào danh sách
            </button>
          </form>
        </div>
      </div>

      {/* Danh sách các dòng đã thêm */}
      {submittedList.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Dữ liệu đã đối chiếu ({submittedList.length} mục)</span>
            <button
              type="button"
              onClick={() => alert('Đã lưu dữ liệu đối chiếu vào kho chuyên môn!')}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              Lưu vào kho chuyên môn
            </button>
          </h5>

          <div className="space-y-2">
            {submittedList.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.lessonTitle}</span>
                    <span className="text-[10px] text-slate-400">({item.periodTitle})</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full border ${PROVENANCE_TYPE_MAP[item.provenance].badgeClass}`}>
                      {PROVENANCE_TYPE_MAP[item.provenance].shortLabel}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{item.yccdContent}</p>
                  {item.pageNumber && (
                    <p className="text-[10px] text-slate-400 italic">Trích dẫn: {item.pageNumber}</p>
                  )}
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
