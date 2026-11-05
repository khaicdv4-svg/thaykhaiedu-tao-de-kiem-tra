-- ThayKhaiEdu - Cài đặt AI cho từng trường (05/11/2026)
-- Một dòng cho mỗi trường: khóa API (đã mã hóa ở máy chủ app), danh sách model, model dùng cho từng việc.
-- Khóa được mã hóa bằng AI_KHOA_BI_MAT (chỉ có ở máy chủ app) trước khi ghi vào đây,
-- nên dù đọc được cột key_ciphertext cũng không dùng được khóa.

CREATE TABLE IF NOT EXISTS public.ai_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_ciphertext TEXT,
  key_last4 VARCHAR(8),
  models JSONB NOT NULL DEFAULT '[]'::jsonb,
  routes JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_models_is_array CHECK (jsonb_typeof(models) = 'array'),
  CONSTRAINT ai_settings_routes_is_object CHECK (jsonb_typeof(routes) = 'object')
);

DROP TRIGGER IF EXISTS trg_ai_settings_updated_at ON public.ai_settings;
CREATE TRIGGER trg_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Mọi thành viên của trường đọc được cấu hình (máy chủ app cần đọc khi giáo viên bấm nút AI).
DROP POLICY IF EXISTS ai_settings_select_org ON public.ai_settings;
CREATE POLICY ai_settings_select_org ON public.ai_settings
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

-- Chỉ tổ trưởng / quản trị của trường được tạo, sửa, xóa.
DROP POLICY IF EXISTS ai_settings_insert_leader ON public.ai_settings;
CREATE POLICY ai_settings_insert_leader ON public.ai_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS ai_settings_update_leader ON public.ai_settings;
CREATE POLICY ai_settings_update_leader ON public.ai_settings
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS ai_settings_delete_leader ON public.ai_settings;
CREATE POLICY ai_settings_delete_leader ON public.ai_settings
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;
REVOKE ALL ON public.ai_settings FROM anon;
