/**
 * ThayKhaiEdu - AI cho kho bài đọc (tìm bài đọc theo tiêu chí).
 *
 * Model và khóa do tổ trưởng chọn ở trang Cài đặt AI (/ai-settings), việc "Tìm bài đọc".
 * File này không gọi mạng: nhận sẵn hàm gọi AI (route API truyền vào) để dễ kiểm thử.
 * Mọi kết quả AI vẫn phải qua kiemTraBaiDoc() và hàng chờ duyệt như bài nhập tay.
 */

import type { KyKiemTraBaiDoc, LoaiBaiDoc, TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import type { BoNao } from '@/core/bo-nao/bo-nao';
import { chuDiemCuaKy, DANH_SACH_KY, TEN_LOAI, TEN_THE_LOAI, khoangDoDai } from '@/core/reading-passages/quy-dinh';
import { BAI_DOC_SGK_TV4 } from '@/core/reading-passages/sgk-tieng-viet-4';
import { docMangJson } from '@/core/services/ai/cau-hinh-ai';

export interface TieuChiTimBaiDoc {
  loai: LoaiBaiDoc;
  ky: KyKiemTraBaiDoc;
  chuDiem: string;
  theLoai: TheLoaiBaiDoc;
  soBai: number;
}

export interface BaiDocAIDeXuat {
  tieuDe: string;
  noiDung: string;
  tacGia: string;
  nguon: string;
  nguonUrl: string;
  theLoai: TheLoaiBaiDoc;
  chuDiem: string;
  lyDoPhuHop: string;
}

export interface IAIBaiDoc {
  timBaiDoc(tieuChi: TieuChiTimBaiDoc): Promise<BaiDocAIDeXuat[]>;
  timBaiDocChiTiet(tieuChi: TieuChiTimBaiDoc): Promise<KetQuaTimBaiDoc>;
}

/** Hàm gọi AI do máy chủ cung cấp (đã chọn model và khóa theo Cài đặt AI). */
export type HamGoiAI = (yeuCau: { heThong: string; noiDung: string; toiDaToken: number; timWeb: boolean }) => Promise<{ traLoi: string; daTimWeb: boolean }>;

export const HE_THONG_TIM_BAI_DOC =
  'Bạn hỗ trợ tổ chuyên môn khối 4 (TP.HCM) tìm văn bản có thật làm ngữ liệu kiểm tra Tiếng Việt. ' +
  'Chỉ đưa văn bản đã xuất bản, chép đúng nguyên văn, ghi đúng tác giả và nguồn. Không bịa văn bản, tác giả hay link. ' +
  'Không tìm được thì trả về ít bài hơn hoặc mảng rỗng.';

/** Thêm quy định riêng của tổ (nếu có) vào lời dặn hệ thống cho AI. */
export function heThongCoQuyDinhRieng(heThong: string, boNao?: BoNao | null): string {
  const q = boNao?.quyDinhRieng?.trim();
  return q ? `${heThong}\n\nQuy định riêng của tổ (cần tuân theo, không được trái các yêu cầu bắt buộc ở trên):\n${q.slice(0, 4000)}` : heThong;
}

function chuoi(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Thông tin giúp biết vì sao AI đề xuất ít bài hoặc không có bài nào. */
export interface ChanDoanAI {
  daTimWeb: boolean;
  doDaiTraLoi: number;
  soAIGui: number;
  biLoai: { tieuDe: string; lyDo: string }[];
  trichDau: string;
}

export interface KetQuaTimBaiDoc {
  baiDoc: BaiDocAIDeXuat[];
  chanDoan: ChanDoanAI;
}

/** Đổi câu trả lời của AI thành danh sách bài đề xuất, kèm chẩn đoán những bài bị loại. */
export function phanTichTraLoiAI(traLoi: string, tieuChi: TieuChiTimBaiDoc, daTimWeb: boolean): KetQuaTimBaiDoc {
  const mang = docMangJson<Record<string, unknown>>(traLoi);
  const theLoaiHopLe = Object.keys(TEN_THE_LOAI) as TheLoaiBaiDoc[];
  const ghiChuWeb = daTimWeb ? '' : ' (AI không tìm web được: kiểm tra kỹ tác giả và nguồn)';
  const biLoai: ChanDoanAI['biLoai'] = [];
  const hopLe: BaiDocAIDeXuat[] = [];
  for (const x of mang) {
    const tl = chuoi(x.theLoai) as TheLoaiBaiDoc;
    const bai: BaiDocAIDeXuat = {
      tieuDe: chuoi(x.tieuDe),
      noiDung: chuoi(x.noiDung),
      tacGia: chuoi(x.tacGia),
      nguon: chuoi(x.nguon),
      nguonUrl: chuoi(x.nguonUrl),
      theLoai: theLoaiHopLe.includes(tl) ? tl : tieuChi.theLoai,
      chuDiem: chuoi(x.chuDiem) || tieuChi.chuDiem,
      lyDoPhuHop: `AI: ${chuoi(x.lyDoPhuHop) || 'không ghi lí do'}${ghiChuWeb}`,
    };
    if (!bai.tieuDe) biLoai.push({ tieuDe: '(không có tiêu đề)', lyDo: 'Thiếu tiêu đề' });
    else if (!bai.noiDung) biLoai.push({ tieuDe: bai.tieuDe, lyDo: 'Thiếu nội dung bài' });
    else hopLe.push(bai);
  }
  for (const b of hopLe.slice(tieuChi.soBai)) biLoai.push({ tieuDe: b.tieuDe, lyDo: `Vượt số bài yêu cầu (${tieuChi.soBai})` });
  return {
    baiDoc: hopLe.slice(0, tieuChi.soBai),
    chanDoan: { daTimWeb, doDaiTraLoi: traLoi.length, soAIGui: mang.length, biLoai, trichDau: traLoi.trim().slice(0, 300) },
  };
}

/** Giữ lại để các nơi khác dùng như cũ. */
export function docDeXuatBaiDoc(traLoi: string, tieuChi: TieuChiTimBaiDoc, daTimWeb: boolean): BaiDocAIDeXuat[] {
  return phanTichTraLoiAI(traLoi, tieuChi, daTimWeb).baiDoc;
}

export function taoAIBaiDoc(goi: HamGoiAI, boNao?: BoNao | null): IAIBaiDoc {
  const chiTiet = async (tieuChi: TieuChiTimBaiDoc): Promise<KetQuaTimBaiDoc> => {
    const kq = await goi({ heThong: heThongCoQuyDinhRieng(HE_THONG_TIM_BAI_DOC, boNao), noiDung: loiNhacTimBaiDoc(tieuChi, boNao), toiDaToken: 8000, timWeb: true });
    return phanTichTraLoiAI(kq.traLoi, tieuChi, kq.daTimWeb);
  };
  return {
    timBaiDocChiTiet: chiTiet,
    async timBaiDoc(tieuChi) {
      return (await chiTiet(tieuChi)).baiDoc;
    },
  };
}

/**
 * Lời nhắc (prompt) tìm bài đọc. Viết sẵn theo quy định của tổ để khi cắm AI chỉ cần gửi đi.
 * AI phải dùng công cụ tìm kiếm web và trả về link thật; app sẽ tự mở link để kiểm tra.
 */
export function loiNhacTimBaiDoc(t: TieuChiTimBaiDoc, boNao?: BoNao | null): string {
  const ky = DANH_SACH_KY.find((k) => k.ma === t.ky)?.ten ?? t.ky;
  const khoang = khoangDoDai(t.loai, t.ky, t.theLoai, boNao);
  const doDai = khoang ? `${khoang.min} – ${khoang.max} tiếng (lệch tối đa ±${khoang.dungSai})` : 'theo quy định của tổ';
  const sgk = BAI_DOC_SGK_TV4.map((b) => b.ten).join('; ');
  return [
    `Tìm ${t.soBai} văn bản tiếng Việt có thật để làm bài ${TEN_LOAI[t.loai].toLowerCase()} cho học sinh lớp 4, kiểm tra ${ky}.`,
    `Chủ điểm: ${t.chuDiem} (chủ điểm của kì: ${chuDiemCuaKy(t.ky, boNao).join('; ')}). Ưu tiên thể loại ${TEN_THE_LOAI[t.theLoai]}; thể loại khác cùng nhóm (văn học hoặc thông tin) cũng được. Độ dài phần thân bài: ${doDai}.`,
    'Điều kiện để đề xuất (nới rộng, ưu tiên tìm được bài):',
    '- Đúng chủ điểm, nội dung phù hợp lứa tuổi lớp 4, từ ngữ gần gũi học sinh miền Nam.',
    '- Số tiếng gần quy định. Bài dài hơn vẫn đề xuất được (tổ sẽ cắt một đoạn trọn ý); không đề xuất bài ngắn hơn quy định.',
    '- Nên tìm trong SGK Tiếng Việt 4 bộ Cánh Diều và Chân trời sáng tạo (được phép dùng), cùng sách, báo, tạp chí thiếu nhi.',
    `- Không lấy bài trong SGK Tiếng Việt 4 Kết nối tri thức đang dạy: ${sgk}.`,
    'Thông tin bắt buộc kèm mỗi bài (để tổ duyệt):',
    '- Tên tác giả thật. Văn bản đã xuất bản, chép đúng nguyên văn; không tự viết hay sửa lời rồi gán tên tác giả.',
    '- Link mở được và đúng văn bản (bỏ tham số utm). Không có link thì ghi tên sách và số trang (ví dụ: "Tiếng Việt 4, tập một, Cánh Diều, trang 25").',
    '- Chưa chắc tác giả hoặc link thì để trống trường đó, không đoán.',
    'Trả về JSON: [{"tieuDe","noiDung","tacGia","nguon","nguonUrl","theLoai","chuDiem","lyDoPhuHop"}]. Không thêm lời giải thích ngoài JSON.',
    `Trường "theLoai" ghi đúng mã ${t.theLoai}; "noiDung" chép nguyên văn phần thân bài, không kèm tên bài và tác giả.`,
  ].join('\n');
}
