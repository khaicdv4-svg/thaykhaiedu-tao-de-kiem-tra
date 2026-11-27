/**
 * ThayKhaiEdu - "Hồ sơ trình độ" của từng lớp 1–5 đưa vào lời nhắc cho AI soạn câu.
 *
 * Mục đích: AI hiểu học sinh lớp mấy, học kì nào đọc được câu dài bao nhiêu, làm được mấy bước,
 * số liệu tới đâu, kiến thức nào đã có trong chương trình, để câu hỏi vừa tầm lớp.
 *
 * Căn cứ: Chương trình GDPT 2018 (yêu cầu cần đạt Toán, Tiếng Việt từng lớp), bộ sách Kết nối tri thức,
 * Điều 7 Thông tư 27/2020. Đây là KHUNG CHUNG: nội dung cụ thể của câu vẫn theo bài trong đặc tả và PPCT;
 * khung khác PPCT của trường thì theo PPCT. Tổ muốn thêm quy định riêng thì ghi ở Bộ não chuyên môn.
 */

type Ky = 'GIUA_HK1' | 'CUOI_HK1' | 'GIUA_HK2' | 'CUOI_NAM' | string | null | undefined;

/** Học kì của đợt kiểm tra (1 hoặc 2). Không rõ kì thì đoán theo tuần. */
export function hocKiCua(ky: Ky, tuan?: number | null): 1 | 2 {
  if (ky === 'GIUA_HK2' || ky === 'CUOI_NAM') return 2;
  if (ky === 'GIUA_HK1' || ky === 'CUOI_HK1') return 1;
  return (tuan ?? 0) > 18 ? 2 : 1;
}

/** Đặc điểm đọc, hiểu, làm bài của học sinh từng lớp: áp dụng cho mọi môn. */
const DAC_DIEM_LOP: Record<number, string[]> = {
  1: [
    'Học sinh lớp 1 mới biết đọc: lệnh rất ngắn (khoảng 10 chữ), mỗi câu một việc, ưu tiên dạng khoanh, nối, tô màu, điền số hoặc điền chữ vào chỗ trống, có tranh minh họa.',
    'Chỉ làm một bước. Không dùng câu phủ định, câu ghép, từ trừu tượng.',
  ],
  2: [
    'Lệnh ngắn (khoảng 15 chữ), từ ngữ gần gũi; nên có tranh minh họa cho bài toán và câu hỏi.',
    'Phần lớn câu làm một bước; câu Mức 3 tối đa hai bước rất quen thuộc.',
  ],
  3: [
    'Câu hỏi ngắn, rõ (khoảng 20–25 chữ), mỗi câu hỏi một việc.',
    'Bài toán tối đa hai bước tính; tình huống gần gũi ở nhà, ở trường.',
  ],
  4: [
    'Câu hỏi rõ ràng (khoảng 25–30 chữ một câu), không dồn nhiều yêu cầu vào một câu.',
    'Bài toán hai đến ba bước tính; học sinh đã quen trình bày lời giải, phép tính, đáp số.',
  ],
  5: [
    'Học sinh đọc được đề dài hơn, nhưng vẫn mỗi câu một yêu cầu chính.',
    'Bài toán nhiều bước, tình huống thực tế; học sinh tự chọn cách giải và trình bày đầy đủ.',
  ],
};

