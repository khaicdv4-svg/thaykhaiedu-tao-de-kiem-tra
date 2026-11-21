/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Đọc file Word cũ (.doc) trên máy chủ: dùng nguyên gói Node, không đóng gói lại
  serverExternalPackages: ['word-extractor'],
};

export default nextConfig;
