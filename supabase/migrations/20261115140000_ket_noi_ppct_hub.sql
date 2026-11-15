-- ThayKhaiEdu - Nối Xưởng tạo đề với kho chung PPCT HUB (15/11/2026)
--
-- Trước đây Xưởng nhập PPCT bằng tệp JSON xuất từ app PPCT HUB (bản 06/11), nên Tiếng Việt 4
-- chỉ có 214 tiết trong khi kho chung đã công bố đủ 245 tiết. Từ nay:
--   1. v_tao_de_hub_goi: bản PPCT mới nhất đã công bố trên kho chung của từng lớp, môn, năm học.
--   2. ppct_hub_dong_bo: Xưởng đã lấy bản nào của Hub về, lúc nào, ai lấy.
--   3. tao_de_trang_thai_hub(): so bản trên Hub với bản trong Xưởng để hiện trạng thái kết nối.
--   4. tao_de_dong_bo_ppct_hub(): lấy lịch tiết từ Hub về bảng ppct_tiet của trường.
--      Giữ nguyên nguồn cũ (cùng external_hub_id) nên YCCĐ đã nhập theo môn không mất.
-- Kho chung chỉ được đọc, Xưởng không ghi gì vào các bảng ppct_sb_*.

-- 0. Loại nguồn mới
ALTER TABLE public.curriculum_sources DROP CONSTRAINT IF EXISTS curriculum_sources_source_type_check;
ALTER TABLE public.curriculum_sources ADD CONSTRAINT curriculum_sources_source_type_check
  CHECK (source_type IN ('PPCT_HUB_JSON', 'PPCT_HUB_SYNC', 'DOCX_IMPORT', 'XLSX_IMPORT', 'MANUAL_ENTRY', 'MINISTRY_OFFICIAL'));

-- 1. Bản mới nhất đã công bố (bỏ bản thử nghiệm)
CREATE OR REPLACE VIEW public.v_tao_de_hub_goi
WITH (security_invoker = true) AS
SELECT DISTINCT ON (p.school_year, p.grade_id, p.subject_id)
  p.id AS package_id,
  p.school_year AS nam_hoc,
  nullif(regexp_replace(p.grade_id, '\D', '', 'g'), '')::int AS lop,
  p.subject_id,
  coalesce(nullif(trim(split_part(p.title, ' – ', 1)), ''), p.subject_id) AS ten_mon,
  p.title,
  p.version_tag,
  p.published_at,
  (SELECT count(*) FROM public.ppct_sb_official_periods x WHERE x.package_id = p.id)::int AS so_tiet,
  (SELECT count(*) FROM public.ppct_sb_official_lessons l WHERE l.package_id = p.id)::int AS so_bai
FROM public.ppct_sb_official_packages p
WHERE p.status = 'published'
  AND NOT coalesce(p.is_test_sandbox, false)
ORDER BY p.school_year, p.grade_id, p.subject_id, p.published_at DESC NULLS LAST, p.created_at DESC;

GRANT SELECT ON public.v_tao_de_hub_goi TO authenticated;
REVOKE ALL ON public.v_tao_de_hub_goi FROM anon;

-- 2. Nhật ký đồng bộ của từng trường
CREATE TABLE IF NOT EXISTS public.ppct_hub_dong_bo (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nam_hoc VARCHAR(20) NOT NULL,
  lop SMALLINT NOT NULL CHECK (lop BETWEEN 1 AND 5),
  subject_id VARCHAR(50) NOT NULL,
  source_id UUID REFERENCES public.curriculum_sources(id) ON DELETE SET NULL,
  package_id UUID,
  version_tag VARCHAR(100),
  published_at TIMESTAMPTZ,
  so_tiet INTEGER NOT NULL DEFAULT 0,
  dong_bo_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  dong_bo_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, nam_hoc, lop, subject_id)
);

ALTER TABLE public.ppct_hub_dong_bo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ppct_hub_dong_bo_select_org ON public.ppct_hub_dong_bo;
CREATE POLICY ppct_hub_dong_bo_select_org ON public.ppct_hub_dong_bo
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT public.get_auth_user_org_id()));

-- Chỉ ghi qua hàm tao_de_dong_bo_ppct_hub
GRANT SELECT ON public.ppct_hub_dong_bo TO authenticated;
REVOKE ALL ON public.ppct_hub_dong_bo FROM anon;

