import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { KetQuaKiemDinh } from '@/core/matrix/matrix-template';

/** Hiện kết quả kiểm định: lỗi bắt buộc sửa và cảnh báo chuyên môn tách riêng. */
export function ValidationPanel({ ketQua, tieuDe }: { ketQua: KetQuaKiemDinh; tieuDe?: string }) {
  return (
    <div className="space-y-3">
      {tieuDe && <h3 className="font-semibold text-slate-900">{tieuDe}</h3>}
      {ketQua.hopLe ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Không có lỗi bắt buộc sửa.</span>
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <XCircle className="w-5 h-5" /> Lỗi phải sửa ({ketQua.loi.length})
          </div>
          <ul className="list-disc pl-6 space-y-0.5">
            {ketQua.loi.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      )}
      {ketQua.canhBao.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle className="w-5 h-5" /> Cần thầy cô xem xét ({ketQua.canhBao.length})
          </div>
          <ul className="list-disc pl-6 space-y-0.5">
            {ketQua.canhBao.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
