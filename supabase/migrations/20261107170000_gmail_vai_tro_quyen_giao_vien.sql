-- ============================================================================
-- PHẦN A. Quyền giáo viên theo tổ + Ban giám hiệu thuần chỉ có chức năng BGH
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quyen_giao_vien (
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quyen TEXT NOT NULL CHECK (quyen IN ('SOAN_DE', 'THAM_DINH', 'SUA_MA_TRAN_DAC_TA', 'NAP_MUC_LUC_SACH')),
  duoc BOOLEAN NOT NULL,
  cap_boi UUID,
  cap_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quyen)
);
ALTER TABLE public.quyen_giao_vien ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quyen_giao_vien_select ON public.quyen_giao_vien;
CREATE POLICY quyen_giao_vien_select ON public.quyen_giao_vien FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (organization_id = public.get_auth_user_org_id() AND (public.co_vai_tro('SYSTEM_ADMIN') OR public.co_vai_tro('GROUP_LEADER') OR public.la_bgh())));
GRANT SELECT ON public.quyen_giao_vien TO authenticated;
REVOKE ALL ON public.quyen_giao_vien FROM anon;

CREATE TABLE IF NOT EXISTS public.quyen_gv_nhat_ky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nguoi_thuc_hien UUID,
  doi_tuong UUID NOT NULL,
  khoi SMALLINT,
  quyen_truoc JSONB,
  quyen_sau JSONB,
  luc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
DROP TRIGGER IF EXISTS trg_quyen_gv_nhat_ky_chi_them ON public.quyen_gv_nhat_ky;
CREATE TRIGGER trg_quyen_gv_nhat_ky_chi_them BEFORE UPDATE OR DELETE ON public.quyen_gv_nhat_ky
  FOR EACH ROW EXECUTE FUNCTION public.guard_chi_them();
ALTER TABLE public.quyen_gv_nhat_ky ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quyen_gv_nhat_ky_select ON public.quyen_gv_nhat_ky;
CREATE POLICY quyen_gv_nhat_ky_select ON public.quyen_gv_nhat_ky FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (public.co_vai_tro('SYSTEM_ADMIN') OR public.co_vai_tro('GROUP_LEADER') OR public.la_bgh()));
GRANT SELECT ON public.quyen_gv_nhat_ky TO authenticated;
REVOKE ALL ON public.quyen_gv_nhat_ky FROM anon;

