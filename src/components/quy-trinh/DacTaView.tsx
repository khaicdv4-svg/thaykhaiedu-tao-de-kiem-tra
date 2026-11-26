'use client';

/**
 * Bản đặc tả (MOD-03) – bước 3 của quy trình tạo đề.
 * Tạo đặc tả → Xem trước → Kiểm tra → Chỉnh sửa → Xác nhận → Tạo đề.
 * Đặc tả kế thừa phiên bản ma trận riêng ĐÃ XÁC NHẬN: mức, hình thức, điểm, YCCĐ lấy từ ma trận (không sửa ở đây).
 * Thầy điền bài học, tuần, trang SGK cho từng câu. Ứng dụng không tự đoán: chỉ gợi ý khi khớp Kho chương trình.
 */

import { tenMon as tenMonKT } from '@/core/ho-so-de/mon-ky';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, ListChecks, Loader2, Lock, RefreshCw, Save } from 'lucide-react';
import { TienTrinh5Buoc } from '@/components/ui/TienTrinh5Buoc';
import { ValidationPanel } from '@/components/matrices/ValidationPanel';
import { DANH_SACH_KY, khoangTuanTheoKy, type KyDung } from '@/core/matrix/dung-tu-chuong-trinh';
import {
  dienLaiTuPpct,
  dungLaiDacTa,
  kiemDinhDacTa,
  minhChungTuBai,
  taoDacTa,
  taoGoiYTheoYccd,
  trangThaiDacTaSauKhiSua,
  trangThaiDacTaSauKiemDinh,
  xepDongTheoCau,
  type DacTa,
  type DongDacTa,
  type KetQuaKiemDinhDacTa,
  type KieuHinhKem,
  TEN_KIEU_HINH,
  type MinhChungCau,
  type MucLucSgk,
  type TrangThaiDacTa,
} from '@/core/dac-ta/dac-ta';
import type { MaTranChung, MaTranRieng } from '@/types/matrix-template';
import { cauTrenDiaChi, cuonToiCau, docHoSoDe, luuHoSoDe } from '@/core/ho-so-de/ho-so-de';
import { goiYDangBai, yccdRong } from '@/core/de/dang-bai';
import { ThanhHoSoDe } from '@/components/ui/ThanhHoSoDe';
import { khoaThuocPhan, type NhungTV } from '@/components/quy-trinh/nhung';

interface BanMaTranRieng { id: string; phienBan: number | null; xacNhanLuc: string | null; duLieu: { ma_tran_chung: MaTranChung; ma_tran_rieng: MaTranRieng } }
interface BanDacTaApi { id: string; phienBan: number | null; trangThai: TrangThaiDacTa; maTranRiengId: string; phienBanMaTranRieng: number; duLieu: DacTa }
interface Tiet { thuTu: number; tuan: number | null; hocKi: number | null; chuDe: string | null; baiTen: string | null }
interface Yccd { noiDung: string; bai: string | null }

const NHAN_TRANG_THAI: Record<TrangThaiDacTa, { ten: string; mau: string }> = {
  BAN_NHAP: { ten: 'Bản nháp', mau: 'bg-slate-100 text-slate-700 border-slate-200' },
  CAN_KIEM_TRA: { ten: 'Chờ xác nhận', mau: 'bg-blue-50 text-blue-700 border-blue-200' },
  CO_LOI: { ten: 'Có lỗi cần sửa', mau: 'bg-red-50 text-red-700 border-red-200' },
  DA_XAC_NHAN: { ten: 'Đã xác nhận', mau: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CAN_XAC_NHAN_LAI: { ten: 'Cần xác nhận lại', mau: 'bg-amber-50 text-amber-800 border-amber-200' },
};

const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white w-full';
const fmtDiem = (x: number) => String(x).replace('.', ',');
const TEN_MUC = ['', 'Mức 1', 'Mức 2', 'Mức 3'];
const TEN_DANG: Record<string, string> = { NLC: 'Nhiều lựa chọn', DS: 'Đúng/Sai', TLN: 'Trả lời ngắn', NOI: 'Nối', DIEN: 'Điền', VIET: 'Viết' };
const LOP = 4;

async function goiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; j: T & { error?: string } }> {
  try {
    // Quá 4 phút không có trả lời thì báo lỗi, không để nút đứng im
    const r = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(240000) });
    return { ok: r.ok, status: r.status, j: (await r.json().catch(() => ({}))) as T & { error?: string } };
  } catch {
    return { ok: false, status: 0, j: { error: 'Không kết nối được hệ thống hoặc hệ thống trả lời quá lâu. Thử lại sau ít phút.' } as T & { error?: string } };
  }
}

