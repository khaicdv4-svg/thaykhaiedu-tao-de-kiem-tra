'use client';

/**
 * ThayKhaiEdu - Thanh điều hướng bên trái.
 * Bố cục: logo → Tổng quan → vùng "Tạo đề kiểm tra" (5 bước nối nhau thành một đường)
 * → các nhóm thu gọn được: Nguồn chuyên môn, Kho và kiểm định, Tổ trưởng, Quản trị.
 * Nhóm Tổ trưởng / Quản trị chỉ hiện với đúng vai trò; nhóm đang chứa trang mở thì tự mở ra.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAIN_NAVIGATION, getNavGroupsForRole, NavItem } from '@/core/constants/navigation';
import { useAuth } from '@/core/contexts/AuthContext';
import { ChevronDown, ChevronLeft, ChevronRight, GraduationCap, Lock } from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const KHOA_MO_NHOM = 'tke.nhom-mo';

function dangMo(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
}

export function Sidebar({ isMobileOpen, onCloseMobile, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { activeRole } = useAuth();
  const nhom = useMemo(() => getNavGroupsForRole(activeRole), [activeRole]);

  // Vùng 5 bước: luôn đủ 5 bước theo thứ tự; bước chưa có quyền thì khóa, không ẩn
  const buocDuocVao = new Set(nhom.find((n) => n.nhom.ma === 'tao-de')?.muc.map((m) => m.id) ?? []);
  const namBuoc = MAIN_NAVIGATION.filter((m) => m.nhom === 'tao-de');
  const coDuongTaoDe = buocDuocVao.has('test-builder');
  const buocHienTai = namBuoc.findIndex((b) => dangMo(pathname, b.href));

  const nhomKhac = nhom.filter((n) => (n.nhom.ma !== 'chinh' && n.nhom.ma !== 'tao-de') || n.nhom.ten === 'Khác');
  const tongQuan = nhom.find((n) => n.nhom.ma === 'chinh' && n.nhom.ten !== 'Khác')?.muc ?? [];
  // Ban giám hiệu thuần: không có đường tạo đề, chỉ có mục duyệt đề
  const buocLe = coDuongTaoDe ? [] : namBuoc.filter((b) => buocDuocVao.has(b.id));

  const [moNhom, setMoNhom] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const luu = JSON.parse(localStorage.getItem(KHOA_MO_NHOM) || '{}') as Record<string, boolean>;
      setMoNhom(luu);
    } catch { /* trình duyệt chặn lưu trữ: dùng mặc định */ }
  }, []);
  const doiNhom = (ma: string, mo: boolean) => {
    setMoNhom((cu) => {
      const moi = { ...cu, [ma]: mo };
      try { localStorage.setItem(KHOA_MO_NHOM, JSON.stringify(moi)); } catch { /* bỏ qua */ }
      return moi;
    });
  };

  const thuGon = isCollapsed ? 'lg:hidden' : '';

  const mucLienKet = (item: NavItem, thut = false) => {
    const Icon = item.icon;
    const active = dangMo(pathname, item.href);
    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={onCloseMobile}
        title={item.title}
        aria-current={active ? 'page' : undefined}
        className={`group flex items-center gap-3 rounded-xl py-2 text-[14px] transition-colors
          ${isCollapsed ? 'lg:justify-center lg:px-2 px-3' : thut ? 'pl-4 pr-3' : 'px-3'}
          ${active ? 'bg-white text-indigo-800 font-semibold shadow-sm' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}
      >
        <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-violet-600' : 'text-indigo-200/80 group-hover:text-white'}`} />
        <span className={`${thuGon} truncate`}>{item.title}</span>
      </Link>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col text-white transition-[width,transform] duration-300 ease-in-out lg:translate-x-0 thanh-ben
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'lg:w-20 w-72' : 'w-72'}`}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className={`flex items-center h-20 shrink-0 gap-3 border-b border-white/10 ${isCollapsed ? 'lg:justify-center px-5 lg:px-3' : 'px-5'}`}
        >
          <span className="w-10 h-10 rounded-xl bg-white text-indigo-700 flex items-center justify-center shrink-0 shadow-md shadow-indigo-950/30">
            <GraduationCap className="w-6 h-6" />
          </span>
          <span className={thuGon}>
            <span className="block text-[17px] font-extrabold tracking-tight leading-none">ThayKhaiEdu</span>
            <span className="block text-xs text-indigo-200 mt-1">Xưởng đề kiểm tra tiểu học</span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-4" aria-label="Điều hướng chính">
          {/* Tổng quan */}
          {tongQuan.length > 0 && <div className="space-y-1">{tongQuan.map((m) => mucLienKet(m))}</div>}

          {/* Vùng 5 bước tạo đề */}
          {coDuongTaoDe && (
            <section aria-labelledby="nhan-tao-de" className={`rounded-2xl bg-white/[0.07] ring-1 ring-white/10 ${isCollapsed ? 'lg:p-1.5 p-3' : 'p-3'}`}>
              <div className={`flex items-baseline justify-between px-1 mb-2 ${thuGon}`}>
                <h2 id="nhan-tao-de" className="text-[15px] font-bold text-white">Tạo đề kiểm tra</h2>
                <span className="text-[11px] text-indigo-200">làm lần lượt</span>
              </div>
              <ol className="relative">
                {namBuoc.map((b, i) => {
                  const duocVao = buocDuocVao.has(b.id);
                  const dangLam = i === buocHienTai;
                  const daQua = buocHienTai > i;
                  const cuoi = i === namBuoc.length - 1;
                  const vong = (
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition
                        ${dangLam ? 'bg-amber-300 text-indigo-950 ring-4 ring-amber-300/25'
                          : daQua ? 'bg-white text-indigo-700'
                          : duocVao ? 'bg-indigo-950/40 text-white ring-1 ring-white/40'
                          : 'bg-indigo-950/30 text-indigo-300/70 ring-1 ring-white/15'}`}
                    >
                      {duocVao ? i + 1 : <Lock className="w-3.5 h-3.5" />}
                    </span>
                  );
                  const chu = (
                    <span className={`${thuGon} min-w-0 flex-1 truncate text-[14px] ${dangLam ? 'font-bold text-white' : duocVao ? 'text-indigo-50' : 'text-indigo-300/70'}`}>
                      {b.tenNgan ?? b.title}
                    </span>
                  );
                  return (
                    <li key={b.id} className="relative">
                      {!cuoi && (
                        <span aria-hidden className={`absolute left-[13.5px] top-8 bottom-[-4px] w-px ${daQua || dangLam ? 'bg-white/60' : 'bg-white/20'} ${isCollapsed ? 'lg:left-1/2' : ''}`} />
                      )}
                      {duocVao ? (
                        <Link
                          href={b.href}
                          onClick={onCloseMobile}
                          title={`Bước ${i + 1}: ${b.title.replace(/^\d\.\s*/, '')}`}
                          aria-current={dangLam ? 'step' : undefined}
                          className={`flex items-center gap-3 rounded-xl px-1 py-1.5 mb-1 hover:bg-white/10 ${isCollapsed ? 'lg:justify-center' : ''}`}
                        >
                          {vong}{chu}
                        </Link>
                      ) : (
                        <div
                          title={`Bước ${i + 1}: ${b.title.replace(/^\d\.\s*/, '')} – cần tổ trưởng cấp quyền "Ma trận, đặc tả"`}
                          className={`flex items-center gap-3 rounded-xl px-1 py-1.5 mb-1 cursor-not-allowed ${isCollapsed ? 'lg:justify-center' : ''}`}
                        >
                          {vong}{chu}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          {buocLe.length > 0 && <div className="space-y-1">{buocLe.map((m) => mucLienKet(m))}</div>}

          {/* Các nhóm thu gọn được */}
          {nhomKhac.map(({ nhom: n, muc }) => {
            const coTrangMo = muc.some((m) => dangMo(pathname, m.href));
            const macDinh = n.ma === 'to-truong' || n.ma === 'quan-tri' ? false : true;
            const mo = coTrangMo || (moNhom[n.ten] ?? macDinh);
            const idDs = `nhom-${n.ma}-${n.ten}`;
            return (
              <div key={n.ten}>
                <button
                  type="button"
                  onClick={() => doiNhom(n.ten, !mo)}
                  aria-expanded={mo}
                  aria-controls={idDs}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] font-semibold text-indigo-200 hover:text-white ${thuGon}`}
                >
                  <span className="flex-1">{n.ten}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${mo ? '' : '-rotate-90'}`} />
                </button>
                {isCollapsed && <div className="hidden lg:block mx-3 my-1 border-t border-white/10" />}
                <div id={idDs} className={`space-y-0.5 mt-1 ${mo ? '' : isCollapsed ? 'hidden lg:block' : 'hidden'}`}>
                  {muc.map((m) => mucLienKet(m, true))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 shrink-0 border-t border-white/10">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm text-indigo-200 hover:bg-white/10 hover:text-white"
            aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Thu gọn</>}
          </button>
          <p className={`lg:hidden text-center text-xs text-indigo-200`}>AI hỗ trợ, thầy cô quyết định</p>
        </div>
      </aside>
    </>
  );
}
