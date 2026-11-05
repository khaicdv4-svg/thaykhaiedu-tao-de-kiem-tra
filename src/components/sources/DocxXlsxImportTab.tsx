import React, { useState } from 'react';
import { UploadCloud, FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';

export function DocxXlsxImportTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('subj-toan4');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setStatusMessage(`Đã chọn tệp: ${file.name} (${Math.round(file.size / 1024)} KB). Sẵn sàng phân tích cấu trúc.`);
    }
  };

  const downloadSampleTemplate = (type: 'docx' | 'xlsx') => {
    alert(`Đang tải mẫu chuẩn phân phối chương trình và YCCĐ (${type.toUpperCase()}) Khối 4 - Năm học 2026-2027...`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Nhập Phân phối chương trình & YCCĐ từ file Word / Excel</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Áp dụng bộ cấu trúc chuẩn hóa cho kế hoạch dạy học tiểu học năm học 2026–2027
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadSampleTemplate('docx')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Tải mẫu Word (.docx)
          </button>
          <button
            type="button"
            onClick={() => downloadSampleTemplate('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Tải mẫu Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Cấu hình nguồn nhập */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Khối lớp
          </label>
          <input
            type="text"
            readOnly
            value="Khối 4 (Chuẩn Tiểu học)"
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Năm học
          </label>
          <input
            type="text"
            readOnly
            value="2026-2027 (Bản thống nhất)"
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Môn học
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
          >
            <option value="subj-toan4">Toán 4 (175 tiết)</option>
            <option value="subj-tv4">Tiếng Việt 4 (245 tiết)</option>
            <option value="subj-kh4">Khoa học 4 (70 tiết)</option>
            <option value="subj-lsdl4">Lịch sử và Địa lí 4 (70 tiết)</option>
            <option value="subj-cn4">Công nghệ 4 (35 tiết)</option>
            <option value="subj-dd4">Đạo đức 4 (35 tiết)</option>
            <option value="subj-hdtn4">Hoạt động trải nghiệm 4 (105 tiết)</option>
          </select>
        </div>
      </div>

      {/* Vùng tải lên tệp */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-950/20">
        <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Kéo thả tệp Word (.docx) hoặc Excel (.xlsx) vào đây
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hỗ trợ định dạng bảng chuẩn: [Tuần] - [Tiết PPCT] - [Tên bài học/tiết] - [YCCĐ cần đạt]
        </p>

        <label className="mt-4 inline-block">
          <input
            type="file"
            accept=".docx,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors">
            Chọn tệp từ máy tính
          </span>
        </label>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Hướng dẫn cấu trúc bảng */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/70 dark:bg-slate-900/40 text-xs space-y-2">
        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          Quy chuẩn định dạng bảng trong tệp:
        </h4>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
          <li><strong>Học kỳ 1:</strong> Tuần 1 đến tuần 18; <strong>Học kỳ 2:</strong> Tuần 19 đến tuần 35.</li>
          <li><strong>Số tiết:</strong> Mỗi tiết có thời lượng chuẩn 1 tiết (hoặc bài học 2-3 tiết được chia dòng rõ ràng).</li>
          <li><strong>YCCĐ:</strong> Ghi rõ mã hoặc nội dung yêu cầu; hệ thống sẽ tự động gán nhãn <code>ALGORITHM_EXTRACTED</code> để giáo viên đối soát lại.</li>
        </ul>
      </div>
    </div>
  );
}
