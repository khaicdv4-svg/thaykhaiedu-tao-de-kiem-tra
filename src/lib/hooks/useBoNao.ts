'use client';

import { useEffect, useState } from 'react';
import type { BoNao } from '@/core/bo-nao/bo-nao';

/** Bộ não chuyên môn của trường (null khi đang tải hoặc chưa đọc được: app dùng số mặc định). */
export function useBoNao(): BoNao | null {
  const [boNao, setBoNao] = useState<BoNao | null>(null);
  useEffect(() => {
    let huy = false;
    fetch('/api/bo-nao').then((r) => r.json()).then((r) => { if (!huy && r.boNao) setBoNao(r.boNao); }).catch(() => {});
    return () => { huy = true; };
  }, []);
  return boNao;
}