-- Một người có quyền gì: lãnh đạo tổ, Ban giám hiệu cũ, quản trị luôn có; giáo viên thì theo bảng tích (mặc định chỉ được soạn đề).
CREATE OR REPLACE FUNCTION public.user_co_quyen_gv(p_user UUID, p_quyen TEXT, p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE ex BOOLEAN;
BEGIN
  IF public.user_co_vai_tro(p_user, 'GROUP_LEADER', p_khoi) OR public.user_co_vai_tro(p_user, 'DEPUTY_GROUP_LEADER', p_khoi)
     OR public.user_co_vai_tro(p_user, 'SCHOOL_ADMIN', p_khoi) THEN RETURN true; END IF;
  IF p_quyen <> 'SOAN_DE' AND public.user_co_vai_tro(p_user, 'SYSTEM_ADMIN', NULL) THEN RETURN true; END IF;
  IF public.user_co_vai_tro(p_user, 'TEACHER', p_khoi) THEN
    SELECT q.duoc INTO ex FROM public.quyen_giao_vien q WHERE q.user_id = p_user AND q.quyen = p_quyen;
    RETURN COALESCE(ex, p_quyen = 'SOAN_DE');
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.co_quyen_gv(p_quyen TEXT, p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.user_co_quyen_gv(auth.uid(), p_quyen, p_khoi) $$;

-- Dùng trong chính sách ghi dữ liệu chung của tổ: vai trò cao nhất như cũ, hoặc giáo viên được tích quyền.
CREATE OR REPLACE FUNCTION public.co_quyen_ghi(p_quyen TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
      OR (public.get_auth_user_role() = 'TEACHER' AND public.user_co_quyen_gv(auth.uid(), p_quyen, NULL))
$$;

CREATE OR REPLACE FUNCTION public.quyen_gv_cua_toi()
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(array_agg(q), ARRAY[]::TEXT[]) FROM unnest(ARRAY['SOAN_DE', 'THAM_DINH', 'SUA_MA_TRAN_DAC_TA', 'NAP_MUC_LUC_SACH']) q WHERE public.co_quyen_gv(q) $$;

GRANT EXECUTE ON FUNCTION public.co_quyen_gv(TEXT, SMALLINT), public.co_quyen_ghi(TEXT), public.quyen_gv_cua_toi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_co_quyen_gv(UUID, TEXT, SMALLINT) TO authenticated;

-- Ban giám hiệu chỉ có vai trò BGH thì không còn quyền của giáo viên hay tổ trưởng.
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN 'SYSTEM_ADMIN' = ANY (r) THEN 'SYSTEM_ADMIN'
    WHEN 'SCHOOL_ADMIN' = ANY (r) THEN 'SCHOOL_ADMIN'
    WHEN 'GROUP_LEADER' = ANY (r) THEN 'GROUP_LEADER'
    WHEN 'DEPUTY_GROUP_LEADER' = ANY (r) THEN 'DEPUTY_GROUP_LEADER'
    WHEN 'TEACHER' = ANY (r) THEN 'TEACHER'
    WHEN 'SCHOOL_LEADERSHIP' = ANY (r) THEN 'SCHOOL_LEADERSHIP'
    ELSE NULL
  END
  FROM (SELECT public.vai_tro_cua_toi() AS r) x
$$;
-- ============================================================================
-- PHẦN B. Chặn ở cơ sở dữ liệu theo từng quyền
-- ============================================================================
-- Soạn đề: giáo viên bị bỏ tích thì không tạo được đề mới; Ban giám hiệu thuần không soạn đề.
DROP POLICY IF EXISTS de_kiem_tra_insert ON public.de_kiem_tra;
CREATE POLICY de_kiem_tra_insert ON public.de_kiem_tra FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND created_by = auth.uid()
    AND public.co_quyen_chuyen_mon(khoi) AND public.user_co_quyen_gv(auth.uid(), 'SOAN_DE', khoi));

-- Thẩm định: chỉ phân công được người có quyền thẩm định; phân công cũ của người mất quyền không còn hiệu lực.
DROP POLICY IF EXISTS de_phan_cong_insert ON public.de_phan_cong;
CREATE POLICY de_phan_cong_insert ON public.de_phan_cong FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND giao_boi = auth.uid()
    AND EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = de_phan_cong.de_id AND d.organization_id = de_phan_cong.organization_id
      AND d.created_by IS DISTINCT FROM de_phan_cong.nguoi_tham_dinh
      AND (public.co_vai_tro('GROUP_LEADER', d.khoi) OR public.la_bgh(d.khoi))
      AND public.user_co_quyen_gv(de_phan_cong.nguoi_tham_dinh, 'THAM_DINH', d.khoi))
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = de_phan_cong.nguoi_tham_dinh AND p.organization_id = de_phan_cong.organization_id AND COALESCE(p.is_active, true)));

DO $$
DECLARE d TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE proname = 'phan_tich_quyen_de' AND pronamespace = 'public'::regnamespace;
  IF position('AND x.hieu_luc);' IN d) = 0 THEN RAISE EXCEPTION 'Không tìm thấy đoạn cần sửa trong phan_tich_quyen_de'; END IF;
  d := replace(d, 'AND x.hieu_luc);', 'AND x.hieu_luc) AND public.user_co_quyen_gv(uid, ''THAM_DINH'', r.khoi);');
  EXECUTE d;
END $$;

-- Ma trận riêng, đặc tả: tổ trưởng, tổ phó, quản trị, hoặc giáo viên được tích quyền.
DROP POLICY IF EXISTS ma_tran_rieng_delete_draft ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_delete_draft ON public.ma_tran_rieng FOR DELETE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA'));
DROP POLICY IF EXISTS ma_tran_rieng_insert_leader ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_insert_leader ON public.ma_tran_rieng FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA') AND (la_ban_nhap OR xac_nhan_boi = auth.uid()));
DROP POLICY IF EXISTS ma_tran_rieng_update_leader ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_update_leader ON public.ma_tran_rieng FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA'))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA'));
DROP POLICY IF EXISTS dac_ta_delete_draft ON public.dac_ta;
CREATE POLICY dac_ta_delete_draft ON public.dac_ta FOR DELETE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA'));
DROP POLICY IF EXISTS dac_ta_insert_leader ON public.dac_ta;
CREATE POLICY dac_ta_insert_leader ON public.dac_ta FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA') AND (la_ban_nhap OR xac_nhan_boi = auth.uid()));
DROP POLICY IF EXISTS dac_ta_update_leader ON public.dac_ta;
CREATE POLICY dac_ta_update_leader ON public.dac_ta FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA'))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND la_ban_nhap AND public.co_quyen_ghi('SUA_MA_TRAN_DAC_TA'));

