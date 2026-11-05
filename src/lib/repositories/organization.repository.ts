/**
 * ThayKhaiEdu - Organization Repository
 * Data Access Layer for Organizations, Academic Years, and Professional Groups.
 * Strictly separates REAL DATA MODE and DEMO MODE.
 */

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { Organization, AcademicYear, ProfessionalGroup } from '@/types/organization';
import { DEMO_ORGANIZATION, DEMO_ACADEMIC_YEARS, DEMO_PROFESSIONAL_GROUPS } from '@/core/config/demo-data';

export class OrganizationRepository {
  /**
   * Fetch organization by ID (or default current organization)
   */
  async getOrganizationById(id: string): Promise<Organization | null> {
    if (!isSupabaseConfigured()) {
      return DEMO_ORGANIZATION;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    const { data, error } = await client
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[OrganizationRepository] Lỗi truy vấn đơn vị trường:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      province: data.province,
      district: data.district,
      address: data.address,
      logoUrl: data.logo_url,
      activeGrades: data.active_grades || [1, 2, 3, 4, 5],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Fetch active academic years
   */
  async getAcademicYears(): Promise<AcademicYear[]> {
    if (!isSupabaseConfigured()) {
      return DEMO_ACADEMIC_YEARS;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    const { data, error } = await client
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[OrganizationRepository] Lỗi truy vấn năm học:', error.message);
      throw new Error(`[CHẾ ĐỘ DỮ LIỆU THẬT] Lỗi đọc năm học: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      startDate: item.start_date,
      endDate: item.end_date,
      isCurrent: item.is_current,
    }));
  }

  /**
   * Fetch professional groups for an organization
   */
  async getProfessionalGroups(orgId: string): Promise<ProfessionalGroup[]> {
    if (!isSupabaseConfigured()) {
      return DEMO_PROFESSIONAL_GROUPS;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    const { data, error } = await client
      .from('professional_groups')
      .select('*')
      .eq('organization_id', orgId);

    if (error) {
      console.error('[OrganizationRepository] Lỗi truy vấn tổ chuyên môn:', error.message);
      throw new Error(`[CHẾ ĐỘ DỮ LIỆU THẬT] Lỗi đọc tổ chuyên môn: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      organizationId: item.organization_id,
      code: item.code,
      name: item.name,
      description: item.description,
      assignedGradeIds: item.assigned_grade_ids || [],
      assignedSubjectIds: item.assigned_subject_ids || [],
      leaderUserId: item.leader_user_id,
      deputyLeaderUserId: item.deputy_leader_user_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }
}

export const organizationRepository = new OrganizationRepository();
