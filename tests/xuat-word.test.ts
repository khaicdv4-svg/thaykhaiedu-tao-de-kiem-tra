import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Packer } from 'docx';
import { MAU_MA_TRAN_CHUNG } from '../src/core/matrix/templates';
import { cacNhomLuaChon, danhSachCau, taoMaTranRiengRong, type LuaChon } from '../src/core/matrix/matrix-template';
import { taoDacTa } from '../src/core/dac-ta/dac-ta';
import { kiemDinhDe, taoDeTuDacTa } from '../src/core/de/de';
import { dungHoSoDe, dungTaiLieuDe, dungTaiLieuTiengViet, xepCauTheoSo } from '../src/core/de/xuat-word';
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

  it('bộ hồ sơ gồm ma trận, đặc tả, đề và hướng dẫn chấm trong một tệp', async () => {
    const buf = await Packer.toBuffer(dungHoSoDe(tt, dacTa, de));
    if (process.env.XUAT_HOSO) writeFileSync(process.env.XUAT_HOSO, buf);
    const xml = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    for (const s of ['MA TRẬN ĐỀ', 'BẢN ĐẶC TẢ ĐỀ', 'HIỆU TRƯỞNG', 'TỔ TRƯỞNG', 'PHẦN BÀI LÀM CỦA HỌC SINH', 'HƯỚNG DẪN CHẤM MÔN LỊCH SỬ VÀ ĐỊA LÍ']) expect(xml).toContain(s);
    // thứ tự: ma trận → đặc tả → đề → hướng dẫn chấm
    expect(xml.indexOf('MA TRẬN ĐỀ')).toBeLessThan(xml.indexOf('BẢN ĐẶC TẢ ĐỀ'));
    expect(xml.indexOf('BẢN ĐẶC TẢ ĐỀ')).toBeLessThan(xml.indexOf('PHẦN BÀI LÀM CỦA HỌC SINH'));
    expect(xml.indexOf('PHẦN BÀI LÀM CỦA HỌC SINH')).toBeLessThan(xml.indexOf('HƯỚNG DẪN CHẤM MÔN'));
  });

  it('xếp câu theo số thứ tự, câu không đánh số để cuối', () => {
    const mau = (cau: string) => ({ ...de.cau[0], cau });
    expect(xepCauTheoSo([mau('Viết'), mau('10'), mau('2'), mau('1')]).map((c) => c.cau)).toEqual(['1', '2', '10', 'Viết']);
  });
});

describe('Xuất Word môn Tiếng Việt', () => {
  const tv = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TIENG_VIET')!;
  const lcTv: LuaChon = {};
  for (const nhom of cacNhomLuaChon(tv)) lcTv[nhom.ma] = nhom.phuong_an[0].ma;
  const mtrTv = taoMaTranRiengRong(tv);
  mtrTv.lua_chon_da_dung = lcTv;
  mtrTv.cau_hoi = danhSachCau(tv, lcTv).filter((c) => c.cau.dang !== 'VIET').map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
  mtrTv.trang_thai = 'DA_XAC_NHAN';
  const deTv = taoDeTuDacTa(taoDacTa(tv, mtrTv, 1, { tuanKiemTra: 18 }), 1);
  const doan = (n: number) => Array.from({ length: n }, (_, i) => `tiếng${i}`).join(' ');
  deTv.cau = deTv.cau.map((c, i) => ({
    ...c,
    deBai: c.dang === 'VIET' ? 'Em hãy kể lại một câu chuyện nói về tình cảm gia đình.' : `Câu hỏi đọc hiểu số ${i + 1} về bài đọc.`,
    luaChon: c.hinhThuc === 'TN' ? ['Phương án một', 'Phương án hai', 'Phương án ba', 'Phương án bốn'] : [],
    dapAn: c.hinhThuc === 'TN' ? 'C' : c.dang === 'VIET' ? '' : 'Gợi ý đáp án',
    huongDanCham: c.hinhThuc === 'TL' ? 'Nêu đúng ý: 0,5 điểm; giải thích hợp lí: 0,5 điểm' : '',
  }));
  deTv.tiengViet = {
    baiDocHieu: { tieuDe: 'Cuộc phiêu lưu của bồ công anh', noiDung: `${doan(60)}\n${doan(60)}`, tacGia: 'Trương Huỳnh Như Trân', nguon: '(Nguồn: sách báo)' },
    baiDocThanhTieng: [1, 2, 3, 4].map((i) => ({ tieuDe: `Bài số ${i}`, noiDung: doan(82), tacGia: 'Tác giả A', nguon: '(Nguồn: sách)', cauHoi: `Câu hỏi bài ${i}?`, traLoi: `Trả lời bài ${i}.` })),
  };
  const ttTv = { tenTruong: 'TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN', tieuDeKy: 'KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027', tenMon: 'TIẾNG VIỆT', thoiGianPhut: 30 };

  it('dựng một tệp gồm đủ các phần của bộ đề', async () => {
    const buf = await Packer.toBuffer(dungTaiLieuTiengViet(ttTv, deTv));
    if (process.env.XUAT_TV) writeFileSync(process.env.XUAT_TV, buf);
    const xml = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    for (const s of ['MÔN TIẾNG VIỆT (ĐỌC HIỂU) - Lớp 4', 'Bài đọc hiểu:', 'MÔN TIẾNG VIỆT (VIẾT) - Lớp 4', 'MÔN TIẾNG VIỆT (Đọc thành tiếng) - Lớp 4', 'BÀI SỐ 4', 'HƯỚNG DẪN CHẤM MÔN TIẾNG VIỆT - LỚP 4', 'Tiêu chí chấm điểm', 'Trả lời bài 4.']) expect(xml).toContain(s);
  });

  it('kiểm định: đề đủ thì đạt; thiếu bài đọc, thiếu câu hỏi, bài quá ngắn thì báo lỗi', () => {
    const dt = taoDacTa(tv, mtrTv, 1, { tuanKiemTra: 18 });
    expect(kiemDinhDe(dt, deTv).loi.filter((l) => /Bài đọc|bài đọc|tiếng/.test(l))).toEqual([]);
    const thieu = { ...deTv, tiengViet: undefined };
    expect(kiemDinhDe(dt, thieu).loi.some((l) => /Chưa có bài đọc hiểu/.test(l))).toBe(true);
    const ngan = JSON.parse(JSON.stringify(deTv));
    ngan.tiengViet.baiDocThanhTieng[1].noiDung = doan(50);
    ngan.tiengViet.baiDocThanhTieng[2].cauHoi = '';
    const loi = kiemDinhDe(dt, ngan).loi;
    expect(loi.some((l) => /Bài đọc 2: 50 tiếng/.test(l))).toBe(true);
    expect(loi.some((l) => /Bài đọc 3: chưa có câu hỏi/.test(l))).toBe(true);
  });
});

