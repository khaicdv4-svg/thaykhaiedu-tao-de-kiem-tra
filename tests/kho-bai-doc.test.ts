import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { docChuTuDocx, xmlWordSangVanBan } from '../src/core/utils/docx-text';
import { tachBaiDoc, phanTichBaiDoc, nhanDienTheLoai, goiYChuDiem, chuanHoaSoSanh } from '../src/core/reading-passages/phan-tich';
import { kiemTraBaiDoc, tiLeTrung, trungTenSgk, lamSachUrl, type BaiDocCanKiem } from '../src/core/reading-passages/kiem-tra';
import { khoangDoDai, CHU_DIEM_THEO_KY } from '../src/core/reading-passages/quy-dinh';
import { BAI_DOC_SGK_TV4 } from '../src/core/reading-passages/sgk-tieng-viet-4';
import { loiNhacTimBaiDoc } from '../src/core/services/ai/reading-passage-ai';

const motBai = (n: number) => Array.from({ length: n }, (_, i) => `tiếng${i}`).join(' ');

describe('Quy định của tổ', () => {
  it('đọc hiểu cuối HKI: truyện 280 – 300, miêu tả 200 – 220, thơ 100 – 110, VBTT 150 – 160 (±10)', () => {
    expect(khoangDoDai('DOC_HIEU', 'CUOI_HK1', 'TRUYEN')).toMatchObject({ min: 280, max: 300, dungSai: 10 });
    expect(khoangDoDai('DOC_HIEU', 'CUOI_HK1', 'MIEU_TA')).toMatchObject({ min: 200, max: 220 });
    expect(khoangDoDai('DOC_HIEU', 'CUOI_HK1', 'THO')).toMatchObject({ min: 100, max: 110 });
    expect(khoangDoDai('DOC_HIEU', 'CUOI_HK1', 'VAN_BAN_THONG_TIN')).toMatchObject({ min: 150, max: 160 });
  });
  it('đọc thành tiếng: giữa HKI 80 – 85, các kì sau 80 – 90 (±5)', () => {
    expect(khoangDoDai('DOC_THANH_TIENG', 'GIUA_HK1', 'TRUYEN')).toMatchObject({ min: 80, max: 85, dungSai: 5 });
    expect(khoangDoDai('DOC_THANH_TIENG', 'CUOI_HK1', 'THO')).toMatchObject({ min: 80, max: 90, dungSai: 5 });
  });
  it('chủ điểm theo kì, SGK có đủ 62 bài đọc', () => {
    expect(CHU_DIEM_THEO_KY.CUOI_HK1).toEqual(['Niềm vui sáng tạo', 'Chắp cánh ước mơ']);
    expect(BAI_DOC_SGK_TV4).toHaveLength(62);
    expect(BAI_DOC_SGK_TV4.find((b) => b.ten === 'Anh Ba')?.chuDiem).toBe('Chắp cánh ước mơ');
    expect(BAI_DOC_SGK_TV4.find((b) => b.ten === 'Ngày hội')?.chuDiem).toBe('Vì một thế giới bình yên');
  });
});

