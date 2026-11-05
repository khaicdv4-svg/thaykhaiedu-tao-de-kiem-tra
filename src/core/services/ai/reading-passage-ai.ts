/**
 * ThayKhaiEdu - AI cho kho bài đọc (tìm bài đọc theo tiêu chí).
 *
 * Model và khóa do tổ trưởng chọn ở trang Cài đặt AI (/ai-settings), việc "Tìm bài đọc".
 * File này không gọi mạng: nhận sẵn hàm gọi AI (route API truyền vào) để dễ kiểm thử.
 * Mọi kết quả AI vẫn phải qua kiemTraBaiDoc() và hàng chờ duyệt như bài nhập tay.
 */

import type { KyKiemTraBaiDoc, LoaiBaiDoc, TheLoaiBaiDoc } from '@/core/reading-passages/quy-dinh';
import { CHU_DIEM_THEO_KY, DANH_SACH_KY, TEN_LOAI, TEN_THE_LOAI, khoangDoDai } from '@/core/reading-passages/quy-dinh';
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
}

/** Hàm gọi AI do máy chủ cung cấp (đã chọn model và khóa theo Cài đặt AI). */
export type HamGoiAI = (yeuCau: { heThong: string; noiDung: string; toiDaToken: number; timWeb: boolean }) => Promise<{ traLoi: string; daTimWeb: boolean }>;

export const HE_THONG_TIM_BAI_DOC =
  'Bạn hỗ trợ tổ chuyên môn khối 4 (TP.HCM) tìm văn bản có thật làm ngữ liệu kiểm tra Tiếng Việt. ' +
  'Chỉ đưa văn bản đã xuất bản, chép đúng nguyên văn, ghi đúng tác giả và nguồn. Không bịa văn bản, tác giả hay link. ' +
  'Không tìm được thì trả về ít bài hơn hoặc mảng rỗng.';

function chuoi(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Đổi câu trả lời của AI thành danh sách bài đề xuất (bỏ bài thiếu tiêu đề hoặc nội dung). */
export function docDeXuatBaiDoc(traLoi: string, tieuChi: TieuChiTimBaiDoc, daTimWeb: boolean): BaiDocAIDeXuat[] {
  const mang = docMangJson<Record<string, unknown>>(traLoi);
  const theLoaiHopLe = Object.keys(TEN_THE_LOAI) as TheLoaiBaiDoc[];
  return mang
    .map((x) => {
      const tl = chuoi(x.theLoai) as TheLoaiBaiDoc;
      const ghiChuWeb = daTimWeb ? '' : ' (AI không tìm web được: kiểm tra kỹ tác giả và nguồn)';
      return {
        tieuDe: chuoi(x.tieuDe),
        noiDung: chuoi(x.noiDung),
        tacGia: chuoi(x.tacGia),
        nguon: chuoi(x.nguon),
        nguonUrl: chuoi(x.nguonUrl),
        theLoai: theLoaiHopLe.includes(tl) ? tl : tieuChi.theLoai,
        chuDiem: chuoi(x.chuDiem) || tieuChi.chuDiem,
        lyDoPhuHop: `AI: ${chuoi(x.lyDoPhuHop) || 'không ghi lí do'}${ghiChuWeb}`,
      };
    })
    .filter((b) => b.tieuDe && b.noiDung)
    .slice(0, tieuChi.soBai);
}

export function taoAIBaiDoc(goi: HamGoiAI): IAIBaiDoc {
  return {
    async timBaiDoc(tieuChi) {
      const kq = await goi({ heThong: HE_THONG_TIM_BAI_DOC, noiDung: loiNhacTimBaiDoc(tieuChi), toiDaToken: 8000, timWeb: true });
      return docDeXuatBaiDoc(kq.traLoi, tieuChi, kq.daTimWeb);
    },
  };
}

/**
 * Lời nhắc (prompt) tìm bài đọc. Viết sẵn theo quy định của tổ để khi cắm AI chỉ cần gửi đi.
 * AI phải dùng công cụ tìm kiếm web và trả về link thật; app sẽ tự mở link để kiểm tra.
 */
export function loiNhacTimBaiDoc(t: TieuChiTimBaiDoc): string {
  const ky = DANH_SACH_KY.find((k) => k.ma === t.ky)?.ten ?? t.ky;
  const khoang = khoangDoDai(t.loai, t.ky, t.theLoai);
  const doDai = khoang ? `${khoang.min} – ${khoang.max} tiếng (lệch tối đa ±${khoang.dungSai})` : 'theo quy định của tổ';
  const sgk = BAI_DOC_SGK_TV4.map((b) => b.ten).join('; ');
  return [
    `Tìm ${t.soBai} văn bản tiếng Việt có thật để làm bài ${TEN_LOAI[t.loai].toLowerCase()} cho học sinh lớp 4, kiểm tra ${ky}.`,
    `Chủ điểm: ${t.chuDiem} (chủ điểm của kì: ${CHU_DIEM_THEO_KY[t.ky].join('; ')}). Thể loại: ${TEN_THE_LOAI[t.theLoai]}. Độ dài phần thân bài: ${doDai}.`,
    'Bắt buộc:',
    '- Văn bản đã được xuất bản (sách, báo, tạp chí, trang của nhà xuất bản hoặc tác giả); ghi đúng tên tác giả. Không tự viết hay sửa lời rồi gán tên tác giả.',
    '- Không lấy bài có trong SGK Tiếng Việt 4 Kết nối tri thức đang dạy, không lấy từ SGK bộ Cánh Diều, Chân trời sáng tạo.',
    `- Danh sách bài SGK đang dạy (không được trùng): ${sgk}.`,
    '- Được trích một đoạn trọn ý từ bài dài; ghi rõ là trích đoạn.',
    '- Từ ngữ gần gũi với học sinh miền Nam, nội dung phù hợp lứa tuổi.',
    '- Nguồn chính là sách/báo/tác giả; nếu có link thì link phải mở được và đúng văn bản, bỏ tham số utm.',
    'Trả về JSON: [{"tieuDe","noiDung","tacGia","nguon","nguonUrl","theLoai","chuDiem","lyDoPhuHop"}]. Không thêm lời giải thích ngoài JSON.',
    `Trường "theLoai" ghi đúng mã ${t.theLoai}; "noiDung" chép nguyên văn phần thân bài, không kèm tên bài và tác giả.`,
  ].join('\n');
}
