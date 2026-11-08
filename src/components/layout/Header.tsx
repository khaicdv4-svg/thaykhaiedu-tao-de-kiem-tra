'use client';

/**
 * ThayKhaiEdu - Thanh trên cùng: tên xưởng, ô tìm nhanh trang, chế độ dữ liệu, thông báo, tài khoản.
 * Ô tìm kiếm chỉ tìm các mục trong menu (đúng với những gì app đang có), Ctrl + K để mở nhanh.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Database, LogOut, Menu, Search, X } from 'lucide-react';
import { getAppDataMode } from '@/lib/supabase/config';
import { useAuth } from '@/core/contexts/AuthContext';
import { getNavigationForRole } from '@/core/constants/navigation';
import { chuanHoa } from '@/core/kho-ma-tran/phan-loai';
import { UserRole } from '@/types/permissions';

interface HeaderProps {
  onToggleMobileNav?: () => void;
  isMobileOpen?: boolean;
}

const ROLE_TITLE_MAP: Record<UserRole, string> = {
  TEACHER: 'Giáo viên',
  GROUP_LEADER: 'Tổ trưởng',
  DEPUTY_GROUP_LEADER: 'Tổ phó',
  SCHOOL_ADMIN: 'Ban giám hiệu',
  SCHOOL_LEADERSHIP: 'Ban giám hiệu',
  SYSTEM_ADMIN: 'Quản trị',
};

export function Header({ onToggleMobileNav, isMobileOpen }: HeaderProps) {
  const router = useRouter();
  const dataMode = getAppDataMode();
  const { profile, activeRole, signOut } = useAuth();
  const [tuKhoa, setTuKhoa] = useState('');
  const [moGoiY, setMoGoiY] = useState(false);
  const oTim = useRef<HTMLInputElement>(null);

  // Thông báo trong trường (ví dụ: ma trận của tổ được cập nhật)
  interface TB { id: string; tieuDe: string; noiDung: string; lienKet: string | null; luc: string; daDoc: boolean }
  const [thongBao, setThongBao] = useState<TB[]>([]);
  const [moChuong, setMoChuong] = useState(false);
  const chua = thongBao.filter((t) => !t.daDoc).length;

  useEffect(() => {
    let huy = false;
    const nap = () => fetch('/api/thong-bao').then((r) => r.json()).then((r) => { if (!huy && r.thongBao) setThongBao(r.thongBao); }).catch(() => undefined);
    nap();
    const t = setInterval(nap, 120_000);
    return () => { huy = true; clearInterval(t); };
  }, []);

  const docHet = () => {
    const ids = thongBao.filter((t) => !t.daDoc).map((t) => t.id);
    if (ids.length === 0) return;
    setThongBao((ds) => ds.map((t) => ({ ...t, daDoc: true })));
    fetch('/api/thong-bao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).catch(() => undefined);
  };

  const roleTitle = ROLE_TITLE_MAP[activeRole] || 'Giáo viên';
  const tenNgan = profile.fullName?.trim().split(/\s+/).slice(-1)[0] ?? '';
  const initials = tenNgan ? tenNgan.slice(0, 2).toUpperCase() : 'TK';

  const goiY = useMemo(() => {
    const k = chuanHoa(tuKhoa);
    if (!k) return [];
    return getNavigationForRole(activeRole)
      .filter((m) => chuanHoa(`${m.title} ${m.description}`).includes(k))
      .slice(0, 6);
  }, [tuKhoa, activeRole]);

  // Ctrl + K (hoặc ⌘K) để mở ô tìm
  useEffect(() => {
    const nghe = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        oTim.current?.focus();
      }
    };
    window.addEventListener('keydown', nghe);
    return () => window.removeEventListener('keydown', nghe);
  }, []);

  const den = (href: string) => {
    setTuKhoa('');
    setMoGoiY(false);
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
      <div className="px-4 lg:px-8 h-20 flex items-center gap-4">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Mở menu"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Tên xưởng */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-violet-600 via-indigo-600 to-blue-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            AI
          </div>
          <div className="min-w-0 sm:hidden leading-tight">
            <div className="text-sm font-extrabold text-slate-900">Xưởng đề AI</div>
            <div className="text-xs font-bold chu-tke">ThayKhaiEdu</div>
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="text-lg xl:text-xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
              Xưởng sản xuất đề kiểm tra AI
            </div>
            <div className="text-sm font-bold chu-tke leading-tight">ThayKhaiEdu</div>
          </div>
        </div>

        {/* Tìm nhanh trang */}
        <div className="relative flex-1 max-w-md ml-auto hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={oTim}
            value={tuKhoa}
            onChange={(e) => { setTuKhoa(e.target.value); setMoGoiY(true); }}
            onFocus={() => setMoGoiY(true)}
            onBlur={() => setTimeout(() => setMoGoiY(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter' && goiY[0]) den(goiY[0].href); if (e.key === 'Escape') setMoGoiY(false); }}
            placeholder="Tìm trang: ma trận, kho đề, bài đọc…"
            aria-label="Tìm trang trong ứng dụng"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-16 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Ctrl + K</kbd>
          {moGoiY && tuKhoa && (
            <div className="absolute left-0 right-0 top-full mt-2 the-tke p-1.5 z-40">
              {goiY.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">Không có trang nào khớp.</div>
              ) : (
                goiY.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id} type="button" onMouseDown={() => den(m.href)} className="w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-indigo-50">
                      <Icon className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{m.title}</span>
                        <span className="block text-xs text-slate-500 line-clamp-1">{m.description}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto md:ml-0">
          {/* Chế độ dữ liệu */}
          <span
            className={`hidden xl:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
              dataMode === 'REAL_DATA' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {dataMode === 'REAL_DATA' ? 'Dữ liệu thật' : 'Dữ liệu mẫu'}
          </span>

          <div className="relative">
            <button
              type="button"
              className="relative p-2.5 rounded-xl text-slate-500 hover:text-indigo-700 hover:bg-indigo-50"
              title="Thông báo"
              aria-label={chua ? `Thông báo, ${chua} chưa đọc` : 'Thông báo'}
              onClick={() => setMoChuong((v) => !v)}
            >
              <Bell className="w-5 h-5" />
              {chua > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">{chua > 9 ? '9+' : chua}</span>
              )}
            </button>
            {moChuong && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-900">Thông báo</span>
                  <button type="button" className="text-xs font-medium text-indigo-700 hover:underline disabled:text-slate-400" disabled={chua === 0} onClick={docHet}>Đánh dấu đã đọc hết</button>
                </div>
                {thongBao.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">Chưa có thông báo nào.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {thongBao.map((t) => (
                      <li key={t.id} className={`px-4 py-3 ${t.daDoc ? '' : 'bg-indigo-50/50'}`}>
                        <div className="text-sm font-semibold text-slate-900">{t.tieuDe}</div>
                        <div className="text-[11px] text-slate-500 mb-1">{new Date(t.luc).toLocaleString('vi-VN')}</div>
                        <p className="text-xs text-slate-700 whitespace-pre-line">{t.noiDung}</p>
                        {t.lienKet && (
                          <Link href={t.lienKet} className="inline-block mt-1.5 text-xs font-medium text-indigo-700 hover:underline" onClick={() => { setMoChuong(false); docHet(); }}>Xem ma trận</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Tài khoản */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-100 to-blue-100 text-indigo-700 ring-2 ring-white shadow flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-bold text-slate-900">{profile.fullName}</div>
              <span className="inline-block mt-0.5 rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{roleTitle}</span>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
