/**
 * AI vẽ hình minh họa cho câu hỏi bằng SVG (nét đen trên nền trắng để in trắng đen vẫn rõ).
 * Mã SVG do AI viết được làm sạch nghiêm ngặt trước khi dùng: chỉ giữ thẻ và thuộc tính vẽ hình,
 * bỏ mọi script, liên kết, ảnh ngoài.
 */

export const HE_THONG_VE_HINH = `Bạn là họa sĩ vẽ hình minh họa cho đề kiểm tra tiểu học Việt Nam, vẽ bằng mã SVG.
Quy tắc bắt buộc:
- Chỉ vẽ phần hình mà đề bài cần cho học sinh nhìn. TUYỆT ĐỐI không vẽ hay đánh dấu đáp án, không viết đáp án vào hình.
- Hình ĐEN TRẮNG vì đề in trắng đen: nền trắng (một rect trắng phủ toàn hình), nét đen đậm (stroke="#000", stroke-width từ 2 đến 3). Mặc định KHÔNG tô nền (fill="none"); chỉ tô xám rất nhạt (#e6e6e6) khi đề thật sự cần phân biệt vùng (ví dụ phần tô màu của phân số). Không dùng màu khác.
- Dùng viewBox="0 0 W H" với W không quá 480 và H không quá 300. Chữ, số, nhãn (A, B, C, D, 1, 2…) dùng font-family="Times New Roman" cỡ từ 16 trở lên.
- Số lượng đồ vật trong hình phải ĐÚNG như đề bài (đề nói 5 quả táo thì vẽ đúng 5 quả). Xếp thẳng hàng, đều đặn, không chồng lên nhau.
- Lớp 1-2: hình rất đơn giản, to, rõ, đồ vật quen thuộc (quả, hoa, con vật, hình khối cơ bản) vẽ bằng các hình cơ bản.
- Hình học: vẽ đúng số đo và tỉ lệ (góc vuông đúng 90°, góc tù lớn hơn 90°, góc nhọn bé hơn 90°, đoạn thẳng đúng độ dài tương đối).
- Hình phải kín khung: vẽ sát mép viewBox, chỉ chừa lề khoảng 8 đơn vị, không để khoảng trắng thừa phía trên hay hai bên.
- Các hình cùng loại (các góc, các hình khối...) phải CÙNG cỡ: cạnh dài bằng nhau, cao bằng nhau, đặt trên cùng một đường đáy.
- Cần nhiều hình (ví dụ 4 góc A, B, C, D): vẽ chung trong MỘT svg, xếp đều thành một hàng hoặc lưới, có nhãn dưới mỗi hình, khoảng cách đều nhau.
- Chỉ dùng thẻ: svg, g, rect, circle, ellipse, line, polyline, polygon, path, text, tspan. Không script, không style, không ảnh, không href, không url().
- Chỉ trả về mã SVG, bắt đầu bằng <svg và kết thúc bằng </svg>, không giải thích.
- Nếu đề bài không cần hình hoặc không thể vẽ đúng, chỉ trả về một dòng: KHONG_VE: lí do ngắn.`;

const HUONG_DAN_KIEU: Record<string, string> = {
  MINH_HOA: 'Kiểu hình giáo viên yêu cầu: hình minh họa cho đề bài. Một hình gọn, đặt giữa, rộng khoảng 300–400 đơn vị.',
  PHUONG_AN: 'Kiểu hình giáo viên yêu cầu: hình cho từng phương án A, B, C, D. Vẽ đúng 4 hình trong MỘT svg, xếp một hàng ngang (viewBox khoảng 480×170), bốn ô rộng bằng nhau, mỗi hình đặt giữa ô của nó, nhãn A, B, C, D ngay dưới mỗi hình.',
  SO_DO: 'Kiểu hình giáo viên yêu cầu: sơ đồ. Các ô chữ nhật nối bằng mũi tên hoặc đoạn thẳng, chữ ngắn trong ô, dàn đều.',
  BIEU_DO: 'Kiểu hình giáo viên yêu cầu: biểu đồ (cột hoặc tranh) có trục, nhãn, vạch chia đều, số liệu đúng như đề bài.',
  BANG: 'Kiểu hình giáo viên yêu cầu: bảng số liệu kẻ ô, hàng tiêu đề rõ, số liệu đúng như đề bài.',
  TIA_SO: 'Kiểu hình giáo viên yêu cầu: tia số có vạch chia đều, số ghi dưới vạch, mũi tên ở đầu tia.',
};