-- 3. Trạng thái: so Hub với Xưởng
--    khop | co_ban_moi | lech_so_tiet | chua_dong_bo | hub_da_go
CREATE OR REPLACE FUNCTION public.tao_de_trang_thai_hub(p_nam_hoc TEXT DEFAULT '2026-2027')
RETURNS TABLE (
  lop INT,
  subject_id TEXT,
  ten_mon TEXT,
  hub_version TEXT,
  hub_published_at TIMESTAMPTZ,
  hub_so_tiet INT,
  hub_so_bai INT,
  xuong_version TEXT,
  xuong_dong_bo_luc TIMESTAMPTZ,
  xuong_so_tiet INT,
  trang_thai TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH hub AS (
    SELECT * FROM public.v_tao_de_hub_goi g WHERE g.nam_hoc = p_nam_hoc
  ),
  xuong AS (
    SELECT d.*,
      (SELECT count(*) FROM public.ppct_tiet t WHERE t.source_id = d.source_id)::int AS so_tiet_thuc
    FROM public.ppct_hub_dong_bo d
    WHERE d.nam_hoc = p_nam_hoc
      AND d.organization_id = (SELECT public.get_auth_user_org_id())
  )
  SELECT
    coalesce(h.lop, x.lop::int),
    coalesce(h.subject_id, x.subject_id)::text,
    coalesce(h.ten_mon, x.subject_id)::text,
    h.version_tag::text,
    h.published_at,
    h.so_tiet,
    h.so_bai,
    x.version_tag::text,
    x.dong_bo_luc,
    x.so_tiet_thuc,
    CASE
      WHEN h.package_id IS NULL THEN 'hub_da_go'
      WHEN x.package_id IS NULL THEN 'chua_dong_bo'
      WHEN x.package_id <> h.package_id THEN 'co_ban_moi'
      WHEN x.so_tiet_thuc <> h.so_tiet THEN 'lech_so_tiet'
      ELSE 'khop'
    END
  FROM hub h
  FULL JOIN xuong x ON x.lop = h.lop AND x.subject_id = h.subject_id
  ORDER BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION public.tao_de_trang_thai_hub(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.tao_de_trang_thai_hub(TEXT) FROM anon, public;

-- 4. Đồng bộ: lấy lịch tiết từ Hub về ppct_tiet của trường
CREATE OR REPLACE FUNCTION public.tao_de_dong_bo_ppct_hub(
  p_lop INT,
  p_mon TEXT DEFAULT NULL,
  p_nam_hoc TEXT DEFAULT '2026-2027'
)
RETURNS TABLE (subject_id TEXT, ten_mon TEXT, so_tiet INT, version_tag TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_org UUID := public.get_auth_user_org_id();
  v_uid UUID := auth.uid();
  v_goi RECORD;
  v_src UUID;
  v_hub_id TEXT;
  v_so INT;
BEGIN
  IF v_uid IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'Cần đăng nhập bằng tài khoản thuộc một trường.';
  END IF;
  IF public.get_auth_user_role() NOT IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN') THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng, tổ phó hoặc quản trị mới được đồng bộ PPCT.';
  END IF;
  IF p_lop IS NULL OR p_lop NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Lớp phải từ 1 đến 5.';
  END IF;

  FOR v_goi IN
    SELECT * FROM public.v_tao_de_hub_goi g
    WHERE g.nam_hoc = p_nam_hoc AND g.lop = p_lop
      AND (p_mon IS NULL OR g.subject_id = p_mon)
  LOOP
    -- Môn chưa có trong danh mục của Xưởng thì thêm
    INSERT INTO public.subjects (id, code, name, applicable_grades)
    VALUES (v_goi.subject_id, upper(v_goi.subject_id), left(v_goi.ten_mon || ' ' || p_lop, 100), ARRAY[p_lop])
    ON CONFLICT DO NOTHING;

    -- Dùng lại nguồn cũ của môn (cùng mã) để giữ YCCĐ đã nhập
    v_hub_id := 'hub-' || v_goi.subject_id || '-' || p_lop || '-' || p_nam_hoc;
    INSERT INTO public.curriculum_sources AS cs (
      organization_id, code, name, subject_id, grade, book_edition, academic_year, publisher,
      source_type, external_hub_id, status, total_lessons, total_periods, metadata, created_by
    ) VALUES (
      v_org,
      'SRC-' || upper(replace(v_goi.subject_id, 'subj-', '')) || '-K' || p_lop || '-' || p_nam_hoc,
      'PPCT & YCCĐ ' || v_goi.ten_mon || ' ' || p_lop || ' (Năm học ' || p_nam_hoc || ')',
      v_goi.subject_id, p_lop,
      'Kết nối tri thức với cuộc sống (Bản thống nhất 2026-2027)',
      p_nam_hoc, 'NXB Giáo dục Việt Nam',
      'PPCT_HUB_SYNC', v_hub_id, 'ACTIVE', v_goi.so_bai, v_goi.so_tiet,
      jsonb_build_object('hub_package_id', v_goi.package_id, 'hub_version_tag', v_goi.version_tag,
                         'hub_published_at', v_goi.published_at, 'dong_bo_luc', now()),
      v_uid
    )
    ON CONFLICT (organization_id, academic_year, subject_id, grade, external_hub_id) DO UPDATE SET
      name = EXCLUDED.name,
      source_type = 'PPCT_HUB_SYNC',
      status = 'ACTIVE',
      total_lessons = EXCLUDED.total_lessons,
      total_periods = EXCLUDED.total_periods,
      metadata = coalesce(cs.metadata, '{}'::jsonb) || EXCLUDED.metadata,
      updated_at = now()
    RETURNING cs.id INTO v_src;

    -- Thay lịch tiết bằng bản trên Hub
    DELETE FROM public.ppct_tiet t WHERE t.source_id = v_src;

    INSERT INTO public.ppct_tiet (
      organization_id, source_id, subject_id, grade, academic_year, thu_tu,
      tiet_external_id, bai_external_id, chu_de, bai_ten, bai_thu_tu, tiet_ten, tiet_so,
      tiet_trong_bai, tuan, hoc_ki, loai_tiet, ghi_chu, yccd_external_ids
    )
    SELECT
      v_org, v_src, v_goi.subject_id, p_lop, p_nam_hoc,
      row_number() OVER (ORDER BY x.global_period_number NULLS LAST, x.week NULLS LAST, tp.order_index, l.order_index, x.order_in_lesson)::int,
      coalesce(nullif(x.legacy_period_id, ''), x.id::text),
      coalesce(nullif(l.legacy_lesson_id, ''), l.id::text),
      tp.name, l.title, l.order_index,
      coalesce(nullif(trim(x.title), ''), l.title, 'Tiết học'),
      x.global_period_number, x.order_in_lesson,
      CASE WHEN x.week BETWEEN 1 AND 40 THEN x.week END,
      coalesce(
        CASE WHEN x.semester IN (1, 2) THEN x.semester END,
        CASE WHEN x.week BETWEEN 1 AND 18 THEN 1 WHEN x.week BETWEEN 19 AND 40 THEN 2 END
      ),
      x.period_type, x.notes,
      coalesce((SELECT array_agg(py.yccd_id::text ORDER BY py.yccd_id)
                FROM public.ppct_sb_official_period_yccd py WHERE py.period_id = x.id), '{}')
    FROM public.ppct_sb_official_periods x
    JOIN public.ppct_sb_official_lessons l ON l.id = x.lesson_id
    JOIN public.ppct_sb_official_topics tp ON tp.id = l.topic_id
    WHERE x.package_id = v_goi.package_id;

    GET DIAGNOSTICS v_so = ROW_COUNT;

    INSERT INTO public.ppct_hub_dong_bo AS d (
      organization_id, nam_hoc, lop, subject_id, source_id, package_id, version_tag,
      published_at, so_tiet, dong_bo_luc, dong_bo_boi
    ) VALUES (
      v_org, p_nam_hoc, p_lop, v_goi.subject_id, v_src, v_goi.package_id, v_goi.version_tag,
      v_goi.published_at, v_so, now(), v_uid
    )
    ON CONFLICT (organization_id, nam_hoc, lop, subject_id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      package_id = EXCLUDED.package_id,
      version_tag = EXCLUDED.version_tag,
      published_at = EXCLUDED.published_at,
      so_tiet = EXCLUDED.so_tiet,
      dong_bo_luc = EXCLUDED.dong_bo_luc,
      dong_bo_boi = EXCLUDED.dong_bo_boi;

    subject_id := v_goi.subject_id;
    ten_mon := v_goi.ten_mon;
    so_tiet := v_so;
    version_tag := v_goi.version_tag;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tao_de_dong_bo_ppct_hub(INT, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.tao_de_dong_bo_ppct_hub(INT, TEXT, TEXT) FROM anon, public;
