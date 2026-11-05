/**
 * ThayKhaiEdu - Multi-tenant & Multi-school Data Models
 * Designed to support scalable deployment across multiple primary schools in Vietnam.
 */

import { UserRole } from './permissions';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  domain?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface School {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  province: string;
  district: string;
  address?: string;
  activeGrades: number[]; // e.g. [1, 2, 3, 4, 5]
  activeSubjectIds: string[]; // List of subject IDs enabled for periodic assessment
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  schoolId: string;
  schoolName?: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  assignedGradeIds: number[];
  assignedSubjectIds: string[];
  createdAt: string;
}
