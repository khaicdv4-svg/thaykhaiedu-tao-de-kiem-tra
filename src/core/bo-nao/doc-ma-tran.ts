/**
 * ThayKhaiEdu - Đọc ma trận chung môn Tiếng Việt (chữ đã lấy ra từ file Word) thành quy định của một kì.
 * Làm bằng quy tắc tìm chữ, không dùng AI. Chỗ nào không đọc được thì báo trong `canhBao`, không đoán.
 */

import { CHU_DIEM_TV4, type KyKiemTraBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import type { QuyDinhMotKy } from '@/core/bo-nao/bo-nao';

export interface KetQuaDocMaTran {
  ky: KyKiemTraBaiDoc | null;
  quyDinh: QuyDinhMotKy | null;
  canhBao: string[];
}

const bo = (s: string) => s.normalize('NFC').toLowerCase().replace(/&/g, ' và ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function timKy(vb: string): KyKiemTraBaiDoc | null {
  const m = vb.normalize('NFC').match(/(GIỮA|CUỐI)\s+(?:HỌC\s+)?(KÌ|KỲ|KỈ|NĂM)\s*(III|II|I|2|1)?\b/i);
  if (!m) return null;
  const giua = /giữa/i.test(m[1]);
  if (/năm/i.test(m[2])) return 'CUOI_NAM';
  const hai = /^(II|2)$/i.test(m[3] ?? '');
  return giua ? (hai ? 'GIUA_HK2' : 'GIUA_HK1') : hai ? 'CUOI_NAM' : 'CUOI_HK1';
}

const THE_LOAI_DONG: { re: RegExp; ma: TheLoaiBaiDoc }[] = [
  { re: /^truyện/i, ma: 'TRUYEN' },
  { re: /^miêu tả/i, ma: 'MIEU_TA' },
  { re: /^thơ/i, ma: 'THO' },
  { re: /^văn bản thông tin/i, ma: 'VAN_BAN_THONG_TIN' },
];

export function docMaTranChung(vanBan: string, tenFile?: string): KetQuaDocMaTran {
  const canhBao: string[] = [];
  const vb = vanBan.replace(/\r\n?/g, '\n');
  const ky = timKy(vb.slice(0, 1500)) ?? (tenFile ? timKy(tenFile.replace(/_/g, ' ')) : null);
  if (!ky) canhBao.push('Chưa nhận ra đây là ma trận của kì nào. Thầy chọn kì ở bên dưới.');

  // Độ dài bài đọc hiểu
  const doDai: QuyDinhMotKy['doDai'] = {};
  for (const dong of vb.split('\n')) {
    const m = dong.match(/^[\s+\-•*]*([^:\d]{2,25}?)\s*:[\s:]*(\d{2,3})\s*[-–—]\s*(\d{2,3})\s*(?:chữ|tiếng)?\s*\.?\s*$/i);
    if (!m) continue;
    const loai = THE_LOAI_DONG.find((t) => t.re.test(m[1].trim()));
    if (loai && !doDai[loai.ma]) doDai[loai.ma] = [Number(m[2]), Number(m[3])];
  }
  if (Object.keys(doDai).length === 0) canhBao.push('Không thấy dòng độ dài văn bản (ví dụ "Truyện: 280 - 300 chữ").');
  else if (Object.keys(doDai).length < 4) canhBao.push('Chỉ đọc được độ dài của một số thể loại, thầy kiểm tra lại bảng.');

  // Tốc độ đọc thành tiếng
  let tocDo: QuyDinhMotKy['tocDo'] = null;
  const td = vb.match(/Tốc độ đọc[\s\S]{0,40}?(\d{2,3})\s*[-–—]\s*(\d{2,3})\s*tiếng/i);
  if (td) tocDo = { min: Number(td[1]), max: Number(td[2]) };
  else canhBao.push('Không thấy tốc độ đọc thành tiếng.');

  // Chủ điểm: các dòng giữa "Chủ điểm" và "Tốc độ đọc"
  const chuDiem: string[] = [];
  const cd = vb.match(/Chủ điểm\s*:?([\s\S]{0,300}?)Tốc độ đọc/i);
  if (cd) {
    for (const d of cd[1].split('\n')) {
      const ten = d.replace(/^[\s*\-•\d.)]+/, '').trim();
      if (!ten) continue;
      const chuan = CHU_DIEM_TV4.find((c) => bo(c.ten) === bo(ten));
      chuDiem.push(chuan ? chuan.ten : ten);
      if (!chuan) canhBao.push(`Chủ điểm "${ten}" không trùng tên chủ điểm trong SGK, thầy kiểm tra lại.`);
    }
  }
  if (chuDiem.length === 0) canhBao.push('Không thấy chủ điểm của kì.');

  const quyDinh: QuyDinhMotKy | null = ky ? { ky, tocDo, doDai, chuDiem, tenFile } : null;
  return { ky, quyDinh, canhBao };
}
