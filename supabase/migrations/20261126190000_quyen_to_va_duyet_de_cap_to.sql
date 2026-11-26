-- ThayKhaiEdu: phân quyền theo tổ và quy trình duyệt đề cấp tổ (quyết định của thầy Khái ngày 26/11/2026).
--
-- 1. Quản trị hệ thống được mọi quyền (coi như có mọi vai trò), trừ: không tự thẩm định, xác nhận, duyệt đề do mình soạn.
--    Quản trị vẫn được chọn đề của mình làm đề chính nộp Ban giám hiệu.
-- 2. Tổ trưởng bổ nhiệm tổ phó (mỗi tổ tối đa 1), tích quyền cho tổ phó và thành viên. Quản trị bổ nhiệm tổ trưởng.
--    Quyền tổ phó mặc định có hết, tổ trưởng bỏ tích được. Giáo viên mặc định: soạn đề, kiểm tra chéo.
--    Thêm 2 quyền: DUYET_CAP_TO (duyệt cấp tổ các môn được giao), PHAN_CONG_CHEO (phân công kiểm tra chéo).
--    Quyền SUA_MA_TRAN_DAC_TA nay nghĩa là "sửa ma trận, đặc tả của người khác" (bộ của mình ai cũng sửa được).
-- 3. Quy trình: soạn → gửi kiểm tra chéo → người kiểm tra yêu cầu sửa hoặc DUYỆT CHÉO (duyệt lần 1, trạng thái DA_DUYET_CHEO)
--    → tổ trưởng / người phụ trách môn duyệt cấp tổ (DA_XAC_NHAN_TO) → chọn tối đa 3 đề chính mỗi môn, kì nộp BGH (CHO_BGH_DUYET)
--    → BGH duyệt cả 3.
-- Chỉ thêm bảng, cột, hàm; không xóa dữ liệu.

-- ============================================================================
-- 1. Vai trò: quản trị coi như có mọi vai trò
-- ============================================================================
-- Vai trò thật (không tính quyền ngầm của quản trị): dùng khi cần biết chức vụ thật của một người.
CREATE OR REPLACE FUNCTION public.user_co_vai_tro_that(p_user UUID, p_role TEXT, p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user AND COALESCE(p.is_active, true) AND p.role = p_role)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id AND COALESCE(p.is_active, true)
        WHERE ur.user_id = p_user AND ur.role = p_role AND ur.valid_from <= now() AND (ur.valid_to IS NULL OR ur.valid_to > now())
          AND (p_khoi IS NULL OR ur.pham_vi_khoi IS NULL OR ur.pham_vi_khoi = p_khoi)
      )
$$;

