import React from 'react';
import { PlaceholderView } from '@/components/ui/PlaceholderView';
import { ShieldCheck } from 'lucide-react';

export default function ValidationPage() {
  return (
    <PlaceholderView
      title="Kiểm định đề"
      description="Rà soát tự động độ khớp YCCĐ, chính tả, độ bao phủ ma trận và phân tích chất lượng đề kiểm tra."
      icon={ShieldCheck}
      moduleCode="MOD-06"
      plannedFeatures={[
        'Rà soát tự động độ bao phủ kiến thức bám sát ma trận đã phê duyệt.',
        'Phát hiện lỗi chính tả, trùng lặp phương án hoặc thiếu dữ kiện trong ngữ liệu.',
        'Tính toán chỉ số chất lượng đề kiểm tra (Score 0-100) bằng AI.',
        'Đưa ra cảnh báo chi tiết và đề xuất hướng khắc phục trước khi chuyển duyệt.',
      ]}
    />
  );
}
