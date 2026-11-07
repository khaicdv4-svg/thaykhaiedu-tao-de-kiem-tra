import { describe, expect, it } from 'vitest';
import { lamSachSvg } from '@/core/de/ve-hinh';
import { chenKhungVaoDeBai, chiSoHinhChuaGan, doiKhungTrongDeBai, soKhungTrongDeBai, tachDeBaiTheoKhung, xoaKhungKhoiDeBai } from '@/core/de/de';

const TOT = '```svg\n<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="200" height="100" fill="#fff"/><circle cx="50" cy="50" r="20" fill="#d9d9d9" stroke="#000" stroke-width="2"/><text x="40" y="95" font-family="Times New Roman" font-size="16">A &amp; B</text></svg>\n```';

describe('làm sạch SVG do AI vẽ', () => {
  it('giữ hình hợp lệ và thêm kích thước', () => {
    const r = lamSachSvg(TOT);
    expect(r.svg).toContain('<circle');
    expect(r.svg).toContain('width="200" height="100"');
    expect([r.rong, r.cao]).toEqual([200, 100]);
  });
  it.each([
    ['script', '<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>'],
    ['onload', '<svg viewBox="0 0 10 10" onload="x()"><rect/></svg>'],
    ['ảnh ngoài', '<svg viewBox="0 0 10 10"><image href="http://a/b.png"/></svg>'],
    ['url()', '<svg viewBox="0 0 10 10"><rect fill="url(#a)"/></svg>'],
    ['foreignObject', '<svg viewBox="0 0 10 10"><foreignObject/></svg>'],
  ])('chặn %s', (_t, svg) => {
    const r = lamSachSvg(svg);
    expect(r.svg).toBeUndefined();
    expect(r.lyDo).toBeTruthy();
  });
  it('thẻ lạ, thiếu viewBox, thiếu thẻ đóng đều bị từ chối; KHONG_VE trả lí do', () => {
    expect(lamSachSvg('<svg viewBox="0 0 10 10"><blink/></svg>').svg).toBeUndefined();
    expect(lamSachSvg('<svg><rect/></svg>').svg).toBeUndefined();
    expect(lamSachSvg('KHONG_VE: đề bài không cần hình').lyDo).toBe('đề bài không cần hình');
  });
});

describe('khung hình trong đề bài', () => {
  it('chèn tại con trỏ trên dòng riêng, tách thành chữ và khung', () => {
    const s = chenKhungVaoDeBai('Góc nào là góc tù? Chọn đáp án đúng.', 1, 19);
    expect(s).toBe('Góc nào là góc tù?\n[Hình 1]\nChọn đáp án đúng.');
    expect(tachDeBaiTheoKhung(s)).toEqual([{ chu: 'Góc nào là góc tù?' }, { khung: 1 }, { chu: 'Chọn đáp án đúng.' }]);
    expect(soKhungTrongDeBai(s)).toEqual([1]);
  });
  it('hình chưa gắn khung sẽ in thành hàng sau đề bài', () => {
    expect(chiSoHinhChuaGan({ deBai: 'a\n[Hình 2]', hinh: [{}, {}, {}] as never })).toEqual([0, 2]);
  });
  it('xóa và đổi chỗ khung giữ đúng số thứ tự', () => {
    expect(xoaKhungKhoiDeBai('a\n[Hình 1]\nb\n[Hình 2]', 1)).toBe('a\nb\n[Hình 1]');
    expect(doiKhungTrongDeBai('[Hình 1]\n[Hình 2]', 1, 2)).toBe('[Hình 2]\n[Hình 1]');
  });
});

import { Packer } from 'docx';
describe('khung hình trong đề bài', () => {
  it('tachDeBaiTheoKhung và chiSoHinhChuaGan', async () => {
    const { tachDeBaiTheoKhung, chiSoHinhChuaGan } = await import('@/core/de/de');
    expect(tachDeBaiTheoKhung('Quan sát hình:\n[Hình 1]\nCó mấy góc?')).toEqual([{ chu: 'Quan sát hình:' }, { khung: 1 }, { chu: 'Có mấy góc?' }]);
    const h = { ten: '', chuThich: '', anh: '', rong: 0, cao: 0 };
    expect(chiSoHinhChuaGan({ deBai: 'a\n[Hình 2]', hinh: [h, h, h] })).toEqual([0, 2]);
  });
  void Packer;
});

describe('yêu cầu hình từ đặc tả', () => {
  it('đi từ đặc tả sang đề, giữ khi dựng lại đặc tả, và vào lời nhắc vẽ', async () => {
    const { MAU_MA_TRAN_CHUNG } = await import('../src/core/matrix/templates');
    const { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong } = await import('../src/core/matrix/matrix-template');
    const { taoDacTa, layMinhChung } = await import('../src/core/dac-ta/dac-ta');
    const { taoDeTuDacTa } = await import('../src/core/de/de');
    const { loiNhacVeHinh } = await import('../src/core/de/ve-hinh');
    const mtc = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'LS_DL')!;
    const lc: Record<string, string> = {};
    for (const n of cacNhomLuaChon(mtc)) lc[n.ma] = n.phuong_an[0].ma;
    const mtr = taoMaTranRiengRong(mtc);
    mtr.lua_chon_da_dung = lc;
    mtr.cau_hoi = danhSachCau(mtc, lc).map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
    mtr.trang_thai = 'DA_XAC_NHAN';
    const d1 = taoDacTa(mtc, mtr, 1, { tuanKiemTra: 9 });
    const khoa = d1.dong[0].khoa;
    const mc = layMinhChung(d1);
    mc[khoa] = { ...mc[khoa], hinhKem: 'PHUONG_AN', moTaHinh: '4 góc A, B, C, D' };
    const d2 = taoDacTa(mtc, mtr, 1, { tuanKiemTra: 9, minhChungCu: mc });
    expect(d2.dong.find((r) => r.khoa === khoa)?.hinhKem).toBe('PHUONG_AN');
    const de = taoDeTuDacTa(d2, 1);
    expect(de.cau.find((c) => c.khoa === khoa)?.yeuCauHinh).toEqual({ kieu: 'PHUONG_AN', moTa: '4 góc A, B, C, D' });
    expect(de.cau.filter((c) => c.yeuCauHinh)).toHaveLength(1);
    expect(loiNhacVeHinh({ tenMon: 'Toán', deBai: 'x', luaChon: [], moTa: '', kieu: 'PHUONG_AN' })).toContain('4 hình');
  });
});
