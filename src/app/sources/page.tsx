'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  UploadCloud,
  FileText,
  FileSearch,
  Database,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { PipelineStepper } from '@/components/sources/PipelineStepper';
import { DiscrepancySummaryTable } from '@/components/sources/DiscrepancySummaryTable';
import { TwoColumnPreview } from '@/components/sources/TwoColumnPreview';
import { ProvenanceSelector } from '@/components/sources/ProvenanceSelector';
import { DocxXlsxImportTab } from '@/components/sources/DocxXlsxImportTab';
import { ScannedPdfManualTab } from '@/components/sources/ScannedPdfManualTab';
import { PpctPdfTab } from '@/components/sources/PpctPdfTab';
import { EmptySourcesState } from '@/components/sources/EmptySourcesState';
import { PpctDaNhapView } from '@/components/sources/PpctDaNhapView';
import {
  CurriculumSource,
  ValidationSummary,
  SubjectValidationResult,
  ProvenanceType,
  PpctHubTopic,
  PpctHubLesson,
  PpctHubPeriod,
  PpctHubYccdIdea,
  PpctHubBackupFile,
} from '@/types/curriculum-source';

type TabMode = 'ppct_hub' | 'docx_xlsx' | 'pdf_scan' | 'pdf_ppct' | 'saved_sources';

