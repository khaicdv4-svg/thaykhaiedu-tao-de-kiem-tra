/**
 * ThayKhaiEdu - Dựng khung ma trận môn Tiếng Việt từ chương trình (khi tổ chưa có ma trận chung).
 *
 * Tiếng Việt khác các môn khác: đề có 2 bài, mỗi bài 10 điểm (bài Đọc gồm Đọc thành tiếng 2 điểm và
 * Đọc hiểu 8 điểm; bài Viết 10 điểm). Số câu, mức, điểm theo quy định cố định của tổ, không chia theo số tiết.
 * Vì vậy khung giữ nguyên bộ khung câu của ma trận chung mẫu (TIENG_VIET_3_PHAN) và chỉ thay phần phụ thuộc kì và chương trình:
 *   - chủ điểm của kì, tốc độ đọc, độ dài văn bản (theo bộ não của tổ hoặc quy định mặc định);
 *   - YCCĐ Đọc hiểu lấy từ Kho chương trình (đã duyệt), xếp theo văn bản văn học / văn bản thông tin;
 *   - nội dung Kiến thức Tiếng Việt lấy từ tên các tiết Luyện từ và câu trong PPCT;
 *   - kiểu bài viết lấy từ các tiết Viết trong PPCT (chỉ kiểu bài đã luyện trong phạm vi tuần).
 *
 * Quy tắc: hàm thuần túy, không gọi AI, không đọc cơ sở dữ liệu, không tự bịa YCCĐ. Chỗ nào Kho thiếu thì giữ chữ của ma trận
 * mẫu và ghi vào "Vấn đề cần xác nhận" để giáo viên kiểm.
 */

