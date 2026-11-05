'use client';

/**
 * ThayKhaiEdu - Breadcrumb Navigation Component
 * Provides clean, hierarchical route breadcrumbs for all subpages.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: 'Tổng quan',
  sources: 'Chương trình & Nguồn',
  matrices: 'Ma trận & Đặc tả',
  questions: 'Ngân hàng câu hỏi',
  'reading-passages': 'Kho ngữ liệu Tiếng Việt',
  nhap: 'Nhập bài đọc',
  duyet: 'Hàng chờ duyệt',
  'test-builder': 'Xưởng tạo đề',
  validation: 'Kiểm định đề',
  tests: 'Kho đề kiểm tra',
  templates: 'Mẫu đề & Định dạng',
  settings: 'Cài đặt hệ thống',
  'ai-settings': 'Cài đặt AI',
  login: 'Đăng nhập',
};

export function Breadcrumb() {
  const pathname = usePathname();

  // Do not display breadcrumbs on login page
  if (pathname === '/login') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Thanh điều hướng phân cấp" className="flex items-center text-xs text-slate-500 mb-4 sm:mb-6">
      <ol className="flex items-center space-x-1 sm:space-x-2">
        <li className="flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center text-slate-500 hover:text-blue-600 transition-colors"
            title="Về Trang chủ Tổng quan"
          >
            <Home className="w-3.5 h-3.5 mr-1" />
            <span>Trang chủ</span>
          </Link>
        </li>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const title = ROUTE_NAME_MAP[segment] || decodeURIComponent(segment);

          // If on /dashboard itself, Trang chủ is already shown
          if (segment === 'dashboard' && segments.length === 1) {
            return null;
          }

          return (
            <React.Fragment key={href}>
              <li className="text-slate-300">
                <ChevronRight className="w-3.5 h-3.5" />
              </li>
              <li className="flex items-center">
                {isLast ? (
                  <span className="font-semibold text-slate-800" aria-current="page">
                    {title}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {title}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