describe('Thông báo kiểm định theo thứ tự câu', () => {
  it('liệt kê lỗi theo số câu tăng dần và dùng dấu phẩy cho điểm lẻ', () => {
    const d = { ...de, cau: [...de.cau].reverse().map((c) => ({ ...c, deBai: '', dapAn: '', huongDanCham: '', diem: c.hinhThuc === 'TL' ? 1.5 : c.diem })) };
    const kq = kiemDinhDe(dacTa, d);
    const so = kq.loi.filter((l) => l.includes('chưa có đề bài')).map((l) => /^Câu (\d+)/.exec(l)?.[1]).filter(Boolean).map(Number);
    expect(so).toEqual([...so].sort((a, b) => a - b));
    expect(kq.loi.some((l) => l.includes('1.5 điểm'))).toBe(false);
  });

  it('hình đặt đúng chỗ [Hình n] và khung trống không làm hỏng tệp', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const d2 = { ...de, cau: de.cau.map((c, i) => (i === 0 ? { ...c, deBai: 'Quan sát hình:\n[Hình 1]\nCó mấy góc?\n[Hình 2]', hinh: [{ ten: 'a', chuThich: 'Hình A', anh: png, rong: 1, cao: 1 }, { ten: '', chuThich: '', anh: '', rong: 0, cao: 0 }] } : c)) };
    const buf = await Packer.toBuffer(dungTaiLieuDe(tt, d2));
    const xml = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(xml).toContain('Quan sát hình:');
    expect(xml).toContain('Hình A');
    expect(xml).toContain('[Hình 2: chưa có ảnh]');
    expect(xml).not.toContain('[Hình 1]');
  });

  it('hình đặt bên phải chữ: chữ và hình nằm hai cột cùng một hàng', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const d2 = { ...de, cau: de.cau.map((c, i) => (i === 0 ? { ...c, deBai: 'Mảnh vườn hình chữ nhật như hình bên.\n[Hình 1]\nTính diện tích mảnh vườn.', hinh: [{ ten: 'a', chuThich: 'Hình V', anh: png, rong: 120, cao: 80, canh: 'PHAI' as const }] } : c)) };
    const buf = await Packer.toBuffer(dungTaiLieuDe(tt, d2));
    const xml = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(xml).toContain('Mảnh vườn hình chữ nhật như hình bên.');
    expect(xml).toContain('Tính diện tích mảnh vườn.');
    expect(xml).toContain('Hình V');
    expect(xml).not.toContain('[Hình 1]');
  });

  it('câu trắc nghiệm chỉ hiện đáp án, không hiện hướng dẫn chấm', async () => {
    const d3 = { ...de, cau: de.cau.map((c) => (c.hinhThuc === 'TN' ? { ...c, huongDanCham: 'GHI CHU CHAM TRAC NGHIEM' } : c)) };
    expect(d3.cau.some((c) => c.hinhThuc === 'TN')).toBe(true);
    const buf = await Packer.toBuffer(dungTaiLieuDe(tt, d3));
    const xml = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(xml).not.toContain('GHI CHU CHAM TRAC NGHIEM');
  });
});
