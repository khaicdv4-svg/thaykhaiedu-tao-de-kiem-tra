/**
 * ThayKhaiEdu - Template Repository
 * Data Access Layer for Exam Templates (PERSONAL, ORGANIZATION, SYSTEM templates).
 * Strictly separates REAL DATA MODE and DEMO MODE.
 */

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { ExamTemplate } from '@/types/template';
import { DEMO_TEMPLATES } from '@/core/config/demo-data';

export class TemplateRepository {
  /**
   * List templates with templateType filtering
   */
  async listTemplates(filter?: { templateType?: string; organizationId?: string }): Promise<ExamTemplate[]> {
    if (!isSupabaseConfigured()) {
      return DEMO_TEMPLATES;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    let query = client.from('exam_templates').select('*').order('updated_at', { ascending: false });

    if (filter?.templateType) {
      query = query.eq('template_type', filter.templateType);
    }
    if (filter?.organizationId) {
      query = query.eq('organization_id', filter.organizationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TemplateRepository] Lỗi truy vấn mẫu đề:', error.message);
      throw new Error(`[CHẾ ĐỘ DỮ LIỆU THẬT] Lỗi đọc mẫu đề: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      ownerId: item.owner_id,
      ownerName: 'Quản trị Mẫu đề',
      organizationId: item.organization_id,
      grade: item.grade,
      subjectId: item.subject_id,
      assessmentPeriod: item.assessment_period,
      templateType: item.template_type,
      scope: item.scope,
      version: item.version,
      validationStatus: item.validation_status,
      isDefaultGroup4Template: item.is_default_group4_template ?? false,
      layoutDensity: item.layout_density ?? 'COMPACT',
      hasScoreColumnOnLeft: item.has_score_column_on_left ?? true,
      hasDottedWritingLines: item.has_dotted_writing_lines ?? true,
      isMonochromeOnly: item.is_monochrome_only ?? true,
      headerLayout: item.header_layout || {
        headerLeftSchool: 'TRƯỜNG TIỂU HỌC',
        headerLeftStudentName: 'Họ và tên học sinh:',
        headerLeftGrade: 'Lớp: 4',
        headerLeftExamDate: 'Ngày kiểm tra:',
        headerRightExamTitle: 'BÀI KIỂM TRA ĐỊNH KỲ',
        headerRightInvigilator1: 'Giám thị 1:',
        headerRightInvigilator2: 'Giám thị 2:',
        headerRightStudentOrder: 'STT:',
        includeScoreSummaryTable: true,
        includeStudentSectionDivider: true,
      },
      paperSize: item.paper_size || 'A4',
      fontFamily: item.font_family || 'Times New Roman',
      fontSizePoints: item.font_size_points || 13,
      lineSpacing: item.line_spacing ?? 1.3,
      pageMarginMm: item.page_margin_mm || { top: 20, bottom: 20, left: 25, right: 20 },
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }
}

export const templateRepository = new TemplateRepository();
