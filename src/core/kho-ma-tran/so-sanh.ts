/**
 * ThayKhaiEdu - So sánh hai bản ma trận để báo cho giáo viên biết đã đổi những gì.
 * So theo từng dòng chữ (bỏ dòng trống, gộp khoảng trắng), không phân biệt thứ tự dòng.
 */

export interface KetQuaSoSanh {
  /** Dòng có ở bản mới mà bản cũ không có */
  them: string[];
  /** Dòng có ở bản cũ mà bản mới không còn */
  bo: string[];
}

const chuanDong = (s: string) => s.replace(/\s+/g, ' ').trim();

function cacDong(noiDung: string): string[] {
  return noiDung.split(/\r?\n/).map(chuanDong).filter(Boolean);
}

export function soSanhMaTran(cu: string, moi: string): KetQuaSoSanh {
  const dongCu = cacDong(cu);
  const dongMoi = cacDong(moi);
  const tapCu = new Set(dongCu);
  const tapMoi = new Set(dongMoi);
  return {
    them: [...new Set(dongMoi.filter((d) => !tapCu.has(d)))],
    bo: [...new Set(dongCu.filter((d) => !tapMoi.has(d)))],
  };
}

const rutGon = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Viết phần nội dung thông báo: tối đa `toiDa` dòng mỗi nhóm, còn lại ghi "và N dòng khác". */
export function tomTatThayDoi(kq: KetQuaSoSanh, toiDa = 6): string {
  if (kq.them.length === 0 && kq.bo.length === 0) return 'Nội dung chữ không đổi (có thể chỉ đổi định dạng).';
  const phan: string[] = [];
  const nhom = (tieuDe: string, ds: string[]) => {
    if (ds.length === 0) return;
    const dong = ds.slice(0, toiDa).map((d) => `- ${rutGon(d)}`);
    if (ds.length > toiDa) dong.push(`- và ${ds.length - toiDa} dòng khác`);
    phan.push(`${tieuDe} (${ds.length} dòng):\n${dong.join('\n')}`);
  };
  nhom('Thêm hoặc sửa thành', kq.them);
  nhom('Bản cũ có, bản mới không còn', kq.bo);
  return phan.join('\n\n');
}
