-- ThayKhaiEdu: Đề kiểm tra (bước 4). Mỗi (trường, khối, môn, kì) có một đề đang soạn, kế thừa một phiên bản
-- đặc tả ĐÃ XÁC NHẬN. Việc duyệt, phê duyệt và lưu phiên bản chính thức thuộc bước 5 (sẽ thêm sau).

CREATE TABLE IF NOT EXISTS public.de_kiem_tra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  ky_kiem_tra VARCHAR(20) NOT NULL CHECK (ky_kiem_tra IN ('GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM')),
  dac_ta_id UUID NOT NULL REFERENCES public.dac_ta(id) ON DELETE RESTRICT,
  phien_ban_dac_ta INTEGER NOT NULL CHECK (phien_ban_dac_ta > 0),
  du_lieu JSONB NOT NULL,
  trang_thai VARCHAR(30) NOT NULL CHECK (trang_thai IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'SAN_SANG_DUYET', 'CAN_KIEM_TRA_LAI')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT de_kiem_tra_du_lieu_is_object CHECK (jsonb_typeof(du_lieu) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS de_kiem_tra_mot_de
  ON public.de_kiem_tra (organization_id, khoi, ma_mon, ky_kiem_tra);

CREATE INDEX IF NOT EXISTS de_kiem_tra_theo_dac_ta ON public.de_kiem_tra (dac_ta_id);

DROP TRIGGER IF EXISTS trg_de_kiem_tra_updated_at ON public.de_kiem_tra;
CREATE TRIGGER trg_de_kiem_tra_updated_at
  BEFORE UPDATE ON public.de_kiem_tra
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.guard_de_kiem_tra_dac_ta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  dt public.dac_ta%ROWTYPE;
BEGIN
  SELECT * INTO dt FROM public.dac_ta WHERE id = NEW.dac_ta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đặc tả mà đề kế thừa.';
  END IF;
  IF dt.la_ban_nhap OR dt.trang_thai <> 'DA_XAC_NHAN' THEN
    RAISE EXCEPTION 'Chỉ tạo đề từ phiên bản đặc tả đã xác nhận.';
  END IF;
  IF dt.organization_id <> NEW.organization_id OR dt.khoi <> NEW.khoi
     OR dt.ma_mon <> NEW.ma_mon OR dt.ky_kiem_tra <> NEW.ky_kiem_tra THEN
    RAISE EXCEPTION 'Đề và đặc tả phải cùng trường, khối, môn, kì.';
  END IF;
  IF dt.phien_ban <> NEW.phien_ban_dac_ta THEN
    RAISE EXCEPTION 'Số phiên bản đặc tả ghi trong đề không đúng.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_de_kiem_tra_dac_ta ON public.de_kiem_tra;
CREATE TRIGGER trg_guard_de_kiem_tra_dac_ta
  BEFORE INSERT OR UPDATE OF dac_ta_id, phien_ban_dac_ta ON public.de_kiem_tra
  FOR EACH ROW EXECUTE FUNCTION public.guard_de_kiem_tra_dac_ta();

CREATE OR REPLACE FUNCTION public.guard_de_kiem_tra_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.khoi IS DISTINCT FROM OLD.khoi
     OR NEW.ma_mon IS DISTINCT FROM OLD.ma_mon
     OR NEW.ky_kiem_tra IS DISTINCT FROM OLD.ky_kiem_tra THEN
    RAISE EXCEPTION 'Không được đổi trường, môn hoặc kì của đề.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_de_kiem_tra_update ON public.de_kiem_tra;
CREATE TRIGGER trg_guard_de_kiem_tra_update
  BEFORE UPDATE ON public.de_kiem_tra
  FOR EACH ROW EXECUTE FUNCTION public.guard_de_kiem_tra_update();

ALTER TABLE public.de_kiem_tra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS de_kiem_tra_select_org ON public.de_kiem_tra;
CREATE POLICY de_kiem_tra_select_org ON public.de_kiem_tra
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS de_kiem_tra_insert_leader ON public.de_kiem_tra;
CREATE POLICY de_kiem_tra_insert_leader ON public.de_kiem_tra
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS de_kiem_tra_update_leader ON public.de_kiem_tra;
CREATE POLICY de_kiem_tra_update_leader ON public.de_kiem_tra
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS de_kiem_tra_delete_leader ON public.de_kiem_tra;
CREATE POLICY de_kiem_tra_delete_leader ON public.de_kiem_tra
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.de_kiem_tra TO authenticated;
REVOKE ALL ON public.de_kiem_tra FROM anon;
