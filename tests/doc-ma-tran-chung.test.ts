/**
 * Đọc bảng ma trận chung đã tải lên thành MaTranChung.
 * Bảng mẫu dựng đúng cách bố trí ô (gộp hàng, gộp cột) của các file thật của tổ khối 4, chữ rút gọn.
 */
import { describe, expect, it } from 'vitest';
import type { KhoiVanBan, OBang } from '@/core/utils/docx-bang';
import { docMaTranChungTuBang, docOCau, moRongLuoi, tachYccd } from '@/core/kho-ma-tran/doc-ma-tran-chung';
import { danhSachCau, kiemDinhMaTranChung, toHopLuaChon, tongHopPhanCauHoi } from '@/core/matrix/matrix-template';

const o = (chu: string, cot = 1, hang = 1): OBang => ({ chu, cot, hang });
const bang = (hang: OBang[][]): KhoiVanBan => ({ loai: 'bang', hang });
const doan = (chu: string): KhoiVanBan => ({ loai: 'doan', chu });

const dauToan = [
  doan('       UBND PHƯỜNG HOÀ BÌNH'),
  doan('TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN'),
  doan('MA TRẬN KIỂM TRA ĐỊNH KỲ CUỐI HỌC KỲ I'),
  doan('NĂM HỌC 2026 – 2027'),
];
const cuoi = [
  doan('\t\tHIỆU TRƯỞNG                     Hoà Bình, ngày 25 tháng 8 năm 2026'),
  doan('            TỔ TRƯỞNG '),
  doan('\t\t\t    Võ Việt Khái'),
];

/** Toán cuối HKI: Số câu | TN | TL | Mức 1 2 3 (điểm) | Điểm */
const toanCHK1: KhoiVanBan[] = [
  ...dauToan,
  bang([
    [o('Mạch kiến thức'), o('Nội dung'), o('YÊU CẦU CẦN ĐẠT'), o('SỐ CÂU', 1, 2), o('HÌNH THỨC', 2), o('MỨC ĐỘ', 3), o('ĐIỂM', 1, 2)],
    [o(''), o(''), o('Cuối Học kì I'), o('TN'), o('TL'), o('1'), o('2'), o('3')],
    [o('SỐ VÀ PHÉP TÍNH', 1, 9), o('Số và cấu tạo thập phân của một số.', 1, 3), o('- Đọc, viết được các số có nhiều chữ số'), o('1\nCâu 1'), o('1'), o(' '), o('0,5đ'), o(' '), o(' '), o('0,5đ')],
    [o('- Nhận biết được cấu tạo thập phân của một số.'), o('1\nCâu 2'), o('1'), o(' '), o('0,5đ'), o(' '), o(' '), o('0,5đ')],
    [o('- Nhận biết được số chẵn, số lẻ.\n- Làm quen với dãy số tự nhiên.'), o('1 \nCâu 3'), o('1'), o(' '), o('0,5đ'), o(' '), o(' '), o('0,5đ')],
    [o('So sánh các số.'), o('- So sánh hai số trong phạm vi lớp triệu.'), o('1 \nCâu 4'), o('1'), o(' '), o('0,5đ'), o(' '), o(' '), o('0,5đ')],
    [o('Làm tròn số.'), o('- Làm tròn được số đến tròn trăm nghìn. \n(ví dụ: 12 345 → 12 300).'), o('1\nCâu 5'), o('1'), o(' '), o('0,5đ'), o(' '), o(' '), o('0,5đ')],
    [o('Phép cộng, phép trừ, phép nhân, phép chia'), o('- Thực hiện được phép cộng, trừ.\n- Thực hiện được phép nhân, chia.'), o('4 \nCâu 8 (a,b,c,d)'), o(' '), o('4'), o('2đ'), o(''), o(' '), o('2đ')],
    [o('Tính nhẩm/ Thuận tiện'), o('Tính nhẩm - Thuận tiện\n- Ước lượng được trong những tính toán đơn giản.'), o('1\nCâu 9 '), o(' '), o('1'), o(' '), o('1đ'), o(' '), o('1đ')],
    [o('Biểu thức số và biểu thức chữ'), o('Tính giá trị biểu thức\n- Tính được giá trị của biểu thức chứa chữ.'), o('1\nCâu 10'), o(' '), o('1'), o(' '), o('1đ'), o(' '), o('1đ')],
    [o('Thực hành giải quyết vấn đề'), o('Bài toán có lời văn\n- Giải bài toán có đến hai hoặc ba bước tính:\n+ Liên quan đến thành phần phép tính.'), o('1\n(Câu 11)'), o(' '), o('1'), o(' '), o(' '), o('1,5đ'), o('1,5đ')],
    [o('HÌNH HỌC VÀ ĐO LƯỜNG', 1, 5), o('Quan sát, nhận biết hình phẳng'), o('- Nhận biết được góc nhọn, góc tù, góc bẹt'), o('1\nCâu 6'), o('1'), o(' '), o('0,5đ'), o(''), o(''), o('0,5đ')],
    [o('Thực hành đo, vẽ'), o('- Vẽ hai đường thẳng vuông góc'), o(' '), o(' '), o(' '), o(' '), o(' '), o(' '), o(' ')],
    [o('Biểu tượng về đại lượng'), o('- Nhận biết các đơn vị đo khối lượng'), o(' '), o(' '), o(' '), o(' '), o(' '), o(' '), o(' ')],
    [o('Thực hành đo đại lượng'), o('- Sử dụng thước đo góc'), o(' '), o(' '), o(' '), o(' '), o(' '), o(' '), o(' ')],
    [o('Tính toán và ước lượng với các số đo đại lượng'), o('- Chuyển đổi và tính toán với các số đo'), o('1\nCâu 7  '), o(' '), o('1'), o(' '), o('1đ'), o(' '), o('1đ')],
    [o('HOẠT ĐỘNG THỰC HÀNH VÀ TRẢI NGHIỆM'), o('Thực hành vận dụng'), o(' Thực hành ứng dụng các kiến thức toán học vào thực tiễn'), o('Câu 12'), o(' '), o('1'), o(' '), o(' '), o('0,5đ'), o('0,5đ')],
    [o(''), o(''), o('Tổng số câu'), o('15 câu'), o('6'), o('9'), o(''), o(''), o(''), o('')],
    [o(''), o(''), o('Tổng điểm'), o(''), o('3'), o('7'), o('5'), o('3'), o('2'), o('10đ')],
  ]),
  ...cuoi,
];

