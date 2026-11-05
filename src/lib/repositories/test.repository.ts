/**
 * ThayKhaiEdu - Test Record Repository
 * Data Access Layer for Tests, Exam Versions, Audit Logs, and Reviews.
 * Strictly separates REAL DATA MODE and DEMO MODE.
 * When in REAL DATA MODE, never falls back to fake sample data silently.
 */

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { TestRecord } from '@/types/exam';
import { DEMO_TEST_RECORDS } from '@/core/config/demo-data';

export class TestRepository {
  /**
   * List test records with scope & organization filtering
   */
  async listTests(filter?: { organizationId?: string; grade?: number; subjectId?: string }): Promise<TestRecord[]> {
    if (!isSupabaseConfigured()) {
      return DEMO_TEST_RECORDS;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client. Vui lòng kiểm tra cấu hình.');
    }

    let query = client.from('tests').select('*').order('updated_at', { ascending: false });

    if (filter?.organizationId) {
      query = query.eq('organization_id', filter.organizationId);
    }
    if (filter?.grade) {
      query = query.eq('grade', filter.grade);
    }
    if (filter?.subjectId) {
      query = query.eq('subject_id', filter.subjectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TestRepository] Lỗi truy vấn cơ sở dữ liệu thật:', error.message);
      throw new Error(`[CHẾ ĐỘ DỮ LIỆU THẬT] Lỗi đọc đề kiểm tra: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // In REAL DATA MODE, an empty table returns an empty list, NOT fake demo records!
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      organizationId: item.organization_id,
      academicYearId: item.academic_year_id,
      academicYear: 'Năm học 2025 - 2026',
      grade: item.grade,
      subjectId: item.subject_id,
      semester: item.semester,
      assessmentPeriod: item.assessment_period,
      scope: item.scope,
      mode: item.mode,
      headerConfig: item.header_config || {},
      questions: item.questions || [],
      totalPoints: item.total_points,
      durationMinutes: item.duration_minutes,
      status: item.status,
      creatorId: item.creator_id,
      creatorName: 'Giáo viên Khởi tạo',
      crossReviewerId: item.cross_reviewer_id,
      approverId: item.approver_id,
      currentVersion: item.current_version,
      versions: [],
      auditLogs: [],
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      lockedAt: item.locked_at,
    }));
  }

  /**
   * Get single test record by ID
   */
  async getTestById(id: string): Promise<TestRecord | null> {
    if (!isSupabaseConfigured()) {
      return DEMO_TEST_RECORDS.find((t) => t.id === id) || null;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    const { data, error } = await client.from('tests').select('*').eq('id', id).single();

    if (error) {
      console.error(`[TestRepository] Không tìm thấy đề kiểm tra id=${id}:`, error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      code: data.code,
      title: data.title,
      organizationId: data.organization_id,
      academicYearId: data.academic_year_id,
      academicYear: 'Năm học 2025 - 2026',
      grade: data.grade,
      subjectId: data.subject_id,
      semester: data.semester,
      assessmentPeriod: data.assessment_period,
      scope: data.scope,
      mode: data.mode,
      headerConfig: data.header_config || {},
      questions: data.questions || [],
      totalPoints: data.total_points,
      durationMinutes: data.duration_minutes,
      status: data.status,
      creatorId: data.creator_id,
      creatorName: 'Giáo viên Khởi tạo',
      crossReviewerId: data.cross_reviewer_id,
      approverId: data.approver_id,
      currentVersion: data.current_version,
      versions: [],
      auditLogs: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lockedAt: data.locked_at,
    };
  }
}

export const testRepository = new TestRepository();
