import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canAccessScope,
  ROLE_PERMISSIONS,
  UserRole,
  SystemPermission,
} from '../src/types/permissions';

describe('Role-Based Access Control (RBAC) & Scope Verification', () => {
  it('correctly maps permissions for TEACHER', () => {
    // Teachers have creation and own test editing permissions
    expect(hasPermission('TEACHER', 'CREATE_TEST')).toBe(true);
    expect(hasPermission('TEACHER', 'EDIT_OWN_TEST')).toBe(true);
    expect(hasPermission('TEACHER', 'SUBMIT_TEST')).toBe(true);
    expect(hasPermission('TEACHER', 'CROSS_REVIEW_TEST')).toBe(true);

    // Teachers CANNOT approve or lock tests, or manage users
    expect(hasPermission('TEACHER', 'APPROVE_TEST')).toBe(false);
    expect(hasPermission('TEACHER', 'LOCK_TEST')).toBe(false);
    expect(hasPermission('TEACHER', 'MANAGE_USERS')).toBe(false);
    expect(hasPermission('TEACHER', 'MANAGE_GROUP')).toBe(false);
  });

  it('correctly maps permissions for GROUP_LEADER (Tổ trưởng)', () => {
    // Group leaders can manage groups, templates, approve and lock
    expect(hasPermission('GROUP_LEADER', 'CREATE_TEST')).toBe(true);
    expect(hasPermission('GROUP_LEADER', 'APPROVE_TEST')).toBe(true);
    expect(hasPermission('GROUP_LEADER', 'LOCK_TEST')).toBe(true);
    expect(hasPermission('GROUP_LEADER', 'MANAGE_GROUP')).toBe(true);
    expect(hasPermission('GROUP_LEADER', 'MANAGE_TEMPLATES')).toBe(true);

    // Group leader cannot manage system users
    expect(hasPermission('GROUP_LEADER', 'MANAGE_USERS')).toBe(false);
  });

  it('correctly maps permissions for SCHOOL_ADMIN (Ban giám hiệu)', () => {
    expect(hasPermission('SCHOOL_ADMIN', 'APPROVE_TEST')).toBe(true);
    expect(hasPermission('SCHOOL_ADMIN', 'LOCK_TEST')).toBe(true);
    expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_USERS')).toBe(true);
  });

  it('correctly verifies data scope access', () => {
    const userA = {
      userId: 'user-gv-a',
      organizationId: 'org-school-1',
      professionalGroupIds: ['group-k4'],
      role: 'TEACHER' as UserRole,
    };

    const userB = {
      userId: 'user-gv-b',
      organizationId: 'org-school-1',
      professionalGroupIds: ['group-k4'],
      role: 'TEACHER' as UserRole,
    };

    const userFromOtherSchool = {
      userId: 'user-gv-other',
      organizationId: 'org-school-2',
      professionalGroupIds: ['group-k4'],
      role: 'TEACHER' as UserRole,
    };

    // PRIVATE: Only owner can access
    expect(canAccessScope('PRIVATE', 'user-gv-a', 'org-school-1', ['group-k4'], userA)).toBe(true);
    expect(canAccessScope('PRIVATE', 'user-gv-a', 'org-school-1', ['group-k4'], userB)).toBe(false);

    // GROUP: Same group in same school can access
    expect(canAccessScope('GROUP', 'user-gv-a', 'org-school-1', ['group-k4'], userB)).toBe(true);
    expect(canAccessScope('GROUP', 'user-gv-a', 'org-school-1', ['group-k5'], userB)).toBe(false);
    expect(canAccessScope('GROUP', 'user-gv-a', 'org-school-1', ['group-k4'], userFromOtherSchool)).toBe(false);

    // SCHOOL: Users in same school can access, users from other school cannot
    expect(canAccessScope('SCHOOL', 'user-gv-a', 'org-school-1', [], userB)).toBe(true);
    expect(canAccessScope('SCHOOL', 'user-gv-a', 'org-school-1', [], userFromOtherSchool)).toBe(false);

    // SHARED_LIBRARY & SYSTEM: Accessible to all schools
    expect(canAccessScope('SHARED_LIBRARY', 'author-id', 'org-school-1', [], userFromOtherSchool)).toBe(true);
    expect(canAccessScope('SYSTEM', 'sys-admin', 'org-sys', [], userFromOtherSchool)).toBe(true);
  });
});