-- Mục lục SGK và kho sách.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sach', 'sach_trang', 'sgk_muc_luc'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_leader', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.co_quyen_ghi(''NAP_MUC_LUC_SACH''))', t || '_insert_leader', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_leader', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (organization_id = public.get_auth_user_org_id() AND public.co_quyen_ghi(''NAP_MUC_LUC_SACH''))', t || '_delete_leader', t);
  END LOOP;
  EXECUTE 'DROP POLICY IF EXISTS sach_update_leader ON public.sach';
  EXECUTE 'CREATE POLICY sach_update_leader ON public.sach FOR UPDATE TO authenticated USING (organization_id = public.get_auth_user_org_id() AND public.co_quyen_ghi(''NAP_MUC_LUC_SACH''))';
  EXECUTE 'DROP POLICY IF EXISTS sach_trang_update_leader ON public.sach_trang';
  EXECUTE 'CREATE POLICY sach_trang_update_leader ON public.sach_trang FOR UPDATE TO authenticated USING (organization_id = public.get_auth_user_org_id() AND public.co_quyen_ghi(''NAP_MUC_LUC_SACH''))';
END $$;
-- ============================================================================
-- PHẦN C. Đăng ký vai trò theo Gmail; quản lý tổ và bảng quyền giáo viên
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_vai_tro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  email TEXT NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  vai_tro TEXT NOT NULL CHECK (vai_tro IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_LEADERSHIP', 'TEACHER')),
  pham_vi_khoi SMALLINT CHECK (pham_vi_khoi BETWEEN 1 AND 5),
  ghi_chu TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email, vai_tro),
  CHECK ((vai_tro = 'SCHOOL_LEADERSHIP' AND pham_vi_khoi IS NULL) OR (vai_tro <> 'SCHOOL_LEADERSHIP' AND pham_vi_khoi IS NOT NULL))
);
ALTER TABLE public.email_vai_tro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_vai_tro_select ON public.email_vai_tro;
CREATE POLICY email_vai_tro_select ON public.email_vai_tro FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.co_vai_tro('SYSTEM_ADMIN'));
GRANT SELECT ON public.email_vai_tro TO authenticated;
REVOKE ALL ON public.email_vai_tro FROM anon;

