-- Dọn cảnh báo bảo mật của Supabase an toàn, không đổi hành vi ứng dụng.
-- 1) Cố định search_path cho các hàm trigger.
alter function public.handle_updated_at() set search_path = public;
alter function public.validate_cross_reviewer_trigger() set search_path = public;
alter function public.validate_exam_status_transition() set search_path = public;

-- 2) Hàm chỉ dùng cho trigger không cần ai gọi qua API (/rest/v1/rpc).
revoke execute on function public.guard_reading_passage_review() from public, anon, authenticated;
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;

-- Các hàm còn lại (get_auth_user_org_id, get_auth_user_role, is_user_in_group) được chính sách RLS gọi,
-- và bo_sung_cau_truc_ma_tran, dam_bao_mon_hoc được ứng dụng gọi: giữ nguyên.
