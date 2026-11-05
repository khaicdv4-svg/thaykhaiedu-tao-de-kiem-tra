-- ==============================================================================
-- Migration: 20261104000001_curriculum_sources_and_outcomes.sql
-- Description: Phase 2 Specialized Curriculum Sources, Documents, Outcomes,
--              Mappings, and Vietnamese Reading Passages with strict multi-tenant RLS.
-- ==============================================================================

-- 1. CURRICULUM SOURCES (Kho tài liệu và phân phối chương trình)
CREATE TABLE IF NOT EXISTS public.curriculum_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  subject_id VARCHAR(50) REFERENCES public.subjects(id),
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 5),
  book_edition VARCHAR(150) DEFAULT 'Kết nối tri thức với cuộc sống',
  academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
  publisher VARCHAR(255) DEFAULT 'NXB Giáo dục Việt Nam',
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('PPCT_HUB_JSON', 'DOCX_IMPORT', 'XLSX_IMPORT', 'MANUAL_ENTRY', 'MINISTRY_OFFICIAL')),
  external_hub_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  total_lessons INT DEFAULT 0,
  total_periods INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_curriculum_sources_hub UNIQUE (organization_id, academic_year, subject_id, grade, external_hub_id)
);

CREATE TRIGGER trg_curriculum_sources_updated_at
  BEFORE UPDATE ON public.curriculum_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. SOURCE DOCUMENTS (Tệp tài liệu đính kèm và văn bản)
CREATE TABLE IF NOT EXISTS public.source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.curriculum_sources(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('json', 'docx', 'xlsx', 'pdf_scanned', 'pdf_text', 'manual_paste')),
  file_size_bytes BIGINT,
  storage_path TEXT,
  raw_content_preview TEXT,
  is_scanned_pdf BOOLEAN DEFAULT FALSE,
  ocr_needed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. CURRICULUM OUTCOMES (Yêu cầu cần đạt chuẩn 5 mức căn cứ)
CREATE TABLE IF NOT EXISTS public.curriculum_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.curriculum_sources(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  subject_id VARCHAR(50) NOT NULL,
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 5),
  strand_name VARCHAR(255),
  group_name VARCHAR(255),
  topic_name VARCHAR(255),
  content TEXT NOT NULL,
  original_text TEXT,
  order_index INT DEFAULT 0,
  provenance_type VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED_PENDING' CHECK (
    provenance_type IN (
      'OFFICIAL_RAW',
      'MATRIX_DERIVED',
      'TEACHER_GUIDE_OBJECTIVE',
      'ALGORITHM_EXTRACTED',
      'UNVERIFIED_PENDING'
    )
  ),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  external_hub_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_curriculum_outcomes_hub UNIQUE (organization_id, source_id, external_hub_id)
);

CREATE TRIGGER trg_curriculum_outcomes_updated_at
  BEFORE UPDATE ON public.curriculum_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. CURRICULUM MAPPINGS (Liên kết YCCĐ với bài học / tiết học PPCT)
CREATE TABLE IF NOT EXISTS public.curriculum_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.curriculum_outcomes(id) ON DELETE CASCADE,
  lesson_external_id VARCHAR(100),
  lesson_title VARCHAR(255),
  period_external_id VARCHAR(100),
  period_title VARCHAR(255),
  period_number INT,
  week INT,
  semester INT,
  term INT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_curriculum_mappings UNIQUE (organization_id, outcome_id, lesson_external_id, period_external_id)
);

-- 5. READING PASSAGES (Kho ngữ liệu đọc Tiếng Việt tiểu học)
CREATE TABLE IF NOT EXISTS public.reading_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  source_reference TEXT NOT NULL,
  passage_type VARCHAR(50) NOT NULL CHECK (passage_type IN ('ORAL_READING', 'COMPREHENSION_READING', 'POETRY', 'PROSE', 'OTHER')),
  grade INT NOT NULL DEFAULT 4 CHECK (grade BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  word_count INT NOT NULL,
  target_word_count_min INT,
  target_word_count_max INT,
  tolerance_status VARCHAR(50) DEFAULT 'IN_RANGE' CHECK (tolerance_status IN ('IN_RANGE', 'WARNING_OUT_OF_RANGE', 'EXACT')),
  genre VARCHAR(100),
  theme VARCHAR(100),
  status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_reading_passages_updated_at
  BEFORE UPDATE ON public.reading_passages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_curr_src_org ON public.curriculum_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_curr_src_lookup ON public.curriculum_sources(organization_id, academic_year, subject_id, grade);
CREATE INDEX IF NOT EXISTS idx_curr_src_hub ON public.curriculum_sources(external_hub_id);

CREATE INDEX IF NOT EXISTS idx_src_docs_source ON public.source_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_src_docs_org ON public.source_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_curr_outcomes_source ON public.curriculum_outcomes(source_id);
CREATE INDEX IF NOT EXISTS idx_curr_outcomes_org ON public.curriculum_outcomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_curr_outcomes_hub ON public.curriculum_outcomes(external_hub_id);
CREATE INDEX IF NOT EXISTS idx_curr_outcomes_provenance ON public.curriculum_outcomes(provenance_type);

CREATE INDEX IF NOT EXISTS idx_curr_mappings_outcome ON public.curriculum_mappings(outcome_id);
CREATE INDEX IF NOT EXISTS idx_curr_mappings_org ON public.curriculum_mappings(organization_id);

CREATE INDEX IF NOT EXISTS idx_reading_passages_org ON public.reading_passages(organization_id);
CREATE INDEX IF NOT EXISTS idx_reading_passages_grade ON public.reading_passages(grade);
CREATE INDEX IF NOT EXISTS idx_reading_passages_type ON public.reading_passages(passage_type);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.curriculum_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;

-- curriculum_sources policies
CREATE POLICY "curr_src_select" ON public.curriculum_sources
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_src_insert" ON public.curriculum_sources
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_src_update" ON public.curriculum_sources
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_src_delete" ON public.curriculum_sources
  FOR DELETE TO authenticated
  USING (
    (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
    OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

-- source_documents policies
CREATE POLICY "src_docs_select" ON public.source_documents
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "src_docs_insert" ON public.source_documents
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "src_docs_delete" ON public.source_documents
  FOR DELETE TO authenticated
  USING (
    (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
    OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

-- curriculum_outcomes policies
CREATE POLICY "curr_outcomes_select" ON public.curriculum_outcomes
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_outcomes_insert" ON public.curriculum_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_outcomes_update" ON public.curriculum_outcomes
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_outcomes_delete" ON public.curriculum_outcomes
  FOR DELETE TO authenticated
  USING (
    (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
    OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

-- curriculum_mappings policies
CREATE POLICY "curr_mappings_select" ON public.curriculum_mappings
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_mappings_insert" ON public.curriculum_mappings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "curr_mappings_delete" ON public.curriculum_mappings
  FOR DELETE TO authenticated
  USING (
    (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
    OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

-- reading_passages policies
CREATE POLICY "reading_passages_select" ON public.reading_passages
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "reading_passages_insert" ON public.reading_passages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "reading_passages_update" ON public.reading_passages
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')
  WITH CHECK (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');

CREATE POLICY "reading_passages_delete" ON public.reading_passages
  FOR DELETE TO authenticated
  USING (
    (organization_id = public.get_auth_user_org_id() AND (
      public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
      OR (status = 'DRAFT' AND created_by = auth.uid())
    ))
    OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );
