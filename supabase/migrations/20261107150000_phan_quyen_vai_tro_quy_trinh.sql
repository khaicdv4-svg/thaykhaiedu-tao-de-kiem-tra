-- ThayKhaiEdu: phân quyền theo vai trò + phạm vi + sở hữu + trạng thái đề; quy trình thẩm định, phê duyệt nhiều cấp;
-- nhật ký append-only; nhận xét; phân công thẩm định; chia sẻ; ủy quyền có thời hạn.
-- Tương thích ngược: giữ profiles.role (vai trò chính) và các giá trị trạng thái cũ; thêm vai trò qua bảng user_roles.
--
-- Đối chiếu trạng thái với tài liệu:
--   BAN_NHAP, CAN_KIEM_TRA, CO_LOI, CAN_KIEM_TRA_LAI = DRAFT (nhãn kiểm tra trong lúc soạn)
--   SAN_SANG_DUYET = READY_FOR_REVIEW      DANG_THAM_DINH = UNDER_REVIEW     TRA_LAI = REVISION_REQUIRED
--   DA_XAC_NHAN_TO = TEAM_APPROVED         CHO_BGH_DUYET = PENDING_FINAL_APPROVAL
--   DA_DUYET = APPROVED                    DA_PHAT_HANH = PUBLISHED          DA_LUU_TRU = ARCHIVED

-- ============================================================================
-- 1. Vai trò
-- ============================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role::text IN ('TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SCHOOL_LEADERSHIP', 'SYSTEM_ADMIN'));

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SCHOOL_LEADERSHIP', 'SYSTEM_ADMIN')),
  pham_vi_khoi SMALLINT CHECK (pham_vi_khoi BETWEEN 1 AND 5),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  ly_do TEXT NOT NULL CHECK (length(btrim(ly_do)) > 0),
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_thoi_gian CHECK (valid_to IS NULL OR valid_to > valid_from)
);
CREATE INDEX IF NOT EXISTS user_roles_theo_nguoi ON public.user_roles (user_id);

-- Vai trò gốc trong hồ sơ (hành vi cũ của get_auth_user_role)
CREATE OR REPLACE FUNCTION public.vai_tro_goc()
RETURNS VARCHAR LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.user_co_vai_tro(p_user UUID, p_role TEXT, p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user AND COALESCE(p.is_active, true) AND p.role = p_role)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id AND COALESCE(p.is_active, true)
        WHERE ur.user_id = p_user AND ur.role = p_role AND ur.valid_from <= now() AND (ur.valid_to IS NULL OR ur.valid_to > now())
          AND (p_khoi IS NULL OR ur.pham_vi_khoi IS NULL OR ur.pham_vi_khoi = p_khoi)
      )
$$;

CREATE OR REPLACE FUNCTION public.co_vai_tro(p_role TEXT, p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.user_co_vai_tro(auth.uid(), p_role, p_khoi) $$;

CREATE OR REPLACE FUNCTION public.la_bgh(p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.co_vai_tro('SCHOOL_LEADERSHIP', p_khoi) OR public.co_vai_tro('SCHOOL_ADMIN', p_khoi) $$;

-- Có vai trò chuyên môn (không tính quản trị hệ thống)
CREATE OR REPLACE FUNCTION public.co_quyen_chuyen_mon(p_khoi SMALLINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.co_vai_tro('TEACHER', p_khoi) OR public.co_vai_tro('GROUP_LEADER', p_khoi)
      OR public.co_vai_tro('DEPUTY_GROUP_LEADER', p_khoi) OR public.la_bgh(p_khoi)
$$;

-- Mọi vai trò đang có hiệu lực của người đăng nhập
CREATE OR REPLACE FUNCTION public.vai_tro_cua_toi()
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT r), ARRAY[]::TEXT[]) FROM (
    SELECT p.role::TEXT AS r FROM public.profiles p WHERE p.id = auth.uid() AND COALESCE(p.is_active, true)
    UNION
    SELECT ur.role::TEXT FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id AND COALESCE(p.is_active, true)
    WHERE ur.user_id = auth.uid() AND ur.valid_from <= now() AND (ur.valid_to IS NULL OR ur.valid_to > now())
  ) x
$$;

-- Các chính sách cũ dùng get_auth_user_role() với danh sách vai trò: trả về vai trò cao nhất đang hiệu lực để chúng vẫn đúng khi có nhiều vai trò
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN 'SYSTEM_ADMIN' = ANY (r) THEN 'SYSTEM_ADMIN'
    WHEN 'SCHOOL_ADMIN' = ANY (r) OR 'SCHOOL_LEADERSHIP' = ANY (r) THEN 'SCHOOL_ADMIN'
    WHEN 'GROUP_LEADER' = ANY (r) THEN 'GROUP_LEADER'
    WHEN 'DEPUTY_GROUP_LEADER' = ANY (r) THEN 'DEPUTY_GROUP_LEADER'
    WHEN 'TEACHER' = ANY (r) THEN 'TEACHER'
    ELSE NULL
  END
  FROM (SELECT public.vai_tro_cua_toi() AS r) x
$$;

-- Hồ sơ: không tự đổi vai trò gốc hoặc trường
DROP POLICY IF EXISTS "Users can update their own basic profile" ON public.profiles;
CREATE POLICY "Users can update their own basic profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role::TEXT = public.vai_tro_goc()::TEXT AND organization_id IS NOT DISTINCT FROM public.get_auth_user_org_id());

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (organization_id = public.get_auth_user_org_id() AND (public.co_vai_tro('SYSTEM_ADMIN') OR public.la_bgh())));
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.co_vai_tro('SYSTEM_ADMIN') AND granted_by = auth.uid());
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.co_vai_tro('SYSTEM_ADMIN'))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.co_vai_tro('SYSTEM_ADMIN'));
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.co_vai_tro('SYSTEM_ADMIN'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
REVOKE ALL ON public.user_roles FROM anon;

-- ============================================================================
-- 2. Nhật ký hệ thống (cấp quyền, ủy quyền, phân công, chia sẻ), chỉ thêm
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.nhat_ky_he_thong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  nguoi_thuc_hien UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hanh_dong VARCHAR(80) NOT NULL,
  chi_tiet JSONB NOT NULL DEFAULT '{}'::jsonb,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION public.guard_chi_them()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN RAISE EXCEPTION 'Bảng nhật ký chỉ được thêm, không sửa hoặc xóa.'; END $$;

DROP TRIGGER IF EXISTS trg_nhat_ky_he_thong_chi_them ON public.nhat_ky_he_thong;
CREATE TRIGGER trg_nhat_ky_he_thong_chi_them BEFORE UPDATE OR DELETE ON public.nhat_ky_he_thong
  FOR EACH ROW EXECUTE FUNCTION public.guard_chi_them();

ALTER TABLE public.nhat_ky_he_thong ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nhat_ky_he_thong_select ON public.nhat_ky_he_thong;
CREATE POLICY nhat_ky_he_thong_select ON public.nhat_ky_he_thong FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (public.co_vai_tro('SYSTEM_ADMIN') OR public.la_bgh()));
GRANT SELECT ON public.nhat_ky_he_thong TO authenticated;
REVOKE ALL ON public.nhat_ky_he_thong FROM anon;

