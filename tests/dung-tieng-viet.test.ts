import { describe, expect, it } from 'vitest';
import {
  chuoiChuDiem,
  dungKhungTiengViet,
  kieuBaiVietTrongPhamVi,
  noiDungLuyenTuVaCau,
  phanLoaiKienThuc,
  yccdVietChoKieu,
  type TietTiengViet,
  type YccdTiengViet,
} from '@/core/matrix/dung-tieng-viet';
import { cacNhomLuaChon, danhSachCau, kiemDinhMaTranChung, kiemDinhMaTranRieng, taoMaTranRiengRong, diemBaiKiemTra, toHopLuaChon } from '@/core/matrix/matrix-template';
import { boNaoTrong } from '@/core/bo-nao/bo-nao';

let n = 0;
const tiet = (tuan: number, tietTen: string): TietTiengViet => ({ thuTu: ++n, tuan, chuDe: 'Chủ điểm', baiTen: 'Bài', tietTen });

const PPCT: TietTiengViet[] = [
  tiet(1, 'Đọc: Điều kì diệu'),
  tiet(1, 'Luyện từ và câu: Danh từ'),
  tiet(1, 'Viết: Tìm hiểu cách viết đoạn văn nêu ý kiến'),
  tiet(2, 'Luyện từ và câu: Mở rộng vốn từ về nghệ thuật'),
  tiet(2, 'Viết: Viết đoạn văn nêu ý kiến'),
  tiet(5, 'Luyện từ và câu: Biện pháp nhân hoá'),
  tiet(6, 'Viết: Tìm hiểu cách viết thư'),
  tiet(17, 'Viết: Viết thư'),
  tiet(17, 'Luyện từ và câu: Luyện tập về danh từ, động từ, tính từ'),
  tiet(17, 'Luyện từ và câu: Danh từ'),
  tiet(18, 'Ôn tập tiết 1'),
  tiet(19, 'Viết: Viết bài văn miêu tả con vật'),
];

const y = (mach: string, chuDe: string | null, noiDung: string): YccdTiengViet => ({ mach, chuDe, noiDung });
const KHO: YccdTiengViet[] = [
  y('Đọc hiểu', 'Văn bản văn học > Đọc hiểu nội dung', 'Nhận biết được chủ đề văn bản.'),
  y('Đọc hiểu', 'Văn bản văn học > Đọc hiểu nội dung', 'Nhận biết được một số chi tiết và nội dung chính của văn bản.'),
  y('Đọc hiểu', 'Văn bản văn học > Đọc hiểu nội dung', 'Tóm tắt được văn bản truyện đơn giản.'),
  y('Đọc hiểu', 'Văn bản văn học > Đọc hiểu hình thức', 'Hiểu tác dụng của biện pháp tu từ nhân hoá.'),
  y('Đọc hiểu', 'Văn bản văn học > Đọc hiểu hình thức', 'Nhận biết được đặc điểm của nhân vật.'),
  y('Đọc hiểu', 'Văn bản văn học > Liên hệ, so sánh, kết nối', 'Nêu được tình cảm, suy nghĩ của bản thân sau khi đọc văn bản.'),
  y('Đọc hiểu', 'Văn bản thông tin > Đọc hiểu nội dung', 'Nhận biết được những thông tin chính trong văn bản.'),
  y('Đọc hiểu', 'Văn bản thông tin > Đọc hiểu hình thức', 'Nhận biết được bố cục của một văn bản thông tin thông thường.'),
  y('Đọc hiểu', 'Văn bản thông tin > Liên hệ, so sánh, kết nối', 'Nhận biết được thông tin qua hình ảnh, số liệu trong văn bản.'),
  y('Đọc hiểu', 'Văn bản văn học > Đọc mở rộng', 'Thuộc lòng ít nhất 10 đoạn thơ.'),
  y('Đọc', null, 'Đọc đúng và diễn cảm các văn bản truyện, kịch, thơ, văn bản miêu tả: nhấn giọng đúng từ ngữ; thể hiện cảm xúc qua giọng đọc.'),
  y('Viết', null, 'Biết viết theo các bước: xác định nội dung viết; quan sát và tìm tư liệu để viết.'),
  y('Viết', null, 'Viết đoạn văn, bài văn thể hiện chủ đề, ý tưởng chính; có mở đầu, triển khai, kết thúc.'),
  y('Viết', null, 'Viết được báo cáo thảo luận nhóm, đơn theo mẫu, thư cho người thân, bạn bè.'),
  y('Viết', null, 'Viết được bài văn miêu tả con vật, cây cối; sử dụng nhân hoá.'),
  y('Viết', null, 'Viết được đoạn văn ngắn nêu lí do vì sao mình thích câu chuyện đã đọc hoặc đã nghe.'),
];

