import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRANG_THAI_KHOA, TRANG_THAI_NHAP, trangThaiDeSauKhiSua, trangThaiDeSauKiemDinh } from '../src/core/de/de';

const sql = readFileSync('supabase/migrations/20261107150000_phan_quyen_vai_tro_quy_trinh.sql', 'utf8');

describe('migration phân quyền và quy trình duyệt đề', () => {
  it('có đủ bảng vai trò, ủy quyền, lịch sử, nhận xét, phân công, chia sẻ', () => {
    for (const b of ['user_roles', 'uy_quyen', 'de_lich_su', 'de_nhan_xet', 'de_phan_cong', 'de_chia_se']) expect(sql).toMatch(new RegExp(`CREATE TABLE[^;]*${b}`));
  });
  it('mọi hành động quy trình đi qua hàm chuyển trạng thái, có chặn tự duyệt đề của mình', () => {
    expect(sql).toMatch(/chuyen_trang_thai_de/);
    expect(sql).toMatch(/guard_de_kiem_tra_quy_trinh/);
    expect(sql).toMatch(/PHE_DUYET/);
  });
  it('ủy quyền không bao giờ gồm PHE_DUYET', () => {
    const i = sql.search(/CREATE TABLE[^;]*uy_quyen/);
    const khoi = sql.slice(i, sql.indexOf(';', i));
    expect(khoi).not.toMatch(/PHE_DUYET/);
  });
  it('nhật ký chỉ thêm, không sửa không xóa', () => {
    expect(sql).toMatch(/guard_chi_them/);
  });
});

describe('trạng thái đề nhiều cấp', () => {
  it('đề đã khóa khi sửa phải quay về cần kiểm tra lại', () => {
    for (const t of ['DA_DUYET', 'DA_PHAT_HANH'] as const) expect(trangThaiDeSauKhiSua(t)).toBe('CAN_KIEM_TRA_LAI');
  });
  it('đề đang soạn sửa vẫn là bản nháp', () => {
    for (const t of TRANG_THAI_NHAP) expect(TRANG_THAI_KHOA).not.toContain(t);
  });
  it('trạng thái khóa gồm đề đã duyệt và đã phát hành', () => {
    expect(TRANG_THAI_KHOA).toEqual(expect.arrayContaining(['DA_DUYET', 'DA_PHAT_HANH']));
    expect(typeof trangThaiDeSauKiemDinh).toBe('function');
  });
});
