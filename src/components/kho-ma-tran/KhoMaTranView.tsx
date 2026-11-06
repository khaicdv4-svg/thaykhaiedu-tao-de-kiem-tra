'use client';

/**
 * ThayKhaiEdu - Màn hình kho ma trận dùng chung cho hai phân hệ:
 *   /ma-tran-ca-nam  (loai = CA_NAM)  và  /ma-tran-chung (loai = CHUNG).
 *
 * 1. Chọn nhiều file, cả thư mục, hoặc kéo thả vào.
 * 2. App tự nhận môn, kì từ tên thư mục và tên file; thầy cô xem và sửa ô nào sai.
 * 3. Lưu: mỗi file là một phiên bản mới của ô (môn × kì).
 * 4. Tổ trưởng xem nội dung rồi xác nhận phiên bản được dùng.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, FilePen, FileUp, FolderUp, Loader2, Trash2, TriangleAlert, X } from 'lucide-react';
import { useAuth } from '@/core/contexts/AuthContext';
import { docChuTuDocx } from '@/core/utils/docx-text';
import { docKhoiTuDocx, khoiSangVanBan, type KhoiVanBan } from '@/core/utils/docx-bang';
import {
  DANH_SACH_KY_MA_TRAN,
  DANH_SACH_MON,
  TEN_LOAI_MA_TRAN,
  khoaO,
  oBiTrung,
  phanLoaiFile,
  type KetQuaPhanLoai,
  type KyMaTran,
  type LoaiMaTranTo,
} from '@/core/kho-ma-tran/phan-loai';
import type { TaiLieuMaTran } from '@/lib/repositories/kho-ma-tran.repository';

const VAI_TRO_TAI = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const VAI_TRO_XAC_NHAN = ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
const MOI_LAN_GUI = 4;

const nutChinh = 'nut-tke text-sm';
const nutPhu = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const o = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white';

interface FileCho extends KetQuaPhanLoai {
  file: File;
  boQua: boolean;
}

const tenMon = (ma: string) => DANH_SACH_MON.find((m) => m.ma === ma)?.ten ?? ma;
const tenKy = (ma: string | null) => DANH_SACH_KY_MA_TRAN.find((k) => k.ma === ma)?.ten ?? '';
const ngay = (s: string | null) => (s ? new Date(s).toLocaleDateString('vi-VN') : '');

/** Hiện lại file Word: đoạn văn và bảng có ô gộp, giống bản gốc nhất có thể. */
type ViTriSua = { khoi: number; hang?: number; o?: number };

