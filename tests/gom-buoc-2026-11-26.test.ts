import { describe, it, expect } from 'vitest';
import { chonHopLe, kyTheoMon, lamSachKiemTraThem, monTheoKhoi } from '../src/core/ho-so-de/mon-ky';
import { apBaiDocChon, baiDocChonCoGi, baiDocChonRong, baiDocChonTuDe, lamSachBaiDocChon, taoNoiDungTiengVietRong } from '../src/core/de/tieng-viet';
import { lamSachBoNao } from '../src/core/bo-nao/bo-nao';
import { monHopLe } from '../src/core/ho-so-de/ho-so-de';

const ma = (k: number) => monTheoKhoi(k).map((m) => m.ma);

describe('Môn, kì kiểm tra theo khối (Thông tư 27)', () => {
  it('lớp 1, 2 chỉ Toán, Tiếng Việt; lớp 3 thêm Tin học, Công nghệ; lớp 4, 5 đủ 6 môn', () => {
    expect(ma(1)).toEqual(['TOAN', 'TIENG_VIET']);
    expect(ma(2)).toEqual(['TOAN', 'TIENG_VIET']);
    expect(ma(3)).toEqual(['TOAN', 'TIENG_VIET', 'TIN_HOC', 'CONG_NGHE']);
    expect(ma(4)).toEqual(['TOAN', 'TIENG_VIET', 'KHOA_HOC', 'LS_DL', 'TIN_HOC', 'CONG_NGHE']);
    expect(ma(5)).toEqual(ma(4));
    expect(ma(4)).not.toContain('TIENG_ANH');
  });

  it('giữa kì chỉ có Toán, Tiếng Việt lớp 4, 5', () => {
    expect(kyTheoMon(4, 'TOAN')).toEqual(['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM']);
    expect(kyTheoMon(5, 'TIENG_VIET')).toEqual(['GIUA_HK1', 'CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM']);
    expect(kyTheoMon(4, 'KHOA_HOC')).toEqual(['CUOI_HK1', 'CUOI_NAM']);
    expect(kyTheoMon(3, 'TOAN')).toEqual(['CUOI_HK1', 'CUOI_NAM']);
    expect(kyTheoMon(2, 'KHOA_HOC')).toEqual([]);
  });

  it('tổ bật thêm ở Bộ não thì hiện thêm môn, kì', () => {
    const them = [{ mon: 'KHOA_HOC', ky: 'GIUA_HK2' as const }, { mon: 'TIN_HOC', ky: 'CUOI_HK1' as const }];
    expect(kyTheoMon(4, 'KHOA_HOC', them)).toEqual(['CUOI_HK1', 'GIUA_HK2', 'CUOI_NAM']);
    expect(ma(2)).not.toContain('TIN_HOC');
    expect(monTheoKhoi(2, them).map((m) => m.ma)).toContain('TIN_HOC');
  });

  it('môn, kì không hợp lệ ở khối mới thì chuyển về lựa chọn gần nhất', () => {
    expect(chonHopLe(2, 'KHOA_HOC', 'CUOI_HK1')).toEqual({ mon: 'TOAN', ky: 'CUOI_HK1' });
    expect(chonHopLe(4, 'LS_DL', 'GIUA_HK1')).toEqual({ mon: 'LS_DL', ky: 'CUOI_HK1' });
    expect(chonHopLe(4, 'TOAN', 'GIUA_HK2')).toEqual({ mon: 'TOAN', ky: 'GIUA_HK2' });
  });

  it('làm sạch danh sách kiểm tra thêm và Bộ não giữ lại', () => {
    expect(lamSachKiemTraThem([{ mon: 'X', ky: 'CUOI_HK1' }, { mon: 'TOAN', ky: 'SAI' }, { mon: 'KHOA_HOC', ky: 'GIUA_HK1' }, { mon: 'KHOA_HOC', ky: 'GIUA_HK1' }]))
      .toEqual([{ mon: 'KHOA_HOC', ky: 'GIUA_HK1' }]);
    expect(lamSachBoNao({ kiemTraThem: [{ mon: 'LS_DL', ky: 'GIUA_HK2' }] }).kiemTraThem).toEqual([{ mon: 'LS_DL', ky: 'GIUA_HK2' }]);
    expect(lamSachBoNao({}).kiemTraThem).toBeUndefined();
  });

  it('Tin học là môn hợp lệ của hồ sơ đề', () => {
    expect(monHopLe('TIN_HOC')).toBe(true);
    expect(monHopLe('TIENG_ANH')).toBe(false);
  });
});

