-- ThayKhaiEdu - Kho chương trình GDPT 2018 (06/11/2026)
-- Nguồn chung cho lớp 1-5 của cả trường: tài liệu (CT GDPT 2018, SGK, SGV) và YCCĐ AI trích ra, chờ tổ trưởng duyệt.
-- Chỉ thêm bảng, không đổi dữ liệu cũ.

CREATE TABLE IF NOT EXISTS public.ct_tai_lieu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  loai VARCHAR(20) NOT NULL CHECK (loai IN ('CT_GDPT', 'SGK', 'SGV', 'KHAC')),
  mon VARCHAR(30) NOT NULL,
  lop SMALLINT CHECK (lop BETWEEN 1 AND 5),
  tieu_de VARCHAR(300) NOT NULL,
  nguon VARCHAR(12) NOT NULL CHECK (nguon IN ('TAI_FILE', 'LINK', 'DAN_CHU')),
  link TEXT,
  ten_file VARCHAR(300),
  noi_dung TEXT NOT NULL DEFAULT '',
  so_ky_tu INT NOT NULL DEFAULT 0,
  ghi_chu TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ct_tai_lieu_org ON public.ct_tai_lieu (organization_id, mon, lop);

CREATE TABLE IF NOT EXISTS public.ct_yccd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tai_lieu_id UUID REFERENCES public.ct_tai_lieu(id) ON DELETE SET NULL,
  mon VARCHAR(30) NOT NULL,
  lop SMALLINT NOT NULL CHECK (lop BETWEEN 1 AND 5),
  mach VARCHAR(300),
  chu_de VARCHAR(300),
  bai VARCHAR(300),
  noi_dung TEXT NOT NULL,
  trich_dan TEXT,
  trich_khop BOOLEAN NOT NULL DEFAULT FALSE,
  nguon VARCHAR(12) NOT NULL DEFAULT 'AI_TRICH' CHECK (nguon IN ('AI_TRICH', 'NHAP_TAY')),
  trang_thai VARCHAR(12) NOT NULL DEFAULT 'CHO_DUYET' CHECK (trang_thai IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
  duyet_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  duyet_luc TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ct_yccd_loc ON public.ct_yccd (organization_id, mon, lop, trang_thai);

DROP TRIGGER IF EXISTS trg_ct_tai_lieu_updated_at ON public.ct_tai_lieu;
CREATE TRIGGER trg_ct_tai_lieu_updated_at BEFORE UPDATE ON public.ct_tai_lieu
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_ct_yccd_updated_at ON public.ct_yccd;
CREATE TRIGGER trg_ct_yccd_updated_at BEFORE UPDATE ON public.ct_yccd
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ct_tai_lieu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_yccd ENABLE ROW LEVEL SECURITY;

-- Mọi thành viên của trường xem được; chỉ tổ trưởng / quản trị thêm tài liệu, duyệt, sửa, xóa.
DROP POLICY IF EXISTS ct_tai_lieu_select ON public.ct_tai_lieu;
CREATE POLICY ct_tai_lieu_select ON public.ct_tai_lieu FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());
DROP POLICY IF EXISTS ct_tai_lieu_ghi ON public.ct_tai_lieu;
CREATE POLICY ct_tai_lieu_ghi ON public.ct_tai_lieu FOR ALL TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'));

DROP POLICY IF EXISTS ct_yccd_select ON public.ct_yccd;
CREATE POLICY ct_yccd_select ON public.ct_yccd FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());
DROP POLICY IF EXISTS ct_yccd_ghi ON public.ct_yccd;
CREATE POLICY ct_yccd_ghi ON public.ct_yccd FOR ALL TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ct_tai_lieu, public.ct_yccd TO authenticated;
REVOKE ALL ON public.ct_tai_lieu, public.ct_yccd FROM anon;
