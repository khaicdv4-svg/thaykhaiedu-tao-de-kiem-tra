/**
 * Xử lí ảnh thầy tải lên cho câu hỏi (chạy ở trình duyệt): thu nhỏ, chuyển đen trắng, tăng nhẹ độ tương phản
 * để in trắng đen vẫn rõ, rồi trả về data URL nhỏ gọn để lưu cùng đề.
 */
import type { HinhCau } from '@/core/de/de';
import { TOI_DA_KY_TU_MOT_HINH } from '@/core/de/de';

const CANH_TOI_DA = 760;

export async function xuLyAnhDe(f: File): Promise<HinhCau> {
  if (!/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type)) throw new Error(`"${f.name}" không phải ảnh (nhận PNG, JPG).`);
  if (f.size > 12_000_000) throw new Error(`"${f.name}" quá lớn (trên 12 MB).`);
  const bm = await createImageBitmap(f);
  const tile = Math.min(1, CANH_TOI_DA / Math.max(bm.width, bm.height));
  const rong = Math.max(1, Math.round(bm.width * tile));
  const cao = Math.max(1, Math.round(bm.height * tile));
  const canvas = document.createElement('canvas');
  canvas.width = rong;
  canvas.height = cao;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không xử lí được ảnh.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, rong, cao);
  ctx.drawImage(bm, 0, 0, rong, cao);
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
  if (anh.length > TOI_DA_KY_TU_MOT_HINH) throw new Error(`"${f.name}" còn quá nặng sau khi thu nhỏ. Thầy chọn ảnh đơn giản hơn.`);
  return { ten: f.name.replace(/\.[^.]+$/, ''), chuThich: '', anh, rong, cao };
}
