/**
 * Tìm câu trùng giữa các đề trong kho (cùng môn): cùng đề bài và cùng phương án.
 * Chỉ để cảnh báo; giáo viên quyết định có dùng lại câu hay không (đề cùng kì của các lớp có thể cố ý giống nhau).
 */

import { nhanCau, type DeKiemTra } from './de';

export interface DeSoSanh { id: string; maDe: string; maMon: string; ky: string; de: DeKiemTra }
export interface CauTrung { maMon: string; deBai: string; cacDe: { id: string; maDe: string; ky: string; cau: string }[] }

const chuanHoa = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const khoa = (deBai: string, luaChon: string[]) => `${chuanHoa(deBai)}|${luaChon.map(chuanHoa).join('|')}`;

export function timCauTrungGiuaCacDe(ds: DeSoSanh[]): CauTrung[] {
  const nhom = new Map<string, CauTrung>();
  for (const d of ds) {
    for (const c of d.de.cau) {
      if (chuanHoa(c.deBai).length < 15) continue;
      const k = `${d.maMon}#${khoa(c.deBai, c.luaChon)}`;
      const g = nhom.get(k) ?? { maMon: d.maMon, deBai: c.deBai, cacDe: [] };
      g.cacDe.push({ id: d.id, maDe: d.maDe, ky: d.ky, cau: nhanCau(c) });
      nhom.set(k, g);
    }
  }
  // Chỉ tính là trùng khi xuất hiện ở từ hai đề khác nhau trở lên
  return [...nhom.values()].filter((g) => new Set(g.cacDe.map((x) => x.id)).size >= 2);
}
