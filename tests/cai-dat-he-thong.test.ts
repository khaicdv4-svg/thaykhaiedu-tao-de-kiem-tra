import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20261115160000_cai_dat_he_thong.sql', 'utf8');

describe('cài đặt hệ thống: quyền ghi ở cơ sở dữ liệu', () => {
  it('chỉ quản trị hoặc BGH của chính trường được sửa thông tin trường', () => {
    expect(sql).toMatch(/cai_dat_truong_update ON public\.organizations FOR UPDATE/);
    expect(sql).toContain("id = public.get_auth_user_org_id() AND public.co_vai_tro('SCHOOL_ADMIN')");
  });
  it('thêm tổ chỉ trong trường của mình', () => {
    expect(sql).toMatch(/cai_dat_to_insert[\s\S]*organization_id = public\.get_auth_user_org_id\(\)/);
  });
  it('đặt năm học hiện tại chỉ dành cho quản trị hệ thống, không cho khách', () => {
    expect(sql).toMatch(/dat_nam_hoc_hien_tai[\s\S]*co_vai_tro\('SYSTEM_ADMIN'\)/);
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.dat_nam_hoc_hien_tai(UUID) FROM PUBLIC, anon');
  });
});
