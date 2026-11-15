'use client';

/** Trang tổ trưởng: gom các việc của tổ trưởng, tổ phó vào một chỗ. */

import { Brain, Bot, CalendarRange, ClipboardCheck, FileSpreadsheet, Library, Table2, UserCog, UsersRound } from 'lucide-react';
import { TrangGom } from '@/components/layout/TrangGom';
import { VAI_TRO_TO_TRUONG } from '@/core/constants/navigation';

export default function TrangToTruong() {
  return (
    <TrangGom
      tieuDe="Trang tổ trưởng"
      moTa="Những việc tổ trưởng, tổ phó làm cho cả tổ: chuẩn bị căn cứ ra đề, cấp quyền cho giáo viên và duyệt đề."
      icon={UsersRound}
      choVaiTro={VAI_TRO_TO_TRUONG}
      phan={[
        {
          ten: 'Căn cứ ra đề của tổ',
          moTa: 'Giáo viên soạn đề dựa trên những gì tổ đã tải lên và xác nhận ở đây.',
          the: [
            { ten: 'Ma trận chung', moTa: 'Tải ma trận chung theo môn và kì kiểm tra, sửa và xác nhận', href: '/ma-tran-chung', icon: Table2 },
            { ten: 'Ma trận nội dung cả năm', moTa: 'Chủ điểm, YCCĐ và độ dài bài đọc theo từng kì', href: '/ma-tran-ca-nam', icon: CalendarRange },
            { ten: 'Bộ não chuyên môn', moTa: 'Quy định riêng của tổ: tốc độ đọc, độ dài bài, cách chấm', href: '/bo-nao', icon: Brain },
            { ten: 'Duyệt YCCĐ trong kho chương trình', moTa: 'Xem và duyệt YCCĐ do AI trích từ CT GDPT 2018, SGK, SGV', href: '/chuong-trinh', icon: Library },
          ],
        },
        {
          ten: 'Giáo viên trong tổ',
          the: [
            { ten: 'Quyền giáo viên trong tổ', moTa: 'Tích quyền soạn đề, thẩm định, sửa ma trận cho từng giáo viên rồi bấm Áp dụng', href: '/phan-quyen', icon: UserCog },
            { ten: 'Duyệt đề của tổ', moTa: 'Phân công kiểm tra chéo, duyệt đề và gửi Ban giám hiệu', href: '/tests', icon: ClipboardCheck },
          ],
        },
        {
          ten: 'In ấn và AI',
          the: [
            { ten: 'Mẫu đề và định dạng', moTa: 'Mẫu in của tổ và định dạng xuất Word/PDF', href: '/templates', icon: FileSpreadsheet },
            { ten: 'Cài đặt AI', moTa: 'Khóa API dùng chung và model cho từng việc', href: '/ai-settings', icon: Bot },
          ],
        },
      ]}
    />
  );
}
