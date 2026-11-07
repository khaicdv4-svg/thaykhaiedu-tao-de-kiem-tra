import { describe, expect, it } from 'vitest';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong, type LuaChon } from '../src/core/matrix/matrix-template';
import {
  dienLaiTuPpct,
  dungLaiDacTa,
  goiYTheoBaiPpct,
  xepDongTheoCau,
  kiemDinhDacTa,
  layMinhChung,
  taoDacTa,
  taoGoiYTheoYccd,
  trangThaiDacTaSauKhiSua,
  trangThaiDacTaSauKiemDinh,
  type DacTa,
} from '../src/core/dac-ta/dac-ta';
import type { MaTranChung, MaTranRieng } from '../src/types/matrix-template';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const toan = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!;
const tiengViet = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TIENG_VIET')!;

function maTranRiengDaXacNhan(mtc: MaTranChung): MaTranRieng {
  const lc: LuaChon = {};
  for (const nhom of cacNhomLuaChon(mtc)) lc[nhom.ma] = nhom.phuong_an[0].ma;
  const mtr = taoMaTranRiengRong(mtc);
  mtr.lua_chon_da_dung = lc;
  mtr.cau_hoi = danhSachCau(mtc, lc).filter((c) => c.cau.dang !== 'VIET').map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  mtr.trang_thai = 'DA_XAC_NHAN';
  return mtr;
}

/** Điền đủ bài, tuần, trang cho mọi dòng. */
function dienDu(d: DacTa): DacTa {
  return { ...d, dong: d.dong.map((r, i) => ({ ...r, baiHoc: `Bài ${i + 1}`, tuan: 5, trangSgk: `tr. ${10 + i}` })) };
}

describe('Dựng đặc tả từ ma trận riêng', () => {
  const mtr = maTranRiengDaXacNhan(toan);
  const d = taoDacTa(toan, mtr, 1, { tuanKiemTra: 18 });

  it('mỗi câu của ma trận có đúng một dòng đặc tả, tổng điểm là 10', () => {
    const cau = danhSachCau(toan, mtr.lua_chon_da_dung);
    expect(d.dong).toHaveLength(cau.length);
    expect(d.dong.reduce((s, r) => s + r.diem, 0)).toBeCloseTo(10, 5);
    expect(d.phien_ban_ma_tran_rieng).toBe(1);
    expect(d.tuan_kiem_tra).toBe(18);
  });

  it('lấy YCCĐ, mức, hình thức, điểm đúng từ ma trận', () => {
    const c = danhSachCau(toan, mtr.lua_chon_da_dung)[0];
    const r = d.dong[0];
    expect(r.khoa).toBe(c.khoa);
    expect(r.yccd).toBe(mtr.cau_hoi.find((x) => x.khoa === c.khoa)!.yccd);
    expect([r.muc, r.hinhThuc, r.diem]).toEqual([c.cau.muc, c.cau.hinh_thuc, c.cau.diem]);
  });

  it('phần bài, tuần, trang SGK để trống, không tự đoán', () => {
    for (const r of d.dong) {
      expect(r.baiHoc).toBe('');
      expect(r.tuan).toBeNull();
      expect(r.trangSgk).toBe('');
    }
  });

  it('áp chỗ giáo viên sửa ở ma trận riêng (đổi điểm) vào đặc tả', () => {
    const c = danhSachCau(toan, mtr.lua_chon_da_dung).find((x) => x.cau.diem >= 1)!;
    const sua = clone(mtr);
    sua.sua_cau = { [c.khoa]: { diem: c.cau.diem + 0.5 } };
    const dd = taoDacTa(toan, sua, 1);
    expect(dd.dong.find((r) => r.khoa === c.khoa)!.diem).toBe(c.cau.diem + 0.5);
  });

  it('Tiếng Việt: bài Viết lấy YCCĐ của dòng, không để trống', () => {
    const m = maTranRiengDaXacNhan(tiengViet);
    const dv = taoDacTa(tiengViet, m, 1);
    const viet = dv.dong.filter((r) => r.dang === 'VIET');
    expect(viet.length).toBeGreaterThan(0);
    for (const r of viet) expect(r.yccd.length).toBeGreaterThan(0);
  });
});