export default function SourcesPage() {
  const [activeTab, setActiveTab] = useState<TabMode>('saved_sources');
  const [pipelineStep, setPipelineStep] = useState(1);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [grade, setGrade] = useState(4);

  // Trạng thái nhập liệu PPCT HUB
  const [rawBackupJson, setRawBackupJson] = useState<PpctHubBackupFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: ValidationSummary;
    topics: PpctHubTopic[];
    lessons: PpctHubLesson[];
    periods: PpctHubPeriod[];
    outcomes: PpctHubYccdIdea[];
  } | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [previewSubjectId, setPreviewSubjectId] = useState<string>('subj-tv4');
  const [provenanceType, setProvenanceType] = useState<ProvenanceType>('UNVERIFIED_PENDING');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Kho nguồn đã lưu từ DB
  const [savedSources, setSavedSources] = useState<CurriculumSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  // Tải danh sách nguồn đã lưu khi chuyển tab hoặc khởi động
  const fetchSavedSources = async () => {
    setIsLoadingSources(true);
    try {
      const res = await fetch(`/api/curriculum-sources?grade=${grade}&academicYear=${academicYear}`);
      const data = await res.json();
      if (data.success) {
        setSavedSources(data.sources || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải nguồn:', err);
    } finally {
      setIsLoadingSources(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'saved_sources') {
      fetchSavedSources();
    }
  }, [activeTab, grade, academicYear]);

  // Phân tích dữ liệu JSON (gọi API /api/curriculum-sources/analyze)
  const processJsonData = async (jsonObj: PpctHubBackupFile) => {
    setIsAnalyzing(true);
    setSaveMessage(null);
    try {
      setPipelineStep(3); // Bước 3: Phân tích cấu trúc
      const res = await fetch('/api/curriculum-sources/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonContent: jsonObj,
          grade,
          academicYear,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi phân tích dữ liệu');
      }

      const { summary, parsedData } = json.data;
      setRawBackupJson(jsonObj);
      setAnalysisResult({
        summary,
        topics: parsedData.topics,
        lessons: parsedData.lessons,
        periods: parsedData.periods,
        outcomes: parsedData.outcomes,
      });

      // Tự động chọn các môn sạch lỗi chặn (canImport === true)
      const cleanSubjects = (Object.values(summary.subjectsSummary) as SubjectValidationResult[])
        .filter((s: SubjectValidationResult) => s.canImport)
        .map((s: SubjectValidationResult) => s.subjectId);
      setSelectedSubjectIds(cleanSubjects);

      // Đặt môn xem trước mặc định là môn sạch đầu tiên (ví dụ Tiếng Việt 4)
      if (cleanSubjects.length > 0) {
        setPreviewSubjectId(cleanSubjects[0]);
      }

      setPipelineStep(6); // Tiến đến Bước 6: Kiểm tra sai lệch
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveMessage({ type: 'error', text: msg });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Xử lý tải tệp JSON từ máy tính
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          setPipelineStep(2); // Bước 2: Chọn nguồn & khối
          processJsonData(parsed);
        } catch {
          setSaveMessage({ type: 'error', text: 'Tệp không đúng định dạng JSON hợp lệ' });
        }
      };
      reader.readAsText(file);
    }
  };

  // Nút tiện ích: Nạp ngay tệp mẫu có sẵn trong dự án (docs/fixtures)
  const handleLoadProjectSampleFile = async () => {
    setIsAnalyzing(true);
    setSaveMessage(null);
    try {
      // Dùng fetch nội bộ đọc fixture đã có trong dự án
      const res = await fetch('/api/curriculum-sources/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Chỉ định đọc file fixture trên server nếu client gửi cờ
          jsonContent: require('../../../docs/fixtures/thaykhaiedu_ppct_yccd_backup_20261104.json'),
          grade: 4,
          academicYear: '2026-2027',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const { summary, parsedData } = json.data;
      setRawBackupJson(require('../../../docs/fixtures/thaykhaiedu_ppct_yccd_backup_20261104.json'));
      setAnalysisResult({
        summary,
        topics: parsedData.topics,
        lessons: parsedData.lessons,
        periods: parsedData.periods,
        outcomes: parsedData.outcomes,
      });

      const cleanSubjects = (Object.values(summary.subjectsSummary) as SubjectValidationResult[])
        .filter((s: SubjectValidationResult) => s.canImport)
        .map((s: SubjectValidationResult) => s.subjectId);
      setSelectedSubjectIds(cleanSubjects);
      if (cleanSubjects.length > 0) setPreviewSubjectId(cleanSubjects[0]);

      setPipelineStep(6);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveMessage({ type: 'error', text: `Không thể đọc tệp mẫu: ${msg}` });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Bật/tắt chọn môn
  const toggleSubject = (subjectId: string) => {
    if (selectedSubjectIds.includes(subjectId)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subjectId));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subjectId]);
    }
  };

  const selectOnlyClean = () => {
    if (!analysisResult) return;
    const clean = (Object.values(analysisResult.summary.subjectsSummary) as SubjectValidationResult[])
      .filter((s: SubjectValidationResult) => s.canImport)
      .map((s: SubjectValidationResult) => s.subjectId);
    setSelectedSubjectIds(clean);
  };

  const toggleAllValid = () => {
    if (!analysisResult) return;
    const clean = (Object.values(analysisResult.summary.subjectsSummary) as SubjectValidationResult[])
      .filter((s: SubjectValidationResult) => s.canImport)
      .map((s: SubjectValidationResult) => s.subjectId);

    if (selectedSubjectIds.length === clean.length) {
      setSelectedSubjectIds([]);
    } else {
      setSelectedSubjectIds(clean);
    }
  };

  // Bước 8: Lưu các môn đã chọn vào kho
  const handleSaveToCurriculumDatabase = async () => {
    if (!rawBackupJson || selectedSubjectIds.length === 0) {
      alert('Vui lòng chọn ít nhất một môn học hợp lệ trước khi lưu!');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    setPipelineStep(7); // Bước 7: Giáo viên xác nhận

    try {
      const res = await fetch('/api/curriculum-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonContent: rawBackupJson,
          selectedSubjectIds,
          provenanceType,
          grade,
          academicYear,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi lưu dữ liệu vào kho chuyên môn');
      }

      setPipelineStep(8); // Bước 8: Đã lưu vào kho thành công
      const loiMon: string[] = Array.isArray(json.loi) ? json.loi : [];
      setSaveMessage(
        loiMon.length
          ? { type: 'error', text: `Đã lưu ${json.results?.length ?? 0} môn. Chưa lưu được: ${loiMon.join(' · ')}` }
          : { type: 'success', text: `Đã lưu ${json.results?.length || selectedSubjectIds.length} môn học vào kho chuyên môn trường (năm học ${academicYear}). Tải lại trang vẫn còn.` },
      );
      // Tự động tải lại danh sách nguồn đã lưu
      fetchSavedSources();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề trang */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>Phân phối chương trình</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Xem lịch tiết theo tuần và YCCĐ từng môn đã nhập; nhập mới hoặc nhập lại từ file sao lưu PPCT HUB. Bộ sách Kết nối tri thức, năm học 2026–2027.
          </p>
        </div>

        {/* Bộ lọc Khối & Năm học */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300 pl-2">Khối:</span>
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-none font-bold text-blue-600 dark:text-blue-400"
          >
            <option value={4}>Lớp 4</option>
            <option value={1} disabled>Lớp 1 (Chưa mở)</option>
            <option value={2} disabled>Lớp 2 (Chưa mở)</option>
            <option value={3} disabled>Lớp 3 (Chưa mở)</option>
            <option value={5} disabled>Lớp 5 (Chưa mở)</option>
          </select>

          <span className="font-semibold text-slate-600 dark:text-slate-300 pl-1">Năm học:</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 font-bold text-blue-700 dark:text-blue-300">
            2026–2027 (Thống nhất)
          </span>
        </div>
      </div>

      {/* Tabs điều hướng */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('saved_sources')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'saved_sources'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Dữ liệu đã nhập ({savedSources.length} môn)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ppct_hub')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'ppct_hub'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Nhập sao lưu PPCT HUB (.json)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-extrabold">
            Khuyên dùng
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('docx_xlsx')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'docx_xlsx'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Nhập từ Word / Excel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pdf_ppct')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'pdf_ppct'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          <span>Nhập PPCT từ PDF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pdf_scan')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'pdf_scan'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          <span>PDF Scan & Đối chiếu tay</span>
        </button>

      </div>

      {/* TAB 1: NHẬP SAO LƯU PPCT HUB (.JSON) */}
      {activeTab === 'ppct_hub' && (
        <div className="space-y-6">
          {/* Stepper 8 bước */}
          <PipelineStepper currentStep={pipelineStep} />

          {/* Vùng chọn/tải tệp JSON */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Bước 1 & 2: Chọn tệp sao lưu JSON từ app THAYKHAIEDU PPCT HUB</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tệp sao lưu chuẩn schema 2.0 chứa toàn bộ cây chủ đề, bài học, tiết học và YCCĐ Khối 4
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadProjectSampleFile}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Dùng tệp sao lưu có sẵn trong dự án (20261104.json)
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-950/20">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Kéo thả tệp sao lưu <code>.json</code> vào đây, hoặc chọn tệp từ máy
              </p>
              <label className="mt-3 inline-block">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors">
                  Chọn tệp JSON...
                </span>
              </label>
            </div>

            {isAnalyzing && (
              <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>Đang phân tích cấu trúc, lọc Khối 4 năm học 2026–2027 và chạy bộ kiểm tra 6 sai lệch...</span>
              </div>
            )}

            {saveMessage && (
              <div
                className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
                  saveMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {saveMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{saveMessage.text}</span>
              </div>
            )}
          </div>

          {/* KẾT QUẢ PHÂN TÍCH VÀ CÁC BƯỚC TIẾP THEO */}
          {analysisResult && (
            <div className="space-y-6">
              {/* Bước 6: Bảng tổng hợp lỗi & chọn môn */}
              <DiscrepancySummaryTable
                summary={analysisResult.summary}
                selectedSubjectIds={selectedSubjectIds}
                onToggleSubject={toggleSubject}
                onSelectOnlyClean={selectOnlyClean}
                onSelectAllValid={toggleAllValid}
              />

              {/* Bộ chọn môn để xem trước 2 cột */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Xem chi tiết môn:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(analysisResult.summary.subjectsSummary).map((s) => (
                    <button
                      key={s.subjectId}
                      type="button"
                      onClick={() => setPreviewSubjectId(s.subjectId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        previewSubjectId === s.subjectId
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : s.canImport
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {s.subjectName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bước 5: Xem trước 2 cột */}
              <TwoColumnPreview
                selectedSubjectId={previewSubjectId}
                selectedSubjectName={
                  analysisResult.summary.subjectsSummary[previewSubjectId]?.subjectName || previewSubjectId
                }
                topics={analysisResult.topics}
                lessons={analysisResult.lessons}
                periods={analysisResult.periods}
                outcomes={analysisResult.outcomes}
                provenanceType={provenanceType}
              />

              {/* Bước 7: Xác nhận cấp độ nguồn gốc */}
              <ProvenanceSelector
                selectedProvenance={provenanceType}
                onChange={setProvenanceType}
              />

              {/* Bước 8: Thanh nút Lưu vào kho chuyên môn */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Sẵn sàng lưu {selectedSubjectIds.length} môn học vào cơ sở dữ liệu
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Hệ thống sẽ cập nhật bảng <code>curriculum_sources</code>, <code>curriculum_outcomes</code> và <code>curriculum_mappings</code> với RLS cách ly theo trường.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedSubjectIds.length} môn được chọn
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveToCurriculumDatabase}
                    disabled={isSaving || selectedSubjectIds.length === 0}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors ${
                      isSaving || selectedSubjectIds.length === 0
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Đang lưu vào kho...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Xác nhận và Lưu vào Kho chuyên môn (Bước 8)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NHẬP TỪ WORD / EXCEL */}
      {activeTab === 'docx_xlsx' && <DocxXlsxImportTab />}

      {activeTab === 'pdf_ppct' && <PpctPdfTab />}

      {/* TAB 3: PDF SCAN & ĐỐI CHIẾU TAY */}
      {activeTab === 'pdf_scan' && <ScannedPdfManualTab />}

      {/* TAB 4: KHO NGUỒN ĐÃ LƯU TRONG DB */}
      {activeTab === 'saved_sources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Phân phối chương trình đã nhập (Khối {grade}, năm học {academicYear})
            </h3>
            <button
              type="button"
              onClick={fetchSavedSources}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 text-slate-700 dark:text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSources ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {isLoadingSources ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Đang tải danh sách nguồn chuyên môn từ cơ sở dữ liệu...
            </div>
          ) : savedSources.length === 0 ? (
            <EmptySourcesState
              onStartImportJson={() => setActiveTab('ppct_hub')}
              onStartImportDocx={() => setActiveTab('docx_xlsx')}
            />
          ) : (
            <PpctDaNhapView sources={savedSources} onNhapLai={() => setActiveTab('ppct_hub')} />
          )}
        </div>
      )}
    </div>
  );
}
