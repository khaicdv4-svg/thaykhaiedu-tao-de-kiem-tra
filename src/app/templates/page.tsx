import React from 'react';
import { PlaceholderView } from '@/components/ui/PlaceholderView';
import { FileSpreadsheet } from 'lucide-react';

export default function TemplatesPage() {
  return (
    <PlaceholderView
      title="Mẫu đề & Định dạng in ấn"
      description="Quản lý và áp dụng mẫu in chuẩn của Tổ Khối 4 và các định dạng xuất bản Word/PDF."
      icon={FileSpreadsheet}
      moduleCode="MOD-08"
      plannedFeatures={[
        'Mẫu mặc định: Mẫu tổ khối 4 (Font Times New Roman cỡ 13, in đen trắng, cột điểm bên trái .../0,5đ, đường kẻ dọc, bố cục gọn 2 trang hoặc thoáng).',
        'Khung tiêu đề chuẩn: Tên trường, Họ tên HS, Lớp 4, Ngày kiểm tra, Điểm, Nhận xét, GV chấm 1&2, Phần bài làm của học sinh.',
        'Đồng bộ xuất bản: Đề bài, Hướng dẫn chấm / Đáp án và Ma trận được xuất từ cùng một nguồn dữ liệu thống nhất.',
        'Định dạng xuất Word (.docx) chỉnh sửa được, in vừa vặn khổ A4 không xô lệch trang.',
      ]}
    />
  );
}
