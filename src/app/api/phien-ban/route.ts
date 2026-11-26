import { NextResponse } from 'next/server';
import { NGAY_DUNG, NHAT_KY_CAP_NHAT, PHIEN_BAN } from '@/core/phien-ban/phien-ban';

/**
 * Phiên bản đang chạy trên máy chủ và nhật ký cập nhật của bản đó: GET → { phienBan, ngayDung, nhatKy }.
 * Trang đang mở so mã phiên bản này với mã của chính nó để báo có bản mới. Không lưu đệm.
 */
export async function GET() {
  return NextResponse.json(
    { phienBan: PHIEN_BAN, ngayDung: NGAY_DUNG, nhatKy: NHAT_KY_CAP_NHAT.slice(0, 10) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
