/**
 * ThayKhaiEdu - Curriculum Source & Outcomes Repository
 * Master Project Specification V1.0 (Section 3, 11.2, 15)
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { TietPpct } from '@/core/curriculum/ppct-hub-adapter';
import {
  CurriculumSource,
  CurriculumOutcome,
  CurriculumMapping,
  ProvenanceType,
} from '@/types/curriculum-source';

export interface IngestSubjectParams {
  source: {
    code: string;
    name: string;
    subjectId: string;
    grade: number;
    bookEdition: string;
    academicYear: string;
    publisher: string;
    sourceType: string;
    externalHubId: string;
    totalLessons: number;
    totalPeriods: number;
    status: 'ACTIVE';
    metadata?: Record<string, unknown>;
  };
  outcomes: Array<{
    code: string;
    subjectId: string;
    grade: number;
    strandName?: string;
    groupName?: string;
    topicName?: string;
    content: string;
    originalText?: string;
    orderIndex: number;
    provenanceType: ProvenanceType;
    isVerified: boolean;
    externalHubId: string;
    notes?: string;
  }>;
  mappings: Array<{
    outcomeExternalHubId: string;
    lessonExternalId?: string;
    lessonTitle?: string;
    periodExternalId?: string;
    periodTitle?: string;
    periodNumber?: number;
    week?: number;
    semester?: number;
  }>;
  periods?: TietPpct[];
}

export class CurriculumSourceRepository {
  /**
   * Lấy danh sách các nguồn chương trình
   */
  async listSources(grade = 4, academicYear = '2026-2027'): Promise<CurriculumSource[]> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('curriculum_sources')
      .select('*')
      .eq('grade', grade)
      .eq('academic_year', academicYear)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching curriculum_sources:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      code: row.code,
      name: row.name,
      subjectId: row.subject_id,
      grade: row.grade,
      bookEdition: row.book_edition,
      academicYear: row.academic_year,
      publisher: row.publisher,
      sourceType: row.source_type,
      externalHubId: row.external_hub_id,
      status: row.status,
      totalLessons: row.total_lessons,
      totalPeriods: row.total_periods,
      metadata: row.metadata,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Lấy danh sách YCCĐ theo nguồn
   */
  async getOutcomesBySourceId(sourceId: string): Promise<CurriculumOutcome[]> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('curriculum_outcomes')
      .select('*')
      .eq('source_id', sourceId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching curriculum_outcomes:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      organizationId: row.organization_id,
      code: row.code,
      subjectId: row.subject_id,
      grade: row.grade,
      strandName: row.strand_name,
      groupName: row.group_name,
      topicName: row.topic_name,
      content: row.content,
      originalText: row.original_text,
      orderIndex: row.order_index,
      provenanceType: row.provenance_type as ProvenanceType,
      isVerified: row.is_verified,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at,
      externalHubId: row.external_hub_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Lưu nguồn môn học, danh sách YCCĐ và Mappings vào DB
   */
  async ingestSubjectSource(params: IngestSubjectParams): Promise<{ sourceId: string; outcomesSaved: number; mappingsSaved: number; periodsSaved: number; canhBao: string[] }> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error('Chưa cấu hình Supabase.');

    // Lấy thông tin người dùng hiện tại và tổ chức
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Phiên đăng nhập đã hết. Thầy cô đăng nhập lại rồi lưu.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Tài khoản chưa được gắn với trường nào.');
    }

    const orgId = profile.organization_id;

    // 0. Môn trong PPCT HUB (vd. 'subj-toan4') có thể chưa có trong danh mục môn: thêm vào trước,
    //    nếu không khóa ngoại chặn và lưu thất bại (lỗi 06/11/2026).
    const { error: monErr } = await supabase.rpc('dam_bao_mon_hoc', { p_id: params.source.subjectId, p_ten: params.source.name });
    if (monErr) {
      throw new Error(`Môn "${params.source.name}" (${params.source.subjectId}) chưa có trong danh mục môn và không thêm được: ${monErr.message}`);
    }

    // 1. Lưu hoặc cập nhật curriculum_sources
    const { data: sourceRow, error: srcErr } = await supabase
      .from('curriculum_sources')
      .upsert(
        {
          organization_id: orgId,
          code: params.source.code,
          name: params.source.name,
          subject_id: params.source.subjectId,
          grade: params.source.grade,
          book_edition: params.source.bookEdition,
          academic_year: params.source.academicYear,
          publisher: params.source.publisher,
          source_type: params.source.sourceType,
          external_hub_id: params.source.externalHubId,
          total_lessons: params.source.totalLessons,
          total_periods: params.source.totalPeriods,
          status: 'ACTIVE',
          metadata: params.source.metadata || {},
          created_by: user.id,
        },
        {
          onConflict: 'organization_id,academic_year,subject_id,grade,external_hub_id',
        }
      )
      .select('id')
      .single();

    if (srcErr || !sourceRow) {
      throw new Error(`Không lưu được PPCT môn "${params.source.name}": ${srcErr?.message ?? 'lỗi không rõ'}`);
    }

    const sourceId = sourceRow.id;

    const canhBao: string[] = [];
    let loiYccd = '';

    // 2. Lưu danh sách YCCĐ
    let outcomesSaved = 0;
    const outcomeExternalIdToUuidMap = new Map<string, string>();

    for (const o of params.outcomes) {
      const { data: outcomeRow, error: outErr } = await supabase
        .from('curriculum_outcomes')
        .upsert(
          {
            source_id: sourceId,
            organization_id: orgId,
            code: o.code,
            subject_id: o.subjectId,
            grade: o.grade,
            strand_name: o.strandName,
            group_name: o.groupName,
            topic_name: o.topicName,
            content: o.content,
            original_text: o.originalText,
            order_index: o.orderIndex,
            provenance_type: o.provenanceType,
            is_verified: o.isVerified,
            verified_by: o.isVerified ? user.id : null,
            verified_at: o.isVerified ? new Date().toISOString() : null,
            external_hub_id: o.externalHubId,
            notes: o.notes,
          },
          {
            onConflict: 'organization_id,source_id,external_hub_id',
          }
        )
        .select('id')
        .single();

      if (!outErr && outcomeRow) {
        outcomesSaved++;
        outcomeExternalIdToUuidMap.set(o.externalHubId, outcomeRow.id);
      } else if (outErr) {
        loiYccd = outErr.message;
      }
    }
    if (outcomesSaved < params.outcomes.length) {
      canhBao.push(`${params.source.name}: lưu được ${outcomesSaved}/${params.outcomes.length} YCCĐ${loiYccd ? ` (${loiYccd})` : ''}.`);
    }

    // 3. Lưu Mappings
    let mappingsSaved = 0;
    let loiLienKet = '';
    for (const m of params.mappings) {
      const outcomeUuid = outcomeExternalIdToUuidMap.get(m.outcomeExternalHubId);
      if (outcomeUuid) {
        const { error: mapErr } = await supabase
          .from('curriculum_mappings')
          .upsert(
            {
              organization_id: orgId,
              outcome_id: outcomeUuid,
              lesson_external_id: m.lessonExternalId,
              lesson_title: m.lessonTitle,
              period_external_id: m.periodExternalId,
              period_title: m.periodTitle,
              period_number: m.periodNumber,
              week: m.week,
              semester: m.semester,
            },
            {
              onConflict: 'organization_id,outcome_id,lesson_external_id,period_external_id',
            }
          );

        if (!mapErr) {
          mappingsSaved++;
        } else {
          loiLienKet = mapErr.message;
        }
      }
    }
    if (loiLienKet) {
      canhBao.push(`${params.source.name}: có liên kết YCCĐ – tiết chưa lưu được (${loiLienKet}).`);
    }

    // 4. Lịch tiết theo tuần: thay toàn bộ lịch cũ của nguồn này bằng lịch trong file
    let periodsSaved = 0;
    const lich = params.periods ?? [];
    const { error: xoaErr } = await supabase.from('ppct_tiet').delete().eq('source_id', sourceId);
    if (xoaErr) {
      canhBao.push(`${params.source.name}: không thay được lịch tiết cũ (${xoaErr.message}).`);
    } else {
      for (let i = 0; i < lich.length; i += 500) {
        const dot = lich.slice(i, i + 500).map((t, j) => ({
          organization_id: orgId,
          source_id: sourceId,
          subject_id: params.source.subjectId,
          grade: params.source.grade,
          academic_year: params.source.academicYear,
          thu_tu: i + j + 1,
          tiet_external_id: t.periodExternalId,
          bai_external_id: t.lessonExternalId,
          chu_de: t.topicName,
          bai_ten: t.lessonTitle,
          bai_thu_tu: t.lessonOrder,
          tiet_ten: t.periodTitle,
          tiet_so: t.periodNumber,
          tiet_trong_bai: t.orderInLesson,
          tuan: t.week,
          hoc_ki: t.semester,
          loai_tiet: t.periodType,
          ghi_chu: t.notes,
          yccd_external_ids: t.yccdExternalIds,
        }));
        const { error: tietErr } = await supabase.from('ppct_tiet').insert(dot);
        if (tietErr) {
          canhBao.push(`${params.source.name}: lịch tiết chưa lưu đủ (${tietErr.message}).`);
          break;
        }
        periodsSaved += dot.length;
      }
    }

    return {
      sourceId,
      outcomesSaved,
      mappingsSaved,
      periodsSaved,
      canhBao,
    };
  }

  /** Lịch tiết của một môn (từng tiết theo tuần) và YCCĐ của môn đó, để xem lại dữ liệu đã nhập. */
  async layPpctDaNhap(sourceId: string): Promise<{
    tiet: { thuTu: number; tuan: number | null; hocKi: number | null; chuDe: string | null; baiTen: string | null; tietTen: string; tietSo: number | null; ghiChu: string | null; yccd: string[] }[];
    yccd: { ma: string; maHienThi: string | null; noiDung: string; mach: string | null }[];
  }> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error('Chưa cấu hình Supabase.');
    // Lịch tiết đọc từ kho chung (bản đã công bố của môn), không đọc bảng nháp ppct_tiet nữa.
    const { data: nguon, error: nguonErr } = await supabase
      .from('curriculum_sources')
      .select('subject_id, grade, academic_year')
      .eq('id', sourceId)
      .maybeSingle();
    if (nguonErr) throw new Error(`Không đọc được nguồn: ${nguonErr.message}`);
    if (!nguon) throw new Error('Không tìm thấy nguồn chương trình.');
    const [t, o] = await Promise.all([
      supabase
        .from('ppct_kho_chung_tiet')
        .select('tiet_ppct, tuan, hoc_ki, chu_de, bai, ten_tiet')
        .eq('grade_id', `grade-${nguon.grade}`)
        .eq('subject_id', nguon.subject_id)
        .eq('school_year', nguon.academic_year)
        .order('tiet_ppct')
        .limit(2000),
      supabase
        .from('curriculum_outcomes')
        .select('external_hub_id, code, content, strand_name, order_index')
        .eq('source_id', sourceId)
        .order('order_index')
        .limit(2000),
    ]);
    if (t.error) throw new Error(`Không đọc được lịch tiết: ${t.error.message}`);
    if (o.error) throw new Error(`Không đọc được YCCĐ: ${o.error.message}`);
    return {
      // Kho chung không có ghi chú và liên kết YCCĐ theo tiết, nên hai trường này để trống.
      tiet: (t.data ?? []).map((r) => ({
        thuTu: r.tiet_ppct,
        tuan: r.tuan,
        hocKi: r.hoc_ki,
        chuDe: r.chu_de,
        baiTen: r.bai,
        tietTen: r.ten_tiet,
        tietSo: r.tiet_ppct,
        ghiChu: null,
        yccd: [],
      })),
      yccd: (o.data ?? []).map((r) => ({ ma: r.external_hub_id, maHienThi: r.code, noiDung: r.content, mach: r.strand_name })),
    };
  }

  /**
   * Xóa một nguồn chương trình
   */
  async deleteSource(sourceId: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('curriculum_sources')
      .delete()
      .eq('id', sourceId);

    return !error;
  }
}
