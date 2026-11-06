import { describe, expect, it } from 'vitest';
import {
  chiaCauTheoBai,
  chiaTheoTrongSo,
  docGanYccd,
  docGanYccdTheoBai,
  type NhomNguon,
  donViTheoMuc,
  dungMaTranTuChuongTrinh,
  nhomBaiTrongPhamVi,
  type DongNguon,
  type ThamSoDung,
} from '@/core/matrix/dung-tu-chuong-trinh';
import { danhSachCau, kiemDinhMaTranChung, kiemDinhMaTranRieng, taoMaTranRiengRong, tongHopPhanCauHoi } from '@/core/matrix/matrix-template';
import type { MaTranRieng } from '@/types/matrix-template';

const dong = (mach: string, soTiet: number, soYccd = 2): DongNguon => ({
  mach,
  noiDung: null,
  soTiet,
  yccd: Array.from({ length: soYccd }, (_, i) => `${mach} - YCCĐ ${i + 1}`),
});

const tham = (over: Partial<ThamSoDung> = {}): ThamSoDung => ({
  maMon: 'TOAN',
  tenMon: 'Toán',
  lop: 'Lớp 4',
  nam_hoc: '2026 - 2027',
  ky: 'CUOI_HK1',
  tieuDeKy: 'CUỐI HỌC KÌ I',
  thoiGianPhut: 40,
  truong: { co_quan_chu_quan: 'UBND', truong: 'TH', noi_ky: 'TP' },
  soCau: 10,
  tiLeMuc: { m1: 50, m2: 30, m3: 20 },
  dong: [dong('Chủ đề 1', 14), dong('Chủ đề 2', 7), dong('Chủ đề 3', 21), dong('Chủ đề 4', 28)],
  ...over,
});

describe('chiaTheoTrongSo', () => {
  it('luôn cộng đủ tổng', () => {
    for (const [w, t] of [[[1, 1, 1], 10], [[14, 7, 21, 28], 10], [[3, 0, 5], 7], [[0, 0], 5]] as [number[], number][]) {
      expect(chiaTheoTrongSo(w, t).reduce((a, b) => a + b, 0)).toBe(t);
    }
  });
  it('chia theo tỉ lệ', () => {
    expect(chiaTheoTrongSo([14, 7, 21, 28], 10)).toEqual([2, 1, 3, 4]);
  });
});

describe('donViTheoMuc', () => {
  it('50-30-20 → 10-6-4 đơn vị nửa điểm', () => expect(donViTheoMuc({ m1: 50, m2: 30, m3: 20 })).toEqual([10, 6, 4]));
  it('từ chối tỉ lệ không đủ 100% hoặc lẻ 5%', () => {
    expect(donViTheoMuc({ m1: 50, m2: 30, m3: 30 })).toBeNull();
    expect(donViTheoMuc({ m1: 33, m2: 33, m3: 34 })).toBeNull();
  });
});

describe('nhomBaiTrongPhamVi', () => {
  const tiet = [
    { thuTu: 1, tuan: 1, chuDe: 'Chủ đề 1:Ôn tập', baiTen: 'Bài 1' },
    { thuTu: 2, tuan: 1, chuDe: 'Chủ đề 1:Ôn tập', baiTen: 'Bài 1' },
    { thuTu: 3, tuan: 2, chuDe: 'Chủ đề 1:Ôn tập', baiTen: 'Bài 2' },
    { thuTu: 4, tuan: 3, chuDe: 'Chủ đề 2: Góc', baiTen: 'Bài 3' },
    { thuTu: 5, tuan: 9, chuDe: 'Chủ đề 3: Số', baiTen: 'Bài 4' },
    { thuTu: 6, tuan: null, chuDe: 'Chủ đề 3: Số', baiTen: 'Bài 4' },
  ];
  it('chỉ lấy tiết trong phạm vi tuần, gom theo chủ đề, đếm tiết', () => {
    const r = nhomBaiTrongPhamVi(tiet, 1, 3);
    expect(r.map((n) => [n.chuDe, n.soTiet, n.bai.length])).toEqual([['Chủ đề 1: Ôn tập', 3, 2], ['Chủ đề 2: Góc', 1, 1]]);
  });
});

