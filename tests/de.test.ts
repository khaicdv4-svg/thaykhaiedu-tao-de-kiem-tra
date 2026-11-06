import { describe, expect, it } from 'vitest';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong, type LuaChon } from '../src/core/matrix/matrix-template';
import { taoDacTa } from '../src/core/dac-ta/dac-ta';
import { TRANG_THAI_CHI_DO_DUYET, cauDaXong, dungLaiDe, kiemDinhDe, layNoiDung, taoDeTuDacTa, tienDoDe, trangThaiDeSauKhiSua, trangThaiDeSauKiemDinh, type DeKiemTra } from '../src/core/de/de';
import type { MaTranChung, MaTranRieng } from '../src/types/matrix-template';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const congNghe = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'LS_DL')!;

function maTranRieng(mtc: MaTranChung): MaTranRieng {
  const lc: LuaChon = {};
  for (const nhom of cacNhomLuaChon(mtc)) lc[nhom.ma] = nhom.phuong_an[0].ma;
  const mtr = taoMaTranRiengRong(mtc);
  mtr.lua_chon_da_dung = lc;
  mtr.cau_hoi = danhSachCau(mtc, lc).filter((c) => c.cau.dang !== 'VIET').map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  mtr.trang_thai = 'DA_XAC_NHAN';
  return mtr;
}

const dacTa = taoDacTa(congNghe, maTranRieng(congNghe), 1, { tuanKiemTra: 18 });

/** Điền đủ nội dung hợp lệ cho mọi câu. */
function dienDu(d: DeKiemTra): DeKiemTra {
  return {
    ...d,
    cau: d.cau.map((c, i) => ({
      ...c,
      deBai: `Đề bài số ${i + 1} về chủ đề khác nhau ${i * 7}`,
      luaChon: c.dang === 'NLC' ? ['Phương án một', 'Phương án hai', 'Phương án ba', 'Phương án bốn'] : c.dang === 'DS' ? c.luaChon.map((_, k) => `Ý số ${k + 1}`) : [],
      dapAn: c.dang === 'NLC' ? 'B' : c.dang === 'DS' ? 'Đ'.repeat(c.luaChon.length) : 'Đáp án viết ra',
      huongDanCham: c.hinhThuc === 'TL' ? 'Đúng mỗi ý cho điểm, trình bày đúng cho điểm.' : '',
    })),
  };
}

describe('Dựng đề từ đặc tả', () => {
  const de = taoDeTuDacTa(dacTa, 1);

  it('mỗi dòng đặc tả có một câu, thông tin lấy đúng từ đặc tả', () => {
    expect(de.cau).toHaveLength(dacTa.dong.length);
    const r = dacTa.dong[0];
    expect([de.cau[0].khoa, de.cau[0].muc, de.cau[0].diem, de.cau[0].yccd]).toEqual([r.khoa, r.muc, r.diem, r.yccd]);
    expect(de.phien_ban_dac_ta).toBe(1);
  });

  it('nội dung để trống, không tự bịa; trắc nghiệm có sẵn 4 ô', () => {
    for (const c of de.cau) {
      expect(c.deBai).toBe('');
      expect(c.dapAn).toBe('');
      if (c.dang === 'NLC') expect(c.luaChon).toEqual(['', '', '', '']);
    }
    expect(tienDoDe(de).xong).toBe(0);
  });
});

