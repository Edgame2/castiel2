import type { FastifyRequest } from 'fastify';

/**
 * MFA Method information
 */
export interface MFAMethod {
  id: string;
  type: 'totp' | 'sms' | 'email';
  status: 'active' | 'pending' | 'disabled';
  createdAt?: string;
  lastUsedAt?: string;
}

/**
 * User information from JWT token
 */
export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
  organizationId?: string;
  sessionId?: string;
  isDefaultTenant?: boolean;
  mfaMethods?: MFAMethod[];
  iat?: number;
  exp?: number;
}

/**
 * Extended FastifyRequest with user information
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
  organizationId?: string;
  sessionId?: string;
  isDefaultTenant?: boolean;
  type: 'access' | 'refresh' | 'mfa_challenge';
  role?: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  user?: AuthUser;
  error?: string;
  cached?: boolean;
}
