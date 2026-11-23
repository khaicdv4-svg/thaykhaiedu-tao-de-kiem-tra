/**
 * ThayKhaiEdu - Dạng bài cụ thể của từng câu (giáo viên chọn ở bước Đặc tả).
 *
 * YCCĐ thường rộng (ví dụ "chuyển đổi và tính toán với các số đo…", "giải bài toán có hai, ba bước tính… ví dụ tìm hai số
 * khi biết tổng và hiệu"). AI dễ chọn nhầm một dạng khác trong YCCĐ. "Dạng bài" thu hẹp câu về đúng một dạng:
 * - Gợi ý các dạng tách ra từ chính YCCĐ (dòng "+ …", phần "ví dụ: …", các vế ngăn bởi dấu chấm phẩy).
 * - Đưa thành yêu cầu bắt buộc khi AI soạn câu.
 * - Sau khi có câu, nhận ra một số dạng hay gặp để báo câu nào lệch dạng (đổi đơn vị đo, bài toán có lời văn,
 *   tổng và hiệu, trung bình cộng, đặt tính). Dạng khác thì không tự kiểm (không đoán), chỉ dựa vào lời nhắc AI.
 *
 * Dùng chung cho mọi môn, mọi kì: không ghi cứng câu số mấy hay kì nào.
 */

export type KieuDangBai = 'DOI_DON_VI' | 'TONG_HIEU' | 'TRUNG_BINH_CONG' | 'LOI_VAN' | 'DAT_TINH';

const chuan = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const vietHoaDau = (s: string) => (s ? s[0].toLocaleUpperCase('vi') + s.slice(1) : s);
const gon = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s+\-–•:;,.]+|[\s;,.:]+$/g, '').trim();

/** Đổi cách viết m2, dm2 thành m², dm² cho dễ đọc. */
const muDienTich = (s: string) => s.replace(/(?<![\p{L}\d])(mm|cm|dm|m|km)2(?![\p{L}\d])/gu, '$1²');

/**
 * Các dạng bài gợi ý cho một câu, tách từ YCCĐ. Không thêm dạng nào ngoài YCCĐ, trừ một câu mô tả rõ cho
 * YCCĐ có "chuyển đổi" (dạng điền số vào chỗ chấm), vì đây là chỗ AI hay ra nhầm thành bài toán có lời văn.
 */
export function goiYDangBai(yccd: string): string[] {
  const kq: string[] = [];
  const them = (s: string) => {
    const x = gon(muDienTich(s));
    if (x.length >= 4 && x.length <= 220 && !kq.some((k) => chuan(k) === chuan(x))) kq.push(vietHoaDau(x));
  };
  const ds = (yccd ?? '').split(/\s*;\s*/).flatMap((y) => y.split('\n'));
  const dau = (yccd ?? '').split(/[:\n]/)[0] ?? '';
  const coChuyenDoi = /chuyển đổi/i.test(yccd ?? '');

  for (const dong of ds) {
    const t = dong.trim();
    if (!t) continue;
    // Phần "ví dụ: …" trong ngoặc hoặc sau dấu hai chấm
    for (const m of t.matchAll(/ví dụ\s*:?\s*([^)]+)\)?/giu)) them(m[1]);
    if (/^\+/.test(t)) {
      const y = t.replace(/^\+\s*/, '').replace(/\(?\s*ví dụ[^)]*\)?/giu, '');
      // Dòng "+ Khối lượng: g, kg, yến, tạ, tấn" dưới YCCĐ "chuyển đổi…": ghi rõ là chuyển đổi số đo
      if (coChuyenDoi && /^[^:]{2,30}:/.test(y)) them(`Chuyển đổi số đo ${y.replace(/^([^:]+):/, (_, a: string) => `${a.toLowerCase()}:`)}`);
      else them(y);
    }
  }
  // YCCĐ ghi các vế trên một dòng, ngăn bằng dấu chấm phẩy: "độ dài (mm, cm…); diện tích (…)"
  if (coChuyenDoi && !kq.some((k) => /^Chuyển đổi số đo/.test(k))) {
    for (const m of (yccd ?? '').matchAll(/(độ dài|diện tích|khối lượng|dung tích|thời gian)\s*\(([^)]+)\)/giu)) them(`Chuyển đổi số đo ${m[1].toLowerCase()}: ${m[2]}`);
  }
  if (coChuyenDoi) {
    them('Chuyển đổi đơn vị đo: điền số thích hợp vào chỗ chấm (… = …), không ra bài toán có lời văn');
  }
  // YCCĐ ngắn, một ý: chính YCCĐ là dạng bài, không cần gợi ý thêm
  if (!kq.length && dau && ds.length > 1) them(dau);
  return kq;
}

/** YCCĐ rộng (nhiều dòng "+", có "ví dụ", nhiều vế) thì nên chọn dạng bài cụ thể. */
export function yccdRong(yccd: string): boolean {
  const y = yccd ?? '';
  return /\n\s*\+/.test(y) || /ví dụ/i.test(y) || y.split(';').filter((x) => x.trim()).length >= 2;
}

