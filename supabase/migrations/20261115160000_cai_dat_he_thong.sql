-- ==============================================================================
-- Cài đặt hệ thống: cho quản trị sửa thông tin trường, thêm tổ chuyên môn,
-- đặt năm học hiện tại. Không đổi bảng, chỉ bổ sung chính sách và một hàm.
-- ==============================================================================

-- 1. Sửa thông tin trường: quản trị hệ thống, hoặc Ban giám hiệu (SCHOOL_ADMIN) của chính trường đó
DROP POLICY IF EXISTS cai_dat_truong_update ON public.organizations;
CREATE POLICY cai_dat_truong_update ON public.organizations FOR UPDATE TO authenticated
  USING (public.co_vai_tro('SYSTEM_ADMIN') OR (id = public.get_auth_user_org_id() AND public.co_vai_tro('SCHOOL_ADMIN')))
  WITH CHECK (public.co_vai_tro('SYSTEM_ADMIN') OR (id = public.get_auth_user_org_id() AND public.co_vai_tro('SCHOOL_ADMIN')));

-- 2. Thêm tổ chuyên môn trong trường của mình
DROP POLICY IF EXISTS cai_dat_to_insert ON public.professional_groups;
CREATE POLICY cai_dat_to_insert ON public.professional_groups FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id()
    AND (public.co_vai_tro('SYSTEM_ADMIN') OR public.co_vai_tro('SCHOOL_ADMIN')));

-- 3. Đặt một năm học làm năm hiện tại (các năm khác tự bỏ đánh dấu)
CREATE OR REPLACE FUNCTION public.dat_nam_hoc_hien_tai(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.co_vai_tro('SYSTEM_ADMIN') THEN
    RAISE EXCEPTION 'Chỉ quản trị hệ thống mới đổi năm học hiện tại.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.academic_years WHERE id = p_id) THEN
    RAISE EXCEPTION 'Không tìm thấy năm học.';
  END IF;
  UPDATE public.academic_years SET is_current = (id = p_id) WHERE is_current IS DISTINCT FROM (id = p_id);
END $$;

REVOKE ALL ON FUNCTION public.dat_nam_hoc_hien_tai(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dat_nam_hoc_hien_tai(UUID) TO authenticated;
