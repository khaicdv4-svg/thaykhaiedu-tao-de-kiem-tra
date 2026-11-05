import React, { useState } from 'react';
import {
  PpctHubTopic,
  PpctHubLesson,
  PpctHubPeriod,
  PpctHubYccdIdea,
  ProvenanceType,
  PROVENANCE_TYPE_MAP,
} from '@/types/curriculum-source';
import { BookOpen, Layers, Check, Database, ArrowRight } from 'lucide-react';

interface TwoColumnPreviewProps {
  selectedSubjectId: string;
  selectedSubjectName: string;
  topics: PpctHubTopic[];
  lessons: PpctHubLesson[];
  periods: PpctHubPeriod[];
  outcomes: PpctHubYccdIdea[];
  provenanceType: ProvenanceType;
}

export function TwoColumnPreview({
  selectedSubjectId,
  selectedSubjectName,
  topics,
  lessons,
  periods,
  outcomes,
  provenanceType,
}: TwoColumnPreviewProps) {
  const [activeTab, setActiveTab] = useState<'lessons' | 'outcomes'>('lessons');

  const provConfig = PROVENANCE_TYPE_MAP[provenanceType] || PROVENANCE_TYPE_MAP.UNVERIFIED_PENDING;

  // Lọc dữ liệu theo môn đang chọn
  const subjTopics = topics.filter((t) => t.subjectId === selectedSubjectId);
  const subjLessons = lessons.filter((l) => l.subjectId === selectedSubjectId);
  const subjPeriods = periods.filter((p) => p.subjectId === selectedSubjectId);
  const subjOutcomes = outcomes.filter((o) => o.subjectId === selectedSubjectId);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Đối chiếu xem trước 2 cột (Bước 5):</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">{selectedSubjectName}</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cột trái: Dữ liệu sao lưu thô từ PPCT HUB | Cột phải: Ánh xạ chuẩn hóa vào kho ThayKhaiEdu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('lessons')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'lessons'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            Bài học & Tiết ({subjLessons.length} bài / {subjPeriods.length} tiết)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outcomes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'outcomes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            YCCĐ & Ánh xạ ({subjOutcomes.length} mục)
          </button>
        </div>
      </div>

      {/* 2 Cột Đối Chiếu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CỘT 1: Dữ liệu gốc PPCT HUB */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                Nguồn thô: THAYKHAIEDU PPCT HUB V1
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              schema: 2.0
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {activeTab === 'lessons' ? (
              subjLessons.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">Không có bài học thô nào.</p>
              ) : (
                subjLessons.map((les) => (
                  <div
                    key={les.id}
                    className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {les.title || les.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{les.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Kế hoạch: {les.plannedPeriods || 1} tiết</span>
                      {les.yccdIds && les.yccdIds.length > 0 && (
                        <span>Gắn {les.yccdIds.length} mã YCCĐ</span>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : subjOutcomes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Không có YCCĐ thô nào.</p>
            ) : (
              subjOutcomes.map((o) => (
                <div
                  key={o.id}
                  className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {o.code || o.id}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                      {o.verificationStatus === 'verified' ? 'verified' : 'unverified'}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                    {o.content || o.itemText || o.originalText}
                  </p>
                  {o.sourceDocument && (
                    <p className="text-[10px] text-slate-400 italic">
                      Nguồn: {o.sourceDocument} ({o.sourcePageOrSection || 'N/A'})
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT 2: Ánh xạ chuẩn hóa ThayKhaiEdu */}
        <div className="border border-blue-200 dark:border-blue-900 rounded-lg p-3.5 bg-blue-50/20 dark:bg-blue-950/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                Đích: Kho Chuyên môn ThayKhaiEdu
              </span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${provConfig.badgeClass}`}>
              {provConfig.shortLabel}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {activeTab === 'lessons' ? (
              subjLessons.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có dữ liệu bài học.</p>
              ) : (
                subjLessons.map((les) => (
                  <div
                    key={`mapped-${les.id}`}
                    className="p-2.5 rounded border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {les.title || les.name}
                      </span>
                      <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                        Khối 4 - 2026-2027
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {les.plannedPeriods || 1} tiết phân phối
                      </span>
                      <span>Sách: Kết nối tri thức</span>
                    </div>
                  </div>
                ))
              )
            ) : subjOutcomes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có YCCĐ.</p>
            ) : (
              subjOutcomes.map((o) => (
                <div
                  key={`mapped-outcome-${o.id}`}
                  className="p-2.5 rounded border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                      {o.code || o.id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${provConfig.badgeClass}`}>
                      {provConfig.label}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed">
                    {o.content || o.itemText || o.originalText}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-1">
                    <span>external_hub_id: <code className="font-mono text-slate-600 dark:text-slate-300">{o.id}</code></span>
                    <span>•</span>
                    <span>Xác minh: {o.verificationStatus === 'verified' ? 'Đã duyệt' : 'Chờ soát'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