import type { BoNao } from '@/core/bo-nao/bo-nao';
import { CHU_DIEM_TV4, chuDiemCuaKy, khoangDoDai, type KyKiemTraBaiDoc, type TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import { MA_TRAN_CHUNG_CHK1_TIENG_VIET } from '@/core/matrix/templates/chk1-tieng-viet';
import type { DongMaTran, MaTranChung, PhuongAnLuaChon } from '@/types/matrix-template';

export interface TietTiengViet {
  thuTu: number;
  tuan: number | null;
  chuDe: string | null;
  baiTen: string | null;
  tietTen: string | null;
}

export interface YccdTiengViet {
  mach: string | null;
  chuDe: string | null;
  noiDung: string;
}

const chuoi = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const thuong = (s: string) => s.toLowerCase();

// ---------------------------------------------------------------------------
// Kiểu bài viết trong phạm vi tuần
// ---------------------------------------------------------------------------

export interface KieuBaiViet {
  /** Khóa ổn định, dùng làm mã phương án: viet_1, viet_2… theo thứ tự xuất hiện trong PPCT. */
  ma: string;
  ten: string;
  /** Tuần có tiết viết bài hoàn chỉnh. */
  tuanDau: number;
  /** PPCT có tiết "Trả bài …" của kiểu này trong phạm vi: học sinh đã được trả bài. */
  daTraBai: boolean;
}

const TIEN_TO_VIET = /^vi[eế]t\s*:\s*/i;
const BO_DAU_CHAM = /[\s.]+$/;

/** Tên kiểu bài chuẩn hóa để ghép tiết "Viết bài X" với tiết "Trả bài X". */
function khoaKieuBai(ten: string): string {
  let k = thuong(chuoi(ten).replace(BO_DAU_CHAM, ''));
  for (let i = 0; i < 4; i++) {
    const moi = k.replace(/^(trả bài|viết|bài)\s+/, '');
    if (moi === k) break;
    k = moi;
  }
  return k;
}

/**
 * Các kiểu bài viết đã luyện trong khoảng tuần, lấy từ PPCT.
 * Chỉ tính tiết viết bài hoàn chỉnh ("Viết: Viết thư", "Viết: Viết bài văn miêu tả con vật").
 * Các tiết bước đệm (Tìm hiểu, Tìm ý, Lập dàn ý, Quan sát, Luyện viết mở bài…) không phải kiểu bài kiểm tra.
 * Kiểu nào có tiết "Trả bài …" trong phạm vi thì đánh dấu đã trả bài (quy định của tổ: chỉ kiểm tra kiểu bài đã luyện và đã trả bài).
 */
export function kieuBaiVietTrongPhamVi(tiet: TietTiengViet[], tuanTu: number, tuanDen: number): KieuBaiViet[] {
  const viet = tiet
    .filter((t) => t.tuan !== null && t.tuan >= tuanTu && t.tuan <= tuanDen && t.tietTen && TIEN_TO_VIET.test(chuoi(t.tietTen)))
    .sort((a, b) => a.thuTu - b.thuTu)
    .map((t) => ({ tuan: t.tuan as number, ten: chuoi(t.tietTen).replace(TIEN_TO_VIET, '').replace(BO_DAU_CHAM, '') }));
  const traBai = new Set(viet.filter((x) => /^tr[aả] b[aà]i/i.test(x.ten)).map((x) => khoaKieuBai(x.ten)));
  const kq: KieuBaiViet[] = [];
  for (const x of viet) {
    if (!/^vi[eế]t\s+/i.test(x.ten) || /^vi[eế]t\s+(lại|tiếp)\b/i.test(x.ten)) continue; // chỉ tiết "Viết <kiểu bài>"
    const khoa = khoaKieuBai(x.ten);
    if (!khoa || kq.some((k) => khoaKieuBai(k.ten) === khoa)) continue;
    kq.push({ ma: `viet_${kq.length + 1}`, ten: x.ten, tuanDau: x.tuan, daTraBai: traBai.has(khoa) });
  }
  return kq;
}

/** Gợi ý từ khóa: kiểu bài viết → YCCĐ Viết trong Kho có chứa từ khóa. */
const TU_KHOA_VIET: { kieu: RegExp; yccd: RegExp }[] = [
  { kieu: /thư|đơn|báo cáo/i, yccd: /thư cho|đơn theo mẫu|báo cáo/i },
  { kieu: /tưởng tượng|kể lại|câu chuyện/i, yccd: /kể lại câu chuyện|tưởng tượng/i },
  { kieu: /miêu tả/i, yccd: /miêu tả/i },
  { kieu: /thuật lại|sự việc/i, yccd: /thuật lại/i },
  { kieu: /tình cảm|cảm xúc|nhân vật|người thân/i, yccd: /tình cảm, cảm xúc/i },
  { kieu: /ý kiến|lí do|lý do|thích/i, yccd: /lí do|nêu ý kiến|ý kiến/i },
  { kieu: /hướng dẫn|các bước|làm|sử dụng/i, yccd: /hướng dẫn các bước|các bước thực hiện/i },
];

/** YCCĐ chung cho mọi bài viết (quy trình viết, bố cục) trong Kho: luôn kèm để giáo viên chọn. */
const YCCD_VIET_CHUNG = /biết viết theo các bước|thể hiện chủ đề, ý tưởng chính/i;

/** YCCĐ Viết gợi ý cho một kiểu bài; không có từ khóa khớp thì chỉ có YCCĐ chung. */
export function yccdVietChoKieu(ten: string, kho: YccdTiengViet[]): string[] {
  const viet = kho.filter((y) => y.mach === 'Viết').map((y) => chuoi(y.noiDung));
  const rieng = new Set<string>();
  for (const r of TU_KHOA_VIET) {
    if (!r.kieu.test(ten)) continue;
    for (const y of viet) if (r.yccd.test(y)) rieng.add(y);
  }
  const chung = viet.filter((y) => YCCD_VIET_CHUNG.test(y));
  return [...rieng, ...chung.filter((y) => !rieng.has(y))];
}

// ---------------------------------------------------------------------------
// Kiến thức Tiếng Việt từ tên tiết Luyện từ và câu
// ---------------------------------------------------------------------------

export type NhomKienThuc = 'TU_VUNG' | 'NGU_PHAP' | 'GIAO_TIEP';

const LTVC = /^luy[eệ]n t[uừ] v[aà] c[aâ]u\s*:\s*/i;
const GIAO_TIEP = /nhân hoá|nhân hóa|so sánh|tu từ|giao tiếp|lời nói|lịch sự|đặt câu theo|thể hiện|tình huống|biện pháp/i;
const NGU_PHAP = /danh từ|động từ|tính từ|đại từ|quan hệ từ|chủ ngữ|vị ngữ|trạng ngữ|câu kể|câu hỏi|câu khiến|câu cảm|dấu |liên kết|đoạn văn|câu chủ đề|kiểu câu|cấu tạo câu/i;
const TU_VUNG = /vốn từ|thành ngữ|tục ngữ|hán việt|đồng nghĩa|trái nghĩa|nhiều nghĩa|từ điển|từ ngữ|nghĩa của|từ láy|từ ghép|từ đơn|tiếng|từ loại/i;

/** Phân loại tên một tiết Luyện từ và câu vào Từ vựng / Ngữ pháp / Hoạt động giao tiếp. Chỉ là gợi ý, giáo viên kiểm lại. */
export function phanLoaiKienThuc(ten: string): NhomKienThuc {
  if (GIAO_TIEP.test(ten)) return 'GIAO_TIEP';
  if (NGU_PHAP.test(ten)) return 'NGU_PHAP';
  if (TU_VUNG.test(ten)) return 'TU_VUNG';
  return 'NGU_PHAP';
}

/** Nội dung Luyện từ và câu trong phạm vi tuần, bỏ trùng, giữ thứ tự PPCT. */
export function noiDungLuyenTuVaCau(tiet: TietTiengViet[], tuanTu: number, tuanDen: number): { ten: string; nhom: NhomKienThuc }[] {
  const thay = new Set<string>();
  const kq: { ten: string; nhom: NhomKienThuc }[] = [];
  const ds = tiet
    .filter((t) => t.tuan !== null && t.tuan >= tuanTu && t.tuan <= tuanDen && t.tietTen && LTVC.test(chuoi(t.tietTen)))
    .sort((a, b) => a.thuTu - b.thuTu);
  for (const t of ds) {
    const ten = chuoi(t.tietTen).replace(LTVC, '').replace(BO_DAU_CHAM, '');
    const khoa = thuong(ten);
    if (!ten || thay.has(khoa)) continue;
    thay.add(khoa);
    kq.push({ ten, nhom: phanLoaiKienThuc(ten) });
  }
  return kq;
}

// ---------------------------------------------------------------------------
// Dựng khung
// ---------------------------------------------------------------------------

export interface ThamSoDungTiengViet {
  ky: KyKiemTraBaiDoc;
  tieuDeKy: string;
  namHoc: string;
  truong: MaTranChung['truong'];
  thoiGianPhut: number | null;
  tuanTu: number;
  tuanDen: number;
  tiet: TietTiengViet[];
  /** YCCĐ đã duyệt của Tiếng Việt 4 trong Kho chương trình. */
  yccd: YccdTiengViet[];
  /** Các kiểu bài viết thầy chọn làm phương án (đúng một kiểu sẽ được chọn ở ma trận riêng). */
  kieuBaiViet: KieuBaiViet[];
  boNao?: BoNao | null;
}

export interface KetQuaDungTiengViet {
  maTran: MaTranChung | null;
  loi: string[];
  canhBao: string[];
}

/** "Chủ điểm: 3. Niềm vui sáng tạo; 4. Chắp cánh ước mơ". */
export function chuoiChuDiem(chuDiem: string[]): string {
  const ds = chuDiem.map((ten) => {
    const cd = CHU_DIEM_TV4.find((c) => c.ten === ten);
    return cd ? `${cd.so}. ${cd.ten}` : ten;
  });
  return `Chủ điểm: ${ds.join('; ')}`;
}

/** Số nội dung Luyện từ và câu tối đa ở mỗi dòng Kiến thức Tiếng Việt. */
const TOI_DA_NOI_DUNG_MOT_DONG = 8;

const sao = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const fmtKhoang = (k: { min: number; max: number } | null) => (k ? `${k.min} – ${k.max}` : null);

/** Chia mảng thành `n` phần liên tiếp, phần nào cũng có ít nhất một phần tử (lặp phần tử cuối nếu thiếu). */
function chiaDeu(ds: string[], n: number): string[][] {
  if (n <= 0) return [];
  if (ds.length === 0) return Array.from({ length: n }, () => []);
  const kq: string[][] = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    const con = n - k;
    const so = Math.max(1, Math.ceil((ds.length - i) / con));
    kq.push(i < ds.length ? ds.slice(i, i + so) : [ds[ds.length - 1]]);
    i += so;
  }
  return kq;
}

