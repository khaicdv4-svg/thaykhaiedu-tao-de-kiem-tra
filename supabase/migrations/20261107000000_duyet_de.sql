-- ThayKhaiEdu: Duyệt đề (bước 5). Mở rộng trạng thái của đề đang soạn và thêm kho các phiên bản đề ĐÃ DUYỆT
-- (bất biến: không sửa, không xóa; muốn đổi thì sửa đề đang soạn rồi duyệt thành phiên bản mới).

ALTER TABLE public.de_kiem_tra DROP CONSTRAINT IF EXISTS de_kiem_tra_trang_thai_check;
ALTER TABLE public.de_kiem_tra ADD CONSTRAINT de_kiem_tra_trang_thai_check
  CHECK (trang_thai IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'SAN_SANG_DUYET', 'CAN_KIEM_TRA_LAI', 'DA_DUYET', 'TRA_LAI'));

ALTER TABLE public.de_kiem_tra
  ADD COLUMN IF NOT EXISTS duyet_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duyet_luc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ghi_chu_duyet TEXT;

CREATE TABLE IF NOT EXISTS public.de_da_duyet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  ky_kiem_tra VARCHAR(20) NOT NULL CHECK (ky_kiem_tra IN ('GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM')),
  phien_ban INTEGER NOT NULL CHECK (phien_ban > 0),
  dac_ta_id UUID NOT NULL REFERENCES public.dac_ta(id) ON DELETE RESTRICT,
  phien_ban_dac_ta INTEGER NOT NULL CHECK (phien_ban_dac_ta > 0),
  du_lieu JSONB NOT NULL,
  duyet_boi UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  duyet_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  ghi_chu TEXT,
  CONSTRAINT de_da_duyet_du_lieu_is_object CHECK (jsonb_typeof(du_lieu) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS de_da_duyet_phien_ban_duy_nhat
  ON public.de_da_duyet (organization_id, khoi, ma_mon, ky_kiem_tra, phien_ban);
CREATE INDEX IF NOT EXISTS de_da_duyet_theo_dac_ta ON public.de_da_duyet (dac_ta_id);

CREATE OR REPLACE FUNCTION public.guard_de_da_duyet_bat_bien()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Đề đã duyệt (phiên bản %) không được sửa hoặc xóa. Hãy sửa đề đang soạn rồi duyệt phiên bản mới.', OLD.phien_ban;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_de_da_duyet_bat_bien ON public.de_da_duyet;
CREATE TRIGGER trg_guard_de_da_duyet_bat_bien
  BEFORE UPDATE OR DELETE ON public.de_da_duyet
  FOR EACH ROW EXECUTE FUNCTION public.guard_de_da_duyet_bat_bien();

ALTER TABLE public.de_da_duyet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS de_da_duyet_select_org ON public.de_da_duyet;
CREATE POLICY de_da_duyet_select_org ON public.de_da_duyet
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS de_da_duyet_insert_leader ON public.de_da_duyet;
CREATE POLICY de_da_duyet_insert_leader ON public.de_da_duyet
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND duyet_boi = auth.uid()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT ON public.de_da_duyet TO authenticated;
REVOKE ALL ON public.de_da_duyet FROM anon;
