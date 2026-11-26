-- ThayKhaiEdu: bài đọc Tiếng Việt chọn ở bước 1 (quyết định của tổ trưởng ngày 26/11/2026).
--
-- Mỗi người một bộ bài đọc cho từng khối, kì: 1 bài đọc hiểu + 4 bài đọc thành tiếng (chữ của đoạn đã cắt, tác giả, nguồn).
-- Bước 4 lấy phần bài đọc từ đây; câu hỏi, đáp án vẫn lưu trong đề.
-- Chỉ thêm bảng mới, không sửa bảng cũ. Ai nấy đọc, ghi, xóa bộ của mình.

CREATE TABLE IF NOT EXISTS public.bai_doc_chon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chu_so_huu UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  khoi SMALLINT NOT NULL CHECK (khoi BETWEEN 1 AND 5),
  ky_kiem_tra VARCHAR(20) NOT NULL CHECK (ky_kiem_tra IN ('GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM')),
  du_lieu JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bai_doc_chon_du_lieu_is_object CHECK (jsonb_typeof(du_lieu) = 'object'),
  CONSTRAINT bai_doc_chon_mot_bo UNIQUE (chu_so_huu, khoi, ky_kiem_tra)
);

DROP TRIGGER IF EXISTS trg_bai_doc_chon_updated_at ON public.bai_doc_chon;
CREATE TRIGGER trg_bai_doc_chon_updated_at
  BEFORE UPDATE ON public.bai_doc_chon
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bai_doc_chon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bai_doc_chon_cua_minh ON public.bai_doc_chon;
CREATE POLICY bai_doc_chon_cua_minh ON public.bai_doc_chon FOR ALL TO authenticated
  USING (organization_id = public.get_auth_user_org_id() AND chu_so_huu = auth.uid())
  WITH CHECK (organization_id = public.get_auth_user_org_id() AND chu_so_huu = auth.uid());