const KHOA_DOC_HIEU = (loai: 'VBVH' | 'VBTT', noiDung: string): string => {
  const phan = /hình thức/i.test(noiDung) ? 'Đọc hiểu hình thức' : /liên hệ/i.test(noiDung) ? 'Liên hệ, so sánh, kết nối' : 'Đọc hiểu nội dung';
  return `${loai === 'VBVH' ? 'Văn bản văn học' : 'Văn bản thông tin'} > ${phan}`;
};

const MAC_DINH_THE_LOAI: [string, TheLoaiBaiDoc][] = [
  ['Truyện', 'TRUYEN'],
  ['Miêu tả', 'MIEU_TA'],
  ['Thơ', 'THO'],
  ['Văn bản thông tin', 'VAN_BAN_THONG_TIN'],
];

export function dungKhungTiengViet(p: ThamSoDungTiengViet): KetQuaDungTiengViet {
  const loi: string[] = [];
  const canhBao: string[] = [];
  if (p.kieuBaiViet.length === 0) loi.push('Chọn ít nhất một kiểu bài viết đã luyện trong kì (bài Viết 10 điểm).');
  if (loi.length) return { maTran: null, loi, canhBao };

  const mt: MaTranChung = sao(MA_TRAN_CHUNG_CHK1_TIENG_VIET);
  const chuDiem = chuDiemCuaKy(p.ky, p.boNao);
  const chuDiemDai = chuDiem.join('; ');
  const vanDe: string[] = [
    'Khung này do ứng dụng dựng từ phân phối chương trình và YCCĐ đã duyệt, chưa phải ma trận chung của tổ.',
    'Số câu, mức và điểm giữ đúng bộ khung ma trận chung của tổ (Đọc thành tiếng 2 điểm; Đọc hiểu 11 câu, 8 điểm; Viết 10 điểm). Thầy chỉnh ở bước lập ma trận riêng nếu cần.',
    `Phạm vi: tuần ${p.tuanTu} đến tuần ${p.tuanDen} của phân phối chương trình (${p.tieuDeKy}).`,
  ];

  mt.phien_ban_mau = 'DUNG_TU_CHUONG_TRINH';
  mt.ky_kiem_tra = p.ky;
  mt.nam_hoc = p.namHoc;
  mt.truong = p.truong;
  mt.tieu_de = `KHUNG MA TRẬN DỰNG TỪ CHƯƠNG TRÌNH – ${p.tieuDeKy}`;
  mt.thoi_gian_phut = p.thoiGianPhut;
  mt.ngay_ky = 'ngày … tháng … năm …';
  mt.chu_ky = [];

  const bai = (ma: string) => mt.bai_kiem_tra.find((b) => b.ma === ma)!;
  const phanDoc = bai('doc');
  const thanhTieng = phanDoc.phan.find((x) => x.ma === 'doc_thanh_tieng')!;
  const docHieu = phanDoc.phan.find((x) => x.ma === 'doc_hieu')!;
  const phanViet = bai('viet').phan[0];

  // 1. Đọc thành tiếng: chủ điểm của kì, tốc độ đọc theo bộ não hoặc quy định mặc định
  const tocDo = fmtKhoang(khoangDoDai('DOC_THANH_TIENG', p.ky, 'TRUYEN', p.boNao));
  for (const d of thanhTieng.dong) d.noi_dung = chuoiChuDiem(chuDiem);
  if (tocDo) thanhTieng.dong[0].yccd = [`Tốc độ đọc: khoảng ${tocDo} tiếng/phút/HS.`];
  const docDiemCam = p.yccd.find((y) => y.mach === 'Đọc' && /đọc đúng và diễn cảm/i.test(y.noiDung));
  if (docDiemCam) thanhTieng.dong[1].yccd = [`Nghỉ hơi, ngắt nhịp: nghỉ hơi ở chỗ có dấu câu hoặc chỗ ngắt nhịp thơ. ${chuoi(docDiemCam.noiDung)}`];

  // 2. Đọc hiểu văn bản: YCCĐ trong Kho theo "Văn bản văn học/thông tin > Đọc hiểu nội dung/hình thức/Liên hệ…"
  const thieuKho: string[] = [];
  for (const pa of docHieu.lua_chon?.phuong_an ?? []) {
    const loai = pa.ma === 'VBTT' ? 'VBTT' : 'VBVH';
    const nhomDong = new Map<string, DongMaTran[]>();
    for (const d of pa.dong) {
      const khoa = KHOA_DOC_HIEU(loai, d.noi_dung ?? '');
      nhomDong.set(khoa, [...(nhomDong.get(khoa) ?? []), d]);
    }
    for (const [khoa, dongs] of nhomDong) {
      const pool = p.yccd.filter((y) => y.mach === 'Đọc hiểu' && chuoi(y.chuDe) === khoa).map((y) => chuoi(y.noiDung));
      if (pool.length === 0) { thieuKho.push(khoa); continue; }
      chiaDeu(pool, dongs.length).forEach((ds, i) => { dongs[i].yccd = ds; });
    }
  }
  if (thieuKho.length) vanDe.push(`Kho chương trình chưa có YCCĐ đã duyệt cho: ${[...new Set(thieuKho)].join('; ')}. Giữ chữ của ma trận mẫu ở các dòng này, thầy kiểm lại.`);

  // 3. Kiến thức Tiếng Việt: nội dung Luyện từ và câu trong PPCT
  const ltvc = noiDungLuyenTuVaCau(p.tiet, p.tuanTu, p.tuanDen);
  const theoDong: Record<string, NhomKienThuc> = { 'Từ vựng': 'TU_VUNG', 'Ngữ pháp': 'NGU_PHAP', 'Hoạt động giao tiếp': 'GIAO_TIEP' };
  const thieuLtvc: string[] = [];
  const boBot: string[] = [];
  for (const d of docHieu.dong) {
    d.chu_diem = chuDiemDai;
    const nhom = theoDong[d.noi_dung ?? ''];
    if (!nhom) continue;
    const tatCa = ltvc.filter((x) => x.nhom === nhom).map((x) => `Luyện từ và câu: ${x.ten}.`);
    if (tatCa.length === 0) { thieuLtvc.push(d.noi_dung ?? ''); continue; }
    // Quá nhiều nội dung làm bảng ma trận dài: giữ các nội dung gần kì kiểm tra nhất (học sinh còn nhớ)
    if (tatCa.length > TOI_DA_NOI_DUNG_MOT_DONG) boBot.push(`${d.noi_dung} (${tatCa.length} nội dung, giữ ${TOI_DA_NOI_DUNG_MOT_DONG})`);
    d.yccd = tatCa.slice(-TOI_DA_NOI_DUNG_MOT_DONG);
  }
  if (ltvc.length === 0) vanDe.push('PPCT chưa có tiết "Luyện từ và câu" trong phạm vi tuần này. Phần Kiến thức Tiếng Việt giữ chữ của ma trận mẫu, thầy kiểm lại.');
  else {
    vanDe.push('Nội dung Kiến thức Tiếng Việt (Từ vựng, Ngữ pháp, Hoạt động giao tiếp) lấy từ tên các tiết Luyện từ và câu trong PPCT, do ứng dụng xếp loại tự động. Thầy kiểm lại từng dòng.');
    if (boBot.length) vanDe.push(`Các dòng có nhiều nội dung Luyện từ và câu nên chỉ giữ các nội dung gần kì kiểm tra nhất: ${boBot.join('; ')}.`);
    if (thieuLtvc.length) vanDe.push(`PPCT không có tiết Luyện từ và câu nào xếp vào: ${thieuLtvc.join('; ')}. Giữ chữ của ma trận mẫu ở các dòng này.`);
  }

  // 4. Bài viết: mỗi kiểu bài thầy chọn là một phương án
  const phuongAn: PhuongAnLuaChon[] = p.kieuBaiViet.map((k) => {
    const goiY = yccdVietChoKieu(k.ten, p.yccd);
    const khoa = 'Phần 3: Viết văn bản';
    return {
      ma: k.ma,
      ten: k.ten,
      dong: [
        {
          mach: khoa,
          noi_dung: k.ten,
          yccd: goiY.length ? goiY : [`Viết bài theo kiểu: ${k.ten}.`],
          cau_hoi: [{ cau: 'Viết', y_nho: null, so_cau_tinh: 1, muc: 3, hinh_thuc: 'TL', dang: 'VIET', diem: 10 }],
          chu_diem: chuDiemDai,
        },
      ],
    };
  });
  phanViet.lua_chon!.phuong_an = phuongAn;
  const khongCoYccdViet = p.kieuBaiViet.filter((k) => yccdVietChoKieu(k.ten, p.yccd).length === 0).map((k) => k.ten);
  if (khongCoYccdViet.length) vanDe.push(`Kho chương trình chưa có YCCĐ Viết đã duyệt cho: ${khongCoYccdViet.join('; ')}. Thầy bổ sung YCCĐ vào Kho hoặc sửa ở bước sau.`);
  vanDe.push('Kiểu bài viết lấy từ các tiết Viết trong PPCT. Thầy xác nhận đó là kiểu bài đã luyện và đã trả bài trong kì.');
  const chuaTraBai = p.kieuBaiViet.filter((k) => !k.daTraBai).map((k) => k.ten);
  if (chuaTraBai.length) canhBao.push(`PPCT chưa có tiết "Trả bài" cho: ${chuaTraBai.join('; ')}. Chỉ dùng kiểu bài đã trả bài cho học sinh.`);
  vanDe.push('YCCĐ của bài Viết được ứng dụng gợi ý theo từ khóa tên kiểu bài trong Kho YCCĐ đã duyệt. Thầy kiểm lại YCCĐ chọn cho từng kiểu bài.');

  // 5. Độ dài văn bản theo bộ não hoặc quy định mặc định
  const doDai: Record<string, string> = {};
  for (const [ten, tl] of MAC_DINH_THE_LOAI) {
    const k = fmtKhoang(khoangDoDai('DOC_HIEU', p.ky, tl, p.boNao));
    if (k) doDai[ten] = `${k} chữ`;
  }
  mt.do_dai_van_ban = doDai;
  mt.van_de_can_xac_nhan = vanDe;
  return { maTran: mt, loi, canhBao };
}
