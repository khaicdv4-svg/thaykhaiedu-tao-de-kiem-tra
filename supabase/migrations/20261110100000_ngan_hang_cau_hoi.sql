-- ThayKhaiEdu - Ngân hàng câu hỏi (10/11/2026)
-- Giáo viên lưu câu đã soạn vào ngân hàng của trường để dùng lại khi làm đề.
-- Mọi tài khoản trong trường xem và lưu được; chỉ tổ trưởng, tổ phó, quản trị đánh dấu "đã kiểm định";
-- xóa: người lưu hoặc tổ trưởng, tổ phó, quản trị.

CREATE TABLE IF NOT EXISTS public.ngan_hang_cau_hoi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  muc SMALLINT NOT NULL CHECK (muc BETWEEN 1 AND 3),
  hinh_thuc VARCHAR(10) NOT NULL CHECK (hinh_thuc IN ('TN', 'TL')),
  dang VARCHAR(10),
  yccd TEXT NOT NULL DEFAULT '',
  chu_de VARCHAR(200) NOT NULL DEFAULT '',
  diem_goi_y NUMERIC(4,2),
  noi_dung JSONB NOT NULL,
  khoa_trung VARCHAR(64) NOT NULL,
  da_kiem_dinh BOOLEAN NOT NULL DEFAULT false,
  tao_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ngan_hang_noi_dung_la_object CHECK (jsonb_typeof(noi_dung) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS ngan_hang_khong_trung
  ON public.ngan_hang_cau_hoi (organization_id, khoi, ma_mon, khoa_trung);
CREATE INDEX IF NOT EXISTS ngan_hang_tra_cuu
  ON public.ngan_hang_cau_hoi (organization_id, khoi, ma_mon, muc, hinh_thuc);

DROP TRIGGER IF EXISTS trg_ngan_hang_updated_at ON public.ngan_hang_cau_hoi;
CREATE TRIGGER trg_ngan_hang_updated_at
  BEFORE UPDATE ON public.ngan_hang_cau_hoi
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ngan_hang_cau_hoi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ngan_hang_select_org ON public.ngan_hang_cau_hoi;
CREATE POLICY ngan_hang_select_org ON public.ngan_hang_cau_hoi
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS ngan_hang_insert_org ON public.ngan_hang_cau_hoi;
CREATE POLICY ngan_hang_insert_org ON public.ngan_hang_cau_hoi
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND tao_boi = auth.uid()
    AND da_kiem_dinh = false
  );

DROP POLICY IF EXISTS ngan_hang_update_leader ON public.ngan_hang_cau_hoi;
CREATE POLICY ngan_hang_update_leader ON public.ngan_hang_cau_hoi
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  )
  WITH CHECK (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS ngan_hang_delete_own_or_leader ON public.ngan_hang_cau_hoi;
CREATE POLICY ngan_hang_delete_own_or_leader ON public.ngan_hang_cau_hoi
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND (
      tao_boi = auth.uid()
      OR public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ngan_hang_cau_hoi TO authenticated;