/** Phạm vi kiến thức Toán theo lớp và học kì (khung chung theo chương trình, bộ Kết nối tri thức). */
const TOAN: Record<number, Record<1 | 2, string>> = {
  1: {
    1: 'Số đến 10 (đếm, đọc, viết, so sánh, tách – gộp); cộng, trừ trong phạm vi 10; hình vuông, hình tròn, hình tam giác, hình chữ nhật; khối lập phương, khối hộp chữ nhật; vị trí trên – dưới, phải – trái, trước – sau.',
    2: 'Số đến 100 (đọc, viết, so sánh, chục và đơn vị); cộng, trừ KHÔNG NHỚ trong phạm vi 100; đo độ dài bằng xăng-ti-mét; xem giờ đúng trên đồng hồ; các ngày trong tuần.',
  },
  2: {
    1: 'Số đến 100; cộng, trừ CÓ NHỚ trong phạm vi 100; tìm số hạng, số bị trừ, số trừ; ki-lô-gam, lít; điểm, đoạn thẳng, đường thẳng, đường cong, ba điểm thẳng hàng, đường gấp khúc, hình tứ giác; bài toán một bước (nhiều hơn, ít hơn).',
    2: 'Phép nhân, phép chia; bảng nhân, bảng chia 2 và 5; số đến 1 000 (trăm, chục, đơn vị, so sánh); cộng, trừ trong phạm vi 1 000; mét, ki-lô-mét, đề-xi-mét; giờ, phút, ngày, tháng; tiền Việt Nam; khối trụ, khối cầu; biểu đồ tranh, khả năng xảy ra (chắc chắn, có thể, không thể).',
  },
  3: {
    1: 'Bảng nhân, bảng chia 2–9; nhân số có hai, ba chữ số với số có một chữ số; chia số có hai, ba chữ số cho số có một chữ số (có dư); gấp, giảm một số lần; một phần mấy; mi-li-mét, gam, mi-li-lít, nhiệt độ; góc vuông, góc không vuông, trung điểm, hình tròn; bài toán giải bằng hai bước tính.',
    2: 'Số đến 100 000 (đọc, viết, so sánh, làm tròn); cộng, trừ trong phạm vi 100 000; nhân, chia số có đến năm chữ số với (cho) số có một chữ số; chu vi, diện tích hình chữ nhật, hình vuông (xăng-ti-mét vuông); tháng, năm; tiền Việt Nam; chữ số La Mã; bảng số liệu.',
  },
  4: {
    1: 'Số có nhiều chữ số đến lớp triệu (đọc, viết, cấu tạo, so sánh, làm tròn); cộng, trừ số có nhiều chữ số, tính chất giao hoán, kết hợp; tìm hai số khi biết tổng và hiệu; góc nhọn, góc tù, góc bẹt, đo góc; hai đường thẳng vuông góc, song song; hình bình hành, hình thoi; yến, tạ, tấn; mi-li-mét vuông, đề-xi-mét vuông, mét vuông; giây, thế kỉ.',
    2: 'Nhân, chia với số có một, hai chữ số; tính chất phép nhân; trung bình cộng; phân số (rút gọn, quy đồng, so sánh); cộng, trừ, nhân, chia phân số; tìm phân số của một số; dãy số liệu, biểu đồ cột.',
  },
  5: {
    1: 'Phân số, hỗn số; số thập phân (đọc, viết, so sánh, làm tròn); cộng, trừ, nhân, chia số thập phân; đơn vị đo diện tích héc-ta, ki-lô-mét vuông; hình tam giác, hình thang, hình tròn (chu vi, diện tích).',
    2: 'Tỉ số, tỉ số phần trăm và bài toán; thể tích, xăng-ti-mét khối, đề-xi-mét khối, mét khối; hình hộp chữ nhật, hình lập phương (diện tích xung quanh, toàn phần, thể tích); số đo thời gian; vận tốc, quãng đường, thời gian; biểu đồ hình quạt tròn.',
  },
};

/** Số liệu, giới hạn kĩ thuật Toán theo lớp (khối 4 có quy định riêng của tổ ở quy-tac-soan-de.ts). */
const SO_LIEU_TOAN: Record<number, Record<1 | 2, string>> = {
  1: { 1: 'Mọi số và kết quả trong phạm vi 10.', 2: 'Mọi số và kết quả trong phạm vi 100, cộng trừ không nhớ.' },
  2: { 1: 'Số và kết quả trong phạm vi 100; cộng, trừ có nhớ một lượt.', 2: 'Số và kết quả trong phạm vi 1 000; cộng, trừ có nhớ không quá một lượt; nhân, chia trong bảng 2, 5.' },
  3: { 1: 'Số có đến ba chữ số; nhân, chia với số có một chữ số; kết quả không vượt 1 000.', 2: 'Số có đến năm chữ số, kết quả không vượt 100 000; nhân, chia với số có một chữ số.' },
  4: { 1: '', 2: '' },
  5: { 1: 'Số thập phân có không quá ba chữ số ở phần thập phân; chia số thập phân có thương hữu hạn, gọn.', 2: 'Số liệu thực tế hợp lí (vận tốc, quãng đường, giá tiền, phần trăm); kết quả gọn, không lẻ dài.' },
};

