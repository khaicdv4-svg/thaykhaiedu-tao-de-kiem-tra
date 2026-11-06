'use client';

/**
 * Dựng khung ma trận môn Tiếng Việt từ chương trình (khi tổ chưa có ma trận chung).
 * Tiếng Việt có cấu trúc cố định của tổ (bài Đọc 10 điểm, bài Viết 10 điểm) nên thầy không phải chia số câu hay tỉ lệ mức.
 * Thầy chỉ chọn: khoảng tuần của kì, các kiểu bài viết đã luyện. Phần còn lại ứng dụng lấy từ PPCT, Kho YCCĐ và Bộ não của tổ.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Wand2 } from 'lucide-react';
import { DANH_SACH_KY, khoangTuanTheoKy, type KyDung, type TietPpct } from '@/core/matrix/dung-tu-chuong-trinh';
import {
  dungKhungTiengViet,
  kieuBaiVietTrongPhamVi,
  noiDungLuyenTuVaCau,
  type TietTiengViet,
  type YccdTiengViet,
} from '@/core/matrix/dung-tieng-viet';
import { khoangDoDai, chuDiemCuaKy } from '@/core/reading-passages/quy-dinh';
import { lamSachBoNao, type BoNao } from '@/core/bo-nao/bo-nao';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import type { MaTranChung } from '@/types/matrix-template';

type TietApi = TietPpct & { tietTen: string | null };

const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const oNhap = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white w-24';

export function DungTiengViet({
  ky,
  onDung,
  onQuayLai,
}: {
  ky: KyDung;
  onDung: (m: MaTranChung) => void;
  onQuayLai: () => void;
}) {
  const mau = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === 'TIENG_VIET') ?? MAU_MA_TRAN_CHUNG[0];
  const thongTinKy = DANH_SACH_KY.find((k) => k.ma === ky) ?? DANH_SACH_KY[1];

  const [tiet, setTiet] = useState<TietApi[] | null>(null);
  const [yccd, setYccd] = useState<YccdTiengViet[] | null>(null);
  const [boNao, setBoNao] = useState<BoNao | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tuanTu, setTuanTu] = useState(1);
  const [tuanDen, setTuanDen] = useState(18);
  /** Lựa chọn tay của thầy theo mã kiểu bài; chưa chạm tới thì mặc định tick các kiểu đã có tiết trả bài. */
  const [daChonTay, setDaChonTay] = useState<Record<string, boolean>>({});
  const [ketQua, setKetQua] = useState<{ loi: string[]; canhBao: string[] } | null>(null);

  useEffect(() => {
    let huy = false;
    setTiet(null);
    setYccd(null);
    setLoi(null);
    Promise.all([
      fetch('/api/chuong-trinh/ppct?mon=TIENG_VIET&lop=4').then((r) => r.json()),
      fetch('/api/chuong-trinh/yccd?mon=TIENG_VIET&lop=4&trangThai=DA_DUYET').then((r) => r.json()),
      fetch('/api/bo-nao').then((r) => r.json()).catch(() => null),
    ])
      .then(([p, y, b]) => {
        if (huy) return;
        if (p.error) throw new Error(p.error);
        if (y.error) throw new Error(y.error);
        setTiet(p.tiet);
        setYccd(y.yccd);
        setBoNao(b?.boNao ? lamSachBoNao(b.boNao) : null); // chưa có bộ não thì dùng số mặc định của tổ
      })
      .catch((e: unknown) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); });
    return () => { huy = true; };
  }, []);

  useEffect(() => {
    if (!tiet) return;
    const k = khoangTuanTheoKy(tiet, ky);
    setTuanTu(k.tuanTu);
    setTuanDen(k.tuanDen);
    setDaChonTay({});
  }, [tiet, ky]);

  const tietTV: TietTiengViet[] = useMemo(() => tiet ?? [], [tiet]);
  const tuanToiDa = useMemo(() => Math.max(1, ...(tiet ?? []).map((t) => t.tuan ?? 0)), [tiet]);
  const kieu = useMemo(() => kieuBaiVietTrongPhamVi(tietTV, tuanTu, tuanDen), [tietTV, tuanTu, tuanDen]);
  const soLtvc = useMemo(() => noiDungLuyenTuVaCau(tietTV, tuanTu, tuanDen).length, [tietTV, tuanTu, tuanDen]);
  const duocChon = (ma: string, daTraBai: boolean) => daChonTay[ma] ?? daTraBai;
  const soDocHieuKho = (yccd ?? []).filter((y) => y.mach === 'Đọc hiểu' && /Đọc hiểu|Liên hệ/.test(y.chuDe ?? '')).length;

  const chuDiem = chuDiemCuaKy(ky, boNao);
  const tocDo = khoangDoDai('DOC_THANH_TIENG', ky, 'TRUYEN', boNao);

  const dung = () => {
    const kq = dungKhungTiengViet({
      ky,
      tieuDeKy: thongTinKy.tieuDe,
      namHoc: mau.nam_hoc,
      truong: mau.truong,
      thoiGianPhut: mau.thoi_gian_phut,
      tuanTu,
      tuanDen,
      tiet: tietTV,
      yccd: yccd ?? [],
      kieuBaiViet: kieu.filter((k) => duocChon(k.ma, k.daTraBai)),
      boNao,
    });
    setKetQua({ loi: kq.loi, canhBao: kq.canhBao });
    if (kq.maTran) onDung(kq.maTran);
  };

  const sanSang = !!tiet && !!yccd;
  const khongCoPpct = sanSang && tiet.length === 0;
  const khongCoYccd = sanSang && yccd.length === 0;
  const soKieuChon = kieu.filter((k) => duocChon(k.ma, k.daTraBai)).length;

  return (
    <div className="space-y-4">
      <div className="the-tke p-6 space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Dựng khung ma trận từ chương trình – Tiếng Việt – {thongTinKy.ten}</h2>
        <p className="text-sm text-slate-600">
          Đề Tiếng Việt có cấu trúc cố định của tổ nên thầy không phải chia số câu hay tỉ lệ mức. Ứng dụng giữ đúng bộ khung đó, lấy chủ điểm, tốc độ đọc, độ dài văn bản từ Bộ não của tổ,
          lấy YCCĐ Đọc hiểu từ Kho chương trình, lấy nội dung Luyện từ và câu và các kiểu bài viết từ phân phối chương trình. Khung chỉ là bản nháp, thầy sửa được ở bước sau và phải xác nhận mới dùng để soạn đề.
        </p>
        {!sanSang && !loi && <p className="text-sm text-slate-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải phân phối chương trình và YCCĐ…</p>}
        {loi && <p className="text-sm text-red-700">{loi}</p>}
        {khongCoPpct && <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 p-2">Chưa có phân phối chương trình của Tiếng Việt. Vào mục Phân phối chương trình để nhập.</p>}
        {khongCoYccd && (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 p-2">
            Kho chương trình chưa có YCCĐ đã duyệt cho Tiếng Việt lớp 4. Vào <a className="underline" href="/chuong-trinh">Kho chương trình GDPT 2018</a>, cho AI trích YCCĐ rồi duyệt.
          </p>
        )}
      </div>

      {sanSang && !khongCoPpct && !khongCoYccd && (
        <>
          <div className="the-tke p-6 space-y-3">
            <h3 className="font-semibold text-slate-900">1. Cấu trúc đề (quy định của tổ, không đổi)</h3>
            <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
              <li><b>Bài Đọc (10 điểm):</b> Đọc thành tiếng 2 điểm; Đọc hiểu 8 điểm gồm 11 câu (văn bản 5 điểm, Kiến thức Tiếng Việt 3 điểm).</li>
              <li><b>Bài Viết (10 điểm):</b> một bài viết, kiểu bài chọn ở bước lập ma trận riêng trong các kiểu thầy tick ở dưới.</li>
              <li>Chủ điểm của kì: <b>{chuDiem.join('; ')}</b>.{tocDo ? ` Tốc độ đọc thành tiếng: ${tocDo.min} – ${tocDo.max} tiếng/phút.` : ''}</li>
            </ul>
            <p className="text-xs text-slate-500">
              Kho chương trình có {soDocHieuKho} YCCĐ Đọc hiểu đã duyệt. Tiết Luyện từ và câu trong khoảng tuần: {soLtvc} nội dung.
              {boNao?.ky[ky] ? ' Số liệu đọc lấy từ Bộ não của tổ.' : ' Bộ não của tổ chưa có số liệu cho kì này, ứng dụng dùng số mặc định của tổ.'}
            </p>
          </div>

          <div className="the-tke p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">2. Chọn kiểu bài viết đã luyện</h3>
              <details className="text-sm">
                <summary className="cursor-pointer px-2 py-1 text-slate-600">Đổi khoảng tuần ({tuanTu}–{tuanDen})</summary>
                <div className="flex gap-3 mt-1">
                  <label className="text-sm text-slate-700">Từ tuần<br /><input type="number" min={1} max={tuanToiDa} className={oNhap} value={tuanTu} onChange={(e) => setTuanTu(Math.max(1, Number(e.target.value) || 1))} /></label>
                  <label className="text-sm text-slate-700">Đến tuần<br /><input type="number" min={1} max={tuanToiDa} className={oNhap} value={tuanDen} onChange={(e) => setTuanDen(Math.min(tuanToiDa, Number(e.target.value) || 1))} /></label>
                </div>
              </details>
            </div>
            <p className="text-sm text-slate-600">
              Đây là các kiểu bài viết có tiết viết bài hoàn chỉnh trong phân phối chương trình từ tuần {tuanTu} đến tuần {tuanDen}. Ứng dụng tự tick những kiểu đã có tiết trả bài. Thầy tick thêm kiểu nào đã trả bài cho học sinh dù PPCT không ghi. Mỗi kiểu thầy tick là một phương án, đề chỉ lấy một kiểu.
            </p>
            {kieu.length === 0 && <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 p-2">Không có tiết Viết nào trong khoảng tuần này. Thầy đổi khoảng tuần hoặc kiểm tra lại phân phối chương trình.</p>}
            <div className="divide-y divide-slate-100">
              {kieu.map((k) => (
                <label key={k.ma} className="flex flex-wrap items-center gap-x-2 py-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={duocChon(k.ma, k.daTraBai)}
                    onChange={() => setDaChonTay((c) => ({ ...c, [k.ma]: !duocChon(k.ma, k.daTraBai) }))}
                  />
                  <span className="text-slate-900">{k.ten}</span>
                  <span className="text-slate-500">· từ tuần {k.tuanDau}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${k.daTraBai ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{k.daTraBai ? 'đã có tiết trả bài' : 'chưa thấy tiết trả bài trong PPCT'}</span>
                </label>
              ))}
            </div>
          </div>

          {ketQua && (ketQua.loi.length > 0 || ketQua.canhBao.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              {ketQua.loi.map((l) => <div key={l} className="text-red-700 font-medium">{l}</div>)}
              {ketQua.canhBao.map((c) => <div key={c}>{c}</div>)}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className={nutPhu} onClick={onQuayLai}><ArrowLeft className="w-4 h-4" /> Quay lại</button>
        <button type="button" className={nutChinh} disabled={!sanSang || khongCoPpct || khongCoYccd || soKieuChon === 0} onClick={dung}>
          <Wand2 className="w-4 h-4" /> Dựng khung ma trận
        </button>
      </div>
    </div>
  );
}
