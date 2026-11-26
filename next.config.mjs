/**
 * Mã phiên bản của bản dựng: commit trên Vercel (7 kí tự), chạy trên máy thì theo giờ dựng.
 * Gắn cố định vào cả trình duyệt lẫn máy chủ lúc dựng; trang đang mở so với máy chủ để biết đã có bản mới.
 */
const PHIEN_BAN = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || `may-${Date.now().toString(36)}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Đọc file Word cũ (.doc) trên máy chủ: dùng nguyên gói Node, không đóng gói lại
  serverExternalPackages: ['word-extractor'],
  env: {
    NEXT_PUBLIC_PHIEN_BAN: PHIEN_BAN,
    NEXT_PUBLIC_NGAY_DUNG: new Date().toISOString(),
  },
};

export default nextConfig;
