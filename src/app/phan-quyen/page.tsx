'use client';

/**
 * Vai trò và ủy quyền.
 * - Quản trị viên hệ thống: cấp / thu hồi vai trò cho thành viên (có thể cấp nhiều vai trò, có thời hạn).
 * - Tổ trưởng, Ban giám hiệu: ủy quyền có thời hạn cho người khác (không bao giờ gồm quyền phê duyệt).
 * Mọi kiểm tra quyền do cơ sở dữ liệu thực hiện; trang này chỉ gọi và hiển thị.
 */

import { useCallback, useEffect, useState } from 'react';

interface ThanhVien { id: string; ten: string; vaiTroGoc: string; vaiTro: string[] }
interface DongVaiTro { id: string; userId: string; ten: string | null; vaiTro: string; khoi: number | null; tu: string; den: string | null; lyDo: string }
interface DongUyQuyen { id: string; nguoiGiao: string; nguoiNhan: string; hanhDong: string[]; khoi: number | null; tu: string; den: string; lyDo: string; thuHoi: boolean }
interface Quyen { laQuanTri: boolean; duocUyQuyen: boolean; vaiTro: string[] }

const TEN_VAI_TRO: Record<string, string> = { TEACHER: 'Giáo viên', GROUP_LEADER: 'Tổ trưởng', DEPUTY_GROUP_LEADER: 'Tổ phó', SCHOOL_LEADERSHIP: 'Ban giám hiệu (duyệt đề)', SCHOOL_ADMIN: 'Ban giám hiệu', SYSTEM_ADMIN: 'Quản trị hệ thống' };
const CAP_DUOC = ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_LEADERSHIP', 'SYSTEM_ADMIN'];
const TEN_HD: Record<string, string> = { BAT_DAU_THAM_DINH: 'Bắt đầu thẩm định', YEU_CAU_CHINH_SUA: 'Yêu cầu chỉnh sửa', XAC_NHAN_TO: 'Xác nhận cấp tổ', CHUYEN_BGH: 'Chuyển lên Ban giám hiệu' };
const ngay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : 'không hạn');
const o = 'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm';
const nut = 'inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';

