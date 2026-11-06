import { NextRequest, NextResponse } from 'next/server';
import { dsTaiLieu, themTaiLieu, xoaTaiLieu } from '@/lib/repositories/chuong-trinh.repository';
import { DANH_SACH_MON, LOAI_TAI_LIEU, type LoaiTaiLieu, type NguonTaiLieu } from '@/core/chuong-trinh/mon';
import { lamSachUrl } from '@/core/reading-passages/kiem-tra';

const loi = (err: unknown, ma = 400) => NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: ma });

function laDiaChiNoiBo(host: string) {
  const h = host.toLowerCase();
  return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '0.0.0.0' || h.startsWith('[') ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

/** Đổi link Google Docs/Drive công khai thành địa chỉ tải chữ; link khác giữ nguyên. */
function diaChiLayChu(u: URL): string {
  const m = u.pathname.match(/\/document\/d\/([^/]+)/);
  if (u.hostname === 'docs.google.com' && m) return `https://docs.google.com/document/d/${m[1]}/export?format=txt`;
  return u.toString();
}

async function layChuTuLink(url: string): Promise<string> {
  const u = new URL(lamSachUrl(url));
  if (!['http:', 'https:'].includes(u.protocol) || laDiaChiNoiBo(u.hostname)) throw new Error('Link không hợp lệ.');
  const res = await fetch(diaChiLayChu(u), { redirect: 'follow', signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'ThayKhaiEdu-DocTaiLieu/1.0', Accept: 'text/html,text/plain,*/*' } });
  if (!res.ok) throw new Error(`Không mở được link (mã ${res.status}). Link riêng tư thì app không đọc được; thầy chia sẻ công khai hoặc tải file lên.`);
  const loai = res.headers.get('content-type') ?? '';
  if (/pdf|officedocument|octet-stream/i.test(loai)) throw new Error('Link này là file PDF/Word. App chưa đọc trực tiếp từ link loại này; thầy tải file lên.');
  const t = (await res.text()).slice(0, 3_000_000);
  return /html/i.test(loai)
    ? t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
    : t.trim();
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, taiLieu: await dsTaiLieu() });
  } catch (err) {
    return loi(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { loai?: string; mon?: string; lop?: number | null; tieuDe?: string; nguon?: string; link?: string; tenFile?: string; noiDung?: string; ghiChu?: string };
    if (!LOAI_TAI_LIEU.some((l) => l.ma === b.loai)) return loi('Chưa chọn loại tài liệu.');
    if (!DANH_SACH_MON.some((m) => m.ma === b.mon)) return loi('Chưa chọn môn.');
    const lop = b.lop ? Number(b.lop) : null;
    if (lop !== null && !(lop >= 1 && lop <= 5)) return loi('Lớp phải từ 1 đến 5.');
    if (b.loai !== 'CT_GDPT' && lop === null) return loi('SGK, SGV cần chọn lớp.');
    const nguon = (['TAI_FILE', 'LINK', 'DAN_CHU'].includes(b.nguon ?? '') ? b.nguon : 'DAN_CHU') as NguonTaiLieu;
    let noiDung = (b.noiDung ?? '').trim();
    let link: string | null = null;
    let canhBao: string | null = null;
    if (nguon === 'LINK') {
      link = lamSachUrl(b.link ?? '');
      if (!link) return loi('Chưa nhập link.');
      if (!noiDung) {
        try {
          noiDung = await layChuTuLink(link);
        } catch (e) {
          canhBao = e instanceof Error ? e.message : String(e);
        }
      }
    }
    if (nguon !== 'LINK' && !noiDung) return loi('Tài liệu không có chữ để lưu.');
    if (noiDung.length > 3_000_000) return loi('Tài liệu quá dài (tối đa khoảng 3 triệu kí tự). Thầy tách thành nhiều phần.');
    const tieuDe = (b.tieuDe ?? '').trim() || b.tenFile || 'Tài liệu chưa đặt tên';
    const tl = await themTaiLieu({ loai: b.loai as LoaiTaiLieu, mon: b.mon!, lop, tieuDe, nguon, link, tenFile: b.tenFile ?? null, noiDung, ghiChu: b.ghiChu ?? null });
    return NextResponse.json({ success: true, taiLieu: tl, canhBao: canhBao ?? (nguon === 'LINK' && !noiDung ? 'Chưa lấy được chữ từ link.' : null) });
  } catch (err) {
    return loi(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return loi('Thiếu mã tài liệu.');
    await xoaTaiLieu(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return loi(err);
  }
}
