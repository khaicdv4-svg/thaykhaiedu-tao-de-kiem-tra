-- ThayKhaiEdu: mỗi giáo viên có ma trận riêng, đặc tả riêng (quyết định của tổ trưởng ngày 22/11/2026).
--
-- Trước đây mỗi (trường, khối, môn, kì) chỉ có MỘT ma trận riêng và MỘT đặc tả dùng chung cả tổ.
-- Quy trình chuyên môn: mỗi giáo viên dựa vào ma trận chung của tổ để lập ma trận riêng của mình
-- (có thể chọn mạch kiến thức, YCCĐ khác), rồi đặc tả riêng, rồi đề riêng.
--
-- 1. Thêm cột chu_so_huu (người sở hữu bộ ma trận, đặc tả). Dữ liệu cũ: chủ sở hữu = người tạo.
-- 2. Thêm cột cat_luc: "Tạo mới" ở bước 1 cất bộ đang dùng vào lịch sử (không xóa, vẫn xem lại được).
-- 3. Bản nháp, số phiên bản tính riêng cho từng người.
-- 4. Quyền: giáo viên ghi được bộ của mình; tổ trưởng, tổ phó, quản trị ghi được mọi bộ trong trường
--    (để tự cập nhật theo ma trận chung mới). Ai trong trường cũng đọc được.
-- 5. Bản đã xác nhận vẫn không sửa nội dung được; chỉ được đánh dấu cất (cat_luc).
-- 6. Đề phải kế thừa đặc tả của chính người soạn đề.

-- 1, 2. Cột mới ---------------------------------------------------------------
ALTER TABLE public.ma_tran_rieng ADD COLUMN IF NOT EXISTS chu_so_huu UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.ma_tran_rieng ADD COLUMN IF NOT EXISTS cat_luc TIMESTAMPTZ;
ALTER TABLE public.dac_ta ADD COLUMN IF NOT EXISTS chu_so_huu UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.dac_ta ADD COLUMN IF NOT EXISTS cat_luc TIMESTAMPTZ;

-- Trigger chặn sửa bản đã xác nhận: tắt tạm để ghi chủ sở hữu cho dữ liệu cũ
ALTER TABLE public.ma_tran_rieng DISABLE TRIGGER trg_guard_ma_tran_rieng_update;
ALTER TABLE public.dac_ta DISABLE TRIGGER trg_guard_dac_ta_update;
UPDATE public.ma_tran_rieng SET chu_so_huu = COALESCE(created_by, updated_by, xac_nhan_boi) WHERE chu_so_huu IS NULL;
UPDATE public.dac_ta SET chu_so_huu = COALESCE(created_by, updated_by, xac_nhan_boi) WHERE chu_so_huu IS NULL;
ALTER TABLE public.ma_tran_rieng ENABLE TRIGGER trg_guard_ma_tran_rieng_update;
ALTER TABLE public.dac_ta ENABLE TRIGGER trg_guard_dac_ta_update;

ALTER TABLE public.ma_tran_rieng ALTER COLUMN chu_so_huu SET DEFAULT auth.uid();
ALTER TABLE public.dac_ta ALTER COLUMN chu_so_huu SET DEFAULT auth.uid();
ALTER TABLE public.ma_tran_rieng ALTER COLUMN chu_so_huu SET NOT NULL;
ALTER TABLE public.dac_ta ALTER COLUMN chu_so_huu SET NOT NULL;

-- 3. Chỉ mục duy nhất theo từng người -----------------------------------------
DROP INDEX IF EXISTS public.ma_tran_rieng_mot_ban_nhap;
DROP INDEX IF EXISTS public.ma_tran_rieng_phien_ban_duy_nhat;
CREATE UNIQUE INDEX ma_tran_rieng_mot_ban_nhap
  ON public.ma_tran_rieng (organization_id, khoi, ma_mon, ky_kiem_tra, chu_so_huu)
  WHERE la_ban_nhap AND cat_luc IS NULL;
CREATE UNIQUE INDEX ma_tran_rieng_phien_ban_duy_nhat
  ON public.ma_tran_rieng (organization_id, khoi, ma_mon, ky_kiem_tra, chu_so_huu, phien_ban)
  WHERE NOT la_ban_nhap;

DROP INDEX IF EXISTS public.dac_ta_mot_ban_nhap;
DROP INDEX IF EXISTS public.dac_ta_phien_ban_duy_nhat;
CREATE UNIQUE INDEX dac_ta_mot_ban_nhap
  ON public.dac_ta (organization_id, khoi, ma_mon, ky_kiem_tra, chu_so_huu)
  WHERE la_ban_nhap AND cat_luc IS NULL;
CREATE UNIQUE INDEX dac_ta_phien_ban_duy_nhat
  ON public.dac_ta (organization_id, khoi, ma_mon, ky_kiem_tra, chu_so_huu, phien_ban)
  WHERE NOT la_ban_nhap;

