/**
 * Nhận dạng link tài liệu thầy dán vào (Google Docs, Sheets, Slides, file trên Drive, thư mục Drive, trang web)
 * và đổi thành địa chỉ app tải được nội dung. Chỉ đọc được link đã chia sẻ "Bất kỳ ai có đường liên kết".
 */

export type KieuLink = 'GDOC' | 'GSHEET' | 'GSLIDE' | 'DRIVE_FILE' | 'DRIVE_FOLDER' | 'WEB';

export interface LinkTaiLieu {
  kieu: KieuLink;
  /** Mã file/thư mục trên Google (nếu có). */
  id: string | null;
  /** Địa chỉ app gọi để lấy nội dung; null nếu không tải trực tiếp được (thư mục). */
  diaChiTai: string | null;
}

const MA = '([A-Za-z0-9_-]{10,})';

export function phanLoaiLink(url: string): LinkTaiLieu {
  const u = new URL(url.trim());
  const host = u.hostname.toLowerCase();
  const path = u.pathname;
  let m: RegExpMatchArray | null;

  if (host === 'docs.google.com') {
    if ((m = path.match(new RegExp(`/document/(?:u/\\d+/)?d/${MA}`)))) return { kieu: 'GDOC', id: m[1], diaChiTai: `https://docs.google.com/document/d/${m[1]}/export?format=txt` };
    if ((m = path.match(new RegExp(`/spreadsheets/(?:u/\\d+/)?d/${MA}`)))) {
      const gid = u.searchParams.get('gid') ?? u.hash.match(/gid=(\d+)/)?.[1];
      return { kieu: 'GSHEET', id: m[1], diaChiTai: `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}` };
    }
    if ((m = path.match(new RegExp(`/presentation/(?:u/\\d+/)?d/${MA}`)))) return { kieu: 'GSLIDE', id: m[1], diaChiTai: `https://docs.google.com/presentation/d/${m[1]}/export/txt` };
  }

  if (host === 'drive.google.com' || host === 'drive.usercontent.google.com') {
    if ((m = path.match(new RegExp(`/drive/(?:u/\\d+/)?folders/${MA}`)))) return { kieu: 'DRIVE_FOLDER', id: m[1], diaChiTai: null };
    const id = path.match(new RegExp(`/file/(?:u/\\d+/)?d/${MA}`))?.[1] ?? u.searchParams.get('id');
    if (id && new RegExp(`^${MA}$`).test(id)) {
      // confirm=t để Drive bỏ qua trang cảnh báo "file quá lớn, không quét virus".
      return { kieu: 'DRIVE_FILE', id, diaChiTai: `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t` };
    }
  }

  return { kieu: 'WEB', id: null, diaChiTai: u.toString() };
}

/** Đoán loại file từ mấy byte đầu (Drive hay trả content-type chung chung). */
export function doanLoaiTep(dau: Uint8Array, contentType = ''): 'PDF' | 'DOCX' | 'HTML' | 'TEXT' | 'KHAC' {
  const s = String.fromCharCode(...dau.subarray(0, 8));
  if (s.startsWith('%PDF')) return 'PDF';
  if (dau[0] === 0x50 && dau[1] === 0x4b) return 'DOCX';
  if (/html/i.test(contentType) || /^\s*<(!doctype|html)/i.test(s)) return 'HTML';
  if (/^text\/|csv|json|xml/i.test(contentType)) return 'TEXT';
  if (dau[0] === 0xd0 && dau[1] === 0xcf) return 'KHAC'; // .doc / .xls đời cũ
  return /octet-stream/i.test(contentType) || !contentType ? 'KHAC' : 'TEXT';
}

/** Bỏ thẻ HTML, giữ xuống dòng theo đoạn. */
export function htmlSangChu(t: string): string {
  return t
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
