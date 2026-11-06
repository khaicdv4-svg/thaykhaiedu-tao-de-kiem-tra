-- ThayKhaiEdu - Bản đặc tả có phiên bản (06/11/2026), bước 3 của quy trình tạo đề.
-- Cùng cách làm với ma_tran_rieng:
--   * một bản nháp dùng chung của tổ (la_ban_nhap = true), sửa được;
--   * các phiên bản đã xác nhận (la_ban_nhap = false, phien_ban 1, 2, 3...), KHÔNG sửa, KHÔNG xóa.
-- Đặc tả kế thừa một phiên bản ma trận riêng ĐÃ XÁC NHẬN (ma_tran_rieng_id). Đề kiểm tra sau này trỏ tới
-- phiên bản đặc tả đã xác nhận, nên biết được khi ma trận hoặc đặc tả có phiên bản mới hơn.

CREATE TABLE IF NOT EXISTS public.dac_ta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  ky_kiem_tra VARCHAR(20) NOT NULL CHECK (ky_kiem_tra IN ('GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM')),
  la_ban_nhap BOOLEAN NOT NULL,
  phien_ban INTEGER CHECK (phien_ban IS NULL OR phien_ban > 0),
  -- Phiên bản ma trận riêng đã xác nhận mà đặc tả này kế thừa (không xóa được khi còn đặc tả trỏ tới)
  ma_tran_rieng_id UUID NOT NULL REFERENCES public.ma_tran_rieng(id) ON DELETE RESTRICT,
  phien_ban_ma_tran_rieng INTEGER NOT NULL CHECK (phien_ban_ma_tran_rieng > 0),
  du_lieu JSONB NOT NULL,
  trang_thai VARCHAR(30) NOT NULL CHECK (trang_thai IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'DA_XAC_NHAN', 'CAN_XAC_NHAN_LAI')),
  xac_nhan_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  xac_nhan_luc TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dac_ta_du_lieu_is_object CHECK (jsonb_typeof(du_lieu) = 'object'),
  CONSTRAINT dac_ta_nhap_hoac_xac_nhan CHECK (
    (la_ban_nhap AND phien_ban IS NULL)
    OR (NOT la_ban_nhap AND phien_ban IS NOT NULL AND trang_thai = 'DA_XAC_NHAN'
        AND xac_nhan_boi IS NOT NULL AND xac_nhan_luc IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS dac_ta_mot_ban_nhap
  ON public.dac_ta (organization_id, khoi, ma_mon, ky_kiem_tra)
  WHERE la_ban_nhap;

CREATE UNIQUE INDEX IF NOT EXISTS dac_ta_phien_ban_duy_nhat
  ON public.dac_ta (organization_id, khoi, ma_mon, ky_kiem_tra, phien_ban)
  WHERE NOT la_ban_nhap;

CREATE INDEX IF NOT EXISTS dac_ta_theo_ma_tran_rieng ON public.dac_ta (ma_tran_rieng_id);

DROP TRIGGER IF EXISTS trg_dac_ta_updated_at ON public.dac_ta;
CREATE TRIGGER trg_dac_ta_updated_at
  BEFORE UPDATE ON public.dac_ta
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Đặc tả chỉ được kế thừa phiên bản ma trận riêng ĐÃ XÁC NHẬN, cùng trường, khối, môn, kì
CREATE OR REPLACE FUNCTION public.guard_dac_ta_ma_tran()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  mt public.ma_tran_rieng%ROWTYPE;
BEGIN
  SELECT * INTO mt FROM public.ma_tran_rieng WHERE id = NEW.ma_tran_rieng_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ma trận riêng mà đặc tả kế thừa.';
  END IF;
  IF mt.la_ban_nhap OR mt.trang_thai <> 'DA_XAC_NHAN' THEN
    RAISE EXCEPTION 'Chỉ lập đặc tả từ phiên bản ma trận riêng đã xác nhận.';
  END IF;
  IF mt.organization_id <> NEW.organization_id OR mt.khoi <> NEW.khoi
     OR mt.ma_mon <> NEW.ma_mon OR mt.ky_kiem_tra <> NEW.ky_kiem_tra THEN
    RAISE EXCEPTION 'Đặc tả và ma trận riêng phải cùng trường, khối, môn, kì.';
  END IF;
  IF mt.phien_ban <> NEW.phien_ban_ma_tran_rieng THEN
    RAISE EXCEPTION 'Số phiên bản ma trận riêng ghi trong đặc tả không đúng.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dac_ta_ma_tran ON public.dac_ta;
CREATE TRIGGER trg_guard_dac_ta_ma_tran
  BEFORE INSERT OR UPDATE OF ma_tran_rieng_id, phien_ban_ma_tran_rieng ON public.dac_ta
  FOR EACH ROW EXECUTE FUNCTION public.guard_dac_ta_ma_tran();

-- Phiên bản đã xác nhận không được sửa
CREATE OR REPLACE FUNCTION public.guard_dac_ta_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT OLD.la_ban_nhap THEN
    RAISE EXCEPTION 'Đặc tả đã xác nhận (phiên bản %) không được sửa. Hãy sửa bản nháp rồi xác nhận phiên bản mới.', OLD.phien_ban;
  END IF;
  IF NEW.la_ban_nhap IS DISTINCT FROM OLD.la_ban_nhap
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.khoi IS DISTINCT FROM OLD.khoi
     OR NEW.ma_mon IS DISTINCT FROM OLD.ma_mon
     OR NEW.ky_kiem_tra IS DISTINCT FROM OLD.ky_kiem_tra THEN
    RAISE EXCEPTION 'Không được đổi trường, môn, kì hoặc loại bản của đặc tả.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dac_ta_update ON public.dac_ta;
CREATE TRIGGER trg_guard_dac_ta_update
  BEFORE UPDATE ON public.dac_ta
  FOR EACH ROW EXECUTE FUNCTION public.guard_dac_ta_update();

ALTER TABLE public.dac_ta ENABLE ROW LEVEL SECURITY;

-- Mọi thành viên trong trường đọc được (giáo viên cần đặc tả đã xác nhận để làm đề)
DROP POLICY IF EXISTS dac_ta_select_org ON public.dac_ta;
CREATE POLICY dac_ta_select_org ON public.dac_ta
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS dac_ta_insert_leader ON public.dac_ta;
CREATE POLICY dac_ta_insert_leader ON public.dac_ta
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
    AND (la_ban_nhap OR xac_nhan_boi = auth.uid())
  );

DROP POLICY IF EXISTS dac_ta_update_leader ON public.dac_ta;
CREATE POLICY dac_ta_update_leader ON public.dac_ta
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND la_ban_nhap
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND la_ban_nhap
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

-- Chỉ xóa bản nháp; phiên bản đã xác nhận giữ lại làm lịch sử
DROP POLICY IF EXISTS dac_ta_delete_draft ON public.dac_ta;
CREATE POLICY dac_ta_delete_draft ON public.dac_ta
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND la_ban_nhap
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dac_ta TO authenticated;
REVOKE ALL ON public.dac_ta FROM anon;