function XemTaiLieuWord({ khoi, onSua }: { khoi: KhoiVanBan[]; onSua?: (vt: ViTriSua, chu: string) => void }) {
  // Khi sửa: ô và đoạn văn gõ trực tiếp được; rời ô thì ghi lại chữ
  const suaDuoc = (vt: ViTriSua) =>
    onSua
      ? {
          contentEditable: true,
          suppressContentEditableWarning: true,
          onBlur: (e: React.FocusEvent<HTMLElement>) => onSua(vt, e.currentTarget.innerText.replace(/\n$/, '')),
        }
      : {};
  const nenSua = onSua ? 'outline-none focus:bg-yellow-50 hover:bg-slate-50 cursor-text' : '';
  return (
    <div className="space-y-1 text-sm text-slate-800" style={{ fontFamily: '"Times New Roman", serif' }}>
      {khoi.map((k, i) =>
        k.loai === 'doan' ? (
          <p key={i} {...suaDuoc({ khoi: i })} className={`whitespace-pre-wrap min-h-[1em] ${k.giua ? 'text-center' : ''} ${k.dam ? 'font-bold' : ''} ${nenSua}`}>{k.chu}</p>
        ) : (
          <table key={i} className="w-full border-collapse my-2">
            <tbody>
              {k.hang.map((h, j) => (
                <tr key={j}>
                  {h.map((o, n) => (
                    <td key={n} colSpan={o.cot > 1 ? o.cot : undefined} rowSpan={o.hang > 1 ? o.hang : undefined}
                      {...suaDuoc({ khoi: i, hang: j, o: n })}
                      className={`border border-slate-400 px-1.5 py-1 align-middle whitespace-pre-wrap ${o.giua ? 'text-center' : ''} ${o.dam ? 'font-bold' : ''} ${nenSua}`}>
                      {o.chu}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ),
      )}
    </div>
  );
}

/** Đọc mọi file trong thư mục được kéo thả (Chrome, Edge, Firefox). */
async function docMucKeoTha(items: DataTransferItemList): Promise<{ file: File; duongDan: string }[]> {
  const kq: { file: File; duongDan: string }[] = [];
  const duyet = async (entry: any, cha: string): Promise<void> => {
    if (!entry) return;
    if (entry.isFile) {
      const file: File = await new Promise((ok, loi) => entry.file(ok, loi));
      kq.push({ file, duongDan: `${cha}${file.name}` });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      // readEntries trả về từng đợt, phải gọi đến khi rỗng
      for (;;) {
        const dot: any[] = await new Promise((ok, loi) => reader.readEntries(ok, loi));
        if (!dot.length) break;
        for (const con of dot) await duyet(con, `${cha}${entry.name}/`);
      }
    }
  };
  const entries = Array.from(items)
    .map((it) => (it.kind === 'file' ? it.webkitGetAsEntry?.() : null))
    .filter(Boolean);
  for (const e of entries) await duyet(e, '');
  return kq;
}

export function KhoMaTranView({ loai }: { loai: LoaiMaTranTo }) {
  const { activeRole } = useAuth();
  const duocTai = VAI_TRO_TAI.includes(activeRole as string);
  const duocXacNhan = VAI_TRO_XAC_NHAN.includes(activeRole as string);
  const loaiKhac: LoaiMaTranTo = loai === 'CHUNG' ? 'CA_NAM' : 'CHUNG';

  const [taiLieu, setTaiLieu] = useState<TaiLieuMaTran[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [cho, setCho] = useState<FileCho[]>([]);
  const [dangLuu, setDangLuu] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; text: string } | null>(null);
  const [oDangXem, setODangXem] = useState<string | null>(null);
  const [xemChu, setXemChu] = useState<{ id: string; tenFile: string; noiDung: string; cauTruc: KhoiVanBan[] | null } | null>(null);
  /** Đang sửa trực tiếp: lưu thành phiên bản mới của cùng ô */
  const [suaBan, setSuaBan] = useState<{ tu: TaiLieuMaTran; khoi: KhoiVanBan[]; daDoi: boolean } | null>(null);
  const [dangLuuSua, setDangLuuSua] = useState(false);
  /** Chữ đã sửa giữ ở đây, không đưa vào state, để React không vẽ lại ô đang gõ */
  const suaRef = useRef<KhoiVanBan[] | null>(null);
  const thayRef = useRef<HTMLInputElement>(null);
  const choRef = useRef<HTMLDivElement>(null);
  const [keoVao, setKeoVao] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const thuMucRef = useRef<HTMLInputElement>(null);

  const napDanhSach = useCallback(async () => {
    setDangTai(true);
    try {
      const r = await fetch(`/api/kho-ma-tran?loai=${loai}`).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setTaiLieu(r.taiLieu);
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangTai(false);
    }
  }, [loai]);

  useEffect(() => { napDanhSach(); }, [napDanhSach]);

  // Thuộc tính chọn thư mục không có trong kiểu React, gắn trực tiếp
  useEffect(() => {
    thuMucRef.current?.setAttribute('webkitdirectory', '');
    thuMucRef.current?.setAttribute('directory', '');
  }, []);

  /** epO: tải bản thay thế cho đúng một ô, môn và kì lấy theo ô đó, không đoán từ tên file */
  const nhanFile = (ds: { file: File; duongDan: string }[], epO?: { maMon: string; ky: KyMaTran | null }) => {
    const moi: FileCho[] = ds
      .map(({ file, duongDan }) => ({ ...phanLoaiFile(duongDan), file, boQua: false }))
      .filter((f) => f.dinhDang !== 'TAM')
      .map((f) => {
        const canhBao = [...f.canhBao];
        let boQua = f.dinhDang !== 'DOCX';
        if (f.loai === loaiKhac) {
          canhBao.unshift(`Đây là ${TEN_LOAI_MA_TRAN[loaiKhac].toLowerCase()}, tải ở mục ${TEN_LOAI_MA_TRAN[loaiKhac]}.`);
          boQua = true;
        }
        if (epO) return { ...f, loai, maMon: epO.maMon, ky: epO.ky, canhBao: canhBao.filter((c) => !c.includes(TEN_LOAI_MA_TRAN[loaiKhac])), boQua: f.dinhDang !== 'DOCX' };
        return { ...f, loai, ky: loai === 'CA_NAM' ? null : f.ky, canhBao, boQua };
      });
    setCho(moi);
    setThongBao(moi.length ? null : { loai: 'loi', text: 'Không tìm thấy file Word nào.' });
    if (moi.length) setTimeout(() => choRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const chonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ds = Array.from(e.target.files ?? []).map((file) => ({ file, duongDan: file.webkitRelativePath || file.name }));
    e.target.value = '';
    nhanFile(ds);
  };

  const thaVao = async (e: React.DragEvent) => {
    e.preventDefault();
    setKeoVao(false);
    if (!duocTai) return;
    const coThuMuc = Array.from(e.dataTransfer.items).some((it) => it.webkitGetAsEntry?.()?.isDirectory);
    if (coThuMuc) nhanFile(await docMucKeoTha(e.dataTransfer.items));
    else nhanFile(Array.from(e.dataTransfer.files).map((file) => ({ file, duongDan: file.name })));
  };

  const suaCho = (i: number, sua: Partial<FileCho>) => setCho((ds) => ds.map((f, j) => (j === i ? { ...f, ...sua } : f)));

  const trung = useMemo(() => oBiTrung(cho), [cho]);
  const canLuu = cho.filter((f) => !f.boQua);
  const thieu = canLuu.filter((f) => !khoaO(f));
  const coTheLuu = canLuu.length > 0 && thieu.length === 0 && trung.size === 0;

  const luu = async () => {
    setDangLuu(true);
    setThongBao(null);
    const loiDoc: string[] = [];
    const daDoc: { loai: LoaiMaTranTo; maMon: string; ky: KyMaTran | null; tenFile: string; duongDan: string; kichThuoc: number; noiDung: string; cauTruc: KhoiVanBan[] | null }[] = [];
    for (const f of canLuu) {
      try {
        const buf = await f.file.arrayBuffer();
        const noiDung = await docChuTuDocx(buf);
        const cauTruc = await docKhoiTuDocx(buf).catch(() => null);
        daDoc.push({ loai, maMon: f.maMon!, ky: f.ky, tenFile: f.tenFile, duongDan: f.duongDan, kichThuoc: f.file.size, noiDung, cauTruc });
      } catch {
        loiDoc.push(`${f.tenFile}: không đọc được file.`);
      }
    }
    const ketQua: { tenFile: string; ok: boolean; loi?: string; boSung?: boolean }[] = [];
    try {
      for (let i = 0; i < daDoc.length; i += MOI_LAN_GUI) {
        const r = await fetch('/api/kho-ma-tran', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: daDoc.slice(i, i + MOI_LAN_GUI) }),
        }).then((x) => x.json());
        if (r.error) throw new Error(r.error);
        ketQua.push(...r.ketQua);
      }
    } catch (e) {
      loiDoc.push(e instanceof Error ? e.message : String(e));
    }
    const boSung = ketQua.filter((k) => k.ok && k.boSung).length;
    const ok = ketQua.filter((k) => k.ok && !k.boSung).length;
    const ghiChuBoSung = boSung ? ` ${boSung} file trùng bản đã có nên không tạo bản mới, chỉ cập nhật để xem dạng bảng.` : '';
    const loi = [...loiDoc, ...ketQua.filter((k) => !k.ok).map((k) => `${k.tenFile}: ${k.loi}`)];
    setThongBao(
      loi.length
        ? { loai: 'loi', text: `Đã lưu ${ok} file.${ghiChuBoSung} Chưa lưu được: ${loi.join(' · ')}` }
        : { loai: 'ok', text: ok ? `Đã lưu ${ok} file.${ghiChuBoSung} Tổ trưởng bấm vào từng ô để xem và xác nhận.` : `Không có file mới.${ghiChuBoSung}` },
    );
    if (ok || boSung) setCho([]);
    setDangLuu(false);
    napDanhSach();
  };

  const xacNhan = async (id: string) => {
    const r = await fetch('/api/kho-ma-tran/xac-nhan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then((x) => x.json());
    setThongBao(r.error ? { loai: 'loi', text: r.error } : { loai: 'ok', text: 'Đã xác nhận.' });
    napDanhSach();
  };

  /** Xác nhận cùng lúc bản mới nhất đang chờ của mọi ô. Gọi lần lượt API xác nhận từng file sẵn có. */
  const [dangXacNhanHet, setDangXacNhanHet] = useState(false);
  const xacNhanTatCa = async () => {
    const ds = choXacNhanTheoO;
    if (!ds.length) return;
    if (!window.confirm(`Xác nhận cùng lúc ${ds.length} ô đang chờ? Mỗi ô lấy bản mới nhất. Nên mở xem trước những ô chưa kiểm tra.`)) return;
    setDangXacNhanHet(true);
    const loi: string[] = [];
    for (const t of ds) {
      try {
        const r = await fetch('/api/kho-ma-tran/xac-nhan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id }) }).then((x) => x.json());
        if (r.error) loi.push(`${tenMon(t.maMon)}${t.ky ? ' – ' + tenKy(t.ky) : ''}: ${r.error}`);
      } catch (e) {
        loi.push(`${tenMon(t.maMon)}${t.ky ? ' – ' + tenKy(t.ky) : ''}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setDangXacNhanHet(false);
    const ok = ds.length - loi.length;
    setThongBao(loi.length
      ? { loai: 'loi', text: `Đã xác nhận ${ok}/${ds.length} ô. Chưa được: ${loi.join('; ')}` }
      : { loai: 'ok', text: `Đã xác nhận ${ok} ô.` });
    napDanhSach();
  };

  const chonFileThay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    const o0 = dangXem[0];
    if (f && o0) nhanFile([{ file: f, duongDan: f.name }], { maMon: o0.maMon, ky: o0.ky });
  };

  const moSua = async (t: TaiLieuMaTran) => {
    const r = await fetch(`/api/kho-ma-tran/noi-dung?id=${t.id}`).then((x) => x.json());
    if (r.error) return setThongBao({ loai: 'loi', text: r.error });
    if (!r.cauTruc) return setThongBao({ loai: 'loi', text: 'Bản này chưa có dạng bảng nên chưa sửa trực tiếp được. Tải lại đúng file này trước, rồi bấm Sửa.' });
    setXemChu(null);
    suaRef.current = structuredClone(r.cauTruc);
    setSuaBan({ tu: t, khoi: r.cauTruc, daDoi: false });
  };

  const ghiSua = (vt: ViTriSua, chu: string) => {
    const khoi = suaRef.current;
    if (!khoi) return;
    const k = khoi[vt.khoi];
    const cu = k.loai === 'doan' ? k.chu : k.hang[vt.hang!][vt.o!].chu;
    if (cu === chu) return;
    if (k.loai === 'doan') k.chu = chu;
    else k.hang[vt.hang!][vt.o!].chu = chu;
    setSuaBan((sb) => (sb && !sb.daDoi ? { ...sb, daDoi: true } : sb));
  };

  const luuSua = async () => {
    if (!suaBan) return;
    // Rời ô đang gõ để ghi chữ trước khi lưu
    (document.activeElement as HTMLElement | null)?.blur();
    await new Promise((r) => setTimeout(r, 0));
    const khoi = suaRef.current;
    if (!khoi) return;
    const { tu } = suaBan;
    setDangLuuSua(true);
    try {
      const r = await fetch('/api/kho-ma-tran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [{ loai, maMon: tu.maMon, ky: tu.ky, tenFile: tu.tenFile, noiDung: khoiSangVanBan(khoi), cauTruc: khoi, ghiChu: `Sửa trực tiếp từ bản ${tu.phienBan}` }] }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      const kq = r.ketQua?.[0];
      if (!kq?.ok) throw new Error(kq?.loi ?? 'Không lưu được.');
      setThongBao(kq.boSung
        ? { loai: 'ok', text: 'Nội dung không khác bản mới nhất nên không tạo bản mới.' }
        : { loai: 'ok', text: `Đã lưu bản sửa thành bản ${kq.phienBan} (chờ xác nhận).` });
      setSuaBan(null);
      napDanhSach();
    } catch (e) {
      setThongBao({ loai: 'loi', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDangLuuSua(false);
    }
  };

  const xoa = async (t: TaiLieuMaTran) => {
    const hoi = t.trangThai === 'DA_XAC_NHAN'
      ? `Bản ${t.phienBan} ĐÃ XÁC NHẬN. Xóa hẳn bản này? Ô sẽ dùng bản đã xác nhận trước đó (nếu có). Không khôi phục được.`
      : `Xóa bản ${t.phienBan} (chưa xác nhận)?`;
    if (!window.confirm(hoi)) return;
    const id = t.id;
    const r = await fetch(`/api/kho-ma-tran?id=${id}`, { method: 'DELETE' }).then((x) => x.json());
    setThongBao(r.error ? { loai: 'loi', text: r.error } : { loai: 'ok', text: `Đã xóa bản ${t.phienBan}.` });
    if (!r.error && dangXem.length <= 1) setODangXem(null);
    napDanhSach();
  };

  const moChu = async (id: string) => {
    const r = await fetch(`/api/kho-ma-tran/noi-dung?id=${id}`).then((x) => x.json());
    if (r.error) setThongBao({ loai: 'loi', text: r.error });
    else setXemChu({ id, tenFile: r.tenFile, noiDung: r.noiDung, cauTruc: r.cauTruc ?? null });
  };

  // Bảng ô: môn × (kì hoặc một cột cả năm)
  const cot: { ma: KyMaTran | null; ten: string }[] = loai === 'CHUNG' ? DANH_SACH_KY_MA_TRAN : [{ ma: null, ten: 'Cả năm' }];
  const theoO = useMemo(() => {
    const m = new Map<string, TaiLieuMaTran[]>();
    for (const t of taiLieu) {
      const k = khoaO({ loai: t.loai, maMon: t.maMon, ky: t.ky })!;
      m.set(k, [...(m.get(k) ?? []), t]);
    }
    return m;
  }, [taiLieu]);

  // Mỗi ô: bản mới nhất đang chờ (mới hơn bản đã xác nhận). Danh sách đã xếp phiên bản giảm dần.
  const choXacNhanTheoO = useMemo(() => {
    const kq: TaiLieuMaTran[] = [];
    for (const ds of theoO.values()) {
      const daXN = ds.find((t) => t.trangThai === 'DA_XAC_NHAN');
      const moiNhat = ds.find((t) => t.trangThai === 'CHO_XAC_NHAN' && (!daXN || t.phienBan > daXN.phienBan));
      if (moiNhat) kq.push(moiNhat);
    }
    return kq;
  }, [theoO]);

  const dangXem = oDangXem ? theoO.get(oDangXem) ?? [] : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="the-tke p-6">
        <h1 className="text-xl font-bold text-slate-900">{TEN_LOAI_MA_TRAN[loai]}</h1>
        <p className="text-sm text-slate-600 mt-1">
          {loai === 'CHUNG'
            ? 'Mỗi môn, mỗi kì một file. Ma trận riêng và đề kiểm tra lấy khung từ phiên bản đã xác nhận.'
            : 'Mỗi môn một file cho cả năm. App lấy độ dài bài đọc, tốc độ đọc, chủ điểm và YCCĐ theo kì từ đây.'}{' '}
          Tải lại file thì thành phiên bản mới, bản cũ vẫn giữ.
        </p>
      </div>

      {thongBao && (
        <div className={`rounded-lg border p-3 text-sm ${thongBao.loai === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{thongBao.text}</div>
      )}

      {/* Tải lên */}
      {duocTai && (
        <div
          className={`rounded-xl border-2 border-dashed p-6 text-center space-y-3 ${keoVao ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'}`}
          onDragOver={(e) => { e.preventDefault(); setKeoVao(true); }}
          onDragLeave={() => setKeoVao(false)}
          onDrop={thaVao}
        >
          <p className="text-sm text-slate-700">Kéo thả file hoặc cả thư mục vào đây, hoặc bấm nút bên dưới.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={nutPhu} onClick={() => fileRef.current?.click()}><FileUp className="w-4 h-4" /> Chọn nhiều file</button>
            <button type="button" className={nutPhu} onClick={() => thuMucRef.current?.click()}><FolderUp className="w-4 h-4" /> Chọn cả thư mục</button>
          </div>
          <p className="text-xs text-slate-500">Chọn thư mục chỉ có ở Chrome, Edge trên máy tính. Điện thoại: chọn nhiều file. Chỉ nhận file .docx.</p>
          <input ref={fileRef} type="file" multiple accept=".docx,.doc" className="hidden" onChange={chonFile} />
          <input ref={thuMucRef} type="file" multiple className="hidden" onChange={chonFile} />
        </div>
      )}

      {/* Xem và sửa trước khi lưu */}
      {cho.length > 0 && (
        <div ref={choRef} className="the-tke p-6 space-y-4 scroll-mt-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Kiểm tra trước khi lưu ({canLuu.length}/{cho.length} file)</h2>
            <p className="text-sm text-slate-600">App đã đoán môn{loai === 'CHUNG' ? ', kì' : ''} từ tên thư mục và tên file. Ô nào sai thì chọn lại. Bỏ dấu tích để không lưu file đó.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr>
                  <th className="py-2 pr-2">Lưu</th>
                  <th className="py-2 pr-2">File</th>
                  <th className="py-2 pr-2">Môn</th>
                  {loai === 'CHUNG' && <th className="py-2 pr-2">Kì</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cho.map((f, i) => {
                  const k = khoaO(f);
                  const biTrung = !f.boQua && k && trung.has(k);
                  const chuaDu = !f.boQua && !k;
                  return (
                    <tr key={f.duongDan + i} className={f.boQua ? 'opacity-50' : biTrung || chuaDu ? 'bg-amber-50' : ''}>
                      <td className="py-2 pr-2 align-top">
                        <input type="checkbox" aria-label={`Lưu ${f.tenFile}`} disabled={f.dinhDang !== 'DOCX'} checked={!f.boQua} onChange={(e) => suaCho(i, { boQua: !e.target.checked })} />
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <div className="font-medium text-slate-900">{f.tenFile}</div>
                        {f.duongDan !== f.tenFile && <div className="text-xs text-slate-500">{f.duongDan}</div>}
                        {[...f.canhBao, ...(biTrung ? ['Ô này có hơn một file. Bỏ tích bớt, chỉ giữ một file.'] : [])].map((c) => (
                          <div key={c} className="text-xs text-amber-800 flex items-start gap-1 mt-0.5"><TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />{c}</div>
                        ))}
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <select aria-label="Môn" className={o} disabled={f.boQua} value={f.maMon ?? ''} onChange={(e) => suaCho(i, { maMon: e.target.value || null })}>
                          <option value="">– Chọn môn –</option>
                          {DANH_SACH_MON.map((m) => <option key={m.ma} value={m.ma}>{m.ten}</option>)}
                        </select>
                      </td>
                      {loai === 'CHUNG' && (
                        <td className="py-2 pr-2 align-top">
                          <select aria-label="Kì" className={o} disabled={f.boQua} value={f.ky ?? ''} onChange={(e) => suaCho(i, { ky: (e.target.value || null) as KyMaTran | null })}>
                            <option value="">– Chọn kì –</option>
                            {DANH_SACH_KY_MA_TRAN.map((k2) => <option key={k2.ma} value={k2.ma}>{k2.ten}</option>)}
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {thieu.length > 0 && <p className="text-sm text-amber-800">Còn {thieu.length} file chưa chọn đủ môn{loai === 'CHUNG' ? ' hoặc kì' : ''}.</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={nutPhu} onClick={() => setCho([])} disabled={dangLuu}>Hủy</button>
            <button type="button" className={nutChinh} onClick={luu} disabled={!coTheLuu || dangLuu}>
              {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Lưu {canLuu.length} file
            </button>
          </div>
        </div>
      )}

      {/* Xác nhận hàng loạt */}
      {duocXacNhan && !dangTai && choXacNhanTheoO.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">Có {choXacNhanTheoO.length} ô đang chờ xác nhận.</p>
          <button type="button" className={nutChinh} onClick={xacNhanTatCa} disabled={dangXacNhanHet}>
            {dangXacNhanHet ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Xác nhận tất cả ({choXacNhanTheoO.length} ô)
          </button>
        </div>
      )}

      {/* Bảng môn × kì */}
      <div className="the-tke overflow-x-auto">
        {dangTai ? (
          <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Đang tải...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Môn</th>
                {cot.map((c) => <th key={c.ten} className="text-left p-3">{c.ten}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DANH_SACH_MON.map((m) => (
                <tr key={m.ma}>
                  <td className="p-3 font-medium text-slate-900">{m.ten}</td>
                  {cot.map((c) => {
                    const k = khoaO({ loai, maMon: m.ma, ky: c.ma })!;
                    const ds = theoO.get(k) ?? [];
                    const daXN = ds.find((t) => t.trangThai === 'DA_XAC_NHAN');
                    const choXN = ds.filter((t) => t.trangThai === 'CHO_XAC_NHAN' && (!daXN || t.phienBan > daXN.phienBan));
                    return (
                      <td key={k} className="p-2">
                        {ds.length === 0 ? (
                          <span className="text-slate-400">Chưa tải</span>
                        ) : (
                          <button type="button" onClick={() => setODangXem(k)} className="text-left rounded-lg border border-slate-200 px-2 py-1.5 hover:border-blue-400 w-full">
                            {daXN && <div className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Đã xác nhận (bản {daXN.phienBan})</div>}
                            {choXN.length > 0 && <div className="text-amber-700">Chờ xác nhận (bản {choXN[0].phienBan})</div>}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Chi tiết một ô: các phiên bản */}
      {oDangXem && (
        <div className="the-tke p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {tenMon(dangXem[0]?.maMon ?? '')}{dangXem[0]?.ky ? ` – ${tenKy(dangXem[0].ky)}` : ''}: các phiên bản
            </h2>
            <button type="button" aria-label="Đóng" className="p-1 rounded hover:bg-slate-100" onClick={() => setODangXem(null)}><X className="w-5 h-5" /></button>
          </div>
          <ul className="divide-y divide-slate-100">
            {dangXem.map((t) => (
              <li key={t.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-900">Bản {t.phienBan}: {t.tenFile}</div>
                  <div className="text-xs text-slate-500">
                    {t.ghiChu ? `${t.ghiChu} · ` : ''}Tải lên {ngay(t.taiLenLuc)} · {t.soKyTu.toLocaleString('vi-VN')} ký tự ·{' '}
                    {t.trangThai === 'DA_XAC_NHAN' ? `đã xác nhận ${ngay(t.xacNhanLuc)}` : 'chờ xác nhận'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={nutPhu} onClick={() => moChu(t.id)}><Eye className="w-4 h-4" /> Xem</button>
                  {duocTai && (
                    <button type="button" className={nutPhu} onClick={() => moSua(t)}><FilePen className="w-4 h-4" /> Sửa</button>
                  )}
                  {t.trangThai === 'CHO_XAC_NHAN' && duocXacNhan && (
                    <button type="button" className={nutChinh} onClick={() => xacNhan(t.id)}><CheckCircle2 className="w-4 h-4" /> Xác nhận</button>
                  )}
                  {(t.trangThai === 'CHO_XAC_NHAN' ? duocTai : duocXacNhan) && (
                    <button type="button" className={`${nutPhu} text-red-700 hover:bg-red-50`} onClick={() => xoa(t)}><Trash2 className="w-4 h-4" /> Xóa</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {duocTai && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <button type="button" className={nutPhu} onClick={() => thayRef.current?.click()}><FileUp className="w-4 h-4" /> Tải bản thay thế cho ô này</button>
              <input ref={thayRef} type="file" accept=".docx" className="hidden" onChange={chonFileThay} />
              <span className="text-xs text-slate-500">File mới thành bản tiếp theo của đúng ô này, không cần đặt tên file theo môn, kì.</span>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Bản đã xác nhận mới nhất là bản được dùng. Sửa trực tiếp hoặc tải bản thay thế đều tạo bản mới chờ xác nhận, bản cũ vẫn giữ.
            {duocXacNhan ? ' Bản sai hẳn thì tổ trưởng bấm Xóa (xóa được cả bản đã xác nhận).' : ''}
          </p>
        </div>
      )}

      {xemChu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-slate-900">{xemChu.tenFile}</div>
              <div className="flex items-center gap-2">
                {duocTai && xemChu.cauTruc && (() => {
                  const t = taiLieu.find((x) => x.id === xemChu.id);
                  return t ? <button type="button" className={nutPhu} onClick={() => moSua(t)}><FilePen className="w-4 h-4" /> Sửa</button> : null;
                })()}
                <button type="button" aria-label="Đóng" className="p-1 rounded hover:bg-slate-100" onClick={() => setXemChu(null)}><X className="w-5 h-5" /></button>
              </div>
            </div>
            {xemChu.cauTruc ? (
              <div className="p-4 overflow-auto"><XemTaiLieuWord khoi={xemChu.cauTruc} /></div>
            ) : (
              <>
                <p className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">Bản này tải lên trước khi app biết đọc bảng nên chỉ còn chữ. Muốn xem dạng bảng, thầy cô tải lại đúng file này: app không tạo phiên bản mới, chỉ bổ sung phần bảng.</p>
                <pre className="p-4 overflow-auto text-sm whitespace-pre-wrap font-sans text-slate-800">{xemChu.noiDung}</pre>
              </>
            )}
          </div>
        </div>
      )}

      {suaBan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b">
              <div>
                <div className="font-semibold text-slate-900">Sửa: {suaBan.tu.tenFile} (bản {suaBan.tu.phienBan})</div>
                <div className="text-xs text-slate-500">Bấm vào ô hoặc dòng chữ để sửa. Lưu xong thành bản mới chờ xác nhận, bản {suaBan.tu.phienBan} vẫn giữ.</div>
              </div>
              <div className="flex gap-2">
                <button type="button" className={nutPhu} disabled={dangLuuSua} onClick={() => { if (!suaBan.daDoi || window.confirm('Bỏ những chỗ đã sửa?')) setSuaBan(null); }}>Hủy</button>
                <button type="button" className={nutChinh} disabled={dangLuuSua} onClick={luuSua}>
                  {dangLuuSua ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Lưu thành bản mới
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto"><XemTaiLieuWord khoi={suaBan.khoi} onSua={ghiSua} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
