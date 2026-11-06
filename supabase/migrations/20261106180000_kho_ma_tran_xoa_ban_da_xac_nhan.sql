-- ThayKhaiEdu - Kho ma trận: cho tổ trưởng, quản trị xóa cả bản đã xác nhận (06/11/2026)
-- Dùng khi phát hiện file ma trận sai (sai năm học, sai kì...) cần gỡ bỏ hẳn.
-- Bản chờ xác nhận: tổ trưởng, tổ phó, quản trị xóa như trước.
-- Chưa có bảng nào tham chiếu tai_lieu_ma_tran nên xóa không ảnh hưởng dữ liệu khác.

DROP POLICY IF EXISTS tai_lieu_ma_tran_delete_pending ON public.tai_lieu_ma_tran;
DROP POLICY IF EXISTS tai_lieu_ma_tran_delete ON public.tai_lieu_ma_tran;
CREATE POLICY tai_lieu_ma_tran_delete ON public.tai_lieu_ma_tran
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id()
    AND (
      (trang_thai = 'CHO_XAC_NHAN'
        AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
      OR (trang_thai = 'DA_XAC_NHAN'
        AND public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'))
    )
  );
