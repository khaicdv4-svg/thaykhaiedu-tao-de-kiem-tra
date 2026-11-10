/**
 * Gợi ý câu từ ngân hàng cho các câu còn trống của đề.
 * Chỉ gợi ý, không tự điền: giáo viên xem rồi chọn câu nào dùng.
 * Điều kiện bắt buộc: cùng mức, hình thức, dạng câu (và số ý với câu đúng/sai). Điểm cao hơn cho cùng YCCĐ và câu đã kiểm định.
 */

import type { CauDe, NoiDungCau } from './de';

export interface CauNganHangGoiY {
  id: string;
  muc: number;
  hinhThuc: 'TN' | 'TL';
  dang: string | null;
  yccd: string;
  daKiemDinh: boolean;
  noiDung: NoiDungCau;
}

export interface GoiYMotCau { khoa: string; cauNganHang: CauNganHangGoiY; diem: number }

const chuanHoa = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const tuKhoa = (s: string) => new Set(chuanHoa(s).split(' ').filter((t) => t.length > 2));

function giongYccd(a: string, b: string): number {
  const x = chuanHoa(a);
  const y = chuanHoa(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ta = tuKhoa(a);
  const tb = tuKhoa(b);
  if (!ta.size || !tb.size) return 0;
  let chung = 0;
  for (const t of ta) if (tb.has(t)) chung++;
  return chung / (ta.size + tb.size - chung);
}

/** Phù hợp về cấu trúc: câu đúng/sai cần đủ số ý; trắc nghiệm nhiều lựa chọn cần đủ 4 phương án. */
function hopCauTruc(c: CauDe, b: CauNganHangGoiY): boolean {
  if (c.muc !== b.muc || c.hinhThuc !== b.hinhThuc || (c.dang ?? null) !== (b.dang ?? null)) return false;
  if (!b.noiDung.deBai.trim()) return false;
  const coLuaChon = b.noiDung.luaChon.filter((x) => x.trim()).length;
  if (c.dang === 'DS') return !!c.yNho && coLuaChon === c.yNho.length;
  if (c.dang === 'NLC') return coLuaChon === 4 && !!b.noiDung.dapAn.trim();
  return true;
}

/** Mỗi câu trống nhận tối đa một gợi ý; một câu ngân hàng không gợi ý cho hai chỗ. */
export function goiYTuNganHang(cau: CauDe[], nganHang: CauNganHangGoiY[]): GoiYMotCau[] {
  const tinhDiem = (c: CauDe, b: CauNganHangGoiY) => giongYccd(c.yccd, b.yccd) * 60 + (b.daKiemDinh ? 25 : 0) + (b.noiDung.dapAn.trim() ? 5 : 0);
  const trong = cau.filter((c) => !c.deBai.trim());
  const ungVien = trong.flatMap((c) => nganHang.filter((b) => hopCauTruc(c, b)).map((b) => ({ c, b, diem: tinhDiem(c, b) })));
  ungVien.sort((p, q) => q.diem - p.diem);
  const daDungCau = new Set<string>();
  const daDungNH = new Set<string>();
  const kq: GoiYMotCau[] = [];
  for (const u of ungVien) {
    if (daDungCau.has(u.c.khoa) || daDungNH.has(u.b.id)) continue;
    daDungCau.add(u.c.khoa);
    daDungNH.add(u.b.id);
    kq.push({ khoa: u.c.khoa, cauNganHang: u.b, diem: Math.round(u.diem) });
  }
  const thuTu = new Map(cau.map((c, i) => [c.khoa, i]));
  return kq.sort((p, q) => (thuTu.get(p.khoa) ?? 0) - (thuTu.get(q.khoa) ?? 0));
}
