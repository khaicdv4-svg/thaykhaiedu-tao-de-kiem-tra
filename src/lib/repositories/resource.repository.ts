/**
 * ThayKhaiEdu - Resource Repository
 * Data Access Layer for Textbooks, Teacher Guides, Reading Passages, and Visual Resources.
 * Strictly uses AI_FOUND (Văn bản do AI tìm) and USER_ADDED for reading passage sources.
 * Strictly separates REAL DATA MODE and DEMO MODE.
 */

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { Resource } from '@/types/resource';
import { DEMO_RESOURCES } from '@/core/config/demo-data';

export class ResourceRepository {
  /**
   * List resources with optional scope filtering
   */
  async listResources(filter?: { scope?: string; reviewStatus?: string; grade?: number }): Promise<Resource[]> {
    if (!isSupabaseConfigured()) {
      return DEMO_RESOURCES;
    }

    const client = createClient();
    if (!client) {
      throw new Error('[CHẾ ĐỘ DỮ LIỆU THẬT] Không thể khởi tạo Supabase Client.');
    }

    let query = client.from('resources').select('*').order('created_at', { ascending: false });

    if (filter?.scope) {
      query = query.eq('scope', filter.scope);
    }
    if (filter?.reviewStatus) {
      query = query.eq('review_status', filter.reviewStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ResourceRepository] Lỗi truy vấn tài nguyên:', error.message);
      throw new Error(`[CHẾ ĐỘ DỮ LIỆU THẬT] Lỗi đọc tài nguyên: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      contentUrl: item.content_url,
      rawText: item.raw_text,
      ownerId: item.owner_id,
      ownerName: 'Giáo viên Khởi tạo',
      organizationId: item.organization_id,
      gradeIds: [4],
      subjectIds: ['sub-vietnamese'],
      scope: item.scope,
      sourceType: item.source_type, // 'OFFICIAL_CURRICULUM' | 'USER_SUBMITTED' | 'AI_FOUND' | 'IMPORTED'
      sourceReference: item.source_reference,
      sourceUrl: item.source_url,
      author: item.author,
      topic: item.topic,
      genre: item.genre,
      length: item.length,
      reviewStatus: item.review_status,
      reviewedById: item.reviewed_by_id,
      reviewedAt: item.reviewed_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }
}

export const resourceRepository = new ResourceRepository();