describe('Kiểm định đặc tả', () => {
  const mtr = maTranRiengDaXacNhan(toan);
  const goc = taoDacTa(toan, mtr, 1, { tuanKiemTra: 18 });

  it('đặc tả mới dựng chưa đủ bài, tuần: có lỗi', () => {
    const kq = kiemDinhDacTa(toan, mtr, goc);
    expect(kq.hopLe).toBe(false);
    expect(kq.loi.some((l) => l.includes('chưa ghi bài học'))).toBe(true);
    expect(kq.loi.some((l) => l.includes('chưa ghi tuần'))).toBe(true);
  });

  it('điền đủ thì hợp lệ; thiếu trang SGK chỉ là cảnh báo khi Kho SGK chưa duyệt', () => {
    const d = dienDu(goc);
    d.dong[0].trangSgk = '';
    const kq = kiemDinhDacTa(toan, mtr, d);
    expect(kq.hopLe).toBe(true);
    expect(kq.canhBao.some((c) => c.includes('chưa ghi trang SGK'))).toBe(true);
    expect(kiemDinhDacTa(toan, mtr, d, { batBuocTrangSgk: true }).hopLe).toBe(false);
  });

  it('chặn nội dung dạy sau tuần kiểm tra', () => {
    const d = dienDu(goc);
    d.dong[2].tuan = 19;
    const kq = kiemDinhDacTa(toan, mtr, d);
    expect(kq.hopLe).toBe(false);
    expect(kq.loi.some((l) => l.includes('sau tuần kiểm tra'))).toBe(true);
  });

  it('chặn tuần không hợp lệ', () => {
    const d = dienDu(goc);
    d.dong[0].tuan = 0;
    expect(kiemDinhDacTa(toan, mtr, d).loi.some((l) => l.includes('không hợp lệ'))).toBe(true);
    d.dong[0].tuan = 2.5;
    expect(kiemDinhDacTa(toan, mtr, d).hopLe).toBe(false);
  });

  it('phát hiện đặc tả lệch ma trận: mức, điểm, YCCĐ, câu thiếu, câu thừa', () => {
    const d = dienDu(goc);
    d.dong[0].muc = d.dong[0].muc === 3 ? 1 : 3;
    d.dong[1].diem = d.dong[1].diem + 0.5;
    d.dong[2].yccd = 'YCCĐ tự thêm';
    const kq = kiemDinhDacTa(toan, mtr, d);
    expect(kq.hopLe).toBe(false);
    expect(kq.loi.filter((l) => l.includes('không khớp ma trận riêng')).length).toBeGreaterThanOrEqual(3);
    expect(kq.loi.some((l) => l.startsWith('Tổng điểm đặc tả'))).toBe(true);

    const thieu = dienDu(goc);
    const bo = thieu.dong.pop()!;
    expect(kiemDinhDacTa(toan, mtr, thieu).loi.some((l) => l.includes('chưa có trong đặc tả'))).toBe(true);

    const thua = dienDu(goc);
    thua.dong.push({ ...bo, khoa: 'khong/co/99', cau: '99' });
    expect(kiemDinhDacTa(toan, mtr, thua).loi.some((l) => l.includes('không còn trong ma trận riêng'))).toBe(true);
  });

  it('không cho lập đặc tả khi ma trận riêng chưa xác nhận', () => {
    const chua = { ...clone(mtr), trang_thai: 'BAN_NHAP' as const };
    expect(kiemDinhDacTa(toan, chua, dienDu(goc)).loi.some((l) => l.includes('chưa được xác nhận'))).toBe(true);
  });

  it('báo đặc tả cũ khi ma trận riêng có phiên bản mới', () => {
    const kq = kiemDinhDacTa(toan, mtr, dienDu(goc), { phienBanMaTranRiengMoiNhat: 2 });
    expect(kq.hopLe).toBe(false);
    expect(kq.loi.some((l) => l.includes('phiên bản 2'))).toBe(true);
  });

  it('cảnh báo khi hai câu trùng một YCCĐ trong khi YCCĐ khác của dòng bỏ trống', () => {
    const cn = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'CONG_NGHE')!;
    const m = maTranRiengDaXacNhan(cn);
    const cau = danhSachCau(cn, m.lua_chon_da_dung);
    const dongMau = cau.find((c) => c.dong.yccd.length >= 2 && cau.filter((x) => x.dong === c.dong).length >= 2);
    expect(dongMau).toBeDefined(); // mẫu Công nghệ có dòng 2 YCCĐ, 2 câu
    const sua = clone(m);
    for (const c of cau.filter((x) => x.dong === dongMau!.dong)) sua.cau_hoi.find((x) => x.khoa === c.khoa)!.yccd = dongMau!.dong.yccd[0];
    const d = dienDu(taoDacTa(cn, sua, 1));
    expect(kiemDinhDacTa(cn, sua, d).canhBao.some((c) => c.includes('chưa có câu nào'))).toBe(true);
  });
});

