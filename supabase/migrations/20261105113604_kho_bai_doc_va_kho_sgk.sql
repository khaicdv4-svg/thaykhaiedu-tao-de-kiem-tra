-- =============================================================================
-- Kho bài đọc (nhập từ file, AI tìm, hàng chờ duyệt) và Kho SGK
-- Thiết kế: docs/kho-sgk/THIET-KE-KHO-SGK-VA-KHO-BAI-DOC.md
-- Chủ dự án duyệt ngày 05/11/2026 (chỉ chạy trên project thử tao-de-thu-nghiem).
-- Chỉ thêm bảng, thêm cột; không xóa, không đổi dữ liệu cũ.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Kho bài đọc: thêm cột
-- -----------------------------------------------------------------------------
ALTER TABLE public.reading_passages
  ADD COLUMN IF NOT EXISTS reading_use VARCHAR(20)
    CHECK (reading_use IN ('DOC_THANH_TIENG', 'DOC_HIEU')),
  ADD COLUMN IF NOT EXISTS literary_form VARCHAR(30)
    CHECK (literary_form IN ('TRUYEN', 'MIEU_TA', 'THO', 'VAN_BAN_THONG_TIN', 'KICH', 'KHAC')),
  ADD COLUMN IF NOT EXISTS assessment_period VARCHAR(20)
    CHECK (assessment_period IN ('GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_check_status VARCHAR(20) DEFAULT 'CHUA_KIEM'
    CHECK (source_check_status IN ('CHUA_KIEM', 'CON_TON_TAI', 'KHONG_MO_DUOC', 'KHONG_KHOP_NOI_DUNG', 'SACH_IN')),
  ADD COLUMN IF NOT EXISTS source_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sgk_overlap_ratio NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS sgk_overlap_title TEXT,
  ADD COLUMN IF NOT EXISTS sgk_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS origin VARCHAR(20) DEFAULT 'NHAP_TAY'
    CHECK (origin IN ('NHAP_TAY', 'TAI_FILE', 'AI_TIM')),
  ADD COLUMN IF NOT EXISTS import_file_name TEXT,
  ADD COLUMN IF NOT EXISTS check_result JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_notes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_reading_passages_lookup
  ON public.reading_passages (organization_id, reading_use, assessment_period, status);

-- Chỉ tổ trưởng / quản trị được duyệt hoặc từ chối bài đọc.
CREATE OR REPLACE FUNCTION public.guard_reading_passage_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('APPROVED', 'REJECTED')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND auth.uid() IS NOT NULL
     AND public.get_auth_user_role() NOT IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN') THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng hoặc quản trị mới được duyệt bài đọc';
  END IF;
  IF NEW.status IN ('APPROVED', 'REJECTED') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reading_passages_review_guard ON public.reading_passages;
CREATE TRIGGER trg_reading_passages_review_guard
  BEFORE INSERT OR UPDATE ON public.reading_passages
  FOR EACH ROW EXECUTE FUNCTION public.guard_reading_passage_review();

-- -----------------------------------------------------------------------------
-- 2. Bài đọc đã dùng trong đề nào
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_passage_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  passage_id UUID NOT NULL REFERENCES public.reading_passages(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  assessment_period VARCHAR(20) NOT NULL,
  used_as VARCHAR(20) NOT NULL CHECK (used_as IN ('DOC_THANH_TIENG', 'DOC_HIEU')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rp_usages_passage ON public.reading_passage_usages (passage_id);

-- -----------------------------------------------------------------------------
-- 3. Kho SGK (file gốc nằm trên Google Drive, không chép lên Supabase)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sgk_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id VARCHAR(50) NOT NULL,
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 5),
  volume INT,
  edition VARCHAR(20) NOT NULL,
  book_series VARCHAR(100) NOT NULL DEFAULT 'Kết nối tri thức với cuộc sống',
  title VARCHAR(255) NOT NULL,
  drive_file_id VARCHAR(128) NOT NULL,
  drive_view_url TEXT,
  file_size_bytes BIGINT,
  page_count INT,
  printed_page_offset INT DEFAULT 0,
  has_text_layer BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'CHO_XU_LY'
    CHECK (status IN ('CHO_XU_LY', 'DA_TACH', 'DA_DUYET', 'NGUNG_DUNG')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  processing_log JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sgk_books_edition
  ON public.sgk_books (organization_id, subject_id, grade, COALESCE(volume, 0), edition);

CREATE TABLE IF NOT EXISTS public.sgk_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.sgk_books(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.sgk_sections(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('CHU_DE', 'CHU_DIEM', 'BAI', 'PHAN', 'BAI_DOC', 'ON_TAP')),
  number_label VARCHAR(20),
  title VARCHAR(500) NOT NULL,
  order_index INT NOT NULL,
  printed_page_start INT,
  printed_page_end INT,
  pdf_page_start INT,
  pdf_page_end INT,
  text_content TEXT,
  word_count INT,
  text_source VARCHAR(20) CHECK (text_source IN ('OCR_MAY', 'OCR_AI', 'GO_TAY', 'LOP_CHU_PDF')),
  text_verified BOOLEAN DEFAULT FALSE,
  literary_form VARCHAR(30),
  match_confidence VARCHAR(10) CHECK (match_confidence IN ('CHAC', 'CAN_XEM', 'CHUA_KHOP')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sgk_sections_book ON public.sgk_sections (book_id, order_index);

CREATE TABLE IF NOT EXISTS public.ppct_sgk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id VARCHAR(50) NOT NULL,
  lesson_external_id VARCHAR(255) NOT NULL,
  section_id UUID NOT NULL REFERENCES public.sgk_sections(id) ON DELETE CASCADE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES public.profiles(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (organization_id, lesson_external_id, section_id)
);

CREATE TRIGGER trg_sgk_books_updated_at BEFORE UPDATE ON public.sgk_books
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_sgk_sections_updated_at BEFORE UPDATE ON public.sgk_sections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. RLS: chỉ thấy dữ liệu của trường mình; sửa kho SGK chỉ tổ trưởng / quản trị
-- -----------------------------------------------------------------------------
ALTER TABLE public.reading_passage_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgk_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgk_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppct_sgk_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rp_usages_select" ON public.reading_passage_usages FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');
CREATE POLICY "rp_usages_insert" ON public.reading_passage_usages FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id());

CREATE POLICY "sgk_books_select" ON public.sgk_books FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');
CREATE POLICY "sgk_books_write" ON public.sgk_books FOR ALL TO authenticated
  USING (organization_id = public.get_auth_user_org_id()
         AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
  WITH CHECK (organization_id = public.get_auth_user_org_id()
         AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'));

CREATE POLICY "sgk_sections_select" ON public.sgk_sections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sgk_books b WHERE b.id = book_id
                 AND (b.organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')));
CREATE POLICY "sgk_sections_write" ON public.sgk_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sgk_books b WHERE b.id = book_id
                 AND b.organization_id = public.get_auth_user_org_id()
                 AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sgk_books b WHERE b.id = book_id
                 AND b.organization_id = public.get_auth_user_org_id()
                 AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')));

CREATE POLICY "ppct_sgk_links_select" ON public.ppct_sgk_links FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() OR public.get_auth_user_role() = 'SYSTEM_ADMIN');
CREATE POLICY "ppct_sgk_links_write" ON public.ppct_sgk_links FOR ALL TO authenticated
  USING (organization_id = public.get_auth_user_org_id()
         AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
  WITH CHECK (organization_id = public.get_auth_user_org_id()
         AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'));
