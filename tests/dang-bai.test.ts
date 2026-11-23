import { describe, expect, it } from 'vitest';
import { goiYDangBai, huongDanTheoDang, kiemTraDangBai, nhanDangBai, yccdRong } from '../src/core/de/dang-bai';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong, type LuaChon } from '../src/core/matrix/matrix-template';
import { dungLaiDacTa, kiemDinhDacTa, layMinhChung, taoDacTa, type DacTa } from '../src/core/dac-ta/dac-ta';
import { kiemDinhDe, lechTungCau, taoDeTuDacTa, type DeKiemTra } from '../src/core/de/de';
import { loiNhacSoanCau } from '../src/core/chuong-trinh/sach';
import { duongDanCau } from '../src/core/ho-so-de/ho-so-de';
import type { MaTranChung, MaTranRieng } from '../src/types/matrix-template';

// YCCĐ thật của câu 7 và câu 11 đề Toán Cuối HKI (đặc tả trên tao-de-thu-nghiem, 22/11/2026)
const YCCD_DO_LUONG = 'Thực hiện được việc chuyển đổi và tính toán với các số đo:\n+ Độ dài: mm, cm, dm, m, km.\n+ Diện tích: mm2, cm2, dm2, m2.\n+ Khối lượng: g, kg, yến, tạ, tấn\n+ Dung tích: ml, l.\n+ Thời gian: giây, phút, giờ, ngày, tuần lễ, tháng, năm, thế kỷ.\n+ Tiền Việt Nam đã học.';
const YCCD_GIAI_TOAN = 'Giải quyết một số vấn đề gắn với việc giải các bài toán có đến hai hoặc ba bước tính (trong phạm vi các số và phép tính đã học):\n+ Liên quan đến thành phần và kết quả của phép tính.\n+ Liên quan đến các mối quan hệ so sánh trực tiếp hoặc các mối quan hệ phụ thuộc trực tiếp và đơn giản (ví dụ: tìm hai số khi biết tổng và hiệu của hai số đó).';

describe('Gợi ý dạng bài tách từ YCCĐ', () => {
  it('YCCĐ đo lường: mỗi dòng "+" thành một dạng chuyển đổi, kèm dạng điền chỗ chấm', () => {
    const g = goiYDangBai(YCCD_DO_LUONG);
    expect(g).toContain('Chuyển đổi số đo khối lượng: g, kg, yến, tạ, tấn');
    expect(g).toContain('Chuyển đổi số đo diện tích: mm², cm², dm², m²');
    expect(g.some((x) => /chỗ chấm/.test(x) && /không ra bài toán có lời văn/.test(x))).toBe(true);
  });

  it('YCCĐ giải toán: lấy được phần "ví dụ: tìm hai số khi biết tổng và hiệu"', () => {
    expect(goiYDangBai(YCCD_GIAI_TOAN)).toContain('Tìm hai số khi biết tổng và hiệu của hai số đó');
  });

  it('YCCĐ ghi trên một dòng, ngăn bằng dấu chấm phẩy cũng tách được', () => {
    const g = goiYDangBai('Thực hiện được việc chuyển đổi và tính toán với các số đo: độ dài (mm, cm, dm, m, km); khối lượng (g, kg, yến, tạ, tấn).');
    expect(g).toContain('Chuyển đổi số đo khối lượng: g, kg, yến, tạ, tấn');
  });

  it('YCCĐ một ý (môn khác, kì khác) thì không bịa thêm dạng', () => {
    expect(goiYDangBai('Nhận biết được hình bình hành, hình thoi.')).toEqual([]);
    expect(yccdRong('Nhận biết được hình bình hành, hình thoi.')).toBe(false);
    expect(yccdRong(YCCD_DO_LUONG)).toBe(true);
  });
});

