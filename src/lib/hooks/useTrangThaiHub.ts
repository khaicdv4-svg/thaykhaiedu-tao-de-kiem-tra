'use client';

/**
 * Trạng thái kết nối kho chung PPCT HUB, dùng chung cho thanh trên cùng và thẻ theo dõi.
 * Tự kiểm tra lại mỗi 5 phút và khi quay lại tab. Sau khi đồng bộ, gọi baoCapNhatHub() để mọi nơi nạp lại.
 */

import { useCallback, useEffect, useState } from 'react';
import type { KetQuaTrangThaiHub } from '@/core/curriculum/ppct-hub-ket-noi';

const SU_KIEN = 'ppct-hub:cap-nhat';
const CHU_KY = 5 * 60_000;

export function baoCapNhatHub(kq?: KetQuaTrangThaiHub) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SU_KIEN, { detail: kq }));
}

export function useTrangThaiHub() {
  const [trangThai, setTrangThai] = useState<KetQuaTrangThaiHub | null>(null);
  const [dangTai, setDangTai] = useState(false);

  const napLai = useCallback(async () => {
    setDangTai(true);
    try {
      const r = await fetch('/api/ppct-hub', { cache: 'no-store' });
      const d = await r.json();
      setTrangThai(d);
    } catch {
      setTrangThai((cu) => ({
        ketNoi: 'MAT_KET_NOI',
        kiemTraLuc: new Date().toISOString(),
        namHoc: cu?.namHoc ?? '2026-2027',
        loi: 'Không gọi được máy chủ của Xưởng. Kiểm tra mạng rồi thử lại.',
        mon: cu?.mon ?? [],
        lop: cu?.lop ?? [],
        tong: cu?.tong ?? { tongMon: 0, khop: 0, canDongBo: 0 },
      }));
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    napLai();
    const t = setInterval(napLai, CHU_KY);
    const khiQuayLai = () => { if (document.visibilityState === 'visible') napLai(); };
    const khiCapNhat = (e: Event) => {
      const kq = (e as CustomEvent<KetQuaTrangThaiHub | undefined>).detail;
      if (kq) setTrangThai(kq); else napLai();
    };
    document.addEventListener('visibilitychange', khiQuayLai);
    window.addEventListener(SU_KIEN, khiCapNhat);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', khiQuayLai);
      window.removeEventListener(SU_KIEN, khiCapNhat);
    };
  }, [napLai]);

  return { trangThai, dangTai, napLai };
}
