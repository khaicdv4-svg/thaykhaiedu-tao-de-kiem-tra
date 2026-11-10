'use client';

import React, { useState } from 'react';
import { NganHangCauHoi } from '@/components/de/NganHangCauHoi';
import { SoanHangLoatAI } from '@/components/de/SoanHangLoatAI';

export default function QuestionsPage() {
  const [lanTai, setLanTai] = useState(0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ngân hàng câu hỏi</h1>
        <p className="text-sm text-slate-600 mt-1">Câu hỏi giáo viên trong trường đã lưu để dùng lại. Khi soạn đề, bấm "Lưu vào ngân hàng" ở câu muốn giữ, hoặc "Lấy từ ngân hàng" để chọn câu có sẵn.</p>
      </div>
      <SoanHangLoatAI onDaLuu={() => setLanTai((n) => n + 1)} />
      <div className="the-tke p-4"><NganHangCauHoi key={lanTai} /></div>
    </div>
  );
}
