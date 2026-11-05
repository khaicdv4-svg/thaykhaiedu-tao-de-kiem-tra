/**
 * Danh sách bài đọc SGK Tiếng Việt 4, bộ Kết nối tri thức, bản 2026 – 2027 (tập một 32 bài, tập hai 30 bài).
 * Dùng để chặn bài đọc trùng SGK đang dạy khi chưa có chữ SGK (kiểm theo tên bài).
 * Khi kho SGK đã nhận dạng chữ các trang bài đọc (bảng sgk_sections), app so thêm theo nội dung.
 */

export interface BaiDocSgk {
  tap: 1 | 2;
  bai: number;
  ten: string;
  trang: number;
  chuDiem: string;
}

const T1: [number, string, number][] = [
  [1, 'Điều kì diệu', 8], [2, 'Thi nhạc', 12], [3, 'Anh em sinh đôi', 16], [4, 'Công chúa và người dẫn chuyện', 20],
  [5, 'Thằn lằn xanh và tắc kè', 23], [6, 'Nghệ sĩ trống', 26], [7, 'Những bức chân dung', 30], [8, 'Đò ngang', 34],
  [9, 'Bầu trời trong quả trứng', 39], [10, 'Tiếng nói của cỏ cây', 44], [11, 'Tập làm văn', 48], [12, 'Nhà phát minh 6 tuổi', 51],
  [13, 'Con vẹt xanh', 55], [14, 'Chân trời cuối phố', 59], [15, 'Gặt chữ trên non', 63], [16, 'Trước ngày xa quê', 66],
  [17, 'Vẽ màu', 77], [18, 'Đồng cỏ nở hoa', 81], [19, 'Thanh âm của núi', 85], [20, 'Bầu trời mùa thu', 89],
  [21, 'Làm thỏ con bằng giấy', 93], [22, 'Bức tường có nhiều phép lạ', 97], [23, 'Bét-tô-ven và bản xô-nát Ánh trăng', 101],
  [24, 'Người tìm đường lên các vì sao', 105], [25, 'Bay cùng ước mơ', 109], [26, 'Con trai người làm vườn', 114],
  [27, 'Nếu em có một khu vườn', 118], [28, 'Bốn mùa mơ ước', 122], [29, 'Ở Vương quốc Tương Lai', 125], [30, 'Cánh chim nhỏ', 129],
  [31, 'Nếu chúng mình có phép lạ', 132], [32, 'Anh Ba', 135],
];

const T2: [number, string, number][] = [
  [1, 'Hải Thượng Lãn Ông', 8], [2, 'Vệt phấn trên mặt bàn', 12], [3, 'Ông Bụt đã đến', 16], [4, 'Quả ngọt cuối mùa', 20],
  [5, 'Tờ báo tường của tôi', 24], [6, 'Tiếng ru', 28], [7, 'Con muốn làm một cái cây', 31], [8, 'Trên khóm tre đầu ngõ', 35],
  [9, 'Sự tích con Rồng cháu Tiên', 40], [10, 'Cảm xúc Trường Sa', 44], [11, 'Sáng tháng Năm', 48], [12, 'Chàng trai làng Phù Ủng', 51],
  [13, 'Vườn của ông tôi', 55], [14, 'Trong lời mẹ hát', 59], [15, 'Người thầy đầu tiên của bố tôi', 63], [16, 'Ngựa biên phòng', 67],
  [17, 'Cây đa quê hương', 80], [18, 'Bước mùa xuân', 85], [19, 'Đi hội chùa Hương', 89], [20, 'Chiều ngoại ô', 93],
  [21, 'Những cánh buồm', 98], [22, 'Cái cầu', 102], [23, 'Đường đi Sa Pa', 106], [24, 'Quê ngoại', 109],
  [25, 'Khu bảo tồn động vật hoang dã Ngô-rông-gô-rô', 113], [26, 'Ngôi nhà của yêu thương', 117], [27, 'Băng tan', 120],
  [28, 'Chuyến du lịch thú vị', 123], [29, 'Lễ hội ở Nhật Bản', 127], [30, 'Ngày hội', 131],
];

const CHU_DIEM_T1 = ['Mỗi người một vẻ', 'Trải nghiệm và khám phá', 'Niềm vui sáng tạo', 'Chắp cánh ước mơ'];
const CHU_DIEM_T2 = ['Sống để yêu thương', 'Uống nước nhớ nguồn', 'Quê hương trong tôi', 'Vì một thế giới bình yên'];

export const BAI_DOC_SGK_TV4: BaiDocSgk[] = [
  ...T1.map(([bai, ten, trang]) => ({ tap: 1 as const, bai, ten, trang, chuDiem: CHU_DIEM_T1[Math.floor((bai - 1) / 8)] })),
  ...T2.map(([bai, ten, trang]) => ({ tap: 2 as const, bai, ten, trang, chuDiem: CHU_DIEM_T2[Math.floor((bai - 1) / 8)] })),
];