describe('Nhận dạng và kiểm tra câu theo dạng bài', () => {
  it('nhận ra dạng đổi đơn vị, tổng hiệu; "không ra bài toán có lời văn" không bị hiểu là lời văn', () => {
    expect(nhanDangBai('Chuyển đổi số đo khối lượng')).toEqual(['DOI_DON_VI']);
    expect(nhanDangBai('Chuyển đổi đơn vị đo: điền số vào chỗ chấm, không ra bài toán có lời văn')).toEqual(['DOI_DON_VI']);
    expect(nhanDangBai('Tìm hai số khi biết tổng và hiệu')).toEqual(expect.arrayContaining(['TONG_HIEU', 'LOI_VAN']));
    expect(nhanDangBai('Nêu đặc điểm thiên nhiên vùng Tây Nguyên')).toEqual([]);
  });

  it('câu 7: đặc tả đổi đơn vị mà AI ra bài toán có lời văn thì báo lệch; dạng "… = …" thì đạt', () => {
    const d = 'Chuyển đổi số đo khối lượng: g, kg, yến, tạ, tấn';
    expect(kiemTraDangBai(d, { deBai: 'Một cửa hàng có 3 tấn gạo, đã bán 500 kg. Hỏi cửa hàng còn lại bao nhiêu ki-lô-gam gạo?' })[0]).toMatch(/bài toán có lời văn/);
    expect(kiemTraDangBai(d, { deBai: 'Viết số thích hợp vào chỗ chấm:\na) 3 tấn = … kg\nb) 5 tạ 20 kg = … kg' })).toEqual([]);
    // Trắc nghiệm đổi đơn vị: phép đổi nằm trong đề, kết quả ở phương án
    expect(kiemTraDangBai(d, { deBai: '2 tấn 30 kg = … kg. Số thích hợp điền vào chỗ chấm là:', luaChon: ['230', '2 030', '2 300', '20 030'] })).toEqual([]);
  });

  it('câu 11: đặc tả tổng và hiệu mà câu là bài toán khác thì báo lệch', () => {
    const d = 'Tìm hai số khi biết tổng và hiệu của hai số đó';
    expect(kiemTraDangBai(d, { deBai: 'Hai kho chứa tất cả 12 450 kg gạo, kho thứ nhất chứa nhiều hơn kho thứ hai 1 350 kg. Hỏi mỗi kho chứa bao nhiêu ki-lô-gam gạo?' })).toEqual([]);
    expect(kiemTraDangBai(d, { deBai: 'Một xe chở 3 chuyến, mỗi chuyến 2 500 kg hàng. Hỏi xe chở được bao nhiêu ki-lô-gam hàng?' })[0]).toMatch(/tổng và hiệu/);
  });

  it('chưa chọn dạng bài hoặc câu còn trống thì không báo gì', () => {
    expect(kiemTraDangBai('', { deBai: 'Hỏi gì đó?' })).toEqual([]);
    expect(kiemTraDangBai('Chuyển đổi số đo', { deBai: '' })).toEqual([]);
  });

  it('dặn AI cách trình bày theo dạng', () => {
    expect(huongDanTheoDang('Chuyển đổi số đo khối lượng')).toMatch(/KHÔNG phải bài toán có lời văn/);
    expect(huongDanTheoDang('Tìm hai số khi biết tổng và hiệu')).toMatch(/TỔNG của hai số/);
  });
});

// --- Đặc tả và đề dùng dạng bài (môn bất kì, kì bất kì) ---

const toan = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!;
function maTranRieng(mtc: MaTranChung): MaTranRieng {
  const lc: LuaChon = {};
  for (const nhom of cacNhomLuaChon(mtc)) lc[nhom.ma] = nhom.phuong_an[0].ma;
  const mtr = taoMaTranRiengRong(mtc);
  mtr.lua_chon_da_dung = lc;
  mtr.cau_hoi = danhSachCau(mtc, lc).filter((c) => c.cau.dang !== 'VIET').map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  mtr.trang_thai = 'DA_XAC_NHAN';
  return mtr;
}
const mtr = maTranRieng(toan);
const goc = taoDacTa(toan, mtr, 1, { tuanKiemTra: 18 });
const dienDu = (d: DacTa): DacTa => ({ ...d, dong: d.dong.map((r, i) => ({ ...r, baiHoc: `Bài ${i + 1}`, tuan: 5, trangSgk: `tr. ${10 + i}` })) });

describe('Dạng bài trong đặc tả', () => {
  it('đặc tả mới có ô dạng bài để trống; dựng lại theo ma trận mới vẫn giữ dạng bài của câu không đổi YCCĐ', () => {
    expect(goc.dong.every((r) => r.dangBai === '')).toBe(true);
    const daChon: DacTa = { ...goc, dong: goc.dong.map((r, i) => (i === 0 ? { ...r, dangBai: 'Chuyển đổi số đo khối lượng' } : r)) };
    expect(layMinhChung(daChon)[goc.dong[0].khoa].dangBai).toBe('Chuyển đổi số đo khối lượng');
    const { dacTa } = dungLaiDacTa(toan, mtr, 2, daChon);
    expect(dacTa.dong.find((r) => r.khoa === goc.dong[0].khoa)!.dangBai).toBe('Chuyển đổi số đo khối lượng');
  });

  it('YCCĐ rộng mà chưa chọn dạng bài thì nhắc (cảnh báo, không chặn); chọn rồi thì hết nhắc', () => {
    const rong = dienDu({ ...goc, dong: goc.dong.map((r, i) => (i === 0 ? { ...r, yccd: YCCD_DO_LUONG } : r)) });
    // YCCĐ ghi trong đặc tả phải khớp ma trận riêng: sửa luôn ma trận để chỉ kiểm phần dạng bài
    const mtr2: MaTranRieng = { ...mtr, cau_hoi: mtr.cau_hoi.map((x) => (x.khoa === goc.dong[0].khoa ? { ...x, yccd: YCCD_DO_LUONG } : x)) };
    const r0 = rong.dong[0];
    const cuaCau0 = (x: string) => x.startsWith(`${r0.phan ?? r0.baiKiemTra}, Câu ${r0.cau}:`) && /nên chọn dạng bài/.test(x);
    const kq = kiemDinhDacTa(toan, mtr2, rong);
    expect(kq.canhBao.some(cuaCau0)).toBe(true);
    const daChon = { ...rong, dong: rong.dong.map((r, i) => (i === 0 ? { ...r, dangBai: 'Chuyển đổi số đo khối lượng' } : r)) };
    expect(kiemDinhDacTa(toan, mtr2, daChon).canhBao.some(cuaCau0)).toBe(false);
  });
});

