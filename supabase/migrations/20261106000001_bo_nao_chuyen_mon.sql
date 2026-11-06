-- ThayKhaiEdu - Bộ não chuyên môn của tổ (06/11/2026)
-- Một dòng cho mỗi trường và mỗi khối: quy định lấy từ ma trận chung đã tải lên và quy định riêng của tổ.

CREATE TABLE IF NOT EXISTS public.bo_nao_chuyen_mon (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  du_lieu JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, khoi),
  CONSTRAINT bo_nao_du_lieu_is_object CHECK (jsonb_typeof(du_lieu) = 'object')
);

DROP TRIGGER IF EXISTS trg_bo_nao_updated_at ON public.bo_nao_chuyen_mon;
CREATE TRIGGER trg_bo_nao_updated_at
  BEFORE UPDATE ON public.bo_nao_chuyen_mon
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bo_nao_chuyen_mon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bo_nao_select_org ON public.bo_nao_chuyen_mon;
CREATE POLICY bo_nao_select_org ON public.bo_nao_chuyen_mon
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS bo_nao_insert_leader ON public.bo_nao_chuyen_mon;
CREATE POLICY bo_nao_insert_leader ON public.bo_nao_chuyen_mon
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS bo_nao_update_leader ON public.bo_nao_chuyen_mon;
CREATE POLICY bo_nao_update_leader ON public.bo_nao_chuyen_mon
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS bo_nao_delete_leader ON public.bo_nao_chuyen_mon;
CREATE POLICY bo_nao_delete_leader ON public.bo_nao_chuyen_mon
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bo_nao_chuyen_mon TO authenticated;
REVOKE ALL ON public.bo_nao_chuyen_mon FROM anon;
