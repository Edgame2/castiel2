export enum TenantInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export interface TenantInvitationAudit {
  issuerIp?: string;
  issuerUserAgent?: string;
  lastReminderIp?: string;
  lastReminderUserAgent?: string;
  decisionIp?: string;
  decisionUserAgent?: string;
  decisionMetadata?: Record<string, any>;
}

export interface TenantInvitationDocument {
  id: string;
  tenantId: string;
  email: string;
  token: string;
  inviterUserId: string;
  status: TenantInvitationStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
  expiresAt: string;
  reminderSentAt?: string;
  roles?: string[];
  rolesPreset?: string;
  audit?: TenantInvitationAudit;
  decisionBy?: string;
  decisionAt?: string;
  metadata?: Record<string, any>;
  partitionKey: string;
}

export interface CreateTenantInvitationInput {
  tenantId: string;
  email: string;
  inviterUserId: string;
  expiresAt?: string;
  message?: string;
  roles?: string[];
  rolesPreset?: string;
  audit?: TenantInvitationAudit;
}

export interface TenantInvitationResponse {
  id: string;
  tenantId: string;
  email: string;
  status: TenantInvitationStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
  expiresAt: string;
  reminderSentAt?: string;
  roles?: string[];
  rolesPreset?: string;
  decisionBy?: string;
  decisionAt?: string;
  token?: string;
}

export interface TenantInvitationPreview {
  id: string;
  tenantId: string;
  tenantName?: string;
  email: string;
  status: TenantInvitationStatus;
  message?: string;
  expiresAt: string;
  issuedAt: string;
  issuerUserId: string;
  issuerDisplayName?: string;
  roles?: string[];
  rolesPreset?: string;
  isExpired: boolean;
  isRedeemable: boolean;
}

export interface TenantInvitationLifecycleResult {
  reminders: TenantInvitationDocument[];
  expired: TenantInvitationDocument[];
}
