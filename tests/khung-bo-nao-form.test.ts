import { describe, it, expect } from 'vitest';
import { analyzeReadingPassageLength } from '@/core/utils/vietnamese-word-counter';
import { khoangDoDai } from '@/core/reading-passages/quy-dinh';
import { boNaoTrong, type BoNao } from '@/core/bo-nao/bo-nao';

/** Tạo chuỗi có đúng n tiếng (mỗi từ 1 tiếng). */
const taoTieng = (n: number) => Array.from({ length: n }, () => 'bé').join(' ');

describe('Form nhập tay: khung độ dài lấy từ bộ não', () => {
  it('dung sai mặc định của đọc thành tiếng là ±5 khi không truyền dung sai', () => {
    const a = analyzeReadingPassageLength(taoTieng(74), 'ORAL_READING');
    expect(a.toleranceStatus).toBe('WARNING_OUT_OF_RANGE');
  });

  it('dùng dung sai bộ não truyền vào thay cho mặc định', () => {
    // Khung 80–90, bộ não đặt dung sai 8 → 74 tiếng vẫn nằm trong dung sai (72–98)
    const a = analyzeReadingPassageLength(taoTieng(74), 'ORAL_READING', 80, 90, 8);
    expect(a.toleranceStatus).toBe('IN_RANGE');
    expect(a.targetMin).toBe(80);
    expect(a.targetMax).toBe(90);
  });

  it('khung đọc thành tiếng theo kì lấy từ bộ não khi tổ đã tải ma trận', () => {
    const bn: BoNao = boNaoTrong();
    bn.ky.GIUA_HK1 = {
      ky: 'GIUA_HK1',
      tocDo: { min: 82, max: 84 },
      doDai: {},
      chuDiem: [],
    };
    const k = khoangDoDai('DOC_THANH_TIENG', 'GIUA_HK1', 'TRUYEN', bn);
    expect(k).toEqual({ min: 82, max: 84, dungSai: 5, donVi: 'tiếng' });
  });

  it('đọc hiểu: thể loại bộ não không ghi thì trả về null để form báo thiếu khung', () => {
    const bn: BoNao = boNaoTrong();
    bn.ky.CUOI_NAM = {
      ky: 'CUOI_NAM',
      tocDo: null,
      doDai: { TRUYEN: [300, 330] },
      chuDiem: [],
    };
    expect(khoangDoDai('DOC_HIEU', 'CUOI_NAM', 'THO', bn)).toBeNull();
    expect(khoangDoDai('DOC_HIEU', 'CUOI_NAM', 'TRUYEN', bn)).toEqual({
      min: 300,
      max: 330,
      dungSai: 10,
      donVi: 'tiếng',
    });
  });
});

import { danhGiaTheoBai } from '@/core/reading-passages/do-dai';

describe('Trang danh sách: đánh giá bài theo kì đã gắn cho bài', () => {
  it('bài chưa gắn kì hoặc loại bài thì chưa đánh giá', () => {
    expect(danhGiaTheoBai({ wordCount: 85 })).toBeNull();
    expect(danhGiaTheoBai({ wordCount: 85, assessmentPeriod: 'GIUA_HK1' })).toBeNull();
  });

  it('đọc thành tiếng giữa HKI 85 tiếng là đủ, dùng nguyên bài', () => {
    const d = danhGiaTheoBai({ wordCount: 85, assessmentPeriod: 'GIUA_HK1', readingUse: 'DOC_THANH_TIENG' });
    expect(d?.mau).toBe('xanh');
  });

  it('đọc hiểu theo bộ não của tổ, không theo khung cũ 250–320', () => {
    const bn: BoNao = boNaoTrong();
    bn.ky.GIUA_HK1 = { ky: 'GIUA_HK1', tocDo: null, doDai: { MIEU_TA: [180, 200] }, chuDiem: [] };
    // 190 tiếng: khung cũ báo lệch chuẩn, bộ não báo đúng
    const d = danhGiaTheoBai({ wordCount: 190, assessmentPeriod: 'GIUA_HK1', readingUse: 'DOC_HIEU', literaryForm: 'MIEU_TA' }, bn);
    expect(d?.mau).toBe('xanh');
  });
});
