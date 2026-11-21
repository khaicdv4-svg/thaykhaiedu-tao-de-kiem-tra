'use client';

/**
 * ThayKhaiEdu - Trang Mẫu đề & Định dạng: mỗi môn một file Word mẫu (Tiếng Việt tách Đọc / Viết),
 * dùng chung cho cả 4 kì. Tải nhiều file một lần, app đoán môn theo tên file.
 * Tải bản mới là bản mới được dùng ngay; bản cũ vẫn giữ trong lịch sử, dùng lại được.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, FileText, FileUp, History, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { O_MAU, doanOMau, laOMau, type MaOMau, type ThongSoTrang } from '@/core/mau-de/mau-de';
import type { KhoiVanBan } from '@/core/utils/docx-bang';
import type { MauDe } from '@/lib/repositories/mau-de.repository';
import { XemTaiLieuWord } from '@/components/ui/XemTaiLieuWord';
import { createClient } from '@/lib/supabase/client';

const KICH_THUOC_TOI_DA = 15 * 1024 * 1024;

/** Đọc JSON trả về; máy chủ trả trang lỗi (không phải JSON) thì đổi thành câu dễ hiểu. */
async function docJson(r: Response): Promise<any> {
  const chu = await r.text();
  try {
    return JSON.parse(chu);
  } catch {
    if (r.status === 413 || /entity too large/i.test(chu)) return { error: 'File quá lớn để gửi qua máy chủ.' };
    return { error: `Máy chủ đang lỗi (mã ${r.status}). Thầy cô thử lại sau ít phút.` };
  }
}

/** Tải một file mẫu: xin chỗ tải → trình duyệt tải thẳng vào kho file → báo máy chủ lưu. */
async function taiMotMau(file: File, o: string): Promise<number> {
  if (file.size > KICH_THUOC_TOI_DA) throw new Error('File quá lớn (tối đa 15 MB). Thầy cô nén bớt hình trong file rồi thử lại.');
  const cho = await fetch('/api/mau-de/cho-tai-len', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ o, tenFile: file.name }),
  }).then(docJson);
  if (cho.error) throw new Error(cho.error);
  const supabase = createClient();
  if (!supabase) throw new Error('Chưa kết nối kho dữ liệu.');
  const { error: loiTai } = await supabase.storage.from('exam-templates').uploadToSignedUrl(cho.duongDan, cho.token, file, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  if (loiTai) throw new Error(`Không tải được file lên kho: ${loiTai.message}`);
  const luu = await fetch('/api/mau-de', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ o, tenFile: file.name, duongDan: cho.duongDan }),
  }).then(docJson);
  if (luu.error) throw new Error(luu.error);
  return luu.phienBan as number;
}

const VAI_TRO_TAI = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const ngay = (s: string) => new Date(s).toLocaleDateString('vi-VN');
const so = (n: number) => String(n).replace('.', ',');

function moTaThongSo(t: ThongSoTrang | null): string {
  if (!t) return '';
  const le = `lề trên ${so(t.le.top)}, dưới ${so(t.le.bottom)}, trái ${so(t.le.left)}, phải ${so(t.le.right)} mm`;
  const chu = [t.phong, t.coChu ? `cỡ ${so(t.coChu)}` : null].filter(Boolean).join(' ');
  return [`${t.khoGiay}${t.ngang ? ' ngang' : ''}`, le, chu].filter(Boolean).join(' · ');
}

interface FileCho {
  file: File;
  o: MaOMau | '';
}

