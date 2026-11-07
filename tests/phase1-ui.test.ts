import { describe, it, expect } from 'vitest';
import { getNavigationForRole, MAIN_NAVIGATION } from '../src/core/constants/navigation';

describe('Giai đoạn 1 - Nền tảng & Giao diện (Platform & UI Tests)', () => {
  it('correctly filters navigation menu for TEACHER', () => {
    const teacherNav = getNavigationForRole('TEACHER');
    const hrefs = teacherNav.map((n) => n.href);

    // Teachers have access to daily creation & operational pages
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/sources');
    expect(hrefs).toContain('/questions');
    expect(hrefs).toContain('/reading-passages');
    expect(hrefs).toContain('/test-builder');
    expect(hrefs).toContain('/validation');
    expect(hrefs).toContain('/tests');
    expect(hrefs).toContain('/settings');

    // Teachers DO NOT have direct access to matrix management or template configuration
    expect(hrefs).not.toContain('/matrices');
    expect(hrefs).not.toContain('/dac-ta');
    expect(hrefs).not.toContain('/templates');
    expect(hrefs).not.toContain('/ai-settings');
    expect(hrefs).toContain('/ma-tran-chung');
    expect(hrefs).toContain('/ma-tran-ca-nam');
    expect(teacherNav.length).toBe(11);
  });

  it('correctly provides full specialized menu for GROUP_LEADER (Tổ trưởng)', () => {
    const leaderNav = getNavigationForRole('GROUP_LEADER');
    const hrefs = leaderNav.map((n) => n.href);

    // Tổ trưởng thấy đủ 11 mục, gồm ma trận, đặc tả, mẫu đề và Cài đặt AI
    expect(hrefs).toContain('/matrices');
    expect(hrefs).toContain('/dac-ta');
    expect(hrefs).toContain('/ai-settings');
    expect(hrefs).toContain('/templates');
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/test-builder');
    expect(leaderNav.length).toBe(18);
  });

  it('correctly provides full menu for SCHOOL_ADMIN and SYSTEM_ADMIN', () => {
    const adminNav = getNavigationForRole('SCHOOL_ADMIN');
    expect(adminNav.length).toBe(18);

    const sysAdminNav = getNavigationForRole('SYSTEM_ADMIN');
    expect(sysAdminNav.length).toBe(18);
  });

  it('ensures each navigation item has valid title, href, and icon definition', () => {
    MAIN_NAVIGATION.forEach((item) => {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.href.startsWith('/')).toBe(true);
      expect(item.icon).toBeDefined();
    });
  });
});
