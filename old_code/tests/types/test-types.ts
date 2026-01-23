/**
 * Type definitions for test suite
 */

export interface RegisterRequest {
  email: string;
  password: string;
  tenantId?: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
  deviceFingerprint?: string;
  rememberDevice?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    status: string;
  };
  requiresMFA?: boolean;
  challengeToken?: string;
  availableMethods?: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface ForgotPasswordRequest {
  email: string;
  tenantId?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  tenantId?: string;
}

export interface VerifyEmailRequest {
  token: string;
  tenantId?: string;
}

export interface RevokeTokenRequest {
  token: string;
}

export interface IntrospectTokenRequest {
  token: string;
}

export interface IntrospectTokenResponse {
  active: boolean;
  sub?: string;
  email?: string;
  tenantId?: string;
  exp?: number;
  iat?: number;
  scope?: string;
  clientId?: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  status: UserStatus;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
  details?: any;
}

export interface SuccessResponse {
  message: string;
  data?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  role?: string;
  type: 'access' | 'refresh' | 'mfa_challenge';
  iat: number;
  exp: number;
}
