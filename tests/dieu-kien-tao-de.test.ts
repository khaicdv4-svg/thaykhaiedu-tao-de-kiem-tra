import { describe, it, expect } from 'vitest';
import { kiemTraDieuKienTaoDe, type BaiDocDaChon } from '../src/core/exam-generation/dieu-kien-tao-de';
import { timMaTranChung } from '../src/core/matrix/templates';
import { danhSachCau, taoMaTranRiengRong } from '../src/core/matrix/matrix-template';
import type { MaTranChung, MaTranRieng } from '../src/types/matrix-template';

function mtrDaXacNhan(mtc: MaTranChung, lc: Record<string, string> = {}): MaTranRieng {
  const mtr = taoMaTranRiengRong(mtc);
  mtr.lua_chon_da_dung = lc;
  mtr.cau_hoi = danhSachCau(mtc, lc).filter((c) => c.cau.dang !== 'VIET').map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  mtr.trang_thai = 'DA_XAC_NHAN';
  return mtr;
}

const bai = (id: string, loai: BaiDocDaChon['loai'], theLoai: BaiDocDaChon['theLoai'] = 'TRUYEN', chuDiem = 'Niềm vui sáng tạo'): BaiDocDaChon =>
  ({ id, tieuDe: `Bài ${id}`, trangThai: 'APPROVED', loai, ky: 'CUOI_HK1', chuDiem, theLoai });

describe('Điều kiện trước khi tạo đề', () => {
  it('Toán: ma trận riêng đã xác nhận thì được tạo đề; thiếu căn cứ SGK chỉ cảnh báo', () => {
    const mtc = timMaTranChung('TOAN', 'CUOI_HK1')!;
    const kq = kiemTraDieuKienTaoDe({ maTranChung: mtc, maTranRieng: mtrDaXacNhan(mtc) });
    expect(kq.loi).toEqual([]);
    expect(kq.canhBao[0]).toContain('chưa có căn cứ trang SGK');
  });

  it('chặn khi ma trận riêng chưa xác nhận, hoặc khi đã bắt buộc căn cứ SGK', () => {
    const mtc = timMaTranChung('KHOA_HOC', 'CUOI_HK1')!;
    const mtr = { ...mtrDaXacNhan(mtc), trang_thai: 'BAN_NHAP' as const };
    expect(kiemTraDieuKienTaoDe({ maTranChung: mtc, maTranRieng: mtr }).loi).toContain('Ma trận riêng chưa được xác nhận.');
    expect(kiemTraDieuKienTaoDe({ maTranChung: mtc, maTranRieng: mtrDaXacNhan(mtc), batBuocCanCuSgk: true }).duocTaoDe).toBe(false);
  });

  it('Tiếng Việt: cần bài đọc hiểu đúng phương án và 4 bài đọc thành tiếng đã duyệt', () => {
    const tv = timMaTranChung('TIENG_VIET', 'CUOI_HK1')!;
    const mtr = mtrDaXacNhan(tv, { loai_van_ban: 'VBTT', the_loai: 'MIEU_TA_CON_VAT' });
    const thieu = kiemTraDieuKienTaoDe({ maTranChung: tv, maTranRieng: mtr });
    expect(thieu.loi.join(' | ')).toContain('Chưa chọn bài đọc hiểu');
    expect(thieu.loi.join(' | ')).toContain('Cần 4 bài đọc thành tiếng');

    const sai = kiemTraDieuKienTaoDe({
      maTranChung: tv, maTranRieng: mtr,
      baiDocHieu: bai('h', 'DOC_HIEU', 'TRUYEN'),
      baiDocThanhTieng: [bai('1', 'DOC_THANH_TIENG'), bai('2', 'DOC_THANH_TIENG'), { ...bai('3', 'DOC_THANH_TIENG'), trangThai: 'PENDING_REVIEW' }, bai('4', 'DOC_THANH_TIENG', 'TRUYEN', 'Mỗi người một vẻ')],
    });
    const s = sai.loi.join(' | ');
    expect(s).toContain('không phải văn bản thông tin');
    expect(s).toContain('chưa được tổ trưởng duyệt');
    expect(s).toContain('không đúng chủ điểm của kì');

    const dung = kiemTraDieuKienTaoDe({
      maTranChung: tv, maTranRieng: mtr,
      baiDocHieu: bai('h', 'DOC_HIEU', 'VAN_BAN_THONG_TIN'),
      baiDocThanhTieng: ['1', '2', '3', '4'].map((i) => bai(i, 'DOC_THANH_TIENG', 'TRUYEN', 'Chắp cánh ước mơ')),
    });
    expect(dung.loi).toEqual([]);
    expect(dung.duocTaoDe).toBe(true);
  });

  it('Tiếng Việt: không chọn cùng một bài cho đọc hiểu và đọc thành tiếng, hay hai lần cho đọc thành tiếng', () => {
    const tv = timMaTranChung('TIENG_VIET', 'CUOI_HK1')!;
    const mtr = mtrDaXacNhan(tv, { loai_van_ban: 'VBVH', the_loai: 'TRUYEN' });
    const hieu = { ...bai('h', 'DOC_HIEU', 'TRUYEN'), tieuDe: 'Mùa thu' };
    const tt = [
      { ...bai('1', 'DOC_THANH_TIENG'), tieuDe: 'Mùa thu (đoạn trích)' },
      { ...bai('2', 'DOC_THANH_TIENG'), tieuDe: 'Gió vườn' },
      { ...bai('3', 'DOC_THANH_TIENG'), tieuDe: 'gió vườn' },
      { ...bai('4', 'DOC_THANH_TIENG'), tieuDe: 'Nói lời cổ vũ' },
    ];
    const s = kiemTraDieuKienTaoDe({ maTranChung: tv, maTranRieng: mtr, baiDocHieu: hieu, baiDocThanhTieng: tt }).loi.join(' | ');
    expect(s).toContain('"Mùa thu (đoạn trích)" vừa là bài đọc hiểu vừa là bài đọc thành tiếng');
    expect(s).toContain('"Gió vườn" được chọn cho hai bài đọc thành tiếng');
  });
});