const dung = (tuanTu = 1, tuanDen = 18, tenKieu: string[] = ['Viết thư', 'Viết bài văn miêu tả con vật'], boNao = null as ReturnType<typeof boNaoTrong> | null) => {
  const kieu = kieuBaiVietTrongPhamVi(PPCT, 1, 19).filter((k) => tenKieu.includes(k.ten));
  return dungKhungTiengViet({
    ky: 'CUOI_HK1',
    tieuDeKy: 'CUỐI HỌC KÌ I',
    namHoc: '2026 - 2027',
    truong: { co_quan_chu_quan: 'UBND', truong: 'TH', noi_ky: 'TP' },
    thoiGianPhut: null,
    tuanTu,
    tuanDen,
    tiet: PPCT,
    yccd: KHO,
    kieuBaiViet: kieu,
    boNao,
  });
};

describe('kieuBaiVietTrongPhamVi', () => {
  it('chỉ lấy tiết viết bài hoàn chỉnh, bỏ các tiết bước đệm', () => {
    const ds = kieuBaiVietTrongPhamVi(
      [
        tiet(1, 'Viết: Tìm hiểu cách viết đoạn văn nêu ý kiến'),
        tiet(2, 'Viết: Tìm ý cho đoạn văn nêu ý kiến'),
        tiet(2, 'Viết: Lập dàn ý cho đoạn văn nêu ý kiến'),
        tiet(2, 'Viết: Viết đoạn văn nêu ý kiến'),
        tiet(14, 'Viết: Quan sát con vật'),
        tiet(15, 'Viết: Luyện viết đoạn văn miêu tả con vật.'),
        tiet(16, 'Viết: Viết bài văn miêu tả con vật.'),
      ],
      1,
      18,
    );
    expect(ds.map((k) => k.ten)).toEqual(['Viết đoạn văn nêu ý kiến', 'Viết bài văn miêu tả con vật']);
    expect(ds.map((k) => k.ma)).toEqual(['viet_1', 'viet_2']);
  });
  it('đánh dấu đã trả bài khi PPCT có tiết "Trả bài" cùng kiểu (kể cả khác chữ "bài viết", "bài văn")', () => {
    const ds = kieuBaiVietTrongPhamVi(
      [
        tiet(2, 'Viết: Viết đoạn văn nêu ý kiến'),
        tiet(3, 'Viết: Trả bài viết đoạn văn nêu ý kiến'),
        tiet(8, 'Viết: Viết bài văn kể lại một câu chuyện'),
        tiet(8, 'Viết: Trả bài văn kể lại một câu chuyện'),
        tiet(17, 'Viết: Viết thư'),
      ],
      1,
      18,
    );
    expect(ds.map((k) => [k.ten, k.daTraBai])).toEqual([
      ['Viết đoạn văn nêu ý kiến', true],
      ['Viết bài văn kể lại một câu chuyện', true],
      ['Viết thư', false],
    ]);
  });
  it('chỉ lấy tiết trong khoảng tuần', () => {
    const ds = kieuBaiVietTrongPhamVi(PPCT, 1, 18);
    expect(ds.some((k) => /miêu tả/i.test(k.ten))).toBe(false);
    expect(ds.some((k) => /thư/i.test(k.ten))).toBe(true);
  });
});

