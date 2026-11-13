import React from 'react';
import { tachPhanSo } from '@/core/de/phan-so';

/** Hiển thị chữ có phân số a/b dưới dạng phân số (tử trên, mẫu dưới). Chữ không có phân số thì giữ nguyên. */
export function ChuPhanSo({ chu }: { chu: string }) {
  const manh = tachPhanSo(chu);
  if (manh.length === 1 && manh[0].loai === 'chu') return <>{chu}</>;
  return (
    <>
      {manh.map((m, i) => m.loai === 'chu'
        ? <React.Fragment key={i}>{m.chu}</React.Fragment>
        : (
          <span key={i} role="math" aria-label={`${m.tu} phần ${m.mau}`} className="inline-flex flex-col items-center align-middle leading-[1.05] mx-[0.15em] text-[0.9em]">
            <span className="px-[0.2em] border-b border-current">{m.tu}</span>
            <span className="px-[0.2em]">{m.mau}</span>
          </span>
        ))}
    </>
  );
}