describe('Lưới ô', () => {
  it('trải ô gộp hàng, gộp cột đúng vị trí', () => {
    const l = moRongLuoi([[o('A', 1, 2), o('B', 2)], [o('C'), o('D')]]);
    expect(l[1][0]?.o.chu).toBe('A');
    expect(l[1][1]?.o.chu).toBe('C');
    expect(l[1][2]?.o.chu).toBe('D');
    expect(l[0][2]?.o.chu).toBe('B');
  });
});

describe('Đọc ô câu và YCCĐ', () => {
  it('nhận số câu, ý nhỏ, dạng câu', () => {
    expect(docOCau('4 \nCâu 8 (a,b,c,d)')).toMatchObject({ cau: ['8'], yNho: ['a', 'b', 'c', 'd'], soDau: 4 });
    expect(docOCau('(Câu 8 a,b,c,d)')).toMatchObject({ cau: ['8'], yNho: ['a', 'b', 'c', 'd'] });
    expect(docOCau('2 (Câu 7) (a,b)')).toMatchObject({ cau: ['7'], yNho: ['a', 'b'] });
    expect(docOCau('1,2, 3,4').cau).toEqual(['1', '2', '3', '4']);
    expect(docOCau('1 (Câu 7) TLN')).toMatchObject({ cau: ['7'], dang: 'TLN' });
    expect(docOCau('1 (Câu 5) Đ/S').dang).toBe('DS');
    expect(docOCau(' ').cau).toEqual([]);
  });
  it('tách YCCĐ theo gạch đầu dòng, giữ nhãn và dòng "+"', () => {
    const r = tachYccd('Bài toán có lời văn\n- Giải bài toán hai bước:\n+ Liên quan đến phép tính.\n- Ước lượng.');
    expect(r.nhan).toBe('Bài toán có lời văn');
    expect(r.yccd).toEqual(['Giải bài toán hai bước:\n+ Liên quan đến phép tính.', 'Ước lượng.']);
    expect(tachYccd('* TỪ VỰNG:\n- Vốn từ theo chủ điểm').nhan).toBe('TỪ VỰNG');
  });
});

