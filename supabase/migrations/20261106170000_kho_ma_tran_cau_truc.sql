-- ThayKhaiEdu - Kho ma trận: lưu thêm cấu trúc bảng để xem lại đúng dạng bảng (06/11/2026)
-- cau_truc: danh sách khối (đoạn văn, bảng có ô gộp) đọc từ file Word lúc tải lên.
-- Chỉ dùng để hiển thị. Chữ thuần (noi_dung) vẫn là dữ liệu chính, không đổi.
-- Bản tải lên trước đây chưa có cau_truc: tải lại đúng file đó thì app bổ sung vào chính bản cũ,
-- không tạo phiên bản mới. Đã có cau_truc thì không sửa được nữa.

ALTER TABLE public.tai_lieu_ma_tran ADD COLUMN IF NOT EXISTS cau_truc JSONB;

ALTER TABLE public.tai_lieu_ma_tran DROP CONSTRAINT IF EXISTS tai_lieu_ma_tran_cau_truc_gioi_han;
ALTER TABLE public.tai_lieu_ma_tran ADD CONSTRAINT tai_lieu_ma_tran_cau_truc_gioi_han
  CHECK (cau_truc IS NULL OR pg_column_size(cau_truc) <= 2000000);

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
  IF OLD.cau_truc IS NOT NULL AND NEW.cau_truc IS DISTINCT FROM OLD.cau_truc THEN
    RAISE EXCEPTION 'Cấu trúc bảng đã lưu không sửa được.';
  END IF;
  RETURN NEW;
END;
$$;

-- Bổ sung cấu trúc cho bản đã xác nhận: tổ trưởng nào cũng làm được (chính sách cũ chỉ cho người đã xác nhận).
-- Hàm chạy quyền cao, chỉ ghi cau_truc khi đang rỗng và nội dung chữ khớp đúng.
CREATE OR REPLACE FUNCTION public.bo_sung_cau_truc_ma_tran(p_id UUID, p_noi_dung TEXT, p_cau_truc JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  so_dong INTEGER;
BEGIN
  IF public.get_auth_user_role() NOT IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN') THEN
    RAISE EXCEPTION 'Không có quyền.';
  END IF;
  UPDATE public.tai_lieu_ma_tran
     SET cau_truc = p_cau_truc
   WHERE id = p_id
     AND organization_id = public.get_auth_user_org_id()
     AND cau_truc IS NULL
     AND noi_dung = p_noi_dung;
  GET DIAGNOSTICS so_dong = ROW_COUNT;
  RETURN so_dong > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.bo_sung_cau_truc_ma_tran(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bo_sung_cau_truc_ma_tran(UUID, TEXT, JSONB) TO authenticated;
