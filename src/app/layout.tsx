import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { DEFAULT_APP_CONFIG } from '@/core/config/app-config';

export const metadata: Metadata = {
  title: `${DEFAULT_APP_CONFIG.brandName} - ${DEFAULT_APP_CONFIG.productName}`,
  description: DEFAULT_APP_CONFIG.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        {/* Be Vietnam Pro: kiểu chữ thiết kế cho tiếng Việt, dấu rõ ở mọi cỡ */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased text-slate-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