describe('Toán (điểm ghi ở cột mức)', () => {
  const kq = docMaTranChungTuBang(toanCHK1, { maMon: 'TOAN', tenMon: 'Toán', ky: 'CUOI_HK1', phienBan: 2 });
  const mtc = kq.mtc!;

  it('đúng tổng số câu, điểm theo hình thức và mức như hàng Tổng của file', () => {
    expect(kq.loi).toBeUndefined();
    const th = tongHopPhanCauHoi(mtc);
    expect(th.tongDiem).toBe(10);
    expect(th.soCau).toBe(15);
    expect(th.soCauTN).toBe(6);
    expect(th.soCauTL).toBe(9);
    expect(th.diemTN).toBe(3);
    expect(th.diemTL).toBe(7);
    expect(th.diemTheoMuc).toEqual({ 1: 5, 2: 3, 3: 2 });
    expect(kiemDinhMaTranChung(mtc).hopLe).toBe(true);
  });

  it('giữ mạch, nội dung, ý nhỏ, nhãn và dòng chưa gắn câu', () => {
    const c8 = danhSachCau(mtc).find((c) => c.cau.cau === '8')!;
    expect(c8.cau).toMatchObject({ y_nho: ['a', 'b', 'c', 'd'], so_cau_tinh: 4, muc: 1, hinh_thuc: 'TL', diem: 2 });
    expect(c8.dong.mach).toBe('SỐ VÀ PHÉP TÍNH');
    const c11 = danhSachCau(mtc).find((c) => c.cau.cau === '11')!;
    expect(c11.dong.nhan).toBe('Bài toán có lời văn');
    expect(c11.cau.muc).toBe(3);
    const dong = mtc.bai_kiem_tra[0].phan[0].dong;
    expect(dong.filter((d) => d.cau_hoi.length === 0)).toHaveLength(3);
    expect(dong[0].noi_dung).toBe('Số và cấu tạo thập phân của một số.');
  });

  it('lấy thông tin chung từ file', () => {
    expect(mtc).toMatchObject({
      phien_ban_mau: 'kho-2',
      ky_kiem_tra: 'CUOI_HK1',
      nam_hoc: '2026 - 2027',
      bo_cuc: 'TOAN_HINH_THUC_MUC',
      ngay_ky: 'ngày 25 tháng 8 năm 2026',
      truong: { truong: 'TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN', noi_ky: 'Hoà Bình' },
    });
    expect(mtc.chu_ky).toEqual([{ chuc_vu: 'HIỆU TRƯỞNG', ho_ten: '' }, { chuc_vu: 'TỔ TRƯỞNG', ho_ten: 'Võ Việt Khái' }]);
    expect(mtc.ti_le_muc_quy_dinh).toEqual({ 1: 50, 2: 30, 3: 20 });
  });

  it('báo khi cột số câu ghi khác số câu tính được', () => {
    const sai = structuredClone(toanCHK1);
    const b = sai.find((k) => k.loai === 'bang') as Extract<KhoiVanBan, { loai: 'bang' }>;
    b.hang[15][2] = o('2 Câu 7');
    const kq2 = docMaTranChungTuBang(sai, { maMon: 'TOAN', tenMon: 'Toán', ky: 'CUOI_HK1', phienBan: 1 });
    expect(kq2.canhBao.some((c) => c.includes('Câu 7') && c.includes('ghi 2'))).toBe(true);
    expect(kq2.mtc!.van_de_can_xac_nhan?.length).toBeGreaterThan(0);
  });
});