CREATE OR REPLACE FUNCTION public.ghi_nhat_ky_thay_doi()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE d JSONB; o UUID;
BEGIN
  d := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  o := (d ->> 'organization_id')::UUID;
  INSERT INTO public.nhat_ky_he_thong (organization_id, nguoi_thuc_hien, hanh_dong, chi_tiet)
  VALUES (o, auth.uid(), TG_TABLE_NAME || ':' || TG_OP, d);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.ghi_nhat_ky_thay_doi() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_user_roles ON public.user_roles;
CREATE TRIGGER trg_log_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_thay_doi();

-- ============================================================================
-- 3. Đề: mỗi giáo viên một đề riêng cho mỗi (khối, môn, kì); phạm vi xem; trạng thái mở rộng
-- ============================================================================
DROP INDEX IF EXISTS public.de_kiem_tra_mot_de;
CREATE UNIQUE INDEX IF NOT EXISTS de_kiem_tra_mot_de_moi_nguoi
  ON public.de_kiem_tra (organization_id, khoi, ma_mon, ky_kiem_tra, created_by);

ALTER TABLE public.de_kiem_tra
  ADD COLUMN IF NOT EXISTS pham_vi_xem VARCHAR(10) NOT NULL DEFAULT 'RIENG_TU' CHECK (pham_vi_xem IN ('RIENG_TU', 'TO', 'TRUONG')),
  ADD COLUMN IF NOT EXISTS ma_de TEXT GENERATED ALWAYS AS (upper(left(replace(id::TEXT, '-', ''), 8))) STORED;

ALTER TABLE public.de_kiem_tra DROP CONSTRAINT IF EXISTS de_kiem_tra_trang_thai_check;
ALTER TABLE public.de_kiem_tra ADD CONSTRAINT de_kiem_tra_trang_thai_check CHECK (trang_thai::TEXT IN (
  'BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI', 'SAN_SANG_DUYET', 'DANG_THAM_DINH', 'TRA_LAI',
  'DA_XAC_NHAN_TO', 'CHO_BGH_DUYET', 'DA_DUYET', 'DA_PHAT_HANH', 'DA_LUU_TRU'));

-- Đề đã có (chưa chia sẻ riêng) giữ hiển thị trong tổ
UPDATE public.de_kiem_tra SET pham_vi_xem = 'TO' WHERE pham_vi_xem = 'RIENG_TU';

-- Phiên bản đã duyệt tính theo từng đề
ALTER TABLE public.de_da_duyet ADD COLUMN IF NOT EXISTS de_id UUID;
ALTER TABLE public.de_da_duyet DISABLE TRIGGER trg_guard_de_da_duyet_bat_bien;
UPDATE public.de_da_duyet dd SET de_id = d.id
  FROM public.de_kiem_tra d
  WHERE dd.de_id IS NULL AND d.organization_id = dd.organization_id AND d.khoi = dd.khoi AND d.ma_mon = dd.ma_mon AND d.ky_kiem_tra = dd.ky_kiem_tra;
ALTER TABLE public.de_da_duyet ENABLE TRIGGER trg_guard_de_da_duyet_bat_bien;
DROP INDEX IF EXISTS public.de_da_duyet_phien_ban_duy_nhat;
CREATE UNIQUE INDEX IF NOT EXISTS de_da_duyet_phien_ban_moi_de ON public.de_da_duyet (de_id, phien_ban);
DROP POLICY IF EXISTS de_da_duyet_insert_leader ON public.de_da_duyet;
DROP POLICY IF EXISTS de_da_duyet_select_org ON public.de_da_duyet;

