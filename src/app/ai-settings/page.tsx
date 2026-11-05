'use client';

/**
 * ThayKhaiEdu - Cài đặt AI (chỉ tổ trưởng).
 * 1. Khóa API dùng chung cho mọi model. 2. Danh sách model. 3. Dùng model nào cho việc gì.
 * Khóa gửi lên máy chủ, mã hóa rồi mới lưu; trang này không bao giờ nhận lại khóa.
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, ListPlus, Loader2, Plug, Save, Trash2, TriangleAlert, Workflow, XCircle } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import {
  DANH_SACH_VIEC,
  MODEL_MAU_APILIT,
  PHAN_VIEC_DE_XUAT,
  kiemTraCauHinh,
  maModelMoi,
  tenCoGia,
  type CauHinhAIHienThi,
  type ChuanGoi,
  type ModelAI,
  type PhanViec,
  type ViecAI,
} from '@/core/services/ai/cau-hinh-ai';

const o = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const nutChinh = 'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const VAI_TRO_SUA = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

type KetQuaThu = { dang: boolean; ok?: boolean; text?: string };

function Muc({ so, ten, icon: Icon, children }: { so: number; ten: string; icon: typeof KeyRound; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Icon className="w-4 h-4 text-blue-600" /> {so}. {ten}
      </h2>
      {children}
    </section>
  );
}

export default function CaiDatAIPage() {
  const { activeRole, isLoading } = useAuth();
  const [cauHinh, setCauHinh] = useState<CauHinhAIHienThi | null>(null);
  const [models, setModels] = useState<ModelAI[]>([]);
  const [phanViec, setPhanViec] = useState<PhanViec>({});
  const [khoaMoi, setKhoaMoi] = useState('');
  const [xoaKhoa, setXoaKhoa] = useState(false);
  const [mauChon, setMauChon] = useState(MODEL_MAU_APILIT[0].id);
  const [thu, setThu] = useState<Record<string, KetQuaThu>>({});
  const [dangLuu, setDangLuu] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  const [loiTai, setLoiTai] = useState<string | null>(null);

  const napVao = (c: CauHinhAIHienThi) => {
    setCauHinh(c);
    setModels(c.models);
    setPhanViec(c.phanViec);
  };

  useEffect(() => {
    fetch('/api/ai-settings')
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        napVao(j);
      })
      .catch((e) => setLoiTai(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!isLoading && !VAI_TRO_SUA.includes(activeRole)) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Chỉ tổ trưởng xem và sửa được Cài đặt AI.
      </div>
    );
  }

  const suaModel = (id: string, thayDoi: Partial<ModelAI>) => setModels((ds) => ds.map((m) => (m.id === id ? { ...m, ...thayDoi } : m)));

  const doiChuan = (m: ModelAI, chuan: ChuanGoi) => {
    let dc = m.diaChiCong.replace(/\/+$/, '');
    if (chuan === 'openai' && !/\/v1$/i.test(dc)) dc = `${dc}/v1`;
    if (chuan === 'anthropic') dc = dc.replace(/\/v1$/i, '');
    suaModel(m.id, { chuan, diaChiCong: dc });
  };

  const xoaModel = (id: string) => {
    setModels((ds) => ds.filter((m) => m.id !== id));
    setPhanViec((pv) => {
      const moi = { ...pv };
      (Object.keys(moi) as ViecAI[]).forEach((k) => {
        if (moi[k] === id) delete moi[k];
      });
      return moi;
    });
  };

  const themTrong = () =>
    setModels((ds) => [...ds, { id: maModelMoi(ds), ten: '', modelId: '', chuan: 'anthropic', diaChiCong: 'https://' }]);

  const themMau = () => {
    const mau = MODEL_MAU_APILIT.find((m) => m.id === mauChon);
    if (!mau) return;
    setModels((ds) => {
      const id = maModelMoi(ds);
      if (ds.length === 0) setPhanViec((pv) => ({ ...pv, MAC_DINH: pv.MAC_DINH || id }));
      return [...ds, { ...mau, id }];
    });
  };

  const themCaBo = () => {
    setModels(MODEL_MAU_APILIT.map((m) => ({ ...m })));
    setPhanViec({ ...PHAN_VIEC_DE_XUAT });
  };

  const kiemTraModel = async (m: ModelAI) => {
    setThu((t) => ({ ...t, [m.id]: { dang: true } }));
    try {
      const r = await fetch('/api/ai-settings/kiem-tra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m, khoaVuaGo: khoaMoi || undefined }),
      }).then((x) => x.json());
      setThu((t) => ({
        ...t,
        [m.id]: r.ok
          ? { dang: false, ok: true, text: `Chạy được (${(r.thoiGianMs / 1000).toFixed(1)} giây), model trả lời: "${r.traLoi}"` }
          : { dang: false, ok: false, text: r.error },
      }));
    } catch (e) {
      setThu((t) => ({ ...t, [m.id]: { dang: false, ok: false, text: e instanceof Error ? e.message : String(e) } }));
    }
  };

  const loiHienTai = kiemTraCauHinh({ models, phanViec });

  const luu = async () => {
    setThongBao(null);
    if (loiHienTai.length) {
      setThongBao({ loai: 'loi', text: loiHienTai.join('\n') });
      return;
    }
    setDangLuu(true);
    try {
      const r = await fetch('/api/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models, phanViec, khoaMoi: khoaMoi || undefined, xoaKhoa }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      napVao(j);
      setKhoaMoi('');
      setXoaKhoa(false);
      setThongBao({ loai: 'ok', text: 'Đã lưu cấu hình AI.' });
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cài đặt AI</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chỉ tổ trưởng thấy trang này. Khóa được mã hóa và lưu trên máy chủ, không hiện lại trên màn hình.
        </p>
      </div>

      {loiTai && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loiTai}</div>}

      {cauHinh && !cauHinh.coBiMatMayChu && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="w-4 h-4" /> Máy chủ chưa có mã bí mật để khóa API.</p>
          <p>
            Thêm dòng <code className="bg-white px-1 rounded">AI_KHOA_BI_MAT=…</code> (chuỗi ngẫu nhiên, ít nhất 16 ký tự) vào file{' '}
            <code className="bg-white px-1 rounded">.env.local</code> rồi chạy lại <code className="bg-white px-1 rounded">npm run dev</code>. Nếu app chạy trên Vercel, thêm cùng biến đó trong Settings → Environment Variables.
          </p>
        </div>
      )}

      {!cauHinh && !loiTai && (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải cấu hình…</div>
      )}

      {cauHinh && (
        <>
          <Muc so={1} ten="Khóa API (dùng chung cho mọi model)" icon={KeyRound}>
            <p className="text-sm text-slate-600">
              {cauHinh.coKhoa ? (
                <>Khóa đang dùng kết thúc bằng <b>{cauHinh.khoaDuoi}</b>. Khóa không hiện lại sau khi lưu.</>
              ) : (
                <>Chưa có khóa. Dán khóa API vào ô bên dưới rồi bấm Lưu cấu hình.</>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="password"
                autoComplete="off"
                className={`${o} w-full max-w-md`}
                placeholder={cauHinh.coKhoa ? 'Dán khóa mới nếu muốn đổi' : 'Dán khóa API'}
                value={khoaMoi}
                onChange={(e) => { setKhoaMoi(e.target.value); setXoaKhoa(false); }}
              />
              {cauHinh.coKhoa && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={xoaKhoa} onChange={(e) => { setXoaKhoa(e.target.checked); if (e.target.checked) setKhoaMoi(''); }} />
                  Xóa khóa đang dùng
                </label>
              )}
            </div>
          </Muc>

          <Muc so={2} ten="Danh sách model" icon={Plug}>
            <p className="text-sm text-slate-600">
              Chuẩn Anthropic: địa chỉ cổng không có /v1. Chuẩn OpenAI: địa chỉ có /v1. ID model copy từ trang Models của nhà cung cấp.
              Giá là USD cho 1 triệu token vào / ra.
            </p>

            <div className="space-y-3">
              {models.map((m) => {
                const t = thu[m.id];
                return (
                  <div key={m.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <input className={`${o} md:col-span-3`} placeholder="Tên gọi (ví dụ Claude Sonnet 5.5)" value={m.ten} onChange={(e) => suaModel(m.id, { ten: e.target.value })} />
                      <input className={`${o} md:col-span-3`} placeholder="ID model (ví dụ pro/claude-sonnet-5-5-medium)" value={m.modelId} onChange={(e) => suaModel(m.id, { modelId: e.target.value })} />
                      <select className={`${o} md:col-span-3`} value={m.chuan} onChange={(e) => doiChuan(m, e.target.value as ChuanGoi)}>
                        <option value="anthropic">Chuẩn Anthropic</option>
                        <option value="openai">Chuẩn OpenAI</option>
                      </select>
                      <input className={`${o} md:col-span-3`} placeholder="Địa chỉ cổng (https://…)" value={m.diaChiCong} onChange={(e) => suaModel(m.id, { diaChiCong: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-slate-500">Giá vào $</label>
                      <input type="number" min={0} step="0.01" className={`${o} w-24`} value={m.giaVao ?? ''} onChange={(e) => suaModel(m.id, { giaVao: e.target.value === '' ? undefined : Number(e.target.value) })} />
                      <label className="text-xs text-slate-500">Giá ra $</label>
                      <input type="number" min={0} step="0.01" className={`${o} w-24`} value={m.giaRa ?? ''} onChange={(e) => suaModel(m.id, { giaRa: e.target.value === '' ? undefined : Number(e.target.value) })} />
                      <div className="flex-1" />
                      <button type="button" className={nutPhu} disabled={t?.dang} onClick={() => kiemTraModel(m)}>
                        {t?.dang ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Kiểm tra
                      </button>
                      <button type="button" className={`${nutPhu} text-red-600`} onClick={() => xoaModel(m.id)}>
                        <Trash2 className="w-4 h-4" /> Xóa
                      </button>
                    </div>
                    {t && !t.dang && (
                      <p className={`flex items-start gap-1.5 text-xs ${t.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                        {t.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />} {t.text}
                      </p>
                    )}
                  </div>
                );
              })}
              {models.length === 0 && <p className="text-sm text-slate-500">Chưa có model nào.</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <button type="button" className={nutPhu} onClick={themTrong}><ListPlus className="w-4 h-4" /> Thêm model</button>
              <span className="text-sm text-slate-500 ml-2">Thêm nhanh (API-LIT):</span>
              <select className={o} value={mauChon} onChange={(e) => setMauChon(e.target.value)}>
                {MODEL_MAU_APILIT.map((m) => <option key={m.id} value={m.id}>{tenCoGia(m)}</option>)}
              </select>
              <button type="button" className={nutPhu} onClick={themMau}>Thêm</button>
              {models.length === 0 && (
                <button type="button" className={nutPhu} onClick={themCaBo}>Thêm cả bộ {MODEL_MAU_APILIT.length} model và phân việc đề xuất</button>
              )}
            </div>
          </Muc>

          <Muc so={3} ten="Dùng model nào cho việc gì" icon={Workflow}>
            <div className="space-y-3">
              {DANH_SACH_VIEC.map((v) => (
                <div key={v.ma} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{v.ten}</p>
                    <p className="text-xs text-slate-500">{v.moTa} {v.goiY}</p>
                  </div>
                  <select
                    className={o}
                    value={phanViec[v.ma] ?? ''}
                    onChange={(e) => setPhanViec((pv) => ({ ...pv, [v.ma]: e.target.value || undefined }))}
                  >
                    <option value="">{v.ma === 'MAC_DINH' ? '— Chọn model —' : 'Dùng model mặc định'}</option>
                    {models.filter((m) => m.ten && m.modelId).map((m) => <option key={m.id} value={m.id}>{tenCoGia(m)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Muc>

          {thongBao && (
            <div className={`whitespace-pre-line rounded-lg border p-3 text-sm ${thongBao.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              {thongBao.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="button" className={nutChinh} disabled={dangLuu} onClick={luu}>
              {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu cấu hình
            </button>
            {cauHinh.capNhatLuc && (
              <span className="text-xs text-slate-500">Lưu lần cuối: {new Date(cauHinh.capNhatLuc).toLocaleString('vi-VN')}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
