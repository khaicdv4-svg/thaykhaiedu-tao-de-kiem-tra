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
    const h = canvasSangHinh(canvas, 'AI vẽ', 'Hình AI vẽ');
    return { ...h, moTa };
  } finally { URL.revokeObjectURL(url); }
}