-- Tạo tổ khối k nếu chưa có và trả về mã tổ.
CREATE OR REPLACE FUNCTION public.id_to_khoi(p_org UUID, p_khoi SMALLINT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE g UUID;
BEGIN
  SELECT id INTO g FROM public.professional_groups WHERE organization_id = p_org AND assigned_grade_ids @> ARRAY[p_khoi::INT] ORDER BY created_at LIMIT 1;
  IF g IS NULL THEN
    INSERT INTO public.professional_groups (organization_id, code, name, description, assigned_grade_ids)
    VALUES (p_org, 'TO_KHOI_' || p_khoi, 'Tổ Chuyên môn Khối ' || p_khoi, 'Tổ chuyên môn khối ' || p_khoi, ARRAY[p_khoi::INT])
    RETURNING id INTO g;
  END IF;
  RETURN g;
END $$;

CREATE OR REPLACE FUNCTION public.dat_giao_vien_vao_to(p_user UUID, p_khoi SMALLINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID; g UUID;
BEGIN
  SELECT organization_id INTO org FROM public.profiles WHERE id = p_user;
  IF org IS NULL THEN RETURN; END IF;
  g := public.id_to_khoi(org, p_khoi);
  DELETE FROM public.professional_group_members m USING public.professional_groups pg
    WHERE m.user_id = p_user AND pg.id = m.group_id AND pg.organization_id = org AND m.group_id <> g;
  INSERT INTO public.professional_group_members (group_id, user_id, role_in_group) VALUES (g, p_user, 'MEMBER') ON CONFLICT (group_id, user_id) DO NOTHING;
END $$;

-- Áp dụng các email đã đăng ký cho một tài khoản (gọi khi tài khoản mới tạo hoặc khi quản trị thêm email).
CREATE OR REPLACE FUNCTION public.ap_dung_email_vai_tro(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE p public.profiles%ROWTYPE; r RECORD; chi_bgh BOOLEAN;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_user;
  IF NOT FOUND OR p.email IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.email_vai_tro e WHERE e.organization_id = p.organization_id AND e.email = lower(btrim(p.email))) THEN RETURN; END IF;
  chi_bgh := NOT EXISTS (SELECT 1 FROM public.email_vai_tro e WHERE e.organization_id = p.organization_id AND e.email = lower(btrim(p.email)) AND e.vai_tro <> 'SCHOOL_LEADERSHIP');
  FOR r IN SELECT * FROM public.email_vai_tro e WHERE e.organization_id = p.organization_id AND e.email = lower(btrim(p.email)) LOOP
    IF r.vai_tro = 'TEACHER' THEN
      PERFORM public.dat_giao_vien_vao_to(p.id, r.pham_vi_khoi);
    ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = r.vai_tro
        AND ur.pham_vi_khoi IS NOT DISTINCT FROM r.pham_vi_khoi AND ur.ly_do LIKE 'EMAIL:%' AND ur.valid_to IS NULL) THEN
      INSERT INTO public.user_roles (organization_id, user_id, role, pham_vi_khoi, ly_do, granted_by)
      VALUES (p.organization_id, p.id, r.vai_tro, r.pham_vi_khoi, 'EMAIL: quản trị đăng ký theo Gmail', COALESCE(r.created_by, p.id));
      IF r.vai_tro IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER') THEN PERFORM public.dat_giao_vien_vao_to(p.id, r.pham_vi_khoi); END IF;
    END IF;
  END LOOP;
  UPDATE public.profiles SET is_active = true,
    role = CASE WHEN chi_bgh AND role = 'TEACHER' THEN 'SCHOOL_LEADERSHIP' ELSE role END
  WHERE id = p.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.ap_dung_email_vai_tro(UUID), public.dat_giao_vien_vao_to(UUID, SMALLINT), public.id_to_khoi(UUID, SMALLINT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_ap_dung_email_khi_tao_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN PERFORM public.ap_dung_email_vai_tro(NEW.id); RETURN NULL; END $$;
REVOKE EXECUTE ON FUNCTION public.trg_ap_dung_email_khi_tao_profile() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_profiles_ap_dung_email ON public.profiles;
CREATE TRIGGER trg_profiles_ap_dung_email AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trg_ap_dung_email_khi_tao_profile();

-- Quản trị thêm / bỏ email.
CREATE OR REPLACE FUNCTION public.dang_ky_email_vai_tro(p_email TEXT, p_vai_tro TEXT, p_khoi SMALLINT, p_ghi_chu TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); e TEXT := lower(btrim(COALESCE(p_email, ''))); id_moi UUID; u UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.co_vai_tro('SYSTEM_ADMIN') THEN RAISE EXCEPTION 'Chỉ quản trị hệ thống mới đăng ký vai trò theo Gmail.'; END IF;
  IF e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Địa chỉ Gmail không hợp lệ.'; END IF;
  IF p_vai_tro NOT IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_LEADERSHIP', 'TEACHER') THEN RAISE EXCEPTION 'Vai trò không hợp lệ.'; END IF;
  IF p_vai_tro <> 'SCHOOL_LEADERSHIP' AND (p_khoi IS NULL OR p_khoi NOT BETWEEN 1 AND 5) THEN RAISE EXCEPTION 'Cần chọn khối từ 1 đến 5.'; END IF;
  INSERT INTO public.email_vai_tro (organization_id, email, vai_tro, pham_vi_khoi, ghi_chu, created_by)
  VALUES (org, e, p_vai_tro, CASE WHEN p_vai_tro = 'SCHOOL_LEADERSHIP' THEN NULL ELSE p_khoi END, NULLIF(btrim(p_ghi_chu), ''), auth.uid())
  ON CONFLICT (organization_id, email, vai_tro) DO UPDATE SET pham_vi_khoi = EXCLUDED.pham_vi_khoi, ghi_chu = EXCLUDED.ghi_chu
  RETURNING id INTO id_moi;
  SELECT id INTO u FROM public.profiles WHERE organization_id = org AND lower(email) = e;
  IF u IS NOT NULL THEN PERFORM public.ap_dung_email_vai_tro(u); END IF;
  RETURN id_moi;
END $$;

CREATE OR REPLACE FUNCTION public.go_email_vai_tro(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.email_vai_tro%ROWTYPE; u UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.co_vai_tro('SYSTEM_ADMIN') THEN RAISE EXCEPTION 'Chỉ quản trị hệ thống mới gỡ đăng ký.'; END IF;
  SELECT * INTO r FROM public.email_vai_tro WHERE id = p_id AND organization_id = public.get_auth_user_org_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đăng ký.'; END IF;
  DELETE FROM public.email_vai_tro WHERE id = p_id;
  SELECT id INTO u FROM public.profiles WHERE organization_id = r.organization_id AND lower(email) = r.email;
  IF u IS NOT NULL AND r.vai_tro <> 'TEACHER' THEN
    DELETE FROM public.user_roles WHERE user_id = u AND role = r.vai_tro AND pham_vi_khoi IS NOT DISTINCT FROM r.pham_vi_khoi AND ly_do LIKE 'EMAIL:%';
    IF r.vai_tro = 'SCHOOL_LEADERSHIP' THEN
      UPDATE public.profiles SET role = 'TEACHER' WHERE id = u AND role = 'SCHOOL_LEADERSHIP'
        AND NOT EXISTS (SELECT 1 FROM public.email_vai_tro e WHERE e.organization_id = r.organization_id AND e.email = r.email AND e.vai_tro = 'SCHOOL_LEADERSHIP');
    END IF;
  END IF;
END $$;

-- Danh sách tổ mà người gọi quản lý được.
CREATE OR REPLACE FUNCTION public.ds_to_quan_ly()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); kq JSONB := '[]'::JSONB; k SMALLINT; qt BOOLEAN := public.co_vai_tro('SYSTEM_ADMIN');
BEGIN
  IF auth.uid() IS NULL THEN RETURN kq; END IF;
  FOR k IN 1..5 LOOP
    IF qt OR public.co_vai_tro('GROUP_LEADER', k) THEN
      kq := kq || jsonb_build_object('khoi', k, 'ten', 'Tổ khối ' || k,
        'soGiaoVien', (SELECT count(*) FROM public.professional_group_members m JOIN public.professional_groups pg ON pg.id = m.group_id
                       WHERE pg.organization_id = org AND pg.assigned_grade_ids @> ARRAY[k::INT]));
    END IF;
  END LOOP;
  RETURN kq;
END $$;

-- Bảng quyền: giáo viên trong tổ và các quyền đang có.
CREATE OR REPLACE FUNCTION public.ds_quyen_to(p_khoi SMALLINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); kq JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.co_vai_tro('SYSTEM_ADMIN') OR public.co_vai_tro('GROUP_LEADER', p_khoi)) THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng của tổ này hoặc quản trị mới xem được bảng quyền.';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id, 'ten', p.full_name, 'email', p.email, 'hoatDong', COALESCE(p.is_active, true),
      'khoa', (p.id = auth.uid()) OR public.user_co_vai_tro(p.id, 'GROUP_LEADER', p_khoi) OR public.user_co_vai_tro(p.id, 'DEPUTY_GROUP_LEADER', p_khoi)
              OR public.user_co_vai_tro(p.id, 'SCHOOL_ADMIN', NULL) OR public.user_co_vai_tro(p.id, 'SYSTEM_ADMIN', NULL) OR public.user_co_vai_tro(p.id, 'SCHOOL_LEADERSHIP', NULL),
      'ghiChuKhoa', CASE WHEN p.id = auth.uid() THEN 'Tài khoản của bạn' WHEN public.user_co_vai_tro(p.id, 'GROUP_LEADER', p_khoi) THEN 'Tổ trưởng'
                         WHEN public.user_co_vai_tro(p.id, 'DEPUTY_GROUP_LEADER', p_khoi) THEN 'Tổ phó' ELSE 'Quản lý' END,
      'quyen', jsonb_build_object(
        'SOAN_DE', public.user_co_quyen_gv(p.id, 'SOAN_DE', p_khoi), 'THAM_DINH', public.user_co_quyen_gv(p.id, 'THAM_DINH', p_khoi),
        'SUA_MA_TRAN_DAC_TA', public.user_co_quyen_gv(p.id, 'SUA_MA_TRAN_DAC_TA', p_khoi), 'NAP_MUC_LUC_SACH', public.user_co_quyen_gv(p.id, 'NAP_MUC_LUC_SACH', p_khoi))
    ) ORDER BY p.full_name), '[]'::JSONB) INTO kq
  FROM public.professional_group_members m
  JOIN public.professional_groups pg ON pg.id = m.group_id AND pg.organization_id = org AND pg.assigned_grade_ids @> ARRAY[p_khoi::INT]
  JOIN public.profiles p ON p.id = m.user_id AND p.organization_id = org;
  RETURN kq;
