import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getNavigationForRole } from '../src/core/constants/navigation';

const sql = readFileSync('supabase/migrations/20261107170000_gmail_vai_tro_quyen_giao_vien.sql', 'utf8');

describe('migration đăng ký Gmail và quyền giáo viên', () => {
  it('có bảng đăng ký Gmail và bảng quyền, nhật ký quyền chỉ thêm', () => {
    for (const b of ['email_vai_tro', 'quyen_giao_vien', 'quyen_gv_nhat_ky']) expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${b}`));
    expect(sql).toMatch(/trg_quyen_gv_nhat_ky_chi_them[\s\S]*guard_chi_them/);
  });
  it('Gmail đăng ký tự áp dụng khi tài khoản mới được tạo', () => {
    expect(sql).toMatch(/AFTER INSERT ON public\.profiles[\s\S]*trg_ap_dung_email_khi_tao_profile/);
  });
  it('Ban giám hiệu thuần không nhận vai trò giáo viên', () => {
    expect(sql).toMatch(/WHEN 'TEACHER' = ANY \(r\) THEN 'TEACHER'\s+WHEN 'SCHOOL_LEADERSHIP' = ANY \(r\) THEN 'SCHOOL_LEADERSHIP'/);
  });
  it('quyền được chặn bằng chính sách ở cơ sở dữ liệu cho đề, ma trận, đặc tả, mục lục, sách', () => {
    for (const t of ['de_kiem_tra_insert', 'dac_ta_insert_leader', 'ma_tran_rieng_insert_leader', 'de_phan_cong_insert']) expect(sql).toContain(t);
    expect(sql).toContain("co_quyen_ghi(''NAP_MUC_LUC_SACH'')");
    expect(sql).toContain("co_quyen_ghi('SUA_MA_TRAN_DAC_TA')");
    expect(sql).toContain("user_co_quyen_gv(auth.uid(), 'SOAN_DE', khoi)");
  });
  it('chỉ tổ trưởng của tổ hoặc quản trị được áp dụng quyền, không tự đổi quyền của mình', () => {
    expect(sql).toMatch(/ap_dung_quyen_to[\s\S]*co_vai_tro\('GROUP_LEADER', p_khoi\)/);
    expect(sql).toContain('Không tự đổi quyền của chính mình.');
  });
});

describe('thực đơn theo vai trò', () => {
  it('Ban giám hiệu thuần chỉ thấy tổng quan, duyệt đề và ủy quyền', () => {
    const hrefs = getNavigationForRole('SCHOOL_LEADERSHIP').map((n) => n.href).sort();
    expect(hrefs).toEqual(['/dashboard', '/phan-quyen', '/tests']);
  });
  it('giáo viên không thấy trang vai trò và ủy quyền', () => {
    expect(getNavigationForRole('TEACHER').map((n) => n.href)).not.toContain('/phan-quyen');
  });
});