describe('Bài đọc Tiếng Việt chọn ở bước 1', () => {
  const bai = (t: string, nd = `${t} nội dung`) => ({ tieuDe: t, noiDung: nd, tacGia: 'Tác giả', nguon: 'Nguồn: sách', khoId: null });
  const chon = () => ({ baiDocHieu: bai('Hiểu'), baiDocThanhTieng: [bai('A'), bai('B'), bai('C'), bai('D')] });

  it('làm sạch luôn ra đúng 1 bài đọc hiểu và 4 bài đọc thành tiếng', () => {
    const c = lamSachBaiDocChon({ baiDocThanhTieng: [bai('A')] });
    expect(c.baiDocThanhTieng).toHaveLength(4);
    expect(c.baiDocThanhTieng[1].tieuDe).toBe('');
    expect(baiDocChonCoGi(baiDocChonRong())).toBe(false);
    expect(baiDocChonCoGi(c)).toBe(true);
  });

  it('đưa vào đề: bài mới thì câu hỏi trống; bài không đổi giữ câu hỏi, đáp án', () => {
    const lan1 = apBaiDocChon(taoNoiDungTiengVietRong(), chon());
    expect(lan1.doi).toHaveLength(5);
    const daSoan = { ...lan1.tv, baiDocThanhTieng: lan1.tv.baiDocThanhTieng.map((b, i) => ({ ...b, cauHoi: `Hỏi ${i}`, traLoi: `Đáp ${i}` })) };
    // Không đổi gì: giữ nguyên
    expect(apBaiDocChon(daSoan, chon()).doi).toEqual([]);
    // Đổi bài 2: chỉ bài 2 mất câu hỏi
    const c2 = chon();
    c2.baiDocThanhTieng[1] = bai('B mới');
    const lan2 = apBaiDocChon(daSoan, c2);
    expect(lan2.doi).toEqual(['bài đọc thành tiếng 2']);
    expect(lan2.tv.baiDocThanhTieng[0].cauHoi).toBe('Hỏi 0');
    expect(lan2.tv.baiDocThanhTieng[1]).toMatchObject({ tieuDe: 'B mới', cauHoi: '', traLoi: '' });
  });

  it('đề cũ đã có bài đọc thì bước 1 lấy lại được, không có thì trả null', () => {
    const tv = apBaiDocChon(undefined, chon()).tv;
    expect(baiDocChonTuDe(tv)?.baiDocThanhTieng[3].tieuDe).toBe('D');
    expect(baiDocChonTuDe(taoNoiDungTiengVietRong())).toBeNull();
    expect(baiDocChonTuDe(undefined)).toBeNull();
  });
});

import { phuongAnTheoTheLoai } from '../src/core/de/tieng-viet';

describe('Bài đọc hiểu quyết định phần VBVH / VBTT của ma trận', () => {
  it('văn bản thông tin → VBTT; truyện, miêu tả, thơ, kịch → VBVH; chưa rõ → null', () => {
    expect(phuongAnTheoTheLoai('VAN_BAN_THONG_TIN')).toBe('VBTT');
    for (const t of ['TRUYEN', 'MIEU_TA', 'THO', 'KICH'] as const) expect(phuongAnTheoTheLoai(t)).toBe('VBVH');
    expect(phuongAnTheoTheLoai('KHAC')).toBeNull();
    expect(phuongAnTheoTheLoai(null)).toBeNull();
  });
  it('giữ thể loại khi lưu, bỏ giá trị lạ', () => {
    expect(lamSachBaiDocChon({ baiDocHieu: { tieuDe: 'A', theLoai: 'THO' } }).baiDocHieu.theLoai).toBe('THO');
    expect(lamSachBaiDocChon({ baiDocHieu: { tieuDe: 'A', theLoai: 'XYZ' } }).baiDocHieu.theLoai).toBeNull();
  });
});

