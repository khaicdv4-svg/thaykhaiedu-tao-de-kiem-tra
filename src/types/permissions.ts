/**
 * ThayKhaiEdu - Role-Based Access Control (RBAC) & Data Scopes
 * Permission-based architecture for flexible access control across schools and groups.
 */

export type UserRole =
  | 'TEACHER'
  | 'GROUP_LEADER'
  | 'DEPUTY_GROUP_LEADER'
  | 'SCHOOL_ADMIN'
  | 'SCHOOL_LEADERSHIP'
  | 'SYSTEM_ADMIN';

export type SystemPermission =
  | 'CREATE_TEST'
  | 'EDIT_OWN_TEST'
  | 'SUBMIT_TEST'
  | 'CROSS_REVIEW_TEST'
  | 'REQUEST_REVISION'
  | 'APPROVE_TEST'
  | 'LOCK_TEST'
  | 'VIEW_GROUP_TESTS'
  | 'MANAGE_GROUP'
  | 'MANAGE_TEMPLATES'
  | 'MANAGE_SOURCES'
  | 'MANAGE_USERS';

export type DataScope =
  | 'PRIVATE'          // Kho cá nhân (Chỉ người tạo có quyền)
  | 'GROUP'            // Kho tổ chuyên môn (Chia sẻ trong tổ)
  | 'SCHOOL'           // Kho trường (Thuộc đơn vị trường học)
  | 'SHARED_LIBRARY'   // Kho dùng chung (Được cấp phép chia sẻ rộng rãi)
  | 'SYSTEM';          // Kho hệ thống (Do hệ thống quản trị)

/**
 * Mapping of Roles to Permission Sets
 * Permission-based model allows adding/modifying capabilities without refactoring core business logic.
 */
export const ROLE_PERMISSIONS: Record<UserRole, SystemPermission[]> = {
  SCHOOL_LEADERSHIP: ['REQUEST_REVISION', 'APPROVE_TEST', 'LOCK_TEST', 'VIEW_GROUP_TESTS'],
  TEACHER: [
    'CREATE_TEST',
    'EDIT_OWN_TEST',
    'SUBMIT_TEST',
    'CROSS_REVIEW_TEST',
    'REQUEST_REVISION',
    'VIEW_GROUP_TESTS',
  ],
  DEPUTY_GROUP_LEADER: [
    'CREATE_TEST',
    'EDIT_OWN_TEST',
    'SUBMIT_TEST',
    'CROSS_REVIEW_TEST',
    'REQUEST_REVISION',
    'APPROVE_TEST',
    'VIEW_GROUP_TESTS',
    'MANAGE_TEMPLATES',
    'MANAGE_SOURCES',
  ],
  GROUP_LEADER: [
    'CREATE_TEST',
    'EDIT_OWN_TEST',
    'SUBMIT_TEST',
    'CROSS_REVIEW_TEST',
    'REQUEST_REVISION',
    'APPROVE_TEST',
    'LOCK_TEST',
    'VIEW_GROUP_TESTS',
    'MANAGE_GROUP',
    'MANAGE_TEMPLATES',
    'MANAGE_SOURCES',
  ],
  SCHOOL_ADMIN: [
    'CREATE_TEST',
    'EDIT_OWN_TEST',
    'SUBMIT_TEST',
    'CROSS_REVIEW_TEST',
    'REQUEST_REVISION',
    'APPROVE_TEST',
    'LOCK_TEST',
    'VIEW_GROUP_TESTS',
    'MANAGE_GROUP',
    'MANAGE_TEMPLATES',
    'MANAGE_SOURCES',
    'MANAGE_USERS',
  ],
  SYSTEM_ADMIN: [
    'CREATE_TEST',
    'EDIT_OWN_TEST',
    'SUBMIT_TEST',
    'CROSS_REVIEW_TEST',
    'REQUEST_REVISION',
    'APPROVE_TEST',
    'LOCK_TEST',
    'VIEW_GROUP_TESTS',
    'MANAGE_GROUP',
    'MANAGE_TEMPLATES',
    'MANAGE_SOURCES',
    'MANAGE_USERS',
  ],
};

/**
 * Helper function to verify permissions for a given role
 */
export function hasPermission(role: UserRole, permission: SystemPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Helper to check if a user can access an item based on its DataScope and user membership
 */
export function canAccessScope(
  itemScope: DataScope,
  itemOwnerId: string,
  itemOrgId: string,
  itemGroupIds: string[],
  userContext: {
    userId: string;
    organizationId: string;
    professionalGroupIds: string[];
    role: UserRole;
  }
): boolean {
  if (userContext.role === 'SYSTEM_ADMIN') return true;

  switch (itemScope) {
    case 'PRIVATE':
      return itemOwnerId === userContext.userId;

    case 'GROUP':
      if (itemOwnerId === userContext.userId) return true;
      if (itemOrgId !== userContext.organizationId) return false;
      return itemGroupIds.some((gId) => userContext.professionalGroupIds.includes(gId));

    case 'SCHOOL':
      return itemOrgId === userContext.organizationId;

    case 'SHARED_LIBRARY':
      return true; // Library items accessible across schools once published

    case 'SYSTEM':
      return true; // System default items are read-accessible to all users

    default:
      return false;
  }
}
