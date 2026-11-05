/**
 * Xem trước ma trận (chung hoặc riêng) đúng bố cục file Word của tổ khối 4.
 * Ba kiểu bố cục: docs/mau-ma-tran/README-mau-ma-tran.md, mục 2.
 * In trắng đen, Times New Roman.
 */
import React from 'react';
import type { DongMaTran, MaTranChung, MucDo, PhanMaTran } from '@/types/matrix-template';

const fmt = (x: number) => (x ? String(Math.round(x * 100) / 100).replace('.', ',') : '');
const cell = 'border border-black px-1.5 py-1 align-middle text-center';
const cellL = 'border border-black px-1.5 py-1 align-middle text-left';
const th = `${cell} font-bold`;

function rowSpans<T>(rows: T[], key: (r: T) => string | null | undefined): number[] {
  const out: number[] = new Array(rows.length).fill(0);
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && key(rows[j + 1]) === key(rows[i])) j++;
    out[i] = j - i + 1;
    i = j + 1;
  }
  return out;
}

function Yccd({ r }: { r: DongMaTran }) {
  return (
    <>
      {r.nhan && <div className="font-bold italic">{r.nhan}</div>}
      {r.yccd.map((y, i) => (
        <div key={i}>- {y}</div>
      ))}
    </>
  );
}

const nhanCau = (c: { cau: string; y_nho: string[] | null }) =>
  c.y_nho ? `Câu ${c.cau} (${c.y_nho.join(', ')})` : `Câu ${c.cau}`;

function Header({ m }: { m: MaTranChung }) {
  return (
    <div className="flex justify-between text-center mb-3 gap-4">
      <div className="flex-1">
        {m.truong.co_quan_chu_quan}
        <br />
        <b>{m.truong.truong}</b>
      </div>
      <div className="flex-1">
        <b>{m.tieu_de}</b>
        <br />
        <b>NĂM HỌC {m.nam_hoc}</b>
        <br />
        <b>MÔN: {m.mon.toUpperCase()} – LỚP 4</b>
        {m.thoi_gian_phut ? <div>Thời gian làm bài: {m.thoi_gian_phut} phút</div> : null}
      </div>
    </div>
  );
}

