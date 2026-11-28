import { describe, expect, it } from 'vitest';
import { Packer } from 'docx';
import { docOCau } from '../src/core/kho-ma-tran/doc-ma-tran-chung';
import { cacNhomLuaChon, danhKhoaCauTach, danhSachCau, kiemDinhMaTranChung, laCauTachY, taoMaTranRiengRong, tongHop, type LuaChon } from '../src/core/matrix/matrix-template';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { demSoCauDacTa, kiemDinhDacTa, taoDacTa } from '../src/core/dac-ta/dac-ta';
import { demCauConTrong, demSoCauDe, kiemDinhDe, laPhanCauTach, nhanCau, nhomOTheoCau, taoDeTuDacTa, tienDoDe } from '../src/core/de/de';
import { dungMaTranDacTa } from '../src/core/de/xuat-word';
import { docChuTuDocx } from '../src/core/utils/docx-text';
import type { MaTranChung } from '../src/types/matrix-template';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('Câu chia ý ở nhiều dòng ma trận (Câu 8 (a) và Câu 8 (b, c, d))', () => {
  it('đọc được ô "1 Câu 8 (a)" và "3 Câu 8 (b, c, d)"', () => {
    expect(docOCau('1\nCâu 8\n(a)')).toMatchObject({ cau: ['8'], yNho: ['a'] });
    expect(docOCau('3\nCâu 8\n(b, c, d)')).toMatchObject({ cau: ['8'], yNho: ['b', 'c', 'd'] });
  });

  it('chấp nhận câu chia ý, chỉ báo trùng khi các ý chồng nhau', () => {
    expect(laCauTachY([{ y_nho: ['a'] }, { y_nho: ['b', 'c', 'd'] }])).toBe(true);
    expect(laCauTachY([{ y_nho: ['a', 'b'] }, { y_nho: ['b', 'c'] }])).toBe(false);
    expect(laCauTachY([{ y_nho: null }, { y_nho: ['b'] }])).toBe(false);
  });

  it('ma trận Toán có Câu 8 tách hai dòng: không còn lỗi trùng số thứ tự, khóa riêng từng phần', () => {
    const toan = clone(MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!) as MaTranChung;
    const phan = toan.bai_kiem_tra[0].phan[0];
    // Tìm một câu có số lớn nhất, tách thành hai phần ở hai dòng
    const dong = phan.dong.filter((d) => d.cau_hoi.length);
    const d1 = dong[0];
    const d2 = dong[dong.length - 1];
    const so = String(Math.max(...phan.dong.flatMap((d) => d.cau_hoi.map((c) => Number(c.cau))).filter(Number.isFinite)) + 1);
    d1.cau_hoi.push({ cau: so, y_nho: ['a'], so_cau_tinh: 1, muc: 2, hinh_thuc: 'TL', dang: null, diem: 0.5 });
    d2.cau_hoi.push({ cau: so, y_nho: ['b', 'c', 'd'], so_cau_tinh: 3, muc: 2, hinh_thuc: 'TL', dang: null, diem: 1.5 });
    danhKhoaCauTach(toan);
    const kq = kiemDinhMaTranChung(toan);
    expect(kq.loi.some((l) => /trùng số thứ tự/.test(l))).toBe(false);
    expect(d1.cau_hoi.at(-1)!.khoa_goc).toBe(`${so}a`);
    expect(d2.cau_hoi.at(-1)!.khoa_goc).toBe(`${so}bcd`);
  });

  it('nhãn câu ghi rõ ý của từng phần', () => {
    const c = { cau: '8', khoa: 'chinh/p1/8bcd', yNho: ['b', 'c', 'd'] };
    expect(laPhanCauTach(c)).toBe(true);
    expect(nhanCau(c)).toBe('Câu 8 (b, c, d)');
    expect(nhanCau({ cau: '8', khoa: 'chinh/p1/8', yNho: ['a', 'b'] })).toBe('Câu 8');
  });

  it('Câu 8 tách 2 dòng (a: 0,5đ) và (b, c, d: 1,5đ) ở 2 mạch: đếm đúng 12 câu, cộng điểm đúng 2đ ở ma trận, đặc tả, đề và Word', async () => {
    const toan = clone(MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!) as MaTranChung;
    const phan = toan.bai_kiem_tra[0].phan[0];
    // Gỡ Câu 8 gốc (1 dòng 2đ) và tách thành 2 dòng ở 2 mạch khác nhau: Hình học (0,5đ) và Số & phép tính (1,5đ)
    for (const d of phan.dong) d.cau_hoi = d.cau_hoi.filter((c) => c.cau !== '8');
    const dSo = phan.dong.find((d) => d.mach === 'SỐ VÀ PHÉP TÍNH' && d.noi_dung?.includes('Phép cộng'))!;
    const dHinh = phan.dong.find((d) => d.mach === 'HÌNH HỌC VÀ ĐO LƯỜNG' && d.yccd.length > 0)!;
    dHinh.cau_hoi.push({ cau: '8', y_nho: ['a'], so_cau_tinh: 1, muc: 1, hinh_thuc: 'TL', dang: null, diem: 0.5 });
    dSo.cau_hoi.push({ cau: '8', y_nho: ['b', 'c', 'd'], so_cau_tinh: 3, muc: 1, hinh_thuc: 'TL', dang: null, diem: 1.5 });
    danhKhoaCauTach(toan);

    const ds = danhSachCau(toan);
    const th = tongHop(ds);
    expect(th.soCau).toBe(12);
    expect(th.soCauTN).toBe(6);
    expect(th.soCauTL).toBe(6);
    expect(th.tongDiem).toBe(10);
    const diemCau8 = ds.filter((c) => c.cau.cau === '8').reduce((s, c) => s + c.cau.diem, 0);
    expect(diemCau8).toBe(2);
    expect(kiemDinhMaTranChung(toan).loi).toEqual([]);

    const lc: LuaChon = {};
    for (const nhom of cacNhomLuaChon(toan)) lc[nhom.ma] = nhom.phuong_an[0].ma;
    const mtr = taoMaTranRiengRong(toan);
    mtr.lua_chon_da_dung = lc;
    mtr.cau_hoi = ds.map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
    mtr.trang_thai = 'DA_XAC_NHAN';

    const dacTa = taoDacTa(toan, mtr, 1, { tuanKiemTra: 17 });
    dacTa.dong.forEach((r) => { r.baiHoc = 'Bài 1'; r.tuan = 1; });
    expect(dacTa.dong.length).toBe(13); // 13 dòng nhưng chỉ có 12 câu
    expect(demSoCauDacTa(dacTa.dong)).toBe(12);
    expect(kiemDinhDacTa(toan, mtr, dacTa).loi).toEqual([]);

    const de = taoDeTuDacTa(dacTa, 1);
    expect(demSoCauDe(de.cau)).toBe(12);
    // Tiến độ đếm theo câu: 0/12 khi trống, Câu 8 chỉ xong khi đủ cả (a) và (b, c, d)
    expect(tienDoDe(de)).toEqual({ xong: 0, tong: 12 });
    expect(demCauConTrong(de.cau)).toBe(12);
    const dien = (c: (typeof de.cau)[number]) => {
      c.deBai = `Đề bài ${c.khoa}`;
      if (c.dang === 'NLC') { c.luaChon = ['A1', 'B1', 'C1', 'D1']; c.dapAn = 'A'; }
      else if (c.dang === 'DS') { const n = c.yNho?.length ?? c.luaChon.length; c.luaChon = Array.from({ length: n }, (_, i) => `Ý ${i + 1}`); c.dapAn = 'Đ'.repeat(n); }
      else c.dapAn = 'Đáp án';
      if (c.hinhThuc === 'TL') c.huongDanCham = 'Đúng mỗi ý cho điểm.';
    };
    dien(de.cau.find((c) => c.khoa.endsWith('/8a'))!);
    expect(tienDoDe(de).xong).toBe(0);
    expect(demCauConTrong(de.cau)).toBe(12);
    de.cau.forEach(dien);
    expect(tienDoDe(de)).toEqual({ xong: 12, tong: 12 });
    expect(demCauConTrong(de.cau)).toBe(0);
    expect(nhomOTheoCau(de.cau)).toHaveLength(12);
    expect(de.cau.filter((c) => c.cau === '8').reduce((s, c) => s + c.diem, 0)).toBe(2);

    // Xuất Word ma trận: ô Tổng số câu phải là 12 (không phải 13 hay 15)
    const buf = await Packer.toBuffer(dungMaTranDacTa({ tenTruong: 'TRƯỜNG TH TRẦN VĂN ƠN', tieuDeKy: 'KIỂM TRA CUỐI HỌC KÌ I - NH 2026 - 2027', tenMon: 'TOÁN', thoiGianPhut: 40, lop: 4 }, dacTa));
    const xml = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(xml).toContain('Tổng số câu');
    expect(xml).toMatch(/Tổng số câu[\s\S]*?\b12\b/);
  });

  it('cảnh báo khi các ý cùng số câu khác hình thức (TN và TL)', () => {
    const toan = clone(MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!) as MaTranChung;
    const phan = toan.bai_kiem_tra[0].phan[0];
    for (const d of phan.dong) d.cau_hoi = d.cau_hoi.filter((c) => c.cau !== '8');
    const dSo = phan.dong.find((d) => d.mach === 'SỐ VÀ PHÉP TÍNH' && d.noi_dung?.includes('Phép cộng'))!;
    const dHinh = phan.dong.find((d) => d.mach === 'HÌNH HỌC VÀ ĐO LƯỜNG' && d.yccd.length > 0)!;
    dHinh.cau_hoi.push({ cau: '8', y_nho: ['a'], so_cau_tinh: 1, muc: 1, hinh_thuc: 'TN', dang: null, diem: 0.5 });
    dSo.cau_hoi.push({ cau: '8', y_nho: ['b', 'c', 'd'], so_cau_tinh: 3, muc: 1, hinh_thuc: 'TL', dang: null, diem: 1.5 });
    danhKhoaCauTach(toan);

    const kqMt = kiemDinhMaTranChung(toan);
    expect(kqMt.canhBao.some((c) => /Câu 8.*khác hình thức/.test(c))).toBe(true);

    const ds = danhSachCau(toan);
    const mtr = taoMaTranRiengRong(toan);
    mtr.cau_hoi = ds.map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
    mtr.trang_thai = 'DA_XAC_NHAN';
    const dacTa = taoDacTa(toan, mtr, 1, { tuanKiemTra: 17 });
    expect(kiemDinhDacTa(toan, mtr, dacTa).canhBao.some((c) => /Câu 8.*khác hình thức/.test(c))).toBe(true);

    const de = taoDeTuDacTa(dacTa, 1);
    expect(kiemDinhDe(dacTa, de).canhBao.some((c) => /Câu 8.*khác hình thức/.test(c))).toBe(true);
  });
});
