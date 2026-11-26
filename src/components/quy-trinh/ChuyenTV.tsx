'use client';

/**
 * Đề Tiếng Việt làm ở trang riêng /de-tieng-viet (3 phần). Mở bước 2, 3, 4 với môn Tiếng Việt thì chuyển sang đó,
 * giữ kì và câu đang mở (?cau=).
 */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { docHoSoDe, cauTrenDiaChi } from '@/core/ho-so-de/ho-so-de';
import { duongDanTV, mucCuaCau, type MucTV } from '@/components/quy-trinh/nhung';

export function ChuyenTV({ muc, children }: { muc: MucTV; children: React.ReactNode }) {
  const router = useRouter();
  const [xong, setXong] = useState(false);
  const [chuyen, setChuyen] = useState(false);
  useEffect(() => {
    const h = docHoSoDe();
    if (h?.mon === 'TIENG_VIET') {
      const cau = cauTrenDiaChi();
      setChuyen(true);
      router.replace(duongDanTV(h.ky, cau ? mucCuaCau(cau) : muc, cau ?? undefined));
    }
    setXong(true);
  }, [muc, router]);
  if (!xong || chuyen) return <div className="p-6 text-sm text-slate-500">Đang mở…</div>;
  return <>{children}</>;
}