export function loiNhacVeHinh(p: { tenMon: string; deBai: string; luaChon: string[]; moTa: string; kieu?: string }): string {
  const lc = p.luaChon.some((x) => x.trim()) ? `\nCác phương án (chỉ để biết hình cần thể hiện gì, KHÔNG vẽ đáp án): ${p.luaChon.map((x, i) => `${'ABCD'[i] ?? i + 1}. ${x}`).join(' | ')}` : '';
  return `Môn ${p.tenMon}, lớp 4.
Đề bài (bỏ qua các dòng dạng [Hình n], đó chỉ là vị trí chèn hình): ${p.deBai.replace(/\[Hình\s*\d+\]/gi, '').trim()}${lc}
${p.moTa.trim() ? `Mô tả của giáo viên về hình cần vẽ: ${p.moTa.trim()}` : 'Giáo viên không mô tả thêm: hãy tự xác định hình cần vẽ từ đề bài.'}
${p.kieu && HUONG_DAN_KIEU[p.kieu] ? HUONG_DAN_KIEU[p.kieu] + '\n' : ''}Vẽ hình.`;
}

const THE_CHO_PHEP = new Set(['svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'tspan']);
const THUOC_TINH = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'viewBox', 'points', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'transform', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'opacity', 'fill-opacity', 'stroke-opacity', 'dx', 'dy']);
const CAM = /<\s*(script|foreignObject|image|use|style|iframe|animate|set)\b|javascript:|url\s*\(|<!\s*(ENTITY|DOCTYPE)|\bon\w+\s*=|href\s*=|xlink/i;

export interface KetQuaSvg { svg?: string; rong?: number; cao?: number; lyDo?: string }

const thoat = (t: string) => t.replace(/&(?!amp;|lt;|gt;|#\d+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Lấy khối <svg>…</svg> từ câu trả lời của AI rồi làm sạch. Trả lyDo khi AI từ chối hoặc mã SVG không dùng được. */
export function lamSachSvg(traLoi: string): KetQuaSvg {
  const t = traLoi.replace(/```[a-z]*\n?/gi, '');
  const kv = /KHONG_VE\s*:\s*(.+)/i.exec(t);
  const m = /<svg[\s\S]*<\/svg>/i.exec(t);
  if (!m) return { lyDo: kv ? kv[1].trim() : 'AI không trả về hình vẽ.' };
  const goc = m[0];
  if (goc.length > 80_000) return { lyDo: 'Hình AI vẽ quá phức tạp. Thầy mô tả đơn giản hơn.' };
  if (CAM.test(goc)) return { lyDo: 'Hình AI vẽ có thành phần không an toàn nên đã bị chặn. Thầy bấm vẽ lại.' };

  const token = /<(\/?)([a-zA-Z][\w-]*)([^<>]*?)(\/?)>|([^<]+)/g;
  let kq = '';
  const ngan: string[] = [];
  let soThe = 0;
  let viewBox: number[] | null = null;
  for (let tk = token.exec(goc); tk; tk = token.exec(goc)) {
    if (tk[5] !== undefined) {
      if (ngan[ngan.length - 1] === 'text' || ngan[ngan.length - 1] === 'tspan') kq += thoat(tk[5]);
      continue;
    }
    const dong = tk[1] === '/';
    const ten = tk[2];
    if (!THE_CHO_PHEP.has(ten)) return { lyDo: `Hình AI vẽ dùng thẻ không cho phép (${ten}). Thầy bấm vẽ lại.` };
    if (dong) {
      if (ngan.pop() !== ten) return { lyDo: 'Mã hình AI vẽ bị lỗi cấu trúc. Thầy bấm vẽ lại.' };
      kq += `</${ten}>`;
      continue;
    }
    if (++soThe > 500) return { lyDo: 'Hình AI vẽ quá phức tạp. Thầy mô tả đơn giản hơn.' };
    let tt = '';
    for (const a of tk[3].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      if (!THUOC_TINH.has(a[1])) continue;
      const gt = (a[2] ?? a[3] ?? '').replace(/"/g, '&quot;').replace(/</g, '');
      if (ten === 'svg' && (a[1] === 'width' || a[1] === 'height')) continue;
      if (ten === 'svg' && a[1] === 'viewBox') viewBox = gt.trim().split(/[\s,]+/).map(Number);
      tt += ` ${a[1]}="${gt}"`;
    }
    if (ten === 'svg') {
      if (!viewBox || viewBox.length !== 4 || viewBox.some((n) => !Number.isFinite(n)) || viewBox[2] <= 0 || viewBox[3] <= 0 || viewBox[2] > 1000 || viewBox[3] > 1000) return { lyDo: 'Hình AI vẽ thiếu khung kích thước hợp lệ. Thầy bấm vẽ lại.' };
      tt += ` xmlns="http://www.w3.org/2000/svg" width="${viewBox[2]}" height="${viewBox[3]}"`;
    }
    kq += `<${ten}${tt}${tk[4] ? '/' : ''}>`;
    if (!tk[4]) ngan.push(ten);
  }
  if (ngan.length || !viewBox) return { lyDo: 'Mã hình AI vẽ chưa đủ thẻ đóng. Thầy bấm vẽ lại.' };
  return { svg: kq, rong: viewBox[2], cao: viewBox[3] };
}
