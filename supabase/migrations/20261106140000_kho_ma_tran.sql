-- ThayKhaiEdu - Kho ma trận của tổ (06/11/2026)
-- Lưu file ma trận tổ tải lên, tách hai phân hệ:
--   CA_NAM : ma trận nội dung cả năm (mỗi môn một file, không gắn kì)
--   CHUNG  : ma trận chung từng kì (mỗi môn × kì một file)
-- Mỗi lần tải lại là một phiên bản mới; nội dung đã tải không sửa được.
-- Tổ trưởng xác nhận phiên bản nào được dùng. Bản đã xác nhận không xóa được.

CREATE TABLE IF NOT EXISTS public.tai_lieu_ma_tran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL DEFAULT 4 CHECK (khoi BETWEEN 1 AND 5),
  loai VARCHAR(10) NOT NULL CHECK (loai IN ('CA_NAM', 'CHUNG')),
  ma_mon VARCHAR(40) NOT NULL,
  ky_kiem_tra VARCHAR(20) CHECK (ky_kiem_tra IN ('GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM')),
  phien_ban INTEGER NOT NULL CHECK (phien_ban > 0),
  ten_file VARCHAR(300) NOT NULL,
  duong_dan VARCHAR(1000),
  kich_thuoc INTEGER,
  noi_dung TEXT NOT NULL,
  so_ky_tu INTEGER GENERATED ALWAYS AS (char_length(noi_dung)) STORED,
  trang_thai VARCHAR(20) NOT NULL DEFAULT 'CHO_XAC_NHAN' CHECK (trang_thai IN ('CHO_XAC_NHAN', 'DA_XAC_NHAN')),
  ghi_chu TEXT,
  tai_len_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  xac_nhan_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  xac_nhan_luc TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ma trận cả năm không có kì; ma trận chung phải có kì
  CONSTRAINT tai_lieu_ma_tran_ky_theo_loai CHECK (
    (loai = 'CA_NAM' AND ky_kiem_tra IS NULL) OR (loai = 'CHUNG' AND ky_kiem_tra IS NOT NULL)
  ),
  CONSTRAINT tai_lieu_ma_tran_xac_nhan_du CHECK (
    trang_thai = 'CHO_XAC_NHAN' OR (xac_nhan_boi IS NOT NULL AND xac_nhan_luc IS NOT NULL)
  ),
  CONSTRAINT tai_lieu_ma_tran_noi_dung_gioi_han CHECK (char_length(noi_dung) <= 500000)
);

-- Số phiên bản không trùng trong một ô (môn × kì; cả năm thì kì rỗng)
CREATE UNIQUE INDEX IF NOT EXISTS tai_lieu_ma_tran_phien_ban
  ON public.tai_lieu_ma_tran (organization_id, khoi, loai, ma_mon, COALESCE(ky_kiem_tra, ''), phien_ban);

CREATE INDEX IF NOT EXISTS tai_lieu_ma_tran_tra_cuu
  ON public.tai_lieu_ma_tran (organization_id, khoi, loai, trang_thai);

DROP TRIGGER IF EXISTS trg_tai_lieu_ma_tran_updated_at ON public.tai_lieu_ma_tran;
CREATE TRIGGER trg_tai_lieu_ma_tran_updated_at
  BEFORE UPDATE ON public.tai_lieu_ma_tran
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Chỉ được đổi từ "chờ xác nhận" sang "đã xác nhận" và ghi chú; không sửa nội dung, không hủy xác nhận
CREATE OR REPLACE FUNCTION public.guard_tai_lieu_ma_tran_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.trang_thai = 'DA_XAC_NHAN' AND NEW.trang_thai <> 'DA_XAC_NHAN' THEN
    RAISE EXCEPTION 'Không hủy xác nhận được. Hãy tải phiên bản mới.';
  END IF;
  IF NEW.noi_dung IS DISTINCT FROM OLD.noi_dung
     OR NEW.ten_file IS DISTINCT FROM OLD.ten_file
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.khoi IS DISTINCT FROM OLD.khoi
     OR NEW.loai IS DISTINCT FROM OLD.loai
     OR NEW.ma_mon IS DISTINCT FROM OLD.ma_mon
     OR NEW.ky_kiem_tra IS DISTINCT FROM OLD.ky_kiem_tra
     OR NEW.phien_ban IS DISTINCT FROM OLD.phien_ban THEN
    RAISE EXCEPTION 'Nội dung, môn, kì của file ma trận đã tải không sửa được. Hãy tải phiên bản mới.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_tai_lieu_ma_tran_update ON public.tai_lieu_ma_tran;
CREATE TRIGGER trg_guard_tai_lieu_ma_tran_update
  BEFORE UPDATE ON public.tai_lieu_ma_tran
  FOR EACH ROW EXECUTE FUNCTION public.guard_tai_lieu_ma_tran_update();

ALTER TABLE public.tai_lieu_ma_tran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tai_lieu_ma_tran_select_org ON public.tai_lieu_ma_tran;
CREATE POLICY tai_lieu_ma_tran_select_org ON public.tai_lieu_ma_tran
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS tai_lieu_ma_tran_insert_leader ON public.tai_lieu_ma_tran;
CREATE POLICY tai_lieu_ma_tran_insert_leader ON public.tai_lieu_ma_tran
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND trang_thai = 'CHO_XAC_NHAN'
    AND tai_len_boi = auth.uid()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

-- Xác nhận: tổ trưởng và quản trị (tổ phó chỉ tải lên)
DROP POLICY IF EXISTS tai_lieu_ma_tran_update_leader ON public.tai_lieu_ma_tran;
CREATE POLICY tai_lieu_ma_tran_update_leader ON public.tai_lieu_ma_tran
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND (trang_thai = 'CHO_XAC_NHAN' OR xac_nhan_boi = auth.uid())
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

-- Chỉ xóa bản chưa xác nhận
DROP POLICY IF EXISTS tai_lieu_ma_tran_delete_pending ON public.tai_lieu_ma_tran;
CREATE POLICY tai_lieu_ma_tran_delete_pending ON public.tai_lieu_ma_tran
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND trang_thai = 'CHO_XAC_NHAN'
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tai_lieu_ma_tran TO authenticated;
REVOKE ALL ON public.tai_lieu_ma_tran FROM anon;
