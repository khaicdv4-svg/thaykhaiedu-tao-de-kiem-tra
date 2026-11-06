import { describe, it, expect } from 'vitest';
import { MAU_MA_TRAN_CHUNG, timMaTranChung } from '../src/core/matrix/templates';
import {
  apDungSuaCau,
  chuanHoaSuaCau,
  danhSachCau,
  dungMaTranRieng,
  kiemDinhMaTranChung,
  kiemDinhMaTranRieng,
  taoMaTranRiengRong,
  toHopLuaChon,
  tongHop,
  tongHopPhanCauHoi,
  diemBaiKiemTra,
  toLegacyMatrixItems,
  trangThaiSauKhiSua,
  trangThaiSauKiemDinh,
  cacNhomLuaChon,
  type LuaChon,
} from '../src/core/matrix/matrix-template';
import { validateExamMatrix } from '../src/core/validation/matrix-validator';
import type { MaTranChung, MaTranRieng } from '../src/types/matrix-template';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Ma trận riêng hợp lệ: chọn phương án đầu tiên, mỗi câu gắn YCCĐ đầu tiên của dòng. */
function maTranRiengHopLe(mtc: MaTranChung): MaTranRieng {
  const lc: LuaChon = {};
  for (const nhom of cacNhomLuaChon(mtc)) lc[nhom.ma] = nhom.phuong_an[0].ma;
  const mtr = taoMaTranRiengRong(mtc);
  mtr.lua_chon_da_dung = lc;
  mtr.cau_hoi = danhSachCau(mtc, lc)
    .filter((c) => c.cau.dang !== 'VIET')
    .map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  return mtr;
}

describe('Mẫu ma trận chung cuối HKI (5 môn) khớp file Word của tổ', () => {
  it('có đủ 5 môn', () => {
    expect(MAU_MA_TRAN_CHUNG.map((m) => m.ma_mon).sort()).toEqual(['CONG_NGHE', 'KHOA_HOC', 'LS_DL', 'TIENG_VIET', 'TOAN']);
    expect(timMaTranChung('TOAN', 'CUOI_HK1')?.mon).toBe('Toán');
  });

  for (const mtc of MAU_MA_TRAN_CHUNG) {
    it(`${mtc.mon}: kiểm định không có lỗi bắt buộc, không lệch tỉ lệ mức`, () => {
      const kq = kiemDinhMaTranChung(mtc);
      expect(kq.loi).toEqual([]);
      expect(kq.hopLe).toBe(true);
      expect(kq.canhBao.filter((c) => c.startsWith('Mức'))).toEqual([]);
    });

    it(`${mtc.mon}: mọi bài kiểm tra đủ 10 điểm ở mọi tổ hợp lựa chọn`, () => {
      for (const lc of toHopLuaChon(mtc)) {
        for (const bai of mtc.bai_kiem_tra) expect(diemBaiKiemTra(bai, lc)).toBe(10);
      }
    });
  }

  it('Toán, KH, LS&ĐL, CN: số câu, điểm TN/TL, điểm theo mức và mạch đúng số liệu in trong file gốc', () => {
    for (const mtc of MAU_MA_TRAN_CHUNG.filter((m) => m.bo_cuc !== 'TIENG_VIET_3_PHAN')) {
      const e = mtc.ky_vong_tu_file_goc as Record<string, any>;
      const t = tongHop(danhSachCau(mtc));
      expect(t.soCau).toBe(e.tong_so_cau);
      expect(t.soCauTN).toBe(e.so_cau_TN);
      expect(t.soCauTL).toBe(e.so_cau_TL);
      expect(t.diemTN).toBe(e.diem_TN);
      expect(t.diemTL).toBe(e.diem_TL);
      expect(t.diemTheoMuc).toEqual({ 1: e.diem_muc['1'], 2: e.diem_muc['2'], 3: e.diem_muc['3'] });
      if (e.diem_mach) expect(t.diemTheoMach).toEqual(e.diem_mach);
    }
  });

  it('Tiếng Việt: đọc hiểu 11 câu (6 TN, 5 TL), 3 – 3 – 2 điểm, ở cả VBVH và VBTT', () => {
    const tv = timMaTranChung('TIENG_VIET', 'CUOI_HK1')!;
    for (const loai of ['VBVH', 'VBTT']) {
      const t = tongHopPhanCauHoi(tv, { loai_van_ban: loai, the_loai: 'MIEU_TA_CON_VAT' });
      expect([t.soCau, t.soCauTN, t.soCauTL, t.tongDiem]).toEqual([11, 6, 5, 8]);
      expect(t.diemTheoMuc).toEqual({ 1: 3, 2: 3, 3: 2 });
    }
  });

  it('Toán: dòng YCCĐ chưa gắn câu chỉ là cảnh báo', () => {
    const kq = kiemDinhMaTranChung(timMaTranChung('TOAN', 'CUOI_HK1')!);
    expect(kq.canhBao.filter((c) => c.includes('chưa gắn câu hỏi'))).toHaveLength(3);
  });
});