export function MauDeView() {
  const { activeRole } = useAuth();
  const duocTai = VAI_TRO_TAI.includes(activeRole as string);
  const [ds, setDs] = useState<MauDe[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  const [cho, setCho] = useState<FileCho[]>([]);
  const [dangGui, setDangGui] = useState(false);
  const [xem, setXem] = useState<{ tenFile: string; cauTruc: KhoiVanBan[] } | null>(null);
  const [moLichSu, setMoLichSu] = useState<MaOMau | null>(null);
  const nhieuRef = useRef<HTMLInputElement>(null);
  const motRef = useRef<HTMLInputElement>(null);
  const oDangThay = useRef<MaOMau | null>(null);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const r = await fetch('/api/mau-de').then(docJson);
      if (r.error) throw new Error(r.error);
      setDs(r.mau);
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangTai(false);
    }
  }, []);
  useEffect(() => { nap(); }, [nap]);

  const gui = async (dsGui: FileCho[]) => {
    const hopLe = dsGui.filter((f) => f.o);
    if (!hopLe.length) return;
    setDangGui(true);
    setThongBao(null);
    let ok = 0;
    const loi: string[] = [];
    // Từng file một, để file lớn không làm hỏng cả lượt
    for (const f of hopLe) {
      setThongBao({ loai: 'ok', text: `Đang tải ${ok + loi.length + 1}/${hopLe.length}: ${f.file.name}…` });
      try {
        await taiMotMau(f.file, f.o);
        ok++;
      } catch (e) {
        loi.push(`${f.file.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setThongBao(loi.length
      ? { loai: 'loi', text: `Đã lưu ${ok} mẫu. Chưa lưu được: ${loi.join(' · ')}` }
      : { loai: 'ok', text: `Đã lưu ${ok} mẫu, các mẫu mới được dùng ngay.` });
    if (ok) setCho((d) => d.filter((c) => loi.some((l) => l.startsWith(`${c.file.name}:`))));
    setDangGui(false);
    nap();
  };

  const chonNhieu = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => /\.docx?$/i.test(f.name));
    e.target.value = '';
    setCho(files.map((file) => ({ file, o: doanOMau(file.webkitRelativePath || file.name) ?? '' })));
  };

  const chonMot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f && oDangThay.current) gui([{ file: f, o: oDangThay.current }]);
  };

  const thayMau = (o: MaOMau) => { oDangThay.current = o; motRef.current?.click(); };

  const moXem = async (id: string) => {
    const r = await fetch(`/api/mau-de/noi-dung?id=${id}`).then(docJson);
    if (r.error) setThongBao({ loai: 'loi', text: r.error });
    else setXem({ tenFile: r.tenFile, cauTruc: r.cauTruc });
  };

  const doiTrangThai = async (m: MauDe, conDung: boolean) => {
    if (!conDung && !window.confirm(`Bỏ bản ${m.phienBan} (${m.tenFile})? Bản vẫn giữ trong lịch sử, dùng lại được.`)) return;
    const r = await fetch('/api/mau-de', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, conDung }) }).then(docJson);
    setThongBao(r.error ? { loai: 'loi', text: r.error } : { loai: 'ok', text: conDung ? `Đã dùng lại bản ${m.phienBan}.` : `Đã bỏ bản ${m.phienBan}.` });
    nap();
  };

  const trungO = new Set(cho.map((c) => c.o).filter((o, i, a) => o && a.indexOf(o) !== i));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="the-tke p-6">
        <h1 className="text-xl font-bold text-slate-900">Mẫu đề &amp; Định dạng</h1>
        <p className="text-sm text-slate-600 mt-1">
          Mỗi môn một file Word mẫu của tổ (Tiếng Việt tách bài Đọc và bài Viết), dùng chung cho cả 4 kì. App giữ file gốc,
          đọc khổ giấy, lề, phông chữ và khung tiêu đề để đối chiếu khi xuất đề. Tải bản mới thì bản mới được dùng, bản cũ vẫn giữ.
        </p>
      </div>

      {thongBao && (
        <div className={`rounded-lg border p-3 text-sm ${thongBao.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{thongBao.text}</div>
      )}

      {duocTai && (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center space-y-3">
          <p className="text-sm text-slate-700">Chọn một lúc các file mẫu của mọi môn. App đoán môn theo tên file, thầy cô xem lại rồi bấm lưu.</p>
          <button type="button" className={nutChinh} onClick={() => nhieuRef.current?.click()} disabled={dangGui}><FileUp className="w-4 h-4" /> Chọn các file mẫu</button>
          <p className="text-xs text-slate-500">Chỉ nhận file .docx. File .doc cũ: mở bằng Word, chọn Lưu thành .docx rồi tải lên.</p>
          <input ref={nhieuRef} type="file" multiple accept=".docx,.doc" className="hidden" onChange={chonNhieu} />
          <input ref={motRef} type="file" accept=".docx" className="hidden" onChange={chonMot} />
        </div>
      )}

      {cho.length > 0 && (
        <div className="the-tke p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Kiểm tra trước khi lưu ({cho.filter((c) => c.o).length}/{cho.length} file)</h2>
          <ul className="divide-y divide-slate-100">
            {cho.map((c, i) => (
              <li key={c.file.name + i} className={`py-2 flex flex-wrap items-center gap-3 ${!c.o || trungO.has(c.o) ? 'bg-amber-50' : ''}`}>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="flex-1 min-w-48 text-sm font-medium text-slate-900">{c.file.name}</span>
                {/\.doc$/i.test(c.file.name) && <span className="text-xs text-red-700">File .doc cũ, cần lưu lại thành .docx</span>}
                <select
                  aria-label={`Môn của ${c.file.name}`}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
                  value={c.o}
                  onChange={(e) => setCho((d) => d.map((x, j) => (j === i ? { ...x, o: laOMau(e.target.value) ? e.target.value : '' } : x)))}
                >
                  <option value="">– Không lưu file này –</option>
                  {O_MAU.map((o) => <option key={o.ma} value={o.ma}>{o.ten}</option>)}
                </select>
                {c.o && trungO.has(c.o) && <span className="text-xs text-amber-800">Hai file cùng một môn: file sau sẽ thành bản mới nhất.</span>}
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <button type="button" className={nutPhu} onClick={() => setCho([])} disabled={dangGui}>Hủy</button>
            <button type="button" className={nutChinh} onClick={() => gui(cho.filter((c) => !/\.doc$/i.test(c.file.name)))} disabled={dangGui || !cho.some((c) => c.o && !/\.doc$/i.test(c.file.name))}>
              {dangGui ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Lưu các mẫu
            </button>
          </div>
        </div>
      )}

      {dangTai ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải mẫu đề…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {O_MAU.map((o) => {
            const cacBan = ds.filter((m) => m.o === o.ma);
            const dangDung = cacBan.find((m) => m.conDung);
            return (
              <section key={o.ma} className="the-tke p-5 space-y-3" aria-label={o.ten}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-slate-900">{o.ten}</h2>
                    <div className="text-xs text-slate-500">{o.moTa} · dùng cho cả 4 kì</div>
                  </div>
                  {dangDung
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Đang dùng bản {dangDung.phienBan}</span>
                    : <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800">Chưa có mẫu</span>}
                </div>
                {dangDung ? (
                  <div className="text-sm space-y-1">
                    <div className="font-medium text-slate-900 break-words">{dangDung.tenFile}</div>
                    <div className="text-xs text-slate-500">Tải lên {ngay(dangDung.taiLenLuc)}</div>
                    {dangDung.thongSo && <div className="text-xs text-slate-600">{moTaThongSo(dangDung.thongSo)}</div>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Xuất đề môn này vẫn dùng định dạng chuẩn của tổ cho tới khi có mẫu.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {dangDung && <button type="button" className={nutPhu} onClick={() => moXem(dangDung.id)}><Eye className="w-4 h-4" /> Xem</button>}
                  {dangDung && <a className={nutPhu} href={`/api/mau-de/file?id=${dangDung.id}`}><Download className="w-4 h-4" /> Tải file gốc</a>}
                  {duocTai && <button type="button" className={nutPhu} onClick={() => thayMau(o.ma)} disabled={dangGui}><FileUp className="w-4 h-4" /> {dangDung ? 'Thay mẫu' : 'Tải mẫu'}</button>}
                  {cacBan.length > 1 && (
                    <button type="button" className={nutPhu} onClick={() => setMoLichSu(moLichSu === o.ma ? null : o.ma)} aria-expanded={moLichSu === o.ma}>
                      <History className="w-4 h-4" /> Lịch sử ({cacBan.length} bản)
                    </button>
                  )}
                </div>
                {moLichSu === o.ma && (
                  <ul className="border-t pt-2 divide-y divide-slate-100 text-sm">
                    {cacBan.map((m) => (
                      <li key={m.id} className="py-1.5 flex flex-wrap items-center gap-2">
                        <span className={`flex-1 min-w-40 ${m.conDung ? 'text-slate-900' : 'text-slate-400 line-through'}`}>Bản {m.phienBan}: {m.tenFile}</span>
                        <span className="text-xs text-slate-500">{ngay(m.taiLenLuc)}</span>
                        <button type="button" className="p-1 rounded hover:bg-slate-100" title="Xem" onClick={() => moXem(m.id)}><Eye className="w-4 h-4" /></button>
                        {duocTai && (m.conDung
                          ? <button type="button" className="p-1 rounded hover:bg-red-50 text-red-700" title="Bỏ bản này" onClick={() => doiTrangThai(m, false)}><Trash2 className="w-4 h-4" /></button>
                          : <button type="button" className="p-1 rounded hover:bg-slate-100" title="Dùng lại bản này" onClick={() => doiTrangThai(m, true)}><RotateCcw className="w-4 h-4" /></button>)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {xem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-slate-900">{xem.tenFile}</div>
              <button type="button" aria-label="Đóng" className="p-1 rounded hover:bg-slate-100" onClick={() => setXem(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-auto"><XemTaiLieuWord khoi={xem.cauTruc} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
