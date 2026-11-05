import { describe, it, expect, beforeEach } from 'vitest';

/**
 * ThayKhaiEdu - Test Suite: Quy trình Xử lý Phiên & Bảo vệ Tuyến đường trên Giao diện (Unit Test)
 * 
 * LƯU Ý MINH BẠCH:
 * File này là Unit Test kiểm tra LOGIC GIẢ LẬP trạng thái ứng dụng (Mock Service) và bộ lọc Route.
 * File này KHÔNG PHẢI là kiểm thử mạng thật tới máy chủ Supabase Auth.
 * Kiểm thử mạng thật với máy chủ Supabase Auth và cơ sở dữ liệu thật được thực hiện tại:
 * - scripts/test-anon-security.ts (Kiểm thử khóa Anon thật, chặn đăng ký công khai và chặn đọc dữ liệu)
 * - scripts/test-rls.sql (Kiểm thử chính sách RLS trên máy chủ Postgres thật)
 */

// Bộ mô phỏng phiên làm việc của người dùng trên giao diện client
interface AuthSession {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

class MockAuthService {
  private currentSession: AuthSession | null = null;

  async signIn(email: string, password: string): Promise<{ success: boolean; session: AuthSession | null; error?: string }> {
    if (!email || !password) {
      return { success: false, session: null, error: 'Thiếu email hoặc mật khẩu' };
    }
    if (password === 'wrong-password') {
      return { success: false, session: null, error: 'Mật khẩu không chính xác' };
    }

    // Giả lập tài khoản của Thầy đăng nhập thành công
    this.currentSession = {
      userId: 'user-thay-khai-id',
      email: email,
      organizationId: '00000000-0000-0000-0000-000000000001', // Trường TH Trần Văn Ơn
      role: 'GROUP_LEADER', // Tổ trưởng chuyên môn Khối 4
    };

    return { success: true, session: this.currentSession };
  }

  async signOut(): Promise<void> {
    this.currentSession = null;
  }

  getSession(): AuthSession | null {
    return this.currentSession;
  }

  // Mô phỏng truy vấn dữ liệu có kiểm tra RLS theo session
  queryExams(targetOrgId: string): { data: Array<{ id: string; title: string }> | null; error?: string } {
    if (!this.currentSession) {
      return { data: null, error: 'Chưa đăng nhập: RLS từ chối truy cập dữ liệu nghiệp vụ (0 dòng)' };
    }

    if (this.currentSession.organizationId !== targetOrgId) {
      return { data: null, error: 'Cách ly đa trường: Không có quyền xem đề của trường khác' };
    }

    return {
      data: [
        { id: 'exam-001', title: 'Đề kiểm tra Giữa kì 1 Toán Lớp 4' },
      ],
    };
  }

  // Kiểm tra route có bị khóa đối với người dùng vãng lai không
  isRouteProtected(pathname: string): boolean {
    const publicRoutes = ['/login', '/auth', '/favicon.ico'];
    const isPublic = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));
    return !isPublic;
  }
}

describe('Giai đoạn 1: Kiểm thử quy trình Đăng nhập, Đăng xuất & Bảo vệ Route', () => {
  let authService: MockAuthService;

  beforeEach(() => {
    authService = new MockAuthService();
  });

  it('1. Trạng thái chưa đăng nhập: Không thể đọc dữ liệu đề thi, RLS chặn', () => {
    expect(authService.getSession()).toBeNull();

    const result = authService.queryExams('00000000-0000-0000-0000-000000000001');
    expect(result.data).toBeNull();
    expect(result.error).toContain('Chưa đăng nhập');
  });

  it('2. Các trang nghiệp vụ bắt buộc phải được bảo vệ, chỉ /login là công khai', () => {
    expect(authService.isRouteProtected('/login')).toBe(false);

    // Mọi route nghiệp vụ đều phải bắt buộc đăng nhập
    expect(authService.isRouteProtected('/dashboard')).toBe(true);
    expect(authService.isRouteProtected('/matrices')).toBe(true);
    expect(authService.isRouteProtected('/questions')).toBe(true);
    expect(authService.isRouteProtected('/test-builder')).toBe(true);
    expect(authService.isRouteProtected('/tests')).toBe(true);
    expect(authService.isRouteProtected('/templates')).toBe(true);
    expect(authService.isRouteProtected('/sources')).toBe(true);
    expect(authService.isRouteProtected('/validation')).toBe(true);
    expect(authService.isRouteProtected('/reading-passages')).toBe(true);
    expect(authService.isRouteProtected('/settings')).toBe(true);
  });

  it('3. Đăng nhập thành công: Hồ sơ gắn đúng Trường TH Trần Văn Ơn và Tổ Khối 4, đọc được dữ liệu', async () => {
    const res = await authService.signIn('thaykhai@example.edu.vn', 'MatKhauDung123!');
    expect(res.success).toBe(true);
    expect(res.session).not.toBeNull();
    expect(res.session?.organizationId).toBe('00000000-0000-0000-0000-000000000001');
    expect(res.session?.role).toBe('GROUP_LEADER');

    // Sau khi đăng nhập: đọc được đề của trường mình
    const examData = authService.queryExams('00000000-0000-0000-0000-000000000001');
    expect(examData.data).not.toBeNull();
    expect(examData.data?.length).toBe(1);
    expect(examData.data?.[0].title).toBe('Đề kiểm tra Giữa kì 1 Toán Lớp 4');
  });

  it('4. Đăng xuất khỏi hệ thống: Phiên bị xóa hoàn toàn, mất quyền đọc dữ liệu', async () => {
    // Đăng nhập trước
    await authService.signIn('thaykhai@example.edu.vn', 'MatKhauDung123!');
    expect(authService.getSession()).not.toBeNull();

    // Thực hiện đăng xuất
    await authService.signOut();
    expect(authService.getSession()).toBeNull();

    // Thử đọc dữ liệu sau khi đăng xuất -> Bị chặn ngay lập tức
    const examDataAfterSignOut = authService.queryExams('00000000-0000-0000-0000-000000000001');
    expect(examDataAfterSignOut.data).toBeNull();
    expect(examDataAfterSignOut.error).toContain('Chưa đăng nhập');
  });
});
