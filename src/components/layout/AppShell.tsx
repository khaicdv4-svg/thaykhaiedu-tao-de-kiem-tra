'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumb } from './Breadcrumb';
import { AuthProvider } from '@/core/contexts/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  // Trang đăng nhập: không có menu và thanh trên
  if (pathname === '/login') return <main className="min-h-screen">{children}</main>;

  return (
    <div className="min-h-screen font-sans">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
      />
      {/* Cột nội dung: chừa chỗ cho thanh menu bên trái */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDesktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Header isMobileOpen={isMobileOpen} onToggleMobileNav={() => setIsMobileOpen(!isMobileOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Breadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  );
}
