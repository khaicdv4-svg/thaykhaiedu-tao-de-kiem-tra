import { describe, expect, it } from 'vitest';
import { docCauAISoan } from '@/core/chuong-trinh/sach';
import { boGoiYDeViet, deBaiTrongDoan, deSgkBiTrung, ganNguCanhViet, tachPhanViet, tuKhoaKieuBai, type MucSgkViet } from '@/core/de/de-viet-tv';

const bai29 = `[Trang 128 – đã soát]\nLUYỆN TỪ VÀ CÂU\nDấu gạch ngang.\n\nVIẾT BÀI VĂN MIÊU TẢ CON VẬT\n\nChọn 1 trong 2 đề dưới đây:\nĐề 1: Miêu tả một con vật mà em đã chăm sóc và gắn bó.\n\nĐề 2: Miêu tả một con vật mà em đã được quan sát trên ti vi hoặc trong\nphim ảnh.\n\n1. Dựa vào dàn ý đã lập, viết bài văn.`;
const onTap18 = `A. ĐỌC\nCâu hỏi gì?\n\nB. VIẾT\nChọn 1 trong 2 đề dưới đây:\nĐề 1: Viết bài văn miêu tả một con vật mà em từng nuôi hoặc từng nhìn thấy và có ấn tượng đặc biệt.\nĐề 2: Viết đoạn văn tưởng tượng dựa vào một câu chuyện thú vị mà em đã đọc hoặc đã nghe.`;
const bai19 = `ĐỌC\nThanh âm của núi...\nVIẾT\nViết đoạn văn tưởng tượng dựa vào một câu chuyện đã đọc\nĐề bài: Viết đoạn văn tưởng tượng về một kết thúc khác cho câu chuyện em đã đọc.`;

const muc: MucSgkViet[] = [
  { nhan: 'Bài 19', ten: 'Thanh âm của núi', trangTu: 85, trangDen: 88, laOnTap: false, noiDung: bai19 },
  { nhan: 'Bài 29', ten: 'Ở Vương quốc Tương Lai', trangTu: 125, trangDen: 128, laOnTap: false, noiDung: bai29 },
  { nhan: 'Tuần 18', ten: 'Ôn tập cuối học kì I', trangTu: 138, trangDen: 145, laOnTap: true, noiDung: onTap18 },
];

describe('Đề bài Viết Tiếng Việt', () => {
  it('nhận kiểu bài từ tên kiểu bài', () => {
    expect(tuKhoaKieuBai('Viết bài văn miêu tả con vật')!.test('con vật')).toBe(true);
    expect(tuKhoaKieuBai('Viết đoạn văn tưởng tượng')!.test('tưởng tượng')).toBe(true);
  });

  it('miêu tả con vật: lấy tiết Viết và tiết Ôn tập, không lấy tiết tưởng tượng', () => {
    const ngu = ganNguCanhViet(muc, tuKhoaKieuBai('Viết bài văn miêu tả con vật')!);
    expect(ngu.nguon.some((n) => n.startsWith('Bài 29'))).toBe(true);
    expect(ngu.nguon.some((n) => n.startsWith('Tuần 18'))).toBe(true);
    expect(ngu.nguon.some((n) => n.startsWith('Bài 19'))).toBe(false);
    expect(ngu.deSgk).toContain('Miêu tả một con vật mà em đã chăm sóc và gắn bó.');
    expect(ngu.deSgk.some((d) => d.includes('trên ti vi hoặc trong phim ảnh'))).toBe(true);
    expect(ngu.deSgk.some((d) => d.includes('từng nuôi hoặc từng nhìn thấy'))).toBe(true);
  });

  it('tưởng tượng: lấy đúng tiết tưởng tượng', () => {
    const ngu = ganNguCanhViet(muc, tuKhoaKieuBai('Viết đoạn văn tưởng tượng')!);
    expect(ngu.nguon.some((n) => n.startsWith('Bài 19'))).toBe(true);
    expect(ngu.deSgk.some((d) => d.includes('kết thúc khác'))).toBe(true);
  });

  it('phát hiện đề trùng SGK, cho qua đề diễn đạt khác', () => {
    const ds = deBaiTrongDoan(tachPhanViet(bai29, /con vật/i)!, /con vật/i);
    expect(deSgkBiTrung('Miêu tả một con vật mà em đã chăm sóc và gắn bó nhất.', ds)).not.toBeNull();
    expect(deSgkBiTrung('Hãy tả chú gà trống trong xóm em vào một buổi sáng sớm.', ds)).toBeNull();
  });
});

describe('Đề Viết: bỏ gợi ý, hai đề để chọn', () => {
  it('bỏ phần gợi ý khỏi đề bài', () => {
    const de = 'Em hãy tả chú chó nhà em hoặc nhà hàng xóm.\nGợi ý:\n- Bài văn có đủ ba phần.\n- Tả hình dáng.';
    expect(boGoiYDeViet(de)).toBe('Em hãy tả chú chó nhà em hoặc nhà hàng xóm.');
    expect(boGoiYDeViet('Tả một con vật em yêu thích.')).toBe('Tả một con vật em yêu thích.');
  });

  it('đọc được hai đề AI trả về', () => {
    const x = docCauAISoan(JSON.stringify({ deBai: 'Đề A', huongDanCham: 'HDC A', cacDe: [{ deBai: 'Đề A', huongDanCham: 'HDC A' }, { deBai: 'Đề B', huongDanCham: 'HDC B' }], luaChon: [], dapAn: '', khongDuCanCu: false, ghiChu: '' }))!;
    expect(x.cacDe).toHaveLength(2);
    expect(x.cacDe![1].deBai).toBe('Đề B');
  });
});
