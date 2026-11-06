-- ThayKhaiEdu - Lịch tiết PPCT theo tuần và sửa quyền liên kết YCCĐ (06/11/2026)
--
-- 1. curriculum_mappings thiếu quyền UPDATE nên nhập lại PPCT (upsert) bị chặn hết
--    (269 lần "violates row-level security policy" ngày 06/11/2026).
-- 2. Trước đây app chỉ lưu tổng số bài, số tiết; không lưu từng tiết (tuần, bài, chủ đề).
--    Ra đề cần biết học sinh đã học đến tuần nào, nên lưu lịch tiết vào bảng ppct_tiet.

DROP POLICY IF EXISTS curr_mappings_update ON public.curriculum_mappings;
CREATE POLICY curr_mappings_update ON public.curriculum_mappings
  FOR UPDATE TO authenticated
  USING ((organization_id = public.get_auth_user_org_id()) OR (public.get_auth_user_role() = 'SYSTEM_ADMIN'))
  WITH CHECK ((organization_id = public.get_auth_user_org_id()) OR (public.get_auth_user_role() = 'SYSTEM_ADMIN'));

CREATE TABLE IF NOT EXISTS public.ppct_tiet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.curriculum_sources(id) ON DELETE CASCADE,
  subject_id VARCHAR(50) NOT NULL REFERENCES public.subjects(id),
  grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 5),
  academic_year VARCHAR(20) NOT NULL,
  thu_tu INTEGER NOT NULL,
  tiet_external_id VARCHAR(200) NOT NULL,
  bai_external_id VARCHAR(200),
  chu_de TEXT,
  bai_ten TEXT,
  bai_thu_tu INTEGER,
  tiet_ten TEXT NOT NULL,
  tiet_so INTEGER,
  tiet_trong_bai INTEGER,
  tuan SMALLINT CHECK (tuan IS NULL OR tuan BETWEEN 1 AND 40),
  hoc_ki SMALLINT CHECK (hoc_ki IS NULL OR hoc_ki IN (1, 2)),
  loai_tiet VARCHAR(50),
  ghi_chu TEXT,
  yccd_external_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ppct_tiet UNIQUE (source_id, tiet_external_id)
);

CREATE INDEX IF NOT EXISTS idx_ppct_tiet_tra_cuu
  ON public.ppct_tiet (organization_id, academic_year, grade, subject_id, tuan);

ALTER TABLE public.ppct_tiet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ppct_tiet_select_org ON public.ppct_tiet;
CREATE POLICY ppct_tiet_select_org ON public.ppct_tiet
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

-- Ghi, xóa: người nhập PPCT (tổ trưởng, tổ phó, quản trị), giống hàm dam_bao_mon_hoc
DROP POLICY IF EXISTS ppct_tiet_insert_leader ON public.ppct_tiet;
CREATE POLICY ppct_tiet_insert_leader ON public.ppct_tiet
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS ppct_tiet_delete_leader ON public.ppct_tiet;
CREATE POLICY ppct_tiet_delete_leader ON public.ppct_tiet
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT, DELETE ON public.ppct_tiet TO authenticated;
REVOKE ALL ON public.ppct_tiet FROM anon;
