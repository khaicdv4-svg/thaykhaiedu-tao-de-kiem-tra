-- ==============================================================================
-- THAYKHAIEDU - COMPLETE ROW LEVEL SECURITY (RLS) FOR 100% PUBLIC TABLES
-- Migration Version: 20261103000002
-- Bật RLS cho 100% bảng public và định nghĩa chính sách phân quyền theo SPEC mục 3 & 9
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BẬT RLS CHO 10 BẢNG CÒN THIẾU
-- ------------------------------------------------------------------------------
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valid_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_grade_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_subject_links ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. CHÍNH SÁCH CHO BẢNG TRA CỨU & DANH MỤC (LOOKUP & METADATA TABLES)
-- Chỉ authenticated users mới được SELECT; Chặn hoàn toàn anon; Chỉ SYSTEM_ADMIN được ghi
-- ------------------------------------------------------------------------------

-- academic_years
CREATE POLICY "Authenticated users can read academic years"
  ON public.academic_years FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admin can manage academic years"
  ON public.academic_years FOR ALL
  TO authenticated
  USING (public.get_auth_user_role() = 'SYSTEM_ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'SYSTEM_ADMIN');

-- grades
CREATE POLICY "Authenticated users can read grades"
  ON public.grades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admin can manage grades"
  ON public.grades FOR ALL
  TO authenticated
  USING (public.get_auth_user_role() = 'SYSTEM_ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'SYSTEM_ADMIN');

-- subjects
CREATE POLICY "Authenticated users can read subjects"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admin can manage subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.get_auth_user_role() = 'SYSTEM_ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'SYSTEM_ADMIN');

-- roles & permissions
CREATE POLICY "Authenticated users can read roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read valid transitions"
  ON public.valid_status_transitions FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- 3. CHÍNH SÁCH CHO TỔ CHUYÊN MÔN (PROFESSIONAL GROUPS & MEMBERS)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view professional groups in same school"
  ON public.professional_groups FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id() OR 
    public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

CREATE POLICY "School admin and group leaders can update group info"
  ON public.professional_groups FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_auth_user_org_id() AND
    (public.get_auth_user_role() IN ('SCHOOL_ADMIN', 'SYSTEM_ADMIN') OR leader_user_id = auth.uid())
  )
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
  );

CREATE POLICY "Users can view members of groups in same school"
  ON public.professional_group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_groups pg
      WHERE pg.id = group_id AND pg.organization_id = public.get_auth_user_org_id()
    ) OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

CREATE POLICY "School admin can manage group members"
  ON public.professional_group_members FOR ALL
  TO authenticated
  USING (
    public.get_auth_user_role() IN ('SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    public.get_auth_user_role() IN ('SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

-- ------------------------------------------------------------------------------
-- 4. VÁ LỖ HỔNG UPDATE TRÊN BẢNG TESTS VÀ HOÀN THIỆN RLS TESTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Creators can update their own un-locked tests" ON public.tests;
DROP POLICY IF EXISTS "Scope-based read access to tests" ON public.tests;

CREATE POLICY "Scope-based read access to tests"
  ON public.tests FOR SELECT
  TO authenticated
  USING (
    public.get_auth_user_role() = 'SYSTEM_ADMIN' OR
    (
      organization_id = public.get_auth_user_org_id() AND
      (
        creator_id = auth.uid() OR
        (cross_reviewer_id = auth.uid() AND status NOT IN ('DRAFT', 'READY')) OR
        (approver_id = auth.uid() AND status IN ('PRINCIPAL_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')) OR
        (public.get_auth_user_role() = 'SCHOOL_ADMIN' AND status IN ('PRINCIPAL_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')) OR
        (public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER') AND status NOT IN ('DRAFT', 'READY')) OR
        (scope = 'SCHOOL' AND status IN ('TEAM_REVIEW', 'PRINCIPAL_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')) OR
        (scope IN ('SHARED_LIBRARY', 'SYSTEM') AND status = 'PUBLISHED')
      )
    )
  );

-- Tác giả chỉ được sửa khi đề ở trạng thái có thể sửa (DRAFT, READY, RETURNED_FOR_REVISION)
CREATE POLICY "Creators can update their own editable tests"
  ON public.tests FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() AND 
    status IN ('DRAFT', 'READY', 'RETURNED_FOR_REVISION')
  )
  WITH CHECK (
    creator_id = auth.uid() AND 
    status IN ('DRAFT', 'READY', 'RETURNED_FOR_REVISION')
  );

-- Chỉ cho phép xóa đề khi còn ở trạng thái DRAFT
CREATE POLICY "Creators can delete their own draft tests"
  ON public.tests FOR DELETE
  TO authenticated
  USING (
    creator_id = auth.uid() AND 
    status = 'DRAFT'
  );

-- ------------------------------------------------------------------------------
-- 5. CHÍNH SÁCH BẢO VỆ PHIÊN BẢN & KIỂM TRA CHÉO (TEST VERSIONS & CROSS REVIEWS)
-- ------------------------------------------------------------------------------
CREATE POLICY "Read test versions matching test access"
  ON public.test_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.organization_id = public.get_auth_user_org_id()
    ) OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

CREATE POLICY "Insert test version on submit or review"
  ON public.test_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.organization_id = public.get_auth_user_org_id()
    )
  );