function Footer({ m }: { m: MaTranChung }) {
  const [a, b] = m.chu_ky;
  return (
    <div className="flex justify-between text-center mt-4">
      <div className="flex-1 font-bold">{a?.chuc_vu}</div>
      <div className="flex-1">
        <i>
          {m.truong.noi_ky}, {m.ngay_ky}
        </i>
        <br />
        <b>{b?.chuc_vu}</b>
        <div className="h-14" />
        <b>{b?.ho_ten}</b>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Toán
function BangToan({ m }: { m: MaTranChung }) {
  const rows = m.bai_kiem_tra[0].phan[0].dong;
  const rsM = rowSpans(rows, (r) => r.mach);
  const rsN = rowSpans(rows, (r) => `${r.mach}|${r.noi_dung}`);
  const tot = { TN: 0, TL: 0, nTN: 0, nTL: 0, 1: 0, 2: 0, 3: 0 } as Record<string, number>;
  const mach: Record<string, number> = {};
  rows.forEach((r) =>
    r.cau_hoi.forEach((c) => {
      tot[c.hinh_thuc] += c.diem;
      tot[`n${c.hinh_thuc}`] += c.so_cau_tinh;
      tot[c.muc] += c.diem;
      mach[r.mach] = (mach[r.mach] ?? 0) + c.diem;
    }),
  );
  const tenMuc: Record<MucDo, string> = { 1: 'Nhận biết (mức 1)', 2: 'Kết nối (mức 2)', 3: 'Vận dụng (mức 3)' };
  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th rowSpan={2} className={th}>Mạch kiến thức</th>
            <th rowSpan={2} className={th}>Nội dung</th>
            <th className={th}>YÊU CẦU CẦN ĐẠT</th>
            <th rowSpan={2} className={th}>SỐ CÂU</th>
            <th colSpan={2} className={th}>HÌNH THỨC</th>
            <th colSpan={3} className={th}>MỨC ĐỘ</th>
            <th rowSpan={2} className={th}>ĐIỂM</th>
          </tr>
          <tr>
            <th className={th}>Cuối Học kì I</th>
            <th className={th}>TN</th>
            <th className={th}>TL</th>
            <th className={th}>1</th>
            <th className={th}>2</th>
            <th className={th}>3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const c = r.cau_hoi[0];
            return (
              <tr key={i}>
                {rsM[i] > 0 && <td rowSpan={rsM[i]} className={`${cell} font-bold`}>{r.mach}</td>}
                {rsN[i] > 0 && <td rowSpan={rsN[i]} className={`${cell} font-bold`}>{r.noi_dung}</td>}
                <td className={cellL}><Yccd r={r} /></td>
                <td className={cell}>{c && <>{c.so_cau_tinh}<br />{nhanCau(c)}</>}</td>
                <td className={cell}>{c?.hinh_thuc === 'TN' ? c.so_cau_tinh : ''}</td>
                <td className={cell}>{c?.hinh_thuc === 'TL' ? c.so_cau_tinh : ''}</td>
                {[1, 2, 3].map((k) => (
                  <td key={k} className={cell}>{c?.muc === k ? `${fmt(c.diem)}đ` : ''}</td>
                ))}
                <td className={cell}>{c ? `${fmt(c.diem)}đ` : ''}</td>
              </tr>
            );
          })}
          <tr>
            <td className={cell} /><td className={cell} />
            <td className={`${cell} font-bold`}>Tổng số câu</td>
            <td className={`${cell} font-bold`}>{tot.nTN + tot.nTL} câu</td>
            <td className={`${cell} font-bold`}>{tot.nTN}</td>
            <td className={`${cell} font-bold`}>{tot.nTL}</td>
            <td className={cell} /><td className={cell} /><td className={cell} /><td className={cell} />
          </tr>
          <tr>
            <td className={cell} /><td className={cell} />
            <td className={`${cell} font-bold`}>Tổng điểm</td>
            <td className={cell} />
            <td className={`${cell} font-bold`}>{fmt(tot.TN)}</td>
            <td className={`${cell} font-bold`}>{fmt(tot.TL)}</td>
            <td className={`${cell} font-bold`}>{fmt(tot[1])}</td>
            <td className={`${cell} font-bold`}>{fmt(tot[2])}</td>
            <td className={`${cell} font-bold`}>{fmt(tot[3])}</td>
            <td className={`${cell} font-bold`}>{fmt(tot.TN + tot.TL)}đ</td>
          </tr>
        </tbody>
      </table>
      <div className="flex flex-col md:flex-row gap-4 mt-3 text-sm">
        <BangNho tieuDe="Tỉ lệ theo mạch kiến thức" dong={Object.entries(mach).map(([k, v]) => [k.charAt(0) + k.slice(1).toLowerCase(), v])} />
        <BangNho tieuDe="Tỉ lệ điểm theo mức độ" dong={([1, 2, 3] as MucDo[]).map((k) => [tenMuc[k], tot[k]])} />
        <BangNho tieuDe="Tỉ lệ trắc nghiệm / tự luận" dong={[['Trắc nghiệm', tot.TN], ['Tự luận', tot.TL]]} />
      </div>
    </>
  );
}

