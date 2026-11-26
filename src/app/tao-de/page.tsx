'use client';

import { TaoDeView } from '@/components/quy-trinh/TaoDeView';
import { ChuyenTV } from '@/components/quy-trinh/ChuyenTV';

/** Môn Tiếng Việt chuyển sang trang đề Tiếng Việt (3 phần); các môn khác dùng màn này. */
export default function Page() {
  return <ChuyenTV muc="p1-cau-hoi"><TaoDeView /></ChuyenTV>;
}
