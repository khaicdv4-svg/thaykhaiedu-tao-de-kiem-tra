/**
 * Tự điền bài, tuần, trang SGK cho các câu đặc tả còn trống: AI chọn bài trong PPCT của kì (nếu trường đã cài AI),
 * phần còn lại chọn theo từ chung. Chỉ chọn trong danh sách bài có thật; không ghi đè ô đã điền.
 */
import { dsMucLucSgk, dsTietPpct } from './chuong-trinh.repository';
import { goiAITheoViec, trangThaiViecAI } from './cai-dat-ai.repository';
import { khoangTuanTheoKy, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import { TEN_MON } from '@/core/chuong-trinh/mon';
import type { DacTa } from '@/core/dac-ta/dac-ta';
import { layKhoiLamViec } from '@/lib/khoi-lam-viec.server';
import {
  HE_THONG_GHEP_BAI,
  apDungGhepBai,
  chonBaiTheoTu,
  danhSachBaiUngVien,
  docKetQuaGhepBai,
  loiNhacGhepBai,
  type BaiUngVien,
  type CauCanGhep,
} from '@/core/dac-ta/ghep-bai';

export interface KetQuaGhepBai {
  dacTa: DacTa;
  soDong: number;
  soAI: number;
  soTuKhoa: number;
  tuanTu?: number;
  tuanDen?: number;
  /** AI không chạy được thì ghi lí do (vẫn ghép theo từ chung). */
  ghiChuAI?: string;
}

export async function ghepBaiTuDong(maMon: string, ky: string, d: DacTa, lopTruyen?: number): Promise<KetQuaGhepBai> {
  const lop = lopTruyen ?? (await layKhoiLamViec());
  const can: CauCanGhep[] = d.dong.filter((r) => !r.baiHoc?.trim()).map((r) => ({ khoa: r.khoa, yccd: r.yccd, noiDung: r.noiDung, mach: r.mach }));
  if (!can.length) return { dacTa: d, soDong: 0, soAI: 0, soTuKhoa: 0 };
  const [tiet, mucLuc] = await Promise.all([dsTietPpct(maMon, lop), dsMucLucSgk(maMon, lop).catch(() => [])]);
  const { tuanTu, tuanDen } = khoangTuanTheoKy(tiet, ky as KyDung);
  const ungVien = danhSachBaiUngVien(tiet, mucLuc, tuanTu, tuanDen);
  if (!ungVien.length) return { dacTa: d, soDong: 0, soAI: 0, soTuKhoa: 0, tuanTu, tuanDen };

  const chon = new Map<string, BaiUngVien>();
  let ghiChuAI: string | undefined;
  const tt = await trangThaiViecAI('SOAN_DE');
  if (tt.daCauHinh) {
    try {
      const kq = await goiAITheoViec('SOAN_DE', {
        heThong: HE_THONG_GHEP_BAI,
        noiDung: loiNhacGhepBai(TEN_MON[maMon] ?? maMon, can, ungVien),
        toiDaToken: 60 * can.length + 300,
        timWeb: false,
        choToiDa: 90_000,
      });
      for (const [k, u] of docKetQuaGhepBai(kq.traLoi, can, ungVien)) chon.set(k, u);
    } catch (e) {
      ghiChuAI = e instanceof Error ? e.message : String(e);
    }
  } else ghiChuAI = tt.lyDo;
  const soAI = chon.size;
  for (const c of can) {
    if (chon.has(c.khoa)) continue;
    const u = chonBaiTheoTu(c, ungVien);
    if (u) chon.set(c.khoa, u);
  }
  const ap = apDungGhepBai(d, chon);
  return { dacTa: ap.dacTa, soDong: ap.soDong, soAI, soTuKhoa: chon.size - soAI, tuanTu, tuanDen, ghiChuAI };
}