function BangNho({ tieuDe, dong }: { tieuDe: string; dong: [string, number][] }) {
  return (
    <table className="border-collapse">
      <caption className="font-bold">{tieuDe}</caption>
      <tbody>
        {dong.map(([ten, d]) => (
          <tr key={ten}>
            <td className={cell}>{ten}</td>
            <td className={cell}>{fmt(d)} điểm</td>
            <td className={cell}>{fmt(d * 10)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- KH, LS&ĐL, CN
const TEN_DANG: Record<string, string> = { NLC: 'NLC', DS: 'Đ/S', TLN: 'TLN' };

function BangBai({ m }: { m: MaTranChung }) {
  const rows = m.bai_kiem_tra[0].phan[0].dong;
  const pct = m.ti_le_muc_quy_dinh ?? { '1': 50, '2': 30, '3': 20 };
  const theoNoiDung = !!rows[0]?.noi_dung;
  const rs = rowSpans(rows, (r) => (theoNoiDung ? r.noi_dung : r.mach));
  type K = `${1 | 2 | 3 | 'T'}${'TN' | 'TL'}`;
  const keys: K[] = ['1TN', '1TL', '2TN', '2TL', '3TN', '3TL', 'TTN', 'TTL'];
  const cnt: Record<string, number> = {};
  const pts: Record<string, number> = {};
  rows.forEach((r) =>
    r.cau_hoi.forEach((c) => {
      for (const k of [`${c.muc}${c.hinh_thuc}`, `T${c.hinh_thuc}`]) {
        cnt[k] = (cnt[k] ?? 0) + 1;
        pts[k] = (pts[k] ?? 0) + c.diem;
      }
    }),
  );
  const tongCau = (cnt.TTN ?? 0) + (cnt.TTL ?? 0);
  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th rowSpan={2} className={th}>MẠCH KIẾN THỨC</th>
            <th rowSpan={2} className={th}>YÊU CẦU CẦN ĐẠT</th>
            <th rowSpan={2} className={th}>SỐ CÂU VÀ SỐ ĐIỂM</th>
            {(['1', '2', '3'] as const).map((k) => (
              <th key={k} colSpan={2} className={th}>Mức {k} ({pct[k]}%)</th>
            ))}
            <th colSpan={2} className={th}>Tổng điểm<br />10 điểm</th>
          </tr>
          <tr>
            {keys.map((k) => (
              <th key={k} className={th}>{k.endsWith('TN') ? 'TN' : 'TL/TH'}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const n = r.cau_hoi.reduce((s, c) => s + c.so_cau_tinh, 0);
            const p = r.cau_hoi.reduce((s, c) => s + c.diem, 0);
            return (
              <tr key={i}>
                {rs[i] > 0 && (
                  <td rowSpan={rs[i]} className={cell}>
                    <b>{theoNoiDung ? r.noi_dung : r.mach}</b>
                    {r.so_tiet ? <><br />({r.so_tiet} tiết)</> : null}
                  </td>
                )}
                <td className={cellL}><Yccd r={r} /></td>
                <td className={cell}>{n} câu<br />{fmt(p)} điểm</td>
                {keys.map((k) => {
                  if (k.startsWith('T')) {
                    const d = r.cau_hoi.filter((c) => `T${c.hinh_thuc}` === k).reduce((s, c) => s + c.diem, 0);
                    return <td key={k} className={cell}>{fmt(d)}</td>;
                  }
                  const cs = r.cau_hoi.filter((c) => `${c.muc}${c.hinh_thuc}` === k);
                  return (
                    <td key={k} className={cell}>
                      {cs.map((c) => (
                        <div key={c.cau}>
                          1<br />({nhanCau(c)})
                          {c.dang && TEN_DANG[c.dang] ? <><br />{TEN_DANG[c.dang]}</> : null}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <td colSpan={2} className={`${cell} font-bold`}>TỔNG SỐ CÂU</td>
            <td className={`${cell} font-bold`}>{tongCau}</td>
            {keys.map((k) => <td key={k} className={`${cell} font-bold`}>{cnt[k] ?? 0}</td>)}
          </tr>
          <tr>
            <td colSpan={2} className={`${cell} font-bold`}>TỔNG SỐ ĐIỂM</td>
            <td className={`${cell} font-bold`}>{fmt((pts.TTN ?? 0) + (pts.TTL ?? 0))}</td>
            {keys.map((k) => <td key={k} className={`${cell} font-bold`}>{fmt(pts[k] ?? 0) || 0}</td>)}
          </tr>
          <tr>
            <td colSpan={2} className={`${cell} font-bold`}>TỈ LỆ</td>
            <td className={cell} />
            {keys.map((k) => <td key={k} className={`${cell} font-bold`}>{fmt((pts[k] ?? 0) * 10) || 0}%</td>)}
          </tr>
          <tr>
            <td colSpan={3} className={cell} />
            {(['1', '2', '3'] as const).map((k) => (
              <td key={k} colSpan={2} className={`${cell} font-bold`}>
                {fmt(((pts[`${k}TN`] ?? 0) + (pts[`${k}TL`] ?? 0)) * 10) || 0}%
              </td>
            ))}
            <td colSpan={2} className={`${cell} font-bold`}>10 điểm</td>
          </tr>
        </tbody>
      </table>
      {m.ghi_chu_dang_cau && <p className="italic text-sm mt-2">Ghi chú: {m.ghi_chu_dang_cau}</p>}
    </>
  );
}

// ---------------------------------------------------------------- Tiếng Việt
function BangDocHieu({ tieuDe, rows }: { tieuDe?: string; rows: DongMaTran[] }) {
  const rsG = rowSpans(rows, (r) => r.nhom);
  const rsN = rowSpans(rows, (r) => `${r.nhom}|${r.noi_dung}`);
  const tot: Record<string, number> = { TN: 0, TL: 0, 1: 0, 2: 0, 3: 0 };
  rows.forEach((r) => r.cau_hoi.forEach((c) => { tot[c.hinh_thuc] += 1; tot[c.muc] += c.diem; }));
  return (
    <>
      {tieuDe && <h4 className="font-bold mt-4 mb-1">{tieuDe}</h4>}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Mạch kiến thức</th>
            <th colSpan={2} className={th}>Nội dung</th>
            <th className={th}>YÊU CẦU CẦN ĐẠT</th>
            <th className={th}>Câu số</th>
            <th className={th}>TN</th>
            <th className={th}>TL</th>
            <th className={th}>Mức 1</th>
            <th className={th}>Mức 2</th>
            <th className={th}>Mức 3</th>
            <th className={th}>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const mm: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
            r.cau_hoi.forEach((c) => (mm[c.muc] += c.diem));
            const tn = r.cau_hoi.filter((c) => c.hinh_thuc === 'TN').length;
            const tl = r.cau_hoi.length - tn;
            return (
              <tr key={i}>
                {i === 0 && (
                  <td rowSpan={rows.length} className={cell}>
                    <b>Phần 2:<br />Đọc hiểu</b><br />(8 điểm)
                  </td>
                )}
                {rsG[i] > 0 && (
                  <td rowSpan={rsG[i]} className={cell}>
                    <b>{r.nhom}</b>
                    {r.chu_diem ? <><br />*Chủ điểm: {r.chu_diem}</> : null}
                  </td>
                )}
                {rsN[i] > 0 && <td rowSpan={rsN[i]} className={`${cell} font-bold`}>{r.noi_dung}</td>}
                <td className={cellL}><Yccd r={r} /></td>
                <td className={cell}>{r.cau_hoi.map((c) => c.cau).join(', ')}</td>
                <td className={cell}>{tn || ''}</td>
                <td className={cell}>{tl || ''}</td>
                {[1, 2, 3].map((k) => <td key={k} className={cell}>{mm[k] ? `${fmt(mm[k])}đ` : ''}</td>)}
                <td className={`${cell} font-bold`}>{fmt(mm[1] + mm[2] + mm[3])}đ</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={4} className={`${cell} font-bold`}>Tổng:</td>
            <td className={cell}>{tot.TN + tot.TL} câu</td>
            <td className={cell}>{tot.TN} câu</td>
            <td className={cell}>{tot.TL} câu</td>
            <td className={`${cell} font-bold`}>{fmt(tot[1])}đ</td>
            <td className={`${cell} font-bold`}>{fmt(tot[2])}đ</td>
            <td className={`${cell} font-bold`}>{fmt(tot[3])}đ</td>
            <td className={`${cell} font-bold`}>{fmt(tot[1] + tot[2] + tot[3])}đ</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function BangTiengViet({ m }: { m: MaTranChung }) {
  const [p1, p2] = m.bai_kiem_tra[0].phan as [PhanMaTran, PhanMaTran];
  const p3 = m.bai_kiem_tra[1]?.phan[0];
  const viet = p3 ? (p3.lua_chon ? p3.lua_chon.phuong_an.map((p) => ({ ten: p.ten, dong: p.dong[0] })) : p3.dong.map((d) => ({ ten: d.noi_dung ?? '', dong: d }))) : [];
  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Mạch kiến thức</th>
            <th className={th}>Nội dung</th>
            <th className={th}>YÊU CẦU CẦN ĐẠT</th>
            <th className={th}>Điểm</th>
          </tr>
        </thead>
        <tbody>
          {p1.dong.map((r, i) => (
            <tr key={i}>
              {i === 0 && (
                <>
                  <td rowSpan={p1.dong.length} className={cell}><b>Phần 1:<br />Đọc thành tiếng</b><br />(2 điểm)</td>
                  <td rowSpan={p1.dong.length} className={cell}>{r.noi_dung}</td>
                </>
              )}
              <td className={cellL}><Yccd r={r} /></td>
              <td className={cell}>........./ {fmt(r.tieu_chi_diem ?? 0)} đ</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className={`${cell} font-bold`}>Tổng:</td>
            <td className={`${cell} font-bold`}>........./ 2 đ</td>
          </tr>
        </tbody>
      </table>

      {p2.lua_chon
        ? p2.lua_chon.phuong_an.map((pa) => (
            <BangDocHieu key={pa.ma} tieuDe={`Phần 2 – phương án ${pa.ten} (${pa.ma})`} rows={[...pa.dong, ...p2.dong]} />
          ))
        : <div className="mt-4"><BangDocHieu rows={p2.dong} /></div>}

      {m.do_dai_van_ban && (
        <div className="mt-3">
          <b><u>Độ dài văn bản:</u></b>
          <ul className="list-disc pl-6">
            {Object.entries(m.do_dai_van_ban).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
          </ul>
        </div>
      )}

      {viet.length > 0 && (
        <table className="w-full border-collapse mt-3">
          <thead>
            <tr>
              <th className={th}>Mạch kiến thức</th>
              <th className={th}>Chủ điểm</th>
              <th className={th}>Thể loại</th>
              <th className={th}>Yêu cầu cần đạt</th>
              <th className={th}>Điểm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cell}><b>Phần 3:<br />Viết văn bản</b><br />(10 điểm)</td>
              <td className={cell}>{viet[0].dong.chu_diem}</td>
              <td className={cellL}>{viet.map((v) => <div key={v.ten}>– {v.ten}.</div>)}</td>
              <td className={cellL}>
                {viet.map((v, i) => (
                  <div key={v.ten}>
                    {viet.length > 1 && <div className="font-bold italic">{i + 1}. {v.ten}:</div>}
                    <Yccd r={v.dong} />
                  </div>
                ))}
              </td>
              <td className={`${cell} font-bold`}>10</td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}

export function MatrixPreview({ maTran }: { maTran: MaTranChung }) {
  return (
    <div className="bg-white text-black p-4 md:p-6 overflow-x-auto" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '13pt' }}>
      <div className="min-w-[860px] text-[12pt]">
        <Header m={maTran} />
        {maTran.bo_cuc === 'TOAN_HINH_THUC_MUC' && <BangToan m={maTran} />}
        {maTran.bo_cuc === 'BAI_MUC_TN_TL' && <BangBai m={maTran} />}
        {maTran.bo_cuc === 'TIENG_VIET_3_PHAN' && <BangTiengViet m={maTran} />}
        <Footer m={maTran} />
      </div>
    </div>
  );
}
