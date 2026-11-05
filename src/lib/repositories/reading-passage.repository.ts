/**
 * ThayKhaiEdu - Reading Passages Repository
 * Master Project Specification V1.0 (Section 3.1, 11.2, 15)
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ReadingPassage,
  ReadingPassageType,
  PassageReviewStatus,
  ToleranceStatus,
} from '@/types/reading-passage';
import { analyzeReadingPassageLength } from '@/core/utils/vietnamese-word-counter';

export interface CreateReadingPassageInput {
  title: string;
  author: string;
  sourceReference: string;
  passageType: ReadingPassageType;
  grade?: number;
  content: string;
  targetWordCountMin?: number;
  targetWordCountMax?: number;
  genre?: string;
  theme?: string;
  status?: PassageReviewStatus;
}

export class ReadingPassageRepository {
  /**
   * Lấy danh sách ngữ liệu đọc
   */
  async listPassages(params?: {
    grade?: number;
    passageType?: ReadingPassageType;
    status?: PassageReviewStatus;
    search?: string;
  }): Promise<ReadingPassage[]> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('reading_passages')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.grade) {
      query = query.eq('grade', params.grade);
    }
    if (params?.passageType) {
      query = query.eq('passage_type', params.passageType);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,author.ilike.%${params.search}%,theme.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching reading_passages:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      author: row.author,
      sourceReference: row.source_reference,
      passageType: row.passage_type as ReadingPassageType,
      grade: row.grade,
      content: row.content,
      wordCount: row.word_count,
      targetWordCountMin: row.target_word_count_min,
      targetWordCountMax: row.target_word_count_max,
      toleranceStatus: row.tolerance_status as ToleranceStatus,
      genre: row.genre,
      theme: row.theme,
      status: row.status as PassageReviewStatus,
      assessmentPeriod: row.assessment_period,
      readingUse: row.reading_use,
      literaryForm: row.literary_form,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Thêm mới ngữ liệu đọc
   */
  async createPassage(input: CreateReadingPassageInput): Promise<ReadingPassage> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    if (!input.title?.trim()) throw new Error('Tiêu đề ngữ liệu là bắt buộc');
    if (!input.author?.trim()) throw new Error('Tác giả ngữ liệu là bắt buộc');
    if (!input.sourceReference?.trim()) throw new Error('Nguồn trích dẫn là bắt buộc');
    if (!input.content?.trim()) throw new Error('Nội dung ngữ liệu là bắt buộc');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization ID not found');
    }

    // Tự động phân tích số từ tiếng Việt và dung sai
    const analysis = analyzeReadingPassageLength(
      input.content,
      input.passageType,
      input.targetWordCountMin,
      input.targetWordCountMax
    );

    const { data, error } = await supabase
      .from('reading_passages')
      .insert({
        organization_id: profile.organization_id,
        title: input.title.trim(),
        author: input.author.trim(),
        source_reference: input.sourceReference.trim(),
        passage_type: input.passageType,
        grade: input.grade || 4,
        content: input.content.trim(),
        word_count: analysis.wordCount,
        target_word_count_min: analysis.targetMin,
        target_word_count_max: analysis.targetMax,
        tolerance_status: analysis.toleranceStatus,
        genre: input.genre?.trim() || null,
        theme: input.theme?.trim() || null,
        status: input.status || 'DRAFT',
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create reading passage: ${error?.message}`);
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      title: data.title,
      author: data.author,
      sourceReference: data.source_reference,
      passageType: data.passage_type,
      grade: data.grade,
      content: data.content,
      wordCount: data.word_count,
      targetWordCountMin: data.target_word_count_min,
      targetWordCountMax: data.target_word_count_max,
      toleranceStatus: data.tolerance_status,
      genre: data.genre,
      theme: data.theme,
      status: data.status,
      assessmentPeriod: data.assessment_period,
      readingUse: data.reading_use,
      literaryForm: data.literary_form,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Xóa ngữ liệu đọc
   */
  async deletePassage(id: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('reading_passages')
      .delete()
      .eq('id', id);

    return !error;
  }
}
