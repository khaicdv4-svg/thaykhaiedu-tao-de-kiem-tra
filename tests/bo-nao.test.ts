import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { docMaTranChung } from '../src/core/bo-nao/doc-ma-tran';
import { boNaoTrong, lamSachBoNao } from '../src/core/bo-nao/bo-nao';
import { chuDiemCuaKy, khoangDoDai } from '../src/core/reading-passages/quy-dinh';
import { kiemTraBaiDoc } from '../src/core/reading-passages/kiem-tra';

const doc = (ten: string) => readFileSync(join(__dirname, 'fixtures', ten), 'utf8');

describe('đọc ma trận chung Tiếng Việt', () => {
  it('giữa HKI: đúng kì, độ dài, tốc độ, chủ điểm (đổi "&" thành "và")', () => {
    const k = docMaTranChung(doc('ma-tran-tv-giua-hki.txt'));
    expect(k.ky).toBe('GIUA_HK1');
    expect(k.quyDinh!.doDai).toEqual({ TRUYEN: [250, 280], MIEU_TA: [180, 200], THO: [90, 100], VAN_BAN_THONG_TIN: [140, 150] });
    expect(k.quyDinh!.tocDo).toEqual({ min: 80, max: 85 });
    expect(k.quyDinh!.chuDiem).toEqual(['Mỗi người một vẻ', 'Trải nghiệm và khám phá']);
    expect(k.canhBao).toEqual([]);
  });
  it('cuối HKI và "cuối học kỳ II" (= cuối năm)', () => {
    const a = docMaTranChung(doc('ma-tran-tv-cuoi-hki.txt'));
    expect(a.ky).toBe('CUOI_HK1');
    expect(a.quyDinh!.doDai).toEqual({ TRUYEN: [280, 300], MIEU_TA: [200, 220], THO: [100, 110], VAN_BAN_THONG_TIN: [150, 160] });
    expect(a.canhBao).toEqual([]);
    expect(a.quyDinh!.tocDo).toEqual({ min: 80, max: 90 });
    expect(a.quyDinh!.chuDiem).toEqual(['Niềm vui sáng tạo', 'Chắp cánh ước mơ']);
    const b = docMaTranChung(doc('ma-tran-tv-cuoi-nam.txt'));
    expect(b.ky).toBe('CUOI_NAM');
    expect(b.quyDinh!.doDai.VAN_BAN_THONG_TIN).toEqual([160, 180]);
    expect(b.quyDinh!.chuDiem).toEqual(['Quê hương trong tôi', 'Vì một thế giới bình yên']);
  });
  it('file lạ thì báo thiếu, không đoán', () => {
    const k = docMaTranChung('Biên bản họp tổ hôm nay.');
    expect(k.ky).toBeNull();
    expect(k.quyDinh).toBeNull();
    expect(k.canhBao.length).toBeGreaterThanOrEqual(3);
  });
});

describe('bộ não áp dụng vào quy định', () => {
  const bn = boNaoTrong();
  bn.ky.CUOI_HK1 = { ky: 'CUOI_HK1', tocDo: { min: 70, max: 75 }, doDai: { TRUYEN: [300, 320] }, chuDiem: ['Chủ điểm X'] };

  it('kì có trong bộ não dùng số của bộ não, kì khác dùng số mặc định', () => {
    expect(khoangDoDai('DOC_THANH_TIENG', 'CUOI_HK1', 'TRUYEN', bn)).toMatchObject({ min: 70, max: 75, dungSai: 5 });
    expect(khoangDoDai('DOC_HIEU', 'CUOI_HK1', 'TRUYEN', bn)).toMatchObject({ min: 300, max: 320, dungSai: 10 });
    expect(khoangDoDai('DOC_HIEU', 'CUOI_HK1', 'THO', bn)).toBeNull();
    expect(khoangDoDai('DOC_HIEU', 'GIUA_HK1', 'TRUYEN', bn)).toMatchObject({ min: 250, max: 280 });
    expect(khoangDoDai('DOC_HIEU', 'CUOI_HK1', 'TRUYEN')).toMatchObject({ min: 280, max: 300 });
    expect(chuDiemCuaKy('CUOI_HK1', bn)).toEqual(['Chủ điểm X']);
    expect(chuDiemCuaKy('GIUA_HK1', bn)).toEqual(['Mỗi người một vẻ', 'Trải nghiệm và khám phá']);
  });
  it('kiểm tra bài đọc dùng số của bộ não', () => {
    const noiDung = Array.from({ length: 270 }, (_, i) => `t${i}`).join(' ');
    const bai = { tieuDe: 'A', noiDung, tacGia: 'B', nguon: 'Sách C, trang 12', loai: 'DOC_HIEU' as const, ky: 'CUOI_HK1' as const, theLoai: 'TRUYEN' as const, chuDiem: 'Chắp cánh ước mơ' };
    expect(kiemTraBaiDoc(bai).loi).toEqual([]);
    const l = kiemTraBaiDoc(bai, [], bn).loi.join(' | ');
    expect(l).toContain('270 tiếng');
    expect(l).toContain('Chủ điểm X');
  });
  it('làm sạch dữ liệu hỏng', () => {
    const s = lamSachBoNao({ dungSai: { thanhTieng: -3, docHieu: 'x' }, ky: { CUOI_HK1: { doDai: { TRUYEN: [300, 100], THO: [90, 100] }, tocDo: { min: 90, max: 80 }, chuDiem: ['a', 5] } }, quyDinhRieng: 5 });
    expect(s.dungSai).toEqual({ thanhTieng: 5, docHieu: 10 });
    expect(s.ky.CUOI_HK1!.doDai).toEqual({ THO: [90, 100] });
    expect(s.ky.CUOI_HK1!.tocDo).toBeNull();
    expect(s.ky.CUOI_HK1!.chuDiem).toEqual(['a']);
    expect(s.quyDinhRieng).toBe('');
  });
});