-- ============================================================================
-- 4. Bảng phụ: lịch sử (chỉ thêm), nhận xét, phân công thẩm định, chia sẻ, ủy quyền
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.de_lich_su (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  de_id UUID NOT NULL,
  khoi SMALLINT,
  ma_mon VARCHAR(40),
  ky_kiem_tra VARCHAR(20),
  hanh_dong VARCHAR(40) NOT NULL,
  tu_trang_thai VARCHAR(30),
  den_trang_thai VARCHAR(30),
  nguoi_thuc_hien UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ten_nguoi TEXT,
  vai_tro_su_dung TEXT,
  ghi_chu TEXT,
  phien_ban_duyet INTEGER,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS de_lich_su_theo_de ON public.de_lich_su (de_id, tao_luc);
DROP TRIGGER IF EXISTS trg_de_lich_su_chi_them ON public.de_lich_su;
CREATE TRIGGER trg_de_lich_su_chi_them BEFORE UPDATE OR DELETE ON public.de_lich_su
  FOR EACH ROW EXECUTE FUNCTION public.guard_chi_them();

CREATE TABLE IF NOT EXISTS public.de_nhan_xet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  de_id UUID NOT NULL REFERENCES public.de_kiem_tra(id) ON DELETE CASCADE,
  tac_gia UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ten_tac_gia TEXT,
  thanh_phan VARCHAR(80) NOT NULL DEFAULT 'CHUNG',
  noi_dung TEXT NOT NULL CHECK (length(btrim(noi_dung)) BETWEEN 1 AND 2000),
  da_xu_ly BOOLEAN NOT NULL DEFAULT false,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS de_nhan_xet_theo_de ON public.de_nhan_xet (de_id, tao_luc);

CREATE TABLE IF NOT EXISTS public.de_phan_cong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  de_id UUID NOT NULL REFERENCES public.de_kiem_tra(id) ON DELETE CASCADE,
  nguoi_tham_dinh UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  giao_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hieu_luc BOOLEAN NOT NULL DEFAULT true,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (de_id, nguoi_tham_dinh)
);

