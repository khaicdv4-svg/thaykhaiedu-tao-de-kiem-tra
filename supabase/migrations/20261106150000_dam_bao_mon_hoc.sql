-- ThayKhaiEdu - Tự thêm môn học còn thiếu khi nhập PPCT từ PPCT HUB (06/11/2026)
--
-- Lỗi gặp ngày 06/11/2026: PPCT HUB ghi mã môn dạng 'subj-toan4', 'subj-tv4'... nhưng danh mục
-- public.subjects chỉ có 'sub-math', 'sub-vietnamese'. Lưu PPCT bị khóa ngoại chặn (HTTP 409),
-- giáo viên tải lại trang thì mất hết phần đã nhập.
--
-- Bảng subjects chỉ quản trị hệ thống được ghi (RLS). Hàm dưới đây chạy với quyền chủ sở hữu,
-- cho tổ trưởng / tổ phó / quản trị trường thêm môn còn thiếu, chỉ nhận mã đúng dạng PPCT HUB.

-- Bảy môn khối 4 đã biết
INSERT INTO public.subjects (id, code, name, applicable_grades) VALUES
  ('subj-toan4', 'SUBJ-TOAN4', 'Toán 4', '{4}'),
  ('subj-tv4', 'SUBJ-TV4', 'Tiếng Việt 4', '{4}'),
  ('subj-kh4', 'SUBJ-KH4', 'Khoa học 4', '{4}'),
  ('subj-lsdl4', 'SUBJ-LSDL4', 'Lịch sử và Địa lí 4', '{4}'),
  ('subj-cn4', 'SUBJ-CN4', 'Công nghệ 4', '{4}'),
  ('subj-dd4', 'SUBJ-DD4', 'Đạo đức 4', '{4}'),
  ('subj-hdtn4', 'SUBJ-HDTN4', 'Hoạt động trải nghiệm 4', '{4}')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dam_bao_mon_hoc(p_id TEXT, p_ten TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_khoi INT;
BEGIN
  IF public.get_auth_user_role() NOT IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN') THEN
    RAISE EXCEPTION 'Chỉ tổ trưởng, tổ phó hoặc quản trị mới được nhập PPCT.';
  END IF;
  IF p_id IS NULL OR p_id !~ '^subj-[a-z]{1,20}[1-5]$' THEN
    RAISE EXCEPTION 'Mã môn "%" không đúng dạng của PPCT HUB.', p_id;
  END IF;
  v_khoi := right(p_id, 1)::INT;
  INSERT INTO public.subjects (id, code, name, applicable_grades)
  VALUES (p_id, upper(p_id), left(coalesce(nullif(trim(p_ten), ''), p_id), 100), ARRAY[v_khoi])
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.dam_bao_mon_hoc(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dam_bao_mon_hoc(TEXT, TEXT) TO authenticated;
