'use client';

/**
 * ThayKhaiEdu - Trang chủ: các hồ sơ đề (môn × kì) đang làm, bấm là vào đúng bước làm tiếp.
 * Ma trận riêng, đặc tả là chung của tổ; đề là của chính người đăng nhập.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FolderOpen } from 'lucide-react';
import { ganHoSo, luuHoSoDe, tenKyHoSo, tenMonHoSo, kyHopLe, type HoSoDe } from '@/core/ho-so-de/ho-so-de';
import type { DongHoSoDe } from '@/core/ho-so-de/danh-sach';

const TRANG_BUOC: Record<DongHoSoDe['buocTiep'], { href: string; ten: string }> = {
  2: { href: '/matrices', ten: 'Làm tiếp ma trận' },
  3: { href: '/dac-ta', ten: 'Làm tiếp đặc tả' },
  4: { href: '/tao-de', ten: 'Soạn tiếp đề' },
  5: { href: '/tests', ten: 'Xem tình trạng duyệt' },
};

const ngay = (s: string | null) => (s ? new Date(s).toLocaleDateString('vi-VN') : '');

export function HoSoDangLam() {
  const [ds, setDs] = useState<DongHoSoDe[] | null>(null);

  useEffect(() => {
    let huy = false;
    fetch('/api/ho-so-de')
      .then((r) => r.json())
      .then((j) => { if (!huy) setDs(j.error ? null : (j.hoSo as DongHoSoDe[])); })
      .catch(() => { if (!huy) setDs(null); });
    return () => { huy = true; };
  }, []);

  // Chưa đăng nhập hoặc chưa kết nối dữ liệu: không hiện khung này
  if (ds === null) return null;

  const hien = ds.slice(0, 6);
  return (
    <section id="ho-so-dang-lam" className="the-tke p-5 sm:p-6 space-y-4 scroll-mt-24" aria-labelledby="tieu-de-ho-so">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="tieu-de-ho-so" className="text-lg font-bold text-slate-900">Hồ sơ đề đang làm</h2>
          <p className="text-sm text-slate-600">Mỗi hồ sơ là một môn, một kì. Bấm vào là tới đúng bước cần làm tiếp.</p>
        </div>
        {ds.length > hien.length && <Link href="/tests" className="text-sm font-medium text-indigo-700 hover:underline">Xem tất cả đề</Link>}
      </div>
      {hien.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          Chưa có hồ sơ nào. Bấm <b>Tạo đề kiểm tra mới</b> để chọn môn, kì và bắt đầu.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {hien.map((h) => {
            const buoc = TRANG_BUOC[h.buocTiep];
            const hoSo: HoSoDe | null = kyHopLe(h.ky) ? { mon: h.mon, ky: h.ky } : null;
            return (
              <li key={`${h.mon}-${h.ky}`}>
                <Link
                  href={ganHoSo(buoc.href, hoSo)}
                  onClick={() => { if (hoSo) luuHoSoDe(hoSo); }}
                  className="group flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className={`p-2 rounded-lg shrink-0 ${h.xong ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {h.xong ? <CheckCircle2 className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">{tenMonHoSo(h.mon)} · {tenKyHoSo(h.ky)}</div>
                      <div className="text-sm text-slate-600 first-letter:uppercase">{h.tinhTrang}</div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-slate-400">{h.capNhatLuc ? `Cập nhật ${ngay(h.capNhatLuc)}` : ''}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 group-hover:gap-2 transition-all">
                      Bước {h.buocTiep}: {buoc.ten} <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