describe('Đọc file Word và tách bài', () => {
  it('đọc chữ từ .docx, tách đúng 2 bài với tên, tác giả, nguồn, link', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures', 'bai-doc-mau.docx'));
    const vb = await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(vb).toContain('CÁI DIỀU GIẤY');
    const bai = tachBaiDoc(vb);
    expect(bai).toHaveLength(2);
    expect(bai[0]).toMatchObject({ tieuDe: 'CÁI DIỀU GIẤY', tacGia: 'Lê Văn Thử' });
    expect(bai[0].nguon).toContain('Tuyển tập truyện thiếu nhi');
    expect(bai[0].noiDung.startsWith('Chiều nào hai anh em')).toBe(true);
    expect(bai[1]).toMatchObject({ tieuDe: 'Điều kì diệu', tacGia: 'Trần Thị Mẫu' });
    expect(bai[1].nguonUrl).toContain('https://vidu.vn/bai-viet');
  });

  it('đọc được xml Word có tab, xuống dòng và kí tự đặc biệt', () => {
    const xml = '<w:p><w:r><w:t>A &amp; B</w:t><w:tab/><w:t xml:space="preserve">C </w:t><w:br/><w:t>D</w:t></w:r></w:p><w:p><w:r><w:t>E</w:t></w:r></w:p>';
    expect(xmlWordSangVanBan(xml)).toBe('A & B\tC \nD\nE');
  });

  it('tách bài dán tay có dạng "(Theo …)" không có dòng "Bài đọc n"', () => {
    const vb = `MÙA THU\nGió heo may về, lá vàng rơi đầy sân.\n(Theo Nguyễn Văn A)\n\nCON MÈO\nCon mèo nhà em có bộ lông trắng muốt.\n– Phạm Thị B`;
    const bai = tachBaiDoc(vb);
    expect(bai.map((b) => [b.tieuDe, b.tacGia])).toEqual([['MÙA THU', 'Nguyễn Văn A'], ['CON MÈO', 'Phạm Thị B']]);
  });

  it('nhận ra thơ', () => {
    const tho = 'Em mơ làm mây trắng\nBay khắp nẻo trời cao\nNhìn non sông gấm vóc\nQuê mình đẹp biết bao';
    expect(nhanDienTheLoai(tho)).toEqual({ theLoai: 'THO', tinCay: 'CAO' });
  });

  it('gợi ý chủ điểm và kì từ nội dung', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures', 'bai-doc-mau.docx'));
    const bai = tachBaiDoc(await docChuTuDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
    const pt = phanTichBaiDoc(bai[0]);
    expect(pt.chuDiem).toBe('Chắp cánh ước mơ');
    expect(pt.ky).toBe('CUOI_HK1');
    expect(pt.loai).toBe('DOC_THANH_TIENG');
    expect(goiYChuDiem('Bạn ấy có ước mơ trở thành phi công, mơ ước bay cao', CHU_DIEM_THEO_KY.GIUA_HK1).xepHang.every((x) => CHU_DIEM_THEO_KY.GIUA_HK1.includes(x.chuDiem))).toBe(true);
  });
});

