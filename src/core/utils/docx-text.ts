/**
 * Đọc chữ từ file Word (.docx) mà không cần thư viện ngoài.
 * File .docx là một gói zip; chữ nằm trong word/document.xml.
 * Dùng được cả trên trình duyệt và Node (cần DecompressionStream, có sẵn từ Node 18).
 */

async function giaiNen(raw: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([raw as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function docTepTrongZip(buf: ArrayBuffer, ten: string): Promise<Uint8Array | null> {
  const v = new DataView(buf);
  const u8 = new Uint8Array(buf);
  // Tìm "End of central directory" từ cuối file
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('File không phải định dạng .docx hợp lệ.');
  const soMuc = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let i = 0; i < soMuc; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const kieuNen = v.getUint16(p + 10, true);
    const coNen = v.getUint32(p + 20, true);
    const dTen = v.getUint16(p + 28, true);
    const dPhu = v.getUint16(p + 30, true);
    const dChu = v.getUint16(p + 32, true);
    const viTri = v.getUint32(p + 42, true);
    const tenTep = dec.decode(u8.subarray(p + 46, p + 46 + dTen));
    if (tenTep === ten) {
      const lTen = v.getUint16(viTri + 26, true);
      const lPhu = v.getUint16(viTri + 28, true);
      const batDau = viTri + 30 + lTen + lPhu;
      const du = u8.subarray(batDau, batDau + coNen);
      if (kieuNen === 0) return du;
      if (kieuNen === 8) return giaiNen(du);
      throw new Error('Kiểu nén trong file .docx chưa hỗ trợ.');
    }
    p += 46 + dTen + dPhu + dChu;
  }
  return null;
}

export function giaiMaXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

/** Chuyển document.xml thành văn bản: mỗi đoạn (w:p) một dòng. */
export function xmlWordSangVanBan(xml: string): string {
  const doan = xml.split(/<\/w:p>/);
  const out: string[] = [];
  for (const d of doan) {
    let s = '';
    const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br(?:\s[^>]*)?\/>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d))) {
      if (m[1] !== undefined) s += giaiMaXml(m[1]);
      else if (m[0].startsWith('<w:tab')) s += '\t';
      else s += '\n';
    }
    out.push(s);
  }
  return out.join('\n').replace(/\n+$/, '');
}

export async function docChuTuDocx(buf: ArrayBuffer): Promise<string> {
  const xml = await docTepTrongZip(buf, 'word/document.xml');
  if (!xml) throw new Error('Không tìm thấy nội dung trong file .docx.');
  return xmlWordSangVanBan(new TextDecoder().decode(xml));
}

/** Chuyển document.xml thành văn bản có giữ bảng: mỗi hàng bảng một dòng, các ô cách nhau dấu Tab. */
export function xmlWordSangVanBanCoBang(xml: string): string {
  const out: string[] = [];
  const cacHang = (b: string) => {
    for (const h of b.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) ?? []) {
      const o = (h.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) ?? []).map((c) => xmlWordSangVanBan(c).replace(/\s*\n\s*/g, ' ').trim());
      if (o.some((x) => x)) out.push(o.join('\t'));
    }
  };
  let viTri = 0;
  for (const m of xml.matchAll(/<w:tbl[\s>][\s\S]*?<\/w:tbl>/g)) {
    const truoc = xmlWordSangVanBan(xml.slice(viTri, m.index));
    if (truoc.trim()) out.push(truoc);
    cacHang(m[0]);
    viTri = (m.index ?? 0) + m[0].length;
  }
  const sau = xmlWordSangVanBan(xml.slice(viTri));
  if (sau.trim()) out.push(sau);
  return out.join('\n');
}

export async function docBangTuDocx(buf: ArrayBuffer): Promise<string> {
  const xml = await docTepTrongZip(buf, 'word/document.xml');
  if (!xml) throw new Error('Không tìm thấy nội dung trong file .docx.');
  return xmlWordSangVanBanCoBang(new TextDecoder().decode(xml));
}

const cotSo = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** Chuyển một trang tính (.xlsx) thành văn bản: mỗi hàng một dòng, các ô cách nhau dấu Tab. */
export function xmlSheetSangVanBan(xml: string, chuChung: string[]): string {
  const dong: string[] = [];
  for (const h of xml.match(/<row[\s>][\s\S]*?<\/row>/g) ?? []) {
    const o: string[] = [];
    for (const c of h.match(/<c[\s>][^]*?(?:<\/c>|\/>)/g) ?? []) {
      const ref = /\br="([A-Z]+\d+)"/.exec(c)?.[1];
      const kieu = /\bt="(\w+)"/.exec(c)?.[1];
      let v = '';
      if (kieu === 's') v = chuChung[Number(/<v>(\d+)<\/v>/.exec(c)?.[1])] ?? '';
      else if (kieu === 'inlineStr') v = [...c.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => giaiMaXml(m[1])).join('');
      else v = giaiMaXml(/<v>([\s\S]*?)<\/v>/.exec(c)?.[1] ?? '');
      const k = ref ? cotSo(ref) : o.length;
      while (o.length < k) o.push('');
      o[k] = v.replace(/\s*\n\s*/g, ' ').trim();
    }
    if (o.some((x) => x)) dong.push(o.join('\t'));
  }
  return dong.join('\n');
}

export async function docChuTuXlsx(buf: ArrayBuffer): Promise<string> {
  const dec = new TextDecoder();
  const ss = await docTepTrongZip(buf, 'xl/sharedStrings.xml');
  const chuChung = ss ? (dec.decode(ss).match(/<si[\s>][\s\S]*?<\/si>/g) ?? []).map((si) => [...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => giaiMaXml(m[1])).join('')) : [];
  const cacTrang: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const sh = await docTepTrongZip(buf, `xl/worksheets/sheet${i}.xml`);
    if (!sh) { if (i === 1) continue; break; }
    const t = xmlSheetSangVanBan(dec.decode(sh), chuChung);
    if (t.trim()) cacTrang.push(t);
  }
  if (!cacTrang.length) throw new Error('Không thấy dữ liệu trong file Excel (.xlsx).');
  return cacTrang.join('\n');
}
