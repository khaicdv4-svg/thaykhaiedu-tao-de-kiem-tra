'use client';

/**
 * ThayKhaiEdu - Hiện lại file Word đã tải lên: đoạn văn (canh giữa, in đậm) và bảng có ô gộp,
 * giống bản gốc nhất có thể. Dùng ở Kho ma trận và Mẫu đề. Truyền onSua để gõ sửa trực tiếp.
 */

import React from 'react';
import type { KhoiVanBan } from '@/core/utils/docx-bang';

/** Hiện lại file Word: đoạn văn và bảng có ô gộp, giống bản gốc nhất có thể. */
export type ViTriSua = { khoi: number; hang?: number; o?: number };

export function XemTaiLieuWord({ khoi, onSua }: { khoi: KhoiVanBan[]; onSua?: (vt: ViTriSua, chu: string) => void }) {
  // Khi sửa: ô và đoạn văn gõ trực tiếp được; rời ô thì ghi lại chữ
  const suaDuoc = (vt: ViTriSua) =>
    onSua
      ? {
          contentEditable: true,
          suppressContentEditableWarning: true,
          onBlur: (e: React.FocusEvent<HTMLElement>) => onSua(vt, e.currentTarget.innerText.replace(/\n$/, '')),
        }
      : {};
  const nenSua = onSua ? 'outline-none focus:bg-yellow-50 hover:bg-slate-50 cursor-text' : '';
  return (
    <div className="space-y-1 text-sm text-slate-800" style={{ fontFamily: '"Times New Roman", serif' }}>
      {khoi.map((k, i) =>
        k.loai === 'doan' ? (
          <p key={i} {...suaDuoc({ khoi: i })} className={`whitespace-pre-wrap min-h-[1em] ${k.giua ? 'text-center' : ''} ${k.dam ? 'font-bold' : ''} ${nenSua}`}>{k.chu}</p>
        ) : (
          <table key={i} className="w-full border-collapse my-2">
            <tbody>
              {k.hang.map((h, j) => (
                <tr key={j}>
                  {h.map((o, n) => (
                    <td key={n} colSpan={o.cot > 1 ? o.cot : undefined} rowSpan={o.hang > 1 ? o.hang : undefined}
                      {...suaDuoc({ khoi: i, hang: j, o: n })}
                      className={`border border-slate-400 px-1.5 py-1 align-middle whitespace-pre-wrap ${o.giua ? 'text-center' : ''} ${o.dam ? 'font-bold' : ''} ${nenSua}`}>
                      {o.chu}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ),
      )}
    </div>
  );
}