/** Kiến thức Tiếng Việt và yêu cầu đọc hiểu theo lớp. */
const TIENG_VIET: Record<number, string> = {
  1: 'Đọc hiểu: văn bản rất ngắn (khoảng 60–90 tiếng), câu hỏi nhận biết chi tiết rõ trong bài, trả lời bằng khoanh, nối, chọn. Kiến thức: âm, vần, tiếng, viết đúng chính tả c/k, g/gh, ng/ngh; điền vần, điền chữ.',
  2: 'Đọc hiểu: văn bản ngắn, câu hỏi về chi tiết, nhân vật, nội dung chính. Kiến thức: từ chỉ sự vật, hoạt động, đặc điểm; câu giới thiệu, câu nêu hoạt động, câu nêu đặc điểm; dấu chấm, dấu chấm hỏi, dấu chấm than, dấu phẩy. Viết: đoạn văn 4–5 câu.',
  3: 'Đọc hiểu: câu hỏi chi tiết, ý chính, điều học được. Kiến thức: từ chỉ sự vật, hoạt động, đặc điểm; từ có nghĩa giống, trái nghĩa; so sánh; câu kể, câu hỏi, câu cảm, câu khiến; dấu hai chấm, dấu ngoặc kép, dấu gạch ngang. Viết: đoạn văn khoảng 5–7 câu (kể, tả, nêu tình cảm, nêu lí do).',
  4: 'Đọc hiểu: chi tiết, nội dung chính, chủ đề, điều tác giả muốn nói, liên hệ bản thân. Kiến thức: danh từ, động từ, tính từ; chủ ngữ, vị ngữ, trạng ngữ; biện pháp nhân hoá; dấu gạch ngang, dấu ngoặc đơn; thành ngữ, tục ngữ đã học. Viết: bài văn đủ mở bài, thân bài, kết bài; đoạn văn nêu ý kiến, tưởng tượng.',
  5: 'Đọc hiểu: chủ đề, thông điệp, nhận xét nhân vật, chi tiết hình ảnh đặc sắc, liên hệ thực tế. Kiến thức: đại từ, kết từ; câu ghép; liên kết câu; từ đồng nghĩa, từ đa nghĩa; điệp từ, điệp ngữ. Viết: bài văn tả người, tả phong cảnh, kể chuyện sáng tạo, bài văn nêu ý kiến.',
};

/** Hồ sơ trình độ đưa vào lời nhắc: đặc điểm lớp + phạm vi kiến thức môn theo học kì. */
export function hoSoTrinhDo(o: { khoi?: number; maMon?: string | null; tenMon?: string; ky?: Ky; tuan?: number | null; boQuaSoLieuToan?: boolean }): string {
  const khoi = o.khoi && o.khoi >= 1 && o.khoi <= 5 ? o.khoi : 4;
  const hk = hocKiCua(o.ky, o.tuan);
  const laToan = o.maMon === 'TOAN' || /^toán$/i.test(o.tenMon ?? '');
  const laTV = o.maMon === 'TIENG_VIET' || /tiếng việt/i.test(o.tenMon ?? '');
  const dong = [`TRÌNH ĐỘ HỌC SINH LỚP ${khoi}, HỌC KÌ ${hk === 1 ? 'I' : 'II'}:`, ...DAC_DIEM_LOP[khoi].map((x) => `- ${x}`)];
  if (laToan) {
    dong.push(`- Toán lớp ${khoi} học kì ${hk === 1 ? 'I' : 'II'} học: ${TOAN[khoi][hk]}`);
    if (hk === 2) dong.push(`  Học kì II vẫn dùng được kiến thức học kì I: ${TOAN[khoi][1]}`);
    const sl = SO_LIEU_TOAN[khoi][hk];
    if (sl && !o.boQuaSoLieuToan) dong.push(`- Số liệu: ${sl}`);
    dong.push(`- KHÔNG dùng kiến thức của lớp trên hoặc của bài chưa học (ví dụ lớp ${khoi} học kì ${hk === 1 ? 'I' : 'II'} chưa học: ${chuaHocToan(khoi, hk)}).`);
  } else if (laTV) {
    dong.push(`- Tiếng Việt lớp ${khoi}: ${TIENG_VIET[khoi]}`);
    dong.push('- Thuật ngữ trong câu hỏi chỉ dùng tên gọi học sinh đã học ở lớp này (ví dụ lớp 2, 3 chưa gọi "danh từ, động từ, tính từ" mà gọi "từ chỉ sự vật, hoạt động, đặc điểm").');
  } else {
    dong.push('- Chỉ hỏi kiến thức trong các bài đã học của môn ở lớp này; tình huống gần gũi đời sống của học sinh; câu hỏi vận dụng gắn với việc học sinh làm được ở nhà, ở trường.');
  }
  dong.push('- Khung trên là phạm vi chung của chương trình. Nội dung cụ thể của câu theo đúng bài, YCCĐ trong đặc tả và các bài đã học trong phân phối chương trình bên dưới (nếu có); nếu khác nhau thì theo phân phối chương trình.');
  return dong.join('\n');
}

