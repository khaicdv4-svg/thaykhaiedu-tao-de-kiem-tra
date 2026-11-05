import { describe, expect, it } from 'vitest';
import { docLuaChonAI, loiNhacChonDoan } from '../src/core/reading-passages/goi-y-cat-ai';
import type { DoanCat } from '../src/core/reading-passages/cat-doan';

const d = (doan: string): DoanCat => ({ doan, soTieng: 82, kieuNgat: 'CUOI_CAU', batDau: 'DAU_BAI', ketThuc: '...hết.', trongKhoang: true });

describe('AI chọn đoạn cắt', () => {
  it('đọc được lựa chọn hợp lệ, kể cả khi AI viết thêm chữ', () => {
    expect(docLuaChonAI('Mình chọn: {"chon": 2, "lyDo": "Trọn ý"}', 3)).toEqual({ chi: 1, lyDo: 'Trọn ý' });
  });
  it('bỏ qua câu trả lời sai số thứ tự hoặc không phải JSON', () => {
    expect(docLuaChonAI('{"chon": 5}', 3)).toBeNull();
    expect(docLuaChonAI('đoạn hai', 3)).toBeNull();
  });
  it('lời nhắc đánh số các đoạn', () => {
    const s = loiNhacChonDoan('Mùa thu', [d('A'), d('B')]);
    expect(s).toContain('Đoạn 1 (82 tiếng');
    expect(s).toContain('Đoạn 2');
  });
});