describe('noiDungLuyenTuVaCau + phanLoaiKienThuc', () => {
  it('bỏ trùng tên tiết và xếp loại', () => {
    const ds = noiDungLuyenTuVaCau(PPCT, 1, 18);
    expect(ds.filter((x) => x.ten === 'Danh từ')).toHaveLength(1);
    expect(phanLoaiKienThuc('Danh từ')).toBe('NGU_PHAP');
    expect(phanLoaiKienThuc('Mở rộng vốn từ về nghệ thuật')).toBe('TU_VUNG');
    expect(phanLoaiKienThuc('Biện pháp nhân hoá')).toBe('GIAO_TIEP');
  });
});

describe('yccdVietChoKieu', () => {
  it('thư → YCCĐ về thư + YCCĐ chung, không lẫn miêu tả', () => {
    const ds = yccdVietChoKieu('Viết thư', KHO);
    expect(ds.some((x) => /thư cho người thân/.test(x))).toBe(true);
    expect(ds.some((x) => /miêu tả/.test(x))).toBe(false);
    expect(ds.some((x) => /theo các bước/.test(x))).toBe(true);
  });
});

describe('chuoiChuDiem', () => {
  it('thêm số chủ điểm', () => {
    expect(chuoiChuDiem(['Niềm vui sáng tạo', 'Chắp cánh ước mơ'])).toBe('Chủ điểm: 3. Niềm vui sáng tạo; 4. Chắp cánh ước mơ');
  });
});

