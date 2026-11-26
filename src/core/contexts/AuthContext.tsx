'use client';

/**
 * ThayKhaiEdu - Auth & Profile Context
 * Manages user profile, role-based state, and active viewing perspective.
 */

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/permissions';
import { DEMO_ACTIVE_USER, DEMO_ORGANIZATION } from '@/core/config/demo-data';
import { KHOI_MAC_DINH, SU_KIEN_KHOI, TAT_CA_KHOI, chonKhoiBanDau, chuoiGhiCookie, dsKhoiCuaTruong, khoiTuChuoiCookie, laKhoiHopLe } from '@/core/khoi-lam-viec';

export interface UserProfileData {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  organizationId: string;
  organizationName: string;
  isActive: boolean;
}

interface AuthContextValue {
  profile: UserProfileData;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Khối lớp đang làm việc (chọn ở trang Tổng quan); mọi chức năng đọc, ghi theo khối này */
  khoiLamViec: number;
  /** Các khối của trường để chọn */
  dsKhoi: number[];
  doiKhoiLamViec: (khoi: number) => void;
}

const defaultProfile: UserProfileData = {
  id: DEMO_ACTIVE_USER.id,
  email: DEMO_ACTIVE_USER.email,
  fullName: DEMO_ACTIVE_USER.fullName,
  role: (DEMO_ACTIVE_USER.role as UserRole) || 'TEACHER',
  department: DEMO_ACTIVE_USER.department || 'Tổ Chuyên môn Khối 4',
  organizationId: DEMO_ORGANIZATION.id,
  organizationName: DEMO_ORGANIZATION.name,
  isActive: true,
};

const AuthContext = createContext<AuthContextValue>({
  profile: defaultProfile,
  activeRole: 'GROUP_LEADER',
  setActiveRole: () => {},
  isLoggedIn: false,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  khoiLamViec: KHOI_MAC_DINH,
  dsKhoi: [...TAT_CA_KHOI],
  doiKhoiLamViec: () => {},
});

function ghiCookieKhoi(khoi: number) {
  if (typeof document !== 'undefined') document.cookie = chuoiGhiCookie(khoi);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [profile, setProfile] = useState<UserProfileData>(defaultProfile);
  const [activeRole, setActiveRole] = useState<UserRole>('GROUP_LEADER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Bắt đầu bằng khối mặc định cho khớp bản dựng ở máy chủ; đọc cookie ngay khi trang chạy ở trình duyệt
  const [khoiLamViec, setKhoiLamViec] = useState<number>(KHOI_MAC_DINH);
  const [dsKhoi, setDsKhoi] = useState<number[]>([...TAT_CA_KHOI]);

  /** Đặt khối làm việc trên máy này; khác cookie hiện có thì nạp lại dữ liệu của trang. */
  const apDungKhoi = (khoi: number) => {
    const cu = typeof document === 'undefined' ? null : khoiTuChuoiCookie(document.cookie);
    setKhoiLamViec(khoi);
    ghiCookieKhoi(khoi);
    if (cu !== khoi) {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SU_KIEN_KHOI, { detail: khoi }));
      router.refresh();
    }
  };

  const fetchProfile = async () => {
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      // Proxy đã xác minh phiên ở máy chủ; ở trình duyệt chỉ cần đọc phiên đã lưu (không tốn lượt gọi mạng).
      // Dữ liệu vẫn được bảo vệ bằng RLS phía cơ sở dữ liệu.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setIsLoggedIn(false);
        setProfile(defaultProfile);
        setIsLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // Lấy hồ sơ kèm tên trường trong một truy vấn (trước đây là 2 truy vấn nối đuôi)
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, department, organization_id, is_active, assigned_grade_ids, organizations(name, active_grades)')
        .eq('id', user.id)
        .single();

      const orgRel = profileRow?.organizations as { name?: string; active_grades?: unknown } | { name?: string; active_grades?: unknown }[] | null | undefined;
      const org = Array.isArray(orgRel) ? orgRel[0] : orgRel;
      const orgName = org?.name || 'Trường TH Trần Văn Ơn';

      // Khối làm việc: khối lưu trong tài khoản (đồng bộ máy tính, điện thoại) → cookie trên máy → khối được phân công
      const ds = dsKhoiCuaTruong(org?.active_grades);
      setDsKhoi(ds);
      apDungKhoi(chonKhoiBanDau({
        taiKhoan: user.user_metadata?.khoi_lam_viec,
        cookie: khoiTuChuoiCookie(document.cookie),
        phanCong: profileRow?.assigned_grade_ids,
        dsKhoi: ds,
      }));

      // Vai trò hiệu lực (gộp vai trò gốc và vai trò cấp thêm, kể cả đăng ký theo Gmail) do cơ sở dữ liệu quyết định
      const { data: vaiTroHieuLuc } = await supabase.rpc('get_auth_user_role');
      const role = ((vaiTroHieuLuc as UserRole | null) || (profileRow?.role as UserRole) || 'TEACHER');
      const loadedProfile: UserProfileData = {
        id: user.id,
        email: user.email || profileRow?.email || '',
        fullName: profileRow?.full_name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Thầy Võ Việt Khái'),
        role,
        department: profileRow?.department || 'Tổ Chuyên môn Khối 4',
        organizationId: profileRow?.organization_id || DEMO_ORGANIZATION.id,
        organizationName: orgName,
        isActive: profileRow?.is_active ?? true,
      };

      setProfile(loadedProfile);
      setActiveRole(role);
    } catch {
      // Fallback cleanly on network/auth issue
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const k = khoiTuChuoiCookie(document.cookie);
    if (k !== null) setKhoiLamViec(k);
    fetchProfile();

    const supabase = createClient();
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION đã được fetchProfile() ở trên xử lý; TOKEN_REFRESHED không đổi hồ sơ.
      // Chỉ nạp lại khi thật sự đăng nhập hoặc đổi thông tin, tránh gọi trùng làm chậm trang.
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') fetchProfile();
      } else {
        setIsLoggedIn(false);
        setProfile(defaultProfile);
        setActiveRole('GROUP_LEADER');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setProfile(defaultProfile);
    startTransition(() => {
      router.push('/login');
      router.refresh();
    });
  };

  /** Người dùng chọn khối ở trang Tổng quan: áp dụng ngay và lưu vào tài khoản */
  const doiKhoiLamViec = (khoi: number) => {
    if (!laKhoiHopLe(khoi) || khoi === khoiLamViec) return;
    apDungKhoi(khoi);
    const supabase = createClient();
    if (supabase && isLoggedIn) void supabase.auth.updateUser({ data: { khoi_lam_viec: khoi } }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        activeRole,
        setActiveRole,
        isLoggedIn,
        isLoading,
        signOut: handleSignOut,
        refreshProfile: fetchProfile,
        khoiLamViec,
        dsKhoi,
        doiKhoiLamViec,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
