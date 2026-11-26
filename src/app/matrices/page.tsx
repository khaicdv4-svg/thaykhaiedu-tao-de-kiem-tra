'use client';

import { MaTranView } from '@/components/quy-trinh/MaTranView';
import { ChuyenTV } from '@/components/quy-trinh/ChuyenTV';

/** Môn Tiếng Việt chuyển sang trang đề Tiếng Việt (3 phần); các môn khác dùng màn này. */
export default function Page() {
  return <ChuyenTV muc="p1-ma-tran"><MaTranView /></ChuyenTV>;
}