describe('Toán cuối năm: ô bị tách nhiều hàng', () => {
  // Cột: Mạch{c2} gồm Mạch + Nội dung | YCCĐ | Số câu | TN | TL | M1 | M2 | M3 | Điểm
  const khoi: KhoiVanBan[] = [
    doan('MA TRẬN KIỂM TRA ĐỊNH KỲ CUỐI NĂM'),
    bang([
      [o('MẠCH KIẾN THỨC', 2, 2), o('YÊU CẦU CẦN ĐẠT', 1, 2), o('SỐ CÂU', 1, 2), o('HÌNH THỨC', 2), o('MỨC ĐỘ', 3), o('ĐIỂM', 1, 2)],
      [o('TN'), o('TL'), o('1'), o('2'), o('3')],
      // Câu 1: số câu tách 3 hàng, các cột khác gộp 3 hàng
      [o('PHÂN SỐ', 1, 9), o('Khái niệm phân số', 1, 3), o('- Nhận biết được phân số', 1, 3), o('1'), o('1', 1, 3), o(' ', 1, 3), o('0,5đ', 1, 3), o(' ', 1, 3), o(' ', 1, 3), o('0,5đ', 1, 3)],
      [o('(Câu 1)')],
      [o(' ')],
      // Câu 8: một ô điểm gộp 3 hàng, YCCĐ mỗi hàng một ô
      [o('Các phép tính với phân số', 1, 3), o('Phép cộng, phép trừ phân số'), o('4'), o(' ', 1, 3), o('4', 1, 3), o('2đ', 1, 3), o(' ', 1, 3), o(' ', 1, 3), o('2đ', 1, 3)],
      [o('- Cộng, trừ hai phân số'), o('(Câu 8 a,b,c,d)')],
      [o('- Nhân, chia hai phân số'), o(' ')],
      // Câu 12: ô điểm chỉ một hàng, "(Câu 12)" nằm ở hàng dưới
      [o('Thực hành vận dụng', 1, 3), o('- Thực hành ứng dụng vào thực tiễn', 1, 3), o(' '), o(' ', 1, 3), o(' '), o(' ', 1, 3), o(' ', 1, 3), o(' '), o(' ')],
      [o('1'), o('1'), o('0,5đ'), o('0,5')],
      [o('(Câu 12)'), o(' '), o(' '), o(' ')],
      [o(' '), o(' '), o('Tổng số câu'), o('6 câu'), o('1'), o('5'), o('1'), o('4'), o('1'), o('')],
    ]),
  ];

  it('gom đúng câu dù ô bị tách', () => {
    const kq = docMaTranChungTuBang(khoi, { maMon: 'TOAN', tenMon: 'Toán', ky: 'CUOI_NAM', phienBan: 1 });
    const ds = danhSachCau(kq.mtc!).map((c) => [c.cau.cau, c.cau.muc, c.cau.hinh_thuc, c.cau.diem, c.cau.so_cau_tinh]);
    expect(ds).toEqual(expect.arrayContaining([['1', 1, 'TN', 0.5, 1], ['8', 1, 'TL', 2, 4], ['12', 3, 'TL', 0.5, 1]]));
    expect(ds).toHaveLength(3);
    const d8 = danhSachCau(kq.mtc!).find((c) => c.cau.cau === '8')!.dong;
    expect(d8.yccd).toEqual(['Cộng, trừ hai phân số', 'Nhân, chia hai phân số']);
    expect(d8.noi_dung).toBe('Các phép tính với phân số');
  });
});

