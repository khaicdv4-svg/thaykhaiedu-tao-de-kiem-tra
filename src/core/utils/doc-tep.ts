/**
 * Đọc chữ từ file trên trình duyệt: .docx, .pdf (có lớp chữ), .txt/.md. PDF scan ảnh không có chữ nên không đọc được.
 */
import { docChuTuDocx, docBangTuDocx, docChuTuXlsx } from './docx-text';

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

/** Lấy chữ từ PDF bằng pdfjs đã nạp sẵn (dùng chung cho trình duyệt và máy chủ). */
export async function trichChuPdf(pdfjs: PdfJs, buf: ArrayBuffer, theoDoi?: (trang: number, tong: number) => void): Promise<string> {
  const nap = pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 });
  const pdf = await nap.promise;
  const cacTrang: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const trang = await pdf.getPage(i);
    const nd = await trang.getTextContent();
    let dong = '';
    let kq = '';
    let yCu: number | null = null;
    for (const it of nd.items as Array<{ str?: string; transform?: number[]; hasEOL?: boolean }>) {
      if (typeof it.str !== 'string') continue;
      const y = it.transform?.[5] ?? null;
      if (yCu !== null && y !== null && Math.abs(y - yCu) > 3) { kq += `${dong.trim()}\n`; dong = ''; }
      dong += it.str + (it.hasEOL ? '\n' : ' ');
      yCu = y;
    }
    kq += dong.trim();
    cacTrang.push(`[Trang ${i}]\n${kq.replace(/[ \t]+/g, ' ').trim()}`);
    theoDoi?.(i, pdf.numPages);
  }
  await nap.destroy();
  const chu = cacTrang.join('\n\n');
  if (chu.replace(/\[Trang \d+\]|\s/g, '').length < 50) throw new Error('PDF này không có lớp chữ (có thể là ảnh quét). Thầy lưu thành Word/văn bản hoặc dán chữ.');
  return chu;
}

export async function docChuTuPdf(buf: ArrayBuffer, theoDoi?: (trang: number, tong: number) => void): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  return trichChuPdf(pdfjs, buf, theoDoi);
}

export async function docChuTuTep(f: File, theoDoi?: (trang: number, tong: number) => void): Promise<string> {
  const ten = f.name.toLowerCase();
  if (ten.endsWith('.docx')) return docChuTuDocx(await f.arrayBuffer());
  if (ten.endsWith('.pdf')) return docChuTuPdf(await f.arrayBuffer(), theoDoi);
  if (ten.endsWith('.txt') || ten.endsWith('.md')) return f.text();
  throw new Error('Chỉ nhận file .docx, .pdf (có lớp chữ), .txt. File .doc cũ thầy lưu lại thành .docx.');
}

/** Word/Excel/CSV chứa bảng PPCT: giữ bảng, mỗi hàng một dòng, ô cách nhau dấu Tab. */
export async function docBangTuTep(f: File): Promise<string> {
  const ten = f.name.toLowerCase();
  if (ten.endsWith('.docx')) return docBangTuDocx(await f.arrayBuffer());
  if (ten.endsWith('.xlsx')) return docChuTuXlsx(await f.arrayBuffer());
  if (ten.endsWith('.csv') || ten.endsWith('.txt')) return (await f.text()).replace(/^\uFEFF/, '').split(/\r?\n/).map((d) => (d.includes('\t') ? d : d.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map((x) => x.replace(/^"|"$/g, '').trim()).join('\t'))).join('\n');
  throw new Error('Chỉ nhận file .docx, .xlsx, .csv. File .doc hoặc .xls cũ thầy lưu lại thành .docx hoặc .xlsx.');
}

export interface PdfDocChu {
  soTrang: number;
  /** Chữ của trang số `trang` (từ 1); rỗng nếu trang là ảnh quét. */
  chu: (trang: number) => Promise<string>;
}

/** Mở PDF để lấy chữ từng trang (dùng cho Kho sách). Chỉ chạy ở trình duyệt. */
export async function moPdfDocChu(buf: ArrayBuffer): Promise<PdfDocChu> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  return {
    soTrang: pdf.numPages,
    async chu(trang) {
      const t = await pdf.getPage(trang);
      const nd = await t.getTextContent();
      let dong = '';
      let kq = '';
      let yCu: number | null = null;
      for (const it of nd.items as Array<{ str?: string; transform?: number[]; hasEOL?: boolean }>) {
        if (typeof it.str !== 'string') continue;
        const y = it.transform?.[5] ?? null;
        if (yCu !== null && y !== null && Math.abs(y - yCu) > 3) { kq += `${dong.trim()}\n`; dong = ''; }
        dong += it.str + (it.hasEOL ? '\n' : ' ');
        yCu = y;
      }
      kq += dong.trim();
      return kq.replace(/[ \t]+/g, ' ').trim();
    },
  };
}