describe('docGanYccd', () => {
  const ok = new Set(['a', 'b', 'c']);
  it('chỉ giữ id có thật, bỏ trùng', () => expect(docGanYccd('```json\n["a","x","a","c"]\n```', ok)).toEqual(['a', 'c']));
  it('sai dạng thì null', () => expect(docGanYccd('không có mảng', ok)).toBeNull());
});

describe('dungMaTranTuChuongTrinh', () => {
  it('dựng khung hợp lệ: đủ 10 điểm, đúng tỉ lệ mức, qua kiểm định ma trận chung', () => {
    const kq = dungMaTranTuChuongTrinh(tham());
    expect(kq.loi).toEqual([]);
    const mtc = kq.maTran!;
    const kd = kiemDinhMaTranChung(mtc);
    expect(kd.loi).toEqual([]);
    const th = tongHopPhanCauHoi(mtc);
    expect(th.tongDiem).toBe(10);
    expect(th.diemTheoMuc[1]).toBe(5);
    expect(th.diemTheoMuc[2]).toBe(3);
    expect(th.diemTheoMuc[3]).toBe(2);
    expect(danhSachCau(mtc).length).toBe(10);
  });

  it('số câu mỗi chủ đề tỉ lệ số tiết', () => {
    const mtc = dungMaTranTuChuongTrinh(tham()).maTran!;
    const soCau = mtc.bai_kiem_tra[0].phan[0].dong.map((d) => d.cau_hoi.length);
    expect(soCau).toEqual([2, 1, 3, 4]);
  });

  it('không cố định 50-30-20: tỉ lệ khác vẫn đúng', () => {
    const kq = dungMaTranTuChuongTrinh(tham({ tiLeMuc: { m1: 40, m2: 40, m3: 20 }, soCau: 12 }));
    expect(kq.loi).toEqual([]);
    const th = tongHopPhanCauHoi(kq.maTran!);
    expect([th.diemTheoMuc[1], th.diemTheoMuc[2], th.diemTheoMuc[3]]).toEqual([4, 4, 2]);
    expect(kiemDinhMaTranChung(kq.maTran!).loi).toEqual([]);
  });

  it('mọi điểm là bội số của 0,5 với nhiều cấu hình', () => {
    for (const soCau of [3, 5, 8, 10, 14, 20]) {
      for (const tl of [{ m1: 50, m2: 30, m3: 20 }, { m1: 60, m2: 30, m3: 10 }, { m1: 30, m2: 40, m3: 30 }, { m1: 100, m2: 0, m3: 0 }]) {
        const kq = dungMaTranTuChuongTrinh(tham({ soCau, tiLeMuc: tl }));
        if (!kq.maTran) continue;
        expect(kiemDinhMaTranChung(kq.maTran).loi, `soCau=${soCau} tl=${JSON.stringify(tl)}`).toEqual([]);
        expect(tongHopPhanCauHoi(kq.maTran).tongDiem).toBe(10);
      }
    }
  });

  it('dòng chưa có YCCĐ không được gắn câu và có cảnh báo', () => {
    const kq = dungMaTranTuChuongTrinh(tham({ dong: [dong('A', 10), { ...dong('B', 10), yccd: [] }, dong('C', 10)] }));
    expect(kq.maTran).not.toBeNull();
    expect(kq.canhBao.some((c) => c.includes('"B"'))).toBe(true);
    expect(kq.maTran!.bai_kiem_tra[0].phan[0].dong.some((d) => d.mach === 'B')).toBe(false);
    expect(kiemDinhMaTranChung(kq.maTran!).loi).toEqual([]);
  });

  it('từ chối khi không có dòng nào có YCCĐ, tỉ lệ sai hoặc số câu ngoài khoảng', () => {
    expect(dungMaTranTuChuongTrinh(tham({ dong: [{ ...dong('A', 5), yccd: [] }] })).maTran).toBeNull();
    expect(dungMaTranTuChuongTrinh(tham({ tiLeMuc: { m1: 50, m2: 30, m3: 30 } })).maTran).toBeNull();
    expect(dungMaTranTuChuongTrinh(tham({ soCau: 21 })).maTran).toBeNull();
    expect(dungMaTranTuChuongTrinh(tham({ soCau: 2 })).maTran).toBeNull();
  });

  it('khung dựng đi tiếp được qua ma trận riêng nguồn Chương trình', () => {
    const mtc = dungMaTranTuChuongTrinh(tham()).maTran!;
    const rong = taoMaTranRiengRong(mtc);
    const cau = danhSachCau(mtc, rong.lua_chon_da_dung);
    const mtr: MaTranRieng = { ...rong, nguon_yccd: 'CHUONG_TRINH', cau_hoi: cau.map((c) => ({ khoa: c.khoa, yccd: c.dong.yccd[0] })) };
    const tatCa = mtc.bai_kiem_tra[0].phan[0].dong.flatMap((d) => d.yccd);
    expect(kiemDinhMaTranRieng(mtc, mtr, tatCa).loi).toEqual([]);
  });
});

