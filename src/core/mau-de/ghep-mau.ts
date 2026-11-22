/**
 * ThayKhaiEdu - Xuất đề theo mẫu của tổ (mẫu đề phần 2).
 *
 * App vẫn dựng phần câu hỏi, hướng dẫn chấm như cũ. Sau đó, mỗi chỗ có đầu bài do app dựng
 * (bảng tên trường – GV coi, bảng Điểm – GV chấm) được thay bằng ĐÚNG đầu bài trong file mẫu
 * thầy cô đã tải lên: giữ khung, phông, cỡ chữ, ô gộp, hình (nếu có) của mẫu; chỉ đổi dòng
 * tên kì kiểm tra, tên môn, thời gian cho đúng đề đang xuất.
 *
 * Bề ngang bảng của mẫu được co giãn theo bề ngang trang của tệp xuất (A4, lề 1 cm) để
 * đầu bài thẳng hàng với bảng câu hỏi.
 *
 * Phần thuần: chỉ đọc ghi gói .docx (zip) trong bộ nhớ, không gọi cơ sở dữ liệu.
 */

import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

// ---------------------------------------------------------------------------
// Tách phần tử XML (đủ dùng cho WordprocessingML, không cần thư viện XML)
// ---------------------------------------------------------------------------

interface Khuc { batDau: number; ketThuc: number }

/** Vị trí kết thúc của phần tử w:ten bắt đầu tại `tu` (đếm lồng nhau cùng tên). */
function ketThucPhanTu(xml: string, ten: string, tu: number): number {
  const re = new RegExp(`<(/?)w:${ten}(?=[\\s>/])[^>]*?(/?)>`, 'g');
  re.lastIndex = tu;
  let sau = 0;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    if (m[2] === '/') { if (sau === 0) return re.lastIndex; continue; }
    if (m[1] === '/') { sau--; if (sau === 0) return re.lastIndex; } else sau++;
  }
  throw new Error(`Tệp Word hỏng: thiếu thẻ đóng w:${ten}.`);
}

/** Các phần tử w:ten nằm ngoài cùng trong đoạn xml (không lấy phần tử lồng bên trong phần tử cùng tên). */
function cacPhanTu(xml: string, ten: string): Khuc[] {
  const out: Khuc[] = [];
  const re = new RegExp(`<w:${ten}(?=[\\s>/])`, 'g');
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const kt = ketThucPhanTu(xml, ten, m.index);
    out.push({ batDau: m.index, ketThuc: kt });
    re.lastIndex = kt;
  }
  return out;
}

/** Các phần tử con trực tiếp của <w:body> (đoạn, bảng, …), không tính sectPr cuối. */
function khoiThan(docXml: string): { dau: number; cuoi: number; khoi: Khuc[] } {
  const mo = docXml.search(/<w:body\b[^>]*>/);
  if (mo < 0) throw new Error('Tệp Word không có phần thân.');
  const dau = docXml.indexOf('>', mo) + 1;
  const cuoi = docXml.lastIndexOf('</w:body>');
  const khoi: Khuc[] = [];
  let i = dau;
  const reThe = /<w:([A-Za-z]+)(?=[\s>/])/g;
  while (i < cuoi) {
    reThe.lastIndex = i;
    const m = reThe.exec(docXml);
    if (!m || m.index >= cuoi) break;
    const kt = ketThucPhanTu(docXml, m[1], m.index);
    if (m[1] !== 'sectPr') khoi.push({ batDau: m.index, ketThuc: kt });
    i = kt;
  }
  return { dau, cuoi, khoi };
}

const giaiMa = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const maHoa = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Chữ của một đoạn XML: các w:t, tab thành dấu cách, xuống dòng (w:br, hết đoạn) thành \n. */
function chuCua(xml: string): string {
  let out = '';
  for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\b[^>]*\/>|<\/w:p>/g)) {
    if (m[1] !== undefined) out += m[1];
    else if (m[0] === '<w:tab/>') out += ' ';
    else out += '\n';
  }
  return giaiMa(out);
}

// ---------------------------------------------------------------------------
// Dòng tiêu đề trong đầu bài
// ---------------------------------------------------------------------------

