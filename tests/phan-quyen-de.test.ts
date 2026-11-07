import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Hồi quy: migration phân quyền đề phải giữ đúng các quy tắc (kiểm thử thật trên Supabase đã chạy tay khi áp dụng).
const sql = readFileSync('supabase/migrations/20261107140000_phan_quyen_de.sql', 'utf8');

describe('phân quyền đề kiểm tra', () => {
  it('giáo viên chỉ xóa đề mình tạo và chưa duyệt; quản lý xóa mọi đề', () => {
    expect(sql).toMatch(/created_by = auth\.uid\(\) AND trang_thai <> 'DA_DUYET'/);
    expect(sql).toMatch(/la_vai_tro_quan_ly\(\) OR/);
  });
  it('giáo viên không tự duyệt hay đổi người tạo', () => {
    expect(sql).toMatch(/Giáo viên không được duyệt hoặc trả lại đề/);
    expect(sql).toMatch(/Không được đổi người tạo đề/);
  });
  it('người dùng không tự đổi vai trò hoặc trường', () => {
    expect(sql).toMatch(/role::text = public\.get_auth_user_role\(\)::text/);
    expect(sql).toMatch(/organization_id IS NOT DISTINCT FROM public\.get_auth_user_org_id\(\)/);
  });
});