describe('Kiểm định ma trận chung bắt lỗi', () => {
  const toan = () => clone(timMaTranChung('TOAN', 'CUOI_HK1')!);
  const cau = (m: MaTranChung, so: string) => danhSachCau(m).find((c) => c.cau.cau === so)!.cau;

  it('báo lỗi khi tổng điểm khác 10', () => {
    const m = toan();
    cau(m, '1').diem = 1;
    expect(kiemDinhMaTranChung(m).loi.some((l) => l.includes('tổng điểm là 10,5'))).toBe(true);
  });

  it('báo lỗi điểm không phải bội số 0,5', () => {
    const m = toan();
    cau(m, '1').diem = 0.25;
    cau(m, '2').diem = 0.75;
    expect(kiemDinhMaTranChung(m).loi.some((l) => l.includes('không phải bội số của 0,5'))).toBe(true);
  });

  it('báo lỗi Mức 4', () => {
    const m = toan();
    (cau(m, '11') as any).muc = 4;
    expect(kiemDinhMaTranChung(m).loi.some((l) => l.includes('Chỉ có Mức 1, Mức 2, Mức 3'))).toBe(true);
  });

  it('báo lỗi trùng hoặc thiếu số thứ tự câu', () => {
    const m = toan();
    cau(m, '12').cau = '11';
    const loi = kiemDinhMaTranChung(m).loi.join(' | ');
    expect(loi).toContain('trùng số thứ tự câu 11');
  });

  it('cảnh báo khi tỉ lệ mức lệch quy định của môn', () => {
    const m = toan();
    cau(m, '11').muc = 2; // 1,5 điểm chuyển từ Mức 3 sang Mức 2
    const cb = kiemDinhMaTranChung(m).canhBao;
    expect(cb.some((c) => c.startsWith('Mức 3'))).toBe(true);
  });

  it('Tiếng Việt không bị cộng gộp thành 20 điểm', () => {
    const tv = timMaTranChung('TIENG_VIET', 'CUOI_HK1')!;
    expect(kiemDinhMaTranChung(tv).loi).toEqual([]);
    expect(tv.bai_kiem_tra.map((b) => b.tong_diem)).toEqual([10, 10]);
  });
});