export interface TieuDeDauBai {
  /** Ví dụ "KTĐK GIỮA HKI - NĂM HỌC 2026 - 2027" */
  tieuDeKy: string;
  /** Ví dụ "MÔN TOÁN - Lớp 4" */
  mon: string;
  /** Ví dụ "Thời gian: 40 phút"; null = phần không ghi thời gian (đọc thành tiếng) */
  thoiGian: string | null;
}

const LA_TIEU_DE_KY = /^\s*(KTĐK|(BÀI |ĐỀ )?KIỂM TRA)\b/i;
const LA_MON = /^\s*M[ÔôOo]N\b/i;
const LA_THOI_GIAN = /^\s*Thời gian/i;

/** Đọc ba dòng tiêu đề từ bảng đầu bài do app dựng. */
function docTieuDeCuaApp(bangXml: string): TieuDeDauBai | null {
  const dong = cacPhanTu(bangXml, 'p').map((k) => chuCua(bangXml.slice(k.batDau, k.ketThuc)).trim()).filter(Boolean);
  const tieuDeKy = dong.find((d) => LA_TIEU_DE_KY.test(d) && !LA_MON.test(d));
  const mon = dong.find((d) => LA_MON.test(d));
  if (!tieuDeKy || !mon) return null;
  return { tieuDeKy, mon, thoiGian: dong.find((d) => LA_THOI_GIAN.test(d)) ?? null };
}

/** rPr của lần chạy chữ đầu tiên có w:t trong đoạn xml (giữ phông, cỡ, đậm của mẫu). */
function rPrDau(xml: string): string {
  for (const m of xml.matchAll(/<w:r(?=[\s>])[^>]*>((?:(?!<\/w:r>)[\s\S])*?)<\/w:r>/g)) {
    if (/<w:t[\s>]/.test(m[1])) return m[1].match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
  }
  return '';
}

const runChu = (rPr: string, chu: string) => `<w:r>${rPr}<w:t xml:space="preserve">${maHoa(chu)}</w:t></w:r>`;

/**
 * Thay các dòng tiêu đề trong một ô của mẫu. Mỗi đoạn được tách theo dấu xuống dòng (w:br) thành từng dòng;
 * dòng nào là tên kì / môn / thời gian thì thay chữ (giữ định dạng của chính dòng đó), dòng khác giữ nguyên.
 */
function thayTieuDeTrongO(oXml: string, td: TieuDeDauBai): string {
  const doan = cacPhanTu(oXml, 'p');
  let out = '';
  let truoc = 0;
  for (const k of doan) {
    out += oXml.slice(truoc, k.batDau);
    truoc = k.ketThuc;
    const p = oXml.slice(k.batDau, k.ketThuc);
    const chu = chuCua(p).replace(/\n$/, '');
    const dong = chu.split('\n');
    if (!dong.some((d) => LA_TIEU_DE_KY.test(d) || LA_MON.test(d) || LA_THOI_GIAN.test(d))) { out += p; continue; }
    const moThe = p.match(/^<w:p\b[^>]*>/)?.[0] ?? '<w:p>';
    const pPr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
    // Định dạng từng dòng: lấy rPr của lần chạy đầu tiên sau mỗi chỗ xuống dòng
    const phanDong = p.split(/<w:br\b[^>]*\/>/);
    const moi: string[] = [];
    dong.forEach((d, i) => {
      const rPr = rPrDau(phanDong[i] ?? '') || rPrDau(p);
      let noiDung: string | null = d;
      if (LA_MON.test(d)) noiDung = td.mon;
      else if (LA_THOI_GIAN.test(d)) noiDung = td.thoiGian;
      else if (LA_TIEU_DE_KY.test(d)) noiDung = td.tieuDeKy;
      if (noiDung === null) return;
      moi.push(LA_MON.test(d) || LA_THOI_GIAN.test(d) || LA_TIEU_DE_KY.test(d) ? runChu(rPr, noiDung) : (d ? runChu(rPr, d) : ''));
    });
    if (!moi.length) { out += `${moThe}${pPr}</w:p>`; continue; }
    out += `${moThe}${pPr}${moi.join('<w:r><w:br/></w:r>')}</w:p>`;
  }
  return out + oXml.slice(truoc);
}