CREATE TABLE IF NOT EXISTS public.de_chia_se (
  organization_id UUID NOT NULL,
  de_id UUID NOT NULL REFERENCES public.de_kiem_tra(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chia_se_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (de_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.uy_quyen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nguoi_giao UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nguoi_nhan UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hanh_dong TEXT[] NOT NULL,
  pham_vi_khoi SMALLINT CHECK (pham_vi_khoi BETWEEN 1 AND 5),
  tu TIMESTAMPTZ NOT NULL DEFAULT now(),
  den TIMESTAMPTZ NOT NULL,
  ly_do TEXT NOT NULL CHECK (length(btrim(ly_do)) > 0),
  thu_hoi BOOLEAN NOT NULL DEFAULT false,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uy_quyen_khac_nguoi CHECK (nguoi_giao <> nguoi_nhan),
  CONSTRAINT uy_quyen_thoi_gian CHECK (den > tu),
  -- Ủy quyền không bao giờ gồm phê duyệt cuối cùng, phát hành hay thu hồi
  CONSTRAINT uy_quyen_hanh_dong CHECK (cardinality(hanh_dong) > 0 AND hanh_dong <@ ARRAY['BAT_DAU_THAM_DINH', 'YEU_CAU_CHINH_SUA', 'XAC_NHAN_TO', 'CHUYEN_BGH']::TEXT[])
);

DROP TRIGGER IF EXISTS trg_log_de_phan_cong ON public.de_phan_cong;
CREATE TRIGGER trg_log_de_phan_cong AFTER INSERT OR UPDATE OR DELETE ON public.de_phan_cong FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_thay_doi();
DROP TRIGGER IF EXISTS trg_log_de_chia_se ON public.de_chia_se;
CREATE TRIGGER trg_log_de_chia_se AFTER INSERT OR UPDATE OR DELETE ON public.de_chia_se FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_thay_doi();
DROP TRIGGER IF EXISTS trg_log_uy_quyen ON public.uy_quyen;
CREATE TRIGGER trg_log_uy_quyen AFTER INSERT OR UPDATE OR DELETE ON public.uy_quyen FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_thay_doi();

-- Ủy quyền đang có hiệu lực cho người đăng nhập (người giao phải còn giữ vai trò tổ trưởng)
CREATE OR REPLACE FUNCTION public.id_uy_quyen(p_hanh_dong TEXT, p_khoi SMALLINT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id FROM public.uy_quyen u
  WHERE u.nguoi_nhan = auth.uid() AND NOT u.thu_hoi AND now() BETWEEN u.tu AND u.den
    AND p_hanh_dong = ANY (u.hanh_dong) AND (u.pham_vi_khoi IS NULL OR u.pham_vi_khoi = p_khoi)
    AND u.organization_id = public.get_auth_user_org_id()
    AND (public.user_co_vai_tro(u.nguoi_giao, 'GROUP_LEADER', p_khoi))
  ORDER BY u.den LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.guard_uy_quyen()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.nguoi_giao <> auth.uid() THEN RAISE EXCEPTION 'Chỉ giao quyền của chính mình.'; END IF;
    IF NOT (public.co_vai_tro('GROUP_LEADER', NEW.pham_vi_khoi) OR public.la_bgh(NEW.pham_vi_khoi)) THEN
      RAISE EXCEPTION 'Chỉ tổ trưởng hoặc Ban giám hiệu mới giao quyền.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.nguoi_nhan AND p.organization_id = NEW.organization_id AND COALESCE(p.is_active, true)) THEN
      RAISE EXCEPTION 'Người nhận quyền phải là thành viên đang hoạt động của trường.';
    END IF;
    IF NOT public.user_co_vai_tro(NEW.nguoi_nhan, 'TEACHER') AND NOT public.user_co_vai_tro(NEW.nguoi_nhan, 'DEPUTY_GROUP_LEADER')
       AND NOT public.user_co_vai_tro(NEW.nguoi_nhan, 'GROUP_LEADER') AND NOT public.user_co_vai_tro(NEW.nguoi_nhan, 'SCHOOL_LEADERSHIP') THEN
      RAISE EXCEPTION 'Người nhận quyền cần có vai trò chuyên môn.';
    END IF;
  ELSE
    -- chỉ được thu hồi, không đổi nội dung ủy quyền
    IF NEW.nguoi_giao IS DISTINCT FROM OLD.nguoi_giao OR NEW.nguoi_nhan IS DISTINCT FROM OLD.nguoi_nhan OR NEW.hanh_dong IS DISTINCT FROM OLD.hanh_dong
       OR NEW.tu IS DISTINCT FROM OLD.tu OR NEW.den IS DISTINCT FROM OLD.den OR NEW.pham_vi_khoi IS DISTINCT FROM OLD.pham_vi_khoi OR NEW.ly_do IS DISTINCT FROM OLD.ly_do THEN
      RAISE EXCEPTION 'Ủy quyền chỉ thu hồi được, không sửa nội dung. Hãy thu hồi rồi giao lại.';
    END IF;
    IF OLD.thu_hoi AND NOT NEW.thu_hoi THEN RAISE EXCEPTION 'Ủy quyền đã thu hồi không mở lại được.'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_uy_quyen() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_uy_quyen ON public.uy_quyen;
CREATE TRIGGER trg_guard_uy_quyen BEFORE INSERT OR UPDATE ON public.uy_quyen FOR EACH ROW EXECUTE FUNCTION public.guard_uy_quyen();

-- ============================================================================
-- 5. Quyền xem đề
-- ============================================================================
CREATE OR REPLACE FUNCTION public.duoc_xem_de(p_id UUID, p_org UUID, p_khoi SMALLINT, p_owner UUID, p_state TEXT, p_scope TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_org = public.get_auth_user_org_id() AND (
    p_owner = auth.uid()
    OR EXISTS (SELECT 1 FROM public.de_chia_se c WHERE c.de_id = p_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.de_phan_cong pc WHERE pc.de_id = p_id AND pc.nguoi_tham_dinh = auth.uid() AND pc.hieu_luc)
    OR public.co_vai_tro('GROUP_LEADER', p_khoi)
    OR (public.la_bgh(p_khoi) AND p_state NOT IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI'))
    OR (p_state = 'DA_PHAT_HANH' AND public.co_quyen_chuyen_mon())
    OR (p_scope = 'TRUONG' AND public.co_quyen_chuyen_mon())
    OR (p_scope = 'TO' AND public.co_quyen_chuyen_mon(p_khoi))
  )
$$;

CREATE OR REPLACE FUNCTION public.la_chu_de(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = p_id AND d.created_by = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.xem_duoc_de_id(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = p_id AND public.duoc_xem_de(d.id, d.organization_id, d.khoi, d.created_by, d.trang_thai, d.pham_vi_xem)) $$;

DROP POLICY IF EXISTS de_kiem_tra_select_org ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_insert ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_update ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_delete ON public.de_kiem_tra;
DROP POLICY IF EXISTS de_kiem_tra_select ON public.de_kiem_tra;

CREATE POLICY de_kiem_tra_select ON public.de_kiem_tra FOR SELECT TO authenticated
  USING (public.duoc_xem_de(id, organization_id, khoi, created_by, trang_thai, pham_vi_xem));

CREATE POLICY de_kiem_tra_insert ON public.de_kiem_tra FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND created_by = auth.uid() AND public.co_quyen_chuyen_mon(khoi));

-- Chỉ người tạo sửa nội dung đề của mình; người khác chỉ đổi trạng thái qua chuyen_trang_thai_de
CREATE POLICY de_kiem_tra_update ON public.de_kiem_tra FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND created_by = auth.uid())
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND created_by = auth.uid());

CREATE POLICY de_kiem_tra_delete ON public.de_kiem_tra FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND ((created_by = auth.uid() AND trang_thai IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI', 'TRA_LAI'))
         OR public.la_bgh(khoi))
  );

CREATE POLICY de_da_duyet_select ON public.de_da_duyet FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (de_id IS NULL OR public.xem_duoc_de_id(de_id)));
DROP FUNCTION IF EXISTS public.la_vai_tro_quan_ly();

-- ============================================================================
-- 6. Quy trình: một nơi duy nhất quyết định ai được làm gì với đề ở trạng thái nào
-- ============================================================================
CREATE OR REPLACE FUNCTION public.phan_tich_quyen_de(p_de UUID, p_hd TEXT, OUT loi TEXT, OUT vai_tro TEXT, OUT den TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.de_kiem_tra%ROWTYPE;
  uid UUID := auth.uid();
  k SMALLINT;
  chu BOOLEAN; pc BOOLEAN; tt BOOLEAN; bgh BOOLEAN; uq UUID;
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
  pc := EXISTS (SELECT 1 FROM public.de_phan_cong x WHERE x.de_id = p_de AND x.nguoi_tham_dinh = uid AND x.hieu_luc);
  tt := public.co_vai_tro('GROUP_LEADER', k);
  bgh := public.la_bgh(k);
  uq := public.id_uy_quyen(p_hd, k);

  IF p_hd = 'GUI_THAM_DINH' THEN
    IF NOT chu THEN loi := 'Chỉ người tạo đề mới gửi thẩm định.'; RETURN; END IF;
    IF NOT (r.trang_thai = ANY (drafts) OR r.trang_thai = 'TRA_LAI') THEN loi := 'Đề đang ở bước khác, không gửi thẩm định được.'; RETURN; END IF;
    vai_tro := 'CHU_DE'; den := 'SAN_SANG_DUYET'; RETURN;
  ELSIF p_hd = 'THU_HOI_VE_NHAP' THEN
    IF NOT chu THEN loi := 'Chỉ người tạo đề mới thu hồi về bản nháp.'; RETURN; END IF;
    IF r.trang_thai NOT IN ('SAN_SANG_DUYET', 'DANG_THAM_DINH') THEN loi := 'Chỉ thu hồi được đề đang chờ hoặc đang thẩm định.'; RETURN; END IF;
    vai_tro := 'CHU_DE'; den := 'CAN_KIEM_TRA_LAI'; RETURN;
  ELSIF p_hd = 'TAO_PHIEN_BAN_MOI' THEN
    IF NOT chu THEN loi := 'Chỉ người tạo đề mới tạo phiên bản mới.'; RETURN; END IF;
    IF r.trang_thai NOT IN ('DA_DUYET', 'DA_PHAT_HANH') THEN loi := 'Chỉ tạo phiên bản mới từ đề đã duyệt hoặc đã phát hành.'; RETURN; END IF;
    vai_tro := 'CHU_DE'; den := 'CAN_KIEM_TRA_LAI'; RETURN;
  END IF;

  -- Các thao tác của người thẩm định, xác nhận, phê duyệt: không bao giờ do chính người tạo đề thực hiện
  IF p_hd IN ('BAT_DAU_THAM_DINH', 'DE_NGHI_DAT', 'YEU_CAU_CHINH_SUA', 'XAC_NHAN_TO', 'CHUYEN_BGH', 'PHE_DUYET') AND chu THEN
    loi := 'Không được tự thẩm định, xác nhận hoặc duyệt đề do chính mình tạo. Cần người khác đủ thẩm quyền.'; RETURN;
  END IF;

  IF p_hd = 'BAT_DAU_THAM_DINH' THEN
    IF r.trang_thai <> 'SAN_SANG_DUYET' THEN loi := 'Đề không ở trạng thái chờ thẩm định.'; RETURN; END IF;
    IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF pc THEN vai_tro := 'THAM_DINH_PHAN_CONG'; ELSIF bgh THEN vai_tro := 'BGH';
    ELSE loi := 'Bạn không được phân công thẩm định đề này.'; RETURN; END IF;
    den := 'DANG_THAM_DINH';
  ELSIF p_hd = 'DE_NGHI_DAT' THEN
    IF r.trang_thai <> 'DANG_THAM_DINH' THEN loi := 'Đề không ở trạng thái đang thẩm định.'; RETURN; END IF;
    IF pc THEN vai_tro := 'THAM_DINH_PHAN_CONG'; ELSIF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq;
    ELSE loi := 'Bạn không được phân công thẩm định đề này.'; RETURN; END IF;
    den := 'DANG_THAM_DINH';
  ELSIF p_hd = 'YEU_CAU_CHINH_SUA' THEN
    IF r.trang_thai IN ('SAN_SANG_DUYET', 'DANG_THAM_DINH') THEN
      IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF pc THEN vai_tro := 'THAM_DINH_PHAN_CONG'; ELSIF bgh THEN vai_tro := 'BGH';
      ELSE loi := 'Bạn không được phân công thẩm định đề này.'; RETURN; END IF;
    ELSIF r.trang_thai IN ('DA_XAC_NHAN_TO', 'CHO_BGH_DUYET') THEN
      IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH';
      ELSE loi := 'Chỉ tổ trưởng hoặc Ban giám hiệu mới yêu cầu chỉnh sửa ở bước này.'; RETURN; END IF;
    ELSE loi := 'Đề không ở bước được yêu cầu chỉnh sửa.'; RETURN; END IF;
    den := 'TRA_LAI';
  ELSIF p_hd = 'XAC_NHAN_TO' THEN
    IF r.trang_thai NOT IN ('SAN_SANG_DUYET', 'DANG_THAM_DINH') THEN loi := 'Đề chưa ở bước thẩm định cấp tổ.'; RETURN; END IF;
    IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH_NGOAI_LE';
    ELSE loi := 'Chỉ tổ trưởng (hoặc người được ủy quyền, hoặc Ban giám hiệu theo ngoại lệ) mới xác nhận cấp tổ.'; RETURN; END IF;
    den := 'DA_XAC_NHAN_TO';
  ELSIF p_hd = 'CHUYEN_BGH' THEN
    IF r.trang_thai <> 'DA_XAC_NHAN_TO' THEN loi := 'Đề cần được xác nhận cấp tổ trước.'; RETURN; END IF;
    IF tt THEN vai_tro := 'TO_TRUONG'; ELSIF uq IS NOT NULL THEN vai_tro := 'UY_QUYEN:' || uq; ELSIF bgh THEN vai_tro := 'BGH_NGOAI_LE';
    ELSE loi := 'Chỉ tổ trưởng hoặc người được ủy quyền mới chuyển đề lên Ban giám hiệu.'; RETURN; END IF;
    den := 'CHO_BGH_DUYET';
  ELSIF p_hd = 'PHE_DUYET' THEN
    IF r.trang_thai <> 'CHO_BGH_DUYET' THEN loi := 'Đề chưa ở bước chờ Ban giám hiệu phê duyệt.'; RETURN; END IF;
    IF NOT bgh THEN loi := 'Chỉ Ban giám hiệu được phân công mới phê duyệt cuối cùng.'; RETURN; END IF;
    SELECT max(tao_luc) INTO lan_gui FROM public.de_lich_su WHERE de_id = p_de AND hanh_dong = 'GUI_THAM_DINH';
    SELECT EXISTS (SELECT 1 FROM public.de_lich_su h WHERE h.de_id = p_de AND h.nguoi_thuc_hien = uid AND h.hanh_dong IN ('XAC_NHAN_TO', 'CHUYEN_BGH') AND h.tao_luc >= COALESCE(lan_gui, '-infinity'::TIMESTAMPTZ)) INTO cung_nguoi;
    IF cung_nguoi THEN loi := 'Bạn đã xác nhận đề này ở cấp tổ, cần một thành viên Ban giám hiệu khác phê duyệt cuối cùng.'; RETURN; END IF;
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

CREATE OR REPLACE FUNCTION public.hanh_dong_cho_phep(p_de UUID)
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(h), ARRAY[]::TEXT[]) FROM unnest(ARRAY[
    'GUI_THAM_DINH', 'THU_HOI_VE_NHAP', 'TAO_PHIEN_BAN_MOI', 'BAT_DAU_THAM_DINH', 'DE_NGHI_DAT', 'YEU_CAU_CHINH_SUA',
    'XAC_NHAN_TO', 'CHUYEN_BGH', 'PHE_DUYET', 'PHAT_HANH', 'THU_HOI_DE', 'LUU_TRU']) AS h
  WHERE (public.phan_tich_quyen_de(p_de, h)).loi IS NULL
$$;

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

  PERFORM set_config('app.cho_phep_chuyen', 'off', true);

  INSERT INTO public.de_lich_su (organization_id, de_id, khoi, ma_mon, ky_kiem_tra, hanh_dong, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, ten_nguoi, vai_tro_su_dung, ghi_chu, phien_ban_duyet)
  VALUES (r.organization_id, p_de, r.khoi, r.ma_mon, r.ky_kiem_tra, p_hanh_dong, r.trang_thai, a.den, uid, ten, a.vai_tro, note, pb);

  RETURN jsonb_build_object('trang_thai', a.den, 'phien_ban', pb, 'tao_phien_ban_moi', moi_ban);
END $$;

-- ============================================================================
-- 7. Chặn đi tắt quy trình ở tầng dữ liệu
-- ============================================================================
DROP TRIGGER IF EXISTS trg_guard_de_kiem_tra_quyen ON public.de_kiem_tra;
DROP FUNCTION IF EXISTS public.guard_de_kiem_tra_quyen();

CREATE OR REPLACE FUNCTION public.guard_de_kiem_tra_quy_trinh()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  qua_ham BOOLEAN := COALESCE(current_setting('app.cho_phep_chuyen', true), '') = 'on';
  drafts TEXT[] := ARRAY['BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI'];
  sua_duoc TEXT[] := ARRAY['BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI', 'TRA_LAI'];
BEGIN
  IF auth.uid() IS NULL OR qua_ham THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT (NEW.trang_thai = ANY (drafts)) THEN RAISE EXCEPTION 'Đề mới chỉ được tạo ở trạng thái bản nháp.'; END IF;
    IF NEW.duyet_boi IS NOT NULL OR NEW.duyet_luc IS NOT NULL OR NEW.ghi_chu_duyet IS NOT NULL THEN RAISE EXCEPTION 'Không được ghi thông tin duyệt khi tạo đề.'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Không được đổi người tạo đề.'; END IF;
  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai AND NOT (NEW.trang_thai = ANY (drafts) AND OLD.trang_thai = ANY (sua_duoc)) THEN
    RAISE EXCEPTION 'Trạng thái đề chỉ đổi qua các bước của quy trình thẩm định, phê duyệt.';
  END IF;
  IF NEW.du_lieu IS DISTINCT FROM OLD.du_lieu OR NEW.dac_ta_id IS DISTINCT FROM OLD.dac_ta_id OR NEW.phien_ban_dac_ta IS DISTINCT FROM OLD.phien_ban_dac_ta THEN
    IF NOT (OLD.trang_thai = ANY (sua_duoc)) THEN
      RAISE EXCEPTION 'Đề đang ở bước thẩm định hoặc đã duyệt, không sửa nội dung được. Hãy thu hồi về bản nháp hoặc tạo phiên bản mới.';
    END IF;
  END IF;
  IF NEW.duyet_boi IS DISTINCT FROM OLD.duyet_boi OR NEW.duyet_luc IS DISTINCT FROM OLD.duyet_luc OR NEW.ghi_chu_duyet IS DISTINCT FROM OLD.ghi_chu_duyet THEN
    RAISE EXCEPTION 'Thông tin duyệt chỉ ghi qua quy trình phê duyệt.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_de_kiem_tra_quy_trinh() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_de_kiem_tra_quy_trinh ON public.de_kiem_tra;
CREATE TRIGGER trg_guard_de_kiem_tra_quy_trinh BEFORE INSERT OR UPDATE ON public.de_kiem_tra
  FOR EACH ROW EXECUTE FUNCTION public.guard_de_kiem_tra_quy_trinh();

-- Lịch sử: tạo đề, xóa đề
CREATE OR REPLACE FUNCTION public.ghi_lich_su_tao_xoa_de()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE d public.de_kiem_tra%ROWTYPE; ten TEXT;
BEGIN
  d := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  SELECT full_name INTO ten FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.de_lich_su (organization_id, de_id, khoi, ma_mon, ky_kiem_tra, hanh_dong, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, ten_nguoi, vai_tro_su_dung)
  VALUES (d.organization_id, d.id, d.khoi, d.ma_mon, d.ky_kiem_tra, CASE WHEN TG_OP = 'DELETE' THEN 'XOA_DE' ELSE 'TAO_DE' END,
          CASE WHEN TG_OP = 'DELETE' THEN d.trang_thai ELSE NULL END, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE d.trang_thai END,
          auth.uid(), ten, CASE WHEN auth.uid() = d.created_by THEN 'CHU_DE' ELSE 'BGH' END);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.ghi_lich_su_tao_xoa_de() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_lich_su_tao_xoa_de ON public.de_kiem_tra;
CREATE TRIGGER trg_lich_su_tao_xoa_de AFTER INSERT OR DELETE ON public.de_kiem_tra FOR EACH ROW EXECUTE FUNCTION public.ghi_lich_su_tao_xoa_de();

-- ============================================================================
-- 8. RLS các bảng phụ
-- ============================================================================
ALTER TABLE public.de_lich_su ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS de_lich_su_select ON public.de_lich_su;
CREATE POLICY de_lich_su_select ON public.de_lich_su FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (public.xem_duoc_de_id(de_id) OR public.la_bgh(khoi)));

ALTER TABLE public.de_nhan_xet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS de_nhan_xet_select ON public.de_nhan_xet;
CREATE POLICY de_nhan_xet_select ON public.de_nhan_xet FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.xem_duoc_de_id(de_id));
DROP POLICY IF EXISTS de_nhan_xet_insert ON public.de_nhan_xet;
CREATE POLICY de_nhan_xet_insert ON public.de_nhan_xet FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id() AND tac_gia = auth.uid() AND public.xem_duoc_de_id(de_id)
    AND (public.la_chu_de(de_id)
         OR EXISTS (SELECT 1 FROM public.de_phan_cong pc WHERE pc.de_id = de_nhan_xet.de_id AND pc.nguoi_tham_dinh = auth.uid() AND pc.hieu_luc)
         OR EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = de_nhan_xet.de_id AND (public.co_vai_tro('GROUP_LEADER', d.khoi) OR public.la_bgh(d.khoi))))
  );