describe('Khoa học, LS&ĐL (cặp TN/TL theo mức)', () => {
  // Hàng tiêu đề thứ hai lệch cột so với hàng trên (đúng như file Word của tổ)
  const khoaHoc: KhoiVanBan[] = [
    doan('MA TRẬN CHUNG KIỂM TRA ĐỊNH KỲ CUỐI HỌC KỲ I'),
    doan('Thời gian làm bài: 35 phút'),
    bang([
      [o('MẠCH KIẾN THỨC', 1, 2), o('YÊU CẦU CẦN ĐẠT', 1, 2), o('SỐ CÂU VÀ SỐ ĐIỂM', 1, 2), o('Mức 1 (50%)', 3), o('Mức 2 (30%)', 2), o('Mức 3 (20%)', 2), o('Tổng điểm 10 điểm', 2)],
      [o('TN'), o('TL/TH'), o('TN', 2), o('TL/TH'), o('TN'), o('TL/TH'), o('TN'), o('TL/TH')],
      [o('Bài 1. Nước'), o('- Nêu được tính chất của nước.'), o('1 Câu\n1 Điểm'), o('1\n(Câu 1)'), o(''), o('', 2), o(''), o(''), o(''), o('1'), o('')],
      [o('Bài 4. Không khí'), o('- Kể được thành phần không khí.'), o('2 Câu\n2 Điểm'), o('1\n(Câu 3)'), o(''), o('1\n(Câu 6)', 2), o(''), o(''), o(''), o('2'), o('')],
      [o('Bài 6. Ô nhiễm không khí'), o('- Giải thích nguyên nhân ô nhiễm.'), o('1 Câu\n1 Điểm'), o(' '), o(''), o('', 2), o('1\n(Câu 7)'), o(''), o(''), o(''), o('1')],
      [o('Bài 9. Ánh sáng'), o('- Nêu vai trò của ánh sáng.'), o('1 Câu\n1 Điểm'), o(''), o(''), o('', 2), o(''), o(''), o('1\n(Câu 9)'), o(''), o('1')],
      [o('TỔNG', 1, 2), o('SỐ CÂU'), o('5'), o('2'), o('0'), o('1', 2), o('1'), o('0'), o('1'), o('3'), o('2')],
      [o('SỐ ĐIỂM'), o('5'), o('2'), o('0'), o('1', 2), o('1'), o('0'), o('1'), o('3'), o('2')],
    ]),
  ];

  it('xếp câu đúng mức, đúng TN/TL theo hàng tiêu đề thứ hai', () => {
    const kq = docMaTranChungTuBang(khoaHoc, { maMon: 'KHOA_HOC', tenMon: 'Khoa học', ky: 'CUOI_HK1', phienBan: 1 });
    const ds = danhSachCau(kq.mtc!).map((c) => [c.cau.cau, c.cau.muc, c.cau.hinh_thuc, c.cau.diem]);
    expect(ds).toEqual([['1', 1, 'TN', 1], ['3', 1, 'TN', 1], ['6', 2, 'TN', 1], ['7', 2, 'TL', 1], ['9', 3, 'TL', 1]]);
    expect(kq.mtc!.bo_cuc).toBe('BAI_MUC_TN_TL');
    expect(kq.mtc!.thoi_gian_phut).toBe(35);
    expect(kq.mtc!.bai_kiem_tra[0].phan[0].dong[0]).toMatchObject({ mach: 'Bài 1. Nước', noi_dung: null, yccd: ['Nêu được tính chất của nước.'] });
    // Đầu cột ghi 50 – 30 – 20 nhưng 5 câu này là 2 – 2 – 1 điểm
    expect(kq.canhBao.some((c) => c.includes('tỉ lệ 50%'))).toBe(true);
  });

  it('LS&ĐL: dạng câu NLC/TLN và câu 2 điểm', () => {
    const khoi: KhoiVanBan[] = [
      bang([
        [o('MẠCH KIẾN THỨC', 1, 2), o('YÊU CẦU CẦN ĐẠT', 1, 2), o('SỐ CÂU VÀ SỐ ĐIỂM', 1, 2), o('Mức 1 (40%)', 2), o('Mức 2 (30%)', 2), o('Mức 3 (30%)', 3), o('Tổng điểm 10 điểm', 4)],
        [o('TN'), o('TL/TH'), o('TN'), o('TL/TH', 2), o('TN'), o('TL/TH', 2), o('TN'), o('TL/TH', 3)],
        [o('Bài 3. Văn hóa địa phương'), o('- Mô tả nét văn hóa.'), o('1 Câu 1 Điểm'), o(''), o(''), o('1 (Câu 7) TLN'), o('', 2), o(''), o('', 2), o('1', 2), o('', 3)],
        [o('Bài 4. Trung du'), o('- Xác định vị trí.'), o('1 Câu 1 Điểm'), o('1 (Câu 1) NLC'), o(''), o(''), o('', 2), o(''), o('', 2), o('1', 2), o('', 3)],
        [o('Bài 12. Thăng Long'), o('- Xác định vị trí Thăng Long.'), o('1 Câu 2 Điểm'), o(''), o(''), o(''), o('', 2), o(''), o('1 (Câu 9)', 2), o('', 2), o('2', 3)],
        [o('TỔNG', 1, 2), o('SỐ CÂU'), o('3'), o('1'), o('0'), o('1'), o('0', 2), o('0'), o('1', 2), o('2', 2), o('1', 3)],
      ]),
    ];
    const kq = docMaTranChungTuBang(khoi, { maMon: 'LS_DL', tenMon: 'Lịch sử và Địa lí', ky: 'CUOI_HK1', phienBan: 1 });
    const ds = danhSachCau(kq.mtc!).map((c) => [c.cau.cau, c.cau.muc, c.cau.hinh_thuc, c.cau.dang, c.cau.diem]);
    expect(ds).toEqual([['7', 2, 'TN', 'TLN', 1], ['1', 1, 'TN', 'NLC', 1], ['9', 3, 'TL', null, 2]]);
  });
});

