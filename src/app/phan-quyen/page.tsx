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
interface Quyen { laQuanTri: boolean; duocUyQuyen: boolean; laToTruong: boolean; vaiTro: string[] }
interface DongEmail { id: string; email: string; vaiTro: string; khoi: number | null; ghiChu: string | null; daDangNhap: boolean }
interface ToQl { khoi: number; ten: string; soGiaoVien: number }
interface GvTo { id: string; ten: string; email: string | null; hoatDong: boolean; khoa: boolean; ghiChuKhoa: string; quyen: Record<string, boolean> }
const COT_QUYEN: { ma: string; ten: string; mota: string }[] = [
  { ma: 'SOAN_DE', ten: 'Soạn đề', mota: 'Tạo và lưu đề kiểm tra của mình' },
  { ma: 'THAM_DINH', ten: 'Thẩm định', mota: 'Được phân công thẩm định đề của đồng nghiệp' },
  { ma: 'SUA_MA_TRAN_DAC_TA', ten: 'Ma trận, đặc tả', mota: 'Lập và sửa ma trận riêng, bản đặc tả' },
  { ma: 'NAP_MUC_LUC_SACH', ten: 'Mục lục, kho sách', mota: 'Nạp mục lục SGK, tải sách giáo khoa, sách giáo viên' },
];
const VAI_TRO_EMAIL: Record<string, string> = { SCHOOL_LEADERSHIP: 'Ban giám hiệu', GROUP_LEADER: 'Tổ trưởng', DEPUTY_GROUP_LEADER: 'Tổ phó', TEACHER: 'Giáo viên (xếp vào tổ)' };

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
  const [emails, setEmails] = useState<DongEmail[]>([]);
  const [fEm, setFEm] = useState({ ds: '', vaiTro: 'SCHOOL_LEADERSHIP', khoi: '4', ghiChu: '' });
  const [dsTo, setDsTo] = useState<ToQl[]>([]);
  const [khoiChon, setKhoiChon] = useState<number | null>(null);
  const [gv, setGv] = useState<GvTo[]>([]);
  const [sua, setSua] = useState<Record<string, string[]>>({});
  const [fUq, setFUq] = useState({ nguoiNhan: '', hanhDong: ['BAT_DAU_THAM_DINH'] as string[], den: '', lyDo: '' });

  const nap = useCallback(async () => {
    const q = await goi('/api/phan-quyen/toi');
    const qq = q.ok ? (q.j.quyen as Quyen) : null;
    setQuyen(qq);
    const t = await goi('/api/phan-quyen/thanh-vien');
    if (t.ok) setTv((t.j.thanhVien as ThanhVien[]) ?? []);
    if (qq?.laQuanTri) { const v = await goi('/api/phan-quyen/vai-tro'); if (v.ok) setVt((v.j.vaiTro as DongVaiTro[]) ?? []); }
    if (qq?.laQuanTri) { const em = await goi('/api/phan-quyen/email'); if (em.ok) setEmails((em.j.email as DongEmail[]) ?? []); }
    if (qq?.laQuanTri || qq?.laToTruong) {
      const t = await goi('/api/phan-quyen/to');
      if (t.ok) { const l = (t.j.to as ToQl[]) ?? []; setDsTo(l); setKhoiChon((k) => k ?? l[0]?.khoi ?? null); }
    }
    const u = await goi('/api/phan-quyen/uy-quyen');
    if (u.ok) setUq((u.j.uyQuyen as DongUyQuyen[]) ?? []);
  }, []);
  useEffect(() => { void nap(); }, [nap]);

  const napBang = useCallback(async (k: number | null) => {
    if (!k) { setGv([]); return; }
    const r = await goi(`/api/phan-quyen/to?khoi=${k}`);
    if (!r.ok) { setTb(`Chưa đọc được bảng quyền: ${r.j.error}`); setGv([]); return; }
    const l = (r.j.giaoVien as GvTo[]) ?? [];
    setGv(l);
    setSua(Object.fromEntries(l.filter((x) => !x.khoa).map((x) => [x.id, COT_QUYEN.filter((c) => x.quyen[c.ma]).map((c) => c.ma)])));
  }, []);
  useEffect(() => { void napBang(khoiChon); }, [khoiChon, napBang]);

  const coThayDoi = gv.some((x) => !x.khoa && COT_QUYEN.some((c) => (sua[x.id] ?? []).includes(c.ma) !== !!x.quyen[c.ma]));
  const apDung = async () => {
    if (!khoiChon) return;
    const ds = gv.filter((x) => !x.khoa).map((x) => ({ user: x.id, quyen: sua[x.id] ?? [] }));
    const r = await post('/api/phan-quyen/to', { viec: 'AP_DUNG', khoi: khoiChon, ds });
    setTb(r.ok ? `Đã áp dụng quyền cho tổ khối ${khoiChon} (${String(r.j.soNguoiDoi ?? 0)} người có thay đổi).` : `Chưa áp dụng được: ${r.j.error}`);
    if (r.ok) await napBang(khoiChon);
  };
  const themEmail = async () => {
    const list = fEm.ds.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (!list.length) return;
    const loiList: string[] = [];
    for (const e of list) {
      const r = await post('/api/phan-quyen/email', { email: e, vaiTro: fEm.vaiTro, khoi: fEm.vaiTro === 'SCHOOL_LEADERSHIP' ? null : Number(fEm.khoi), ghiChu: fEm.ghiChu });
      if (!r.ok) loiList.push(`${e}: ${r.j.error}`);
    }
    setTb(loiList.length ? `Có Gmail chưa thêm được: ${loiList.join(' | ')}` : `Đã đăng ký ${list.length} Gmail.`);
    if (!loiList.length) setFEm({ ...fEm, ds: '', ghiChu: '' });
    await nap();
  };

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
          <h2 className="font-semibold text-slate-900">Đăng ký vai trò theo Gmail</h2>
          <p className="text-sm text-slate-600">Dán một hoặc nhiều Gmail (cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng). Khi người đó đăng nhập bằng Gmail này, tài khoản tự có đúng vai trò. Tài khoản chỉ có vai trò Ban giám hiệu thì chỉ dùng được chức năng Ban giám hiệu (duyệt đề, ủy quyền), không soạn đề được.</p>
          <div className="grid gap-2 md:grid-cols-4">
            <textarea aria-label="Danh sách Gmail" rows={3} className={o + ' md:col-span-2'} placeholder="vi-du@gmail.com" value={fEm.ds} onChange={(e) => setFEm({ ...fEm, ds: e.target.value })} />
            <div className="space-y-2">
              <select aria-label="Vai trò theo Gmail" className={o} value={fEm.vaiTro} onChange={(e) => setFEm({ ...fEm, vaiTro: e.target.value })}>
                {Object.entries(VAI_TRO_EMAIL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {fEm.vaiTro !== 'SCHOOL_LEADERSHIP' && (
                <select aria-label="Khối" className={o} value={fEm.khoi} onChange={(e) => setFEm({ ...fEm, khoi: e.target.value })}>
                  {[1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>Tổ khối {k}</option>)}
                </select>
              )}
            </div>
            <input aria-label="Ghi chú" className={o} placeholder="Ghi chú (vd. Hiệu trưởng)" value={fEm.ghiChu} onChange={(e) => setFEm({ ...fEm, ghiChu: e.target.value })} />
          </div>
          <button type="button" className={nut} disabled={!fEm.ds.trim()} onClick={() => void themEmail()}>Thêm vào danh sách</button>
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-slate-50 text-left">{['Gmail', 'Vai trò', 'Tổ', 'Ghi chú', 'Tình trạng', ''].map((h) => <th key={h} className="border border-slate-200 px-2 py-1.5">{h}</th>)}</tr></thead>
            <tbody>
              {emails.length === 0 && <tr><td colSpan={6} className="border border-slate-200 px-2 py-2 text-slate-500">Chưa đăng ký Gmail nào.</td></tr>}
              {emails.map((r) => (
                <tr key={r.id}>
                  <td className="border border-slate-200 px-2 py-1.5">{r.email}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{VAI_TRO_EMAIL[r.vaiTro] ?? r.vaiTro}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{r.khoi ? `Khối ${r.khoi}` : 'Cả trường'}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{r.ghiChu ?? ''}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{r.daDangNhap ? 'Đã đăng nhập, đã có vai trò' : 'Chờ đăng nhập'}</td>
                  <td className="border border-slate-200 px-2 py-1.5"><button type="button" className="text-red-700 underline" onClick={() => void chay(goi(`/api/phan-quyen/email?id=${r.id}`, { method: 'DELETE' }), 'Đã gỡ đăng ký.')}>Gỡ</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(quyen?.laQuanTri || quyen?.laToTruong) && (
        <div className="the-tke space-y-3 p-6">
          <h2 className="font-semibold text-slate-900">Quyền của giáo viên trong tổ</h2>
          <p className="text-sm text-slate-600">Mặc định giáo viên chỉ soạn đề. Tích vào ô quyền nào thì giáo viên đó được cấp quyền ấy, bỏ tích thì thu lại, rồi bấm Áp dụng. Tổ trưởng, tổ phó và Ban giám hiệu đã có quyền theo vai trò nên không chỉnh ở đây.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-700">Tổ
              <select aria-label="Chọn tổ" className={o + ' ml-2 w-auto'} value={khoiChon ?? ''} onChange={(e) => setKhoiChon(e.target.value ? Number(e.target.value) : null)}>
                {dsTo.map((t) => <option key={t.khoi} value={t.khoi}>{t.ten} ({t.soGiaoVien} người)</option>)}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="border border-slate-200 px-2 py-1.5">Giáo viên</th>
                  {COT_QUYEN.map((c) => <th key={c.ma} className="border border-slate-200 px-2 py-1.5 text-center" title={c.mota}>{c.ten}</th>)}
                  {quyen?.laQuanTri && <th className="border border-slate-200 px-2 py-1.5">Chuyển sang tổ</th>}
                </tr>
              </thead>
              <tbody>
                {gv.length === 0 && <tr><td colSpan={6} className="border border-slate-200 px-2 py-2 text-slate-500">Tổ này chưa có thành viên.</td></tr>}
                {gv.map((x) => (
                  <tr key={x.id} className={x.hoatDong ? '' : 'text-slate-400'}>
                    <td className="border border-slate-200 px-2 py-1.5">{x.ten}<div className="text-xs text-slate-500">{x.email}{!x.hoatDong ? ' · chưa kích hoạt' : ''}</div></td>
                    {x.khoa
                      ? <td colSpan={COT_QUYEN.length} className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{x.ghiChuKhoa}: đã có quyền theo vai trò</td>
                      : COT_QUYEN.map((c) => (
                        <td key={c.ma} className="border border-slate-200 px-2 py-1.5 text-center">
                          <input type="checkbox" aria-label={`${c.ten} - ${x.ten}`} checked={(sua[x.id] ?? []).includes(c.ma)}
                            onChange={(e) => setSua({ ...sua, [x.id]: e.target.checked ? [...(sua[x.id] ?? []), c.ma] : (sua[x.id] ?? []).filter((m) => m !== c.ma) })} />
                        </td>
                      ))}
                    {quyen?.laQuanTri && (
                      <td className="border border-slate-200 px-2 py-1.5">
                        <select aria-label={`Chuyển ${x.ten} sang tổ`} className={o} value="" onChange={(e) => { if (e.target.value) void chay(post('/api/phan-quyen/to', { viec: 'CHUYEN', user: x.id, khoi: Number(e.target.value) }), 'Đã chuyển giáo viên sang tổ mới.').then(() => napBang(khoiChon)); }}>
                          <option value="">Giữ nguyên</option>{[1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>Khối {k}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="inline-flex items-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50" disabled={!coThayDoi} onClick={() => void apDung()}>Áp dụng</button>
          {coThayDoi && <span className="ml-3 text-sm text-amber-700">Có thay đổi chưa áp dụng.</span>}
        </div>
      )}

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

      {quyen && !quyen.laQuanTri && !quyen.duocUyQuyen && !quyen.laToTruong && <p className="text-sm text-slate-600">Trang này dành cho quản trị hệ thống, tổ trưởng và Ban giám hiệu.</p>}
    </div>
  );
}