/** Thay tiêu đề trong mọi ô (w:tc) có dòng tên kì hoặc tên môn. */
function thayTieuDe(dauBai: string, td: TieuDeDauBai): string {
  let out = '';
  let truoc = 0;
  const oDaThay = new Set<number>();
  for (const bang of cacPhanTu(dauBai, 'tbl')) {
    const xmlBang = dauBai.slice(bang.batDau, bang.ketThuc);
    for (const o of cacPhanTuSau(xmlBang, 'tc')) {
      const chu = chuCua(xmlBang.slice(o.batDau, o.ketThuc));
      if (!chu.split('\n').some((d) => LA_TIEU_DE_KY.test(d) || LA_MON.test(d))) continue;
      oDaThay.add(bang.batDau + o.batDau);
    }
  }
  // Thay từ đầu đến cuối theo vị trí đã đánh dấu
  const viTri = [...oDaThay].sort((a, b) => a - b);
  for (const v of viTri) {
    const kt = ketThucPhanTu(dauBai, 'tc', v);
    out += dauBai.slice(truoc, v) + thayTieuDeTrongO(dauBai.slice(v, kt), td);
    truoc = kt;
  }
  out += dauBai.slice(truoc);
  // Tiêu đề viết ngoài bảng (đoạn văn trơn)
  if (!viTri.length) return thayTieuDeTrongO(out, td);
  return out;
}

/** Mọi ô w:tc trong bảng (kể cả bảng lồng), không lồng ô trong ô. */
function cacPhanTuSau(xml: string, ten: string): Khuc[] {
  const out: Khuc[] = [];
  const re = new RegExp(`<w:${ten}(?=[\\s>/])`, 'g');
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const kt = ketThucPhanTu(xml, ten, m.index);
    const trong = xml.slice(m.index, kt);
    // ô có bảng lồng: lấy các ô bên trong thay vì ô ngoài
    if (/<w:tbl[\s>]/.test(trong.slice(1))) continue;
    out.push({ batDau: m.index, ketThuc: kt });
    re.lastIndex = kt;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Co giãn bề ngang bảng, dọn những thứ không mang sang được
// ---------------------------------------------------------------------------

function beNgangChu(docXml: string): number | null {
  const sect = docXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)?.[0];
  if (!sect) return null;
  const so = (the: string, tt: string) => Number(sect.match(new RegExp(`<w:${the}\\b[^>]*\\bw:${tt}="(\\d+)"`))?.[1] ?? NaN);
  const rong = so('pgSz', 'w');
  const trai = so('pgMar', 'left');
  const phai = so('pgMar', 'right');
  const kq = rong - (Number.isFinite(trai) ? trai : 0) - (Number.isFinite(phai) ? phai : 0);
  return Number.isFinite(kq) && kq > 1000 ? kq : null;
}

function coGian(xml: string, heSo: number): string {
  if (Math.abs(heSo - 1) < 0.005) return xml;
  const doi = (v: string) => String(Math.round(Number(v) * heSo));
  return xml
    .replace(/<w:gridCol\b([^>]*?)\bw:w="(\d+)"/g, (_, a, v) => `<w:gridCol${a}w:w="${doi(v)}"`)
    .replace(/<w:(tcW|tblW|tblInd)\b([^>]*?)\/>/g, (the, ten, a: string) => {
      if (/w:type="(pct|auto|nil)"/.test(a)) return the;
      return `<w:${ten}${a.replace(/\bw:w="(\d+)"/, (_m: string, v: string) => `w:w="${doi(v)}"`)}/>`;
    });
}

/** Bỏ những phần không mang sang được: ngắt mục, đánh số tự động, bình luận, chú thích. */
function donDep(xml: string): string {
  return xml
    .replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g, '')
    .replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, '')
    .replace(/<w:(commentRangeStart|commentRangeEnd|bookmarkStart|bookmarkEnd)\b[^>]*\/>/g, '')
    .replace(/<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:(commentReference|footnoteReference|endnoteReference)\b[^>]*\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g, '');
}

// ---------------------------------------------------------------------------
// Chép tài nguyên (hình, liên kết), kiểu chữ, không gian tên từ mẫu sang tệp xuất
// ---------------------------------------------------------------------------

type Goi = Record<string, Uint8Array>;

