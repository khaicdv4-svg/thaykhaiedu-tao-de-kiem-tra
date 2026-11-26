'use client';

/**
 * Trang đề Tiếng Việt (quyết định của tổ trưởng ngày 26/11/2026): làm đề theo 3 phần của đề.
 * Phần 1 Đọc hiểu: bài đọc hiểu + ma trận đọc hiểu → bản đặc tả → câu hỏi.
 * Phần 2 Đọc thành tiếng: chọn 4 bài → câu hỏi.
 * Phần 3 Viết: kiểu bài → bản đặc tả → đề bài, hướng dẫn chấm.
 * Hoàn chỉnh đề: xem trước cả đề như bản in, bấm câu nào thì mở đúng phần để sửa; xuất Word kèm đáp án.
 * Ma trận riêng, đặc tả, đề vẫn là một bộ chung (bảng cũ), mỗi phần chỉ hiện câu của phần đó.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BookOpenText, CheckCircle2, ClipboardCheck, FileText, Mic, PenLine } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { useBoNao } from '@/lib/hooks/useBoNao';
import { kyTheoMon } from '@/core/ho-so-de/mon-ky';
import { docHoSoDe, kyHopLe, luuHoSoDe, tenKyHoSo } from '@/core/ho-so-de/ho-so-de';
import type { KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import { baiDocChonCoGi, type BaiDocChon, type BaiDocDe } from '@/core/de/tieng-viet';
import type { KyKiemTraBaiDoc } from '@/core/reading-passages/quy-dinh';
import { ChonBaiDoc } from '@/components/de/ChonBaiDoc';
import { MaTranView } from '@/components/quy-trinh/MaTranView';
import { DacTaView } from '@/components/quy-trinh/DacTaView';
import { TaoDeView } from '@/components/quy-trinh/TaoDeView';
import { duongDanTV, laMucTV, type MucTV, type NhungTV } from '@/components/quy-trinh/nhung';

const PHAN: { ten: string; icon: typeof BookOpenText; muc: { ma: MucTV; ten: string }[] }[] = [
  { ten: 'Phần 1. Đọc hiểu', icon: BookOpenText, muc: [{ ma: 'p1-ma-tran', ten: 'Bài đọc & ma trận' }, { ma: 'p1-dac-ta', ten: 'Bản đặc tả' }, { ma: 'p1-cau-hoi', ten: 'Câu hỏi' }] },
  { ten: 'Phần 2. Đọc thành tiếng', icon: Mic, muc: [{ ma: 'p2-chon-bai', ten: 'Chọn bài' }, { ma: 'p2-cau-hoi', ten: 'Câu hỏi' }] },
  { ten: 'Phần 3. Viết', icon: PenLine, muc: [{ ma: 'p3-kieu-bai', ten: 'Kiểu bài' }, { ma: 'p3-dac-ta', ten: 'Bản đặc tả' }, { ma: 'p3-de-bai', ten: 'Đề bài & HDC' }] },
  { ten: 'Hoàn chỉnh đề', icon: FileText, muc: [{ ma: 'hoan-chinh', ten: 'Xem trước, sửa, xuất Word' }] },
];

function TrangDeTiengViet() {
  const sp = useSearchParams();
  const router = useRouter();
  const { khoiLamViec } = useAuth();
  const boNao = useBoNao();
  const kyUrl = sp.get('ky');
  const mucUrl = sp.get('muc');
  const [ky, setKy] = useState<KyDung | null>(kyHopLe(kyUrl) ? kyUrl : null);
  const muc: MucTV = laMucTV(mucUrl) ? mucUrl : 'p1-ma-tran';
  const [bdHieu, setBdHieu] = useState<BaiDocDe | null>(null);

  // Kì: địa chỉ trước, rồi hồ sơ lưu trên máy; giữ hồ sơ đề là Tiếng Việt cho các bước khác
  useEffect(() => {
    if (ky) { luuHoSoDe({ mon: 'TIENG_VIET', ky }); return; }
    const h = docHoSoDe();
    const k: KyDung = h?.ky ?? 'CUOI_HK1';
    router.replace(duongDanTV(k, muc));
    setKy(k);
  }, [ky, muc, router]);
  useEffect(() => { if (kyHopLe(kyUrl) && kyUrl !== ky) setKy(kyUrl); }, [kyUrl, ky]);

  // Bài đọc hiểu đã chọn (để ma trận chọn đúng phần VBVH / VBTT ở mọi mục)
  useEffect(() => {
    if (!ky) return;
    let huy = false;
    fetch(`/api/bai-doc-chon?ky=${ky}`).then((r) => r.json()).then((j: { baiDoc?: BaiDocChon | null }) => {
      if (!huy) setBdHieu(baiDocChonCoGi(j.baiDoc) && j.baiDoc.baiDocHieu.noiDung.trim() ? j.baiDoc.baiDocHieu : null);
    }).catch(() => {});
    return () => { huy = true; };
  }, [ky]);

  const dsKy = useMemo(() => kyTheoMon(khoiLamViec, 'TIENG_VIET', boNao?.kiemTraThem ?? []), [khoiLamViec, boNao]);
  const lienKet = useMemo(() => (m: MucTV, cau?: string) => duongDanTV(ky ?? 'CUOI_HK1', m, cau), [ky]);
  const nhung = (phan: NhungTV['phan']): NhungTV => ({ phan, lienKet });

  if (!ky) return <div className="p-6 text-sm text-slate-500">Đang mở…</div>;
  const tenKy = tenKyHoSo(ky);
  const khoa = `${muc}|${ky}`;

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      <div className="the-tke p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Đề Tiếng Việt – Lớp {khoiLamViec}</h1>
            <p className="text-sm text-slate-600">Làm lần lượt 3 phần của đề, rồi Hoàn chỉnh đề. Mỗi phần lưu riêng, quay lại sửa lúc nào cũng được.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">Kì kiểm tra
              <select aria-label="Kì kiểm tra" className="rounded-lg border border-slate-300 px-3 py-2 bg-white" value={ky} onChange={(e) => router.push(duongDanTV(e.target.value, muc))}>
                {dsKy.map((k) => <option key={k} value={k}>{tenKyHoSo(k)}</option>)}
              </select>
            </label>
            <Link href={`/test-builder?mon=TIENG_VIET&ky=${ky}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50">Thiết lập, lịch sử</Link>
            <Link href="/tests" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50"><ClipboardCheck className="w-4 h-4" /> Duyệt đề, kho đề</Link>
          </div>
        </div>

        <nav aria-label="Các phần của đề Tiếng Việt" className="grid gap-2 md:grid-cols-4">
          {PHAN.map((p) => {
            const dangO = p.muc.some((m) => m.ma === muc);
            const Icon = p.icon;
            return (
              <div key={p.ten} className={`rounded-xl border p-3 ${dangO ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                <Link href={lienKet(p.muc[0].ma)} className={`flex items-center gap-2 font-semibold ${dangO ? 'text-indigo-800' : 'text-slate-800'}`}><Icon className="w-4 h-4" /> {p.ten}</Link>
                {p.muc.length > 1 && (
                  <ol className="mt-2 flex flex-wrap gap-1.5">
                    {p.muc.map((m, i) => (
                      <li key={m.ma}>
                        <Link href={lienKet(m.ma)} aria-current={m.ma === muc ? 'step' : undefined}
                          className={`inline-block rounded-full px-2.5 py-1 text-xs ${m.ma === muc ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                          {i + 1}. {m.ten}
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {muc === 'p1-ma-tran' && (
        <div key={khoa} className="space-y-5">
          <ChonBaiDoc ky={ky as KyKiemTraBaiDoc} tenKy={tenKy} phan="docHieu" onDocHieu={setBdHieu} />
          <MaTranView nhung={nhung('docHieu')} baiDocHieuNgoai={bdHieu} />
        </div>
      )}
      {muc === 'p1-dac-ta' && <DacTaView key={khoa} nhung={nhung('docHieu')} />}
      {muc === 'p1-cau-hoi' && <TaoDeView key={khoa} nhung={nhung('docHieu')} />}

      {muc === 'p2-chon-bai' && (
        <div key={khoa} className="space-y-4">
          <ChonBaiDoc ky={ky as KyKiemTraBaiDoc} tenKy={tenKy} phan="thanhTieng" />
          <div className="flex justify-end">
            <Link href={lienKet('p2-cau-hoi')} className="nut-tke text-sm">Tiếp theo: Câu hỏi đọc thành tiếng <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      )}
      {muc === 'p2-cau-hoi' && <TaoDeView key={khoa} nhung={nhung('thanhTieng')} />}

      {muc === 'p3-kieu-bai' && <MaTranView key={khoa} nhung={nhung('viet')} baiDocHieuNgoai={bdHieu} />}
      {muc === 'p3-dac-ta' && <DacTaView key={khoa} nhung={nhung('viet')} />}
      {muc === 'p3-de-bai' && <TaoDeView key={khoa} nhung={nhung('viet')} />}

      {muc === 'hoan-chinh' && (
        <div key={khoa} className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Cả đề như bản in, kèm đáp án và hướng dẫn chấm. Bấm "Sửa câu này" ở câu nào thì app mở đúng phần chứa câu đó.
          </div>
          <TaoDeView nhung={nhung('hoanChinh')} />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="p-6 text-sm text-slate-500">Đang mở…</div>}><TrangDeTiengViet /></Suspense>;
}
