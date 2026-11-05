-- ==============================================================================
-- THAYKHAIEDU - INITIAL POSTGRESQL SCHEMA MIGRATION
-- Migration Version: 20260928000001
-- Supported DB Engine: PostgreSQL / Supabase
-- ==============================================================================

-- Enable UUID & Crypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- REUSABLE TIMESTAMP TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATIONS (TRƯỜNG HỌC / ĐƠN VỊ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  province VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address TEXT,
  logo_url TEXT,
  active_grades INT[] DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. ACADEMIC YEARS (NĂM HỌC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- e.g. '2025-2026'
  label VARCHAR(100) NOT NULL,     -- e.g. 'Năm học 2025 - 2026'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. PROFILES / USERS (HỒ SƠ NGƯỜI DÙNG - LINKED TO auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'TEACHER' CHECK (role IN ('TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')),
  department VARCHAR(100),
  avatar_url TEXT,
  assigned_grade_ids INT[] DEFAULT '{}',
  assigned_subject_ids TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. PROFESSIONAL GROUPS (TỔ CHUYÊN MÔN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_grade_ids INT[] DEFAULT '{}',
  assigned_subject_ids TEXT[] DEFAULT '{}',
  leader_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deputy_leader_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uk_org_group_code UNIQUE (organization_id, code)
);

CREATE TRIGGER trg_professional_groups_updated_at
  BEFORE UPDATE ON public.professional_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. PROFESSIONAL GROUP MEMBERS (THÀNH VIÊN TỔ CHUYÊN MÔN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.professional_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_group VARCHAR(50) DEFAULT 'MEMBER' CHECK (role_in_group IN ('MEMBER', 'DEPUTY_LEADER', 'LEADER')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uk_group_user UNIQUE (group_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 6. SUBJECTS & GRADES LOOKUP
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id VARCHAR(50) PRIMARY KEY, -- e.g. 'sub-math'
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  applicable_grades INT[] DEFAULT '{1,2,3,4,5}',
  has_periodic_assessment BOOLEAN DEFAULT true NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS public.grades (
  id INT PRIMARY KEY CHECK (id BETWEEN 1 AND 5),
  label VARCHAR(50) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. ROLES & PERMISSIONS LOOKUP
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(100) REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ------------------------------------------------------------------------------
-- 8. TESTS / TEST RECORDS (ĐỀ KIỂM TRA)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 5),
  subject_id VARCHAR(50) NOT NULL REFERENCES public.subjects(id),
  semester VARCHAR(20) NOT NULL CHECK (semester IN ('SEMESTER_1', 'SEMESTER_2')),
  assessment_period VARCHAR(50) NOT NULL CHECK (assessment_period IN ('MID_TERM_1', 'END_TERM_1', 'MID_TERM_2', 'END_TERM_2')),
  scope VARCHAR(20) NOT NULL DEFAULT 'GROUP' CHECK (scope IN ('PRIVATE', 'GROUP', 'SCHOOL', 'SHARED_LIBRARY', 'SYSTEM')),
  mode VARCHAR(20) NOT NULL DEFAULT 'PROFESSIONAL' CHECK (mode IN ('QUICK', 'PROFESSIONAL')),
  
  total_points NUMERIC(4,2) DEFAULT 10.00 NOT NULL,
  duration_minutes INT DEFAULT 40 NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'SUBMITTED_FOR_CROSS_REVIEW', 'CROSS_REVIEWING',
    'REVISION_REQUIRED', 'REVISED', 'PENDING_APPROVAL', 'APPROVED', 'LOCKED'
  )),
  
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  cross_reviewer_id UUID REFERENCES public.profiles(id),
  approver_id UUID REFERENCES public.profiles(id),
  current_version INT DEFAULT 1 NOT NULL,
  
  header_config JSONB DEFAULT '{}'::jsonb,
  questions JSONB DEFAULT '[]'::jsonb,
  validation_summary JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  locked_at TIMESTAMPTZ
);

CREATE TRIGGER trg_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 9. TEST VERSIONS & AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  change_summary TEXT NOT NULL,
  snapshot_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uk_test_version UNIQUE (test_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ------------------------------------------------------------------------------
-- 10. CROSS REVIEWS & COMMENTS & APPROVAL RECORDS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cross_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  status VARCHAR(50) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- TRIGGER RULE: Creator CANNOT cross-review their own test
CREATE OR REPLACE FUNCTION public.validate_cross_reviewer_trigger()
RETURNS TRIGGER AS $$
DECLARE
  test_creator_id UUID;
BEGIN
  SELECT creator_id INTO test_creator_id FROM public.tests WHERE id = NEW.test_id;
  IF test_creator_id = NEW.reviewer_id THEN
    RAISE EXCEPTION 'Người tạo đề không được tự kiểm tra chéo đề kiểm tra của chính mình.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_cross_reviewer
  BEFORE INSERT OR UPDATE ON public.cross_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_cross_reviewer_trigger();

CREATE TABLE IF NOT EXISTS public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cross_review_id UUID NOT NULL REFERENCES public.cross_reviews(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  question_id VARCHAR(100), -- Nullable: null means test-level comment, non-null means question-level comment
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.profiles(id),
  decision VARCHAR(50) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISION_REQUESTED')),
  comment TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 11. RESOURCES & READING PASSAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('TEXTBOOK', 'TEACHER_GUIDE', 'READING_PASSAGE', 'VISUAL_ASSET', 'REFERENCE_MATRIX', 'TEMPLATE_DOC', 'OTHER_SOURCE')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_url TEXT,
  raw_text TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  scope VARCHAR(20) DEFAULT 'GROUP' CHECK (scope IN ('PRIVATE', 'GROUP', 'SCHOOL', 'SHARED_LIBRARY', 'SYSTEM')),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('OFFICIAL_CURRICULUM', 'USER_SUBMITTED', 'AI_FOUND', 'IMPORTED')),
  passage_source_category VARCHAR(50) CHECK (passage_source_category IN ('USER_ADDED', 'AI_FOUND')), -- Strictly USER_ADDED or AI_FOUND for reading passages
  source_reference TEXT,
  source_url TEXT,
  author VARCHAR(255),
  topic VARCHAR(255),
  genre VARCHAR(100),
  length INT,
  content_hash VARCHAR(128),
  review_status VARCHAR(50) DEFAULT 'PENDING_REVIEW' CHECK (review_status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  reviewed_by_id UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.resource_grade_links (
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 5),
  PRIMARY KEY (resource_id, grade)
);

CREATE TABLE IF NOT EXISTS public.resource_subject_links (
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  subject_id VARCHAR(50) NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, subject_id)
);

-- ------------------------------------------------------------------------------
-- 12. EXAM TEMPLATES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 5),
  subject_id VARCHAR(50) NOT NULL REFERENCES public.subjects(id),
  assessment_period VARCHAR(50) NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('PERSONAL_TEMPLATE', 'ORGANIZATION_TEMPLATE', 'SYSTEM_TEMPLATE')),
  scope VARCHAR(20) DEFAULT 'SCHOOL' CHECK (scope IN ('PRIVATE', 'GROUP', 'SCHOOL', 'SHARED_LIBRARY', 'SYSTEM')),
  version INT DEFAULT 1 NOT NULL,
  validation_status VARCHAR(50) DEFAULT 'DRAFT' CHECK (validation_status IN ('DRAFT', 'VALIDATED', 'DEPRECATED')),
  header_layout JSONB DEFAULT '{}'::jsonb,
  paper_size VARCHAR(20) DEFAULT 'A4',
  font_family VARCHAR(50) DEFAULT 'Times New Roman',
  font_size_points INT DEFAULT 12,
  page_margin_mm JSONB DEFAULT '{"top":20,"bottom":20,"left":25,"right":20}'::jsonb,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_exam_templates_updated_at
  BEFORE UPDATE ON public.exam_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tests_org_grade_subject ON public.tests(organization_id, grade, subject_id);
CREATE INDEX IF NOT EXISTS idx_tests_status_creator ON public.tests(status, creator_id);
CREATE INDEX IF NOT EXISTS idx_resources_scope_status ON public.resources(scope, review_status);
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON public.profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
