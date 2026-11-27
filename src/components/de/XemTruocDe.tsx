'use client';

/**
 * Bản xem trước đề và đáp án, trình bày gần giống bản in: đen trắng, Times New Roman, điểm bên trái,
 * đường kẻ dọc, phương án A–B / C–D hai bên, dòng chấm chừa chỗ làm bài. Xuất Word dùng cùng quy tắc.
 * Màn Xem đề ở bước 4 truyền thêm chỗ lệch từng câu và nút sửa: các phần này chỉ hiện trên màn hình, không in.
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ListChecks, Pencil } from 'lucide-react';
import { ChuPhanSo as PS } from '@/components/de/ChuPhanSo';
import { NHAN_LUA_CHON, chiSoHinhChuaGan, dapAnHienThi, laDienChoCham, laPhanCauTach, moRongChoCham, tachDeBaiTheoKhung, nhanCau, soDongTraLoi, tachYTrongDeBai, type CauDe, type DeKiemTra } from '@/core/de/de';
import { useAuth } from '@/core/contexts/AuthContext';

const fmt = (x: number) => String(x).replace('.', ',');
const dong = (t: string) => t.split(/\n+/).filter((x) => x.trim());

function PhuongAn({ c }: { c: CauDe }) {
  const ds = NHAN_LUA_CHON.map((n, i) => ({ n, v: (c.luaChon[i] ?? '').trim() })).filter((x) => x.v);
  if (!ds.length) return c.dang === 'NLC' ? null : <DongCham n={1} />;
  const dai = ds.some((x) => x.v.length > 34) || ds.length < 4;
  return (
    <div className={dai ? 'pl-4 space-y-1' : 'pl-4 grid grid-cols-2 gap-x-4 gap-y-1.5'}>
      {ds.map((x) => <div key={x.n}>{x.n}. <PS chu={x.v} /></div>)}
    </div>
  );
}

function DongCham({ n, cao = 28 }: { n: number; cao?: number }) {
  return <div aria-hidden>{Array.from({ length: n }, (_, i) => <div key={i} style={{ height: cao }} className="border-b border-dotted border-black" />)}</div>;
}

function LuoiY({ y, datTinh }: { y: { nhan: string; nd: string }[]; datTinh: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-1">
      {y.map((k) => (
        <div key={k.nhan}>
          <div><b>{k.nhan})</b> <PS chu={k.nd} /></div>
          <DongCham n={datTinh ? 5 : 3} cao={30} />
        </div>
      ))}
    </div>
  );
}

/** Phần sau của câu chia ý (Câu 8 b, c, d nối tiếp Câu 8 a): không in lại nhãn câu. */
const noiTiep = (ds: CauDe[], i: number) => i > 0 && ds[i - 1].cau === ds[i].cau && laPhanCauTach(ds[i]);