/** Nhận ra các dạng hay gặp trong chữ giáo viên ghi. Một chữ có thể ứng với nhiều dạng (tổng hiệu cũng là lời văn). */
export function nhanDangBai(dangBai: string | null | undefined): KieuDangBai[] {
  const t = chuan(dangBai ?? '');
  if (!t) return [];
  const kq = new Set<KieuDangBai>();
  const khongLoiVan = /không (phải |ra |là )?(bài toán )?có lời văn|không (phải |ra )?bài toán/.test(t);
  if (/chuyển đổi|đổi đơn vị|đổi số đo|đổi các số đo/.test(t)) kq.add('DOI_DON_VI');
  if (/tổng và hiệu|tổng, hiệu|biết tổng và hiệu/.test(t)) { kq.add('TONG_HIEU'); kq.add('LOI_VAN'); }
  if (/trung bình cộng/.test(t)) kq.add('TRUNG_BINH_CONG');
  if (!khongLoiVan && /lời văn|giải (một )?(bài )?toán|bài toán/.test(t) && !kq.has('DOI_DON_VI')) kq.add('LOI_VAN');
  if (/đặt tính/.test(t)) kq.add('DAT_TINH');
  return [...kq];
}

/** Câu dặn thêm cho AI theo dạng nhận ra được. */
export function huongDanTheoDang(dangBai: string): string {
  const k = nhanDangBai(dangBai);
  const dong: string[] = [];
  if (k.includes('DOI_DON_VI')) dong.push('Dạng đổi đơn vị đo: mỗi ý viết dạng "3 tấn 50 kg = … kg" để học sinh điền số vào chỗ chấm (trắc nghiệm thì hỏi một phép đổi và 4 kết quả). KHÔNG kể tình huống, KHÔNG có câu "Hỏi…", KHÔNG phải bài toán có lời văn.');
  if (k.includes('TONG_HIEU')) dong.push('Dạng tìm hai số khi biết tổng và hiệu: bài toán có lời văn, tình huống thực tế, cho TỔNG của hai số và cho biết số này nhiều hơn (hoặc ít hơn) số kia bao nhiêu, rồi hỏi mỗi số. Không đổi sang dạng toán khác.');
  else if (k.includes('LOI_VAN')) dong.push('Dạng bài toán có lời văn: có tình huống và câu hỏi "Hỏi…?", học sinh trình bày bài giải và đáp số.');
  if (k.includes('TRUNG_BINH_CONG')) dong.push('Dạng tìm số trung bình cộng: đề bài phải hỏi số trung bình cộng.');
  if (k.includes('DAT_TINH')) dong.push('Dạng đặt tính rồi tính: lệnh "Đặt tính rồi tính", các ý a), b)… là phép tính.');
  return dong.join('\n');
}

const coCauHoi = (s: string) => /(?<![\p{L}\d])hỏi(?![\p{L}\d])|\?/iu.test(s);
const DON_VI = /(?<![\p{L}\d])(mm²?|cm²?|dm²?|m²?|km|mm2|cm2|dm2|m2|g|kg|yến|tạ|tấn|ml|l|lít|giây|phút|giờ|ngày|tuần( lễ)?|tháng|năm|thế kỉ|thế kỷ|đồng)(?![\p{L}\d])/iu;

/**
 * Câu đã soạn có đúng dạng bài giáo viên chọn không. Chỉ kiểm các dạng nhận ra được; trả về các lỗi, rỗng là ổn.
 * Đây là kiểm tra theo dấu hiệu trong chữ, nên chỉ báo để giáo viên xem lại, không tự sửa câu.
 */
export function kiemTraDangBai(dangBai: string | null | undefined, cau: { deBai: string; luaChon?: string[] }): string[] {
  const k = nhanDangBai(dangBai);
  const deBai = cau.deBai ?? '';
  if (!k.length || !deBai.trim()) return [];
  const tatCa = `${deBai}\n${(cau.luaChon ?? []).join('\n')}`;
  const t = chuan(tatCa);
  const loi: string[] = [];

  if (k.includes('DOI_DON_VI')) {
    const coDauBang = /=/.test(tatCa);
    if (coCauHoi(deBai) && !coDauBang) loi.push('Đặc tả chọn dạng chuyển đổi đơn vị đo nhưng câu đang là bài toán có lời văn.');
    else if (!coDauBang && !/đổi|viết số thích hợp|điền số/.test(t)) loi.push('Đặc tả chọn dạng chuyển đổi đơn vị đo nhưng chưa thấy phép đổi dạng "… = …".');
    else if (!DON_VI.test(tatCa)) loi.push('Đặc tả chọn dạng chuyển đổi đơn vị đo nhưng câu chưa có đơn vị đo.');
  }
  if (k.includes('LOI_VAN') && !coCauHoi(deBai)) loi.push('Đặc tả chọn dạng bài toán có lời văn nhưng câu chưa có câu hỏi "Hỏi…?".');
  if (k.includes('TONG_HIEU')) {
    const coTong = /tất cả|cả hai|tổng|tổng cộng|cộng lại|gộp lại|cả (hai )?(kho|lớp|thùng|bao|đội|xe|bạn|ngày)/.test(t);
    const coHieu = /nhiều hơn|ít hơn|hơn|kém|hiệu/.test(t);
    if (!coTong || !coHieu) loi.push('Đặc tả chọn dạng tìm hai số khi biết tổng và hiệu nhưng câu chưa cho đủ tổng và hiệu của hai số.');
  }
  if (k.includes('TRUNG_BINH_CONG') && !/trung bình/.test(t)) loi.push('Đặc tả chọn dạng tìm số trung bình cộng nhưng câu chưa hỏi số trung bình cộng.');
  if (k.includes('DAT_TINH') && !/đặt tính/.test(t)) loi.push('Đặc tả chọn dạng đặt tính rồi tính nhưng đề bài chưa có lệnh "Đặt tính rồi tính".');
  return loi;
}