describe('Chỗ lệch từng câu cho màn Xem đề', () => {
  const dt: DacTa = { ...goc, dong: goc.dong.map((r, i) => (i === 0 ? { ...r, dangBai: 'Chuyển đổi số đo khối lượng' } : r)) };
  const khoa0 = goc.dong[0].khoa;

  it('câu sai dạng bài và câu trống được đánh dấu đúng câu; câu đúng thì không', () => {
    const de: DeKiemTra = taoDeTuDacTa(dt, 1);
    de.cau = de.cau.map((c) => (c.khoa === khoa0 ? { ...c, deBai: 'Cửa hàng có 3 tấn gạo, bán 500 kg. Hỏi còn bao nhiêu ki-lô-gam?', luaChon: ['a', 'b', 'c', 'd'], dapAn: 'A', huongDanCham: '1 điểm' } : c));
    const lech = lechTungCau(dt, de);
    expect(lech[khoa0].some((x) => /bài toán có lời văn/.test(x))).toBe(true);
    const khac = de.cau.find((c) => c.khoa !== khoa0)!;
    expect(lech[khac.khoa]).toContain('chưa có đề bài.');
    // Lỗi từng câu không lặp tên câu ở đầu (màn xem đã ghi tên câu)
    expect(lech[khac.khoa].every((x) => !/^Câu \d+:/.test(x))).toBe(true);
  });

  it('kiểm định đề cảnh báo câu lệch dạng bài', () => {
    const de: DeKiemTra = taoDeTuDacTa(dt, 1);
    de.cau = de.cau.map((c) => (c.khoa === khoa0 ? { ...c, deBai: 'Cửa hàng có 3 tấn gạo, bán 500 kg. Hỏi còn bao nhiêu ki-lô-gam?' } : c));
    expect(kiemDinhDe(dt, de).canhBao.some((x) => /chuyển đổi đơn vị đo/.test(x))).toBe(true);
  });

  it('mức hoặc điểm khác đặc tả cũng được đánh dấu tại câu', () => {
    const de: DeKiemTra = taoDeTuDacTa(dt, 1);
    de.cau = de.cau.map((c) => (c.khoa === khoa0 ? { ...c, diem: c.diem + 0.5 } : c));
    expect(lechTungCau(dt, de)[khoa0].some((x) => /đặc tả ghi/.test(x))).toBe(true);
  });
});

describe('Lời nhắc AI và đường dẫn sửa câu', () => {
  it('dạng bài vào lời nhắc AI như yêu cầu bắt buộc', () => {
    const t = loiNhacSoanCau({ tenMon: 'Toán', dang: null, hinhThuc: 'TL', muc: 2, diem: 1, yccd: YCCD_DO_LUONG, baiHoc: 'Bài 17: Yến, tạ, tấn', trangSgk: 'tr. 60', dangBai: 'Chuyển đổi số đo khối lượng: g, kg, yến, tạ, tấn', maMon: 'TOAN', ky: 'CUOI_HK1' }, { sgk: 'trang sách', sgv: '' });
    expect(t).toMatch(/DẠNG BÀI BẮT BUỘC[^\n]*Chuyển đổi số đo khối lượng/);
    expect(t).toMatch(/KHÔNG phải bài toán có lời văn/);
  });

  it('không chọn dạng bài thì lời nhắc như cũ', () => {
    const t = loiNhacSoanCau({ tenMon: 'Khoa học', dang: 'NLC', hinhThuc: 'TN', muc: 1, diem: 0.5, yccd: 'Nêu được tính chất của nước', baiHoc: 'Bài 1', trangSgk: '' }, { sgk: 'x', sgv: '' });
    expect(t).not.toMatch(/DẠNG BÀI BẮT BUỘC/);
  });

  it('đường dẫn mở đúng câu ở bước khác, giữ môn và kì', () => {
    expect(duongDanCau('/dac-ta', { mon: 'TOAN', ky: 'CUOI_HK1' }, 'bai/phan/7')).toBe('/dac-ta?mon=TOAN&ky=CUOI_HK1&cau=bai%2Fphan%2F7');
  });
});
