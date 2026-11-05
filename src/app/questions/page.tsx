import React from 'react';
import { PlaceholderView } from '@/components/ui/PlaceholderView';
import { FileQuestion } from 'lucide-react';

export default function QuestionsPage() {
  return (
    <PlaceholderView
      title="Ngân hàng câu hỏi"
      description="Quản lý và truy xuất ngân hàng câu hỏi Multimodal đa dạng (Văn bản, Hình ảnh, Bảng biểu, Sơ đồ)."
      icon={FileQuestion}
      moduleCode="MOD-04"
      plannedFeatures={[
        'Cấu trúc dữ liệu Multimodal sẵn sàng: TextBlock, ImageBlock, TableBlock, DiagramBlock.',
        'Gắn mã YCCĐ, nguồn gốc (Provenance) và mức độ khó cho từng câu hỏi.',
        'Quản lý đáp án, lời giải chi tiết và hướng dẫn chấm (Rubric).',
        'Tìm kiếm và lọc câu hỏi theo môn, khối lớp và từ khóa bài học.',
      ]}
    />
  );
}
