'use client';

import React, { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        isMobileOpen={isMobileOpen}
        onToggleMobileNav={() => setIsMobileOpen(!isMobileOpen)}
      />
      <div className="flex flex-1">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          isCollapsed={isDesktopCollapsed}
          onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        />
        <main
          className={`flex-1 transition-all duration-300 ${
            isDesktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          } p-4 sm:p-6 lg:p-8 overflow-x-hidden`}
        >
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
