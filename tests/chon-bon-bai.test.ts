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

  it('không lấy bài cùng tên với bài đọc hiểu, cũng không lấy hai đoạn của cùng một bài', () => {
    const k2 = [
      { ...bai('a', 'Niềm vui sáng tạo', 'TRUYEN'), tieuDe: 'Mùa thu' },
      { ...bai('b', 'Niềm vui sáng tạo', 'THO'), tieuDe: 'Mùa thu (đoạn trích)' },
      { ...bai('c', 'Niềm vui sáng tạo', 'MIEU_TA'), tieuDe: 'Gió vườn' },
      { ...bai('d', 'Chắp cánh ước mơ', 'TRUYEN'), tieuDe: 'Nói lời cổ vũ' },
      { ...bai('e', 'Chắp cánh ước mơ', 'MIEU_TA'), tieuDe: 'Con heo đất' },
    ];
    const kq = chonBonBaiDocThanhTieng('CUOI_HK1', k2);
    expect(kq.baiDoc.filter((b) => b.tieuDe.startsWith('Mùa thu'))).toHaveLength(1);
    const khongHieu = chonBonBaiDocThanhTieng('CUOI_HK1', k2, { baiDocHieuTieuDe: 'Mùa thu' });
    expect(khongHieu.baiDoc.some((b) => b.tieuDe.startsWith('Mùa thu'))).toBe(false);
    expect(khongHieu.thieu[0]).toContain('Niềm vui sáng tạo');
  });
});