describe('Ma trận riêng', () => {
  for (const mtc of MAU_MA_TRAN_CHUNG) {
    it(`${mtc.mon}: ma trận riêng chọn đủ YCCĐ thì hợp lệ`, () => {
      const kq = kiemDinhMaTranRieng(mtc, maTranRiengHopLe(mtc));
      expect(kq.loi).toEqual([]);
    });

    it(`${mtc.mon}: bản trình bày bỏ dòng không có câu, mỗi dòng chỉ còn YCCĐ đã chọn`, () => {
      const mtr = maTranRiengHopLe(mtc);
      const r = dungMaTranRieng(mtc, mtr);
      for (const bai of r.bai_kiem_tra) {
        for (const phan of bai.phan) {
          expect(phan.lua_chon).toBeUndefined();
          for (const d of phan.dong) {
            expect(d.cau_hoi.length > 0 || d.tieu_chi_diem !== undefined).toBe(true);
            if (d.cau_hoi.length > 0 && d.cau_hoi[0].dang !== 'VIET') {
              expect(d.yccd.length).toBeLessThanOrEqual(d.cau_hoi.length);
            }
          }
        }
      }
      expect(kiemDinhMaTranChung(r).loi).toEqual([]);
    });
  }

  it('Toán: bỏ 3 dòng Hình học và đo lường không có câu', () => {
    const mtc = timMaTranChung('TOAN', 'CUOI_HK1')!;
    const r = dungMaTranRieng(mtc, maTranRiengHopLe(mtc));
    expect(r.bai_kiem_tra[0].phan[0].dong).toHaveLength(mtc.bai_kiem_tra[0].phan[0].dong.length - 3);
  });

  it('Tiếng Việt: chỉ giữ phương án đã chọn', () => {
    const tv = timMaTranChung('TIENG_VIET', 'CUOI_HK1')!;
    const mtr = maTranRiengHopLe(tv);
    const r = dungMaTranRieng(tv, mtr);
    const noiDung = r.bai_kiem_tra[0].phan[1].dong.map((d) => d.noi_dung ?? '');
    expect(noiDung.some((n) => n.includes('VBTT'))).toBe(false);
    expect(noiDung.some((n) => n.includes('VBVH'))).toBe(true);
    expect(r.bai_kiem_tra[1].phan[0].dong).toHaveLength(1);
  });

  it('báo lỗi khi thiếu YCCĐ, gắn hai YCCĐ, hoặc YCCĐ không thuộc dòng', () => {
    const mtc = timMaTranChung('KHOA_HOC', 'CUOI_HK1')!;
    const mtr = maTranRiengHopLe(mtc);
    mtr.cau_hoi = mtr.cau_hoi.filter((c) => c.khoa !== 'chinh/p1/1');
    mtr.cau_hoi.push({ khoa: 'chinh/p1/2', yccd: mtc.bai_kiem_tra[0].phan[0].dong[3].yccd[1] });
    mtr.cau_hoi.find((c) => c.khoa === 'chinh/p1/3')!.yccd = 'YCCĐ tự đặt';
    const loi = kiemDinhMaTranRieng(mtc, mtr).loi.join(' | ');
    expect(loi).toContain('Câu 1: chưa chọn YCCĐ');
    expect(loi).toContain('Câu 2: chỉ được gắn một YCCĐ');
    expect(loi).toContain('Câu 3: YCCĐ đã chọn không thuộc dòng');
  });

  it('báo lỗi khi chưa chọn phương án văn bản (Tiếng Việt)', () => {
    const tv = timMaTranChung('TIENG_VIET', 'CUOI_HK1')!;
    const mtr = maTranRiengHopLe(tv);
    delete mtr.lua_chon_da_dung.loai_van_ban;
    expect(kiemDinhMaTranRieng(tv, mtr).loi.some((l) => l.startsWith('Chưa chọn: Loại văn bản'))).toBe(true);
  });

  it('báo lỗi cần xác nhận lại khi ma trận chung đổi phiên bản', () => {
    const mtc = clone(timMaTranChung('CONG_NGHE', 'CUOI_HK1')!);
    const mtr = maTranRiengHopLe(mtc);
    mtc.phien_ban_mau = '1.1';
    expect(kiemDinhMaTranRieng(mtc, mtr).loi.some((l) => l.includes('xác nhận lại'))).toBe(true);
  });

  it('trạng thái: kiểm định không tự xác nhận; sửa sau xác nhận thì cần xác nhận lại', () => {
    const mtc = timMaTranChung('TOAN', 'CUOI_HK1')!;
    const mtr = maTranRiengHopLe(mtc);
    expect(trangThaiSauKiemDinh(mtr, kiemDinhMaTranRieng(mtc, mtr))).toBe('CAN_KIEM_TRA');
    mtr.trang_thai = 'DA_XAC_NHAN';
    expect(trangThaiSauKhiSua(mtr)).toBe('CAN_XAC_NHAN_LAI');
    expect(trangThaiSauKiemDinh({ ...mtr, trang_thai: 'BAN_NHAP' }, { hopLe: false, loi: ['x'], canhBao: [] })).toBe('CO_LOI');
  });

  it('chuyển sang kiểu cũ MatrixSpecificationItem vẫn đủ 10 điểm và qua bộ kiểm định cũ', () => {
    for (const ma of ['TOAN', 'KHOA_HOC', 'LS_DL', 'CONG_NGHE']) {
      const mtc = timMaTranChung(ma, 'CUOI_HK1')!;
      const items = toLegacyMatrixItems(mtc, maTranRiengHopLe(mtc), 'mat-test');
      const kq = validateExamMatrix({ items });
      expect(kq.errors).toEqual([]);
      expect(kq.totalCalculatedPoints).toBe(10);
    }
  });
});

