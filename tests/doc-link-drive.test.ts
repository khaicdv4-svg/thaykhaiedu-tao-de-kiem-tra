import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { doanLoaiTep, phanLoaiLink } from '@/core/chuong-trinh/link-tai-lieu';
import { layChuTuLink } from '@/lib/doc-link-may-chu';

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';

describe('Nhận dạng link tài liệu', () => {
  it('Google Docs → xuất txt', () => {
    const l = phanLoaiLink(`https://docs.google.com/document/d/${ID}/edit?usp=sharing`);
    expect(l.kieu).toBe('GDOC');
    expect(l.diaChiTai).toBe(`https://docs.google.com/document/d/${ID}/export?format=txt`);
  });
  it('Google Docs có /u/0/', () => {
    expect(phanLoaiLink(`https://docs.google.com/document/u/0/d/${ID}/edit`).kieu).toBe('GDOC');
  });
  it('Google Sheets giữ đúng trang tính (gid)', () => {
    const l = phanLoaiLink(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=123`);
    expect(l.kieu).toBe('GSHEET');
    expect(l.diaChiTai).toContain('format=csv&gid=123');
  });
  it('Google Slides → txt', () => {
    expect(phanLoaiLink(`https://docs.google.com/presentation/d/${ID}/edit`).diaChiTai).toBe(`https://docs.google.com/presentation/d/${ID}/export/txt`);
  });
  it('File trên Drive (dạng /file/d/…/view)', () => {
    const l = phanLoaiLink(`https://drive.google.com/file/d/${ID}/view?usp=drive_link`);
    expect(l.kieu).toBe('DRIVE_FILE');
    expect(l.diaChiTai).toBe(`https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=t`);
  });
  it('File trên Drive (dạng open?id=)', () => {
    expect(phanLoaiLink(`https://drive.google.com/open?id=${ID}`).kieu).toBe('DRIVE_FILE');
  });
  it('Thư mục Drive không tải trực tiếp', () => {
    const l = phanLoaiLink(`https://drive.google.com/drive/folders/${ID}?usp=sharing`);
    expect(l.kieu).toBe('DRIVE_FOLDER');
    expect(l.diaChiTai).toBeNull();
  });
  it('Trang web thường giữ nguyên', () => {
    expect(phanLoaiLink('https://example.com/ct-toan.html').kieu).toBe('WEB');
  });
  it('Đoán loại file theo byte đầu', () => {
    expect(doanLoaiTep(new TextEncoder().encode('%PDF-1.7'), 'application/octet-stream')).toBe('PDF');
    expect(doanLoaiTep(new Uint8Array([0x50, 0x4b, 3, 4]), 'application/octet-stream')).toBe('DOCX');
    expect(doanLoaiTep(new TextEncoder().encode('<!DOCTYPE html>'), 'text/html')).toBe('HTML');
  });
});

describe('Máy chủ đọc chữ từ link Drive', () => {
  afterEach(() => vi.unstubAllGlobals());
  const giaFetch = (buf: Buffer, loai: string, status = 200) => {
    const f = vi.fn(async (_url: string) => new Response(new Uint8Array(buf), { status, headers: { 'content-type': loai } }));
    vi.stubGlobal('fetch', f);
    return f;
  };

  it('đọc được file PDF trên Drive', async () => {
    const f = giaFetch(readFileSync(path.join(__dirname, 'fixtures/yccd-mau.pdf')), 'application/pdf');
    const chu = await layChuTuLink(`https://drive.google.com/file/d/${ID}/view`);
    expect(f.mock.calls[0][0]).toContain('drive.usercontent.google.com/download');
    expect(chu).toContain('Yêu cầu cần đạt môn Toán lớp 4');
    expect(chu).toContain('góc nhọn, góc tù, góc bẹt');
  });

  it('đọc được file Word trên Drive', async () => {
    giaFetch(readFileSync(path.join(__dirname, 'fixtures/bai-doc-mau.docx')), 'application/octet-stream');
    const chu = await layChuTuLink(`https://drive.google.com/file/d/${ID}/view`);
    expect(chu.length).toBeGreaterThan(50);
  });

  it('báo rõ khi file Drive chưa chia sẻ công khai', async () => {
    giaFetch(Buffer.from('<!DOCTYPE html><html>Đăng nhập</html>'), 'text/html');
    await expect(layChuTuLink(`https://drive.google.com/file/d/${ID}/view`)).rejects.toThrow(/chưa chia sẻ công khai/);
  });

  it('báo cách làm khi dán link thư mục', async () => {
    await expect(layChuTuLink(`https://drive.google.com/drive/folders/${ID}`)).rejects.toThrow(/link thư mục/);
  });

  it('chặn địa chỉ nội bộ', async () => {
    await expect(layChuTuLink('http://127.0.0.1/x')).rejects.toThrow(/không hợp lệ/);
  });
});
