/**
 * Đọc file Word (.docx) thành các khối để hiển thị lại gần giống bản gốc:
 * đoạn văn (có canh giữa, in đậm) và bảng (giữ ô gộp ngang, gộp dọc).
 * Không dùng thư viện ngoài; chạy được trên trình duyệt và Node.
 * Phần chữ thuần cho các chức năng khác vẫn lấy từ docChuTuDocx, không đổi.
 */

import { docTepTrongZip, giaiMaXml } from './docx-text';

export interface OBang {
  chu: string;
  /** Gộp ngang: số cột ô này chiếm */
  cot: number;
  /** Gộp dọc: số hàng ô này chiếm */
  hang: number;
  dam?: boolean;
  giua?: boolean;
}

export type KhoiVanBan =
  | { loai: 'doan'; chu: string; dam?: boolean; giua?: boolean }
  | { loai: 'bang'; hang: OBang[][] };

interface ODangDoc {
  dong: string[];
  cot: number;
  gopDoc: 'batDau' | 'noiTiep' | null;
  dam: boolean;
  giua: boolean;
}

const LA_DUNG = (the: string) => {
  const m = /w:val="([^"]*)"/.exec(the);
  return !m || !['0', 'false', 'off', 'none'].includes(m[1]);
};

/** Tính số hàng gộp dọc rồi bỏ những ô "nối tiếp". */
function hoanThienBang(hangTho: ODangDoc[][]): OBang[][] {
  const ketQua: (OBang | null)[][] = [];
  const dangMo = new Map<number, OBang>(); // vị trí cột -> ô đang gộp dọc
  for (const hang of hangTho) {
    const moi: (OBang | null)[] = [];
    let viTri = 0;
    for (const o of hang) {
      const chu = o.dong.join('\n').replace(/\n+$/, '');
      if (o.gopDoc === 'noiTiep' && dangMo.has(viTri)) {
        dangMo.get(viTri)!.hang += 1;
        moi.push(null);
      } else {
        const ob: OBang = { chu, cot: o.cot, hang: 1, ...(o.dam ? { dam: true } : {}), ...(o.giua ? { giua: true } : {}) };
        moi.push(ob);
        if (o.gopDoc === 'batDau') dangMo.set(viTri, ob);
        else dangMo.delete(viTri);
      }
      viTri += o.cot;
    }
    ketQua.push(moi);
  }
  return ketQua.map((h) => h.filter((o): o is OBang => o !== null));
}

export function xmlWordSangKhoi(xml: string): KhoiVanBan[] {
  const khoi: KhoiVanBan[] = [];
  const re = /<[^>]+>|[^<]+/g;
  let m: RegExpExecArray | null;

  let doSauBang = 0;
  let boQua = 0; // trong mc:Fallback (bản dự phòng, trùng chữ)
  let trongDoan = false;
  let trongChu = false;
  let chuDoan = '';
  let damDoan = false;
  let giuaDoan = false;
  let bangHienTai: ODangDoc[][] = [];
  let oHienTai: ODangDoc | null = null;

  while ((m = re.exec(xml))) {
    const tk = m[0];
    if (tk[0] !== '<') {
      if (trongChu && !boQua) chuDoan += giaiMaXml(tk);
      continue;
    }
    const dong = tk.startsWith('</');
    const tuDong = tk.endsWith('/>');
    const ten = /^<\/?([\w:.-]+)/.exec(tk)?.[1] ?? '';

    if (ten === 'mc:Fallback') { boQua += dong ? -1 : tuDong ? 0 : 1; continue; }
    if (boQua) continue;

    switch (ten) {
      case 'w:tbl':
        if (!dong) {
          doSauBang++;
          if (doSauBang === 1) bangHienTai = [];
        } else {
          if (doSauBang === 1) khoi.push({ loai: 'bang', hang: hoanThienBang(bangHienTai) });
          doSauBang--;
        }
        break;
      case 'w:tr':
        if (!dong && doSauBang === 1) bangHienTai.push([]);
        break;
      case 'w:tc':
        if (doSauBang === 1) {
          if (!dong) {
            oHienTai = { dong: [], cot: 1, gopDoc: null, dam: true, giua: true };
            bangHienTai[bangHienTai.length - 1]?.push(oHienTai);
          } else {
            if (oHienTai && !oHienTai.dong.some((d) => d.trim())) { oHienTai.dam = false; oHienTai.giua = false; }
            oHienTai = null;
          }
        }
        break;
      case 'w:gridSpan':
        if (doSauBang === 1 && oHienTai) oHienTai.cot = Math.max(1, Number(/w:val="(\d+)"/.exec(tk)?.[1] ?? 1));
        break;
      case 'w:vMerge':
        if (doSauBang === 1 && oHienTai) oHienTai.gopDoc = /w:val="restart"/.test(tk) ? 'batDau' : 'noiTiep';
        break;
      case 'w:p':
        if (tuDong) {
          if (doSauBang >= 1 && oHienTai) oHienTai.dong.push('');
          else if (doSauBang === 0) khoi.push({ loai: 'doan', chu: '' });
        } else if (!dong) {
          trongDoan = true; chuDoan = ''; damDoan = false; giuaDoan = false;
        } else {
          trongDoan = false;
          if (doSauBang >= 1) {
            if (oHienTai) {
              oHienTai.dong.push(chuDoan);
              if (chuDoan.trim()) { oHienTai.dam &&= damDoan; oHienTai.giua &&= giuaDoan; }
            }
          } else {
            khoi.push({ loai: 'doan', chu: chuDoan, ...(damDoan && chuDoan.trim() ? { dam: true } : {}), ...(giuaDoan ? { giua: true } : {}) });
          }
        }
        break;
      case 'w:jc':
        if (trongDoan) giuaDoan = /w:val="center"/.test(tk);
        break;
      case 'w:b':
        if (trongDoan && tuDong && LA_DUNG(tk)) damDoan = true;
        break;
      case 'w:t':
        trongChu = !dong && !tuDong;
        break;
      case 'w:tab':
        if (trongDoan && tuDong) chuDoan += '\t';
        break;
      case 'w:br':
      case 'w:cr':
        if (trongDoan && tuDong) chuDoan += '\n';
        break;
    }
  }

  // Gộp các dòng trống liên tiếp ở ngoài bảng
  return khoi.filter((k, i) => !(k.loai === 'doan' && !k.chu.trim() && i > 0 && khoi[i - 1].loai === 'doan' && !(khoi[i - 1] as { chu: string }).chu.trim()));
}

export async function docKhoiTuDocx(buf: ArrayBuffer): Promise<KhoiVanBan[]> {
  const xml = await docTepTrongZip(buf, 'word/document.xml');
  if (!xml) throw new Error('Không tìm thấy nội dung trong file .docx.');
  return xmlWordSangKhoi(new TextDecoder().decode(xml));
}
