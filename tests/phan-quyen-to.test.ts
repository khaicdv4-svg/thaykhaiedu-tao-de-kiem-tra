import { describe, expect, it } from 'vitest';
import { BANG_QUYEN, CHUC_VU } from '@/core/phan-quyen/bang-quyen';
import { getNavigationForRole } from '@/core/constants/navigation';

describe('Bảng quyền theo chức vụ', () => {
  it('đủ ô cho mọi chức vụ ở mọi dòng', () => {
    for (const d of BANG_QUYEN) for (const c of CHUC_VU) expect(d.o[c], `${d.viec} – ${c}`).toBeTruthy();
  });
  it('quản trị được mọi việc trừ tự duyệt đề của mình; không ai tự duyệt đề mình', () => {
    for (const d of BANG_QUYEN) {
      if (d.viec.startsWith('Tự duyệt')) expect(Object.values(d.o).every((v) => v === 'khong')).toBe(true);
      else expect(d.o.QT, d.viec).toBe('co');
    }
  });
  it('chỉ Ban giám hiệu và quản trị phê duyệt cuối', () => {
    const d = BANG_QUYEN.find((x) => x.viec.startsWith('Phê duyệt cuối'))!;
    expect(d.o).toEqual({ GV: 'khong', TP: 'khong', TT: 'khong', BGH: 'co', QT: 'co' });
  });
});

describe('Menu theo vai trò', () => {
  it('giáo viên thấy đủ bước 2, 3, 4 của quy trình làm đề', () => {
    const href = getNavigationForRole('TEACHER').map((m) => m.href);
    for (const h of ['/test-builder', '/matrices', '/dac-ta', '/tao-de', '/tests']) expect(href).toContain(h);
  });
});