describe('ghép theo từng bài', () => {
  const y = (n: number) => Array.from({ length: n }, (_, i) => `YCCĐ ${i + 1}`);
  const nhom: NhomNguon[] = [
    { chuDe: 'Chủ đề 1', bai: [{ ten: 'Bài 1: A', soTiet: 2, yccd: y(1) }, { ten: 'Bài 2: B', soTiet: 3, yccd: y(2) }, { ten: 'Bài 3: C', soTiet: 2, yccd: y(1) }] },
    { chuDe: 'Chủ đề 2', bai: [{ ten: 'Bài 4: D', soTiet: 4, yccd: y(2) }, { ten: 'Bài 5: E', soTiet: 3, yccd: [] }] },
    { chuDe: 'Chủ đề 3', bai: [{ ten: 'Bài 6: G', soTiet: 3, yccd: y(1) }, { ten: 'Bài 7: H', soTiet: 5, yccd: y(3) }] },
  ];

  it('mỗi dòng là một bài, mang tên bài, tổng câu đúng, bài thiếu YCCĐ không nhận câu', () => {
    const r = chiaCauTheoBai(nhom, 4);
    expect(r.dong.reduce((s, d) => s + (d.soCauGan ?? 0), 0)).toBe(4);
    expect(r.dong.every((d) => d.noiDung?.startsWith('Bài'))).toBe(true);
    expect(r.dong.some((d) => d.noiDung === 'Bài 5: E')).toBe(false);
    expect(r.baiThieuYccd).toEqual(['Bài 5: E']);
  });

  it('ít câu hơn số bài thì chọn bài nhiều tiết, mỗi bài một câu', () => {
    const r = chiaCauTheoBai(nhom, 3);
    expect(r.dong.every((d) => d.soCauGan === 1)).toBe(true);
    expect(r.dong.map((d) => d.noiDung)).toContain('Bài 7: H');
  });

  it('dựng ma trận từ dòng theo bài vẫn hợp lệ, tên bài nằm trong ô nội dung', () => {
    const r = chiaCauTheoBai(nhom, 10);
    const kq = dungMaTranTuChuongTrinh(tham({ dong: r.dong, soCau: 10 }));
    expect(kq.loi).toEqual([]);
    const mtc = kq.maTran!;
    expect(kiemDinhMaTranChung(mtc).loi).toEqual([]);
    const dongMt = mtc.bai_kiem_tra[0].phan[0].dong;
    expect(dongMt.map((d) => d.noi_dung)).toEqual(r.dong.map((d) => d.noiDung));
    expect(dongMt.every((d) => d.cau_hoi.length === (r.dong.find((x) => x.noiDung === d.noi_dung)?.soCauGan))).toBe(true);
  });

  it('docGanYccdTheoBai: đúng theo thứ tự bài, bỏ id lạ, thiếu khóa thì rỗng', () => {
    const ok = new Set(['a', 'b']);
    expect(docGanYccdTheoBai('```json\n{"1":["a","zz"],"3":["b","b"]}\n```', 3, ok)).toEqual([['a'], [], ['b']]);
    expect(docGanYccdTheoBai('không có', 2, ok)).toBeNull();
  });
});