function chepQuanHe(xml: string, mau: Goi, ra: Goi): string {
  const ids = [...new Set([...xml.matchAll(/\br:(?:embed|id|link|pict)="([^"]+)"/g)].map((m) => m[1]))];
  if (!ids.length) return xml;
  const relsMau = mau['word/_rels/document.xml.rels'] ? strFromU8(mau['word/_rels/document.xml.rels']) : '';
  let relsRa = ra['word/_rels/document.xml.rels'] ? strFromU8(ra['word/_rels/document.xml.rels']) : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  let ct = strFromU8(ra['[Content_Types].xml']);
  const doi = new Map<string, string>();
  let n = 0;
  for (const id of ids) {
    const rel = relsMau.match(new RegExp(`<Relationship\\b[^>]*\\bId="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`))?.[0];
    if (!rel) continue;
    const loai = rel.match(/\bType="([^"]+)"/)?.[1] ?? '';
    let dich = rel.match(/\bTarget="([^"]+)"/)?.[1] ?? '';
    const ngoai = /TargetMode="External"/.test(rel);
    if (!ngoai) {
      const duongMau = dich.startsWith('/') ? dich.slice(1) : `word/${dich}`;
      const tep = mau[duongMau];
      if (!tep) continue;
      const ten = duongMau.split('/').pop()!;
      const duongMoi = `word/media/mau-${ten}`;
      ra[duongMoi] = tep;
      dich = `media/mau-${ten}`;
      const duoi = ten.split('.').pop()?.toLowerCase();
      if (duoi && !new RegExp(`Extension="${duoi}"`, 'i').test(ct)) {
        const kieu = strFromU8(mau['[Content_Types].xml']).match(new RegExp(`<Default\\b[^>]*Extension="${duoi}"[^>]*ContentType="([^"]+)"`, 'i'))?.[1]
          ?? ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', emf: 'image/x-emf', wmf: 'image/x-wmf', bmp: 'image/bmp' } as Record<string, string>)[duoi];
        if (kieu) ct = ct.replace('</Types>', `<Default Extension="${duoi}" ContentType="${kieu}"/></Types>`);
      }
    }
    const idMoi = `rIdMau${++n}`;
    relsRa = relsRa.replace('</Relationships>', `<Relationship Id="${idMoi}" Type="${loai}" Target="${maHoa(dich)}"${ngoai ? ' TargetMode="External"' : ''}/></Relationships>`);
    doi.set(id, idMoi);
  }
  ra['word/_rels/document.xml.rels'] = strToU8(relsRa);
  ra['[Content_Types].xml'] = strToU8(ct);
  return xml.replace(/\b(r:(?:embed|id|link|pict))="([^"]+)"/g, (m, a, id) => (doi.has(id) ? `${a}="${doi.get(id)}"` : m));
}

