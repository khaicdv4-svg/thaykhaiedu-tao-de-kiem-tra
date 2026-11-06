import { describe, it, expect } from 'vitest';
import { phanLoaiFile, khoaO, oBiTrung, chuanHoa } from '@/core/kho-ma-tran/phan-loai';

const GOC = 'ĐỀ KIỂM TRA 2026 - 2027';

describe('Nhận diện file ma trận theo thư mục của tổ', () => {
  it('chuẩn hóa bỏ dấu, đ thành D, & thành VA', () => {
    expect(chuanHoa('Ma trận LS&ĐL – Cuối HKI')).toBe('MA TRAN LS VA DL CUOI HKI');
  });

  it('ma trận chung Toán cuối HKI', () => {
    const f = phanLoaiFile(`${GOC}/3.MA TRAN CHUNG CUOI HKI_K4/1. MA TRẬN CHUNG MÔN TOÁN CUỐI HKI K4_2026-2027.docx`);
    expect(f).toMatchObject({ dinhDang: 'DOCX', loai: 'CHUNG', maMon: 'TOAN', ky: 'CUOI_HK1' });
    expect(f.canhBao).toEqual([]);
  });

  it('tên file viết tắt CHKI vẫn nhận ra Cuối HKI', () => {
    const f = phanLoaiFile(`${GOC}/3.MA TRAN CHUNG CUOI HKI_K4/2. MA TRAN CHUNG MON TIENG VIET-CHKI_K4_2026-2027.docx`);
    expect(f).toMatchObject({ loai: 'CHUNG', maMon: 'TIENG_VIET', ky: 'CUOI_HK1' });
  });

  it('LS&ĐL nhận đúng môn', () => {
    const f = phanLoaiFile(`${GOC}/3.MA TRAN CHUNG CUOI HKI_K4/4. MA TRAN  CHUNG LS&ĐL-CHKI_ K4_NH 26-27.docx`);
    expect(f.maMon).toBe('LS_DL');
    expect(f.ky).toBe('CUOI_HK1');
  });

  it('Giữa HKII không bị nhầm thành Giữa HKI', () => {
    const f = phanLoaiFile(`${GOC}/4.MA TRAN CHUNG GIUA HKII_K4/MA TRAN CHUNG TOAN GIUA HKII.docx`);
    expect(f.ky).toBe('GIUA_HK2');
    const g = phanLoaiFile(`${GOC}/2.MA TRAN CHUNG GIUA HKI_K4/MA TRAN CHUNG TOAN.docx`);
    expect(g.ky).toBe('GIUA_HK1');
  });

  it('file cuối năm để nhầm trong thư mục cuối HKI: để trống kì và báo', () => {
    const f = phanLoaiFile(`${GOC}/3.MA TRAN CHUNG CUOI HKI_K4/3. MA TRAN  CHUNG KHOA HOC-CUOI NAM_ K4_2026-2027.docx`);
    expect(f.maMon).toBe('KHOA_HOC');
    expect(f.ky).toBeNull();
    expect(f.canhBao.join(' ')).toMatch(/Cuối năm.*Cuối HKI/);
  });

  it('file .doc cũ được báo cần lưu lại thành .docx', () => {
    const f = phanLoaiFile(`${GOC}/3.MA TRAN CHUNG CUOI HKI_K4/5. MA TRAN  CHUNG CONG NGHE-CHKI_ K4_2026-2027.doc`);
    expect(f.dinhDang).toBe('DOC_CU');
    expect(f.maMon).toBe('CONG_NGHE');
    expect(f.canhBao.join(' ')).toMatch(/\.docx/);
  });

  it('ma trận nội dung cả năm không gắn kì', () => {
    const f = phanLoaiFile(`${GOC}/1.MA TRAN NOI DUNG CA NAM_K4/MA TRAN NOI DUNG CA NAM MON TOAN.docx`);
    expect(f).toMatchObject({ loai: 'CA_NAM', maMon: 'TOAN', ky: null });
    expect(khoaO(f)).toBe('CA_NAM/TOAN');
  });

  it('file tạm của Word (~$) bị bỏ qua', () => {
    expect(phanLoaiFile(`${GOC}/x/~$ MA TRAN.docx`).dinhDang).toBe('TAM');
  });

  it('hai file cùng một ô thì bị đánh dấu trùng', () => {
    const a = phanLoaiFile(`${GOC}/3.MA TRAN CHUNG CUOI HKI_K4/MA TRAN CHUNG KHOA HOC-CUOI HKI_K4.docx`);
    const b = phanLoaiFile(`${GOC}/3.MA TRAN CHUNG CUOI HKI_K4/MA TRAN CHUNG KHOA HOC CHKI ban 2.docx`);
    expect(oBiTrung([a, b])).toEqual(new Set(['CHUNG/KHOA_HOC/CUOI_HK1']));
    expect(oBiTrung([a, { ...b, boQua: true }]).size).toBe(0);
  });
});
