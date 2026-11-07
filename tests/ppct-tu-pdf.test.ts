import { describe, expect, it } from 'vitest';
import { docBangPpct, loaiDongPpct, taoBackupHub } from '@/core/chuong-trinh/ppct-tu-pdf';
import { extractAndFilterPpctHubData, prepareSubjectIngestionPayload } from '@/core/curriculum/ppct-hub-adapter';

const BANG = ['1\tChủ đề 1\tBài 1: Ôn tập\t2', '1\tChủ đề 1\tBài 2: Phép tính\t1', '2\tChủ đề 1\tBài 1: Ôn tập\t1', '2\tChủ đề 2\tBài 3: Số chẵn\t2'].join('\n');

describe('ppct-tu-pdf', () => {
  it('lọc dòng AI trả về', () => {
    expect(loaiDongPpct('Kết quả\n```\nTuần\tChủ đề\tBài\tSố tiết\n1\tCĐ\tBài 1\t2\n```')).toEqual(['1\tCĐ\tBài 1\t2']);
  });
  it('đọc bảng, tính tổng tiết', () => {
    const r = docBangPpct(BANG);
    expect(r.loi).toEqual([]);
    expect(r.tongTiet).toBe(6);
  });
  it('báo lỗi tuần ngoài khoảng và số tiết sai', () => {
    const r = docBangPpct('0\tA\tBài 1\t2\n3\tA\tBài 2\t9');
    expect(r.loi.length).toBe(2);
  });
  it('cảnh báo tổng tiết lệch quy định và tuần thiếu', () => {
    const r = docBangPpct(BANG, 'subj-toan4');
    expect(r.canhBao.some((c) => c.includes('175'))).toBe(true);
    expect(r.canhBao.some((c) => c.includes('tuần 3'))).toBe(true);
  });
  it('bài chia nhiều tuần được đánh số tiết liên tục', () => {
    const hub = taoBackupHub(docBangPpct(BANG).dong, 'subj-toan4', 4, '2026-2027');
    expect(hub.lessons?.length).toBe(3);
    const b1 = hub.periods!.filter((p) => p.title.startsWith('Bài 1'));
    expect(b1.map((p) => [p.week, p.orderInLesson])).toEqual([[1, 1], [1, 2], [2, 3]]);
  });
  it('đi qua đường nhập PPCT HUB sẵn có và ra đúng lịch tiết', () => {
    const hub = taoBackupHub(docBangPpct(BANG).dong, 'subj-toan4', 4, '2026-2027');
    const parsed = extractAndFilterPpctHubData(hub, 4, '2026-2027');
    const pl = prepareSubjectIngestionPayload(parsed, 'subj-toan4');
    expect(pl?.periods.length).toBe(6);
    expect(pl?.periods[0]).toMatchObject({ week: 1, semester: 1, lessonTitle: 'Bài 1: Ôn tập', topicName: 'Chủ đề 1' });
  });
});
