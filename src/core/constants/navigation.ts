/**
 * ThayKhaiEdu - Navigation Structure & Route Definitions
 * Core Business Modules for Primary Education Test Creation System
 */

import {
  LayoutDashboard,
  BookOpen,
  Grid,
  FileQuestion,
  Sparkles,
  FileText,
  ShieldCheck,
  FolderKanban,
  FileSpreadsheet,
  Settings,
  Bot,
  Brain,
  CalendarRange,
  Table2,
} from 'lucide-react';
import { UserRole } from '@/types/permissions';

export interface NavItem {
  id: string;
  title: string;
  href: string;
  iconName: string;
  icon: typeof LayoutDashboard;
  description: string;
  badge?: string;
  allowedRoles?: UserRole[];
}

export const MAIN_NAVIGATION: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Tổng quan',
    href: '/dashboard',
    iconName: 'LayoutDashboard',
    icon: LayoutDashboard,
    description: 'Bảng điều khiển hệ thống và tổng quan tiến độ',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'sources',
    title: 'Phân phối chương trình',
    href: '/sources',
    iconName: 'BookOpen',
    icon: BookOpen,
    description: 'Xem và nhập phân phối chương trình (tuần, bài, tiết) và YCCĐ từng môn',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'ma-tran-ca-nam',
    title: 'Ma trận nội dung cả năm',
    href: '/ma-tran-ca-nam',
    iconName: 'CalendarRange',
    icon: CalendarRange,
    description: 'Tải ma trận nội dung cả năm của từng môn (độ dài bài đọc, chủ điểm, YCCĐ theo kì)',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'ma-tran-chung',
    title: 'Ma trận chung',
    href: '/ma-tran-chung',
    iconName: 'Table2',
    icon: Table2,
    description: 'Tải ma trận chung của tổ theo môn và kì kiểm tra, có phiên bản và xác nhận',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'matrices',
    title: 'Ma trận riêng & Đặc tả',
    href: '/matrices',
    iconName: 'Grid',
    icon: Grid,
    description: 'Thiết lập ma trận khung 3 mức độ nhận thức và đặc tả đề kiểm tra',
    allowedRoles: ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'questions',
    title: 'Ngân hàng câu hỏi',
    href: '/questions',
    iconName: 'FileQuestion',
    icon: FileQuestion,
    description: 'Quản lý ngân hàng câu hỏi đa phương tiện (Multimodal)',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'reading-passages',
    title: 'Kho ngữ liệu Tiếng Việt',
    href: '/reading-passages',
    iconName: 'FileText',
    icon: FileText,
    description: 'Quản lý bài đọc hiểu/đọc thành tiếng, nguồn gốc tác giả và số tiếng',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'test-builder',
    title: 'Xưởng tạo đề',
    href: '/test-builder',
    iconName: 'Sparkles',
    icon: Sparkles,
    badge: 'Chế độ A/B',
    description: 'Khởi tạo đề kiểm tra theo Chế độ A (Tạo mới) hoặc Chế độ B (Dùng lại đề)',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'validation',
    title: 'Kiểm định đề',
    href: '/validation',
    iconName: 'ShieldCheck',
    icon: ShieldCheck,
    description: 'Kiểm tra độc lập độ phủ ma trận, tổng điểm và lỗi kỹ thuật',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'tests',
    title: 'Kho đề kiểm tra',
    href: '/tests',
    iconName: 'FolderKanban',
    icon: FolderKanban,
    description: 'Quản lý vòng đời đề kiểm tra, kiểm tra chéo và phê duyệt',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'templates',
    title: 'Mẫu đề & Định dạng',
    href: '/templates',
    iconName: 'FileSpreadsheet',
    icon: FileSpreadsheet,
    description: 'Quản lý mẫu in của tổ khối 4 và định dạng xuất bản Word/PDF',
    allowedRoles: ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'settings',
    title: 'Cài đặt hệ thống',
    href: '/settings',
    iconName: 'Settings',
    icon: Settings,
    description: 'Cấu hình đơn vị trường, phân quyền giáo viên và tham số hệ thống',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'bo-nao',
    title: 'Bộ não chuyên môn',
    href: '/bo-nao',
    iconName: 'Brain',
    icon: Brain,
    description: 'Tải ma trận chung và quy định riêng của tổ để app dùng làm căn cứ',
    allowedRoles: ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'ai-settings',
    title: 'Cài đặt AI',
    href: '/ai-settings',
    iconName: 'Bot',
    icon: Bot,
    description: 'Khóa API dùng chung, danh sách model và model dùng cho từng việc',
    allowedRoles: ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
];

/**
 * Filter navigation items dynamically based on user role
 */
export function getNavigationForRole(role: UserRole): NavItem[] {
  return MAIN_NAVIGATION.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role)
  );
}
