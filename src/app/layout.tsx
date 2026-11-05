import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { DEFAULT_APP_CONFIG } from '@/core/config/app-config';

const beVietnamPro = { variable: '' };

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
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