describe('Ma trận riêng: sửa số câu, mức, TN/TL, điểm', () => {
  const mtc = timMaTranChung('CONG_NGHE', 'CUOI_HK1')!;
  const lc: LuaChon = {};
  const ds = danhSachCau(mtc, lc);
  const [a, b] = ds.filter((c) => (c.phan.kieu ?? 'CAU_HOI') === 'CAU_HOI');

  it('áp chỗ sửa nhưng giữ khóa câu, YCCĐ đã chọn không mất', () => {
    const sua = { [a.khoa]: { muc: (a.cau.muc === 3 ? 1 : 3) as 1 | 3, hinh_thuc: (a.cau.hinh_thuc === 'TN' ? 'TL' : 'TN') as 'TN' | 'TL', cau: '99' } };
    const c = danhSachCau(apDungSuaCau(mtc, sua), lc).find((x) => x.khoa === a.khoa)!;
    expect(c.cau.cau).toBe('99');
    expect(c.cau.muc).not.toBe(a.cau.muc);
    expect(c.cau.hinh_thuc).not.toBe(a.cau.hinh_thuc);
    expect(c.cau.dang).toBeNull();
    // Ma trận chung gốc không bị đổi
    expect(danhSachCau(mtc, lc).find((x) => x.khoa === a.khoa)!.cau.cau).toBe(a.cau.cau);
  });

  it('bỏ mục sửa trùng ma trận chung', () => {
    expect(chuanHoaSuaCau(mtc, { [a.khoa]: { muc: a.cau.muc, diem: a.cau.diem } })).toEqual({});
  });

  it('đổi điểm hai câu bù nhau: vẫn hợp lệ, có cảnh báo khác ma trận chung', () => {
    const mtr = maTranRiengHopLe(mtc);
    mtr.sua_cau = { [a.khoa]: { diem: a.cau.diem + 0.5 }, [b.khoa]: { diem: b.cau.diem - 0.5 } };
    const kq = kiemDinhMaTranRieng(mtc, mtr);
    expect(kq.loi).toEqual([]);
    expect(kq.canhBao.some((x) => x.includes('khác ma trận chung'))).toBe(true);
    const leg = toLegacyMatrixItems(mtc, mtr, 'm');
    expect(leg.find((x) => x.id === `m:${a.khoa}`)!.totalPoints).toBe(a.cau.diem + 0.5);
  });

  it('tăng điểm một câu: báo lỗi tổng điểm; trùng số câu: báo lỗi', () => {
    const mtr = maTranRiengHopLe(mtc);
    mtr.sua_cau = { [a.khoa]: { diem: a.cau.diem + 0.5, cau: b.cau.cau } };
    const loi = kiemDinhMaTranRieng(mtc, mtr).loi.join(' | ');
    expect(loi).toContain('tổng điểm');
    expect(loi).toContain('trùng số thứ tự câu');
  });
});