/** nhung: chạy trong trang đề Tiếng Việt, chỉ hiện các câu của một phần (vẫn lưu cả bản đặc tả). */
export function DacTaView({ nhung }: { nhung?: NhungTV } = {}) {
  const [maMon, setMaMon] = useState('TOAN');
  const [ky, setKy] = useState<KyDung>('CUOI_HK1');
  // Chỉ nạp sau khi đọc hồ sơ đề (môn, kì), tránh nạp nhầm môn mặc định rồi ghi đè
  const [sanSang, setSanSang] = useState(false);
  const lanNap = useRef(0);
  const [dangTai, setDangTai] = useState(false);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [mtrBan, setMtrBan] = useState<BanMaTranRieng | null>(null); // phiên bản ma trận riêng đã xác nhận mới nhất
  const [dacTa, setDacTa] = useState<DacTa | null>(null);
  const [daLuuId, setDaLuuId] = useState<string | null>(null); // đặc tả (bản nháp hoặc bản xác nhận) đã đọc từ hệ thống
  const [phienBanXacNhan, setPhienBanXacNhan] = useState<number | null>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiDacTa>('BAN_NHAP');
  const [ketQua, setKetQua] = useState<KetQuaKiemDinhDacTa | null>(null);
  const [cheDo, setCheDo] = useState<'sua' | 'xem'>('sua');
  const [daXemTruoc, setDaXemTruoc] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  // Ma trận riêng, đặc tả là của chính người đăng nhập: bấm Lưu là tự kiểm tra và dùng ngay
  const tuXacNhan = true;
  const router = useRouter();
  const [hienTatCa, setHienTatCa] = useState(false);
  const hrefMaTran = () => (nhung ? nhung.lienKet(nhung.phan === 'viet' ? 'p3-kieu-bai' : 'p1-ma-tran') : `/matrices?mon=${maMon}&ky=${ky}`);
  const hrefTaoDe = () => (nhung ? nhung.lienKet(nhung.phan === 'viet' ? 'p3-de-bai' : 'p1-cau-hoi') : `/tao-de?mon=${maMon}&ky=${ky}`);
  const [tiet, setTiet] = useState<Tiet[]>([]);
  const [mucLuc, setMucLuc] = useState<MucLucSgk[]>([]);
  const [yccdKho, setYccdKho] = useState<Yccd[]>([]);
  const [chungMoiHon, setChungMoiHon] = useState<{ phienBan: number } | null>(null); // ma trận chung của tổ mới hơn ma trận riêng
  const [baiCu, setBaiCu] = useState<DacTa | null>(null); // đặc tả cũ khi ma trận đã có phiên bản mới hơn
  // Có thay đổi chưa lưu lên hệ thống: app tự lưu bản nháp sau vài giây; còn thay đổi chưa lưu thì chưa sang bước 4
  const [chuaLuu, setChuaLuu] = useState(false);
  const [dangTuLuu, setDangTuLuu] = useState(false);
  const dacTaRef = useRef<DacTa | null>(null);
  dacTaRef.current = dacTa;

  // Hồ sơ đề (môn, kì) chọn ở bước 1: địa chỉ ?mon=&ky= hoặc hồ sơ lưu trên máy
  useEffect(() => {
    const h = docHoSoDe();
    if (h) { setMaMon(h.mon); setKy(h.ky); luuHoSoDe(h); }
    setSanSang(true);
  }, []);

  // Tự điền bài, tuần, trang cho câu còn trống (một lần cho mỗi bản đặc tả) và tự tạo đặc tả khi chưa có
  const [dangGhep, setDangGhep] = useState(false);
  const daThuGhep = useRef('');
  const daTuTao = useRef('');

  const tuanKiemTra = useMemo(() => (tiet.length ? khoangTuanTheoKy(tiet, ky).tuanDen : null), [tiet, ky]);
  const goiY = useMemo(() => taoGoiYTheoYccd(yccdKho, tiet), [yccdKho, tiet]);
  const dsBaiPpct = useMemo(() => [...new Set(tiet.map((t) => t.baiTen?.replace(/\s+/g, ' ').trim()).filter((b): b is string => !!b))], [tiet]);

  const nap = useCallback(async () => {
    setDangTai(true);
    setLoiTai(null);
    setThongBao(null);
    setKetQua(null);
    setDaXemTruoc(false);
    setCheDo('sua');
    setBaiCu(null);
    setDacTa(null);
    setMtrBan(null);
    setChuaLuu(false);

    const toi = ++lanNap.current;
    const [mtr, dt, pp, yc, ml] = await Promise.all([
      goiJson<{ moiNhat: BanMaTranRieng | null; maTranChungMoiHon?: { phienBan: number } | null }>(`/api/ma-tran-rieng?mon=${maMon}&ky=${ky}`),
      goiJson<{ banNhap: BanDacTaApi | null; moiNhat: BanDacTaApi | null }>(`/api/dac-ta?mon=${maMon}&ky=${ky}`),
      goiJson<{ tiet: Tiet[] }>(`/api/chuong-trinh/ppct?mon=${maMon}&lop=${LOP}`),
      goiJson<{ yccd: Yccd[] }>(`/api/chuong-trinh/yccd?mon=${maMon}&lop=${LOP}&trangThai=DA_DUYET`),
      goiJson<{ mucLuc: MucLucSgk[] }>(`/api/chuong-trinh/sgk-muc-luc?mon=${maMon}&lop=${LOP}`),
    ]);
    if (toi !== lanNap.current) return;
    setTiet(pp.ok ? pp.j.tiet ?? [] : []);
    setMucLuc(ml.ok ? ml.j.mucLuc ?? [] : []);
    setYccdKho(yc.ok ? yc.j.yccd ?? [] : []);
    if (!mtr.ok) { setLoiTai(mtr.j.error ?? 'Không đọc được ma trận riêng.'); setDangTai(false); return; }
    const moiNhat = mtr.j.moiNhat;
    setMtrBan(moiNhat);
    setChungMoiHon(mtr.j.maTranChungMoiHon ?? null);
    if (!moiNhat) { setDangTai(false); return; }
    if (!dt.ok) { setLoiTai(dt.j.error ?? 'Không đọc được bản đặc tả.'); setDangTai(false); return; }

    setPhienBanXacNhan(dt.j.moiNhat?.phienBan ?? null);
    const nhap = dt.j.banNhap;
    if (nhap) {
      setDaLuuId(nhap.id);
      setTrangThai(nhap.trangThai);
      if (nhap.phienBanMaTranRieng < (moiNhat.phienBan ?? 0)) {
        // Ma trận riêng đã có bản mới: tự dựng lại bản nháp đặc tả theo bản mới, giữ bài, tuần, trang đã điền.
        // Không ghi đè bản đặc tả đã xác nhận; thầy cô xem lại, lưu và xác nhận lại.
        const { ma_tran_chung: mtcMoi, ma_tran_rieng: mtrMoi } = moiNhat.duLieu;
        const kq = dungLaiDacTa(mtcMoi, mtrMoi, moiNhat.phienBan ?? 1, nhap.duLieu);
        setDacTa(kq.dacTa);
        setTrangThai('CAN_XAC_NHAN_LAI');
        setChuaLuu(true);
        const them = kq.moi.length ? ` Câu mới cần điền: ${kq.moi.join('; ')}.` : '';
        const bo = kq.bo.length ? ` Câu không còn trong ma trận: ${kq.bo.join('; ')}.` : '';
        const doi = kq.doi.length ? ` Câu đổi YCCĐ nên điền lại bài, trang: ${kq.doi.join('; ')}.` : '';
        setThongBao(`Ma trận riêng đã lên phiên bản ${moiNhat.phienBan} (đặc tả đang theo phiên bản ${nhap.phienBanMaTranRieng}). App đã tự cập nhật bản nháp đặc tả theo ma trận mới, giữ bài, tuần, trang của câu không đổi YCCĐ.${them}${bo}${doi} Thầy cô xem lại rồi bấm Lưu.`);
      } else {
        // Ô bài đã có mà tuần, trang còn trống (đặc tả làm trước khi có mục lục SGK): điền thêm, không ghi đè ô đã điền
        const tietDs = pp.ok ? pp.j.tiet ?? [] : [];
        const dien = dienLaiTuPpct(nhap.duLieu, taoGoiYTheoYccd(yc.ok ? yc.j.yccd ?? [] : [], tietDs), tietDs, ml.ok ? ml.j.mucLuc ?? [] : []);
        setDacTa(dien.dacTa);
        if (dien.soDong) {
          setTrangThai((t) => trangThaiDacTaSauKhiSua(t));
          setChuaLuu(true);
          setThongBao(`App đã điền thêm bài, tuần, trang SGK còn trống cho ${dien.soDong} câu theo PPCT và mục lục sách. Thầy cô xem lại rồi bấm Lưu.`);
        }
      }
    } else {
      setDaLuuId(null);
      setTrangThai('BAN_NHAP');
    }
    setDangTai(false);
  }, [maMon, ky]);

  useEffect(() => { if (sanSang) void nap(); }, [nap, sanSang]);

  /** Gửi đặc tả lên máy chủ để tự chọn bài (AI hoặc theo từ chung) cho các câu còn trống. Không ghi đè ô đã điền. */
  const ghepBai = async (d: DacTa) => {
    setDangGhep(true);
    const r = await goiJson<{ dacTa?: DacTa; soDong?: number; soAI?: number; tuanTu?: number; tuanDen?: number; ghiChuAI?: string }>('/api/dac-ta/ghep-bai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mon: maMon, ky, dacTa: d }),
    });
    setDangGhep(false);
    if (!r.ok || !r.j.dacTa) { setThongBao(`Chưa tự điền được bài học: ${r.j.error ?? 'lỗi kết nối'}. Thầy chọn bài ở từng câu.`); return; }
    const moi = new Map(r.j.dacTa.dong.map((x) => [x.khoa, x]));
    let conTrong = 0;
    setDacTa((cur) => {
      if (!cur) return cur;
      const dong = cur.dong.map((row) => {
        const m = moi.get(row.khoa);
        if (row.baiHoc?.trim() || !m?.baiHoc?.trim()) return row;
        return { ...row, baiHoc: m.baiHoc, tuan: row.tuan ?? m.tuan, trangSgk: row.trangSgk?.trim() ? row.trangSgk : m.trangSgk };
      });
      conTrong = dong.filter((x) => !x.baiHoc?.trim()).length;
      return { ...cur, dong };
    });
    if (r.j.soDong) {
      setTrangThai((t) => trangThaiDacTaSauKhiSua(t));
      setChuaLuu(true);
      setKetQua(null);
      setDaXemTruoc(false);
    }
    const pham = r.j.tuanTu && r.j.tuanDen ? ` trong các bài dạy tuần ${r.j.tuanTu}–${r.j.tuanDen}` : '';
    const ai = r.j.soAI ? ` AI chọn ${r.j.soAI} câu theo YCCĐ, còn lại chọn theo từ khóa.` : r.j.ghiChuAI ? ' (AI chưa dùng được nên app chọn theo từ khóa.)' : '';
    setThongBao(r.j.soDong
      ? `App đã tự điền bài, tuần, trang SGK cho ${r.j.soDong} câu${pham}.${ai}${conTrong ? ` Còn ${conTrong} câu chưa tìm được bài, thầy chọn giúp.` : ''} Thầy cô xem lại rồi bấm Lưu.`
      : 'App chưa tìm được bài phù hợp cho các câu còn trống. Thầy chọn bài ở từng câu.');
  };

  useEffect(() => {
    if (!dacTa || dangTai || !mtrBan) return;
    const khoa = `${maMon}|${ky}|${dacTa.phien_ban_ma_tran_rieng}`;
    if (daThuGhep.current === khoa || !dacTa.dong.some((r) => !r.baiHoc?.trim())) return;
    daThuGhep.current = khoa;
    void ghepBai(dacTa);
  }, [dacTa, dangTai, mtrBan, maMon, ky]);

  const taoMoi = () => {
    if (!mtrBan) return;
    const { ma_tran_chung: mtc, ma_tran_rieng: mtr } = mtrBan.duLieu;
    setDacTa(dienLaiTuPpct(taoDacTa(mtc, mtr, mtrBan.phienBan ?? 1, { tuanKiemTra, goiYTheoYccd: goiY, tiet }), goiY, tiet, mucLuc).dacTa);
    setTrangThai('BAN_NHAP');
    setChuaLuu(true);
    setKetQua(null);
    setDaXemTruoc(false);
    setThongBao('Đã tạo đặc tả từ ma trận riêng. App đang tự điền bài học, tuần, trang SGK cho từng câu…');
  };

  useEffect(() => {
    if (!mtrBan || dacTa || dangTai || loiTai) return;
    const khoa = `${maMon}|${ky}|${mtrBan.id}`;
    if (daTuTao.current === khoa) return;
    daTuTao.current = khoa;
    taoMoi();
  }, [mtrBan, dacTa, dangTai, loiTai, maMon, ky]);

  const dungLai = () => {
    if (!mtrBan || !baiCu) return;
    const { ma_tran_chung: mtc, ma_tran_rieng: mtr } = mtrBan.duLieu;
    const kq = dungLaiDacTa(mtc, mtr, mtrBan.phienBan ?? 1, baiCu);
    setDacTa(kq.dacTa);
    setBaiCu(null);
    setTrangThai('CAN_XAC_NHAN_LAI');
    setChuaLuu(true);
    setKetQua(null);
    setDaXemTruoc(false);
    setThongBao(`Đã dựng lại theo ma trận phiên bản ${mtrBan.phienBan}, giữ phần thầy đã điền.${kq.moi.length ? ` Câu mới cần điền: ${kq.moi.join('; ')}.` : ''}${kq.bo.length ? ` Câu không còn trong ma trận: ${kq.bo.join('; ')}.` : ''}${kq.doi.length ? ` Câu đổi YCCĐ nên điền lại: ${kq.doi.join('; ')}.` : ''}`);
  };

  const sua = (fn: (d: DacTa) => DacTa) => {
    setDacTa((d) => (d ? fn(d) : d));
    setTrangThai((t) => trangThaiDacTaSauKhiSua(t));
    setChuaLuu(true);
    setKetQua(null);
    setDaXemTruoc(false);
  };
  // Chọn đúng một bài trong PPCT thì tự điền tuần, trang SGK vào ô còn trống (không ghi đè ô thầy đã điền)
  const chonBai = (r: DongDacTa, giaTri: string) => {
    const g = minhChungTuBai(giaTri, tiet, mucLuc);
    suaDong(r.khoa, g ? { baiHoc: g.baiHoc, ...(r.tuan === null && g.tuan !== undefined ? { tuan: g.tuan } : {}), ...(!r.trangSgk.trim() && g.trangSgk ? { trangSgk: g.trangSgk } : {}) } : { baiHoc: giaTri });
  };
  const suaDong = (khoa: string, p: Partial<MinhChungCau>) => sua((d) => ({ ...d, dong: d.dong.map((r) => (r.khoa === khoa ? { ...r, ...p } : r)) }));

  const kiemTra = (): KetQuaKiemDinhDacTa | null => {
    if (!mtrBan || !dacTa) return null;
    const { ma_tran_chung: mtc, ma_tran_rieng: mtr } = mtrBan.duLieu;
    const kq = kiemDinhDacTa(mtc, mtr, dacTa, { phienBanMaTranRiengMoiNhat: mtrBan.phienBan ?? undefined });
    setKetQua(kq);
    setTrangThai((t) => trangThaiDacTaSauKiemDinh(t, kq));
    return kq;
  };

  /** Trả về true khi đặc tả đã lưu và dùng được (đã xác nhận). */
  const gui = async (hanhDong: 'LUU' | 'LUU_NHAP' | 'XAC_NHAN', imLang = false): Promise<boolean> => {
    if (!mtrBan || !dacTa) {
      if (!imLang) setThongBao(!mtrBan ? 'Chưa có ma trận riêng đã lưu. Lưu ma trận trước rồi quay lại.' : 'Chưa có bản đặc tả để lưu.');
      return false;
    }
    if (hanhDong === 'LUU') kiemTra();
    const banGui = dacTa;
    if (imLang) setDangTuLuu(true); else setDangGui(true);
    const r = await goiJson<{ ban?: BanDacTaApi; taoPhienBanMoi?: boolean; daXacNhan?: boolean; loiXacNhan?: string }>('/api/dac-ta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanhDong, mon: maMon, ky, maTranRiengId: mtrBan.id, dacTa, trangThai }),
    });
    setDangGui(false);
    setDangTuLuu(false);
    if (!r.ok) { if (imLang) return false; setThongBao(r.status === 403 ? `Chưa lưu được: ${r.j.error ?? 'tài khoản này chỉ được xem.'}` : `Chưa ${hanhDong === 'XAC_NHAN' ? 'xác nhận' : 'lưu'} được: ${r.j.error}`); return false; }
    // Trong lúc gửi mà thầy cô sửa tiếp thì vẫn còn thay đổi chưa lưu
    if (dacTaRef.current === banGui) setChuaLuu(false);
    if (hanhDong === 'LUU_NHAP') { if (!imLang) setThongBao('Đã lưu bản nháp đặc tả lên hệ thống. '); return false; }
    if (hanhDong === 'LUU' && !r.j.daXacNhan) {
      if (r.j.ban?.trangThai) setTrangThai(r.j.ban.trangThai);
      setThongBao(r.j.loiXacNhan ? `Đã lưu bản nháp. Chưa dùng được vì còn lỗi: ${r.j.loiXacNhan}. Sửa xong bấm Lưu lại.` : 'Đã lưu bản nháp đặc tả lên hệ thống.');
      window.setTimeout(() => document.getElementById('ket-qua-dac-ta')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      return false;
    }
    setTrangThai('DA_XAC_NHAN');
    setPhienBanXacNhan(r.j.ban?.phienBan ?? null);
    setThongBao(r.j.taoPhienBanMoi === false ? `Nội dung không đổi so với phiên bản ${r.j.ban?.phienBan}, giữ nguyên phiên bản đó.` : `Đã xác nhận đặc tả, phiên bản ${r.j.ban?.phienBan}. Bước tiếp theo: tạo đề.`);
    return true;
  };

  /** Nút chính: lưu (app tự kiểm tra); dùng được thì sang bước 4 luôn. Kết quả hiện ngay cạnh nút. */
  const [baoNut, setBaoNut] = useState<{ loai: 'dang' | 'loi' | 'ok'; chu: string; ds?: string[] } | null>(null);
  const luuVaSang = async () => {
    setBaoNut({ loai: 'dang', chu: 'Đang kiểm tra và lưu…' });
    try {
      const kq = kiemTra();
      if (await gui('LUU')) {
        setBaoNut({ loai: 'ok', chu: 'Đã lưu. Đang mở bước tiếp theo…' });
        router.push(hrefTaoDe());
        return;
      }
      const loi = kq?.loi ?? [];
      // Lỗi nằm ở câu của phần khác (đang ẩn): hiện cả các phần để thầy cô thấy và sửa
      if (nhung && dacTa && loi.some((l) => dacTa.dong.some((r) => !khoaThuocPhan(r.khoa, nhung.phan) && l.startsWith(`${r.phan ?? r.baiKiemTra}, Câu ${r.cau}`)))) setHienTatCa(true);
      setBaoNut({ loai: 'loi', chu: loi.length ? `Chưa lưu xong vì đặc tả còn ${loi.length} lỗi. Sửa các ô được nêu dưới đây rồi bấm lại:` : 'Chưa lưu được. Xem thông báo ở đầu trang.', ds: loi.slice(0, 6) });
    } catch (e) {
      setBaoNut({ loai: 'loi', chu: `Chưa lưu được: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  // Tự lưu bản nháp 2 giây sau lần sửa cuối, để bước 4 biết đặc tả đang được sửa và không tạo đề theo bản cũ
  useEffect(() => {
    if (!chuaLuu || !dacTa || !mtrBan || dangGui || trangThai === 'DA_XAC_NHAN') return;
    const t = window.setTimeout(() => { void gui('LUU_NHAP', true); }, 2000);
    return () => window.clearTimeout(t);
  }, [chuaLuu, dacTa, mtrBan, dangGui, trangThai]);

  // Mở từ màn Xem đề (nút "Sửa ở bước Đặc tả"): cuộn tới đúng câu
  const daMoCau = useRef(false);
  useEffect(() => {
    if (daMoCau.current || !dacTa || dangTai) return;
    const khoa = cauTrenDiaChi();
    if (!khoa) { daMoCau.current = true; return; }
    setCheDo('sua');
    window.setTimeout(() => { if (cuonToiCau(khoa)) daMoCau.current = true; }, 300);
  }, [dacTa, dangTai]);

  // Xem bản đặc tả: kiểm tra luôn, lỗi (nếu có) hiện ngay dưới bảng
  const xemTruoc = () => {
    kiemTra();
    setCheDo('xem');
  };

  const tenMon = tenMonKT(maMon);
  const nhan = NHAN_TRANG_THAI[trangThai];
  const tongDiem = useMemo(() => Math.round((dacTa?.dong.reduce((s, r) => s + r.diem, 0) ?? 0) * 100) / 100, [dacTa]);
  // Hiển thị theo thứ tự câu trong đề (không gom theo bài) để thầy rà từ câu 1 đến hết.
  const nhom = useMemo((): [string, DongDacTa[]][] => {
    if (!dacTa) return [];
    const ds = xepDongTheoCau(dacTa.dong);
    if (!nhung || hienTatCa) return [['Các câu theo thứ tự trong đề', ds]];
    return [[nhung.phan === 'viet' ? 'Bài viết' : 'Các câu đọc hiểu', ds.filter((r) => khoaThuocPhan(r.khoa, nhung.phan))]];
  }, [dacTa, nhung, hienTatCa]);
  const dienLai = () => {
    if (!dacTa) return;
    const kq = dienLaiTuPpct(dacTa, goiY, tiet, mucLuc);
    setDacTa(kq.dacTa);
    if (kq.dacTa.dong.some((r) => !r.baiHoc?.trim())) { void ghepBai(kq.dacTa); return; }
    setThongBao(kq.soDong ? `Đã điền bài, tuần cho ${kq.soDong} câu từ phân phối chương trình. Thầy xem lại và ghi chú nếu cần.` : tiet.length ? 'Không có ô trống nào tìm được bài khớp trong phân phối chương trình. Thầy nhập tay giúp.' : 'Môn này chưa có phân phối chương trình trong hệ thống. Thầy nhập ở mục Phân phối chương trình trước.');
  };
  const daXacNhan = trangThai === 'DA_XAC_NHAN';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {!nhung && <TienTrinh5Buoc buocHienTai={3} daXong={[1, 2]} choBam />}

      {!nhung && <div className="the-tke p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0"><ListChecks className="w-7 h-7" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bản đặc tả đề kiểm tra</h1>
            <p className="text-sm text-slate-600 mt-1">Kế thừa ma trận riêng đã xác nhận. Mỗi câu một dòng: YCCĐ, mức, hình thức, điểm, kèm bài, tuần, trang SGK làm minh chứng.</p>
          </div>
        </div>
        {dacTa && <span className={`self-start md:self-auto rounded-full border px-3 py-1 text-sm font-medium ${nhan.mau}`}>{nhan.ten}</span>}
      </div>}

      {!nhung && <ThanhHoSoDe mon={maMon} ky={ky} ghiChu={mtrBan?.phienBan ? `Ma trận riêng phiên bản ${mtrBan.phienBan}` : undefined} dangTai={dangTai} />}
      {nhung && dacTa && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>Bản đặc tả dùng chung cho cả đề; ở đây chỉ hiện {nhung.phan === 'viet' ? 'bài viết' : 'các câu đọc hiểu'}. <span className={`rounded-full border px-2 py-0.5 text-xs ${nhan.mau}`}>{nhan.ten}</span></span>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={hienTatCa} onChange={(e) => setHienTatCa(e.target.checked)} /> Hiện cả các phần khác</label>
        </div>
      )}

      {thongBao && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{thongBao}</div>}
      {loiTai && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loiTai}</div>}

      {!dangTai && !loiTai && !mtrBan && (
        <div className="the-tke p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Chưa có ma trận riêng đã xác nhận</h2>
          <p className="text-sm text-slate-600">Đặc tả chỉ lập từ ma trận riêng đã xác nhận của {tenMon}, {DANH_SACH_KY.find((k) => k.ma === ky)?.ten}. Thầy lập và xác nhận ma trận ở bước 2.</p>
          <Link href={hrefMaTran()} className={nutChinh}><ArrowLeft className="w-4 h-4" /> {nhung ? 'Về ma trận' : 'Về bước 2: Ma trận'}</Link>
        </div>
      )}

      {mtrBan && !dacTa && !dangTai && !loiTai && (
        <div className="the-tke p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Tạo đặc tả cho {tenMon}</h2>
          <p className="text-sm text-slate-600">Ứng dụng lấy từng câu, YCCĐ, mức, hình thức, điểm từ ma trận riêng phiên bản {mtrBan.phienBan}. Thầy chỉ phải điền bài học, tuần, trang SGK.</p>
          <button type="button" className={nutChinh} onClick={taoMoi}><ListChecks className="w-4 h-4" /> Tạo đặc tả từ ma trận riêng</button>
        </div>
      )}

      {chungMoiHon && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span>Ma trận chung của tổ vừa có bản {chungMoiHon.phienBan} mới hơn ma trận riêng này. Cần kiểm tra và xác nhận lại ma trận riêng trước khi xác nhận đặc tả.</span>
          <a href={hrefMaTran()} className={nutChinh}>Mở Ma trận riêng</a>
        </div>
      )}

      {baiCu && mtrBan && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span>Ma trận riêng đã có phiên bản {mtrBan.phienBan}, đặc tả này đang theo phiên bản {baiCu.phien_ban_ma_tran_rieng}. Dựng lại để khớp ma trận mới; phần bài, tuần, trang thầy đã điền được giữ nguyên.</span>
          <button type="button" className={nutChinh} onClick={dungLai}><RefreshCw className="w-4 h-4" /> Dựng lại theo ma trận mới</button>
        </div>
      )}

      {dacTa && !baiCu && (
        <>
          <div className="the-tke p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700">
            <span>{dacTa.dong.length} dòng · tổng <b>{fmtDiem(tongDiem)}</b> điểm</span>
            <label className="flex items-center gap-2">
              Tuần kiểm tra:
              <input
                aria-label="Tuần kiểm tra"
                type="number" min={1} max={40}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                disabled={cheDo === 'xem'}
                value={dacTa.tuan_kiem_tra ?? ''}
                onChange={(e) => sua((d) => ({ ...d, tuan_kiem_tra: e.target.value ? Number(e.target.value) : null }))}
              />
              <span className="text-xs text-slate-500">Bài dạy sau tuần này là chưa học.</span>
            </label>
            {!daXacNhan && cheDo === 'sua' && <button type="button" className={nutPhu} disabled={dangGhep} onClick={dienLai}>{dangGhep ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {dangGhep ? 'Đang tự điền bài…' : 'Điền lại bài, tuần, trang'}</button>}
            {phienBanXacNhan !== null && <span className="text-emerald-700">Đã có phiên bản xác nhận: {phienBanXacNhan}</span>}
          </div>

          <div className="the-tke p-2 flex flex-wrap items-center gap-2" role="tablist" aria-label="Chế độ đặc tả">
            {([['sua', 'Sửa đặc tả', ListChecks], ['xem', 'Xem bản đặc tả', Eye]] as const).map(([k, t, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={cheDo === k} onClick={() => { if (k === 'xem') xemTruoc(); else setCheDo('sua'); }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${cheDo === k ? 'text-white bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 shadow' : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" /> {t}
              </button>
            ))}
            <span className="text-xs text-slate-500 px-2">{cheDo === 'sua' ? 'Điền, sửa từng câu. App tự lưu nháp.' : 'Xem cả bảng như bản in.'}{dangTuLuu ? ' Đang tự lưu…' : ''}</span>
          </div>

          {cheDo === 'sua' ? (
            <div className="space-y-4">
              <datalist id="ds-bai-ppct">{dsBaiPpct.map((b) => <option key={b} value={b} />)}</datalist>
              {nhom.map(([ten, dong]) => (
                <div key={ten} className="the-tke p-4 space-y-3">
                  <h2 className="font-semibold text-slate-900">{ten}</h2>
                  <div className="divide-y divide-slate-100">
                    {dong.map((r) => (
                      <div key={r.khoa} id={`cau-${r.khoa}`} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(260px,1.2fr)_2fr] gap-3 transition-shadow">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            Câu {r.cau}{r.yNho ? ` (${r.yNho.join(', ')})` : ''}
                            <span className="ml-2 text-xs font-normal text-slate-500">{TEN_MUC[r.muc]} · {r.hinhThuc}{r.dang ? ` · ${TEN_DANG[r.dang] ?? r.dang}` : ''} · {fmtDiem(r.diem)} điểm</span>
                          </div>
                          <div className="text-xs text-slate-500">{r.noiDung ?? r.mach}</div>
                          <div className="text-sm text-slate-700 whitespace-pre-line">{r.yccd || <span className="text-amber-700">Chưa có YCCĐ</span>}</div>
                          <Link href={hrefMaTran()} className="text-xs text-indigo-700 underline">{nhung ? 'Đổi YCCĐ, mức, điểm ở ma trận' : 'Đổi YCCĐ, mức, điểm ở bước 2'}</Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[2fr_90px_1fr] gap-2 items-start">
                          <label className="text-xs text-slate-500">Bài học (theo PPCT)
                            <input aria-label={`Bài học câu ${r.cau}`} list="ds-bai-ppct" className={`${o} mt-0.5 ${r.baiHoc ? '' : 'border-amber-400 bg-amber-50'}`} value={r.baiHoc} onChange={(e) => chonBai(r, e.target.value)} />
                          </label>
                          <label className="text-xs text-slate-500">Tuần
                            <input aria-label={`Tuần câu ${r.cau}`} type="number" min={1} max={40} className={`${o} mt-0.5 ${r.tuan !== null ? '' : 'border-amber-400 bg-amber-50'}`} value={r.tuan ?? ''} onChange={(e) => suaDong(r.khoa, { tuan: e.target.value ? Number(e.target.value) : null })} />
                          </label>
                          <label className="text-xs text-slate-500">Trang SGK
                            <input aria-label={`Trang SGK câu ${r.cau}`} className={`${o} mt-0.5`} placeholder={maMon === 'TIENG_VIET' ? 'không bắt buộc' : 'trang'} value={r.trangSgk} onChange={(e) => suaDong(r.khoa, { trangSgk: e.target.value })} />
                          </label>
                          <label className="text-xs text-slate-500 sm:col-span-1">Hình kèm theo
                            <select aria-label={`Hình kèm theo câu ${r.cau}`} className={`${o} mt-0.5`} value={r.hinhKem ?? 'KHONG'} onChange={(e) => suaDong(r.khoa, { hinhKem: e.target.value as KieuHinhKem })}>
                              {(Object.keys(TEN_KIEU_HINH) as KieuHinhKem[]).map((k) => <option key={k} value={k}>{TEN_KIEU_HINH[k]}</option>)}
                            </select>
                          </label>
                          {(r.hinhKem ?? 'KHONG') !== 'KHONG' && (
                            <label className="text-xs text-slate-500 sm:col-span-2">Mô tả hình cần có (ngắn gọn)
                              <input aria-label={`Mô tả hình câu ${r.cau}`} className={`${o} mt-0.5`} placeholder="Ví dụ: 4 góc nhọn, vuông, tù, bẹt; nhãn A, B, C, D" value={r.moTaHinh ?? ''} onChange={(e) => suaDong(r.khoa, { moTaHinh: e.target.value })} />
                            </label>
                          )}
                          {r.dang !== 'VIET' && (() => {
                            const goiY = goiYDangBai(r.yccd);
                            const nenChon = !r.dangBai?.trim() && yccdRong(r.yccd);
                            return (
                              <div className="sm:col-span-3 space-y-1">
                                <label className="block text-xs text-slate-500">Dạng bài cụ thể (AI bắt buộc soạn đúng dạng này)
                                  <input aria-label={`Dạng bài câu ${r.cau}`} list={`dang-bai-${r.khoa}`} className={`${o} mt-0.5 ${nenChon ? 'border-amber-400 bg-amber-50' : ''}`} placeholder={goiY.length ? 'Chọn một dạng gợi ý bên dưới hoặc tự ghi' : 'Ví dụ: Tìm hai số khi biết tổng và hiệu'} value={r.dangBai ?? ''} onChange={(e) => suaDong(r.khoa, { dangBai: e.target.value })} />
                                </label>
                                <datalist id={`dang-bai-${r.khoa}`}>{goiY.map((g) => <option key={g} value={g} />)}</datalist>
                                {goiY.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {goiY.map((g) => (
                                      <button key={g} type="button" onClick={() => suaDong(r.khoa, { dangBai: g })} className={`rounded-full border px-2.5 py-1 text-xs text-left ${r.dangBai === g ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-semibold' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{g}</button>
                                    ))}
                                  </div>
                                )}
                                {nenChon && <div className="text-xs text-amber-800">YCCĐ này gồm nhiều nội dung. Chọn đúng dạng bài thầy cô muốn hỏi để AI không ra nhầm dạng khác.</div>}
                              </div>
                            );
                          })()}
                          <label className="text-xs text-slate-500 sm:col-span-3">Ghi chú – yêu cầu riêng cho câu (AI luôn soạn theo)
                            <input aria-label={`Ghi chú câu ${r.cau}`} className={`${o} mt-0.5`} placeholder="VD: dạng đổi đơn vị đo, không ra bài toán có lời văn" value={r.ghiChu} onChange={(e) => suaDong(r.khoa, { ghiChu: e.target.value })} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="the-tke p-4 overflow-x-auto">
              <h2 className="font-semibold text-slate-900 mb-2">Xem trước bản đặc tả – {tenMon}, {DANH_SACH_KY.find((k) => k.ma === ky)?.ten}</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    {['Câu', 'Mạch, nội dung', 'YCCĐ', 'Mức', 'Hình thức, dạng', 'Điểm', 'Bài (PPCT)', 'Tuần', 'Trang SGK', 'Ghi chú'].map((h) => <th key={h} className="border border-slate-300 px-2 py-1.5 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {nhom.map(([ten, dong]) => (
                    <React.Fragment key={ten}>
                      <tr><td colSpan={10} className="border border-slate-300 bg-slate-100 px-2 py-1 font-semibold">{ten}</td></tr>
                      {dong.map((r) => (
                        <tr key={r.khoa} className="align-top">
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.cau}{r.yNho ? ` (${r.yNho.join(', ')})` : ''}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.noiDung ?? r.mach}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.yccd}</td>
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.muc}</td>
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.hinhThuc}{r.dang ? `, ${TEN_DANG[r.dang] ?? r.dang}` : ''}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right">{fmtDiem(r.diem)}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.baiHoc}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center">{r.tuan}</td>
                          <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">{r.trangSgk}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{r.dangBai?.trim() && <div className="font-semibold">Dạng bài: {r.dangBai}</div>}{r.ghiChu}{(r.hinhKem ?? 'KHONG') !== 'KHONG' && <div className="text-violet-800">Hình: {TEN_KIEU_HINH[r.hinhKem!]}{r.moTaHinh ? ` (${r.moTaHinh})` : ''}</div>}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr className="font-semibold"><td colSpan={5} className="border border-slate-300 px-2 py-1.5 text-right">Tổng</td><td className="border border-slate-300 px-2 py-1.5 text-right">{fmtDiem(tongDiem)}</td><td colSpan={4} className="border border-slate-300" /></tr>
                </tbody>
              </table>
            </div>
          )}

          {ketQua && <div id="ket-qua-dac-ta" className="the-tke p-6"><ValidationPanel ketQua={ketQua} tieuDe="Kết quả kiểm tra đặc tả" /></div>}

          {!tuXacNhan && cheDo === 'xem' && !daXacNhan && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={daXemTruoc} onChange={(e) => setDaXemTruoc(e.target.checked)} />
              Tôi đã xem kĩ bản đặc tả ở trên.
            </label>
          )}

          {baoNut && (
            <div className={`rounded-xl border p-3 text-sm ${baoNut.loai === 'loi' ? 'border-red-300 bg-red-50 text-red-900' : baoNut.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
              <div className="flex items-center gap-2">{baoNut.loai === 'dang' && <Loader2 className="w-4 h-4 animate-spin" />}{baoNut.chu}</div>
              {baoNut.ds && baoNut.ds.length > 0 && <ul className="list-disc pl-6 mt-1 space-y-0.5">{baoNut.ds.map((l) => <li key={l}>{l}</li>)}</ul>}
            </div>
          )}

          {daXacNhan && !chuaLuu ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-900">
              <span>Đặc tả đã lưu và dùng được (phiên bản {phienBanXacNhan}). Vẫn sửa được bất kì ô nào; sửa xong bấm Lưu lại, đề ở bước 4 sẽ theo bản mới.</span>
              <Link href={hrefTaoDe()} className={nutChinh}>{nhung ? (nhung.phan === 'viet' ? 'Tiếp theo: Đề bài viết' : 'Tiếp theo: Soạn câu hỏi') : 'Tiếp theo: Tạo đề'} <ArrowRight className="w-4 h-4" /></Link>
            </div>
          ) : (
            <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 text-sm ${chungMoiHon || trangThai === 'CO_LOI' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700'}`}>
              <span className="flex items-center gap-2">
                {chungMoiHon ? <><Lock className="w-4 h-4 shrink-0" /> Ma trận chung của tổ vừa đổi. Lưu lại ma trận riêng ở bước 2 trước.</>
                  : trangThai === 'CO_LOI' ? 'Đặc tả còn lỗi (xem kết quả kiểm tra ở trên). Sửa xong bấm lại nút bên phải.'
                    : 'Xong thì bấm nút bên phải: app tự kiểm tra, không lỗi thì lưu và sang bước 4.'}
              </span>
              {!tuXacNhan
                ? <button type="button" className={nutChinh} disabled={!daXemTruoc || dangGui || !!chungMoiHon} onClick={() => void gui('XAC_NHAN')}>{dangGui ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Xác nhận đặc tả</button>
                : <button type="button" className={nutChinh} disabled={dangGui || !!chungMoiHon} onClick={() => void luuVaSang()}>{dangGui ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {nhung ? (nhung.phan === 'viet' ? 'Lưu và sang Đề bài viết' : 'Lưu và sang Soạn câu hỏi') : 'Lưu và sang Tạo đề'} <ArrowRight className="w-4 h-4" /></button>}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2">
            <Link href={hrefMaTran()} className={nutPhu}><ArrowLeft className="w-4 h-4" /> Về ma trận</Link>
          </div>
        </>
      )}
    </div>
  );
}