describe('Trạng thái đặc tả', () => {
  it('kiểm định đạt thì chờ xác nhận, không tự xác nhận', () => {
    expect(trangThaiDacTaSauKiemDinh('BAN_NHAP', { hopLe: true, loi: [], canhBao: [] })).toBe('CAN_KIEM_TRA');
    expect(trangThaiDacTaSauKiemDinh('BAN_NHAP', { hopLe: false, loi: ['x'], canhBao: [] })).toBe('CO_LOI');
  });
  it('đã xác nhận mà sửa thì phải xác nhận lại', () => {
    expect(trangThaiDacTaSauKhiSua('DA_XAC_NHAN')).toBe('CAN_XAC_NHAN_LAI');
    expect(trangThaiDacTaSauKhiSua('CO_LOI')).toBe('BAN_NHAP');
  });
});

describe('Dựng lại đặc tả khi ma trận đổi: không mất phần giáo viên đã điền', () => {
  const mtr = maTranRiengDaXacNhan(toan);
  const cu = dienDu(taoDacTa(toan, mtr, 1, { tuanKiemTra: 18 }));
  cu.dong[0].ghiChu = 'Đã đối chiếu SGK';

  it('giữ bài, tuần, trang, ghi chú theo khóa câu', () => {
    const kq = dungLaiDacTa(toan, mtr, 2, cu);
    expect(kq.dacTa.phien_ban_ma_tran_rieng).toBe(2);
    expect(kq.dacTa.dong[0].baiHoc).toBe(cu.dong[0].baiHoc);
    expect(kq.dacTa.dong[0].ghiChu).toBe('Đã đối chiếu SGK');
    expect(kq.moi).toEqual([]);
    expect(kq.bo).toEqual([]);
    expect(layMinhChung(kq.dacTa)).toEqual(layMinhChung(cu));
  });

  it('câu mới để trống và được báo; câu bị bỏ được báo', () => {
    const doi = clone(mtr);
    const khoa = doi.cau_hoi[0].khoa;
    // giả lập đặc tả cũ có thêm một câu không còn trong ma trận, thiếu một câu có trong ma trận
    const cuLech = clone(cu);
    const bi = cuLech.dong.shift()!;
    cuLech.dong.push({ ...bi, khoa: 'cu/da/bo', cau: '77' });
    const kq = dungLaiDacTa(toan, doi, 2, cuLech);
    expect(kq.moi.length).toBe(1);
    expect(kq.bo.length).toBe(1);
    expect(kq.dacTa.dong.find((r) => r.khoa === khoa)!.baiHoc).toBe('');
  });
});