function chepKieu(xml: string, mau: Goi, ra: Goi): void {
  const kieuMau = mau['word/styles.xml'] ? strFromU8(mau['word/styles.xml']) : '';
  if (!kieuMau || !ra['word/styles.xml']) return;
  let kieuRa = strFromU8(ra['word/styles.xml']);
  const coRoi = (id: string) => new RegExp(`w:styleId="${id}"`).test(kieuRa);
  const can = [...new Set([...xml.matchAll(/<w:(?:pStyle|rStyle|tblStyle)\b[^>]*w:val="([^"]+)"/g)].map((m) => m[1]))];
  const hang = [...can];
  while (hang.length) {
    const id = hang.shift()!;
    if (coRoi(id)) continue;
    const kieu = kieuMau.match(new RegExp(`<w:style\\b[^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`))?.[0];
    if (!kieu) continue;
    kieuRa = kieuRa.replace('</w:styles>', `${kieu}</w:styles>`);
    for (const m of kieu.matchAll(/<w:(?:basedOn|link|next)\b[^>]*w:val="([^"]+)"/g)) hang.push(m[1]);
  }
  ra['word/styles.xml'] = strToU8(kieuRa);
}

function boSungKhongGianTen(docRa: string, docMau: string): string {
  const goc = docRa.match(/<w:document\b[^>]*>/)?.[0];
  const gocMau = docMau.match(/<w:document\b[^>]*>/)?.[0];
  if (!goc || !gocMau) return docRa;
  const thieu = [...gocMau.matchAll(/\sxmlns:([A-Za-z0-9]+)="([^"]+)"/g)].filter((m) => !new RegExp(`\\sxmlns:${m[1]}=`).test(goc));
  if (!thieu.length) return docRa;
  return docRa.replace(goc, goc.replace(/>$/, `${thieu.map((m) => ` xmlns:${m[1]}="${m[2]}"`).join('')}>`));
}

// ---------------------------------------------------------------------------
// Ghép
// ---------------------------------------------------------------------------

const LA_BANG_TEN = (chu: string) => /GV\s*coi/i.test(chu) || (/HỌ\s*TÊN/i.test(chu) && /LỚP/i.test(chu));
const LA_BANG_DIEM = (chu: string) => /GV\s*chấm/i.test(chu) || (/Điểm/i.test(chu) && /Nhận\s*xét/i.test(chu));

/** Đầu bài trong mẫu: từ đầu thân đến hết bảng Điểm – GV chấm. */
export function layDauBaiMau(docXmlMau: string): string {
  const { khoi } = khoiThan(docXmlMau);
  let coBangTen = false;
  for (let i = 0; i < khoi.length; i++) {
    const xml = docXmlMau.slice(khoi[i].batDau, khoi[i].ketThuc);
    if (!xml.startsWith('<w:tbl')) continue;
    const chu = chuCua(xml);
    if (LA_BANG_TEN(chu)) coBangTen = true;
    if (LA_BANG_DIEM(chu) && coBangTen) return docXmlMau.slice(khoi[0].batDau, khoi[i].ketThuc);
    if (LA_BANG_DIEM(chu) && LA_BANG_TEN(chu)) return docXmlMau.slice(khoi[0].batDau, khoi[i].ketThuc);
  }
  throw new Error('Mẫu chưa có đầu bài đủ hai bảng (tên trường, GV coi; Điểm, GV chấm) nên chưa dùng được.');
}

export interface KetQuaGhep { tep: Uint8Array; soChoThay: number }

/**
 * Thay mọi đầu bài do app dựng trong `tepDe` bằng đầu bài của `tepMau`.
 * Không tìm thấy đầu bài trong mẫu thì báo lỗi (nơi gọi sẽ xuất theo khung mặc định).
 */
export function ghepDauBaiTheoMau(tepDe: Uint8Array, tepMau: Uint8Array): KetQuaGhep {
  const mau = unzipSync(tepMau);
  const ra = unzipSync(tepDe);
  if (!mau['word/document.xml']) throw new Error('File mẫu không phải tệp Word .docx hợp lệ.');
  const docMau = strFromU8(mau['word/document.xml']);
  let docRa = strFromU8(ra['word/document.xml']);

  let dauBai = donDep(layDauBaiMau(docMau));
  const nMau = beNgangChu(docMau);
  const nRa = beNgangChu(docRa);
  if (nMau && nRa) dauBai = coGian(dauBai, nRa / nMau);
  dauBai = chepQuanHe(dauBai, mau, ra);
  chepKieu(dauBai, mau, ra);

  // Tìm các đầu bài app dựng: bảng tên – (đoạn trống) – bảng điểm
  const { khoi } = khoiThan(docRa);
  const thay: { batDau: number; ketThuc: number; xml: string }[] = [];
  for (let i = 0; i < khoi.length; i++) {
    const xml1 = docRa.slice(khoi[i].batDau, khoi[i].ketThuc);
    if (!xml1.startsWith('<w:tbl') || !LA_BANG_TEN(chuCua(xml1))) continue;
    const j = [i + 1, i + 2].find((k) => k < khoi.length && docRa.slice(khoi[k].batDau, khoi[k].ketThuc).startsWith('<w:tbl') && LA_BANG_DIEM(chuCua(docRa.slice(khoi[k].batDau, khoi[k].ketThuc))));
    if (j === undefined) continue;
    const td = docTieuDeCuaApp(xml1);
    if (!td) continue;
    thay.push({ batDau: khoi[i].batDau, ketThuc: khoi[j].ketThuc, xml: thayTieuDe(dauBai, td) });
    i = j;
  }
  if (!thay.length) throw new Error('Tệp đề không có đầu bài để thay.');
  for (const t of [...thay].reverse()) docRa = docRa.slice(0, t.batDau) + t.xml + docRa.slice(t.ketThuc);
  docRa = boSungKhongGianTen(docRa, docMau);
  ra['word/document.xml'] = strToU8(docRa);
  const goi: Zippable = {};
  for (const [k, v] of Object.entries(ra)) goi[k] = [v, { level: 6 }];
  return { tep: zipSync(goi), soChoThay: thay.length };
}
