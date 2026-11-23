import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { XemTruocDe } from '../src/components/de/XemTruocDe';
import type { DeKiemTra } from '../src/core/de/de';

const de: DeKiemTra = {
  loai: 'DE', ma_mon: 'TOAN', ky_kiem_tra: 'CUOI_HK1', phien_ban_dac_ta: 1,
  cau: [
    { khoa: 'a/7', cau: '7', yNho: null, muc: 2, hinhThuc: 'TL', dang: null, diem: 1, yccd: 'đổi đơn vị', deBai: 'Cửa hàng có 3 tấn gạo. Hỏi …?', luaChon: [], dapAn: '3 000 kg', huongDanCham: '1 điểm', ghiChuHinh: '' },
    { khoa: 'a/8', cau: '8', yNho: null, muc: 2, hinhThuc: 'TL', dang: null, diem: 1, yccd: 'x', deBai: 'Tính 12 345 + 1 000', luaChon: [], dapAn: '13 345', huongDanCham: '1 điểm', ghiChuHinh: '' },
  ],
};

describe('Màn Xem đề', () => {
  it('mỗi câu có nút Sửa câu này, Sửa ở bước Đặc tả; câu lệch hiện lỗi ngay trên câu', () => {
    const html = renderToStaticMarkup(
      <XemTruocDe de={de} truong="TRƯỜNG TH" tenMon="Toán" phut={40} tieuDe="Xem đề"
        congCu={{ lech: { 'a/7': ['Đặc tả chọn dạng chuyển đổi đơn vị đo nhưng câu đang là bài toán có lời văn.'] }, onSuaCau: () => {}, hrefDacTa: (k) => `/dac-ta?cau=${k}` }} />,
    );
    expect(html.match(/Sửa câu này/g)).toHaveLength(2);
    expect(html).toContain('/dac-ta?cau=a/7');
    expect(html).toContain('Câu 7: Đặc tả chọn dạng chuyển đổi đơn vị đo');
    expect(html).toContain('Câu 8: khớp đặc tả');
    expect(html).toContain('id="xem-a/7"');
  });

  it('không truyền công cụ sửa thì giữ như bản xem trước cũ', () => {
    const html = renderToStaticMarkup(<XemTruocDe de={de} truong="TRƯỜNG TH" tenMon="Toán" phut={40} />);
    expect(html).not.toContain('Sửa câu này');
    expect(html).toContain('HẾT ĐỀ');
  });
});
