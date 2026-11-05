/**
 * ThayKhaiEdu - Mã hóa khóa API trước khi lưu vào Supabase.
 * CHỈ dùng ở máy chủ (route API). Không import file này vào trang "use client".
 *
 * Bí mật mã hóa nằm ở biến môi trường AI_KHOA_BI_MAT (trong .env.local và trên Vercel),
 * không nằm trong cơ sở dữ liệu. Ai đọc được bảng ai_settings cũng không giải được khóa.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PHIEN_BAN = 'v1';

function layKhoaMaHoa(biMat = process.env.AI_KHOA_BI_MAT): Buffer {
  if (!biMat || biMat.trim().length < 16) {
    throw new Error('Máy chủ chưa có AI_KHOA_BI_MAT (ít nhất 16 ký tự) trong biến môi trường.');
  }
  return createHash('sha256').update(biMat.trim()).digest();
}

export function coBiMatMayChu(): boolean {
  const b = process.env.AI_KHOA_BI_MAT;
  return !!b && b.trim().length >= 16;
}

export function maHoaKhoa(khoa: string, biMat?: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', layKhoaMaHoa(biMat), iv);
  const ma = Buffer.concat([c.update(khoa, 'utf8'), c.final()]);
  return [PHIEN_BAN, iv.toString('base64'), c.getAuthTag().toString('base64'), ma.toString('base64')].join(':');
}

export function giaiMaKhoa(chuoi: string, biMat?: string): string {
  const [pb, iv, tag, ma] = chuoi.split(':');
  if (pb !== PHIEN_BAN || !iv || !tag || !ma) throw new Error('Khóa đã lưu không đúng định dạng. Nhập lại khóa ở trang Cài đặt AI.');
  try {
    const d = createDecipheriv('aes-256-gcm', layKhoaMaHoa(biMat), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(ma, 'base64')), d.final()]).toString('utf8');
  } catch {
    throw new Error('Không giải mã được khóa (AI_KHOA_BI_MAT đã bị đổi?). Nhập lại khóa ở trang Cài đặt AI.');
  }
}
