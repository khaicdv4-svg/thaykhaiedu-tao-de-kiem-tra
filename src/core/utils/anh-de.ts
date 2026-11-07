/**
 * Xử lí ảnh thầy tải lên cho câu hỏi (chạy ở trình duyệt): thu nhỏ, chuyển đen trắng, tăng nhẹ độ tương phản
 * để in trắng đen vẫn rõ, rồi trả về data URL nhỏ gọn để lưu cùng đề.
 */
import type { HinhCau } from '@/core/de/de';
import { TOI_DA_KY_TU_MOT_HINH } from '@/core/de/de';

const CANH_TOI_DA = 760;

function canvasSangHinh(canvas: HTMLCanvasElement, ten: string, f: string): HinhCau {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không xử lí được ảnh.');
  const { width: rong, height: cao } = canvas;
  const px = ctx.getImageData(0, 0, rong, cao);
  for (let i = 0; i < px.data.length; i += 4) {
    const g = 0.299 * px.data[i] + 0.587 * px.data[i + 1] + 0.114 * px.data[i + 2];
    const v = Math.max(0, Math.min(255, (g - 128) * 1.15 + 128));
    px.data[i] = px.data[i + 1] = px.data[i + 2] = v;
  }
  ctx.putImageData(px, 0, 0);
  let anh = canvas.toDataURL('image/png');
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    if (anh.length <= TOI_DA_KY_TU_MOT_HINH * 0.6) break;
    anh = canvas.toDataURL('image/jpeg', q);
  }
  if (anh.length > TOI_DA_KY_TU_MOT_HINH) throw new Error(`"${f}" còn quá nặng sau khi thu nhỏ. Thầy chọn ảnh đơn giản hơn.`);
  return { ten, chuThich: '', anh, rong, cao };
}

function veLenCanvas(nguon: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const tile = Math.min(1, CANH_TOI_DA / Math.max(w, h));
  const rong = Math.max(1, Math.round(w * tile));
  const cao = Math.max(1, Math.round(h * tile));
  const canvas = document.createElement('canvas');
  canvas.width = rong;
  canvas.height = cao;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không xử lí được ảnh.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, rong, cao);
  ctx.drawImage(nguon, 0, 0, rong, cao);
  return canvas;
}

export async function xuLyAnhDe(f: File): Promise<HinhCau> {
  if (!/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type)) throw new Error(`"${f.name}" không phải ảnh (nhận PNG, JPG).`);
  if (f.size > 12_000_000) throw new Error(`"${f.name}" quá lớn (trên 12 MB).`);
  const bm = await createImageBitmap(f);
  return canvasSangHinh(veLenCanvas(bm, bm.width, bm.height), f.name.replace(/\.[^.]+$/, ''), f.name);
}

/** Cắt viền trắng thừa quanh hình, chỉ chừa lề nhỏ, để hình sát đề bài và dàn trang gọn. */
function catVienTrang(canvas: HTMLCanvasElement, le = 10): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const { width: w, height: h } = canvas;
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4] < 235) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return canvas;
  x0 = Math.max(0, x0 - le); y0 = Math.max(0, y0 - le); x1 = Math.min(w - 1, x1 + le); y1 = Math.min(h - 1, y1 + le);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  if (cw >= w && ch >= h) return canvas;
  const ra = document.createElement('canvas');
  ra.width = cw; ra.height = ch;
  const c2 = ra.getContext('2d');
  if (!c2) return canvas;
  c2.fillStyle = '#fff'; c2.fillRect(0, 0, cw, ch);
  c2.drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return ra;
}

/** Đổi mã SVG đã làm sạch (từ AI vẽ) thành hình đen trắng để lưu trong đề. Độ phân giải gấp đôi cho nét sắc. */
export async function svgSangHinh(svg: string, rong: number, cao: number, moTa: string): Promise<HinhCau> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((ok, loi) => { img.onload = () => ok(); img.onerror = () => loi(new Error('Không dựng được hình AI vẽ. Thầy bấm vẽ lại.')); img.src = url; });
    const k = Math.min(2, CANH_TOI_DA / Math.max(rong, cao));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rong * k);
    canvas.height = Math.round(cao * k);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không xử lí được ảnh.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const h = canvasSangHinh(catVienTrang(canvas), 'AI vẽ', 'Hình AI vẽ');
    return { ...h, moTa };
  } finally { URL.revokeObjectURL(url); }
}