DROP POLICY IF EXISTS de_nhan_xet_update ON public.de_nhan_xet;
CREATE POLICY de_nhan_xet_update ON public.de_nhan_xet FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.la_chu_de(de_id))
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND public.la_chu_de(de_id));

CREATE OR REPLACE FUNCTION public.guard_de_nhan_xet()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.noi_dung IS DISTINCT FROM OLD.noi_dung OR NEW.tac_gia IS DISTINCT FROM OLD.tac_gia OR NEW.de_id IS DISTINCT FROM OLD.de_id OR NEW.thanh_phan IS DISTINCT FROM OLD.thanh_phan THEN
    RAISE EXCEPTION 'Nhận xét không sửa được, chỉ đánh dấu đã xử lý.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_de_nhan_xet() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_de_nhan_xet ON public.de_nhan_xet;
CREATE TRIGGER trg_guard_de_nhan_xet BEFORE UPDATE ON public.de_nhan_xet FOR EACH ROW EXECUTE FUNCTION public.guard_de_nhan_xet();

ALTER TABLE public.de_phan_cong ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS de_phan_cong_select ON public.de_phan_cong;
CREATE POLICY de_phan_cong_select ON public.de_phan_cong FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (nguoi_tham_dinh = auth.uid() OR public.xem_duoc_de_id(de_id)));
DROP POLICY IF EXISTS de_phan_cong_insert ON public.de_phan_cong;
CREATE POLICY de_phan_cong_insert ON public.de_phan_cong FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id() AND giao_boi = auth.uid()
    AND EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = de_phan_cong.de_id AND d.organization_id = de_phan_cong.organization_id
                AND d.created_by IS DISTINCT FROM de_phan_cong.nguoi_tham_dinh AND (public.co_vai_tro('GROUP_LEADER', d.khoi) OR public.la_bgh(d.khoi)))
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = de_phan_cong.nguoi_tham_dinh AND p.organization_id = de_phan_cong.organization_id AND COALESCE(p.is_active, true))
  );