type KQ = { ok: boolean; j: Record<string, unknown> & { error?: string } };
async function goi(url: string, init?: RequestInit): Promise<KQ> {
  try {
    const r = await fetch(url, init);
    return { ok: r.ok, j: (await r.json().catch(() => ({}))) as KQ['j'] };
  } catch { return { ok: false, j: { error: 'Không kết nối được hệ thống.' } }; }
}
const post = (url: string, body: unknown) => goi(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function PhanQuyenPage() {
  const [quyen, setQuyen] = useState<Quyen | null>(null);
  const [tv, setTv] = useState<ThanhVien[]>([]);
  const [vt, setVt] = useState<DongVaiTro[]>([]);
  const [uq, setUq] = useState<DongUyQuyen[]>([]);
  const [tb, setTb] = useState<string | null>(null);
  const [fVt, setFVt] = useState({ userId: '', vaiTro: 'GROUP_LEADER', khoi: '', den: '', lyDo: '' });
  const [fUq, setFUq] = useState({ nguoiNhan: '', hanhDong: ['BAT_DAU_THAM_DINH'] as string[], den: '', lyDo: '' });

  const nap = useCallback(async () => {
    const q = await goi('/api/phan-quyen/toi');
    const qq = q.ok ? (q.j.quyen as Quyen) : null;
    setQuyen(qq);
    const t = await goi('/api/phan-quyen/thanh-vien');
    if (t.ok) setTv((t.j.thanhVien as ThanhVien[]) ?? []);
    if (qq?.laQuanTri) { const v = await goi('/api/phan-quyen/vai-tro'); if (v.ok) setVt((v.j.vaiTro as DongVaiTro[]) ?? []); }
    const u = await goi('/api/phan-quyen/uy-quyen');
    if (u.ok) setUq((u.j.uyQuyen as DongUyQuyen[]) ?? []);
  }, []);
  useEffect(() => { void nap(); }, [nap]);

  const chay = async (p: Promise<KQ>, okText: string) => {
    const r = await p;
    setTb(r.ok ? okText : `Chưa thực hiện được: ${r.j.error}`);
    if (r.ok) await nap();
  };
  const ten = (id: string) => tv.find((x) => x.id === id)?.ten ?? id;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div className="the-tke p-6">
        <h1 className="text-xl font-bold text-slate-900">Vai trò và ủy quyền</h1>
        <p className="mt-1 text-sm text-slate-600">Một người có thể giữ nhiều vai trò. Dù giữ vai trò nào, không ai được thẩm định hay phê duyệt đề do chính mình soạn. Quyền phê duyệt không ủy quyền được.</p>
        {quyen && <p className="mt-2 text-sm text-slate-700">Vai trò của bạn: <b>{quyen.vaiTro.map((v) => TEN_VAI_TRO[v] ?? v).join(', ')}</b></p>}
      </div>
      {tb && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{tb}</div>}

      {quyen?.laQuanTri && (
        <div className="the-tke space-y-3 p-6">
          <h2 className="font-semibold text-slate-900">Cấp vai trò (quản trị hệ thống)</h2>
          <div className="grid gap-2 md:grid-cols-5">
            <select aria-label="Người dùng" className={o} value={fVt.userId} onChange={(e) => setFVt({ ...fVt, userId: e.target.value })}>
              <option value="">Chọn người</option>{tv.map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}
            </select>
            <select aria-label="Vai trò" className={o} value={fVt.vaiTro} onChange={(e) => setFVt({ ...fVt, vaiTro: e.target.value })}>
              {CAP_DUOC.map((v) => <option key={v} value={v}>{TEN_VAI_TRO[v]}</option>)}
            </select>
            <input aria-label="Khối" className={o} placeholder="Khối (để trống = cả trường)" value={fVt.khoi} onChange={(e) => setFVt({ ...fVt, khoi: e.target.value })} />
            <input aria-label="Đến ngày" type="date" className={o} value={fVt.den} onChange={(e) => setFVt({ ...fVt, den: e.target.value })} />
            <input aria-label="Lý do" className={o} placeholder="Lý do" value={fVt.lyDo} onChange={(e) => setFVt({ ...fVt, lyDo: e.target.value })} />
          </div>
          <button type="button" className={nut} disabled={!fVt.userId || !fVt.lyDo.trim()} onClick={() => void chay(post('/api/phan-quyen/vai-tro', { userId: fVt.userId, vaiTro: fVt.vaiTro, khoi: fVt.khoi ? Number(fVt.khoi) : null, den: fVt.den || null, lyDo: fVt.lyDo }), 'Đã cấp vai trò.')}>Cấp vai trò</button>
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-slate-50 text-left">{['Người', 'Vai trò', 'Khối', 'Hạn', 'Lý do', ''].map((h) => <th key={h} className="border border-slate-200 px-2 py-1.5">{h}</th>)}</tr></thead>
            <tbody>
              {vt.length === 0 && <tr><td colSpan={6} className="border border-slate-200 px-2 py-2 text-slate-500">Chưa có vai trò cấp thêm.</td></tr>}
              {vt.map((r) => (
                <tr key={r.id}>
                  <td className="border border-slate-200 px-2 py-1.5">{r.ten ?? ten(r.userId)}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{TEN_VAI_TRO[r.vaiTro] ?? r.vaiTro}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{r.khoi ?? 'cả trường'}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{ngay(r.den)}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{r.lyDo}</td>
                  <td className="border border-slate-200 px-2 py-1.5"><button type="button" className="text-red-700 underline" onClick={() => void chay(goi(`/api/phan-quyen/vai-tro?id=${r.id}`, { method: 'DELETE' }), 'Đã thu hồi vai trò.')}>Thu hồi</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {quyen?.duocUyQuyen && (
        <div className="the-tke space-y-3 p-6">
          <h2 className="font-semibold text-slate-900">Ủy quyền có thời hạn</h2>
          <p className="text-sm text-slate-600">Dùng khi tổ trưởng vắng. Người được ủy quyền chỉ làm được các việc đã chọn, trong thời hạn, và lịch sử ghi rõ là làm theo ủy quyền.</p>
          <div className="grid gap-2 md:grid-cols-3">
            <select aria-label="Người nhận" className={o} value={fUq.nguoiNhan} onChange={(e) => setFUq({ ...fUq, nguoiNhan: e.target.value })}>
              <option value="">Chọn người nhận</option>{tv.map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}
            </select>
            <input aria-label="Hết hạn" type="date" className={o} value={fUq.den} onChange={(e) => setFUq({ ...fUq, den: e.target.value })} />
            <input aria-label="Lý do ủy quyền" className={o} placeholder="Lý do (vd. đi công tác)" value={fUq.lyDo} onChange={(e) => setFUq({ ...fUq, lyDo: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(TEN_HD).map(([k, v]) => (
              <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={fUq.hanhDong.includes(k)} onChange={(e) => setFUq({ ...fUq, hanhDong: e.target.checked ? [...fUq.hanhDong, k] : fUq.hanhDong.filter((x) => x !== k) })} /> {v}</label>
            ))}
          </div>
          <button type="button" className={nut} disabled={!fUq.nguoiNhan || !fUq.den || fUq.hanhDong.length === 0 || !fUq.lyDo.trim()} onClick={() => void chay(post('/api/phan-quyen/uy-quyen', { nguoiNhan: fUq.nguoiNhan, hanhDong: fUq.hanhDong, den: new Date(`${fUq.den}T23:59:59`).toISOString(), lyDo: fUq.lyDo }), 'Đã ủy quyền.')}>Giao ủy quyền</button>
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-slate-50 text-left">{['Người giao', 'Người nhận', 'Việc được làm', 'Hết hạn', ''].map((h) => <th key={h} className="border border-slate-200 px-2 py-1.5">{h}</th>)}</tr></thead>
            <tbody>
              {uq.length === 0 && <tr><td colSpan={5} className="border border-slate-200 px-2 py-2 text-slate-500">Chưa có ủy quyền nào.</td></tr>}
              {uq.map((r) => (
                <tr key={r.id} className={r.thuHoi ? 'text-slate-400' : ''}>
                  <td className="border border-slate-200 px-2 py-1.5">{ten(r.nguoiGiao)}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{ten(r.nguoiNhan)}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{r.hanhDong.map((h) => TEN_HD[h] ?? h).join(', ')}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{ngay(r.den)}{r.thuHoi ? ' (đã thu hồi)' : ''}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{!r.thuHoi && <button type="button" className="text-red-700 underline" onClick={() => void chay(goi(`/api/phan-quyen/uy-quyen?id=${r.id}`, { method: 'DELETE' }), 'Đã thu hồi ủy quyền.')}>Thu hồi</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {quyen && !quyen.laQuanTri && !quyen.duocUyQuyen && <p className="text-sm text-slate-600">Trang này dành cho quản trị hệ thống, tổ trưởng và Ban giám hiệu.</p>}
    </div>
  );
}
