/**
 * Quy tắc soạn câu của tổ khối 4 (TH Trần Văn Ơn) đưa vào lời nhắc cho AI.
 * Nguồn: skill de-kiem-tra-dinh-ki-k4 (quy định [TỔ] và YCCĐ Chương trình 2018), Điều 7 Thông tư 27/2020.
 * Sửa quy tắc ở đây thì mọi chỗ AI soạn, viết lại câu đều theo.
 */

import { hoSoTrinhDo } from '@/core/de/trinh-do-lop';

type Ky = 'GIUA_HK1' | 'CUOI_HK1' | 'GIUA_HK2' | 'CUOI_NAM' | string | null | undefined;

const laHocKi2 = (ky: Ky, tuan?: number | null) => ky === 'GIUA_HK2' || ky === 'CUOI_NAM' || (!ky && (tuan ?? 0) > 18);

/** Định nghĩa mức theo Điều 7 Thông tư 27, kèm dấu hiệu nhận biết ở lớp 4. */
export function moTaMuc(muc: number): string {
  if (muc >= 3) return 'Mức 3 (vận dụng): giải quyết vấn đề MỚI gắn với thực tế đời sống, không phải bài tập quen thuộc chép từ SGK; tình huống cụ thể, có ý nghĩa, học sinh phải tự chọn cách giải hoặc nêu cách xử lí.';
  if (muc === 2) return 'Mức 2 (kết nối): phối hợp 2–3 kiến thức đã học, làm nhiều bước theo cách đã học để giải quyết vấn đề tương tự.';
  return 'Mức 1 (nhận biết): nhận biết, nhắc lại, áp dụng trực tiếp kiến thức đã học trong tình huống quen thuộc, làm một bước.';
}

/** Quy tắc số liệu và giới hạn kĩ thuật môn Toán lớp 4 theo kì. */
export function quyTacToan(ky: Ky, muc: number, tuan?: number | null): string {
  const hk2 = laHocKi2(ky, tuan);
  const dong = [
    'SỐ LIỆU ĐÚNG TẦM LỚP 4 (quy định của tổ): KHÔNG dùng số một, hai chữ số (như 12 kg, 58 kg, 35 quyển) trong bài toán có lời văn, câu thực hành và câu đặt tính — đó là số liệu lớp 2, lớp 3.',
    ky === 'GIUA_HK1'
      ? '- Giữa HKI: bài toán có lời văn dùng số có bốn, năm chữ số (lớp nghìn); câu về số (đọc, viết, cấu tạo, so sánh, làm tròn) dùng số đến lớp triệu.'
      : hk2
        ? '- Học kì II: bài toán có lời văn dùng số có bốn đến sáu chữ số; được dùng phân số đã học, nhân chia với số có hai chữ số.'
        : '- Cuối HKI: bài toán có lời văn, đặt tính dùng số có năm, sáu chữ số (có thể đến lớp triệu); câu về số dùng đến lớp triệu.',
    '- Số lớn thì đổi đối tượng cho hợp thực tế: cả khối, cả trường, cửa hàng, siêu thị, kho, nông trại, nhà máy, thư viện… Không để "một bạn học sinh góp 2 000 kg giấy". Số liệu phải hợp lí với đời thực (giá tiền, cân nặng, quãng đường, thời gian).',
    hk2
      ? '- Giới hạn kĩ thuật học kì II: cộng, trừ có nhớ không quá 3 lượt và không liên tiếp; nhân, chia với số có không quá hai chữ số.'
      : '- Giới hạn kĩ thuật học kì I: cộng, trừ có nhớ không quá 2 lượt và không liên tiếp; nhân, chia với số có MỘT chữ số.',
    '- Sau khi chọn số, TỰ TÍNH LẠI mọi phép tính (kể cả phép tính trong lời giải) và đếm số lượt nhớ cho đúng giới hạn trên; kết quả phải là số tự nhiên khi bài toán hỏi số lượng.',
    '- Viết số tách lớp bằng dấu cách (21 654; 1 250 000), dùng dấu × và : cho phép nhân, chia; đơn vị cách số một dấu cách (12 450 kg).',
  ];
  if (muc >= 3) dong.push('- Mức 3: tình huống thực tế mới, số liệu lớn tương xứng (ví dụ tìm hai số biết tổng và hiệu: "Hai kho chứa tất cả 12 450 kg gạo, kho thứ nhất chứa nhiều hơn kho thứ hai 1 350 kg…"), không dùng bài có sẵn trong SGK.');
  return dong.join('\n');
}

/** Khối quy tắc chung đưa vào lời nhắc của mỗi câu. */
export function quyTacTheoMon(o: { maMon?: string | null; tenMon?: string; ky?: Ky; muc: number; tuan?: number | null; khoi?: number }): string {
  const laToan = o.maMon === 'TOAN' || /^toán$/i.test(o.tenMon ?? '');
  const phan = [
    `MỨC ĐỘ: ${moTaMuc(o.muc)}`,
    'NGÔN NGỮ: câu ngắn, mỗi câu hỏi một việc, dùng lệnh quen thuộc của SGK; từ ngữ gần gũi học sinh miền Nam (trái thơm, bắp, đậu phộng, chén, ly…); không đánh đố.',
  ];
  // Trình độ lớp: đặc điểm học sinh, phạm vi kiến thức, số liệu theo lớp và học kì (mọi khối, mọi môn)
  const khoi4Toan = laToan && (o.khoi ?? 4) === 4;
  phan.push(hoSoTrinhDo({ khoi: o.khoi, maMon: o.maMon, tenMon: o.tenMon, ky: o.ky, tuan: o.tuan, boQuaSoLieuToan: khoi4Toan }));
  // Quy tắc số liệu Toán theo kì là quy định riêng của tổ khối 4 (chi tiết hơn khung chung)
  if (khoi4Toan) phan.push(quyTacToan(o.ky, o.muc, o.tuan));
  return phan.join('\n');
}