describe('Kiểm định đề', () => {
  it('đề trống bị báo thiếu từng câu', () => {
    const kq = kiemDinhDe(dacTa, taoDeTuDacTa(dacTa, 1));
    expect(kq.hopLe).toBe(false);
    expect(kq.loi.some((l) => /chưa có đề bài/.test(l))).toBe(true);
  });

  it('đề điền đủ thì hợp lệ', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    const kq = kiemDinhDe(dacTa, de);
    expect(kq.loi).toEqual([]);
    expect(kq.hopLe).toBe(true);
    expect(tienDoDe(de).xong).toBe(de.cau.length);
  });

  it('bắt đáp án trắc nghiệm ngoài A–D', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    const i = de.cau.findIndex((c) => c.dang === 'NLC');
    expect(i).toBeGreaterThanOrEqual(0);
    de.cau[i].dapAn = 'E';
    expect(kiemDinhDe(dacTa, de).loi.some((l) => /A, B, C hoặc D/.test(l))).toBe(true);
    expect(cauDaXong(de.cau[i])).toBe(false);
  });

  it('bắt phương án trùng nhau', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    const i = de.cau.findIndex((c) => c.dang === 'NLC');
    de.cau[i].luaChon = ['Giống', 'giống ', 'Khác', 'Khác nữa'];
    expect(kiemDinhDe(dacTa, de).loi.some((l) => /trùng nhau/.test(l))).toBe(true);
  });

  it('bắt hai câu trùng đề bài', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    de.cau[1].deBai = de.cau[0].deBai;
    expect(kiemDinhDe(dacTa, de).loi.some((l) => /trùng đề bài/.test(l))).toBe(true);
  });

  it('bắt điểm hoặc mức không khớp đặc tả', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    de.cau[0].diem = de.cau[0].diem + 0.5;
    const kq = kiemDinhDe(dacTa, de);
    expect(kq.loi.some((l) => /không khớp đặc tả/.test(l))).toBe(true);
    expect(kq.loi.some((l) => /Tổng điểm/.test(l))).toBe(true);
  });

  it('bắt thiếu câu và thừa câu so với đặc tả', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    const bot = de.cau.slice(1);
    const kq = kiemDinhDe(dacTa, { ...de, cau: bot });
    expect(kq.loi.some((l) => /chưa có trong đề/.test(l))).toBe(true);
    const them = { ...de, cau: [...de.cau, { ...de.cau[0], khoa: 'khong/co/9' }] };
    expect(kiemDinhDe(dacTa, them).loi.some((l) => /không có trong đặc tả/.test(l))).toBe(true);
  });

  it('báo khi đề kế thừa đặc tả cũ hơn bản mới nhất', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    const kq = kiemDinhDe(dacTa, de, { phienBanDacTaMoiNhat: 2 });
    expect(kq.hopLe).toBe(false);
    expect(kq.loi[0]).toMatch(/mới hơn/);
  });

  it('cảnh báo khi đề nhắc hình mà chưa mô tả', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    de.cau[0].deBai = 'Quan sát hình dưới đây và trả lời câu hỏi sau';
    expect(kiemDinhDe(dacTa, de).canhBao.some((w) => /hình/.test(w))).toBe(true);
  });
});

describe('Dựng lại đề khi đặc tả đổi', () => {
  it('giữ nội dung câu còn khóa, báo câu mới và câu bị bỏ', () => {
    const de = dienDu(taoDeTuDacTa(dacTa, 1));
    const dacTaMoi = clone(dacTa);
    const bo = dacTaMoi.dong.pop()!;
    dacTaMoi.dong.push({ ...clone(dacTa.dong[0]), khoa: 'moi/1/1' });
    const kq = dungLaiDe(dacTaMoi, 2, de);
    expect(kq.moi).toEqual(['moi/1/1']);
    expect(kq.bo).toEqual([bo.khoa]);
    expect(kq.de.phien_ban_dac_ta).toBe(2);
    expect(kq.de.cau[0].deBai).toBe(de.cau[0].deBai);
    expect(layNoiDung(kq.de)[dacTa.dong[0].khoa].dapAn).toBe(de.cau[0].dapAn);
  });
});

describe('Trạng thái đề', () => {
  it('kiểm định đạt thì CAN_KIEM_TRA, lỗi thì CO_LOI; sửa sau khi sẵn sàng duyệt thì phải kiểm tra lại', () => {
    expect(trangThaiDeSauKiemDinh('BAN_NHAP', { hopLe: true, loi: [], canhBao: [] })).toBe('CAN_KIEM_TRA');
    expect(trangThaiDeSauKiemDinh('BAN_NHAP', { hopLe: false, loi: ['x'], canhBao: [] })).toBe('CO_LOI');
    expect(trangThaiDeSauKhiSua('SAN_SANG_DUYET')).toBe('CAN_KIEM_TRA_LAI');
    expect(trangThaiDeSauKhiSua('CAN_KIEM_TRA')).toBe('BAN_NHAP');
  });

  it('đề đã duyệt mà sửa thì phải kiểm tra lại; trạng thái duyệt không do trình duyệt tự đặt', () => {
    expect(trangThaiDeSauKhiSua('DA_DUYET')).toBe('CAN_KIEM_TRA_LAI');
    expect(trangThaiDeSauKiemDinh('DA_DUYET', { hopLe: false, loi: ['x'], canhBao: [] })).toBe('DA_DUYET');
    expect(TRANG_THAI_CHI_DO_DUYET).toEqual(['DA_DUYET', 'TRA_LAI']);
  });
});
