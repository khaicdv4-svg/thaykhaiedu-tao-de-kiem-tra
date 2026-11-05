/**
 * ThayKhaiEdu - Auth Service Interface
 * Prepared for Supabase Auth integration.
 */

import { UserProfile, UserRole } from '@/types';

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  expiresAt: number;
}

export interface IAuthService {
  getCurrentSession(): Promise<AuthSession | null>;
  loginWithEmail(email: string): Promise<{ success: boolean; error?: string }>;
  logout(): Promise<void>;
  hasPermission(requiredRole: UserRole): Promise<boolean>;
}