-- 5. Bản đã xác nhận: chỉ được cất, không đổi nội dung; không ai được đổi chủ sở hữu -----
CREATE OR REPLACE FUNCTION public.guard_ma_tran_rieng_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.chu_so_huu IS DISTINCT FROM OLD.chu_so_huu THEN
    RAISE EXCEPTION 'Không được đổi người sở hữu ma trận riêng.';
  END IF;
  IF OLD.cat_luc IS NOT NULL AND NEW.cat_luc IS NULL THEN
    RAISE EXCEPTION 'Ma trận đã cất vào lịch sử, không mở lại để sửa được.';
  END IF;
  IF NOT OLD.la_ban_nhap THEN
    IF (to_jsonb(NEW) - 'cat_luc' - 'updated_at') = (to_jsonb(OLD) - 'cat_luc' - 'updated_at') THEN
      RETURN NEW;
    END IF;
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

CREATE OR REPLACE FUNCTION public.guard_dac_ta_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.chu_so_huu IS DISTINCT FROM OLD.chu_so_huu THEN
    RAISE EXCEPTION 'Không được đổi người sở hữu đặc tả.';
  END IF;
  IF OLD.cat_luc IS NOT NULL AND NEW.cat_luc IS NULL THEN
    RAISE EXCEPTION 'Đặc tả đã cất vào lịch sử, không mở lại để sửa được.';
  END IF;
  IF NOT OLD.la_ban_nhap THEN
    IF (to_jsonb(NEW) - 'cat_luc' - 'updated_at') = (to_jsonb(OLD) - 'cat_luc' - 'updated_at') THEN
      RETURN NEW;
    END IF;
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

-- 4. Quyền ----------------------------------------------------------------------
-- Ghi bộ của người khác: chỉ tổ trưởng, tổ phó, quản trị (tự cập nhật theo ma trận chung mới).
CREATE OR REPLACE FUNCTION public.ghi_duoc_ma_tran_cua(p_chu UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_chu = auth.uid()
      OR public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
$$;
REVOKE ALL ON FUNCTION public.ghi_duoc_ma_tran_cua(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghi_duoc_ma_tran_cua(UUID) TO authenticated;

DROP POLICY IF EXISTS ma_tran_rieng_insert_leader ON public.ma_tran_rieng;
DROP POLICY IF EXISTS ma_tran_rieng_insert ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_insert ON public.ma_tran_rieng FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.ghi_duoc_ma_tran_cua(chu_so_huu)
    AND cat_luc IS NULL
    AND (la_ban_nhap OR xac_nhan_boi = auth.uid())
  );
DROP POLICY IF EXISTS ma_tran_rieng_update_leader ON public.ma_tran_rieng;
DROP POLICY IF EXISTS ma_tran_rieng_update ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_update ON public.ma_tran_rieng FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.ghi_duoc_ma_tran_cua(chu_so_huu))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.ghi_duoc_ma_tran_cua(chu_so_huu));
DROP POLICY IF EXISTS ma_tran_rieng_delete_draft ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_delete_draft ON public.ma_tran_rieng FOR DELETE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.ghi_duoc_ma_tran_cua(chu_so_huu));

DROP POLICY IF EXISTS dac_ta_insert_leader ON public.dac_ta;
DROP POLICY IF EXISTS dac_ta_insert ON public.dac_ta;
CREATE POLICY dac_ta_insert ON public.dac_ta FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND public.ghi_duoc_ma_tran_cua(chu_so_huu)
    AND cat_luc IS NULL
    AND (la_ban_nhap OR xac_nhan_boi = auth.uid())
  );
DROP POLICY IF EXISTS dac_ta_update_leader ON public.dac_ta;
DROP POLICY IF EXISTS dac_ta_update ON public.dac_ta;
CREATE POLICY dac_ta_update ON public.dac_ta FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.ghi_duoc_ma_tran_cua(chu_so_huu))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.ghi_duoc_ma_tran_cua(chu_so_huu));
DROP POLICY IF EXISTS dac_ta_delete_draft ON public.dac_ta;
CREATE POLICY dac_ta_delete_draft ON public.dac_ta FOR DELETE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.ghi_duoc_ma_tran_cua(chu_so_huu));

-- 6. Đề kế thừa đặc tả của chính người soạn ----------------------------------------
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
  IF dt.chu_so_huu IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'Đề phải soạn theo đặc tả của chính người soạn đề.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS ma_tran_rieng_theo_chu ON public.ma_tran_rieng (organization_id, ma_mon, ky_kiem_tra, chu_so_huu);
CREATE INDEX IF NOT EXISTS dac_ta_theo_chu ON public.dac_ta (organization_id, ma_mon, ky_kiem_tra, chu_so_huu);
