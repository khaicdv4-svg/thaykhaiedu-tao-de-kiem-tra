-- ThayKhaiEdu - Mục lục SGK (07/11/2026): số trang đầu của từng phần trong từng bài.
-- Bảng riêng, không nằm trong ppct_tiet, để nhập lại phân phối chương trình không làm mất số trang.
-- Dữ liệu do giáo viên cung cấp (chép từ mục lục SGK bản đang dùng); ứng dụng chỉ tra cứu, không tự đoán.

CREATE TABLE IF NOT EXISTS public.sgk_muc_luc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  tap SMALLINT NOT NULL DEFAULT 1 CHECK (tap BETWEEN 1 AND 2),
  bai_so INTEGER NOT NULL CHECK (bai_so > 0),
  tuan INTEGER CHECK (tuan IS NULL OR tuan BETWEEN 1 AND 40),
  hoat_dong VARCHAR(60) NOT NULL,
  noi_dung TEXT NOT NULL DEFAULT '',
  trang INTEGER NOT NULL CHECK (trang > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sgk_muc_luc_duy_nhat UNIQUE (organization_id, khoi, ma_mon, tap, bai_so, hoat_dong, noi_dung)
);

CREATE INDEX IF NOT EXISTS sgk_muc_luc_theo_mon ON public.sgk_muc_luc (organization_id, khoi, ma_mon, bai_so);

ALTER TABLE public.sgk_muc_luc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sgk_muc_luc_select_org ON public.sgk_muc_luc;
CREATE POLICY sgk_muc_luc_select_org ON public.sgk_muc_luc
  FOR SELECT USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS sgk_muc_luc_insert_leader ON public.sgk_muc_luc;
CREATE POLICY sgk_muc_luc_insert_leader ON public.sgk_muc_luc
  FOR INSERT WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN'])
  );

DROP POLICY IF EXISTS sgk_muc_luc_delete_leader ON public.sgk_muc_luc;
CREATE POLICY sgk_muc_luc_delete_leader ON public.sgk_muc_luc
  FOR DELETE USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN'])
  );