/** Ví dụ kiến thức chưa học (để AI tránh), lấy từ học kì sau hoặc lớp trên. */
function chuaHocToan(khoi: number, hk: 1 | 2): string {
  if (hk === 1) return TOAN[khoi][2].split(';').slice(0, 3).join(';');
  return khoi < 5 ? TOAN[khoi + 1][1].split(';').slice(0, 3).join(';') : 'kiến thức lớp 6 (số nguyên âm, phương trình, …)';
}

// ---------------------------------------------------------------------------
// Phạm vi đã học theo phân phối chương trình
// ---------------------------------------------------------------------------

export interface TietPpctGon { tuan: number | null; baiTen: string | null; chuDe?: string | null }

/** Tuần bắt đầu tính phạm vi kiểm tra của từng kì. Cuối năm: trọng tâm học kì II. */
export function tuanBatDauKy(ky: Ky): number {
  return ky === 'GIUA_HK2' || ky === 'CUOI_NAM' ? 19 : 1;
}

/**
 * Danh sách bài đã học trong kì (đến tuần kiểm tra) và vài bài ngay sau tuần kiểm tra (chưa học, cấm dùng).
 * Gom theo tên bài, giữ thứ tự dạy. Trả chuỗi rỗng khi không có PPCT.
 */
export function phamViDaHoc(tiet: TietPpctGon[], ky: Ky, tuanDen: number, toiDa = 60): string {
  const tu = tuanBatDauKy(ky);
  // Bỏ số trang "(tr.12)" và các tiết không mang nội dung mới (Luyện tập, Luyện tập chung, Kiểm tra…)
  const ten = (t: TietPpctGon) => {
    const n = (t.baiTen ?? '').replace(/\(\s*tr[.\s]*\d+[^)]*\)/gi, '').replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim();
    return /^(luyện tập( chung)?|kiểm tra( định kì)?.*|đánh giá.*|ôn tập( chung)?|em vui học toán)$/i.test(n) ? '' : n;
  };
  const gom = (ds: TietPpctGon[]) => {
    const kq: { tuan: number; ten: string }[] = [];
    for (const t of ds) {
      const n = ten(t);
      if (!n || t.tuan === null || kq.some((x) => x.ten === n)) continue;
      kq.push({ tuan: t.tuan, ten: n });
    }
    return kq;
  };
  const daHoc = gom(tiet.filter((t) => t.tuan !== null && t.tuan >= tu && t.tuan <= tuanDen));
  if (!daHoc.length) return '';
  const chuaHoc = gom(tiet.filter((t) => t.tuan !== null && t.tuan > tuanDen)).slice(0, 6);
  const ds = daHoc.length > toiDa ? daHoc.slice(-toiDa) : daHoc;
  return [
    `CÁC BÀI HỌC SINH ĐÃ HỌC TRONG KÌ (tuần ${tu}–${tuanDen}, theo phân phối chương trình của trường):`,
    ds.map((x) => `T${x.tuan}: ${x.ten}`).join('; '),
    ...(ky === 'CUOI_NAM' ? ['Đề cuối năm trọng tâm học kì II, được dùng kiến thức nền của học kì I.'] : []),
    ...(chuaHoc.length ? [`CHƯA HỌC (tuyệt đối không dùng kiến thức của các bài này): ${chuaHoc.map((x) => x.ten).join('; ')}.`] : []),
  ].join('\n');
}
