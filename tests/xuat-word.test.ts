import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Packer } from 'docx';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong, type LuaChon } from '../src/core/matrix/matrix-template';
import { taoDacTa } from '../src/core/dac-ta/dac-ta';
import { taoDeTuDacTa } from '../src/core/de/de';
import { dungTaiLieuDe, xepCauTheoSo } from '../src/core/de/xuat-word';
import { docChuTuDocx } from '../src/core/utils/docx-text';

const mtc = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'LS_DL')!;
const lc: LuaChon = {};
for (const nhom of cacNhomLuaChon(mtc)) lc[nhom.ma] = nhom.phuong_an[0].ma;
const mtr = taoMaTranRiengRong(mtc);
mtr.lua_chon_da_dung = lc;
mtr.cau_hoi = danhSachCau(mtc, lc).map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
mtr.trang_thai = 'DA_XAC_NHAN';
const dacTa = taoDacTa(mtc, mtr, 1, { tuanKiemTra: 9 });
const de = taoDeTuDacTa(dacTa, 1);
de.cau = de.cau.map((c, i) => ({
  ...c,
  deBai: `Nội dung câu hỏi số ${i + 1}: em hãy chọn hoặc trả lời cho đúng với bài đã học.`,
  luaChon: c.dang === 'NLC' ? ['Phương án một', 'Phương án hai', 'Phương án ba', 'Phương án bốn'] : c.dang === 'DS' ? c.luaChon.map((_, k) => `Ý số ${k + 1}`) : c.luaChon,
  dapAn: c.dang === 'NLC' ? 'B' : c.dang === 'DS' ? 'ĐSĐS'.slice(0, c.luaChon.length) : 'Đáp án viết ra',
  huongDanCham: c.hinhThuc === 'TL' ? 'Nêu đúng ý 1: 0,5 điểm\nNêu đúng ý 2: 0,5 điểm' : '',
}));
const tt = { tenTruong: 'TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN', tieuDeKy: 'KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027', tenMon: 'LỊCH SỬ VÀ ĐỊA LÍ', thoiGianPhut: 35 };

describe('Xuất Word', () => {
  it('dựng được tệp .docx có đủ phần đề và hướng dẫn chấm', async () => {
    const buf = await Packer.toBuffer(dungTaiLieuDe(tt, de));
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    if (process.env.XUAT_THU) writeFileSync(process.env.XUAT_THU, buf);
    const xml = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    for (const s of ['TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN', 'PHẦN BÀI LÀM CỦA HỌC SINH', 'HƯỚNG DẪN CHẤM MÔN LỊCH SỬ VÀ ĐỊA LÍ', 'HẾT ĐỀ']) expect(xml).toContain(s);
    expect(xml).toContain('Câu 1');
  });

  it('xếp câu theo số thứ tự, câu không đánh số để cuối', () => {
    const mau = (cau: string) => ({ ...de.cau[0], cau });
    expect(xepCauTheoSo([mau('Viết'), mau('10'), mau('2'), mau('1')]).map((c) => c.cau)).toEqual(['1', '2', '10', 'Viết']);
  });
});
