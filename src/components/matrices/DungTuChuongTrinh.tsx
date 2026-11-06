'use client';

/**
 * Dựng khung ma trận từ chương trình, dùng khi tổ chưa có ma trận chung.
 * Chọn kì kiểm tra → app lọc sẵn các bài đúng giai đoạn từ PPCT → giáo viên tick bài cần đưa vào ma trận
 * → AI gợi ý YCCĐ cho từng bài (giáo viên sửa) → số câu, tỉ lệ mức → khung nháp.
 * Khung nháp đi tiếp vào đúng quy trình cũ: xem, sửa, kiểm tra, xác nhận.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { MAU_MA_TRAN_CHUNG } from '@/core/matrix/templates';
import {
  DANH_SACH_KY,
  chiaCauTheoBai,
  dungMaTranTuChuongTrinh,
  khoangTuanTheoKy,
  nhomBaiTrongPhamVi,
  type KyDung,
  type TietPpct,
} from '@/core/matrix/dung-tu-chuong-trinh';
import type { YccdChuongTrinh } from '@/core/chuong-trinh/mon';
import type { MaTranChung } from '@/types/matrix-template';

const khoaBai = (idNhom: string, bi: number) => `${idNhom}#${bi}`;
const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const oNhap = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white w-24';

/** Một bài: ô tick đưa vào ma trận, tên bài như PPCT, YCCĐ đã ghép. Danh sách tick YCCĐ chỉ vẽ khi mở để trang nhẹ. */
function DongBai({
  ten, soTiet, tuan, duocChon, onChon, dsYccd, chon, dangGhep, onBatTat,
}: {
  ten: string; soTiet: number; tuan: string; duocChon: boolean; onChon: () => void;
  dsYccd: YccdChuongTrinh[]; chon: string[]; dangGhep: boolean; onBatTat: (id: string) => void;
}) {
  const [mo, setMo] = useState(false);
  return (
    <details onToggle={(e) => setMo((e.currentTarget as HTMLDetailsElement).open)} className={duocChon ? '' : 'opacity-60'}>
      <summary className="cursor-pointer text-sm py-1 flex flex-wrap items-center gap-x-2">
        <input type="checkbox" aria-label={`Chọn ${ten}`} className="w-4 h-4" checked={duocChon} onChange={onChon} />
        <span className="text-slate-900">{ten}</span>
        <span className="text-slate-500">· {soTiet} tiết · {tuan}</span>
        {duocChon && (
          <span className={`rounded-full px-2 py-0.5 text-xs ${chon.length ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            {dangGhep ? '…' : `${chon.length} YCCĐ`}
          </span>
        )}
      </summary>
      {mo && duocChon && (
        <div className="mt-1 mb-2 ml-6 max-h-64 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2">
          {dsYccd.map((y) => (
            <label key={y.id} className="flex items-start gap-2 text-sm text-slate-800">
              <input type="checkbox" className="mt-1" checked={chon.includes(y.id)} onChange={() => onBatTat(y.id)} />
              <span><span className="text-xs text-slate-500">{y.mach ?? ''}{y.chuDe ? ` › ${y.chuDe}` : ''}</span><br />{y.noiDung}</span>
            </label>
          ))}
        </div>
      )}
    </details>
  );
}

export function DungTuChuongTrinh({
  maMon,
  tenMon,
  ky,
  onDung,
  onQuayLai,
}: {
  maMon: string;
  tenMon: string;
  ky: KyDung;
  onDung: (m: MaTranChung) => void;
  onQuayLai: () => void;
}) {
  const mau = MAU_MA_TRAN_CHUNG.find((m) => m.ma_mon === maMon) ?? MAU_MA_TRAN_CHUNG[0];
  const goiY = mau.ti_le_muc_quy_dinh;
  const goiYHopLe = goiY && [goiY['1'], goiY['2'], goiY['3']].every((x) => Number.isInteger(x / 5) && x >= 0);
  const thongTinKy = DANH_SACH_KY.find((k) => k.ma === ky) ?? DANH_SACH_KY[1];

  const [tiet, setTiet] = useState<TietPpct[] | null>(null);
  const [yccd, setYccd] = useState<YccdChuongTrinh[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tuanTu, setTuanTu] = useState(1);
  const [tuanDen, setTuanDen] = useState(18);
  const [soCau, setSoCau] = useState(10);
  const [thoiGian, setThoiGian] = useState(mau.thoi_gian_phut ?? 40);
  const [m1, setM1] = useState(goiYHopLe ? goiY['1'] : 50);
  const [m2, setM2] = useState(goiYHopLe ? goiY['2'] : 30);
  const [m3, setM3] = useState(goiYHopLe ? goiY['3'] : 20);
  /** Mặc định mọi bài trong kì đều được chọn; giáo viên bỏ tick bài không đưa vào đề. Lưu các bài bị bỏ. */
  const [boQua, setBoQua] = useState<Set<string>>(new Set());
  const [ghep, setGhep] = useState<Record<string, string[]>>({});
  const [dangGhep, setDangGhep] = useState<string | null>(null);
  const [tienDo, setTienDo] = useState<{ xong: number; tong: number } | null>(null);
  const [loiAI, setLoiAI] = useState<string | null>(null);
  const [ketQuaDung, setKetQuaDung] = useState<{ loi: string[]; canhBao: string[] } | null>(null);

  useEffect(() => {
    let huy = false;
    setTiet(null);
    setYccd(null);
    setLoi(null);
    Promise.all([
      fetch(`/api/chuong-trinh/ppct?mon=${maMon}&lop=4`).then((r) => r.json()),
      fetch(`/api/chuong-trinh/yccd?mon=${maMon}&lop=4&trangThai=DA_DUYET`).then((r) => r.json()),
    ])
      .then(([p, y]) => {
        if (huy) return;
        if (p.error) throw new Error(p.error);
        if (y.error) throw new Error(y.error);
        setTiet(p.tiet);
        setYccd(y.yccd);
      })
      .catch((e: unknown) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); });
    return () => { huy = true; };
  }, [maMon]);

  // Đổi kì (hoặc vừa tải xong PPCT): đặt lại khoảng tuần theo kì và chọn lại toàn bộ bài trong kì
  useEffect(() => {
    if (!tiet) return;
    const k = khoangTuanTheoKy(tiet, ky);
    setTuanTu(k.tuanTu);
    setTuanDen(k.tuanDen);
    setBoQua(new Set());
  }, [tiet, ky]);

  const nhom = useMemo(() => (tiet ? nhomBaiTrongPhamVi(tiet, tuanTu, tuanDen) : []), [tiet, tuanTu, tuanDen]);
  const tuanToiDa = useMemo(() => Math.max(1, ...(tiet ?? []).map((t) => t.tuan ?? 0)), [tiet]);
  const theoId = useMemo(() => new Map((yccd ?? []).map((y) => [y.id, y])), [yccd]);
  const tongTL = m1 + m2 + m3;
  const duocChon = (idNhom: string, bi: number) => !boQua.has(khoaBai(idNhom, bi));
  const soBaiChon = nhom.reduce((s, n) => s + n.chiTiet.filter((_, bi) => duocChon(n.id, bi)).length, 0);
  const soBaiTong = nhom.reduce((s, n) => s + n.chiTiet.length, 0);
  const tongTietChon = nhom.reduce((s, n) => s + n.chiTiet.reduce((a, b, bi) => a + (duocChon(n.id, bi) ? b.soTiet : 0), 0), 0);

  const doiChon = (khoa: string[], bat: boolean) =>
    setBoQua((cu) => {
      const moi = new Set(cu);
      for (const k of khoa) { if (bat) moi.delete(k); else moi.add(k); }
      return moi;
    });
  const khoaCuaNhom = (idNhom: string, n: number) => Array.from({ length: n }, (_, bi) => khoaBai(idNhom, bi));

  const ghepBangAI = async () => {
    setLoiAI(null);
    setKetQuaDung(null);
    const can = nhom.filter((n) => n.chiTiet.some((_, bi) => duocChon(n.id, bi)));
    setTienDo({ xong: 0, tong: can.length });
    const moi = { ...ghep };
    for (let i = 0; i < can.length; i++) {
      const n = can[i];
      setDangGhep(n.id);
      const chiSo = n.chiTiet.map((_, bi) => bi).filter((bi) => duocChon(n.id, bi));
      try {
        const r = await fetch('/api/chuong-trinh/gan-bai-yccd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mon: maMon, lop: 4, chuDe: n.chuDe, bai: chiSo.map((bi) => n.chiTiet[bi].ten) }),
        });
        const j = (await r.json()) as { theoBai?: string[][]; error?: string };
        if (!r.ok || !j.theoBai) throw new Error(j.error ?? 'AI không trả kết quả.');
        j.theoBai.forEach((ids, k) => { moi[khoaBai(n.id, chiSo[k])] = ids; });
        setGhep({ ...moi });
      } catch (e) {
        setLoiAI(`${n.chuDe}: ${e instanceof Error ? e.message : 'lỗi'}. Các chủ đề còn lại thầy ghép tay hoặc bấm lại.`);
        break;
      }
      setTienDo({ xong: i + 1, tong: can.length });
    }
    setDangGhep(null);
    setTienDo(null);
  };

  const batTat = (khoa: string, idYccd: string) =>
    setGhep((g) => {
      const cu = g[khoa] ?? [];
      return { ...g, [khoa]: cu.includes(idYccd) ? cu.filter((x) => x !== idYccd) : [...cu, idYccd] };
    });

  const dung = () => {
    const chia = chiaCauTheoBai(
      nhom.map((n) => ({
        chuDe: n.chuDe,
        bai: n.chiTiet
          .map((b, bi) => ({ b, bi }))
          .filter(({ bi }) => duocChon(n.id, bi))
          .map(({ b, bi }) => ({
            ten: b.ten,
            soTiet: b.soTiet,
            yccd: (ghep[khoaBai(n.id, bi)] ?? []).map((id) => theoId.get(id)?.noiDung).filter((x): x is string => !!x),
          })),
      })),
      soCau,
    );
    const kq = dungMaTranTuChuongTrinh({
      maMon,
      tenMon,
      lop: mau.lop,
      nam_hoc: mau.nam_hoc,
      ky,
      tieuDeKy: thongTinKy.tieuDe,
      thoiGianPhut: thoiGian || null,
      truong: mau.truong,
      soCau,
      tiLeMuc: { m1, m2, m3 },
      ghiChuPhamVi: `Kì kiểm tra: ${thongTinKy.ten}. Phạm vi: tuần ${tuanTu} đến tuần ${tuanDen} của phân phối chương trình, ${soBaiChon}/${soBaiTong} bài được chọn (${tongTietChon} tiết).`,
      dong: chia.dong,
    });
    const canhBao = [...kq.canhBao];
    if (chia.baiKhongCau > 0) canhBao.push(`${chia.baiKhongCau} bài đã chọn chưa có câu nào (số câu ít hơn số bài). Tăng số câu hoặc bỏ bớt bài nếu muốn phủ đều.`);
    if (chia.baiThieuYccd.length > 0) canhBao.push(`${chia.baiThieuYccd.length} bài đã chọn chưa ghép YCCĐ nên không được gắn câu: ${chia.baiThieuYccd.slice(0, 6).join('; ')}${chia.baiThieuYccd.length > 6 ? '…' : ''}.`);
    setKetQuaDung({ loi: kq.loi, canhBao });
    if (kq.maTran) onDung(kq.maTran);
  };

  const sanSang = tiet && yccd;
  const khongCoPpct = sanSang && tiet.length === 0;
  const khongCoYccd = sanSang && yccd.length === 0;

  return (
    <div className="space-y-4">
      <div className="the-tke p-6 space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Dựng khung ma trận từ chương trình – {tenMon} – {thongTinKy.ten}</h2>
        <p className="text-sm text-slate-600">
          Dùng khi tổ chưa có ma trận chung. Ứng dụng lọc sẵn các bài đúng giai đoạn của kì kiểm tra trong phân phối chương trình. Thầy tick những bài cần đưa vào đề, ghép YCCĐ đã duyệt, rồi chia số câu theo số tiết.
          Khung chỉ là bản nháp, thầy sửa được ở bước sau và phải xác nhận mới dùng để soạn đề.
        </p>
        {!sanSang && !loi && <p className="text-sm text-slate-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải phân phối chương trình và YCCĐ…</p>}
        {loi && <p className="text-sm text-red-700">{loi}</p>}
        {khongCoPpct && <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 p-2">Chưa có phân phối chương trình của {tenMon}. Vào mục Phân phối chương trình để nhập.</p>}
        {khongCoYccd && (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 p-2">
            Kho chương trình chưa có YCCĐ đã duyệt cho {tenMon} lớp 4. Vào <a className="underline" href="/chuong-trinh">Kho chương trình GDPT 2018</a>, cho AI trích YCCĐ rồi duyệt.
          </p>
        )}
      </div>

      {sanSang && !khongCoPpct && !khongCoYccd && (
        <>
          <div className="the-tke p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">1. Chọn bài đưa vào ma trận</h3>
              <button type="button" className={nutPhu} disabled={!!dangGhep || soBaiChon === 0} onClick={ghepBangAI}>
                {dangGhep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {tienDo ? `AI đang ghép ${tienDo.xong}/${tienDo.tong}` : 'AI gợi ý YCCĐ cho các bài đã chọn'}
              </button>
            </div>
            <p className="text-sm text-slate-600">
              {thongTinKy.ten}: tuần {tuanTu} đến tuần {tuanDen}, đã chọn <b>{soBaiChon}/{soBaiTong} bài</b> ({tongTietChon} tiết). Bỏ tick bài không đưa vào đề. Mở từng bài để xem hoặc sửa YCCĐ đã ghép; bài chưa có YCCĐ sẽ không được gắn câu.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={nutPhu} onClick={() => setBoQua(new Set())}>Chọn tất cả</button>
              <button type="button" className={nutPhu} onClick={() => setBoQua(new Set(nhom.flatMap((n) => khoaCuaNhom(n.id, n.chiTiet.length))))}>Bỏ chọn tất cả</button>
              <details className="text-sm">
                <summary className="cursor-pointer px-2 py-2.5 text-slate-600">Đổi khoảng tuần</summary>
                <div className="flex gap-3 mt-1">
                  <label className="text-sm text-slate-700">Từ tuần<br /><input type="number" min={1} max={tuanToiDa} className={oNhap} value={tuanTu} onChange={(e) => setTuanTu(Math.max(1, Number(e.target.value) || 1))} /></label>
                  <label className="text-sm text-slate-700">Đến tuần<br /><input type="number" min={1} max={tuanToiDa} className={oNhap} value={tuanDen} onChange={(e) => setTuanDen(Math.min(tuanToiDa, Number(e.target.value) || 1))} /></label>
                </div>
              </details>
            </div>
            {nhom.length === 0 && <p className="text-sm text-amber-800">Không có tiết nào trong khoảng tuần này.</p>}
            {loiAI && <p className="text-sm text-red-700">{loiAI}</p>}
            <div className="divide-y divide-slate-100">
              {nhom.map((n) => {
                const khoa = khoaCuaNhom(n.id, n.chiTiet.length);
                const nChon = khoa.filter((k) => !boQua.has(k)).length;
                const daGhep = n.chiTiet.filter((_, bi) => duocChon(n.id, bi) && (ghep[khoaBai(n.id, bi)] ?? []).length > 0).length;
                return (
                  <details key={n.id} className="py-2" open>
                    <summary className="cursor-pointer text-sm flex flex-wrap items-center gap-x-2">
                      <input
                        type="checkbox"
                        aria-label={`Chọn cả ${n.chuDe}`}
                        className="w-4 h-4"
                        checked={nChon === khoa.length}
                        ref={(el) => { if (el) el.indeterminate = nChon > 0 && nChon < khoa.length; }}
                        onChange={() => doiChon(khoa, nChon !== khoa.length)}
                      />
                      <span className="font-semibold text-slate-900">{n.chuDe}</span>
                      <span className="text-slate-500">· tuần {n.tuanDau}–{n.tuanCuoi} · {nChon}/{khoa.length} bài</span>
                      {nChon > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${daGhep === nChon ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                          {dangGhep === n.id ? 'đang ghép…' : `${daGhep}/${nChon} bài đã ghép YCCĐ`}
                        </span>
                      )}
                    </summary>
                    <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-slate-200 pl-3">
                      {n.chiTiet.map((b, bi) => (
                        <DongBai
                          key={b.ten}
                          ten={b.ten}
                          soTiet={b.soTiet}
                          tuan={`tuần ${n.tuanDau}–${n.tuanCuoi}`}
                          duocChon={duocChon(n.id, bi)}
                          onChon={() => doiChon([khoaBai(n.id, bi)], !duocChon(n.id, bi))}
                          dsYccd={yccd ?? []}
                          chon={ghep[khoaBai(n.id, bi)] ?? []}
                          dangGhep={dangGhep === n.id}
                          onBatTat={(id) => batTat(khoaBai(n.id, bi), id)}
                        />
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          <div className="the-tke p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">2. Cấu trúc đề</h3>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm text-slate-700">Số câu<br /><input type="number" min={3} max={20} className={oNhap} value={soCau} onChange={(e) => setSoCau(Number(e.target.value) || 3)} /></label>
              <label className="text-sm text-slate-700">Thời gian (phút)<br /><input type="number" min={10} max={120} className={oNhap} value={thoiGian} onChange={(e) => setThoiGian(Number(e.target.value) || 0)} /></label>
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Tỉ lệ điểm theo mức (%), tổng 100, mỗi mức là bội số của 5</div>
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm text-slate-700">Mức 1<br /><input type="number" step={5} min={0} max={100} className={oNhap} value={m1} onChange={(e) => setM1(Number(e.target.value) || 0)} /></label>
                <label className="text-sm text-slate-700">Mức 2<br /><input type="number" step={5} min={0} max={100} className={oNhap} value={m2} onChange={(e) => setM2(Number(e.target.value) || 0)} /></label>
                <label className="text-sm text-slate-700">Mức 3<br /><input type="number" step={5} min={0} max={100} className={oNhap} value={m3} onChange={(e) => setM3(Number(e.target.value) || 0)} /></label>
                <span className={`text-sm pb-2 ${tongTL === 100 ? 'text-emerald-700' : 'text-red-700 font-semibold'}`}>Tổng {tongTL}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{goiYHopLe ? 'Điền sẵn theo tỉ lệ ma trận chung của tổ cho môn này, thầy đổi được.' : 'Điền sẵn gợi ý 50 – 30 – 20, thầy nhập theo quy định của tổ.'}</p>
            </div>
          </div>

          {ketQuaDung && (ketQuaDung.loi.length > 0 || ketQuaDung.canhBao.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              {ketQuaDung.loi.map((l) => <div key={l} className="text-red-700 font-medium">{l}</div>)}
              {ketQuaDung.canhBao.map((c) => <div key={c}>{c}</div>)}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className={nutPhu} onClick={onQuayLai}><ArrowLeft className="w-4 h-4" /> Quay lại</button>
        <button type="button" className={nutChinh} disabled={!sanSang || !!khongCoPpct || !!khongCoYccd || !!dangGhep || soBaiChon === 0} onClick={dung}>
          <Wand2 className="w-4 h-4" /> Dựng khung ma trận
        </button>
      </div>
    </div>
  );
}
