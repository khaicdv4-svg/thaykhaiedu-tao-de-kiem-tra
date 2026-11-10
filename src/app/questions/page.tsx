import React from 'react';
import { NganHangCauHoi } from '@/components/de/NganHangCauHoi';

export default function QuestionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ngân hàng câu hỏi</h1>
        <p className="text-sm text-slate-600 mt-1">Câu hỏi giáo viên trong trường đã lưu để dùng lại. Khi soạn đề, bấm "Lưu vào ngân hàng" ở câu muốn giữ, hoặc "Lấy từ ngân hàng" để chọn câu có sẵn.</p>
      </div>
      <div className="the-tke p-4"><NganHangCauHoi /></div>
    </div>
  );
}