DROP POLICY IF EXISTS de_phan_cong_update ON public.de_phan_cong;
CREATE POLICY de_phan_cong_update ON public.de_phan_cong FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND EXISTS (SELECT 1 FROM public.de_kiem_tra d WHERE d.id = de_phan_cong.de_id AND (public.co_vai_tro('GROUP_LEADER', d.khoi) OR public.la_bgh(d.khoi))))
  WITH CHECK (organization_id = public.get_auth_user_org_id());

ALTER TABLE public.de_chia_se ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS de_chia_se_select ON public.de_chia_se;
CREATE POLICY de_chia_se_select ON public.de_chia_se FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (user_id = auth.uid() OR public.la_chu_de(de_id)));
DROP POLICY IF EXISTS de_chia_se_insert ON public.de_chia_se;
CREATE POLICY de_chia_se_insert ON public.de_chia_se FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id() AND chia_se_boi = auth.uid() AND public.la_chu_de(de_id)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = de_chia_se.user_id AND p.organization_id = de_chia_se.organization_id AND COALESCE(p.is_active, true))
  );
DROP POLICY IF EXISTS de_chia_se_delete ON public.de_chia_se;
CREATE POLICY de_chia_se_delete ON public.de_chia_se FOR DELETE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND public.la_chu_de(de_id));

