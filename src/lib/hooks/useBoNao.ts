'use client';

import { useEffect, useState } from 'react';
import type { BoNao } from '@/core/bo-nao/bo-nao';

/** Bộ não chuyên môn của trường kèm cờ đã đọc xong (kể cả khi đọc lỗi). */
export function useBoNaoDaTai(): { boNao: BoNao | null; daTai: boolean } {
  const [kq, setKq] = useState<{ boNao: BoNao | null; daTai: boolean }>({ boNao: null, daTai: false });
  useEffect(() => {
    let huy = false;
    fetch('/api/bo-nao').then((r) => r.json())
      .then((r) => { if (!huy) setKq({ boNao: r.boNao ?? null, daTai: true }); })
      .catch(() => { if (!huy) setKq({ boNao: null, daTai: true }); });
    return () => { huy = true; };
  }, []);
  return kq;
}

/** Bộ não chuyên môn của trường (null khi đang tải hoặc chưa đọc được: app dùng số mặc định). */
export function useBoNao(): BoNao | null {
  return useBoNaoDaTai().boNao;
}