END $$;

-- Bấm Áp dụng: p_ds = [{"user": "...", "quyen": ["SOAN_DE", ...]}]
CREATE OR REPLACE FUNCTION public.ap_dung_quyen_to(p_khoi SMALLINT, p_ds JSONB)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE org UUID := public.get_auth_user_org_id(); it JSONB; u UUID; qs TEXT[]; q TEXT; truoc JSONB; sau JSONB; dem INT := 0;
  tat_ca TEXT[] := ARRAY['SOAN_DE', 'THAM_DINH', 'SUA_MA_TRAN_DAC_TA', 'NAP_MUC_LUC_SACH'];
BEGIN
  IF auth.uid() IS NULL OR NOT (public.co_vai_tro('SYSTEM_ADMIN') OR public.co_vai_tro('GROUP_LEADER', p_khoi)) THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng của tổ này hoặc quản trị mới được cấp quyền cho giáo viên.';
  END IF;
  IF jsonb_typeof(p_ds) <> 'array' THEN RAISE EXCEPTION 'Danh sách không hợp lệ.'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_ds) LOOP
    u := (it ->> 'user')::UUID;
    SELECT COALESCE(array_agg(x), ARRAY[]::TEXT[]) INTO qs FROM jsonb_array_elements_text(COALESCE(it -> 'quyen', '[]'::JSONB)) x;
    IF EXISTS (SELECT 1 FROM unnest(qs) y WHERE y <> ALL (tat_ca)) THEN RAISE EXCEPTION 'Có quyền không hợp lệ.'; END IF;
    IF u = auth.uid() THEN RAISE EXCEPTION 'Không tự đổi quyền của chính mình.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.professional_group_members m JOIN public.professional_groups pg ON pg.id = m.group_id
        WHERE m.user_id = u AND pg.organization_id = org AND pg.assigned_grade_ids @> ARRAY[p_khoi::INT]) THEN RAISE EXCEPTION 'Người này không thuộc tổ khối %.', p_khoi; END IF;
    IF public.user_co_vai_tro(u, 'GROUP_LEADER', p_khoi) OR public.user_co_vai_tro(u, 'DEPUTY_GROUP_LEADER', p_khoi) OR public.user_co_vai_tro(u, 'SCHOOL_ADMIN', NULL)
       OR public.user_co_vai_tro(u, 'SYSTEM_ADMIN', NULL) OR public.user_co_vai_tro(u, 'SCHOOL_LEADERSHIP', NULL) THEN
      RAISE EXCEPTION 'Tổ trưởng, tổ phó, Ban giám hiệu và quản trị đã có quyền theo vai trò, không chỉnh ở bảng này.';
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

-- Quản trị chuyển một người sang tổ khác.
CREATE OR REPLACE FUNCTION public.chuyen_giao_vien_sang_to(p_user UUID, p_khoi SMALLINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.co_vai_tro('SYSTEM_ADMIN') THEN RAISE EXCEPTION 'Chỉ quản trị hệ thống mới chuyển giáo viên sang tổ khác.'; END IF;
  IF p_khoi NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Khối từ 1 đến 5.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND organization_id = public.get_auth_user_org_id()) THEN RAISE EXCEPTION 'Không tìm thấy người dùng.'; END IF;
  PERFORM public.dat_giao_vien_vao_to(p_user, p_khoi);
END $$;

GRANT EXECUTE ON FUNCTION public.dang_ky_email_vai_tro(TEXT, TEXT, SMALLINT, TEXT), public.go_email_vai_tro(UUID), public.ds_to_quan_ly(),
  public.ds_quyen_to(SMALLINT), public.ap_dung_quyen_to(SMALLINT, JSONB), public.chuyen_giao_vien_sang_to(UUID, SMALLINT) TO authenticated;