describe('dungKhungTiengViet', () => {
  it('không chọn kiểu bài viết thì báo lỗi, không dựng', () => {
    const kq = dung(1, 18, []);
    expect(kq.maTran).toBeNull();
    expect(kq.loi.join(' ')).toMatch(/kiểu bài viết/);
  });

  it('dựng được khung hợp lệ: đủ 10 điểm mỗi bài, qua kiểm định ma trận chung', () => {
    const kq = dung();
    expect(kq.maTran).not.toBeNull();
    const mt = kq.maTran!;
    expect(mt.phien_ban_mau).toBe('DUNG_TU_CHUONG_TRINH');
    expect(mt.bo_cuc).toBe('TIENG_VIET_3_PHAN');
    const kd = kiemDinhMaTranChung(mt);
    expect(kd.loi).toEqual([]);
    for (const lc of toHopLuaChon(mt)) {
      for (const b of mt.bai_kiem_tra) expect(diemBaiKiemTra(b, lc)).toBe(10);
    }
  });

  it('bài viết: mỗi kiểu đã chọn là một phương án, câu Viết 10 điểm', () => {
    const mt = dung().maTran!;
    const pa = mt.bai_kiem_tra.find((b) => b.ma === 'viet')!.phan[0].lua_chon!.phuong_an;
    expect(pa.map((x) => x.ten)).toEqual(['Viết thư', 'Viết bài văn miêu tả con vật']);
    for (const x of pa) {
      expect(x.dong[0].cau_hoi[0]).toMatchObject({ cau: 'Viết', diem: 10, dang: 'VIET' });
      expect(x.dong[0].yccd.length).toBeGreaterThan(0);
    }
  });

  it('YCCĐ Đọc hiểu lấy từ Kho, mỗi dòng có ít nhất một YCCĐ và chỉ dùng chữ có trong Kho', () => {
    const mt = dung().maTran!;
    const trongKho = new Set(KHO.map((k) => k.noiDung));
    const dh = mt.bai_kiem_tra[0].phan.find((p) => p.ma === 'doc_hieu')!;
    for (const pa of dh.lua_chon!.phuong_an) {
      for (const d of pa.dong) {
        expect(d.yccd.length).toBeGreaterThan(0);
        for (const t of d.yccd) expect(trongKho.has(t)).toBe(true);
      }
    }
  });

  it('chủ điểm và tốc độ đọc theo kì; bộ não thay được tốc độ', () => {
    const mt = dung().maTran!;
    const tt = mt.bai_kiem_tra[0].phan[0];
    expect(tt.dong[0].noi_dung).toBe('Chủ điểm: 3. Niềm vui sáng tạo; 4. Chắp cánh ước mơ');
    expect(tt.dong[0].yccd[0]).toContain('80 – 90');
    const bn = boNaoTrong();
    bn.ky.CUOI_HK1 = { ky: 'CUOI_HK1', tocDo: { min: 85, max: 95 }, doDai: {}, chuDiem: [] };
    expect(dung(1, 18, ['Viết thư'], bn).maTran!.bai_kiem_tra[0].phan[0].dong[0].yccd[0]).toContain('85 – 95');
  });

  it('Kiến thức Tiếng Việt lấy tên tiết Luyện từ và câu trong phạm vi, không lấy tiết ngoài tuần', () => {
    const dh = dung(1, 18).maTran!.bai_kiem_tra[0].phan.find((p) => p.ma === 'doc_hieu')!;
    const nguPhap = dh.dong.find((d) => d.noi_dung === 'Ngữ pháp')!;
    expect(nguPhap.yccd.some((t) => t.includes('Danh từ'))).toBe(true);
    const tatCa = dh.dong.flatMap((d) => d.yccd).join(' ');
    expect(tatCa).not.toMatch(/miêu tả con vật/);
  });

  it('Kho thiếu YCCĐ thì giữ chữ mẫu và ghi vào vấn đề cần xác nhận, không bịa', () => {
    const kq = dungKhungTiengViet({
      ky: 'CUOI_HK1', tieuDeKy: 'CUỐI HỌC KÌ I', namHoc: '2026 - 2027',
      truong: { co_quan_chu_quan: 'UBND', truong: 'TH', noi_ky: 'TP' }, thoiGianPhut: null, tuanTu: 1, tuanDen: 18,
      tiet: [], yccd: [], kieuBaiViet: [{ ma: 'viet_1', ten: 'Viết thư', tuanDau: 17, daTraBai: false }],
    });
    expect(kq.maTran).not.toBeNull();
    const vd = kq.maTran!.van_de_can_xac_nhan!.join('\n');
    expect(vd).toMatch(/Kho chương trình chưa có YCCĐ đã duyệt cho/);
    expect(vd).toMatch(/Luyện từ và câu/);
    expect(kiemDinhMaTranChung(kq.maTran!).loi).toEqual([]);
  });

  it('khung đi tiếp được vào ma trận riêng: có đủ hai nhóm lựa chọn (loại văn bản, kiểu bài viết)', () => {
    const mt = dung().maTran!;
    const mtr = taoMaTranRiengRong(mt);
    expect(mtr.ma_tran_chung_ma_mon).toBe('TIENG_VIET');
    const nhom = cacNhomLuaChon(mt);
    expect(nhom.map((n) => n.ma).sort()).toEqual(['loai_van_ban', 'the_loai']);
    expect(nhom.find((n) => n.ma === 'the_loai')!.phuong_an).toHaveLength(2);
  });

  it('đi trọn đường: chọn loại văn bản + kiểu bài viết, gắn YCCĐ từng dòng → ma trận riêng hợp lệ (mọi tổ hợp lựa chọn)', () => {
    const mt = dung().maTran!;
    for (const loai of ['VBVH', 'VBTT']) {
      for (const the of mt.bai_kiem_tra.find((b) => b.ma === 'viet')!.phan[0].lua_chon!.phuong_an.map((p) => p.ma)) {
        const mtr = { ...taoMaTranRiengRong(mt), lua_chon_da_dung: { loai_van_ban: loai, the_loai: the } };
        const cau = danhSachCau(mt, mtr.lua_chon_da_dung)
          .filter((c) => c.cau.dang !== 'VIET' && (c.phan.kieu ?? 'CAU_HOI') === 'CAU_HOI')
          .map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] }));
        expect(cau.length).toBe(11);
        const kq = kiemDinhMaTranRieng(mt, { ...mtr, cau_hoi: cau });
        expect(kq.loi).toEqual([]);
      }
    }
  });
});