describe('Tiếng Việt (3 bảng)', () => {
  const khoi: KhoiVanBan[] = [
    bang([[o('ỦY BAN NHÂN DÂN PHƯỜNG HÒA BÌNH\nTRƯỜNG TIỂU HỌC TRẦN VĂN ƠN'), o('')]]),
    doan('MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ CUỐI HỌC KỲ I'),
    doan('NĂM HỌC 2026-2027'),
    bang([
      [o('Mạch kiến thức'), o('Nội dung'), o('YÊU CẦU CẦN ĐẠT'), o('Điểm')],
      [o('Phần 1:\nĐọc thành tiếng\n(2 điểm)', 1, 3), o('*Chủ điểm:\n 3. Niềm vui sáng tạo\n\n 4. Chắp cánh ước mơ', 1, 3), o('Tốc độ đọc: \nKhoảng 80- 90 tiếng/phút/HS.'), o('\n........./ 0,5 đ')],
      [o('Nghỉ hơi, ngắt nhịp: Nghỉ hơi ở chỗ có dấu câu.'), o('\n........./ 0,5 đ')],
      [o('Trả lời câu hỏi:\n 01 câu hỏi đọc hiểu'), o('\n........./ 1 đ')],
      [o('Tổng:', 3), o('\n........./ 2 đ')],
    ]),
    bang([
      [o('Mạch kiến thức'), o('Nội dung', 2), o('YÊU CẦU CẦN ĐẠT'), o('Câu số'), o('TN'), o('TL'), o('Mức 1'), o('Mức 2'), o('Mức 3'), o('Tổng')],
      [o('Phần 2: Đọc hiểu (8 điểm)', 1, 12), o('Đọc hiểu Văn bản (5 điểm)', 1, 8), o('Đọc hiểu nội dung (VBVH)', 1, 2), o('- Nhận biết chi tiết.'), o('1,2, 3,4'), o('4'), o(''), o('2đ'), o(''), o(''), o('2đ')],
      [o('- Tóm tắt văn bản.'), o('5'), o(''), o('1'), o(''), o('1đ'), o(''), o('1đ')],
      [o('Đọc hiểu hình thức (VBVH)'), o('- Nhận biết đặc điểm nhân vật.'), o('6'), o(''), o('1'), o(''), o('1đ'), o(''), o('1đ')],
      [o('Liên hệ, so sánh, kết nối (VBVH)'), o('- Nêu tình cảm, suy nghĩ.'), o('7'), o(''), o('1'), o(''), o(''), o('1đ'), o('1đ')],
      [o('Đọc hiểu nội dung (VBTT)'), o('- Nhận biết thông tin chính.'), o('1,2,3,4'), o('4'), o(''), o('2đ'), o(''), o(''), o('2đ')],
      [o('Đọc hiểu hình thức (VBTT)'), o('- Nhận biết bố cục.'), o('5'), o(''), o('1'), o(''), o('1đ'), o(''), o('1đ')],
      [o('Liên hệ, so sánh, kết nối (VBTT)', 1, 2), o('- Nêu một vấn đề có ý nghĩa.'), o('6,'), o(''), o('1'), o(''), o(''), o('1đ'), o('1đ')],
      [o('- Nhận biết được thông tin.'), o('7'), o(''), o('1'), o(''), o('1đ'), o(''), o('1đ')],
      [o('Kiến thức Tiếng Việt (3điểm)', 1, 4), o('*Chủ điểm:\n* Mỗi người một vẻ\n* Trải nghiệm & khám phá', 1, 4), o('* TỪ VỰNG:\n- Vốn từ theo chủ điểm', 1, 2), o('8'), o('1'), o(''), o('0.5đ'), o(''), o(''), o('0.5đ')],
      [o('9'), o('1'), o(''), o('0.5đ'), o(''), o(''), o('0.5đ')],
      [o('*NGỮ PHÁP: - Tính từ: nhận diện'), o(' 10'), o(''), o('1'), o(''), o('1đ'), o(''), o('1đ')],
      [o('*HOẠT ĐỘNG GIAO TIẾP: - Biện pháp nhân hóa'), o(' 11'), o(''), o('1'), o(''), o(''), o('1đ'), o('1đ')],
      [o(' Tổng:', 4), o(' 11 câu'), o('6 câu'), o('5 câu'), o('3đ'), o('3đ'), o('2đ'), o('8đ')],
    ]),
    doan('* Độ đài văn bản:'),
    doan('+ Truyện: 280 - 300 chữ.'),
    doan('Văn bản thông tin: : 150 – 160 chữ'),
    bang([
      [o('Mạch kiến thức'), o('Chủ điểm'), o('Thể loại'), o('Yêu cầu cần đạt'), o('Điểm')],
      [
        o('Phần 3:\nViết văn bản\n(10 điểm)'),
        o('* Mỗi người một vẻ\n\n* Trải nghiệm & khám phá'),
        o('– Viết đoạn văn tưởng tượng dựa vào một câu chuyện đã đọc, đã nghe.\n- Viết  bài văn miêu tả con vật.'),
        o('1. Đối với đoạn văn tưởng tượng.\n- Phát triển thêm chi tiết.\n- Có mở đoạn, kết đoạn.\n2. Viết bài văn miêu tả con vật:\n- Có đủ ba phần.\n- Tả hình dáng, hoạt động.'),
        o('10'),
      ],
    ]),
    bang([[o('HIỆU TRƯỞNG'), o(''), o('Hòa Bình, ngày 25  tháng 8 năm 2026\nTỔ TRƯỞNG\n\n\n\nVõ Việt Khái')]]),
  ];
  const kq = docMaTranChungTuBang(khoi, { maMon: 'TIENG_VIET', tenMon: 'Tiếng Việt', ky: 'CUOI_HK1', phienBan: 1 });
  const mtc = kq.mtc!;

  it('dựng bài Đọc (đọc thành tiếng + đọc hiểu VBVH/VBTT) và bài Viết', () => {
    expect(kq.loi).toBeUndefined();
    expect(mtc.bo_cuc).toBe('TIENG_VIET_3_PHAN');
    const [doc, viet] = mtc.bai_kiem_tra;
    expect(doc.tong_diem).toBe(10);
    expect(doc.phan[0]).toMatchObject({ ma: 'doc_thanh_tieng', kieu: 'TIEU_CHI', tong_diem: 2, ten: 'Phần 1: Đọc thành tiếng' });
    expect(doc.phan[0].dong[0].noi_dung).toBe('Chủ điểm: 3. Niềm vui sáng tạo; 4. Chắp cánh ước mơ');
    const dh = doc.phan[1];
    expect(dh.lua_chon?.phuong_an.map((p) => p.ma)).toEqual(['VBVH', 'VBTT']);
    expect(dh.tong_diem).toBe(8);
    expect(viet.phan[0].lua_chon?.phuong_an.map((p) => p.ma)).toEqual(['TUONG_TUONG_DUA_VAO', 'MIEU_TA_CON_VAT']);
    expect(viet.phan[0].lua_chon?.phuong_an[1].dong[0].yccd).toEqual(['Có đủ ba phần.', 'Tả hình dáng, hoạt động.']);
  });

  it('mỗi tổ hợp lựa chọn đủ 11 câu đọc hiểu, đúng điểm theo mức', () => {
    expect(toHopLuaChon(mtc)).toHaveLength(4);
    for (const lc of toHopLuaChon(mtc)) {
      const cau = danhSachCau(mtc, lc).filter((c) => c.phan.ma === 'doc_hieu');
      expect(cau).toHaveLength(11);
    }
    expect(mtc.ti_le_muc_quy_dinh_doc_hieu).toMatchObject({ 1: 3, 2: 3, 3: 2 });
    expect(kiemDinhMaTranChung(mtc).hopLe).toBe(true);
  });

  it('kiến thức Tiếng Việt: nội dung theo nhãn, giữ chủ điểm, câu 8–9 chung một dòng', () => {
    const tv = mtc.bai_kiem_tra[0].phan[1].dong;
    expect(tv[0]).toMatchObject({ noi_dung: 'Từ vựng', chu_diem: 'Mỗi người một vẻ; Trải nghiệm & khám phá', nhom: 'Kiến thức Tiếng Việt (3 điểm)' });
    expect(tv[0].cau_hoi.map((c) => c.cau)).toEqual(['8', '9']);
    expect(tv[1].noi_dung).toBe('Ngữ pháp');
    expect(mtc.do_dai_van_ban).toEqual({ Truyện: '280 – 300 chữ', 'Văn bản thông tin': '150 – 160 chữ' });
  });
});

