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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [profile, setProfile] = useState<UserProfileData>(defaultProfile);
  const [activeRole, setActiveRole] = useState<UserRole>('GROUP_LEADER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        .select('id, full_name, email, role, department, organization_id, is_active, organizations(name)')
        .eq('id', user.id)
        .single();

      const orgRel = profileRow?.organizations as { name?: string } | { name?: string }[] | null | undefined;
      const orgName = (Array.isArray(orgRel) ? orgRel[0]?.name : orgRel?.name) || 'Trường TH Trần Văn Ơn';

      const role = (profileRow?.role as UserRole) || 'TEACHER';
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
