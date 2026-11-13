/**
 * Phân số trong đề: một quy ước duy nhất là "3/4"; số hỗn hợp viết "2 1/3" (số nguyên, cách một khoảng trắng, rồi phân số).
 * Lưu trong đề vẫn là chữ thường để sửa dễ; khi xem trước và xuất Word thì dựng thành phân số tử trên mẫu dưới.
 * Hàm thuần, không phụ thuộc giao diện.
 */

export type ManhChu = { loai: 'chu'; chu: string } | { loai: 'ps'; tu: string; mau: string };

const PS_UNICODE: Record<string, string> = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };

/**
 * Một phân số a/b: hai số nguyên, không dính số hay dấu / khác ở hai đầu (loại ngày tháng 12/10/2026, "km/h"),
 * và không đứng ngay sau "ngày", "tháng", "năm" (ngày 5/11).
 */
const MAU_PHAN_SO = /(?<![\d/.,])(?<!ngày\s)(?<!tháng\s)(?<!năm\s)(\d{1,6})\/(\d{1,6})(?![\d/]|[.,]\d)/giu;

/** Đưa các cách viết khác (LaTeX \frac{3}{4}, ký tự ½ ¾, "3 ⁄ 4") về dạng 3/4. */
export function chuanHoaPhanSo(s: string): string {
  return s
    .replace(/\\[dt]?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/g, '$1/$2')
    .replace(/\$\s*(\d+\/\d+)\s*\$/g, '$1')
    .replace(/(\d+)\s*[⁄∕]\s*(\d+)/g, '$1/$2')
    .replace(/(\d)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, (_, n, f) => `${n} ${PS_UNICODE[f]}`)
    .replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (f) => PS_UNICODE[f]);
}

/** Tách chuỗi thành các mảnh chữ và phân số theo đúng thứ tự. Mẫu số 0 không được coi là phân số. */
export function tachPhanSo(s: string): ManhChu[] {
  const kq: ManhChu[] = [];
  let cuoi = 0;
  for (const m of s.matchAll(MAU_PHAN_SO)) {
    if (Number(m[2]) === 0) continue;
    const i = m.index ?? 0;
    if (i > cuoi) kq.push({ loai: 'chu', chu: s.slice(cuoi, i) });
    kq.push({ loai: 'ps', tu: m[1], mau: m[2] });
    cuoi = i + m[0].length;
  }
  if (cuoi < s.length) kq.push({ loai: 'chu', chu: s.slice(cuoi) });
  return kq.length ? kq : [{ loai: 'chu', chu: s }];
}

export const coPhanSo = (s: string) => tachPhanSo(s).some((m) => m.loai === 'ps');

/** AI hay viết sẵn "A. ..." ở đầu phương án trong khi giao diện đã thêm nhãn: bỏ nhãn thừa ("A.", "B)", "c:"). */
export function boNhanPhuongAn(s: string): string {
  return s.replace(/^\s*[A-Da-d]\s*[.):]\s+/, '').trim();
}

export const DAN_AI_PHAN_SO = 'Phân số viết dạng 3/4 (tử số/mẫu số), số hỗn hợp viết "2 1/3" (số nguyên, một khoảng trắng, rồi phân số). Không dùng LaTeX, không dùng ký tự ½ ¾. Số thập phân dùng dấu phẩy (0,5).';