import { duongDanTV, khoaThuocPhan, laMucTV, mucCuaCau } from '../src/components/quy-trinh/nhung';

describe('Trang đề Tiếng Việt 3 phần', () => {
  it('mỗi phần chỉ lấy câu của phần đó', () => {
    expect(khoaThuocPhan('doc/doc_hieu/3', 'docHieu')).toBe(true);
    expect(khoaThuocPhan('viet/viet/10', 'docHieu')).toBe(false);
    expect(khoaThuocPhan('viet/viet/10', 'viet')).toBe(true);
    expect(khoaThuocPhan('doc/doc_hieu/3', 'thanhTieng')).toBe(false);
    expect(khoaThuocPhan('doc/doc_hieu/3', 'hoanChinh')).toBe(true);
  });
  it('sửa câu ở Hoàn chỉnh đề thì mở đúng phần', () => {
    expect(mucCuaCau('doc/doc_hieu/3')).toBe('p1-cau-hoi');
    expect(mucCuaCau('viet/viet/10')).toBe('p3-de-bai');
    expect(mucCuaCau('doc/doc_thanh_tieng/2')).toBe('p2-cau-hoi');
    expect(duongDanTV('CUOI_HK1', 'p1-cau-hoi', 'doc/doc_hieu/3')).toBe('/de-tieng-viet?mon=TIENG_VIET&ky=CUOI_HK1&muc=p1-cau-hoi&cau=doc%2Fdoc_hieu%2F3');
    expect(laMucTV('p2-chon-bai')).toBe(true);
    expect(laMucTV('x')).toBe(false);
  });
});

import { docCauHoiDocTieng } from '../src/core/de/cau-hoi-doc-tieng';

describe('Câu hỏi đọc thành tiếng soạn ở Phần 2', () => {
  const bai = (t: string) => ({ tieuDe: t, noiDung: `${t} nội dung`, tacGia: 'TG', nguon: 'N', khoId: null });
  it('câu hỏi lưu cùng bài đọc được đưa vào đề, bài không đổi vẫn nhận câu hỏi mới', () => {
    const chon = { baiDocHieu: bai('H'), baiDocThanhTieng: [bai('A'), bai('B'), bai('C'), bai('D')] };
    const lan1 = apBaiDocChon(undefined, chon).tv;
    const coHoi = { ...chon, baiDocThanhTieng: chon.baiDocThanhTieng.map((b, i) => ({ ...b, cauHoi: `Hỏi ${i}`, traLoi: `Đáp ${i}` })) };
    const lan2 = apBaiDocChon(lan1, coHoi);
    expect(lan2.doi).toHaveLength(4);
    expect(lan2.tv.baiDocThanhTieng[2]).toMatchObject({ tieuDe: 'C', cauHoi: 'Hỏi 2', traLoi: 'Đáp 2' });
    expect(apBaiDocChon(lan2.tv, coHoi).doi).toEqual([]);
  });
  it('đọc kết quả AI, thiếu thì để trống', () => {
    expect(docCauHoiDocTieng('Đây: [{"cauHoi":"Ai?","traLoi":"Bé"}]', 2)).toEqual([{ cauHoi: 'Ai?', traLoi: 'Bé' }, { cauHoi: '', traLoi: '' }]);
    expect(docCauHoiDocTieng('không có json', 1)).toEqual([{ cauHoi: '', traLoi: '' }]);
  });
});
