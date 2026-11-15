'use client';

/** Huy hiệu nhỏ trên thanh trên cùng: trạng thái kết nối kho chung PPCT HUB, bấm để xem chi tiết. */

import React from 'react';
import Link from 'next/link';
import { useTrangThaiHub } from '@/lib/hooks/useTrangThaiHub';
import { NHAN_KET_NOI, ngayGio } from '@/core/curriculum/ppct-hub-ket-noi';
import { MAU_KET_NOI } from './TrangThaiPpctHub';

export function HuyHieuPpctHub() {
  const { trangThai } = useTrangThaiHub();
  if (!trangThai) return null;
  const mau = MAU_KET_NOI[trangThai.ketNoi];
  const canLop = trangThai.lop.filter((l) => l.lanDongBoGanNhat && l.canDongBo > 0).reduce((s, l) => s + l.canDongBo, 0);
  const nhan = trangThai.ketNoi === 'CAN_DONG_BO' && canLop > 0 ? `${canLop} môn cần đồng bộ` : NHAN_KET_NOI[trangThai.ketNoi];
  return (
    <Link
      href="/sources#ppct-hub"
      className={`hidden lg:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold hover:opacity-90 ${mau.khung}`}
      title={`Kho chung PPCT HUB: ${NHAN_KET_NOI[trangThai.ketNoi]}. Kiểm tra lúc ${ngayGio(trangThai.kiemTraLuc)}.${trangThai.loi ? ` ${trangThai.loi}` : ''}`}
    >
      <span className={`h-2 w-2 rounded-full ${mau.cham}`} />
      PPCT HUB: {nhan}
    </Link>
  );
}
