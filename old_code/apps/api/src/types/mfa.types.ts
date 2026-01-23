/**
 * Multi-Factor Authentication Types
 * 
 * Comprehensive type definitions for MFA functionality including:
 * - TOTP (Time-based One-Time Password) via authenticator apps
 * - SMS OTP (One-Time Password via text message)
 * - Email OTP (One-Time Password via email)
 * - Recovery codes (backup codes for account recovery)
 * - Trusted devices (remember this device)
 */

/**
 * Supported MFA method types
 */
export type MFAMethodType = 'totp' | 'sms' | 'email';

/**
 * MFA enforcement levels for tenant policies
 */
export type MFAEnforcementLevel = 'off' | 'optional' | 'required';

/**
 * MFA method status
 */
export type MFAMethodStatus = 'pending' | 'active' | 'disabled';

/**
 * Individual MFA method configuration for a user
 */
export interface MFAMethod {
  /** Method type */
  type: MFAMethodType;
  
  /** Current status of this method */
  status: MFAMethodStatus;
  
  /** When the method was enrolled */
  enrolledAt: Date;
  
  /** When the enrollment was verified/activated */
  verifiedAt?: Date;
  
  /** Last time this method was used successfully */
  lastUsedAt?: Date;
  
  /** Encrypted secret (for TOTP) */
  secret?: string;
  
  /** Phone number (for SMS, last 4 digits visible) */
  phoneNumber?: string;
  
  /** Email address (for Email OTP) */
  email?: string;
  
  /** Backup codes remaining count */
  backupCodesRemaining?: number;
}

/**
 * Recovery code for account access when MFA is unavailable
 */
export interface MFARecoveryCode {
  /** Hashed recovery code */
  codeHash: string;
  
  /** Whether this code has been used */
  used: boolean;
  
  /** When the code was used (if used) */
  usedAt?: Date;
  
  /** When the code was created */
  createdAt: Date;
}

/**
 * Trusted device for "Remember this device" functionality
 */
export interface TrustedDevice {
  /** Unique device fingerprint */
  fingerprint: string;
  
  /** Device name/description */
  name?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** IP address when device was trusted */
  ipAddress?: string;
  
  /** When device was marked as trusted */
  createdAt: Date;
  
  /** Last time this device was seen */
  lastSeenAt: Date;
  
  /** When the trust expires (typically 30 days) */
  expiresAt: Date;
}

/**
 * Tenant-level MFA policy configuration
 */
export interface MFAPolicy {
  /** Tenant ID */
  tenantId: string;
  
  /** MFA enforcement level */
  enforcement: MFAEnforcementLevel;
  
  /** Grace period in days for users to enable MFA when required */
  gracePeriodDays?: number;
  
  /** Allowed MFA methods for this tenant */
  allowedMethods: MFAMethodType[];
  
  /** When the policy was last updated */
  updatedAt: Date;
  
  /** Who updated the policy */
  updatedBy?: string;
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

/**
 * Request to enroll TOTP (authenticator app)
 */
export interface EnrollTOTPRequest {
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
}

/**
 * Response with TOTP enrollment details
 */
export interface EnrollTOTPResponse {
  /** Base32 encoded secret (to be stored by user in authenticator app) */
  secret: string;
  
  /** QR code as data URL for easy scanning */
  qrCodeDataUrl: string;
  
  /** Manual entry code (formatted for easier typing) */
  manualEntryCode: string;
  
  /** OTPAuth URL */
  otpauthUrl: string;
  
  /** Temporary enrollment token (expires in 10 minutes) */
  enrollmentToken: string;
}

/**
 * Request to verify TOTP enrollment
 */
export interface VerifyTOTPRequest {
  /** Enrollment token from enrollment response */
  enrollmentToken: string;
  
  /** 6-digit code from authenticator app */
  code: string;
  
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
}

/**
 * Request to enroll SMS OTP
 */
export interface EnrollSMSRequest {
  /** Phone number in E.164 format (e.g., +14155552671) */
  phoneNumber: string;
  
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
}

/**
 * Response after SMS enrollment initiation
 */
export interface EnrollSMSResponse {
  /** Masked phone number (e.g., +1***555**71) */
  maskedPhoneNumber: string;
  
  /** Temporary enrollment token */
  enrollmentToken: string;
  
  /** Code expiration time in seconds */
  expiresInSeconds: number;
}

/**
 * Request to verify SMS enrollment
 */
export interface VerifySMSRequest {
  /** Enrollment token */
  enrollmentToken: string;
  
  /** 6-digit code sent via SMS */
  code: string;
  
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
}

/**
 * Request to enroll Email OTP
 */
export interface EnrollEmailRequest {
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
}

/**
 * Response after Email OTP enrollment initiation
 */
export interface EnrollEmailResponse {
  /** Masked email (e.g., j***@example.com) */
  maskedEmail: string;
  
  /** Temporary enrollment token */
  enrollmentToken: string;
  
