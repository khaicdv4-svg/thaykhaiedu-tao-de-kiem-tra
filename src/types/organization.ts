/**
 * ThayKhaiEdu - Organizational Data Models
 * Supports Multi-tenant Organizations, Academic Years, Grades, Professional Groups, and User Memberships.
 */

import { PrimaryGrade } from './curriculum';
import { UserRole } from './permissions';

export interface Organization {
  id: string;
  code: string;
  name: string;
  province: string;
  district: string;
  address?: string;
  logoUrl?: string;
  activeGrades: PrimaryGrade[]; // e.g. [1, 2, 3, 4, 5]
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  code: string; // e.g. '2025-2026'
  label: string; // e.g. 'Năm học 2025 - 2026'
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface ProfessionalGroup {
  id: string;
  organizationId: string;
  code: string; // e.g. 'TOGROUP_K4'
  name: string; // e.g. 'Tổ Chuyên môn Khối 4'
  description?: string;
  assignedGradeIds: PrimaryGrade[];
  assignedSubjectIds: string[];
  leaderUserId?: string;
  deputyLeaderUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalGroupMember {
  id: string;
  groupId: string;
  userId: string;
  roleInGroup: 'MEMBER' | 'DEPUTY_LEADER' | 'LEADER';
  joinedAt: string;
}

export interface AppUser {
  id: string;
  organizationId: string;
  organizationName?: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  assignedGradeIds: PrimaryGrade[];
  assignedSubjectIds: string[];
  professionalGroupIds: string[]; // List of group IDs the user belongs to
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
