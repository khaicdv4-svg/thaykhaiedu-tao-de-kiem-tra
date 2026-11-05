/**
 * ThayKhaiEdu - User & Profile Repository
 * Data Access Layer for User Profiles and Authentication Sessions.
 * Strictly separates REAL DATA MODE and DEMO MODE.
 */

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { AppUser } from '@/types/organization';
import { DEMO_USERS, DEMO_ACTIVE_USER } from '@/core/config/demo-data';

export class UserRepository {
  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(): Promise<AppUser | null> {
    if (!isSupabaseConfigured()) {
      return DEMO_ACTIVE_USER;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData?.user) {
      // In REAL DATA MODE, when unauthenticated, return null rather than fake active user
      return null;
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*, organizations(name)')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.warn('[UserRepository] Không tìm thấy hồ sơ người dùng trong public.profiles:', profileError?.message);
      return null;
    }

    return {
      id: profile.id,
      organizationId: profile.organization_id,
      organizationName: profile.organizations?.name || 'Trường Tiểu học',
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      assignedGradeIds: profile.assigned_grade_ids || [1, 2, 3, 4, 5],
      assignedSubjectIds: profile.assigned_subject_ids || [],
      professionalGroupIds: [],
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  /**
   * List all users in an organization
   */
  async getUsersByOrganization(orgId: string): Promise<AppUser[]> {
    if (!isSupabaseConfigured()) {
      return DEMO_USERS;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('organization_id', orgId);

    if (error) {
      console.error('[UserRepository] Lỗi truy vấn người dùng:', error.message);
      throw new Error(`[CHẾ ĐỘ DỮ LIỆU THẬT] Lỗi đọc người dùng: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      organizationId: item.organization_id,
      fullName: item.full_name,
      email: item.email,
      role: item.role,
      department: item.department,
      assignedGradeIds: item.assigned_grade_ids || [],
      assignedSubjectIds: item.assigned_subject_ids || [],
      professionalGroupIds: [],
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }
}

export const userRepository = new UserRepository();
