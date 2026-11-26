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
  Library,
  ListChecks,
  PenLine,
  UsersRound,
  ShieldEllipsis,
  SlidersHorizontal,
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
  /** Nhóm hiển thị ở thanh bên trái (xem NHOM_DIEU_HUONG). */
  nhom: MaNhom;
  /** Tên ngắn khi nằm trong vùng 5 bước tạo đề. */
  tenNgan?: string;
  /** Nhóm thay thế khi người dùng không thấy nhóm chính (vd. tổ trưởng không thấy nhóm Quản trị). */
  nhomDuPhong?: MaNhom;
}

export type MaNhom = 'chinh' | 'tao-de' | 'nguon' | 'kho' | 'to-truong' | 'quan-tri';

export interface NhomDieuHuong {
  ma: MaNhom;
  ten: string;
  moTa: string;
  /** Trang gom chức năng của nhóm (nếu có). */
  trangGom?: string;
  /** Vai trò được thấy nhóm. Mục của nhóm bị ẩn sẽ dồn xuống nhóm "Khác". */
  vaiTro?: UserRole[];
}

export const VAI_TRO_TO_TRUONG: UserRole[] = ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'];
export const VAI_TRO_QUAN_TRI: UserRole[] = ['SCHOOL_ADMIN', 'SYSTEM_ADMIN'];

export const NHOM_DIEU_HUONG: NhomDieuHuong[] = [
  { ma: 'chinh', ten: 'Tổng quan', moTa: '' },
  { ma: 'tao-de', ten: 'Tạo đề kiểm tra', moTa: 'Làm lần lượt 5 bước' },
  { ma: 'nguon', ten: 'Nguồn chuyên môn', moTa: 'Chương trình, ma trận của tổ' },
  { ma: 'kho', ten: 'Kho', moTa: 'Câu hỏi, bài đọc' },
  { ma: 'to-truong', ten: 'Tổ trưởng', moTa: 'Việc của tổ trưởng, tổ phó', trangGom: '/to-truong', vaiTro: VAI_TRO_TO_TRUONG },
  { ma: 'quan-tri', ten: 'Quản trị', moTa: 'Trường, tài khoản, AI', trangGom: '/quan-tri', vaiTro: VAI_TRO_QUAN_TRI },
];

