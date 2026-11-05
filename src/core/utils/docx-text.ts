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

async function docTepTrongZip(buf: ArrayBuffer, ten: string): Promise<Uint8Array | null> {
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

function giaiMaXml(s: string): string {
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
