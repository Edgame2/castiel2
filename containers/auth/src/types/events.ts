/**
 * Event Type Definitions
 * 
 * Defines all event types for authentication module.
 * Events are published to RabbitMQ exchange 'coder_events' for other services to consume.
 */

/**
 * Base event structure
 */
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  version: string;
  source: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  data: any;
}

/**
 * Authentication Events
 */
export interface UserRegisteredEvent extends BaseEvent {
  type: 'auth.user.registered';
  data: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    provider: 'password' | 'google' | 'github' | 'azure_ad' | 'okta';
    tenantId?: string;
  };
}

export interface AuthLoginSuccessEvent extends BaseEvent {
  type: 'auth.login.success';
  data: {
    userId: string;
    sessionId: string;
    provider: 'password' | 'google' | 'github' | 'azure_ad' | 'okta';
    tenantId?: string;
    deviceName?: string;
    deviceType?: string;
    country?: string;
    city?: string;
  };
}

export interface AuthLoginFailedEvent extends BaseEvent {
  type: 'auth.login.failed';
  data: {
    userId?: string;
    email?: string;
    provider: 'password' | 'google' | 'github' | 'azure_ad' | 'okta';
    reason: 'user_not_found' | 'invalid_password' | 'account_deactivated' | 'account_locked' | 'no_password_set' | 'invalid_token' | 'other';
  };
}

export interface UserLoggedInEvent extends BaseEvent {
  type: 'auth.user.logged_in';
  data: {
    userId: string;
    sessionId: string;
    provider: 'password' | 'google' | 'github' | 'azure_ad' | 'okta';
    deviceName?: string;
    deviceType?: string;
    country?: string;
    city?: string;
  };
}

export interface UserLoggedOutEvent extends BaseEvent {
  type: 'auth.user.logged_out';
  data: {
    userId: string;
    sessionId: string;
    reason?: 'user_initiated' | 'session_expired' | 'admin_revoked';
  };
}

export interface UserEmailVerificationRequestedEvent extends BaseEvent {
  type: 'auth.user.email_verification_requested';
  data: {
    userId: string;
    email: string;
    verificationToken: string;
  };
}

export interface UserEmailVerifiedEvent extends BaseEvent {
  type: 'auth.user.email_verified';
  data: {
    userId: string;
    email: string;
  };
}

export interface UserPasswordChangedEvent extends BaseEvent {
  type: 'auth.user.password_changed';
  data: {
    userId: string;
    initiatedBy: 'user' | 'admin' | 'system';
  };
}

export interface UserPasswordResetRequestedEvent extends BaseEvent {
  type: 'auth.user.password_reset_requested';
  data: {
    userId: string;
    email: string;
  };
}

export interface UserPasswordResetSuccessEvent extends BaseEvent {
  type: 'auth.user.password_reset_success';
  data: {
    userId: string;
    email: string;
  };
}

export interface UserProviderLinkedEvent extends BaseEvent {
  type: 'auth.user.provider_linked';
  data: {
    userId: string;
    provider: 'google' | 'github' | 'azure_ad' | 'okta';
    providerUserId: string;
  };
}

export interface UserProviderUnlinkedEvent extends BaseEvent {
  type: 'auth.user.provider_unlinked';
  data: {
    userId: string;
    provider: 'google' | 'github' | 'azure_ad' | 'okta';
  };
}

export interface SessionRevokedEvent extends BaseEvent {
  type: 'auth.session.revoked';
  data: {
    userId: string;
    sessionId: string;
    reason: 'user_initiated' | 'admin_revoked' | 'security_breach' | 'device_change';
    revokedBy?: string;
  };
}

export interface SessionsBulkRevokedEvent extends BaseEvent {
  type: 'auth.sessions.bulk_revoked';
  data: {
    userId: string;
    sessionIds: string[];
    reason: 'user_initiated' | 'admin_revoked' | 'security_breach';
    revokedBy?: string;
  };
}

/**
 * Tenant SSO Events
 */
export interface TenantSSOConfiguredEvent extends BaseEvent {
  type: 'auth.tenant.sso_configured';
  data: {
    tenantId: string;
    provider: 'azure_ad' | 'okta';
    enabled: boolean;
    enforce: boolean;
    configuredBy: string;
  };
}

export interface TenantSSODisabledEvent extends BaseEvent {
  type: 'auth.tenant.sso_disabled';
  data: {
    tenantId: string;
    provider: 'azure_ad' | 'okta';
    disabledBy: string;
  };
}

/**
 * Union type of all authentication events
 */
export type AuthEvent =
  | UserRegisteredEvent
  | AuthLoginSuccessEvent
  | AuthLoginFailedEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | UserEmailVerificationRequestedEvent
  | UserEmailVerifiedEvent
  | UserPasswordChangedEvent
  | UserPasswordResetRequestedEvent
  | UserPasswordResetSuccessEvent
  | UserProviderLinkedEvent
  | UserProviderUnlinkedEvent
  | SessionRevokedEvent
  | SessionsBulkRevokedEvent
  | TenantSSOConfiguredEvent
  | TenantSSODisabledEvent;

