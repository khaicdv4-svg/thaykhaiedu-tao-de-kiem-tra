-- ThayKhaiEdu: phân quyền đề kiểm tra theo vai trò.
-- Giáo viên: soạn đề, sửa và XÓA đề do chính mình tạo (không duyệt, không xóa đề đã duyệt, không đụng đề người khác).
-- Tổ trưởng, tổ phó, ban giám hiệu (SCHOOL_ADMIN), quản trị hệ thống: như trước (xem, sửa, duyệt, xóa mọi đề trong trường).
-- Đồng thời chặn người dùng tự đổi trường (organization_id) trong hồ sơ của mình.

CREATE OR REPLACE FUNCTION public.la_vai_tro_quan_ly()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT COALESCE(public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'), false) $$;

REVOKE ALL ON FUNCTION public.la_vai_tro_quan_ly() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_vai_tro_quan_ly() TO authenticated;

-- 1) Chính sách cho đề đang soạn
DROP POLICY IF EXISTS de_kiem_tra_insert_leader ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_update_leader ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_delete_leader ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_insert ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_update ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_delete ON public.de_kiem_tra;

CREATE POLICY de_kiem_tra_insert ON public.de_kiem_tra
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND created_by = auth.uid());

CREATE POLICY de_kiem_tra_update ON public.de_kiem_tra
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (public.la_vai_tro_quan_ly() OR created_by = auth.uid()))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND (public.la_vai_tro_quan_ly() OR created_by = auth.uid()));

CREATE POLICY de_kiem_tra_delete ON public.de_kiem_tra
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND (public.la_vai_tro_quan_ly() OR (created_by = auth.uid() AND trang_thai <> 'DA_DUYET'))
  );

-- 2) Giáo viên không được tự duyệt, tự trả lại hay đổi người tạo
CREATE OR REPLACE FUNCTION public.guard_de_kiem_tra_quyen()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.la_vai_tro_quan_ly() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.trang_thai IN ('DA_DUYET', 'TRA_LAI') OR NEW.duyet_boi IS NOT NULL OR NEW.duyet_luc IS NOT NULL OR NEW.ghi_chu_duyet IS NOT NULL THEN
      RAISE EXCEPTION 'Giáo viên không được duyệt hoặc trả lại đề. Hãy chuyển đề sang "Chờ duyệt" để tổ trưởng duyệt.';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Không được đổi người tạo đề.';
  END IF;
  IF (NEW.trang_thai IN ('DA_DUYET', 'TRA_LAI') AND NEW.trang_thai IS DISTINCT FROM OLD.trang_thai)
     OR NEW.duyet_boi IS DISTINCT FROM OLD.duyet_boi AND NEW.duyet_boi IS NOT NULL
     OR NEW.duyet_luc IS DISTINCT FROM OLD.duyet_luc AND NEW.duyet_luc IS NOT NULL
     OR NEW.ghi_chu_duyet IS DISTINCT FROM OLD.ghi_chu_duyet AND NEW.ghi_chu_duyet IS NOT NULL THEN
    RAISE EXCEPTION 'Giáo viên không được duyệt hoặc trả lại đề.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_de_kiem_tra_quyen() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_de_kiem_tra_quyen ON public.de_kiem_tra;
CREATE TRIGGER trg_guard_de_kiem_tra_quyen
  BEFORE INSERT OR UPDATE ON public.de_kiem_tra
  FOR EACH ROW EXECUTE FUNCTION public.guard_de_kiem_tra_quyen();

-- 3) Hồ sơ: chỉ sửa được thông tin của mình, không tự đổi vai trò hoặc trường
DROP POLICY IF EXISTS "Users can update their own basic profile" ON public.profiles;
CREATE POLICY "Users can update their own basic profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role::text = public.get_auth_user_role()::text
    AND organization_id IS NOT DISTINCT FROM public.get_auth_user_org_id()
  );
