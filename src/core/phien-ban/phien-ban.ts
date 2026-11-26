/**
 * ThayKhaiEdu - Phiên bản app và nhật ký cập nhật.
 *
 * - PHIEN_BAN: mã của bản dựng (commit trên Vercel), gắn lúc dựng qua next.config.mjs.
 *   Trang đang mở giữ mã cũ; máy chủ trả mã mới sau khi triển khai → biết là có bản mới.
 * - NHAT_KY_CAP_NHAT: những thay đổi người dùng cần biết, mới nhất ở đầu. Mỗi lần sửa app có thay đổi
 *   thầy cô thấy được thì thêm một mục ở đầu, số `so` tăng dần (không đổi số của mục cũ).
 */

export const PHIEN_BAN: string = process.env.NEXT_PUBLIC_PHIEN_BAN || 'may';
export const NGAY_DUNG: string = process.env.NEXT_PUBLIC_NGAY_DUNG || '';

export interface MucCapNhat {
  /** Số thứ tự, tăng dần theo thời gian */
  so: number;
  /** Ngày cập nhật dạng YYYY-MM-DD */
  ngay: string;
  tieuDe: string;
  noiDung: string[];
}

export const NHAT_KY_CAP_NHAT: MucCapNhat[] = [
  {
    so: 5,
    ngay: '2026-11-26',
    tieuDe: 'Đề Word vừa trang, không còn khoảng trống lớn cuối trang',
    noiDung: [
      'Khung đầu đề (trường, họ tên, lớp, bảng điểm) giãn dòng 1,0 cho gọn.',
      'Giãn dòng trong đề đặt cố định nên mở bằng Word hay xem trước đều dàn trang như nhau.',
      'Trang nào còn trống nhiều, app tự thêm dòng kẻ rải đều cho các câu có chỗ viết; trang toàn trắc nghiệm thì giãn đều khoảng cách giữa các câu. Cuối trang chừa khoảng 1 cm.',
    ],
  },
  {
    so: 4,
    ngay: '2026-11-26',
    tieuDe: 'Báo khi có phiên bản mới',
    noiDung: [
      'App tự kiểm tra phiên bản. Có bản mới thì hiện thông báo ở góc màn hình kèm những gì thay đổi.',
      'Bấm "Cập nhật ngay" để tải bản mới. Nên lưu phần đang làm trước khi bấm.',
    ],
  },
  {
    so: 3,
    ngay: '2026-11-26',
    tieuDe: 'Chọn khối lớp làm việc ở trang Tổng quan',
    noiDung: [
      'Đầu trang Tổng quan có ô "Không gian làm việc của khối". Chọn khối nào thì ma trận, đặc tả, soạn đề, ngân hàng câu hỏi, mẫu đề, kho bài đọc và kho phân phối chương trình chuyển theo khối đó.',
      'Khối đã chọn được nhớ theo tài khoản, máy tính và điện thoại dùng chung. Đổi khối không xóa dữ liệu của khối cũ.',
    ],
  },
  {
    so: 2,
    ngay: '2026-11-23',
    tieuDe: 'Xóa bản của mình, gọn bước 2',
    noiDung: [
      'Thầy cô tự xóa được ma trận riêng, đặc tả của chính mình. Đề đã gửi duyệt hoặc đã duyệt thì không xóa được.',
      'Bước 2 còn hai bước con: lập ma trận riêng, rồi xem trước và lưu.',
    ],
  },
  {
    so: 1,
    ngay: '2026-11-23',
    tieuDe: 'Đặc tả sửa được, xem đề ngay trong app',
    noiDung: [
      'Đặc tả sửa được kể cả khi đã lưu, có ô chọn dạng bài cụ thể cho từng câu.',
      'Bước 4 có màn Xem đề: câu lệch được đánh dấu, có nút sửa đúng câu đó. Ma trận chung có bảng tỉ lệ theo số tiết để tổ trưởng tham khảo.',
    ],
  },
];

/** Số của mục mới nhất trong một nhật ký */
export function soMoiNhat(nk: MucCapNhat[]): number {
  return nk.reduce((m, x) => Math.max(m, x.so), 0);
}

/** Các mục mới hơn số đã biết, mới nhất ở đầu */
export function mucMoiHon(nk: MucCapNhat[], daBiet: number): MucCapNhat[] {
  return nk.filter((x) => x.so > daBiet).sort((a, b) => b.so - a.so);
}

/** Máy chủ đang chạy bản khác bản của trang đang mở (bỏ qua khi chưa đọc được hoặc đang chạy thử trên máy) */
export function coBanMoi(banTrang: string, banMayChu: string | null | undefined): boolean {
  if (!banMayChu) return false;
  if (banTrang.startsWith('may') && banMayChu.startsWith('may')) return false;
  return banTrang !== banMayChu;
}

/** "2026-11-26" → "26/11/2026" */
export function ngayVN(ngay: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ngay);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ngay;
}
