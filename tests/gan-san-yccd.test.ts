import { describe, expect, it } from 'vitest';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import { danhSachCau, ganSanYccdDuyNhat, taoMaTranRiengRong } from '@/core/matrix/matrix-template';

const mtc = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TOAN')!;

describe('Gắn sẵn YCCĐ cho câu chỉ có một YCCĐ (dùng chung cho trang và máy chủ)', () => {
  it('gắn cho mọi câu có đúng một YCCĐ', () => {
    const mtr = ganSanYccdDuyNhat(mtc, taoMaTranRiengRong(mtc));
    const motYccd = danhSachCau(mtc, {}).filter((c) => c.cau.dang !== 'VIET' && c.phan.kieu !== 'VIET' && c.dong.yccd.length === 1);
    expect(mtr.cau_hoi.length).toBe(motYccd.length);
  });

  it('YCCĐ lấy từ Kho chương trình thì không gắn sẵn', () => {
    const mtr = ganSanYccdDuyNhat(mtc, { ...taoMaTranRiengRong(mtc), nguon_yccd: 'CHUONG_TRINH' });
    expect(mtr.cau_hoi).toHaveLength(0);
  });
});
