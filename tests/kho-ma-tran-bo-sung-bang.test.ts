/**
 * Chế độ "chỉ bổ sung dạng bảng": file chữ y hệt bản mới nhất thì ghép bảng vào bản đó,
 * file khác nội dung hoặc ô chưa có bản thì bỏ qua, tuyệt đối không tạo phiên bản mới.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ghi = { insert: vi.fn(), rpc: vi.fn() };
let banMoiNhat: { id: string; phien_ban: number; noi_dung: string; cau_truc: unknown }[] = [];

function chuoi(ketQua: unknown) {
  const q: any = {};
  for (const m of ['select', 'eq', 'is', 'order']) q[m] = () => q;
  q.limit = async () => ({ data: ketQua });
  q.single = async () => ({ data: ketQua });
  return q;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (bang: string) => {
      if (bang === 'profiles') return chuoi({ organization_id: 'o1', role: 'GROUP_LEADER' });
      const q = chuoi(banMoiNhat);
      q.insert = async (row: unknown) => { ghi.insert(row); return { error: null }; };
      return q;
    },
    rpc: async (ten: string, thamSo: unknown) => { ghi.rpc(ten, thamSo); return { data: true, error: null }; },
  }),
}));

import { luuNhieuFile } from '@/lib/repositories/kho-ma-tran.repository';

const bang = [{ loai: 'bang', hang: [[{ chu: 'Mạch kiến thức', cot: 1, hang: 1 }]] }];
const file = (noiDung: string) => ({
  loai: 'CHUNG' as const, maMon: 'TOAN', ky: 'CUOI_HK1' as const, tenFile: 'ma-tran.docx', noiDung, cauTruc: bang as any, chiBoSung: true,
});

describe('Bổ sung dạng bảng cho ma trận đã tải', () => {
  beforeEach(() => { ghi.insert.mockReset(); ghi.rpc.mockReset(); });

  it('chữ y hệt bản mới nhất: ghép bảng vào chính bản đó, không tạo bản mới', async () => {
    banMoiNhat = [{ id: 'b1', phien_ban: 1, noi_dung: 'MA TRẬN TOÁN', cau_truc: null }];
    const [kq] = await luuNhieuFile([file('MA TRẬN TOÁN')]);
    expect(kq).toMatchObject({ ok: true, boSung: true, phienBan: 1 });
    expect(ghi.rpc).toHaveBeenCalledWith('bo_sung_cau_truc_ma_tran', expect.objectContaining({ p_id: 'b1' }));
    expect(ghi.insert).not.toHaveBeenCalled();
  });

  it('nội dung khác: bỏ qua, không tạo bản mới', async () => {
    banMoiNhat = [{ id: 'b1', phien_ban: 1, noi_dung: 'MA TRẬN TOÁN', cau_truc: null }];
    const [kq] = await luuNhieuFile([file('MA TRẬN TOÁN ĐÃ SỬA')]);
    expect(kq.ok).toBe(false);
    expect(ghi.insert).not.toHaveBeenCalled();
  });

  it('ô chưa có bản nào: bỏ qua', async () => {
    banMoiNhat = [];
    const [kq] = await luuNhieuFile([file('MA TRẬN TOÁN')]);
    expect(kq.ok).toBe(false);
    expect(ghi.insert).not.toHaveBeenCalled();
  });

  it('không bật chế độ bổ sung thì vẫn tạo bản mới như cũ', async () => {
    banMoiNhat = [{ id: 'b1', phien_ban: 1, noi_dung: 'MA TRẬN TOÁN', cau_truc: null }];
    const [kq] = await luuNhieuFile([{ ...file('MA TRẬN TOÁN ĐÃ SỬA'), chiBoSung: false }]);
    expect(kq).toMatchObject({ ok: true, phienBan: 2 });
    expect(ghi.insert).toHaveBeenCalledTimes(1);
  });
});
