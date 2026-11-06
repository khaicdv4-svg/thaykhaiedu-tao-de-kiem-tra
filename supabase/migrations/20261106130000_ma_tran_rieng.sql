-- ThayKhaiEdu - Lưu ma trận riêng có phiên bản (06/11/2026)
-- Mỗi trường, mỗi môn, mỗi kì có:
--   * một bản nháp dùng chung của tổ (la_ban_nhap = true), sửa được;
--   * các phiên bản đã xác nhận (la_ban_nhap = false, phien_ban 1, 2, 3...), KHÔNG sửa, KHÔNG xóa.
-- Bản đặc tả và đề sau này trỏ tới id của phiên bản đã xác nhận, nên biết được khi có phiên bản mới hơn.

CREATE TABLE IF NOT EXISTS public.ma_tran_rieng (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  ky_kiem_tra VARCHAR(20) NOT NULL CHECK (ky_kiem_tra IN ('GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM')),
  la_ban_nhap BOOLEAN NOT NULL,
  phien_ban INTEGER CHECK (phien_ban IS NULL OR phien_ban > 0),
  phien_ban_ma_tran_chung VARCHAR(20) NOT NULL,
  du_lieu JSONB NOT NULL,
  trang_thai VARCHAR(30) NOT NULL CHECK (trang_thai IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'DA_XAC_NHAN', 'CAN_XAC_NHAN_LAI')),
  xac_nhan_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  xac_nhan_luc TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ma_tran_rieng_du_lieu_is_object CHECK (jsonb_typeof(du_lieu) = 'object'),
  -- Bản nháp không có số phiên bản; bản xác nhận phải có số phiên bản, người và thời điểm xác nhận
  CONSTRAINT ma_tran_rieng_nhap_hoac_xac_nhan CHECK (
    (la_ban_nhap AND phien_ban IS NULL)
    OR (NOT la_ban_nhap AND phien_ban IS NOT NULL AND trang_thai = 'DA_XAC_NHAN'
        AND xac_nhan_boi IS NOT NULL AND xac_nhan_luc IS NOT NULL)
  )
);

-- Một bản nháp cho mỗi trường / khối / môn / kì
CREATE UNIQUE INDEX IF NOT EXISTS ma_tran_rieng_mot_ban_nhap
  ON public.ma_tran_rieng (organization_id, khoi, ma_mon, ky_kiem_tra)
  WHERE la_ban_nhap;

-- Số phiên bản không trùng
CREATE UNIQUE INDEX IF NOT EXISTS ma_tran_rieng_phien_ban_duy_nhat
  ON public.ma_tran_rieng (organization_id, khoi, ma_mon, ky_kiem_tra, phien_ban)
  WHERE NOT la_ban_nhap;

DROP TRIGGER IF EXISTS trg_ma_tran_rieng_updated_at ON public.ma_tran_rieng;
CREATE TRIGGER trg_ma_tran_rieng_updated_at
  BEFORE UPDATE ON public.ma_tran_rieng
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Phiên bản đã xác nhận không được sửa; bản nháp không được đổi thành bản xác nhận bằng UPDATE
CREATE OR REPLACE FUNCTION public.guard_ma_tran_rieng_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT OLD.la_ban_nhap THEN
    RAISE EXCEPTION 'Ma trận đã xác nhận (phiên bản %) không được sửa. Hãy sửa bản nháp rồi xác nhận phiên bản mới.', OLD.phien_ban;
  END IF;
  IF NEW.la_ban_nhap IS DISTINCT FROM OLD.la_ban_nhap
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.khoi IS DISTINCT FROM OLD.khoi
     OR NEW.ma_mon IS DISTINCT FROM OLD.ma_mon
     OR NEW.ky_kiem_tra IS DISTINCT FROM OLD.ky_kiem_tra THEN
    RAISE EXCEPTION 'Không được đổi trường, môn, kì hoặc loại bản của ma trận riêng.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ma_tran_rieng_update ON public.ma_tran_rieng;
CREATE TRIGGER trg_guard_ma_tran_rieng_update
  BEFORE UPDATE ON public.ma_tran_rieng
  FOR EACH ROW EXECUTE FUNCTION public.guard_ma_tran_rieng_update();

ALTER TABLE public.ma_tran_rieng ENABLE ROW LEVEL SECURITY;

-- Mọi thành viên trong trường đọc được (giáo viên cần ma trận đã xác nhận để làm đề)
DROP POLICY IF EXISTS ma_tran_rieng_select_org ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_select_org ON public.ma_tran_rieng
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

-- Tổ trưởng, tổ phó, quản trị: tạo bản nháp và xác nhận phiên bản (đúng người xác nhận là mình)
DROP POLICY IF EXISTS ma_tran_rieng_insert_leader ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_insert_leader ON public.ma_tran_rieng
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
    AND (la_ban_nhap OR xac_nhan_boi = auth.uid())
  );

-- Chỉ sửa bản nháp (trigger chặn thêm lần nữa ở tầng dữ liệu)
DROP POLICY IF EXISTS ma_tran_rieng_update_leader ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_update_leader ON public.ma_tran_rieng
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
DROP POLICY IF EXISTS ma_tran_rieng_delete_draft ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_delete_draft ON public.ma_tran_rieng
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND la_ban_nhap
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ma_tran_rieng TO authenticated;
REVOKE ALL ON public.ma_tran_rieng FROM anon;
