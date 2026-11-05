import { describe, expect, it } from 'vitest';
import { chonBonBaiDocThanhTieng, type UngVienBaiDoc } from '../src/core/reading-passages/chon-bon-bai';

function cau(n: number, tag: string) {
  return Array.from({ length: n }, (_, i) => `${tag}${i}`).join(' ') + '.';
}
const bai = (id: string, chuDiem: string, theLoai: UngVienBaiDoc['theLoai'], trangThai = 'APPROVED'): UngVienBaiDoc => ({
  id, tieuDe: id, chuDiem, theLoai, trangThai, noiDung: [cau(40, id), cau(42, id), cau(60, id)].join(' '),
});

describe('chọn 4 bài đọc thành tiếng', () => {
  const kho = [
    bai('a', 'Niềm vui sáng tạo', 'TRUYEN'),
    bai('b', 'Niềm vui sáng tạo', 'TRUYEN'),
    bai('c', 'Niềm vui sáng tạo', 'THO'),
    bai('d', 'Chắp cánh ước mơ', 'TRUYEN'),
    bai('e', 'Chắp cánh ước mơ', 'MIEU_TA'),
    bai('x', 'Mỗi người một vẻ', 'TRUYEN'),
  ];

  it('lấy 2 bài mỗi chủ điểm của kì, ưu tiên khác thể loại', () => {
    const kq = chonBonBaiDocThanhTieng('CUOI_HK1', kho);
    expect(kq.baiDoc).toHaveLength(4);
    expect(kq.thieu).toEqual([]);
    const theLoai = kq.baiDoc.filter((b) => b.chuDiem === 'Niềm vui sáng tạo').map((b) => b.theLoai);
    expect(new Set(theLoai).size).toBe(2);
    expect(kq.baiDoc.every((b) => b.doan.soTieng >= 80 && b.doan.soTieng <= 90)).toBe(true);
    expect(kq.baiDoc.find((b) => b.id === 'x')).toBeUndefined();
  });

  it('loại bài đọc hiểu đang dùng và báo thiếu', () => {
    const kq = chonBonBaiDocThanhTieng('CUOI_HK1', kho, { baiDocHieuId: 'd' });
    expect(kq.baiDoc).toHaveLength(3);
    expect(kq.thieu[0]).toContain('Chắp cánh ước mơ');
  });

  it('chỉ lấy bài đã duyệt, trừ khi cho phép bản nháp', () => {
    const nhap = kho.map((b) => ({ ...b, trangThai: 'DRAFT' }));
    expect(chonBonBaiDocThanhTieng('CUOI_HK1', nhap).baiDoc).toHaveLength(0);
    expect(chonBonBaiDocThanhTieng('CUOI_HK1', nhap, { chiDaDuyet: false }).baiDoc).toHaveLength(4);
  });
});