ALTER TABLE public.uy_quyen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS uy_quyen_select ON public.uy_quyen;
CREATE POLICY uy_quyen_select ON public.uy_quyen FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (nguoi_giao = auth.uid() OR nguoi_nhan = auth.uid() OR public.la_bgh() OR public.co_vai_tro('SYSTEM_ADMIN')));
DROP POLICY IF EXISTS uy_quyen_insert ON public.uy_quyen;
CREATE POLICY uy_quyen_insert ON public.uy_quyen FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND nguoi_giao = auth.uid());
DROP POLICY IF EXISTS uy_quyen_update ON public.uy_quyen;
CREATE POLICY uy_quyen_update ON public.uy_quyen FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND (nguoi_giao = auth.uid() OR public.la_bgh()))
  WITH CHECK (organization_id = public.get_auth_user_org_id());

GRANT SELECT ON public.de_lich_su TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.de_nhan_xet TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.de_phan_cong TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.de_chia_se TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.uy_quyen TO authenticated;
REVOKE ALL ON public.de_lich_su, public.de_nhan_xet, public.de_phan_cong, public.de_chia_se, public.uy_quyen FROM anon;

-- Quyền gọi hàm
REVOKE ALL ON FUNCTION public.vai_tro_goc(), public.user_co_vai_tro(UUID, TEXT, SMALLINT), public.co_vai_tro(TEXT, SMALLINT), public.la_bgh(SMALLINT),
  public.co_quyen_chuyen_mon(SMALLINT), public.vai_tro_cua_toi(), public.id_uy_quyen(TEXT, SMALLINT),
  public.duoc_xem_de(UUID, UUID, SMALLINT, UUID, TEXT, TEXT), public.la_chu_de(UUID), public.xem_duoc_de_id(UUID),
  public.phan_tich_quyen_de(UUID, TEXT), public.hanh_dong_cho_phep(UUID), public.chuyen_trang_thai_de(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vai_tro_goc(), public.user_co_vai_tro(UUID, TEXT, SMALLINT), public.co_vai_tro(TEXT, SMALLINT), public.la_bgh(SMALLINT),
  public.co_quyen_chuyen_mon(SMALLINT), public.vai_tro_cua_toi(), public.id_uy_quyen(TEXT, SMALLINT),
  public.duoc_xem_de(UUID, UUID, SMALLINT, UUID, TEXT, TEXT), public.la_chu_de(UUID), public.xem_duoc_de_id(UUID),
  public.phan_tich_quyen_de(UUID, TEXT), public.hanh_dong_cho_phep(UUID), public.chuyen_trang_thai_de(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 9. Giữ nguyên quyền hiện tại của tài khoản đang dùng (không mất dữ liệu, không mất quyền)
-- ============================================================================
INSERT INTO public.user_roles (organization_id, user_id, role, ly_do)
SELECT p.organization_id, p.id, v.role, 'Cấp khi áp dụng phân quyền mới, để giữ quyền thẩm định và duyệt đề đang dùng'
FROM public.profiles p CROSS JOIN (VALUES ('GROUP_LEADER'), ('SCHOOL_LEADERSHIP')) AS v(role)
WHERE p.role = 'SYSTEM_ADMIN' AND p.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = v.role);

-- Lịch sử cho đề có sẵn
INSERT INTO public.de_lich_su (organization_id, de_id, khoi, ma_mon, ky_kiem_tra, hanh_dong, den_trang_thai, nguoi_thuc_hien, ten_nguoi, vai_tro_su_dung, tao_luc)
SELECT d.organization_id, d.id, d.khoi, d.ma_mon, d.ky_kiem_tra, 'TAO_DE', 'BAN_NHAP', d.created_by, p.full_name, 'CHU_DE', d.created_at
FROM public.de_kiem_tra d LEFT JOIN public.profiles p ON p.id = d.created_by
WHERE NOT EXISTS (SELECT 1 FROM public.de_lich_su h WHERE h.de_id = d.id);
INSERT INTO public.de_lich_su (organization_id, de_id, khoi, ma_mon, ky_kiem_tra, hanh_dong, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, ten_nguoi, vai_tro_su_dung, ghi_chu, phien_ban_duyet, tao_luc)
SELECT d.organization_id, d.id, d.khoi, d.ma_mon, d.ky_kiem_tra, 'PHE_DUYET', 'SAN_SANG_DUYET', 'DA_DUYET', d.duyet_boi, p.full_name, 'BGH', d.ghi_chu_duyet,
       (SELECT max(dd.phien_ban) FROM public.de_da_duyet dd WHERE dd.de_id = d.id), COALESCE(d.duyet_luc, d.updated_at)
FROM public.de_kiem_tra d LEFT JOIN public.profiles p ON p.id = d.duyet_boi
WHERE d.trang_thai = 'DA_DUYET' AND NOT EXISTS (SELECT 1 FROM public.de_lich_su h WHERE h.de_id = d.id AND h.hanh_dong = 'PHE_DUYET');