  /** Code expiration time in seconds */
  expiresInSeconds: number;
}

/**
 * Request to verify Email OTP enrollment
 */
export interface VerifyEmailRequest {
  /** Enrollment token */
  enrollmentToken: string;
  
  /** 6-digit code sent via email */
  code: string;
  
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
}

/**
 * Common enrollment verification response
 */
export interface MFAEnrollmentVerificationResponse {
  /** Whether verification was successful */
  success: boolean;
  
  /** The enrolled MFA method */
  method: MFAMethod;
  
  /** Recovery codes (only provided on first TOTP enrollment) */
  recoveryCodes?: string[];
  
  /** Message */
  message: string;
}

/**
 * Request to complete MFA challenge during login
 */
export interface MFAChallengeRequest {
  /** Partial auth token from initial login */
  challengeToken: string;
  
  /** MFA method to use for verification */
  method: MFAMethodType | 'recovery';
  
  /** The code or recovery code */
  code: string;
  
  /** Whether to trust this device */
  trustDevice?: boolean;
  
  /** Device fingerprint (if trustDevice is true) */
  deviceFingerprint?: string;
}

/**
 * Response after successful MFA challenge
 */
export interface MFAChallengeResponse {
  /** Full access token */
  accessToken: string;
  
  /** Refresh token */
  refreshToken: string;
  
  /** Token expiration time */
  expiresIn: string;
  
  /** User information */
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    tenantId: string;
  };
}

/**
 * Request to disable an MFA method
 */
export interface DisableMFAMethodRequest {
  /** Method type to disable */
  method: MFAMethodType;
  
  /** Current password for security (or code from another MFA method) */
  password?: string;
  
  /** Code from another active MFA method */
  mfaCode?: string;
  
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
}

/**
 * Response listing user's MFA methods
 */
export interface ListMFAMethodsResponse {
  /** Array of enrolled methods (secrets redacted) */
  methods: Array<{
    type: MFAMethodType;
    status: MFAMethodStatus;
    enrolledAt: Date;
    lastUsedAt?: Date;
    maskedInfo?: string; // e.g., "+1***555**71" for SMS
  }>;
  
  /** Whether user has any active MFA methods */
  hasActiveMFA: boolean;
  
  /** Number of unused recovery codes */
  recoveryCodesRemaining: number;
}

/**
 * Request to generate recovery codes
 */
export interface GenerateRecoveryCodesRequest {
  /** User ID (from auth context) */
  userId: string;
  
  /** Tenant ID (from auth context) */
  tenantId: string;
  
  /** Password or MFA code for verification */
  password?: string;
  mfaCode?: string;
}

/**
 * Response with recovery codes
 */
export interface GenerateRecoveryCodesResponse {
  /** Array of recovery codes (displayed only once) */
  recoveryCodes: string[];
  
  /** When these codes were generated */
  generatedAt: Date;
  
  /** Warning message */
  message: string;
}

/**
 * Request to verify recovery code
 */
export interface VerifyRecoveryCodeRequest {
  /** Partial auth token from login challenge */
  challengeToken: string;
  
  /** Recovery code */
  code: string;
}

/**
 * Request to update tenant MFA policy
 */
export interface UpdateMFAPolicyRequest {
  /** Tenant ID */
  tenantId: string;
  
  /** MFA enforcement level */
  enforcement?: MFAEnforcementLevel;
  
  /** Grace period in days */
  gracePeriodDays?: number;
  
  /** Allowed MFA methods */
  allowedMethods?: MFAMethodType[];
  
  /** Admin user ID making the change */
  updatedBy: string;
}

/**
 * Response with MFA policy
 */
export interface MFAPolicyResponse {
  policy: MFAPolicy;
}

/**
 * MFA enrollment state stored temporarily in Redis
 */
export interface MFAEnrollmentState {
  /** User ID */
  userId: string;
  
  /** Tenant ID */
  tenantId: string;
  
  /** Method being enrolled */
  method: MFAMethodType;
  
  /** Encrypted secret (for TOTP) */
  secret?: string;
  
  /** Phone number (for SMS) */
  phoneNumber?: string;
  
  /** Email (for Email OTP) */
  email?: string;
  
  /** Generated OTP (for SMS/Email verification) */
  otp?: string;
  
  /** When this enrollment state expires */
  expiresAt: Date;
  
  /** Number of verification attempts */
  attempts: number;
}

/**
 * Partial auth token payload for MFA challenge
 */
export interface MFAChallengeToken {
  /** User ID */
  sub: string;
  
  /** Email */
  email: string;
  
  /** Tenant ID */
  tenantId: string;
  
  /** Token type */
  type: 'mfa_challenge';
  
  /** Available MFA methods for this user */
  availableMethods: MFAMethodType[];
  
  /** Whether user has recovery codes */
  hasRecoveryCodes: boolean;
  
  /** When challenge token was issued */
  iat: number;
  
  /** Challenge token expiration (5 minutes) */
  exp: number;
}