export const MAIN_NAVIGATION: NavItem[] = [
  {
    id: 'dashboard',
    nhom: 'chinh',
    title: 'Tổng quan',
    href: '/dashboard',
    iconName: 'LayoutDashboard',
    icon: LayoutDashboard,
    description: 'Bảng điều khiển hệ thống và tổng quan tiến độ',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN', 'SCHOOL_LEADERSHIP'],
  },
  {
    id: 'sources',
    nhom: 'nguon',
    title: 'Phân phối chương trình',
    href: '/sources',
    iconName: 'BookOpen',
    icon: BookOpen,
    description: 'Xem và nhập phân phối chương trình (tuần, bài, tiết) và YCCĐ từng môn',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'chuong-trinh',
    nhom: 'nguon',
    title: 'Kho chương trình GDPT 2018',
    href: '/chuong-trinh',
    iconName: 'Library',
    icon: Library,
    description: 'Nguồn chung lớp 1–5: tài liệu CT GDPT 2018, SGK, SGV và YCCĐ AI trích, chờ tổ trưởng duyệt',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'ma-tran-ca-nam',
    nhom: 'nguon',
    title: 'Ma trận nội dung cả năm',
    href: '/ma-tran-ca-nam',
    iconName: 'CalendarRange',
    icon: CalendarRange,
    description: 'Tải ma trận nội dung cả năm của từng môn (độ dài bài đọc, chủ điểm, YCCĐ theo kì)',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'ma-tran-chung',
    nhom: 'nguon',
    title: 'Ma trận chung',
    href: '/ma-tran-chung',
    iconName: 'Table2',
    icon: Table2,
    description: 'Tải ma trận chung của tổ theo môn và kì kiểm tra, có phiên bản và xác nhận',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'test-builder',
    nhom: 'tao-de', tenNgan: 'Thiết lập',
    title: '1. Thiết lập đề',
    href: '/test-builder',
    iconName: 'Sparkles',
    icon: Sparkles,
    description: 'Khởi tạo đề kiểm tra theo Chế độ A (Tạo mới) hoặc Chế độ B (Dùng lại đề)',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'matrices',
    nhom: 'tao-de', tenNgan: 'Ma trận riêng',
    title: '2. Ma trận riêng',
    href: '/matrices',
    iconName: 'Grid',
    icon: Grid,
    description: 'Bước 2: lập ma trận riêng từ ma trận chung của tổ, kiểm tra và xác nhận',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'dac-ta',
    nhom: 'tao-de', tenNgan: 'Bản đặc tả',
    title: '3. Bản đặc tả',
    href: '/dac-ta',
    iconName: 'ListChecks',
    icon: ListChecks,
    description: 'Bước 3: bản đặc tả từng câu (YCCĐ, mức, bài, tuần, trang SGK) kế thừa ma trận riêng đã xác nhận',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'tao-de',
    nhom: 'tao-de', tenNgan: 'Soạn đề',
    title: '4. Tạo đề',
    href: '/tao-de',
    iconName: 'PenLine',
    icon: PenLine,
    description: 'Bước 4: soạn nội dung từng câu theo đặc tả đã xác nhận, kiểm tra đề và xuất Word',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'tests',
    nhom: 'tao-de', tenNgan: 'Duyệt đề & kho đề',
    title: '5. Duyệt đề & kho đề',
    href: '/tests',
    iconName: 'FolderKanban',
    icon: FolderKanban,
    description: 'Kho đề, thẩm định, phê duyệt và kiểm định cả kho (khớp đặc tả, tổng điểm, câu trùng)',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN', 'SCHOOL_LEADERSHIP'],
  },
  {
    id: 'questions',
    nhom: 'kho',
    title: 'Ngân hàng câu hỏi',
    href: '/questions',
    iconName: 'FileQuestion',
    icon: FileQuestion,
    description: 'Quản lý ngân hàng câu hỏi đa phương tiện (Multimodal)',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'reading-passages',
    nhom: 'kho',
    title: 'Kho ngữ liệu Tiếng Việt',
    href: '/reading-passages',
    iconName: 'FileText',
    icon: FileText,
    description: 'Quản lý bài đọc hiểu/đọc thành tiếng, nguồn gốc tác giả và số tiếng',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'templates',
    nhom: 'to-truong',
    title: 'Mẫu đề & Định dạng',
    href: '/templates',
    iconName: 'FileSpreadsheet',
    icon: FileSpreadsheet,
    description: 'Quản lý mẫu in của tổ và định dạng xuất bản Word/PDF',
    allowedRoles: ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'bo-nao',
    nhom: 'to-truong',
    title: 'Bộ não chuyên môn',
    href: '/bo-nao',
    iconName: 'Brain',
    icon: Brain,
    description: 'Tải ma trận chung và quy định riêng của tổ để app dùng làm căn cứ',
    allowedRoles: ['GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'ai-settings',
    nhom: 'quan-tri',
    nhomDuPhong: 'to-truong',
    title: 'Cài đặt AI',
    href: '/ai-settings',
    iconName: 'Bot',
    icon: Bot,
    description: 'Khóa API dùng chung, danh sách model và model dùng cho từng việc',
    allowedRoles: ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'phan-quyen',
    nhom: 'quan-tri',
    nhomDuPhong: 'to-truong',
    title: 'Vai trò và ủy quyền',
    href: '/phan-quyen',
    iconName: 'Settings',
    icon: Settings,
    description: 'Cấp vai trò (tổ trưởng, Ban giám hiệu), ủy quyền thẩm định có thời hạn',
    allowedRoles: ['GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN', 'SCHOOL_LEADERSHIP'],
  },
  {
    id: 'settings',
    nhom: 'quan-tri',
    title: 'Cài đặt hệ thống',
    href: '/settings',
    iconName: 'SlidersHorizontal',
    icon: SlidersHorizontal,
    description: 'Cấu hình đơn vị trường, phân quyền giáo viên và tham số hệ thống',
    allowedRoles: ['TEACHER', 'GROUP_LEADER', 'DEPUTY_GROUP_LEADER', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'to-truong',
    nhom: 'to-truong',
    title: 'Trang tổ trưởng',
    href: '/to-truong',
    iconName: 'UsersRound',
    icon: UsersRound,
    description: 'Gom việc của tổ trưởng: ma trận chung, bộ não chuyên môn, mẫu đề, quyền giáo viên trong tổ',
    allowedRoles: VAI_TRO_TO_TRUONG,
  },
  {
    id: 'quan-tri',
    nhom: 'quan-tri',
    title: 'Trang quản trị',
    href: '/quan-tri',
    iconName: 'ShieldUser',
    icon: ShieldEllipsis,
    description: 'Gom việc quản trị: thông tin trường, năm học, tổ, tài khoản, vai trò, cài đặt AI',
    allowedRoles: VAI_TRO_QUAN_TRI,
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

/** Các nhóm và mục (đã lọc theo vai trò) để vẽ thanh bên trái. Mục thuộc nhóm bị ẩn dồn sang nhóm "Khác". */
export function getNavGroupsForRole(role: UserRole): { nhom: NhomDieuHuong; muc: NavItem[] }[] {
  const ds = getNavigationForRole(role);
  const thay = new Set(NHOM_DIEU_HUONG.filter((n) => !n.vaiTro || n.vaiTro.includes(role)).map((n) => n.ma));
  const nhomCua = (m: NavItem): MaNhom | null =>
    thay.has(m.nhom) ? m.nhom : m.nhomDuPhong && thay.has(m.nhomDuPhong) ? m.nhomDuPhong : null;
  const kq: { nhom: NhomDieuHuong; muc: NavItem[] }[] = [];
  for (const n of NHOM_DIEU_HUONG) {
    if (!thay.has(n.ma)) continue;
    const muc = ds.filter((m) => nhomCua(m) === n.ma)
      .sort((a, b) => Number(b.href === n.trangGom) - Number(a.href === n.trangGom));
    if (muc.length) kq.push({ nhom: n, muc });
  }
  const le = ds.filter((m) => nhomCua(m) === null);
  if (le.length) kq.push({ nhom: { ma: 'chinh', ten: 'Khác', moTa: '' }, muc: le });
  return kq;
}
