/**
 * User related types
 */

/**
 * MFA method type
 */
export type MFAMethodType = 'totp' | 'sms' | 'email';

/**
 * MFA method status
 */
export type MFAMethodStatus = 'pending' | 'active' | 'disabled';

/**
 * Individual MFA method configuration
 */
export interface MFAMethod {
  type: MFAMethodType;
  status: MFAMethodStatus;
  enrolledAt: Date;
  verifiedAt?: Date;
  lastUsedAt?: Date;
  secret?: string; // Encrypted TOTP secret
  phoneNumber?: string; // For SMS (last 4 digits visible)
  email?: string; // For Email OTP
}

/**
 * MFA recovery code
 */
export interface MFARecoveryCode {
  codeHash: string;
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
}

/**
 * Trusted device for "Remember this device"
 */
export interface TrustedDevice {
  fingerprint: string;
  name?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash?: string;
  providers: UserProvider[];
  organizationId?: string;
  roles: string[];
  metadata: Record<string, unknown>;
  
  // MFA fields
  mfaMethods?: MFAMethod[];
  mfaRecoveryCodes?: MFARecoveryCode[];
  trustedDevices?: TrustedDevice[];
  mfaEnforcedAt?: Date; // When MFA became required for this user
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProvider {
  provider: 'google' | 'github' | 'azure-ad' | 'okta' | 'email';
  providerId: string;
  email: string;
}

/**
 * Tenant/Organization types
 */

/**
 * MFA enforcement level
 */
export type MFAEnforcementLevel = 'off' | 'optional' | 'required';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
  auth?: {
    mfaRequired?: boolean; // Deprecated: use mfaPolicy.enforcement instead
    sessionDuration?: number; // Session duration in seconds (default: 900 = 15 min)
  };
  mfaPolicy?: {
    enforcement: MFAEnforcementLevel;
    gracePeriodDays?: number;
    allowedMethods: MFAMethodType[];
  };
  security?: {
    // Session idle timeout in minutes (0 = no timeout, default: 30)
    sessionIdleTimeoutMinutes?: number;
    // Maximum concurrent sessions per user (0 = unlimited, default: 5)
    maxConcurrentSessions?: number;
    // Require re-authentication after idle timeout
    requireReauthOnIdle?: boolean;
    // IP allowlist (enterprise feature)
    ipAllowlist?: string[];
    // IP allowlist enabled
    ipAllowlistEnabled?: boolean;
  };
}

/**
 * JWT Payload types
 */
export interface JWTPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  roles: string[];
  sessionId?: string;
  iat: number;
  exp: number;
  jti?: string;
}
