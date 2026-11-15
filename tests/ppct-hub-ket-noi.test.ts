import { describe, it, expect } from 'vitest';
import { canDongBo, docDongTrangThai, ngayGio, tongHopTrangThai } from '@/core/curriculum/ppct-hub-ket-noi';

const dong = (lop: number, subject_id: string, trang_thai: string, xuong_dong_bo_luc: string | null = null) =>
  docDongTrangThai({
    lop,
    subject_id,
    ten_mon: subject_id,
    hub_version: 'v1',
    hub_published_at: '2026-11-12T12:09:28Z',
    hub_so_tiet: 35,
    hub_so_bai: 10,
    xuong_version: xuong_dong_bo_luc ? 'v1' : null,
    xuong_dong_bo_luc,
    xuong_so_tiet: xuong_dong_bo_luc ? 35 : null,
    trang_thai,
  });

describe('Kết nối kho chung PPCT HUB', () => {
  it('đọc dòng từ Postgres, số dạng chuỗi vẫn ra số', () => {
    const d = docDongTrangThai({ lop: '4', subject_id: 'subj-tv4', ten_mon: 'Tiếng Việt', hub_so_tiet: '245', trang_thai: 'khop' });
    expect(d).toMatchObject({ lop: 4, subjectId: 'subj-tv4', tenMon: 'Tiếng Việt', hubSoTiet: 245, xuongSoTiet: null, trangThai: 'khop' });
  });

  it('trạng thái lạ thì coi như chưa lấy về', () => {
    expect(docDongTrangThai({ lop: 4, subject_id: 'subj-cn4', trang_thai: 'abc' }).trangThai).toBe('chua_dong_bo');
  });

  it('chỉ các trạng thái lệch mới cần đồng bộ', () => {
    expect(canDongBo('khop')).toBe(false);
    expect(canDongBo('hub_da_go')).toBe(false);
    expect(canDongBo('co_ban_moi')).toBe(true);
    expect(canDongBo('lech_so_tiet')).toBe(true);
    expect(canDongBo('chua_dong_bo')).toBe(true);
  });

  it('lớp đang dùng khớp hết thì báo Đã đồng bộ, lớp chưa dùng không kéo trạng thái xuống', () => {
    const kq = tongHopTrangThai(
      [
        dong(4, 'subj-toan4', 'khop', '2026-11-15T06:00:00Z'),
        dong(4, 'subj-tv4', 'khop', '2026-11-15T06:05:00Z'),
        dong(5, 'subj-toan5', 'chua_dong_bo'),
      ],
      '2026-2027',
    );
    expect(kq.ketNoi).toBe('DONG_BO');
    expect(kq.lop).toEqual([
      { lop: 4, tongMon: 2, khop: 2, canDongBo: 0, lanDongBoGanNhat: '2026-11-15T06:05:00Z' },
      { lop: 5, tongMon: 1, khop: 0, canDongBo: 1, lanDongBoGanNhat: null },
    ]);
    expect(kq.tong).toEqual({ tongMon: 3, khop: 2, canDongBo: 1 });
  });

  it('Hub có bản mới ở lớp đang dùng thì báo Cần đồng bộ', () => {
    const kq = tongHopTrangThai([dong(4, 'subj-tv4', 'co_ban_moi', '2026-11-06T11:52:59Z')], '2026-2027');
    expect(kq.ketNoi).toBe('CAN_DONG_BO');
  });

  it('chưa lấy lớp nào về thì báo Cần đồng bộ; kho chung trống thì báo Mất kết nối', () => {
    expect(tongHopTrangThai([dong(4, 'subj-tv4', 'chua_dong_bo')], '2026-2027').ketNoi).toBe('CAN_DONG_BO');
    expect(tongHopTrangThai([], '2026-2027').ketNoi).toBe('MAT_KET_NOI');
  });

  it('hiện ngày giờ theo giờ Việt Nam', () => {
    expect(ngayGio('2026-11-15T06:40:00Z')).toContain('13:40');
    expect(ngayGio(null)).toBe('—');
  });
});
