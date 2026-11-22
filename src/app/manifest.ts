import type { MetadataRoute } from 'next';

// Thông tin để cài app lên màn hình chính (điện thoại, máy tính).
// Ảnh gốc của icon nằm ở docs/thuong-hieu/icon-app.svg.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ThayKhaiEdu - AI tạo đề kiểm tra',
    short_name: 'AI tạo đề',
    description: 'Xưởng đề kiểm tra tiểu học của ThayKhaiEdu',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#4f46e5',
    theme_color: '#4f46e5',
    lang: 'vi',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