-- Bất biến: Không ai được UPDATE hoặc DELETE test_versions

-- cross_reviews
CREATE POLICY "Users can view cross reviews related to them"
  ON public.cross_reviews FOR SELECT
  TO authenticated
  USING (
    reviewer_id = auth.uid() OR
    assigned_by_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.creator_id = auth.uid()
    ) OR
    public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

CREATE POLICY "Group leader and school admin can assign cross review"
  ON public.cross_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_auth_user_role() IN ('GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
  );

CREATE POLICY "Reviewer can update review progress status"
  ON public.cross_reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- review_comments
CREATE POLICY "Users can view review comments for permitted tests"
  ON public.review_comments FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND (
        t.creator_id = auth.uid() OR
        t.cross_reviewer_id = auth.uid() OR
        public.get_auth_user_role() IN ('GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN')
      )
    )
  );

CREATE POLICY "Reviewers and team members can add comments"
  ON public.review_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.organization_id = public.get_auth_user_org_id()
    )
  );

-- approval_records
CREATE POLICY "Users can view approval records of tests in their school"
  ON public.approval_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.organization_id = public.get_auth_user_org_id()
    ) OR public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

CREATE POLICY "School admin and group leader can record approvals"
  ON public.approval_records FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_id = auth.uid() AND
    public.get_auth_user_role() IN ('SCHOOL_ADMIN', 'GROUP_LEADER', 'SYSTEM_ADMIN')
  );

-- ------------------------------------------------------------------------------
-- 6. CHÍNH SÁCH NHẬT KÝ KIỂM TOÁN (AUDIT LOGS - BẤT BIẾN)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins and leaders can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.get_auth_user_role() IN ('SCHOOL_ADMIN', 'GROUP_LEADER', 'SYSTEM_ADMIN') OR
    actor_id = auth.uid()
  );

CREATE POLICY "Authenticated users can append audit log"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Không tạo policy UPDATE/DELETE cho audit_logs -> Nhật ký kiểm toán không thể bị sửa/xóa

-- ------------------------------------------------------------------------------
-- 7. CHÍNH SÁCH MẪU ĐỀ (EXAM TEMPLATES)
-- ------------------------------------------------------------------------------
CREATE POLICY "Scope-based read access to exam templates"
  ON public.exam_templates FOR SELECT
  TO authenticated
  USING (
    template_type = 'SYSTEM_TEMPLATE' OR
    scope IN ('SHARED_LIBRARY', 'SYSTEM') OR
    (
      organization_id = public.get_auth_user_org_id() AND
      (
        owner_id = auth.uid() OR
        scope IN ('SCHOOL', 'GROUP')
      )
    ) OR
    public.get_auth_user_role() = 'SYSTEM_ADMIN'
  );

CREATE POLICY "Users can create personal or org templates"
  ON public.exam_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid() AND
    organization_id = public.get_auth_user_org_id()
  );

CREATE POLICY "Owners and school admins can update templates"
  ON public.exam_templates FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    (organization_id = public.get_auth_user_org_id() AND public.get_auth_user_role() IN ('SCHOOL_ADMIN', 'GROUP_LEADER'))
  )
  WITH CHECK (
    organization_id = public.get_auth_user_org_id()
  );

-- ------------------------------------------------------------------------------
-- 8. CHÍNH SÁCH LIÊN KẾT TÀI NGUYÊN (RESOURCE LINKS)
-- ------------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view resource grade links"
  ON public.resource_grade_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view resource subject links"
  ON public.resource_subject_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Resource owners can manage grade links"
  ON public.resource_grade_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_id AND (r.owner_id = auth.uid() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_id AND (r.owner_id = auth.uid() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY "Resource owners can manage subject links"
  ON public.resource_subject_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_id AND (r.owner_id = auth.uid() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_id AND (r.owner_id = auth.uid() OR public.get_auth_user_role() = 'SYSTEM_ADMIN')
    )
  );
