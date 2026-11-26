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
    so: 12,
    ngay: '2026-11-26',
    tieuDe: 'Phần 2 Đọc thành tiếng: tạo câu hỏi dùng được ngay',
    noiDung: [
      'Mục Câu hỏi của Phần 2 không còn phải chờ bản đặc tả. Mỗi bài có ô câu hỏi, đáp án, app tự lưu.',
      'Nút "AI tạo câu hỏi cho bài còn trống" (và "AI soạn lại tất cả"): mỗi bài một câu hỏi ngắn về chi tiết trong đoạn, kèm đáp án. Thầy cô sửa trực tiếp trong ô.',
      'Đổi bài đọc thì câu hỏi của bài đó được xóa để soạn lại. Câu hỏi tự vào đề khi Hoàn chỉnh đề.',
    ],
  },
  {
    so: 11,
    ngay: '2026-11-26',
    tieuDe: 'Sửa nút "Lưu và sang Soạn câu hỏi" ở bản đặc tả',
    noiDung: [
      'Bấm nút là hiện ngay kết quả cạnh nút: đang lưu, đã lưu (tự sang bước tiếp), hoặc danh sách lỗi cần sửa.',
      'Lỗi nằm ở câu của phần khác (ví dụ bài viết chưa có bài học, tuần) thì app tự hiện cả các phần để thầy cô thấy chỗ sửa.',
      'Sửa lỗi trang đặc tả, tạo đề có lúc nạp nhầm dữ liệu môn Toán trước khi nạp đúng môn đang làm.',
    ],
  },
  {
    so: 10,
    ngay: '2026-11-26',
    tieuDe: 'Đề Tiếng Việt có trang riêng, làm theo 3 phần',
    noiDung: [
      'Bước 1 chọn Tiếng Việt, bấm "Mở đề Tiếng Việt". Trang mới chia: Phần 1 Đọc hiểu, Phần 2 Đọc thành tiếng, Phần 3 Viết, Hoàn chỉnh đề.',
      'Phần 1: chọn bài đọc hiểu (kho, tải file, dán chữ); app tự nhận tên bài, chủ điểm, thể loại. Ngay dưới là ma trận đọc hiểu theo ma trận chung của tổ, rồi bản đặc tả, rồi câu hỏi (AI soạn được).',
      'Phần 2: chọn 4 bài đọc thành tiếng, rồi nhập câu hỏi, đáp án cho từng bài.',
      'Phần 3: chọn kiểu bài viết, bản đặc tả, rồi đề bài và hướng dẫn chấm.',
      'Hoàn chỉnh đề: xem cả đề như bản in (đọc thành tiếng, đọc hiểu kèm bài đọc, viết) và tab Đáp án, hướng dẫn chấm. Bấm "Sửa câu này" là mở đúng phần chứa câu. Xuất Word, gửi duyệt ở đây.',
    ],
  },
  {
    so: 9,
    ngay: '2026-11-26',
    tieuDe: 'Tiếng Việt: chọn bài đọc hiểu rồi mới lập ma trận',
    noiDung: [
      'Bước 2 môn Tiếng Việt: mục 1 là Bài đọc hiểu (chọn từ kho, tải file .docx/.txt hoặc dán chữ). Bên dưới là phần lập ma trận riêng theo ma trận chung của tổ.',
      'Thể loại bài đọc hiểu quyết định phần đọc hiểu của ma trận: truyện, miêu tả, thơ, kịch dùng Văn bản văn học; văn bản thông tin dùng Văn bản thông tin. App tự chọn, không phải bấm.',
      'Tải file bài đọc: app tự nhận tên bài, tác giả, nguồn, thể loại, đếm tiếng và báo nếu trùng sách giáo khoa.',
      'Bước 1 môn Tiếng Việt chỉ còn chọn 4 bài đọc thành tiếng.',
    ],
  },
  {
    so: 8,
    ngay: '2026-11-26',
    tieuDe: 'Bước 2 (Ma trận) dễ thấy chỗ làm hơn',
    noiDung: [
      'Trang lập ma trận chia rõ: 1. Chọn phần thi (ví dụ Tiếng Việt chọn văn bản văn học hay văn bản thông tin), 2. Chọn YCCĐ cho từng câu. Chưa chọn phần thi thì nút chọn hiện ngay trong mục 2.',
      'Nguồn YCCĐ thu gọn thành một dòng, bấm "đổi" khi cần.',
      'Tổ chưa có ma trận chung (hoặc ma trận chung còn lỗi): có nút "Dựng ma trận từ chương trình" ngay tại bước 2, không phải quay về bước 1.',
      'Chọn "Dựng từ chương trình" ở bước 1 thì bước 2 mở thẳng trang dựng khung (đã dựng rồi thì mở luôn khung đó).',
    ],
  },
  {
    so: 7,
    ngay: '2026-11-26',
    tieuDe: 'Phân quyền theo tổ và duyệt đề theo quy trình của tổ',
    noiDung: [
      'Tổ trưởng chọn tổ phó ngay trong bảng thành viên của tổ, tích hoặc bỏ từng quyền cho tổ phó và giáo viên. Quản trị chọn tổ trưởng.',
      'Thêm hai quyền: Phân công kiểm tra chéo và Duyệt cấp tổ. Tổ trưởng giao từng môn cho người phụ trách duyệt (ví dụ tổ trưởng 2 môn, tổ phó 2 môn).',
      'Quy trình mới ở Kho đề: gửi kiểm tra chéo → người kiểm tra góp ý hoặc duyệt chéo → duyệt cấp tổ → chọn tối đa 3 đề chính mỗi môn nộp Ban giám hiệu. Có nút phân công kiểm tra chéo xoay vòng cả tổ.',
      'Quản trị làm được mọi việc, trừ tự duyệt đề do mình soạn. Bảng quyền ở Cài đặt đã sửa cho đúng quyền thật.',
    ],
  },
  {
    so: 6,
    ngay: '2026-11-26',
    tieuDe: 'Gọn bước làm đề: ít nút hơn, tự lưu, bài đọc chọn ở bước 1',
    noiDung: [
      'Bước 1: ô môn, kì theo khối đang làm (Thông tư 27). Lớp 1–3 không có giữa kì; Khoa học, Lịch sử và Địa lí, Tin học, Công nghệ chỉ kiểm tra cuối kì. Thêm môn Tin học. Tổ kiểm tra thêm thì tổ trưởng bật ở Bộ não chuyên môn, mục 3.',
      'Môn Tiếng Việt: chọn bài đọc hiểu và 4 bài đọc thành tiếng ngay ở bước 1, app tự lưu. Bước 4 tự lấy bài, chỉ còn soạn câu hỏi.',
      'Bước 2: một nút "Xem trước và lưu". Bước 3: tab Sửa / Xem và một nút "Lưu và sang Tạo đề". Bỏ ô "Tôi đã xem kĩ".',
      'Bước 4: tự lưu nháp sau 3 giây. Mở "Xem đề" là app tự kiểm tra cả đề; khung Hoàn tất gồm Xuất Word, Xuất bộ hồ sơ, Gửi duyệt.',
      'Kiểm định đề chuyển vào bước 5 (cuối trang Kho đề). Giáo viên thấy đủ bước 2, 3, 4 trên menu.',
    ],
  },
  {
    so: 5,
    ngay: '2026-11-26',
    tieuDe: 'Đề Word vừa trang, không còn khoảng trống lớn cuối trang',
    noiDung: [
      'Khung đầu đề (trường, họ tên, lớp, bảng điểm) giãn dòng 1,0 cho gọn.',
      'Giãn dòng trong đề đặt cố định nên mở bằng Word hay xem trước đều dàn trang như nhau.',
      'Trang nào còn trống nhiều, app tự thêm dòng kẻ rải đều cho các câu có chỗ viết; trang toàn trắc nghiệm thì giãn đều khoảng cách giữa các câu. Cuối trang chừa khoảng 1 cm.',
      'Đề Tiếng Việt: phần đọc hiểu cũng tự lấp trang; tờ Viết tự tính số dòng kẻ cho kín hai trang thay vì cố định 44 dòng.',
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