describe('Gợi ý bài, tuần chỉ khi khớp đúng', () => {
  const tiet = [
    { tuan: 3, baiTen: 'Bài 5. Số có nhiều chữ số' },
    { tuan: 2, baiTen: 'Bài 5. Số có nhiều chữ số' },
    { tuan: 4, baiTen: 'Bài 6. Làm tròn số' },
  ];
  it('gợi ý bài và tuần đầu của bài', () => {
    const m = taoGoiYTheoYccd([{ noiDung: 'Đọc, viết được số.', bai: 'Bài 5. Số có nhiều chữ số' }], tiet);
    expect(m.get('đọc, viết được số.')).toEqual({ baiHoc: 'Bài 5. Số có nhiều chữ số', tuan: 2 });
  });
  it('YCCĐ không ghi bài thì không gợi ý; bài không có trong PPCT thì chỉ gợi ý bài, không tuần', () => {
    const m = taoGoiYTheoYccd([{ noiDung: 'A', bai: null }, { noiDung: 'B', bai: 'Bài lạ' }], tiet);
    expect(m.has('a')).toBe(false);
    expect(m.get('b')).toEqual({ baiHoc: 'Bài lạ', tuan: undefined });
  });
  it('gợi ý chỉ điền vào ô còn trống, không ghi đè phần đã điền', () => {
    const mtr = maTranRiengDaXacNhan(toan);
    const yccd = mtr.cau_hoi[0].yccd;
    const goiY = taoGoiYTheoYccd([{ noiDung: yccd, bai: 'Bài 5. Số có nhiều chữ số' }], tiet);
    const d1 = taoDacTa(toan, mtr, 1, { goiYTheoYccd: goiY });
    expect(d1.dong[0].baiHoc).toBe('Bài 5. Số có nhiều chữ số');
    expect(d1.dong[0].tuan).toBe(2);
    const d2 = taoDacTa(toan, mtr, 1, { goiYTheoYccd: goiY, minhChungCu: { [d1.dong[0].khoa]: { baiHoc: 'Bài tự điền', tuan: 7, trangSgk: '', ghiChu: '' } } });
    expect(d2.dong[0].baiHoc).toBe('Bài tự điền');
    expect(d2.dong[0].tuan).toBe(7);
  });
});

describe('Gợi ý bài, tuần theo số bài trong PPCT', () => {
  const tiet = [
    { tuan: 3, baiTen: 'Bài 4. Thiên nhiên vùng Trung du' },
    { tuan: 4, baiTen: 'Bài 4. Thiên nhiên vùng Trung du' },
    { tuan: 5, baiTen: 'Bài 14. Một bài khác' },
  ];
  it('khớp đúng số bài, lấy tuần đầu', () => {
    expect(goiYTheoBaiPpct('Bài 4. Thiên nhiên vùng Trung du và miền núi phía Bắc', tiet)).toEqual({ baiHoc: 'Bài 4. Thiên nhiên vùng Trung du', tuan: 3 });
  });
  it('Bài 4 không nhầm với Bài 14; không có bài thì không đoán', () => {
    expect(goiYTheoBaiPpct('Bài 1. Gì đó', tiet)).toBeUndefined();
    expect(goiYTheoBaiPpct('Không ghi số bài', tiet)).toBeUndefined();
  });
  it('điền lại chỉ vào ô trống, giữ ô thầy đã điền', () => {
    const d = { loai: 'DAC_TA', ma_mon: 'X', ky_kiem_tra: 'CUOI_HK1', phien_ban_ma_tran_rieng: 1, tuan_kiem_tra: null, dong: [
      { cau: '1', noiDung: 'Bài 4. A', mach: 'm', yccd: '', baiHoc: '', tuan: null },
      { cau: '2', noiDung: 'Bài 4. A', mach: 'm', yccd: '', baiHoc: 'Bài tự điền', tuan: 9 },
    ] } as never as DacTa;
    const kq = dienLaiTuPpct(d, new Map(), tiet);
    expect(kq.soDong).toBe(1);
    expect(kq.dacTa.dong[0].tuan).toBe(3);
    expect(kq.dacTa.dong[1].baiHoc).toBe('Bài tự điền');
  });
  it('xếp theo số câu, câu không đánh số để cuối', () => {
    expect(xepDongTheoCau([{ cau: 'Viết' }, { cau: '10' }, { cau: '2' }]).map((x) => x.cau)).toEqual(['2', '10', 'Viết']);
  });
});