function MotCau({ c, maMon, tiep = false }: { c: CauDe; maMon: string; tiep?: boolean }) {
  const dien = laDienChoCham(c);
  const nhieuY = !dien && c.hinhThuc === 'TL' && c.dang !== 'DS' && c.dang !== 'VIET' ? tachYTrongDeBai(c.deBai) : null;
  const doan = tachDeBaiTheoKhung(nhieuY ? nhieuY.dau || (tiep || laPhanCauTach(c) ? '' : 'Thực hiện các yêu cầu sau:') : dien ? moRongChoCham(c.deBai) : c.deBai);
  const iPhai = (c.hinh ?? []).findIndex((h) => h.canh === 'PHAI' && h.anh);
  const conLai = chiSoHinhChuaGan(c).filter((i) => i !== iPhai).map((i) => (c.hinh ?? [])[i]).filter((h) => h?.anh);
  const hPhai = iPhai >= 0 ? (c.hinh ?? [])[iPhai] : undefined;
  const manhHinh = (h: NonNullable<CauDe['hinh']>[number] | undefined, k: number) => h?.anh ? (
    <figure key={k} className="text-center m-0 py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={h.anh} alt={h.chuThich || h.ten} className="mx-auto max-h-[200px] object-contain" />
      {h.chuThich.trim() && <figcaption className="text-[15px]">{h.chuThich}</figcaption>}
    </figure>
  ) : <div key={k} className="italic text-slate-400 border border-dashed border-slate-300 py-3 text-center">[Hình {doan[k]?.khung}: chưa có ảnh]</div>;
  const nhanC = tiep ? null : <b>{/^\d+$/.test(c.cau) ? `Câu ${c.cau}. ` : `${c.cau}: `}</b>;
  return (
    <div className="grid grid-cols-[84px_1fr] break-inside-avoid">
      <div className="pr-2 pt-1 border-r border-black">…/{fmt(c.diem)}đ</div>
      <div className="pl-3 pb-3 space-y-1.5 leading-[1.55]">
        {doan.length === 0 && nhieuY && nhanC && <div>{nhanC}</div>}
        {doan.length === 0 && !nhieuY && <div>{nhanC}<i className="text-slate-400">(chưa có đề bài)</i></div>}
        {(() => {
          const cacDoan = doan.map((d, k) => d.khung !== undefined
            ? (hPhai && d.khung - 1 === iPhai ? null : manhHinh((c.hinh ?? [])[d.khung - 1], k))
            : <div key={k} className="font-bold">{k === 0 && nhanC}<PS chu={d.chu ?? ''} /></div>);
          if (!hPhai) return cacDoan;
          return (
            <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
              <div className="space-y-1.5">{cacDoan}</div>
              <figure className="text-center m-0 py-1" style={{ maxWidth: 200 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hPhai.anh} alt={hPhai.chuThich || hPhai.ten} className="mx-auto max-h-[200px] object-contain" />
                {hPhai.chuThich.trim() && <figcaption className="text-[15px]">{hPhai.chuThich}</figcaption>}
              </figure>
            </div>
          );
        })()}
        {conLai.length > 0 ? (
          <div className="flex flex-wrap items-end justify-around gap-3 py-1">
            {conLai.map((h, i) => (
              <figure key={i} className="text-center m-0" style={{ maxWidth: `${Math.floor(96 / Math.min(4, conLai.length))}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h!.anh} alt={h!.chuThich || h!.ten} className="mx-auto max-h-[200px] object-contain" />
                {h!.chuThich.trim() && <figcaption className="text-[15px]">{h!.chuThich}</figcaption>}
              </figure>
            ))}
          </div>
        ) : !(c.hinh ?? []).length && c.ghiChuHinh.trim() && <div className="italic">[{c.ghiChuHinh.trim()}]</div>}
        {c.dang === 'DS' ? (
          (c.yNho ?? c.luaChon.map((_, i) => String.fromCharCode(97 + i))).map((y, i) => (
            <div key={y} className="pl-3 flex justify-between gap-4"><span>{y}) <PS chu={c.luaChon[i] ?? ''} /></span><span className="shrink-0">Đ / S</span></div>
          ))
        ) : nhieuY ? <LuoiY y={nhieuY.y} datTinh={nhieuY.datTinh} /> : c.hinhThuc === 'TN' ? <PhuongAn c={c} /> : <DongCham n={soDongTraLoi(c, maMon)} cao={maMon === 'TOAN' ? 32 : 29} />}
      </div>
    </div>
  );
}

/** Nút sửa và chỗ lệch của một câu, đặt ngay trên câu đó (chỉ để xem trên màn hình). */
export interface CongCuSuaCau {
  /** Chỗ lệch đặc tả của từng câu (khóa câu → các lỗi). */
  lech?: Record<string, string[]>;
  /** Mở câu ở bước 4 (soạn đề). */
  onSuaCau?: (khoa: string) => void;
  /** Đường dẫn mở câu ở bước 3 (đặc tả). */
  hrefDacTa?: (khoa: string) => string;
}

function ThanhSuaCau({ c, cc }: { c: CauDe; cc: CongCuSuaCau }) {
  const lech = cc.lech?.[c.khoa] ?? [];
  if (!cc.onSuaCau && !cc.hrefDacTa && !lech.length) return null;
  return (
    <div className={`print:hidden font-sans text-sm rounded-lg px-3 py-2 mt-2 mb-1 flex flex-wrap items-start gap-2 ${lech.length ? 'border border-red-300 bg-red-50' : 'border border-slate-200 bg-slate-50'}`} style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="flex-1 min-w-48">
        {lech.length ? (
          <ul className="text-red-800 space-y-0.5">
            {lech.map((x) => <li key={x} className="flex gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{nhanCau(c)}: {x}</li>)}
          </ul>
        ) : <span className="text-slate-500">{nhanCau(c)}: khớp đặc tả</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cc.onSuaCau && <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100" onClick={() => cc.onSuaCau!(c.khoa)}><Pencil className="w-3.5 h-3.5" /> Sửa câu này</button>}
        {cc.hrefDacTa && <Link href={cc.hrefDacTa(c.khoa)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50" title="Sai từ gốc (YCCĐ, dạng bài, bài học): sửa ở đặc tả"><ListChecks className="w-3.5 h-3.5" /> Sửa ở bước Đặc tả</Link>}
      </div>
    </div>
  );
}

export function XemTruocDe({ de, truong, tenMon, phut, congCu, tieuDe = 'Xem trước', chiPhan }: { de: DeKiemTra; truong: string; tenMon: string; phut: number; congCu?: CongCuSuaCau; tieuDe?: string; /** Đề Tiếng Việt: chỉ hiện một phần */ chiPhan?: 'docHieu' | 'viet' }) {
  const { khoiLamViec } = useAuth();
  const [tab, setTab] = useState<'de' | 'dap-an'>('de');
  const cau = [...de.cau].sort((a, b) => (/^\d+$/.test(a.cau) ? Number(a.cau) : 1e9) - (/^\d+$/.test(b.cau) ? Number(b.cau) : 1e9));
  const tong = Math.round(cau.reduce((s, c) => s + c.diem, 0) * 100) / 100;
  // Đề Tiếng Việt: đọc thành tiếng, đọc hiểu (kèm bài đọc), viết
  const tvGoc = de.ma_mon === 'TIENG_VIET' ? de.tiengViet : undefined;
  const tv = tvGoc && chiPhan ? { ...tvGoc, baiDocThanhTieng: [] } : tvGoc;
  const hienDoc = chiPhan !== 'viet';
  const cauViet = cau.filter((c) => c.khoa.startsWith('viet/'));
  const cauDoc = cau.filter((c) => !c.khoa.startsWith('viet/'));
  return (
    <div className="the-tke p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-slate-900 mr-2">{tieuDe}</h2>
        {([['de', 'Đề kiểm tra'], ['dap-an', 'Đáp án, hướng dẫn chấm']] as const).map(([k, t]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-lg border px-3 py-1.5 text-sm ${tab === k ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-300 bg-white text-slate-700'}`}>{t}</button>
        ))}
        <span className="text-xs text-slate-500">Gần giống bản in; bản Word xuất theo đúng cách xếp này.</span>
      </div>
      <div className="mx-auto max-w-[820px] border border-slate-300 bg-white p-6 text-black text-[17px] overflow-x-auto" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="text-center mb-3">
          <div className="font-bold">{truong}</div>
          <div className="font-bold">{tab === 'de' ? `ĐỀ KIỂM TRA MÔN ${tenMon.toUpperCase()} - Lớp ${khoiLamViec}` : `HƯỚNG DẪN CHẤM MÔN ${tenMon.toUpperCase()} - LỚP ${khoiLamViec}`}</div>
          {tab === 'de' && <div>Thời gian: {phut} phút</div>}
        </div>
        {tab === 'de' && tv ? (
          <div className="space-y-3">
            {hienDoc && <div className="font-bold">A. KIỂM TRA ĐỌC</div>}
            {!chiPhan && <div className="font-bold">I. Đọc thành tiếng</div>}
            {tv.baiDocThanhTieng.map((b, i) => (
              <div key={i} className="space-y-1">
                {congCu?.onSuaCau && <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100" onClick={() => congCu.onSuaCau!(`doc/doc_thanh_tieng/${i + 1}`)}><Pencil className="w-3.5 h-3.5" /> Sửa bài, câu hỏi này</button>}
                <div className="font-bold">Bài {i + 1}: {b.tieuDe || '(chưa chọn bài)'}</div>
                <div className="whitespace-pre-line">{b.noiDung}</div>
                {(b.tacGia || b.nguon) && <div className="text-right italic">{b.tacGia}{b.nguon ? ` (${b.nguon})` : ''}</div>}
                <div><b>Câu hỏi:</b> {b.cauHoi || <span className="text-red-700">(chưa có)</span>}</div>
              </div>
            ))}
            {hienDoc && <>
            <div className="font-bold">II. Đọc hiểu</div>
            <div className="text-center font-bold">{tv.baiDocHieu.tieuDe || '(chưa chọn bài đọc hiểu)'}</div>
            <div className="whitespace-pre-line">{tv.baiDocHieu.noiDung}</div>
            {(tv.baiDocHieu.tacGia || tv.baiDocHieu.nguon) && <div className="text-right italic">{tv.baiDocHieu.tacGia}{tv.baiDocHieu.nguon ? ` (${tv.baiDocHieu.nguon})` : ''}</div>}
            </>}
            {cauDoc.map((c, i) => (
              <div key={c.khoa} id={`xem-${c.khoa}`}>
                {congCu && <ThanhSuaCau c={c} cc={congCu} />}
                <MotCau c={c} maMon={de.ma_mon} tiep={noiTiep(cauDoc, i)} />
              </div>
            ))}
            {cauViet.length > 0 && <div className="font-bold pt-2">B. KIỂM TRA VIẾT</div>}
            {cauViet.map((c) => (
              <div key={c.khoa} id={`xem-${c.khoa}`}>
                {congCu && <ThanhSuaCau c={c} cc={congCu} />}
                <MotCau c={c} maMon={de.ma_mon} />
              </div>
            ))}
            {!chiPhan && <div className="text-center font-bold pt-2">HẾT ĐỀ</div>}
          </div>
        ) : tab === 'de' ? (
          <div>{cau.map((c, i) => (
            <div key={c.khoa} id={`xem-${c.khoa}`}>
              {congCu && <ThanhSuaCau c={c} cc={congCu} />}
              <MotCau c={c} maMon={de.ma_mon} tiep={noiTiep(cau, i)} />
            </div>
          ))}<div className="text-center font-bold pt-2">HẾT ĐỀ</div></div>
        ) : (
          <table className="w-full border-collapse text-[16px]">
            <thead><tr><th className="border border-black p-1 w-16">Câu</th><th className="border border-black p-1">Đáp án, hướng dẫn chấm</th><th className="border border-black p-1 w-16">Điểm</th></tr></thead>
            <tbody>
              {tv && tv.baiDocThanhTieng.map((b, i) => (
                <tr key={`tt-${i}`} className="align-top">
                  <td className="border border-black p-1 text-center">Đọc {i + 1}</td>
                  <td className="border border-black p-1.5 leading-[1.5]"><div><b>{b.tieuDe}</b>: {b.cauHoi}</div><div>Trả lời: {b.traLoi || <span className="text-red-700">(chưa có)</span>}</div></td>
                  <td className="border border-black p-1 text-center" />
                </tr>
              ))}
              {cau.map((c) => {
                const lamRo = c.hinhThuc === 'TL' && c.dang !== 'VIET';
                const da = dapAnHienThi(c).trim();
                return (
                  <tr key={c.khoa} className="align-top">
                    <td className="border border-black p-1 text-center">{nhanCau(c).replace(/^Câu /, '')}</td>
                    <td className="border border-black p-1.5 leading-[1.5]">
                      {da && <div>{lamRo && <b>Đáp án: </b>}{lamRo ? <b><PS chu={da} /></b> : <PS chu={da} />}</div>}
                      {lamRo && c.huongDanCham.trim() && <div className="font-bold mt-1">Cách chấm:</div>}
                      {(c.hinhThuc === 'TL') && dong(c.huongDanCham).map((d, i) => <div key={i} className={lamRo ? 'pl-3' : ''}><PS chu={d} /></div>)}
                    </td>
                    <td className="border border-black p-1 text-center">{fmt(c.diem)}</td>
                  </tr>
                );
              })}
              <tr><td className="border border-black p-1" /><td className="border border-black p-1 text-right font-bold">Tổng</td><td className="border border-black p-1 text-center font-bold">{fmt(tong)}</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