describe('Bảng không đúng kiểu', () => {
  it('trả lỗi rõ ràng, không dựng bừa', () => {
    const kq = docMaTranChungTuBang([bang([[o('A'), o('B')]])], { maMon: 'TOAN', tenMon: 'Toán', ky: 'CUOI_HK1', phienBan: 1 });
    expect(kq.mtc).toBeNull();
    expect(kq.loi).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Bảng thật (rút gọn chữ) của tổ khối 4
// ---------------------------------------------------------------------------
import thatRutGon from './fixtures/ma-tran-chung-rut-gon.json';

type ORutGon = string | [string, number, number];
function moRutGon(ds: unknown[]): KhoiVanBan[] {
  return ds.map((k) => {
    const a = k as unknown[];
    if (a.length === 1 && typeof a[0] === 'string') return doan(a[0]);
    return bang((a as ORutGon[][]).map((h) => h.map((c) => (typeof c === 'string' ? o(c) : o(c[0], c[1], c[2])))));
  });
}

describe('Bảng thật của tổ (rút gọn chữ)', () => {
  const doc = (ma: string, tenMon: string, ky: 'CUOI_HK1' | 'CUOI_NAM') =>
    docMaTranChungTuBang(moRutGon((thatRutGon as unknown as Record<string, unknown[]>)[ma]), { maMon: ma.split('/')[0], tenMon, ky, phienBan: 1 });

  it('Toán cuối năm: 16 câu, TN 6 / TL 10, điểm 3 / 7, mức 5 – 3 – 2 như hàng Tổng', () => {
    const kq = doc('TOAN/CUOI_NAM', 'Toán', 'CUOI_NAM');
    const th = tongHopPhanCauHoi(kq.mtc!);
    expect({ tong: th.tongDiem, soCau: th.soCau, tn: th.soCauTN, tl: th.soCauTL, dTN: th.diemTN, dTL: th.diemTL, muc: th.diemTheoMuc })
      .toEqual({ tong: 10, soCau: 16, tn: 6, tl: 10, dTN: 3, dTL: 7, muc: { 1: 5, 2: 3, 3: 2 } });
    expect(danhSachCau(kq.mtc!).map((c) => c.cau.cau).sort((a, b) => +a - +b)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
    expect(kiemDinhMaTranChung(kq.mtc!).hopLe).toBe(true);
  });

  it('LS&ĐL cuối HKI: 9 câu, mức 4 – 3 – 3, báo tỉ lệ đầu cột ghi lệch', () => {
    const kq = doc('LS_DL/CUOI_HK1', 'Lịch sử và Địa lí', 'CUOI_HK1');
    const th = tongHopPhanCauHoi(kq.mtc!);
    expect({ tong: th.tongDiem, soCau: th.soCau, tn: th.soCauTN, muc: th.diemTheoMuc }).toEqual({ tong: 10, soCau: 9, tn: 7, muc: { 1: 4, 2: 3, 3: 3 } });
    expect(kq.canhBao.some((c) => c.includes('50% – 30% – 20%'))).toBe(true);
    expect(kq.mtc!.chu_ky[0].chuc_vu).toBe('Ban Giám hiệu duyệt');
  });

  it('Công nghệ cuối năm: một bài hai hàng vẫn đúng 1 điểm mỗi câu', () => {
    const kq = doc('CONG_NGHE/CUOI_NAM', 'Công nghệ', 'CUOI_NAM');
    const th = tongHopPhanCauHoi(kq.mtc!);
    expect({ tong: th.tongDiem, soCau: th.soCau, tn: th.soCauTN, tl: th.soCauTL, muc: th.diemTheoMuc }).toEqual({ tong: 10, soCau: 10, tn: 5, tl: 5, muc: { 1: 5, 2: 3, 3: 2 } });
    expect(kq.canhBao).toEqual([]);
  });
});

describe('Đối chiếu hàng Tổng', () => {
  it('báo khi hàng Tổng ghi số câu khác ma trận', () => {
    const du = structuredClone((thatRutGon as unknown as Record<string, unknown[]>)['LS_DL/CUOI_HK1']);
    const kq = docMaTranChungTuBang(moRutGon(du), { maMon: 'LS_DL', tenMon: 'Lịch sử và Địa lí', ky: 'CUOI_HK1', phienBan: 1 });
    // File thật ghi "SỐ CÂU 10" nhưng chỉ có 9 câu (Câu 9 là 2 điểm)
    expect(kq.canhBao.some((c) => c.includes('ghi 10 câu') && c.includes('9 câu'))).toBe(true);
  });
  it('không báo khi khớp (Toán cuối năm 16 câu)', () => {
    const kq = docMaTranChungTuBang(moRutGon((thatRutGon as unknown as Record<string, unknown[]>)['TOAN/CUOI_NAM']), { maMon: 'TOAN', tenMon: 'Toán', ky: 'CUOI_NAM', phienBan: 1 });
    expect(kq.canhBao.filter((c) => c.includes('Hàng Tổng'))).toEqual([]);
  });
});
