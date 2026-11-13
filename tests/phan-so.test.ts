import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Packer } from 'docx';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong, type LuaChon } from '../src/core/matrix/matrix-template';
import { taoDacTa } from '../src/core/dac-ta/dac-ta';
import { taoDeTuDacTa } from '../src/core/de/de';
import { dungTaiLieuDe } from '../src/core/de/xuat-word';
import { boNhanPhuongAn, chuanHoaPhanSo, coPhanSo, tachPhanSo } from '../src/core/de/phan-so';
import { docTepTrongZip } from '../src/core/utils/docx-text';
import { docCauAISoan } from '../src/core/chuong-trinh/sach';

describe('nhận dạng phân số', () => {
  it('tách chữ và phân số theo thứ tự', () => {
    expect(tachPhanSo('Rút gọn 12/18 được 2/3 nhé')).toEqual([
      { loai: 'chu', chu: 'Rút gọn ' }, { loai: 'ps', tu: '12', mau: '18' },
      { loai: 'chu', chu: ' được ' }, { loai: 'ps', tu: '2', mau: '3' }, { loai: 'chu', chu: ' nhé' },
    ]);
  });
  it('số hỗn hợp: giữ số nguyên là chữ, phân số đi liền sau', () => {
    expect(tachPhanSo('Có 2 1/3 cái bánh')).toEqual([
      { loai: 'chu', chu: 'Có 2 ' }, { loai: 'ps', tu: '1', mau: '3' }, { loai: 'chu', chu: ' cái bánh' },
    ]);
  });
  it('không nhầm ngày tháng, km/h, mẫu số 0', () => {
    for (const s of ['Ngày 12/10/2026', 'ngày 5/11', 'tháng 3/2026', 'vận tốc 40 km/h', 'chia cho 5/0', 'mã 2026/11/13']) expect(coPhanSo(s)).toBe(false);
  });
  it('chuẩn hóa LaTeX và ký tự ½ ¾ về a/b', () => {
    expect(chuanHoaPhanSo('\\frac{3}{4} và \\dfrac{1}{2}')).toBe('3/4 và 1/2');
    expect(chuanHoaPhanSo('có ½ cái, 2¾ m')).toBe('có 1/2 cái, 2 3/4 m');
    expect(chuanHoaPhanSo('3 ⁄ 4')).toBe('3/4');
  });
  it('bỏ nhãn A. B) thừa ở đầu phương án nhưng giữ nội dung', () => {
    expect(boNhanPhuongAn('A. Ba trăm')).toBe('Ba trăm');
    expect(boNhanPhuongAn('c) 402 305')).toBe('402 305');
    expect(boNhanPhuongAn('A là một số')).toBe('A là một số');
    expect(boNhanPhuongAn('402 350')).toBe('402 350');
  });
  it('câu AI soạn: phương án bị bỏ nhãn thừa và phân số được chuẩn hóa', () => {
    const c = docCauAISoan('{"deBai":"Rút gọn \\\\frac{12}{18}","luaChon":["A. 2/3","B. 3/4","C. 1/2","D. 4/5"],"dapAn":"A","huongDanCham":"","khongDuCanCu":false,"ghiChu":""}');
    expect(c?.deBai).toBe('Rút gọn 12/18');
    expect(c?.luaChon).toEqual(['2/3', '3/4', '1/2', '4/5']);
  });
});

describe('xuất Word có phân số', () => {
  it('dựng công thức phân số (m:f) cho a/b trong đề bài và phương án', async () => {
    const mtc = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'LS_DL')!;
    const lc: LuaChon = {};
    for (const nhom of cacNhomLuaChon(mtc)) lc[nhom.ma] = nhom.phuong_an[0].ma;
    const mtr = taoMaTranRiengRong(mtc);
    mtr.lua_chon_da_dung = lc;
    mtr.cau_hoi = danhSachCau(mtc, lc).map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
    mtr.trang_thai = 'DA_XAC_NHAN';
    const de = taoDeTuDacTa(taoDacTa(mtc, mtr, 1, { tuanKiemTra: 9 }), 1);
    de.cau = de.cau.map((c, i) => ({
      ...c,
      deBai: i === 0 ? 'Phân số nào bằng 6/8 trong các phân số sau? Mai có 2 1/3 cái bánh.' : `Câu ${i + 1}: ngày 5/11 em đi học.`,
      luaChon: c.dang === 'NLC' ? ['3/4', '4/5', '5/6', '1/2'] : c.luaChon,
      dapAn: c.dang === 'NLC' ? 'A' : c.dapAn,
    }));
    const buf = await Packer.toBuffer(dungTaiLieuDe({ tenTruong: 'TRƯỜNG TIỂU HỌC', tieuDeKy: 'KTĐK', tenMon: 'TOÁN', thoiGianPhut: 40 }, de));
    if (process.env.XUAT_PHAN_SO) writeFileSync(process.env.XUAT_PHAN_SO, buf);
    const xml = new TextDecoder().decode((await docTepTrongZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, 'word/document.xml'))!);
    expect(xml).toContain('<m:f>');
    expect(xml).toContain('<m:num>');
    expect(xml.split('<m:f>').length - 1).toBeGreaterThanOrEqual(6); // 6/8, 1/3, và 4 phương án
    expect(xml).toContain('ngày 5/11 em đi học'); // ngày tháng giữ nguyên là chữ
  });
});
