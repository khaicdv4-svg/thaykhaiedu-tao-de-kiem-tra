-- ThayKhaiEdu - Kho sách giáo khoa và sách giáo viên (07/11/2026).
-- Mỗi cuốn là một dòng trong `sach`; chữ của từng trang lưu ở `sach_trang` để AI tra đúng trang khi soạn và đối chiếu đề.
-- Tài liệu do giáo viên tải lên, chỉ dùng trong trường; ứng dụng không công khai nội dung sách.

CREATE TABLE IF NOT EXISTS public.sach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  loai VARCHAR(3) NOT NULL CHECK (loai IN ('SGK','SGV')),
  tap SMALLINT NOT NULL DEFAULT 1 CHECK (tap BETWEEN 1 AND 2),
  ten_file TEXT NOT NULL DEFAULT '',
  so_trang_pdf INTEGER NOT NULL DEFAULT 0 CHECK (so_trang_pdf >= 0),
  -- Trang số 1 của sách nằm ở trang thứ mấy của file PDF (trang sách = trang PDF - trang_dau_pdf + 1)
  trang_dau_pdf INTEGER NOT NULL DEFAULT 1 CHECK (trang_dau_pdf >= 1),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sach_duy_nhat UNIQUE (organization_id, khoi, ma_mon, loai, tap)
);

CREATE TABLE IF NOT EXISTS public.sach_trang (
  sach_id UUID NOT NULL REFERENCES public.sach(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trang_pdf INTEGER NOT NULL CHECK (trang_pdf > 0),
  noi_dung TEXT NOT NULL DEFAULT '',
  -- 'CHU' = chữ lấy từ PDF, 'AI_DOC' = AI đọc từ ảnh trang
  nguon VARCHAR(8) NOT NULL DEFAULT 'CHU' CHECK (nguon IN ('CHU','AI_DOC')),
  PRIMARY KEY (sach_id, trang_pdf)
);

CREATE INDEX IF NOT EXISTS sach_trang_theo_org ON public.sach_trang (organization_id, sach_id);

ALTER TABLE public.sach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sach_trang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sach_select_org ON public.sach;
CREATE POLICY sach_select_org ON public.sach FOR SELECT USING (organization_id = public.get_auth_user_org_id());
DROP POLICY IF EXISTS sach_insert_leader ON public.sach;
CREATE POLICY sach_insert_leader ON public.sach FOR INSERT WITH CHECK (
  organization_id = public.get_auth_user_org_id()
  AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN']));
DROP POLICY IF EXISTS sach_update_leader ON public.sach;
CREATE POLICY sach_update_leader ON public.sach FOR UPDATE USING (
  organization_id = public.get_auth_user_org_id()
  AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN']));
DROP POLICY IF EXISTS sach_delete_leader ON public.sach;
CREATE POLICY sach_delete_leader ON public.sach FOR DELETE USING (
  organization_id = public.get_auth_user_org_id()
  AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN']));

DROP POLICY IF EXISTS sach_trang_select_org ON public.sach_trang;
CREATE POLICY sach_trang_select_org ON public.sach_trang FOR SELECT USING (organization_id = public.get_auth_user_org_id());
DROP POLICY IF EXISTS sach_trang_insert_leader ON public.sach_trang;
CREATE POLICY sach_trang_insert_leader ON public.sach_trang FOR INSERT WITH CHECK (
  organization_id = public.get_auth_user_org_id()
  AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN']));
DROP POLICY IF EXISTS sach_trang_update_leader ON public.sach_trang;
CREATE POLICY sach_trang_update_leader ON public.sach_trang FOR UPDATE USING (
  organization_id = public.get_auth_user_org_id()
  AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN']));
DROP POLICY IF EXISTS sach_trang_delete_leader ON public.sach_trang;
CREATE POLICY sach_trang_delete_leader ON public.sach_trang FOR DELETE USING (
  organization_id = public.get_auth_user_org_id()
  AND public.get_auth_user_role()::text = ANY (ARRAY['GROUP_LEADER','DEPUTY_GROUP_LEADER','SCHOOL_ADMIN','SYSTEM_ADMIN']));