CREATE OR REPLACE FUNCTION public.user_co_vai_tro(p_user UUID, p_role TEXT, p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.user_co_vai_tro_that(p_user, p_role, p_khoi)
      OR (p_role <> 'SYSTEM_ADMIN' AND public.user_co_vai_tro_that(p_user, 'SYSTEM_ADMIN', NULL))
$$;
REVOKE ALL ON FUNCTION public.user_co_vai_tro_that(UUID, TEXT, SMALLINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_co_vai_tro_that(UUID, TEXT, SMALLINT) TO authenticated;

-- ============================================================================
-- 2. Quyền tích theo tổ: thêm quyền, tổ phó tích được
-- ============================================================================
ALTER TABLE public.quyen_giao_vien DROP CONSTRAINT IF EXISTS quyen_giao_vien_quyen_check;
ALTER TABLE public.quyen_giao_vien ADD CONSTRAINT quyen_giao_vien_quyen_check
  CHECK (quyen IN ('SOAN_DE', 'THAM_DINH', 'SUA_MA_TRAN_DAC_TA', 'NAP_MUC_LUC_SACH', 'DUYET_CAP_TO', 'PHAN_CONG_CHEO'));

CREATE OR REPLACE FUNCTION public.user_co_quyen_gv(p_user UUID, p_quyen TEXT, p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE ex BOOLEAN;
BEGIN
  -- Tổ trưởng, Ban giám hiệu quản lý, quản trị (qua quyền ngầm) luôn có.
  IF public.user_co_vai_tro(p_user, 'GROUP_LEADER', p_khoi) OR public.user_co_vai_tro(p_user, 'SCHOOL_ADMIN', p_khoi) THEN RETURN true; END IF;
  SELECT q.duoc INTO ex FROM public.quyen_giao_vien q WHERE q.user_id = p_user AND q.quyen = p_quyen;
  -- Tổ phó: mặc định có hết, tổ trưởng bỏ tích được.
  IF public.user_co_vai_tro(p_user, 'DEPUTY_GROUP_LEADER', p_khoi) THEN RETURN COALESCE(ex, true); END IF;
  -- Giáo viên: mặc định soạn đề và kiểm tra chéo.
  IF public.user_co_vai_tro(p_user, 'TEACHER', p_khoi) THEN RETURN COALESCE(ex, p_quyen IN ('SOAN_DE', 'THAM_DINH')); END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.co_quyen_ghi(p_quyen TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.user_co_quyen_gv(auth.uid(), p_quyen, NULL) $$;

CREATE OR REPLACE FUNCTION public.quyen_gv_cua_toi()
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(array_agg(q), ARRAY[]::TEXT[]) FROM unnest(ARRAY['SOAN_DE', 'THAM_DINH', 'SUA_MA_TRAN_DAC_TA', 'NAP_MUC_LUC_SACH', 'DUYET_CAP_TO', 'PHAN_CONG_CHEO']) q WHERE public.co_quyen_gv(q) $$;

-- Ma trận riêng, đặc tả: bộ của mình luôn sửa được; bộ của người khác cần quyền SUA_MA_TRAN_DAC_TA.
CREATE OR REPLACE FUNCTION public.ghi_duoc_ma_tran_cua(p_chu UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT p_chu = auth.uid() OR public.user_co_quyen_gv(auth.uid(), 'SUA_MA_TRAN_DAC_TA', NULL) $$;

-- Chức vụ của một người trong tổ khối (theo vai trò thật).
CREATE OR REPLACE FUNCTION public.chuc_vu_trong_to(p_user UUID, p_khoi SMALLINT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.user_co_vai_tro_that(p_user, 'SYSTEM_ADMIN', NULL) THEN 'QUAN_TRI'
    WHEN public.user_co_vai_tro_that(p_user, 'SCHOOL_ADMIN', NULL) OR public.user_co_vai_tro_that(p_user, 'SCHOOL_LEADERSHIP', NULL) THEN 'BGH'
    WHEN public.user_co_vai_tro_that(p_user, 'GROUP_LEADER', p_khoi) THEN 'TO_TRUONG'
    WHEN public.user_co_vai_tro_that(p_user, 'DEPUTY_GROUP_LEADER', p_khoi) THEN 'TO_PHO'
    ELSE 'THANH_VIEN'
  END
$$;
GRANT EXECUTE ON FUNCTION public.chuc_vu_trong_to(UUID, SMALLINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.la_thanh_vien_to(p_user UUID, p_khoi SMALLINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.professional_group_members m JOIN public.professional_groups pg ON pg.id = m.group_id
    WHERE m.user_id = p_user AND pg.organization_id = public.get_auth_user_org_id() AND pg.assigned_grade_ids @> ARRAY[p_khoi::INT])
$$;
GRANT EXECUTE ON FUNCTION public.la_thanh_vien_to(UUID, SMALLINT) TO authenticated;

-- Bảng quyền của tổ: thêm chức vụ; tổ phó không còn bị khóa.
CREATE OR REPLACE FUNCTION public.ds_quyen_to(p_khoi SMALLINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); kq JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.co_vai_tro('GROUP_LEADER', p_khoi) THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng của tổ này hoặc quản trị mới xem được bảng quyền.';
  END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x ->> 'ten'), '[]'::JSONB) INTO kq FROM (
    SELECT jsonb_build_object(
      'id', p.id, 'ten', p.full_name, 'email', p.email, 'hoatDong', COALESCE(p.is_active, true),
      'chucVu', cv,
      'khoa', (p.id = auth.uid()) OR cv IN ('TO_TRUONG', 'BGH', 'QUAN_TRI'),
      'ghiChuKhoa', CASE WHEN p.id = auth.uid() THEN 'Tài khoản của bạn' WHEN cv = 'TO_TRUONG' THEN 'Tổ trưởng'
                         WHEN cv = 'BGH' THEN 'Ban giám hiệu' WHEN cv = 'QUAN_TRI' THEN 'Quản trị' ELSE '' END,
      'quyen', (SELECT jsonb_object_agg(q, public.user_co_quyen_gv(p.id, q, p_khoi))
                FROM unnest(ARRAY['SOAN_DE', 'THAM_DINH', 'SUA_MA_TRAN_DAC_TA', 'NAP_MUC_LUC_SACH', 'DUYET_CAP_TO', 'PHAN_CONG_CHEO']) q)
    ) AS x
    FROM public.professional_group_members m
    JOIN public.professional_groups pg ON pg.id = m.group_id AND pg.organization_id = org AND pg.assigned_grade_ids @> ARRAY[p_khoi::INT]
    JOIN public.profiles p ON p.id = m.user_id AND p.organization_id = org
    CROSS JOIN LATERAL (SELECT public.chuc_vu_trong_to(p.id, p_khoi) AS cv) c
  ) t;
  RETURN kq;
END $$;

CREATE OR REPLACE FUNCTION public.ap_dung_quyen_to(p_khoi SMALLINT, p_ds JSONB)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); it JSONB; u UUID; qs TEXT[]; q TEXT; truoc JSONB; sau JSONB; dem INT := 0;
  tat_ca TEXT[] := ARRAY['SOAN_DE', 'THAM_DINH', 'SUA_MA_TRAN_DAC_TA', 'NAP_MUC_LUC_SACH', 'DUYET_CAP_TO', 'PHAN_CONG_CHEO'];
BEGIN
  IF auth.uid() IS NULL OR NOT public.co_vai_tro('GROUP_LEADER', p_khoi) THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng của tổ này hoặc quản trị mới được cấp quyền cho thành viên.';
  END IF;
  IF jsonb_typeof(p_ds) <> 'array' THEN RAISE EXCEPTION 'Danh sách không hợp lệ.'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_ds) LOOP
    u := (it ->> 'user')::UUID;
    SELECT COALESCE(array_agg(x), ARRAY[]::TEXT[]) INTO qs FROM jsonb_array_elements_text(COALESCE(it -> 'quyen', '[]'::JSONB)) x;
    IF EXISTS (SELECT 1 FROM unnest(qs) y WHERE y <> ALL (tat_ca)) THEN RAISE EXCEPTION 'Có quyền không hợp lệ.'; END IF;
    IF u = auth.uid() THEN RAISE EXCEPTION 'Không tự đổi quyền của chính mình.'; END IF;
    IF NOT public.la_thanh_vien_to(u, p_khoi) THEN RAISE EXCEPTION 'Người này không thuộc tổ khối %.', p_khoi; END IF;
    IF public.chuc_vu_trong_to(u, p_khoi) IN ('TO_TRUONG', 'BGH', 'QUAN_TRI') THEN
      RAISE EXCEPTION 'Tổ trưởng, Ban giám hiệu và quản trị đã có đủ quyền theo chức vụ, không chỉnh ở bảng này.';
    END IF;
    truoc := (SELECT COALESCE(jsonb_object_agg(quyen, duoc), '{}'::JSONB) FROM public.quyen_giao_vien WHERE user_id = u);
    FOREACH q IN ARRAY tat_ca LOOP
      INSERT INTO public.quyen_giao_vien (organization_id, user_id, quyen, duoc, cap_boi) VALUES (org, u, q, q = ANY (qs), auth.uid())
      ON CONFLICT (user_id, quyen) DO UPDATE SET duoc = EXCLUDED.duoc, cap_boi = EXCLUDED.cap_boi, cap_luc = now();
    END LOOP;
    sau := (SELECT jsonb_object_agg(quyen, duoc) FROM public.quyen_giao_vien WHERE user_id = u);
    IF truoc IS DISTINCT FROM sau THEN
      INSERT INTO public.quyen_gv_nhat_ky (organization_id, nguoi_thuc_hien, doi_tuong, khoi, quyen_truoc, quyen_sau) VALUES (org, auth.uid(), u, p_khoi, truoc, sau);
      dem := dem + 1;
    END IF;
  END LOOP;
  RETURN dem;
END $$;

-- ============================================================================
-- 3. Chức vụ trong tổ: quản trị đặt tổ trưởng; tổ trưởng (hoặc quản trị) đặt tổ phó
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dat_chuc_vu_to(p_khoi SMALLINT, p_user UUID, p_chuc_vu TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); qt BOOLEAN := public.co_vai_tro('SYSTEM_ADMIN'); cu TEXT; g UUID; x RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập.'; END IF;
  IF p_khoi NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Khối từ 1 đến 5.'; END IF;
  IF p_chuc_vu NOT IN ('TO_TRUONG', 'TO_PHO', 'THANH_VIEN') THEN RAISE EXCEPTION 'Chức vụ không hợp lệ.'; END IF;
  IF NOT public.co_vai_tro('GROUP_LEADER', p_khoi) THEN RAISE EXCEPTION 'Chỉ tổ trưởng của tổ này hoặc quản trị mới đổi chức vụ.'; END IF;
  IF NOT public.la_thanh_vien_to(p_user, p_khoi) THEN RAISE EXCEPTION 'Người này không thuộc tổ khối %.', p_khoi; END IF;
  cu := public.chuc_vu_trong_to(p_user, p_khoi);
  IF cu IN ('BGH', 'QUAN_TRI') THEN RAISE EXCEPTION 'Không đổi chức vụ trong tổ của Ban giám hiệu hoặc quản trị ở đây.'; END IF;
  IF (p_chuc_vu = 'TO_TRUONG' OR cu = 'TO_TRUONG') AND NOT qt THEN RAISE EXCEPTION 'Chỉ quản trị mới bổ nhiệm hoặc thôi tổ trưởng.'; END IF;
  IF p_user = auth.uid() AND NOT qt THEN RAISE EXCEPTION 'Không tự đổi chức vụ của chính mình.'; END IF;
  IF cu = p_chuc_vu THEN RETURN; END IF;
  g := public.id_to_khoi(org, p_khoi);

  -- Thôi chức vụ cũ của người này trong khối
  DELETE FROM public.user_roles ur WHERE ur.user_id = p_user AND ur.role IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER')
    AND (ur.pham_vi_khoi = p_khoi OR ur.pham_vi_khoi IS NULL);
  UPDATE public.profiles SET role = 'TEACHER' WHERE id = p_user AND role IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER');

  IF p_chuc_vu IN ('TO_TRUONG', 'TO_PHO') THEN
    -- Mỗi tổ một tổ trưởng, tối đa một tổ phó: người đang giữ chức đó (trừ quản trị, Ban giám hiệu) về làm thành viên
    FOR x IN SELECT m.user_id FROM public.professional_group_members m WHERE m.group_id = g AND m.user_id <> p_user LOOP
      IF public.chuc_vu_trong_to(x.user_id, p_khoi) = p_chuc_vu THEN
        DELETE FROM public.user_roles ur WHERE ur.user_id = x.user_id
          AND ur.role = CASE p_chuc_vu WHEN 'TO_TRUONG' THEN 'GROUP_LEADER' ELSE 'DEPUTY_GROUP_LEADER' END
          AND (ur.pham_vi_khoi = p_khoi OR ur.pham_vi_khoi IS NULL);
        UPDATE public.profiles SET role = 'TEACHER' WHERE id = x.user_id
          AND role = CASE p_chuc_vu WHEN 'TO_TRUONG' THEN 'GROUP_LEADER' ELSE 'DEPUTY_GROUP_LEADER' END;
        UPDATE public.professional_group_members SET role_in_group = 'MEMBER' WHERE group_id = g AND user_id = x.user_id;
      END IF;
    END LOOP;
    INSERT INTO public.user_roles (organization_id, user_id, role, pham_vi_khoi, ly_do, granted_by)
    VALUES (org, p_user, CASE p_chuc_vu WHEN 'TO_TRUONG' THEN 'GROUP_LEADER' ELSE 'DEPUTY_GROUP_LEADER' END, p_khoi,
            CASE p_chuc_vu WHEN 'TO_TRUONG' THEN 'Bổ nhiệm tổ trưởng khối ' ELSE 'Bổ nhiệm tổ phó khối ' END || p_khoi, auth.uid());
  END IF;

  UPDATE public.professional_group_members SET role_in_group = CASE p_chuc_vu WHEN 'TO_TRUONG' THEN 'LEADER' WHEN 'TO_PHO' THEN 'DEPUTY_LEADER' ELSE 'MEMBER' END
    WHERE group_id = g AND user_id = p_user;
  UPDATE public.professional_groups SET
    leader_user_id = CASE WHEN p_chuc_vu = 'TO_TRUONG' THEN p_user WHEN leader_user_id = p_user THEN NULL ELSE leader_user_id END,
    deputy_leader_user_id = CASE WHEN p_chuc_vu = 'TO_PHO' THEN p_user WHEN deputy_leader_user_id = p_user THEN NULL ELSE deputy_leader_user_id END
    WHERE id = g;
  -- Phụ trách môn của người thôi chức tổ phó/tổ trưởng vẫn giữ: tổ trưởng tự giao lại nếu cần.
END $$;
REVOKE ALL ON FUNCTION public.dat_chuc_vu_to(SMALLINT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dat_chuc_vu_to(SMALLINT, UUID, TEXT) TO authenticated;

-- ============================================================================
-- 4. Người phụ trách duyệt cấp tổ theo môn
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.to_phu_trach_mon (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL CHECK (khoi BETWEEN 1 AND 5),
  ma_mon VARCHAR(40) NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  giao_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, khoi, ma_mon)
);
ALTER TABLE public.to_phu_trach_mon ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS to_phu_trach_mon_select ON public.to_phu_trach_mon;
CREATE POLICY to_phu_trach_mon_select ON public.to_phu_trach_mon FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());
GRANT SELECT ON public.to_phu_trach_mon TO authenticated;
REVOKE ALL ON public.to_phu_trach_mon FROM anon;
DROP TRIGGER IF EXISTS trg_log_to_phu_trach_mon ON public.to_phu_trach_mon;
CREATE TRIGGER trg_log_to_phu_trach_mon AFTER INSERT OR UPDATE OR DELETE ON public.to_phu_trach_mon
  FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_thay_doi();

CREATE OR REPLACE FUNCTION public.giao_phu_trach_mon(p_khoi SMALLINT, p_mon TEXT, p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id();
BEGIN
  IF auth.uid() IS NULL OR NOT public.co_vai_tro('GROUP_LEADER', p_khoi) THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng của tổ này hoặc quản trị mới giao môn phụ trách.';
  END IF;
  IF p_mon IS NULL OR btrim(p_mon) = '' THEN RAISE EXCEPTION 'Chưa chọn môn.'; END IF;
  IF p_user IS NULL THEN
    DELETE FROM public.to_phu_trach_mon WHERE organization_id = org AND khoi = p_khoi AND ma_mon = p_mon;
    RETURN;
  END IF;
  IF NOT public.la_thanh_vien_to(p_user, p_khoi) AND NOT public.user_co_vai_tro_that(p_user, 'GROUP_LEADER', p_khoi) THEN
    RAISE EXCEPTION 'Người phụ trách phải là thành viên tổ khối %.', p_khoi;
  END IF;
  IF NOT public.user_co_quyen_gv(p_user, 'DUYET_CAP_TO', p_khoi) THEN
    RAISE EXCEPTION 'Người này chưa có quyền "Duyệt cấp tổ". Hãy tích quyền đó trước.';
  END IF;
  INSERT INTO public.to_phu_trach_mon (organization_id, khoi, ma_mon, user_id, giao_boi) VALUES (org, p_khoi, p_mon, p_user, auth.uid())
  ON CONFLICT (organization_id, khoi, ma_mon) DO UPDATE SET user_id = EXCLUDED.user_id, giao_boi = EXCLUDED.giao_boi, tao_luc = now();
END $$;
REVOKE ALL ON FUNCTION public.giao_phu_trach_mon(SMALLINT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.giao_phu_trach_mon(SMALLINT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.phu_trach_mon(p_uid UUID, p_khoi SMALLINT, p_mon TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.to_phu_trach_mon t WHERE t.organization_id = public.get_auth_user_org_id()
    AND t.khoi = p_khoi AND t.ma_mon = p_mon AND t.user_id = p_uid)
    AND public.user_co_quyen_gv(p_uid, 'DUYET_CAP_TO', p_khoi)
$$;
GRANT EXECUTE ON FUNCTION public.phu_trach_mon(UUID, SMALLINT, TEXT) TO authenticated;

-- ============================================================================
-- 5. Đề: trạng thái "Đã duyệt chéo", số đề chính
-- ============================================================================
ALTER TABLE public.de_kiem_tra DROP CONSTRAINT IF EXISTS de_kiem_tra_trang_thai_check;
ALTER TABLE public.de_kiem_tra ADD CONSTRAINT de_kiem_tra_trang_thai_check CHECK (trang_thai::TEXT IN (
  'BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI', 'SAN_SANG_DUYET', 'DANG_THAM_DINH', 'DA_DUYET_CHEO', 'TRA_LAI',
  'DA_XAC_NHAN_TO', 'CHO_BGH_DUYET', 'DA_DUYET', 'DA_PHAT_HANH', 'DA_LUU_TRU'));
ALTER TABLE public.de_kiem_tra ADD COLUMN IF NOT EXISTS so_de_chinh SMALLINT CHECK (so_de_chinh BETWEEN 1 AND 3);

-- Số đề chính chỉ đặt qua hàm chọn đề chính hoặc quy trình
CREATE OR REPLACE FUNCTION public.guard_so_de_chinh()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR COALESCE(current_setting('app.cho_phep_chuyen', true), '') = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.so_de_chinh IS NOT NULL THEN RAISE EXCEPTION 'Không đặt số đề chính khi tạo đề.'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.so_de_chinh IS DISTINCT FROM OLD.so_de_chinh THEN RAISE EXCEPTION 'Số đề chính chỉ đặt qua bước chọn đề nộp Ban giám hiệu.'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_so_de_chinh() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_so_de_chinh ON public.de_kiem_tra;
CREATE TRIGGER trg_guard_so_de_chinh BEFORE INSERT OR UPDATE ON public.de_kiem_tra FOR EACH ROW EXECUTE FUNCTION public.guard_so_de_chinh();

-- Xem đề: thêm người phụ trách môn và tổ phó (đề đã gửi của khối)
CREATE OR REPLACE FUNCTION public.duoc_xem_de(p_id UUID, p_org UUID, p_khoi SMALLINT, p_owner UUID, p_state TEXT, p_scope TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_org = public.get_auth_user_org_id() AND (
    p_owner = auth.uid()
    OR EXISTS (SELECT 1 FROM public.de_chia_se c WHERE c.de_id = p_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.de_phan_cong pc WHERE pc.de_id = p_id AND pc.nguoi_tham_dinh = auth.uid() AND pc.hieu_luc)
    OR public.co_vai_tro('GROUP_LEADER', p_khoi)
    OR (public.la_bgh(p_khoi) AND p_state NOT IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI'))
    OR (p_state NOT IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI')
        AND (public.user_co_vai_tro_that(auth.uid(), 'DEPUTY_GROUP_LEADER', p_khoi)
             OR EXISTS (SELECT 1 FROM public.de_kiem_tra d JOIN public.to_phu_trach_mon t ON t.organization_id = d.organization_id AND t.khoi = d.khoi AND t.ma_mon = d.ma_mon
                        WHERE d.id = p_id AND t.user_id = auth.uid())))
    OR (p_state = 'DA_PHAT_HANH' AND public.co_quyen_chuyen_mon())
    OR (p_scope = 'TRUONG' AND public.co_quyen_chuyen_mon())
    OR (p_scope = 'TO' AND public.co_quyen_chuyen_mon(p_khoi))
  )
$$;

-- ============================================================================
-- 6. Quy trình: một nơi quyết định ai được làm gì
-- ============================================================================
CREATE OR REPLACE FUNCTION public.phan_tich_quyen_de(p_de UUID, p_hd TEXT, OUT loi TEXT, OUT vai_tro TEXT, OUT den TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.de_kiem_tra%ROWTYPE;
  uid UUID := auth.uid();
  k SMALLINT;
  chu BOOLEAN; pc BOOLEAN; tt BOOLEAN; pt BOOLEAN; bgh BOOLEAN; uq UUID;
  drafts TEXT[] := ARRAY['BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI'];
  lan_gui TIMESTAMPTZ;
  cung_nguoi BOOLEAN;
BEGIN
  IF uid IS NULL THEN loi := 'Cần đăng nhập.'; RETURN; END IF;
  SELECT * INTO r FROM public.de_kiem_tra WHERE id = p_de;
  IF NOT FOUND THEN loi := 'Không tìm thấy đề.'; RETURN; END IF;
  IF r.organization_id IS DISTINCT FROM public.get_auth_user_org_id() THEN loi := 'Đề thuộc trường khác.'; RETURN; END IF;
  k := r.khoi;
  chu := r.created_by = uid;
  pc := EXISTS (SELECT 1 FROM public.de_phan_cong x WHERE x.de_id = p_de AND x.nguoi_tham_dinh = uid AND x.hieu_luc) AND public.user_co_quyen_gv(uid, 'THAM_DINH', r.khoi);
  tt := public.co_vai_tro('GROUP_LEADER', k);
  pt := public.phu_trach_mon(uid, k, r.ma_mon);
  bgh := public.la_bgh(k);
  uq := public.id_uy_quyen(p_hd, k);

  IF p_hd = 'GUI_THAM_DINH' THEN
    IF NOT chu THEN loi := 'Chỉ người tạo đề mới gửi kiểm tra.'; RETURN; END IF;
    IF NOT (r.trang_thai = ANY (drafts) OR r.trang_thai = 'TRA_LAI') THEN loi := 'Đề đang ở bước khác, không gửi được.'; RETURN; END IF;
    vai_tro := 'CHU_DE'; den := 'SAN_SANG_DUYET'; RETURN;
  ELSIF p_hd = 'THU_HOI_VE_NHAP' THEN
    IF NOT chu THEN loi := 'Chỉ người tạo đề mới thu hồi về bản nháp.'; RETURN; END IF;
    IF r.trang_thai NOT IN ('SAN_SANG_DUYET', 'DANG_THAM_DINH') THEN loi := 'Chỉ thu hồi được đề đang chờ hoặc đang kiểm tra.'; RETURN; END IF;
    vai_tro := 'CHU_DE'; den := 'CAN_KIEM_TRA_LAI'; RETURN;
  ELSIF p_hd = 'TAO_PHIEN_BAN_MOI' THEN
    IF NOT chu THEN loi := 'Chỉ người tạo đề mới tạo phiên bản mới.'; RETURN; END IF;
    IF r.trang_thai NOT IN ('DA_DUYET', 'DA_PHAT_HANH') THEN loi := 'Chỉ tạo phiên bản mới từ đề đã duyệt hoặc đã phát hành.'; RETURN; END IF;
    vai_tro := 'CHU_DE'; den := 'CAN_KIEM_TRA_LAI'; RETURN;
  END IF;

  -- Không ai tự kiểm tra, duyệt, xác nhận đề do chính mình soạn (kể cả quản trị)
  IF p_hd IN ('BAT_DAU_THAM_DINH', 'DE_NGHI_DAT', 'DUYET_CHEO', 'YEU_CAU_CHINH_SUA', 'XAC_NHAN_TO', 'CHUYEN_BGH', 'PHE_DUYET') AND chu THEN
    loi := 'Không được tự kiểm tra, duyệt hoặc xác nhận đề do chính mình soạn. Cần người khác.'; RETURN;
  END IF;

  IF p_hd = 'BAT_DAU_THAM_DINH' THEN
    IF r.trang_thai <> 'SAN_SANG_DUYET' THEN loi := 'Đề không ở trạng thái chờ kiểm tra.'; RETURN; END IF;
    IF pc THEN vai_tro := 'THAM_DINH_PHAN_CONG'; ELSIF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH';
    ELSE loi := 'Bạn không được phân công kiểm tra đề này.'; RETURN; END IF;
    den := 'DANG_THAM_DINH';
  ELSIF p_hd = 'DE_NGHI_DAT' THEN
    IF r.trang_thai <> 'DANG_THAM_DINH' THEN loi := 'Đề không ở trạng thái đang kiểm tra.'; RETURN; END IF;
    IF pc THEN vai_tro := 'THAM_DINH_PHAN_CONG'; ELSIF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq;
    ELSE loi := 'Bạn không được phân công kiểm tra đề này.'; RETURN; END IF;
    den := 'DANG_THAM_DINH';
  ELSIF p_hd = 'DUYET_CHEO' THEN
    IF r.trang_thai NOT IN ('SAN_SANG_DUYET', 'DANG_THAM_DINH') THEN loi := 'Đề không ở bước kiểm tra chéo.'; RETURN; END IF;
    IF NOT pc THEN loi := 'Chỉ người được phân công kiểm tra chéo đề này mới duyệt chéo.'; RETURN; END IF;
    vai_tro := 'THAM_DINH_PHAN_CONG'; den := 'DA_DUYET_CHEO';
  ELSIF p_hd = 'YEU_CAU_CHINH_SUA' THEN
    IF r.trang_thai IN ('SAN_SANG_DUYET', 'DANG_THAM_DINH') THEN
      IF pc THEN vai_tro := 'THAM_DINH_PHAN_CONG'; ELSIF tt THEN vai_tro := 'TO_TRUONG'; ELSIF pt THEN vai_tro := 'PHU_TRACH_MON'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH';
      ELSE loi := 'Bạn không được phân công kiểm tra đề này.'; RETURN; END IF;
    ELSIF r.trang_thai IN ('DA_DUYET_CHEO', 'DA_XAC_NHAN_TO', 'CHO_BGH_DUYET') THEN
      IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF pt THEN vai_tro := 'PHU_TRACH_MON'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH';
      ELSE loi := 'Chỉ tổ trưởng, người phụ trách môn hoặc Ban giám hiệu mới yêu cầu chỉnh sửa ở bước này.'; RETURN; END IF;
    ELSE loi := 'Đề không ở bước được yêu cầu chỉnh sửa.'; RETURN; END IF;
    den := 'TRA_LAI';
  ELSIF p_hd = 'XAC_NHAN_TO' THEN
    IF r.trang_thai NOT IN ('DA_DUYET_CHEO', 'SAN_SANG_DUYET', 'DANG_THAM_DINH') THEN loi := 'Đề chưa ở bước duyệt cấp tổ.'; RETURN; END IF;
    -- Người phụ trách môn chỉ duyệt đề đã qua kiểm tra chéo; tổ trưởng duyệt thẳng được khi cần.
    IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF pt AND r.trang_thai = 'DA_DUYET_CHEO' THEN vai_tro := 'PHU_TRACH_MON'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH_NGOAI_LE';
    ELSIF pt THEN loi := 'Đề cần được kiểm tra chéo và duyệt chéo trước khi duyệt cấp tổ.'; RETURN;
    ELSE loi := 'Chỉ tổ trưởng, người phụ trách môn (hoặc người được ủy quyền) mới duyệt cấp tổ.'; RETURN; END IF;
    den := 'DA_XAC_NHAN_TO';
  ELSIF p_hd = 'CHUYEN_BGH' THEN
    IF r.trang_thai <> 'DA_XAC_NHAN_TO' THEN loi := 'Đề cần được duyệt cấp tổ trước.'; RETURN; END IF;
    IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF pt THEN vai_tro := 'PHU_TRACH_MON'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH_NGOAI_LE';
    ELSE loi := 'Chỉ tổ trưởng hoặc người phụ trách môn mới chuyển đề lên Ban giám hiệu.'; RETURN; END IF;
    den := 'CHO_BGH_DUYET';
  ELSIF p_hd = 'PHE_DUYET' THEN
    IF r.trang_thai <> 'CHO_BGH_DUYET' THEN loi := 'Đề chưa ở bước chờ Ban giám hiệu phê duyệt.'; RETURN; END IF;
    IF NOT bgh THEN loi := 'Chỉ Ban giám hiệu mới phê duyệt cuối cùng.'; RETURN; END IF;
    SELECT max(tao_luc) INTO lan_gui FROM public.de_lich_su WHERE de_id = p_de AND hanh_dong = 'GUI_THAM_DINH';
    SELECT EXISTS (SELECT 1 FROM public.de_lich_su h WHERE h.de_id = p_de AND h.nguoi_thuc_hien = uid AND h.hanh_dong IN ('XAC_NHAN_TO', 'CHUYEN_BGH') AND h.tao_luc >= COALESCE(lan_gui, '-infinity'::TIMESTAMPTZ)) INTO cung_nguoi;
    IF cung_nguoi THEN loi := 'Bạn đã duyệt đề này ở cấp tổ, cần một thành viên Ban giám hiệu khác phê duyệt cuối cùng.'; RETURN; END IF;
    vai_tro := 'BGH'; den := 'DA_DUYET';
  ELSIF p_hd = 'PHAT_HANH' THEN
    IF NOT bgh THEN loi := 'Chỉ Ban giám hiệu mới cho phát hành đề.'; RETURN; END IF;
    IF r.trang_thai <> 'DA_DUYET' THEN loi := 'Chỉ phát hành đề đã được phê duyệt.'; RETURN; END IF;
    vai_tro := 'BGH'; den := 'DA_PHAT_HANH';
  ELSIF p_hd = 'THU_HOI_DE' THEN
    IF NOT bgh THEN loi := 'Chỉ Ban giám hiệu mới thu hồi đề đã duyệt hoặc đã phát hành.'; RETURN; END IF;
    IF r.trang_thai NOT IN ('DA_DUYET', 'DA_PHAT_HANH') THEN loi := 'Chỉ thu hồi đề đã duyệt hoặc đã phát hành.'; RETURN; END IF;
    vai_tro := 'BGH'; den := 'TRA_LAI';
  ELSIF p_hd = 'LUU_TRU' THEN
    IF NOT bgh THEN loi := 'Chỉ Ban giám hiệu mới lưu trữ đề.'; RETURN; END IF;
    IF r.trang_thai NOT IN ('DA_DUYET', 'DA_PHAT_HANH') THEN loi := 'Chỉ lưu trữ đề đã duyệt hoặc đã phát hành.'; RETURN; END IF;
    vai_tro := 'BGH'; den := 'DA_LUU_TRU';
  ELSE
    loi := 'Thao tác không hợp lệ.';
  END IF;
END $$;

-- Nút hiện cho người dùng. Bỏ "Chuyển lên BGH" từng đề: tổ nộp BGH bằng bước chọn đề chính.
CREATE OR REPLACE FUNCTION public.hanh_dong_cho_phep(p_de UUID)
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(h), ARRAY[]::TEXT[]) FROM unnest(ARRAY[
    'GUI_THAM_DINH', 'THU_HOI_VE_NHAP', 'TAO_PHIEN_BAN_MOI', 'BAT_DAU_THAM_DINH', 'DE_NGHI_DAT', 'DUYET_CHEO', 'YEU_CAU_CHINH_SUA',
    'XAC_NHAN_TO', 'PHE_DUYET', 'PHAT_HANH', 'THU_HOI_DE', 'LUU_TRU']) AS h
  WHERE (public.phan_tich_quyen_de(p_de, h)).loi IS NULL
$$;

-- Chuyển trạng thái: như cũ, thêm bỏ số đề chính khi đề bị trả lại hoặc về nháp.
CREATE OR REPLACE FUNCTION public.chuyen_trang_thai_de(p_de UUID, p_hanh_dong TEXT, p_ghi_chu TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  a RECORD; r public.de_kiem_tra%ROWTYPE; uid UUID := auth.uid(); ten TEXT;
  note TEXT := NULLIF(btrim(COALESCE(p_ghi_chu, '')), '');
  pb INTEGER := NULL; truoc RECORD; moi_ban BOOLEAN := false;
BEGIN
  SELECT * INTO a FROM public.phan_tich_quyen_de(p_de, p_hanh_dong);
  IF a.loi IS NOT NULL THEN RAISE EXCEPTION '%', a.loi; END IF;
  IF p_hanh_dong IN ('YEU_CAU_CHINH_SUA', 'THU_HOI_DE') AND note IS NULL THEN
    RAISE EXCEPTION 'Cần ghi lý do hoặc nhận xét cụ thể để người soạn biết sửa gì.';
  END IF;
  SELECT * INTO r FROM public.de_kiem_tra WHERE id = p_de FOR UPDATE;
  SELECT full_name INTO ten FROM public.profiles WHERE id = uid;

  PERFORM set_config('app.cho_phep_chuyen', 'on', true);

  IF p_hanh_dong = 'PHE_DUYET' THEN
    SELECT phien_ban, dac_ta_id, du_lieu INTO truoc FROM public.de_da_duyet WHERE de_id = p_de ORDER BY phien_ban DESC LIMIT 1;
    IF truoc.phien_ban IS NOT NULL AND truoc.dac_ta_id = r.dac_ta_id AND truoc.du_lieu = r.du_lieu THEN
      pb := truoc.phien_ban;
    ELSE
      pb := COALESCE(truoc.phien_ban, 0) + 1; moi_ban := true;
      INSERT INTO public.de_da_duyet (organization_id, khoi, ma_mon, ky_kiem_tra, phien_ban, dac_ta_id, phien_ban_dac_ta, du_lieu, duyet_boi, duyet_luc, ghi_chu, de_id)
      VALUES (r.organization_id, r.khoi, r.ma_mon, r.ky_kiem_tra, pb, r.dac_ta_id, r.phien_ban_dac_ta, r.du_lieu, uid, now(), note, p_de);
    END IF;
    UPDATE public.de_kiem_tra SET trang_thai = a.den, duyet_boi = uid, duyet_luc = now(), ghi_chu_duyet = note, updated_by = uid WHERE id = p_de;
  ELSIF p_hanh_dong IN ('YEU_CAU_CHINH_SUA', 'THU_HOI_DE') THEN
    UPDATE public.de_kiem_tra SET trang_thai = a.den, duyet_boi = uid, duyet_luc = now(), ghi_chu_duyet = note, updated_by = uid WHERE id = p_de;
    INSERT INTO public.de_nhan_xet (organization_id, de_id, tac_gia, ten_tac_gia, thanh_phan, noi_dung)
    VALUES (r.organization_id, p_de, uid, ten, 'CHUNG', left(note, 2000));
  ELSIF p_hanh_dong IN ('GUI_THAM_DINH', 'THU_HOI_VE_NHAP', 'TAO_PHIEN_BAN_MOI') THEN
    UPDATE public.de_kiem_tra SET trang_thai = a.den, duyet_boi = NULL, duyet_luc = NULL, ghi_chu_duyet = NULL, updated_by = uid WHERE id = p_de;
  ELSIF p_hanh_dong = 'DE_NGHI_DAT' THEN
    NULL;
  ELSE
    UPDATE public.de_kiem_tra SET trang_thai = a.den, updated_by = uid WHERE id = p_de;
  END IF;
  IF a.den IN ('TRA_LAI', 'CAN_KIEM_TRA_LAI') THEN
    UPDATE public.de_kiem_tra SET so_de_chinh = NULL WHERE id = p_de AND so_de_chinh IS NOT NULL;
  END IF;

  PERFORM set_config('app.cho_phep_chuyen', 'off', true);

  INSERT INTO public.de_lich_su (organization_id, de_id, khoi, ma_mon, ky_kiem_tra, hanh_dong, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, ten_nguoi, vai_tro_su_dung, ghi_chu, phien_ban_duyet)
  VALUES (r.organization_id, p_de, r.khoi, r.ma_mon, r.ky_kiem_tra, p_hanh_dong, r.trang_thai, a.den, uid, ten, a.vai_tro, note, pb);

  RETURN jsonb_build_object('trang_thai', a.den, 'phien_ban', pb, 'tao_phien_ban_moi', moi_ban);
END $$;

-- ============================================================================
-- 7. Phân công kiểm tra chéo xoay vòng (người này kiểm đề người kia, lần lượt cả tổ)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.phan_cong_xoay_vong(p_khoi SMALLINT, p_mon TEXT, p_ky TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); ids UUID[]; tg UUID[]; n INT; i INT; nguoi UUID; kq JSONB := '[]'::JSONB; ten_tg TEXT; ten_kt TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.co_vai_tro('GROUP_LEADER', p_khoi) OR public.user_co_quyen_gv(auth.uid(), 'PHAN_CONG_CHEO', p_khoi)) THEN
    RAISE EXCEPTION 'Bạn chưa có quyền phân công kiểm tra chéo.';
  END IF;
  SELECT array_agg(d.id ORDER BY p.full_name, d.created_at), array_agg(d.created_by ORDER BY p.full_name, d.created_at) INTO ids, tg
  FROM public.de_kiem_tra d JOIN public.profiles p ON p.id = d.created_by
  WHERE d.organization_id = org AND d.khoi = p_khoi AND d.ma_mon = p_mon AND d.ky_kiem_tra = p_ky
    AND d.trang_thai NOT IN ('DA_DUYET', 'DA_PHAT_HANH', 'DA_LUU_TRU');
  n := COALESCE(array_length(ids, 1), 0);
  IF n < 2 THEN RAISE EXCEPTION 'Cần ít nhất 2 đề của 2 giáo viên khác nhau mới phân công kiểm tra chéo được.'; END IF;
  FOR i IN 1..n LOOP
    nguoi := tg[(i % n) + 1];
    UPDATE public.de_phan_cong SET hieu_luc = false WHERE de_id = ids[i] AND nguoi_tham_dinh <> nguoi AND hieu_luc;
    INSERT INTO public.de_phan_cong (organization_id, de_id, nguoi_tham_dinh, giao_boi, hieu_luc) VALUES (org, ids[i], nguoi, auth.uid(), true)
    ON CONFLICT (de_id, nguoi_tham_dinh) DO UPDATE SET hieu_luc = true, giao_boi = EXCLUDED.giao_boi, tao_luc = now();
    SELECT full_name INTO ten_tg FROM public.profiles WHERE id = tg[i];
    SELECT full_name INTO ten_kt FROM public.profiles WHERE id = nguoi;
    kq := kq || jsonb_build_object('de', ids[i], 'nguoiSoan', ten_tg, 'nguoiKiemTra', ten_kt, 'coQuyen', public.user_co_quyen_gv(nguoi, 'THAM_DINH', p_khoi));
  END LOOP;
  RETURN kq;
END $$;
REVOKE ALL ON FUNCTION public.phan_cong_xoay_vong(SMALLINT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.phan_cong_xoay_vong(SMALLINT, TEXT, TEXT) TO authenticated;

-- Phân công tay: thêm người có quyền phân công kiểm tra chéo
DROP POLICY IF EXISTS de_phan_cong_insert ON public.de_phan_cong;
CREATE POLICY de_phan_cong_insert ON public.de_phan_cong FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND giao_boi = auth.uid()
    AND EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = de_phan_cong.de_id AND d.organization_id = de_phan_cong.organization_id
      AND d.created_by IS DISTINCT FROM de_phan_cong.nguoi_tham_dinh
      AND (public.co_vai_tro('GROUP_LEADER', d.khoi) OR public.la_bgh(d.khoi) OR public.user_co_quyen_gv(auth.uid(), 'PHAN_CONG_CHEO', d.khoi))
      AND public.user_co_quyen_gv(de_phan_cong.nguoi_tham_dinh, 'THAM_DINH', d.khoi))
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = de_phan_cong.nguoi_tham_dinh AND p.organization_id = de_phan_cong.organization_id AND COALESCE(p.is_active, true)));
DROP POLICY IF EXISTS de_phan_cong_update ON public.de_phan_cong;
CREATE POLICY de_phan_cong_update ON public.de_phan_cong FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = de_phan_cong.de_id
    AND (public.co_vai_tro('GROUP_LEADER', d.khoi) OR public.la_bgh(d.khoi) OR public.user_co_quyen_gv(auth.uid(), 'PHAN_CONG_CHEO', d.khoi))))
  WITH CHECK (organization_id = public.get_auth_user_org_id());

-- ============================================================================
-- 8. Chọn đề chính (tối đa 3 mỗi môn, kì) nộp Ban giám hiệu
-- ============================================================================
CREATE OR REPLACE FUNCTION public.chon_de_chinh(p_khoi SMALLINT, p_mon TEXT, p_ky TEXT, p_ds UUID[])
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); uid UUID := auth.uid(); ten TEXT; vt TEXT; da_co INT; so INT; i INT; r public.de_kiem_tra%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập.'; END IF;
  IF public.co_vai_tro('GROUP_LEADER', p_khoi) THEN vt := 'TO_TRUONG';
  ELSIF public.phu_trach_mon(uid, p_khoi, p_mon) THEN vt := 'PHU_TRACH_MON';
  ELSE RAISE EXCEPTION 'Chỉ tổ trưởng hoặc người phụ trách môn mới chọn đề nộp Ban giám hiệu.'; END IF;
  IF p_ds IS NULL OR cardinality(p_ds) = 0 THEN RAISE EXCEPTION 'Chưa chọn đề nào.'; END IF;
  IF cardinality(p_ds) <> (SELECT count(DISTINCT x) FROM unnest(p_ds) x) THEN RAISE EXCEPTION 'Danh sách có đề trùng.'; END IF;
  SELECT count(*), COALESCE(max(so_de_chinh), 0) INTO da_co, so FROM public.de_kiem_tra
    WHERE organization_id = org AND khoi = p_khoi AND ma_mon = p_mon AND ky_kiem_tra = p_ky AND so_de_chinh IS NOT NULL;
  IF da_co + cardinality(p_ds) > 3 THEN
    RAISE EXCEPTION 'Mỗi môn, kì nộp tối đa 3 đề chính. Đã nộp % đề.', da_co;
  END IF;
  SELECT full_name INTO ten FROM public.profiles WHERE id = uid;
  FOR i IN 1..cardinality(p_ds) LOOP
    SELECT * INTO r FROM public.de_kiem_tra WHERE id = p_ds[i] FOR UPDATE;
    IF NOT FOUND OR r.organization_id <> org OR r.khoi <> p_khoi OR r.ma_mon <> p_mon OR r.ky_kiem_tra <> p_ky THEN
      RAISE EXCEPTION 'Có đề không thuộc môn, kì này.';
    END IF;
    IF r.trang_thai <> 'DA_XAC_NHAN_TO' THEN RAISE EXCEPTION 'Đề % chưa được duyệt cấp tổ.', r.ma_de; END IF;
    so := so + 1;
    PERFORM set_config('app.cho_phep_chuyen', 'on', true);
    UPDATE public.de_kiem_tra SET trang_thai = 'CHO_BGH_DUYET', so_de_chinh = so, updated_by = uid WHERE id = r.id;
    PERFORM set_config('app.cho_phep_chuyen', 'off', true);
    INSERT INTO public.de_lich_su (organization_id, de_id, khoi, ma_mon, ky_kiem_tra, hanh_dong, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, ten_nguoi, vai_tro_su_dung, ghi_chu)
    VALUES (org, r.id, r.khoi, r.ma_mon, r.ky_kiem_tra, 'CHON_DE_CHINH', r.trang_thai, 'CHO_BGH_DUYET', uid, ten, vt, 'Đề chính số ' || so);
  END LOOP;
  RETURN cardinality(p_ds);
END $$;
REVOKE ALL ON FUNCTION public.chon_de_chinh(SMALLINT, TEXT, TEXT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chon_de_chinh(SMALLINT, TEXT, TEXT, UUID[]) TO authenticated;
