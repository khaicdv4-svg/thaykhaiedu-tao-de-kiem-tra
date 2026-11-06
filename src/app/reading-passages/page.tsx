'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { useBoNao } from '@/lib/hooks/useBoNao';
import { CHU_DIEM_THEO_KY, DANH_SACH_KY, TEN_THE_LOAI, khoangDoDai, TEN_LOAI, type KyKiemTraBaiDoc, type LoaiBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import { goiYCatDoan, type DoanCat } from '@/core/reading-passages/cat-doan';
import { danhGiaDoDai, danhGiaTheoBai } from '@/core/reading-passages/do-dai';

const TEN_TRANG_THAI: Record<string, string> = { DRAFT: 'Nháp', PENDING_REVIEW: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const TEN_KIEU_NGAT: Record<string, string> = { CUOI_CAU: 'ngắt cuối câu', CUOI_DONG: 'ngắt cuối dòng', DAU_PHAY: 'ngắt ở dấu phẩy', GIUA_CAU: 'ngắt giữa câu' };
const TAT_CA_CHU_DIEM = Object.values(CHU_DIEM_THEO_KY).flat();

export default function ReadingPassagesPage() {
  const boNao = useBoNao();
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedPassageForView, setSelectedPassageForView] = useState<ReadingPassage | null>(null);
  const [locKy, setLocKy] = useState('ALL');
  const [locChuDiem, setLocChuDiem] = useState('ALL');
  const [locTrangThai, setLocTrangThai] = useState('ALL');
  const [tuTieng, setTuTieng] = useState('');
  const [denTieng, setDenTieng] = useState('');
  const [doanCat, setDoanCat] = useState<DoanCat[] | null>(null);
  const [daChep, setDaChep] = useState<number | null>(null);
  const [kyCat, setKyCat] = useState<KyKiemTraBaiDoc>('GIUA_HK1');
  const [loaiCat, setLoaiCat] = useState<LoaiBaiDoc>('DOC_THANH_TIENG');
  // Lọc theo quy định độ dài của kì kiểm tra (để trống = không lọc theo quy định)
  const [quyKy, setQuyKy] = useState<KyKiemTraBaiDoc | ''>('');
  const [quyLoai, setQuyLoai] = useState<LoaiBaiDoc>('DOC_HIEU');
  const [quyTheLoai, setQuyTheLoai] = useState<TheLoaiBaiDoc>('TRUYEN');

  const quyDinh = useMemo(() => (quyKy ? khoangDoDai(quyLoai, quyKy, quyTheLoai, boNao) : null), [quyKy, quyLoai, quyTheLoai, boNao]);

  /** Đánh giá số tiếng của bài theo quy định của kì đang chọn. */
  // Không chọn kì để lọc thì đánh giá theo kì, loại bài, thể loại đã gắn cho chính bài đó (theo bộ não).
  const danhGia = (p: ReadingPassage) => (quyKy ? danhGiaDoDai(p.wordCount, quyLoai, quyKy, quyTheLoai, boNao) : danhGiaTheoBai(p, boNao));

  const danhSachHienThi = useMemo(() => {
    const tu = tuTieng.trim() ? Number(tuTieng) : null;
    const den = denTieng.trim() ? Number(denTieng) : null;
    return passages.filter((p) => {
      if (quyKy && quyDinh) {
        if (!danhGiaDoDai(p.wordCount, quyLoai, quyKy, quyTheLoai, boNao)?.dungDuoc) return false;
        if (quyLoai === 'DOC_HIEU' && p.literaryForm && p.literaryForm !== quyTheLoai) return false;
      }
      if (locKy !== 'ALL' && (locKy === 'CHUA_CO' ? !!p.assessmentPeriod : p.assessmentPeriod !== locKy)) return false;
      if (locChuDiem !== 'ALL' && (locChuDiem === 'CHUA_CO' ? !!p.theme : p.theme !== locChuDiem)) return false;
      if (locTrangThai !== 'ALL' && p.status !== locTrangThai) return false;
      if (tu !== null && !Number.isNaN(tu) && p.wordCount < tu) return false;
      if (den !== null && !Number.isNaN(den) && p.wordCount > den) return false;
      return true;
    });
  }, [passages, locKy, locChuDiem, locTrangThai, tuTieng, denTieng, quyDinh, quyKy, quyLoai, quyTheLoai, boNao]);

  const moXem = (p: ReadingPassage | null) => {
    setSelectedPassageForView(p);
    setDoanCat(null);
    setDaChep(null);
    if (p?.assessmentPeriod) setKyCat(p.assessmentPeriod as KyKiemTraBaiDoc);
  };

  /** Khoảng số tiếng để cắt: đọc thành tiếng theo tốc độ đọc; đọc hiểu theo thể loại của bài. */
  const khoangCat = (p: ReadingPassage | null, ky: KyKiemTraBaiDoc, loai: LoaiBaiDoc) => {
    const tl = (p?.genre && p.genre in TEN_THE_LOAI ? p.genre : 'TRUYEN') as TheLoaiBaiDoc;
    return khoangDoDai(loai, ky, tl, boNao);
  };

  const catDoan = (p: ReadingPassage, ky: KyKiemTraBaiDoc = kyCat, loai: LoaiBaiDoc = loaiCat) => {
    const kh = khoangCat(p, ky, loai) ?? (loai === 'DOC_HIEU' ? { min: 200, max: 250, dungSai: 10 } : { min: 80, max: 85, dungSai: 5 });
    setDoanCat(goiYCatDoan(p.content, { min: kh.min, max: kh.max, dungSai: kh.dungSai }));
    setDaChep(null);
  };

  const chepDoan = async (i: number, noiDung: string) => {
    try {
      await navigator.clipboard.writeText(noiDung);
      setDaChep(i);
    } catch {
      alert('Không sao chép được, thầy bôi đen đoạn văn rồi sao chép thủ công.');
    }
  };

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

      {/* Bộ lọc chọn bài theo kì, chủ điểm, trạng thái, số tiếng */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-end gap-3 text-xs">
        <label className="space-y-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Kì kiểm tra</span>
          <select value={locKy} onChange={(e) => setLocKy(e.target.value)} className="block px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
            <option value="ALL">Tất cả</option>
            {DANH_SACH_KY.map((k) => (<option key={k.ma} value={k.ma}>{k.ten}</option>))}
            <option value="CHUA_CO">Chưa xếp kì</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Chủ điểm</span>
          <select value={locChuDiem} onChange={(e) => setLocChuDiem(e.target.value)} className="block px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
            <option value="ALL">Tất cả</option>
            {TAT_CA_CHU_DIEM.map((c) => (<option key={c} value={c}>{c}</option>))}
            <option value="CHUA_CO">Chưa xếp chủ điểm</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Trạng thái</span>
          <select value={locTrangThai} onChange={(e) => setLocTrangThai(e.target.value)} className="block px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
            <option value="ALL">Tất cả</option>
            {Object.entries(TEN_TRANG_THAI).map(([ma, ten]) => (<option key={ma} value={ma}>{ten}</option>))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Số tiếng từ</span>
          <input type="number" min={0} value={tuTieng} onChange={(e) => setTuTieng(e.target.value)} className="block w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </label>
        <label className="space-y-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">đến</span>
          <input type="number" min={0} value={denTieng} onChange={(e) => setDenTieng(e.target.value)} className="block w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </label>
        <div className="flex flex-wrap items-end gap-3 border-l border-slate-200 pl-3">
          <label className="space-y-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Theo quy định độ dài của kì</span>
            <select value={quyKy} onChange={(e) => setQuyKy(e.target.value as KyKiemTraBaiDoc | '')} className="block px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="">Không lọc</option>
              {DANH_SACH_KY.map((k) => (<option key={k.ma} value={k.ma}>{k.ten}</option>))}
            </select>
          </label>
          {quyKy && (
            <>
              <label className="space-y-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Dùng cho</span>
                <select value={quyLoai} onChange={(e) => setQuyLoai(e.target.value as LoaiBaiDoc)} className="block px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {(Object.keys(TEN_LOAI) as LoaiBaiDoc[]).map((l) => (<option key={l} value={l}>{TEN_LOAI[l]}</option>))}
                </select>
              </label>
              {quyLoai === 'DOC_HIEU' && (
                <label className="space-y-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Thể loại</span>
                  <select value={quyTheLoai} onChange={(e) => setQuyTheLoai(e.target.value as TheLoaiBaiDoc)} className="block px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
                    {(['TRUYEN', 'MIEU_TA', 'THO', 'VAN_BAN_THONG_TIN'] as TheLoaiBaiDoc[]).map((t) => (<option key={t} value={t}>{TEN_THE_LOAI[t]}</option>))}
                  </select>
                </label>
              )}
              <p className="text-slate-500 pb-1.5">
                {quyDinh ? `Quy định: ${quyDinh.min}–${quyDinh.max} tiếng, lệch tối đa ±${quyDinh.dungSai}` : 'Tổ chưa quy định độ dài cho thể loại này'}
              </p>
            </>
          )}
        </div>
        <p className="text-slate-500 pb-1.5">Hiện {danhSachHienThi.length}/{passages.length} bài</p>
      </div>

      {/* DANH SÁCH NGỮ LIỆU */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          Đang tải kho ngữ liệu Tiếng Việt...
        </div>
      ) : passages.length === 0 ? (
        <EmptyPassagesState onAddNew={() => setIsModalOpen(true)} />
      ) : danhSachHienThi.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 border border-dashed border-slate-300 rounded-xl">Không có bài nào khớp bộ lọc. Thử nới khoảng số tiếng hoặc chọn "Tất cả".</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {danhSachHienThi.map((p) => {
            const config = READING_PASSAGE_CONFIG[p.passageType] || READING_PASSAGE_CONFIG.ORAL_READING;
            const dg = danhGia(p);

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
                        dg
                          ? dg.mau === 'xanh'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : dg.mau === 'vang'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {p.wordCount} tiếng ({dg ? dg.nhan : 'chưa gắn kì, chưa đánh giá'})
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {p.title}
                  </h3>
                  {p.nhanAI && <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">{p.nhanAI}</span>}

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
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">{TEN_TRANG_THAI[p.status] ?? p.status}</span>
                    {p.assessmentPeriod && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{DANH_SACH_KY.find((k) => k.ma === p.assessmentPeriod)?.ten ?? p.assessmentPeriod}</span>}
                    {p.literaryForm && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{TEN_THE_LOAI[p.literaryForm as TheLoaiBaiDoc] ?? p.literaryForm}</span>}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    {p.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {quyDinh ? `Quy định kì: ${quyDinh.min}–${quyDinh.max} tiếng` : `Khung: ${p.targetWordCountMin}–${p.targetWordCountMax} tiếng`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moXem(p)}
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
                onClick={() => moXem(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-slate-500">
              <p><strong>Tác giả:</strong> {selectedPassageForView.author}</p>
              {selectedPassageForView.nhanAI && <p className="text-violet-800 font-medium">{selectedPassageForView.nhanAI}</p>}
              <p><strong>Nguồn xuất bản:</strong> {selectedPassageForView.sourceReference}</p>
              <p><strong>Độ dài:</strong> {selectedPassageForView.wordCount} tiếng Việt (Khối {selectedPassageForView.grade})</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border leading-relaxed text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
              {selectedPassageForView.content}
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="font-semibold text-slate-600">Cắt cho</label>
                <select
                  aria-label="Loại bài cần cắt"
                  value={loaiCat}
                  onChange={(e) => {
                    setLoaiCat(e.target.value as LoaiBaiDoc);
                    catDoan(selectedPassageForView, kyCat, e.target.value as LoaiBaiDoc);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="DOC_THANH_TIENG">Đọc thành tiếng</option>
                  <option value="DOC_HIEU">Đọc hiểu</option>
                </select>
                <label className="font-semibold text-slate-600">kì</label>
                <select
                  value={kyCat}
                  onChange={(e) => {
                    setKyCat(e.target.value as KyKiemTraBaiDoc);
                    catDoan(selectedPassageForView, e.target.value as KyKiemTraBaiDoc);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white"
                >
                  {DANH_SACH_KY.map((k) => (<option key={k.ma} value={k.ma}>{k.ten}</option>))}
                </select>
                <span className="text-slate-500">
                  {(() => {
                    const kh = khoangCat(selectedPassageForView, kyCat, loaiCat);
                    return kh ? `Quy định: ${kh.min}–${kh.max} tiếng (lệch tối đa ±${kh.dungSai})` : '';
                  })()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => catDoan(selectedPassageForView)}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold"
              >
                Cắt đoạn {loaiCat === 'DOC_HIEU' ? 'đọc hiểu' : 'đọc thành tiếng'}
              </button>
              {doanCat && doanCat.length === 0 && (
                <p className="text-amber-700">Bài này chưa đủ số tiếng để cắt đoạn {loaiCat === 'DOC_HIEU' ? 'đọc hiểu' : 'đọc thành tiếng'}.</p>
              )}
              {doanCat?.map((d, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                  <p className="text-slate-500">
                    Gợi ý {i + 1}: <strong>{d.soTieng} tiếng</strong>{d.trongKhoang ? '' : ' (trong dung sai)'}, {d.batDau === 'DAU_BAI' ? 'từ đầu bài' : 'từ giữa bài'}, {TEN_KIEU_NGAT[d.kieuNgat]} (…{d.ketThuc})
                  </p>
                  <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed">{d.doan}</p>
                  <button type="button" onClick={() => chepDoan(i, d.doan)} className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">
                    {daChep === i ? 'Đã sao chép' : 'Sao chép đoạn này'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => moXem(null)}
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
