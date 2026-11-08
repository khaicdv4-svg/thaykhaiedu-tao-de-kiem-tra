-- ThayKhaiEdu - Thông báo trong trường (08/11/2026)
-- Dùng đầu tiên cho: ma trận của tổ được cập nhật (tổ trưởng xác nhận bản mới).
-- Mọi tài khoản trong trường đọc được; tổ trưởng, tổ phó, quản trị mới tạo được.
-- Mỗi người tự đánh dấu "đã đọc" cho riêng mình.

CREATE TABLE IF NOT EXISTS public.thong_bao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  loai VARCHAR(30) NOT NULL DEFAULT 'MA_TRAN',
  tieu_de VARCHAR(300) NOT NULL,
  noi_dung TEXT NOT NULL DEFAULT '',
  lien_ket VARCHAR(300),
  tao_boi UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT thong_bao_noi_dung_gioi_han CHECK (char_length(noi_dung) <= 5000)
);

CREATE INDEX IF NOT EXISTS thong_bao_theo_truong ON public.thong_bao (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.thong_bao_da_doc (
  thong_bao_id UUID NOT NULL REFERENCES public.thong_bao(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thong_bao_id, user_id)
);

ALTER TABLE public.thong_bao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thong_bao_da_doc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS thong_bao_select_org ON public.thong_bao;
CREATE POLICY thong_bao_select_org ON public.thong_bao
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_user_org_id());

DROP POLICY IF EXISTS thong_bao_insert_leader ON public.thong_bao;
CREATE POLICY thong_bao_insert_leader ON public.thong_bao
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
    AND tao_boi = auth.uid()
    AND public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

DROP POLICY IF EXISTS thong_bao_da_doc_select_own ON public.thong_bao_da_doc;
CREATE POLICY thong_bao_da_doc_select_own ON public.thong_bao_da_doc
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS thong_bao_da_doc_insert_own ON public.thong_bao_da_doc;
CREATE POLICY thong_bao_da_doc_insert_own ON public.thong_bao_da_doc
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.thong_bao t
      WHERE t.id = thong_bao_id AND t.organization_id = public.get_auth_user_org_id()
    )
  );

GRANT SELECT, INSERT ON public.thong_bao TO authenticated;
GRANT SELECT, INSERT ON public.thong_bao_da_doc TO authenticated;
REVOKE ALL ON public.thong_bao FROM anon;
REVOKE ALL ON public.thong_bao_da_doc FROM anon;
