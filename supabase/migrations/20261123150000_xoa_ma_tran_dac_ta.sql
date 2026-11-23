-- ThayKhaiEdu: giáo viên xóa được ma trận riêng, đặc tả của chính mình (quyết định của tổ trưởng ngày 23/11/2026).
--
-- - Ai nấy xóa của mình (chu_so_huu = người đang đăng nhập). Tổ trưởng không xóa hộ.
-- - Xóa được mọi bản: bản nháp, phiên bản đã xác nhận, bản đã cất, kể cả bộ đang dùng.
-- - Xóa ma trận riêng thì xóa theo các đặc tả lập từ nó; xóa đặc tả thì xóa theo đề còn ở bước soạn
--   (bản nháp, cần kiểm tra, có lỗi, cần kiểm tra lại, bị trả lại) của chính người đó.
-- - Chặn nếu có đề đã gửi duyệt trở đi, hoặc đã có bản đề đã duyệt (de_da_duyet) dựa vào đặc tả.
-- - Hàm chạy với quyền người gọi (RLS vẫn áp dụng). Gọi p_thuc_hien = false để xem trước sẽ xóa những gì.

-- 1. Quyền xóa: bản nháp như cũ (người ghi được), thêm: chủ sở hữu xóa mọi bản của mình -----------------
DROP POLICY IF EXISTS ma_tran_rieng_delete_draft ON public.ma_tran_rieng;
DROP POLICY IF EXISTS ma_tran_rieng_delete ON public.ma_tran_rieng;
CREATE POLICY ma_tran_rieng_delete ON public.ma_tran_rieng FOR DELETE
  USING (
    organization_id = public.get_auth_user_org_id()
    AND ((la_ban_nhap AND public.ghi_duoc_ma_tran_cua(chu_so_huu)) OR chu_so_huu = auth.uid())
  );

DROP POLICY IF EXISTS dac_ta_delete_draft ON public.dac_ta;
DROP POLICY IF EXISTS dac_ta_delete ON public.dac_ta;
CREATE POLICY dac_ta_delete ON public.dac_ta FOR DELETE
  USING (
    organization_id = public.get_auth_user_org_id()
    AND ((la_ban_nhap AND public.ghi_duoc_ma_tran_cua(chu_so_huu)) OR chu_so_huu = auth.uid())
  );

-- 2. Hàm xem trước / xóa --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.xoa_ma_tran_dac_ta(p_ma_tran UUID[], p_dac_ta UUID[], p_thuc_hien BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org UUID := public.get_auth_user_org_id();
  v_mtr UUID[];
  v_dt UUID[];
  v_de UUID[];
  v_chan TEXT[] := ARRAY[]::TEXT[];
  v_kq JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập.'; END IF;
  p_ma_tran := COALESCE(p_ma_tran, ARRAY[]::UUID[]);
  p_dac_ta := COALESCE(p_dac_ta, ARRAY[]::UUID[]);

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) INTO v_mtr FROM public.ma_tran_rieng
    WHERE id = ANY(p_ma_tran) AND organization_id = v_org AND chu_so_huu = v_uid;
  IF cardinality(v_mtr) <> cardinality(ARRAY(SELECT DISTINCT unnest(p_ma_tran))) THEN
    RAISE EXCEPTION 'Chỉ xóa được ma trận riêng của chính thầy cô.';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) INTO v_dt FROM public.dac_ta
    WHERE id = ANY(p_dac_ta) AND organization_id = v_org AND chu_so_huu = v_uid;
  IF cardinality(v_dt) <> cardinality(ARRAY(SELECT DISTINCT unnest(p_dac_ta))) THEN
    RAISE EXCEPTION 'Chỉ xóa được bản đặc tả của chính thầy cô.';
  END IF;

  -- Đặc tả lập từ các ma trận riêng bị xóa cũng phải xóa theo
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::UUID[]) INTO v_dt FROM public.dac_ta
    WHERE organization_id = v_org AND (id = ANY(v_dt) OR ma_tran_rieng_id = ANY(v_mtr));
  IF EXISTS (SELECT 1 FROM public.dac_ta WHERE id = ANY(v_dt) AND chu_so_huu <> v_uid) THEN
    v_chan := v_chan || 'Có bản đặc tả của người khác lập từ ma trận này.';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) INTO v_de FROM public.de_kiem_tra WHERE dac_ta_id = ANY(v_dt);

  v_chan := v_chan || ARRAY(
    SELECT format('Đề %s đang ở trạng thái "%s" (đã gửi duyệt hoặc của người khác) nên không xóa được.', COALESCE(ma_de, ''), trang_thai)
    FROM public.de_kiem_tra
    WHERE id = ANY(v_de)
      AND (created_by IS DISTINCT FROM v_uid
           OR trang_thai NOT IN ('BAN_NHAP', 'CAN_KIEM_TRA', 'CO_LOI', 'CAN_KIEM_TRA_LAI', 'TRA_LAI'))
  );
  v_chan := v_chan || ARRAY(
    SELECT format('Đã có đề được duyệt (phiên bản %s) dựa vào đặc tả phiên bản %s, phải giữ lại.', phien_ban, phien_ban_dac_ta)
    FROM public.de_da_duyet WHERE dac_ta_id = ANY(v_dt)
  );

  v_kq := jsonb_build_object(
    'maTran', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'phienBan', phien_ban, 'banNhap', la_ban_nhap, 'daCat', cat_luc IS NOT NULL) ORDER BY la_ban_nhap, phien_ban)
                        FROM public.ma_tran_rieng WHERE id = ANY(v_mtr)), '[]'::jsonb),
    'dacTa', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'phienBan', phien_ban, 'banNhap', la_ban_nhap, 'daCat', cat_luc IS NOT NULL) ORDER BY la_ban_nhap, phien_ban)
                       FROM public.dac_ta WHERE id = ANY(v_dt)), '[]'::jsonb),
    'de', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'trangThai', trang_thai)) FROM public.de_kiem_tra WHERE id = ANY(v_de)), '[]'::jsonb),
    'chan', to_jsonb(v_chan),
    'daXoa', false
  );

  IF NOT p_thuc_hien OR cardinality(v_chan) > 0 THEN RETURN v_kq; END IF;

  DELETE FROM public.de_kiem_tra WHERE id = ANY(v_de);
  DELETE FROM public.dac_ta WHERE id = ANY(v_dt);
  DELETE FROM public.ma_tran_rieng WHERE id = ANY(v_mtr);
  -- RLS có thể lặng lẽ bỏ qua dòng không được xóa: kiểm tra lại, sót thì hủy cả lần xóa
  IF EXISTS (SELECT 1 FROM public.de_kiem_tra WHERE id = ANY(v_de))
     OR EXISTS (SELECT 1 FROM public.dac_ta WHERE id = ANY(v_dt))
     OR EXISTS (SELECT 1 FROM public.ma_tran_rieng WHERE id = ANY(v_mtr)) THEN
    RAISE EXCEPTION 'Không xóa được hết (thiếu quyền với một số bản). Chưa xóa gì.';
  END IF;
  RETURN jsonb_set(v_kq, '{daXoa}', 'true'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.xoa_ma_tran_dac_ta(UUID[], UUID[], BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.xoa_ma_tran_dac_ta(UUID[], UUID[], BOOLEAN) TO authenticated;