describe('Kiểm tra bài đọc', () => {
  const hopLe: BaiDocCanKiem = {
    tieuDe: 'Cái diều giấy',
    noiDung: motBai(85),
    tacGia: 'Lê Văn Thử',
    nguon: 'Tuyển tập truyện thiếu nhi, NXB Thử nghiệm',
    loai: 'DOC_THANH_TIENG',
    ky: 'CUOI_HK1',
    theLoai: 'TRUYEN',
    chuDiem: 'Chắp cánh ước mơ',
  };

  it('bài đủ điều kiện thì hợp lệ', () => {
    const kq = kiemTraBaiDoc(hopLe);
    expect(kq.loi).toEqual([]);
    expect(kq.soTieng).toBe(85);
  });

  it('thiếu tác giả, nguồn; nguồn là SGK; chưa xếp chỗ → chặn', () => {
    const kq = kiemTraBaiDoc({ tieuDe: 'X', noiDung: motBai(85), tacGia: '', nguon: 'Sách Tiếng Việt 4 Cánh Diều' });
    const s = kq.loi.join(' | ');
    expect(s).toContain('Thiếu tác giả');
    expect(s).toContain('sách giáo khoa');
    expect(s).toContain('Chưa chọn loại bài');
    expect(s).toContain('Chưa chọn chủ điểm');
  });

  it('độ dài: ngoài ±5 thì chặn, trong ±5 thì cảnh báo', () => {
    expect(kiemTraBaiDoc({ ...hopLe, noiDung: motBai(60) }).loi.some((l) => l.includes('60 tiếng'))).toBe(true);
    // đọc thành tiếng: bài dài hơn quy định vẫn qua, chỉ cảnh báo vì sẽ cắt đoạn
    const dai = kiemTraBaiDoc({ ...hopLe, noiDung: motBai(96) });
    expect(dai.loi).toEqual([]);
    expect(dai.canhBao.some((c) => c.includes('cắt một đoạn'))).toBe(true);
    const kq = kiemTraBaiDoc({ ...hopLe, noiDung: motBai(93) });
    expect(kq.loi).toEqual([]);
    expect(kq.canhBao.some((c) => c.includes('93 tiếng'))).toBe(true);
  });

  it('chủ điểm không thuộc kì → chặn', () => {
    expect(kiemTraBaiDoc({ ...hopLe, chuDiem: 'Mỗi người một vẻ' }).loi.some((l) => l.includes('không thuộc Cuối học kì I'))).toBe(true);
  });

  it('link: chưa kiểm thì chặn, có utm thì bỏ và cảnh báo, trang lời giải thì cảnh báo', () => {
    const kq = kiemTraBaiDoc({ ...hopLe, nguonUrl: 'https://loigiaihay.com/bai?utm_source=chatgpt.com&id=3' });
    expect(kq.loi.some((l) => l.includes('Chưa kiểm tra link'))).toBe(true);
    expect(kq.nguonUrlSach).toBe('https://loigiaihay.com/bai?id=3');
    expect(kq.canhBao.length).toBe(2);
    expect(kiemTraBaiDoc({ ...hopLe, nguonUrl: 'https://vidu.vn/a', trangThaiLink: 'CON_TON_TAI' }).loi).toEqual([]);
    expect(lamSachUrl('https://a.vn/x?utm_medium=1')).toBe('https://a.vn/x');
  });

  it('trùng tên bài SGK đang dạy → chặn, ghi rõ bài và trang', () => {
    expect(trungTenSgk('Điều kì diệu')).toContain('tập một, Bài 1, trang 8');
    expect(trungTenSgk('Trích: Người tìm đường lên các vì sao')).toContain('Bài 24');
    expect(trungTenSgk('Cái diều giấy')).toBeNull();
    expect(kiemTraBaiDoc({ ...hopLe, tieuDe: 'Anh Ba' }).loi.some((l) => l.includes('trùng bài đọc SGK'))).toBe(true);
  });

  it('trùng nội dung SGK: từ 30% chặn, 10 – 30% cảnh báo', () => {
    const sgk = motBai(200);
    const trung40 = [...motBai(40).split(' '), ...Array.from({ length: 45 }, (_, i) => `khac${i}`)].join(' ');
    const trung20 = [...motBai(24).split(' '), ...Array.from({ length: 61 }, (_, i) => `khac${i}`)].join(' ');
    expect(tiLeTrung(trung40, sgk)).toBeGreaterThanOrEqual(30);
    expect(kiemTraBaiDoc({ ...hopLe, noiDung: trung40 }, [{ ten: 'Bài SGK', noiDung: sgk }]).loi.some((l) => l.includes('Nội dung trùng'))).toBe(true);
    const kq = kiemTraBaiDoc({ ...hopLe, noiDung: trung20 }, [{ ten: 'Bài SGK', noiDung: sgk }]);
    expect(kq.loi).toEqual([]);
    expect(kq.canhBao.some((c) => c.includes('Nội dung trùng'))).toBe(true);
  });

  it('so trùng không phân biệt hoa thường, dấu câu', () => {
    expect(chuanHoaSoSanh('Bét-tô-ven, và “Ánh trăng”!')).toBe('bét tô ven và ánh trăng');
  });
});

describe('Chỗ cắm AI', () => {
  it('lời nhắc tìm bài có đủ quy định của tổ', () => {
    const p = loiNhacTimBaiDoc({ loai: 'DOC_HIEU', ky: 'CUOI_HK1', chuDiem: 'Niềm vui sáng tạo', theLoai: 'TRUYEN', soBai: 3 });
    expect(p).toContain('280 – 300 tiếng');
    expect(p).toContain('Không lấy bài có trong SGK');
    expect(p).toContain('Anh Ba');
  });
});
