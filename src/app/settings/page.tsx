'use client';

/**
 * Cài đặt hệ thống (dữ liệu thật của trường đang đăng nhập).
 * - Thông tin trường: quản trị hoặc Ban giám hiệu sửa được.
 * - Năm học: quản trị hệ thống thêm, sửa, đặt năm hiện tại.
 * - Tổ chuyên môn: quản trị hoặc Ban giám hiệu thêm, sửa; tổ trưởng của tổ sửa được tổ mình.
 * - Người dùng, Vai trò và quyền: xem; cấp vai trò làm ở trang Vai trò và ủy quyền (không làm trùng ở đây).
 * Quyền ghi do cơ sở dữ liệu kiểm tra; giao diện chỉ ẩn nút cho đỡ rối.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, CalendarDays, Check, FolderTree, Pencil, Plus, ShieldCheck, Star, Users, X } from 'lucide-react';
import { ROLE_PERMISSIONS, SystemPermission, UserRole } from '@/types/permissions';

interface Truong { id: string; ma: string; ten: string; tinh: string; quan: string; diaChi: string; khoi: number[]; capNhat: string }
interface NamHoc { id: string; ma: string; ten: string; batDau: string; ketThuc: string; hienTai: boolean }
interface To { id: string; ma: string; ten: string; moTa: string; khoi: number[]; toTruongId: string | null; toPhoId: string | null; soThanhVien: number }
interface Nguoi { id: string; ten: string; email: string; vaiTroGoc: string; vaiTro: string[]; khoi: number[]; hoatDong: boolean }
interface Quyen { laQuanTri: boolean; laBgh: boolean; suaTruong: boolean; suaNamHoc: boolean; suaTo: boolean }
interface DuLieu { truong: Truong | null; namHoc: NamHoc[]; to: To[]; nguoiDung: Nguoi[]; quyen: Quyen }

type MaTab = 'truong' | 'nam-hoc' | 'to' | 'nguoi-dung' | 'vai-tro';
const TAB: { ma: MaTab; ten: string; icon: typeof Building2 }[] = [
  { ma: 'truong', ten: 'Thông tin trường', icon: Building2 },
  { ma: 'nam-hoc', ten: 'Năm học', icon: CalendarDays },
  { ma: 'to', ten: 'Tổ chuyên môn', icon: FolderTree },
  { ma: 'nguoi-dung', ten: 'Người dùng', icon: Users },
  { ma: 'vai-tro', ten: 'Vai trò và quyền', icon: ShieldCheck },
];

const TEN_VAI_TRO: Record<string, string> = {
  TEACHER: 'Giáo viên', GROUP_LEADER: 'Tổ trưởng', DEPUTY_GROUP_LEADER: 'Tổ phó',
  SCHOOL_ADMIN: 'Ban giám hiệu (quản lý)', SCHOOL_LEADERSHIP: 'Ban giám hiệu (duyệt đề)', SYSTEM_ADMIN: 'Quản trị hệ thống',
};
const TEN_QUYEN: Record<SystemPermission, string> = {
  CREATE_TEST: 'Tạo đề', EDIT_OWN_TEST: 'Sửa đề của mình', SUBMIT_TEST: 'Gửi đề đi kiểm tra',
  CROSS_REVIEW_TEST: 'Kiểm tra chéo', REQUEST_REVISION: 'Yêu cầu chỉnh sửa', APPROVE_TEST: 'Duyệt đề',
  LOCK_TEST: 'Khóa đề', VIEW_GROUP_TESTS: 'Xem đề của tổ', MANAGE_GROUP: 'Quản lý tổ',
  MANAGE_TEMPLATES: 'Quản lý mẫu đề', MANAGE_SOURCES: 'Quản lý nguồn chuyên môn', MANAGE_USERS: 'Quản lý tài khoản',
};
const THU_TU_VAI_TRO: UserRole[] = ['TEACHER', 'DEPUTY_GROUP_LEADER', 'GROUP_LEADER', 'SCHOOL_LEADERSHIP', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

const o = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[15px] text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500';
const nutPhu = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50';
const ngayVN = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('vi-VN') : '');

async function guiViec(body: Record<string, unknown>): Promise<string | null> {
  try {
    const r = await fetch('/api/cai-dat-he-thong', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return (j as { error?: string }).error ?? 'Không lưu được.';
  } catch { return 'Không kết nối được hệ thống.'; }
}

function Truong({ nhan, children, goiY }: { nhan: string; children: React.ReactNode; goiY?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-slate-700">{nhan}</span>
      {children}
      {goiY && <span className="block text-xs text-slate-500">{goiY}</span>}
    </label>
  );
}

function ChonKhoi({ gt, doi, khoa }: { gt: number[]; doi: (k: number[]) => void; khoa?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {[1, 2, 3, 4, 5].map((k) => {
        const chon = gt.includes(k);
        return (
          <button
            key={k}
            type="button"
            disabled={khoa}
            aria-pressed={chon}
            onClick={() => doi(chon ? gt.filter((x) => x !== k) : [...gt, k].sort())}
            className={`min-w-20 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed
              ${chon ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-300'}`}
          >
            Khối {k}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<MaTab>('truong');
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [loiNap, setLoiNap] = useState<string | null>(null);
  const [tb, setTb] = useState<{ ok: boolean; chu: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  // Mở đúng thẻ theo đường dẫn (vd. /settings#nam-hoc từ trang Quản trị)
  useEffect(() => {
    const doc = () => {
      const h = window.location.hash.replace('#', '') as MaTab;
      if (TAB.some((t) => t.ma === h)) setTab(h);
    };
    doc();
    window.addEventListener('hashchange', doc);
    return () => window.removeEventListener('hashchange', doc);
  }, []);
  const chonTab = (ma: MaTab) => { setTab(ma); history.replaceState(null, '', `#${ma}`); setTb(null); };

  const nap = useCallback(async () => {
    try {
      const r = await fetch('/api/cai-dat-he-thong');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setLoiNap(j.error ?? 'Chưa đọc được dữ liệu cài đặt.'); return; }
      setLoiNap(null);
      setDl(j as DuLieu);
    } catch { setLoiNap('Không kết nối được hệ thống.'); }
  }, []);
  useEffect(() => { void nap(); }, [nap]);

  const chay = async (body: Record<string, unknown>, xong: string): Promise<boolean> => {
    setDangLuu(true);
    const loi = await guiViec(body);
    setDangLuu(false);
    setTb(loi ? { ok: false, chu: loi } : { ok: true, chu: xong });
    if (!loi) await nap();
    return !loi;
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-5">
      <header>
        <h1 className="tieu-de-trang">Cài đặt hệ thống</h1>
        <p className="text-[15px] text-slate-600 mt-1">
          Thông tin trường, năm học và tổ chuyên môn dùng chung cho mọi đề kiểm tra của trường.
        </p>
      </header>

      <div role="tablist" aria-label="Phần cài đặt" className="flex gap-1 overflow-x-auto rounded-2xl bg-white border border-slate-200 p-1.5">
        {TAB.map((t) => {
          const Icon = t.icon;
          const chon = tab === t.ma;
          return (
            <button
              key={t.ma}
              role="tab"
              aria-selected={chon}
              onClick={() => chonTab(t.ma)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors
                ${chon ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Icon className="w-4 h-4" /> {t.ten}
            </button>
          );
        })}
      </div>

      {tb && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm flex items-start justify-between gap-3 ${tb.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <span>{tb.chu}</span>
          <button type="button" onClick={() => setTb(null)} aria-label="Đóng thông báo"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loiNap && <div className="the-tke p-6 text-slate-700">{loiNap}</div>}
      {!dl && !loiNap && <div className="the-tke p-6 text-slate-500">Đang tải dữ liệu…</div>}

      {dl && tab === 'truong' && <PhanTruong dl={dl} dangLuu={dangLuu} chay={chay} />}
      {dl && tab === 'nam-hoc' && <PhanNamHoc dl={dl} dangLuu={dangLuu} chay={chay} />}
      {dl && tab === 'to' && <PhanTo dl={dl} dangLuu={dangLuu} chay={chay} />}
      {dl && tab === 'nguoi-dung' && <PhanNguoiDung dl={dl} />}
      {tab === 'vai-tro' && <PhanVaiTro />}
    </div>
  );
}

type Chay = (body: Record<string, unknown>, xong: string) => Promise<boolean>;

function PhanTruong({ dl, dangLuu, chay }: { dl: DuLieu; dangLuu: boolean; chay: Chay }) {
  const t = dl.truong;
  const [f, setF] = useState({ ma: t?.ma ?? '', ten: t?.ten ?? '', tinh: t?.tinh ?? '', quan: t?.quan ?? '', diaChi: t?.diaChi ?? '', khoi: t?.khoi ?? [1, 2, 3, 4, 5] });
  const khoa = !dl.quyen.suaTruong;
  if (!t) return <div className="the-tke p-6">Không tìm thấy trường của tài khoản.</div>;
  const doiCho = JSON.stringify(f) !== JSON.stringify({ ma: t.ma, ten: t.ten, tinh: t.tinh, quan: t.quan, diaChi: t.diaChi, khoi: t.khoi });
  return (
    <form
      className="the-tke p-6 space-y-5"
      onSubmit={(e) => { e.preventDefault(); void chay({ viec: 'TRUONG', ...f }, 'Đã lưu thông tin trường.'); }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Thông tin trường</h2>
        <span className="text-xs text-slate-500">Cập nhật lần cuối {new Date(t.capNhat).toLocaleString('vi-VN')}</span>
      </div>
      {khoa && <p className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">Chỉ quản trị hoặc Ban giám hiệu sửa được phần này. Tài khoản của thầy cô đang ở chế độ xem.</p>}
      <div className="grid md:grid-cols-[1fr_2fr] gap-4">
        <Truong nhan="Mã trường"><input className={o} value={f.ma} disabled={khoa} onChange={(e) => setF({ ...f, ma: e.target.value })} /></Truong>
        <Truong nhan="Tên trường"><input className={o} value={f.ten} disabled={khoa} onChange={(e) => setF({ ...f, ten: e.target.value })} /></Truong>
        <Truong nhan="Tỉnh / thành phố"><input className={o} value={f.tinh} disabled={khoa} onChange={(e) => setF({ ...f, tinh: e.target.value })} /></Truong>
        <Truong nhan="Phường / xã (quận cũ)"><input className={o} value={f.quan} disabled={khoa} onChange={(e) => setF({ ...f, quan: e.target.value })} /></Truong>
      </div>
      <Truong nhan="Địa chỉ" goiY="In ở đầu đề nếu mẫu đề có dòng địa chỉ. Có thể bỏ trống.">
        <input className={o} value={f.diaChi} disabled={khoa} onChange={(e) => setF({ ...f, diaChi: e.target.value })} />
      </Truong>
      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">Khối học của trường</span>
        <ChonKhoi gt={f.khoi} khoa={khoa} doi={(k) => setF({ ...f, khoi: k })} />
      </div>
      {!khoa && (
        <div className="flex gap-3 pt-1">
          <button type="submit" className="nut-tke" disabled={dangLuu || !doiCho}><Check className="w-4 h-4" /> Lưu thông tin trường</button>
          {doiCho && <button type="button" className={nutPhu} onClick={() => setF({ ma: t.ma, ten: t.ten, tinh: t.tinh, quan: t.quan, diaChi: t.diaChi, khoi: t.khoi })}>Hoàn tác</button>}
        </div>
      )}
    </form>
  );
}

function PhanNamHoc({ dl, dangLuu, chay }: { dl: DuLieu; dangLuu: boolean; chay: Chay }) {
  const sua = dl.quyen.suaNamHoc;
  const [dangSua, setDangSua] = useState<string | null>(null);
  const [fs, setFs] = useState({ ten: '', batDau: '', ketThuc: '' });
  const namSau = (() => {
    const cuoi = dl.namHoc[0]?.ketThuc?.slice(0, 4);
    const y = cuoi ? Number(cuoi) : new Date().getFullYear();
    return { batDau: `${y}-09-01`, ketThuc: `${y + 1}-05-31` };
  })();
  const [fm, setFm] = useState({ ten: '', ...namSau });

  return (
    <div className="space-y-4">
      <section className="the-tke p-6 space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Các năm học</h2>
        {!sua && <p className="text-sm text-slate-600">Chỉ quản trị hệ thống thêm hoặc đổi năm học. Thầy cô đang ở chế độ xem.</p>}
        {dl.namHoc.length === 0 && <p className="text-slate-600">Chưa có năm học nào. {sua ? 'Thêm năm học đầu tiên ở khung bên dưới.' : ''}</p>}
        <ul className="divide-y divide-slate-100">
          {dl.namHoc.map((n) => (
            <li key={n.id} className="py-3">
              {dangSua === n.id ? (
                <form
                  className="grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end"
                  onSubmit={async (e) => { e.preventDefault(); if (await chay({ viec: 'NAM_HOC_SUA', id: n.id, ...fs }, 'Đã lưu năm học.')) setDangSua(null); }}
                >
                  <Truong nhan="Tên năm học"><input className={o} value={fs.ten} onChange={(e) => setFs({ ...fs, ten: e.target.value })} /></Truong>
                  <Truong nhan="Bắt đầu"><input type="date" className={o} value={fs.batDau} onChange={(e) => setFs({ ...fs, batDau: e.target.value })} /></Truong>
                  <Truong nhan="Kết thúc"><input type="date" className={o} value={fs.ketThuc} onChange={(e) => setFs({ ...fs, ketThuc: e.target.value })} /></Truong>
                  <div className="flex gap-2">
                    <button type="submit" className="nut-tke px-4 py-2" disabled={dangLuu}>Lưu</button>
                    <button type="button" className={nutPhu} onClick={() => setDangSua(null)}>Hủy</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-48">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{n.ten}</span>
                      {n.hienTai && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800"><Star className="w-3 h-3" /> Năm học hiện tại</span>}
                    </div>
                    <div className="text-sm text-slate-500">Từ {ngayVN(n.batDau)} đến {ngayVN(n.ketThuc)}</div>
                  </div>
                  {sua && (
                    <div className="flex gap-2">
                      {!n.hienTai && <button type="button" className={nutPhu} disabled={dangLuu} onClick={() => void chay({ viec: 'NAM_HOC_HIEN_TAI', id: n.id }, `Đã đặt ${n.ten} là năm học hiện tại.`)}>Đặt làm năm hiện tại</button>}
                      <button type="button" className={nutPhu} onClick={() => { setDangSua(n.id); setFs({ ten: n.ten, batDau: n.batDau, ketThuc: n.ketThuc }); }}><Pencil className="w-3.5 h-3.5" /> Sửa</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {sua && (
        <form
          className="the-tke p-6 space-y-4"
          onSubmit={async (e) => { e.preventDefault(); if (await chay({ viec: 'NAM_HOC_THEM', ...fm }, 'Đã thêm năm học.')) setFm({ ten: '', ...namSau }); }}
        >
          <h2 className="text-lg font-bold text-slate-900">Thêm năm học</h2>
          <div className="grid md:grid-cols-[2fr_1fr_1fr] gap-3">
            <Truong nhan="Tên năm học" goiY="Bỏ trống thì app tự đặt theo năm bắt đầu và kết thúc."><input className={o} value={fm.ten} placeholder="Năm học 2027 - 2028" onChange={(e) => setFm({ ...fm, ten: e.target.value })} /></Truong>
            <Truong nhan="Bắt đầu"><input type="date" className={o} value={fm.batDau} onChange={(e) => setFm({ ...fm, batDau: e.target.value })} /></Truong>
            <Truong nhan="Kết thúc"><input type="date" className={o} value={fm.ketThuc} onChange={(e) => setFm({ ...fm, ketThuc: e.target.value })} /></Truong>
          </div>
          <button type="submit" className="nut-tke" disabled={dangLuu}><Plus className="w-4 h-4" /> Thêm năm học</button>
        </form>
      )}
    </div>
  );
}

function PhanTo({ dl, dangLuu, chay }: { dl: DuLieu; dangLuu: boolean; chay: Chay }) {
  const trong = { id: '', ma: '', ten: '', moTa: '', khoi: [] as number[], toTruongId: '', toPhoId: '' };
  const [f, setF] = useState(trong);
  const [mo, setMo] = useState(false);
  const ten = useMemo(() => new Map(dl.nguoiDung.map((n) => [n.id, n.ten])), [dl.nguoiDung]);
  const hoatDong = dl.nguoiDung.filter((n) => n.hoatDong);
  const sua = dl.quyen.suaTo;

  const moForm = (t?: To) => {
    setF(t ? { id: t.id, ma: t.ma, ten: t.ten, moTa: t.moTa, khoi: t.khoi, toTruongId: t.toTruongId ?? '', toPhoId: t.toPhoId ?? '' } : trong);
    setMo(true);
  };

  return (
    <div className="space-y-4">
      <section className="the-tke p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Tổ chuyên môn ({dl.to.length})</h2>
          {sua && !mo && <button type="button" className="nut-tke px-4 py-2" onClick={() => moForm()}><Plus className="w-4 h-4" /> Thêm tổ</button>}
        </div>
        <p className="text-sm text-slate-600">
          Tên tổ trưởng, tổ phó ở đây dùng để ghi trên giấy tờ của tổ. Quyền tổ trưởng trong app (duyệt đề, cấp quyền giáo viên) cấp ở trang{' '}
          <Link href="/phan-quyen" className="font-semibold text-indigo-700 underline">Vai trò và ủy quyền</Link>.
        </p>
        {dl.to.length === 0 && <p className="text-slate-600">Chưa có tổ nào.</p>}
        <div className="grid md:grid-cols-2 gap-3">
          {dl.to.map((t) => (
            <article key={t.id} className="rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{t.ten}</h3>
                  <div className="text-xs text-slate-500">Mã {t.ma}</div>
                </div>
                {sua && <button type="button" className={nutPhu} onClick={() => moForm(t)}><Pencil className="w-3.5 h-3.5" /> Sửa</button>}
              </div>
              {t.moTa && <p className="text-sm text-slate-600">{t.moTa}</p>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-500">Khối</dt><dd className="text-slate-800">{t.khoi.length ? t.khoi.join(', ') : 'Chưa chọn'}</dd>
                <dt className="text-slate-500">Tổ trưởng</dt><dd className="text-slate-800">{(t.toTruongId && ten.get(t.toTruongId)) || 'Chưa chọn'}</dd>
                <dt className="text-slate-500">Tổ phó</dt><dd className="text-slate-800">{(t.toPhoId && ten.get(t.toPhoId)) || 'Chưa chọn'}</dd>
                <dt className="text-slate-500">Thành viên</dt><dd className="text-slate-800">{t.soThanhVien} người</dd>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {mo && (
        <form
          className="the-tke p-6 space-y-4 ring-2 ring-indigo-200"
          onSubmit={async (e) => { e.preventDefault(); if (await chay({ viec: 'TO_LUU', ...f }, f.id ? 'Đã lưu tổ.' : 'Đã thêm tổ.')) setMo(false); }}
        >
          <h2 className="text-lg font-bold text-slate-900">{f.id ? `Sửa ${f.ten || 'tổ'}` : 'Thêm tổ chuyên môn'}</h2>
          <div className="grid md:grid-cols-[1fr_2fr] gap-3">
            <Truong nhan="Mã tổ" goiY={f.id ? 'Mã tổ không đổi sau khi tạo.' : 'Ví dụ TO_KHOI_5'}>
              <input className={o} value={f.ma} disabled={!!f.id} onChange={(e) => setF({ ...f, ma: e.target.value })} />
            </Truong>
            <Truong nhan="Tên tổ"><input className={o} value={f.ten} placeholder="Tổ Chuyên môn Khối 5" onChange={(e) => setF({ ...f, ten: e.target.value })} /></Truong>
          </div>
          <Truong nhan="Mô tả"><input className={o} value={f.moTa} onChange={(e) => setF({ ...f, moTa: e.target.value })} /></Truong>
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Khối tổ phụ trách</span>
            <ChonKhoi gt={f.khoi} doi={(k) => setF({ ...f, khoi: k })} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Truong nhan="Tổ trưởng">
              <select className={o} value={f.toTruongId} onChange={(e) => setF({ ...f, toTruongId: e.target.value })}>
                <option value="">Chưa chọn</option>
                {hoatDong.map((n) => <option key={n.id} value={n.id}>{n.ten}</option>)}
              </select>
            </Truong>
            <Truong nhan="Tổ phó">
              <select className={o} value={f.toPhoId} onChange={(e) => setF({ ...f, toPhoId: e.target.value })}>
                <option value="">Chưa chọn</option>
                {hoatDong.map((n) => <option key={n.id} value={n.id}>{n.ten}</option>)}
              </select>
            </Truong>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="nut-tke" disabled={dangLuu}><Check className="w-4 h-4" /> {f.id ? 'Lưu tổ' : 'Thêm tổ'}</button>
            <button type="button" className={nutPhu} onClick={() => setMo(false)}>Hủy</button>
          </div>
        </form>
      )}
    </div>
  );
}

function PhanNguoiDung({ dl }: { dl: DuLieu }) {
  const [tim, setTim] = useState('');
  const [loc, setLoc] = useState<'tat-ca' | 'hoat-dong' | 'ngung'>('tat-ca');
  const k = tim.trim().toLowerCase();
  const ds = dl.nguoiDung.filter((n) =>
    (!k || `${n.ten} ${n.email}`.toLowerCase().includes(k)) &&
    (loc === 'tat-ca' || (loc === 'hoat-dong' ? n.hoatDong : !n.hoatDong)));
  return (
    <section className="the-tke p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Người dùng trong trường ({dl.nguoiDung.length})</h2>
        {(dl.quyen.laQuanTri || dl.quyen.laBgh) && (
          <Link href="/phan-quyen" className={nutPhu}><ShieldCheck className="w-4 h-4" /> Cấp vai trò, đăng ký Gmail</Link>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <input className={`${o} max-w-sm`} placeholder="Tìm theo tên hoặc email" value={tim} onChange={(e) => setTim(e.target.value)} aria-label="Tìm người dùng" />
        <select className={`${o} w-auto`} value={loc} onChange={(e) => setLoc(e.target.value as typeof loc)} aria-label="Lọc trạng thái">
          <option value="tat-ca">Tất cả</option>
          <option value="hoat-dong">Đang hoạt động</option>
          <option value="ngung">Đã ngưng</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Họ tên</th>
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-4 py-2.5 font-semibold">Vai trò</th>
              <th className="px-4 py-2.5 font-semibold">Khối</th>
              <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ds.map((n) => (
              <tr key={n.id} className={n.hoatDong ? '' : 'text-slate-400'}>
                <td className="px-4 py-2.5 font-medium text-slate-900">{n.ten}</td>
                <td className="px-4 py-2.5">{n.email}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {n.vaiTro.map((v) => <span key={v} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800">{TEN_VAI_TRO[v] ?? v}</span>)}
                  </div>
                </td>
                <td className="px-4 py-2.5">{n.khoi.length ? n.khoi.join(', ') : '–'}</td>
                <td className="px-4 py-2.5">{n.hoatDong ? 'Đang hoạt động' : 'Đã ngưng'}</td>
              </tr>
            ))}
            {ds.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Không có người dùng nào khớp.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PhanVaiTro() {
  const tatCa = Object.keys(TEN_QUYEN) as SystemPermission[];
  return (
    <section className="the-tke p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Vai trò và quyền</h2>
        <p className="text-sm text-slate-600 mt-1">
          Bảng tra cứu: mỗi vai trò làm được những việc nào. Giáo viên còn có các quyền riêng do tổ trưởng tích ở trang{' '}
          <Link href="/phan-quyen#quyen-to" className="font-semibold text-indigo-700 underline">Vai trò và ủy quyền</Link>.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Việc</th>
              {THU_TU_VAI_TRO.map((r) => <th key={r} className="px-3 py-2.5 font-semibold text-center min-w-24">{TEN_VAI_TRO[r]}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tatCa.map((q) => (
              <tr key={q}>
                <td className="px-4 py-2 font-medium text-slate-800">{TEN_QUYEN[q]}</td>
                {THU_TU_VAI_TRO.map((r) => (
                  <td key={r} className="px-3 py-2 text-center">
                    {ROLE_PERMISSIONS[r].includes(q)
                      ? <Check className="w-4 h-4 inline text-indigo-600" aria-label="Có" />
                      : <span className="text-slate-300" aria-label="Không">–</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
