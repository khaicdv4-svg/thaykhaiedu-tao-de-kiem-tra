/**
 * Chạy trên máy chủ: tải nội dung từ link thầy dán (Google Docs/Sheets/Slides, file PDF/Word trên Drive, trang web)
 * rồi lấy phần chữ. File lớn chỉ đi qua máy chủ, trình duyệt chỉ nhận lại chữ.
 */
import { doanLoaiTep, htmlSangChu, phanLoaiLink } from '@/core/chuong-trinh/link-tai-lieu';
import { docChuTuDocx } from '@/core/utils/docx-text';
import { trichChuPdf } from '@/core/utils/doc-tep';

const TOI_DA_BYTE = 80 * 1024 * 1024; // 80 MB, đủ cho một cuốn SGK PDF

function laDiaChiNoiBo(host: string) {
  const h = host.toLowerCase();
  return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '0.0.0.0' || h.startsWith('[') ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

async function docPdfTrenMayChu(buf: ArrayBuffer): Promise<string> {
  // Nạp sẵn worker vào cùng tiến trình để pdfjs không phải tìm file worker riêng trên máy chủ.
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return trichChuPdf(pdfjs, buf);
}

async function taiVe(diaChi: string): Promise<{ buf: ArrayBuffer; loai: string }> {
  const res = await fetch(diaChi, { redirect: 'follow', signal: AbortSignal.timeout(120_000), headers: { 'User-Agent': 'ThayKhaiEdu-DocTaiLieu/1.0', Accept: '*/*' } });
  if (res.status === 401 || res.status === 403 || res.status === 404) throw new Error(`Không mở được link (mã ${res.status}). Thầy kiểm tra lại link và chia sẻ "Bất kỳ ai có đường liên kết".`);
  if (!res.ok) throw new Error(`Không mở được link (mã ${res.status}).`);
  const dai = Number(res.headers.get('content-length') ?? 0);
  if (dai > TOI_DA_BYTE) throw new Error('File quá lớn (trên 80 MB). Thầy tách nhỏ hoặc tải file lên.');
  const buf = await res.arrayBuffer();
  if (buf.byteLength > TOI_DA_BYTE) throw new Error('File quá lớn (trên 80 MB). Thầy tách nhỏ hoặc tải file lên.');
  return { buf, loai: res.headers.get('content-type') ?? '' };
}

export async function layChuTuLink(url: string): Promise<string> {
  const link = phanLoaiLink(url);
  const u = new URL(url.trim());
  if (!['http:', 'https:'].includes(u.protocol) || laDiaChiNoiBo(u.hostname)) throw new Error('Link không hợp lệ.');
  if (link.kieu === 'DRIVE_FOLDER') throw new Error('Đây là link thư mục. Thầy mở thư mục, bấm chuột phải vào từng file → Chia sẻ → Sao chép đường liên kết, rồi dán link của file.');
  if (!link.diaChiTai) throw new Error('Link không hợp lệ.');

  const { buf, loai } = await taiVe(link.diaChiTai);
  const kieuTep = doanLoaiTep(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)), loai);
  const laGoogle = link.kieu !== 'WEB';

  if (kieuTep === 'PDF') return docPdfTrenMayChu(buf);
  if (kieuTep === 'DOCX') return docChuTuDocx(buf);
  if (kieuTep === 'KHAC') throw new Error('App chưa đọc được loại file này (chỉ đọc PDF có lớp chữ, Word .docx, Google Docs/Sheets/Slides). File .doc đời cũ thầy lưu lại thành .docx.');
  const chu = new TextDecoder().decode(buf.slice(0, 6_000_000));
  if (kieuTep === 'HTML') {
    // Google trả trang HTML (trang đăng nhập) khi link chưa chia sẻ công khai.
    if (laGoogle) throw new Error('File trên Google chưa chia sẻ công khai. Thầy mở file → Chia sẻ → "Bất kỳ ai có đường liên kết" (Người xem), rồi lưu lại.');
    return htmlSangChu(chu);
  }
  return chu.replace(/^﻿/, '').trim();
}
