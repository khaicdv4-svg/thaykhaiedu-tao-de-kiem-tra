import React from 'react';
import { PlaceholderView } from '@/components/ui/PlaceholderView';
import { FolderKanban } from 'lucide-react';

export default function TestsPage() {
  return (
    <PlaceholderView
      title="Kho đề kiểm tra"
      description="Quản lý toàn bộ vòng đời đề kiểm tra định kỳ, quy trình kiểm tra chéo, phê duyệt và chốt xuất bản."
      icon={FolderKanban}
      moduleCode="MOD-07"
      plannedFeatures={[
        'Quản lý vòng đời đề kiểm tra theo SPEC 9.2: DRAFT → READY → SUBMITTED_LOCKED → CROSS_REVIEW → REVIEWED → SHORTLISTED (chọn 3 đề) → TEAM_REVIEW → PRINCIPAL_REVIEW → APPROVED → PUBLISHED / ARCHIVED.',
        'Phân công kiểm tra chéo giữa các giáo viên trong cùng khối/tổ chuyên môn.',
        'Lưu trữ phiên bản lịch sử (Versioning) và nhật ký thao tác (Audit Logs).',
        'Xuất trọn bộ hồ sơ đề kiểm tra (Đề thi, Đáp án, Ma trận, Đặc tả) ra file DOCX và PDF.',
      ]}
    />
  );
}
