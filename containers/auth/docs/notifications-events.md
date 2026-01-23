# Authentication Module - Notifications Events

## Overview

This document describes all events published by the Authentication module that trigger notifications to users via the Notification service.

## Published Events

### user.registered

**Description**: Emitted when a new user account is created. Triggers welcome email notification.

**Triggered When**: 
- User registers with email/password
- User signs in with OAuth for the first time (account auto-created)
- User account is created via invitation acceptance

**Event Type**: `user.registered`

**Notification Triggered**: Welcome email

**Event Schema**: See [logs-events.md](./logs-events.md#userregistered) for complete schema.

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "user.registered",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "provider": "google"
  }
}
```

---

### auth.login.success

**Description**: Emitted when a user successfully authenticates. Can trigger security notification if login is from new device/location.

**Triggered When**: 
- User successfully logs in with email/password
- User successfully authenticates via OAuth
- User successfully authenticates via SAML/SSO

**Event Type**: `auth.login.success`

**Notification Triggered**: 
- New device login alert (if device is new)
- New location login alert (if location is new)
- Security notification (configurable)

**Event Schema**: See [logs-events.md](./logs-events.md#authloginsuccess) for complete schema.

---

### auth.login.failed

**Description**: Emitted when a login attempt fails. Can trigger security alert if multiple failures.

**Triggered When**: 
- Invalid email/password combination
- User account not found
- Account is locked or deactivated
- OAuth/SAML authentication fails

**Event Type**: `auth.login.failed`

**Notification Triggered**: 
- Account lockout warning (if account is locked after multiple failures)
- Security alert (if suspicious activity detected)

**Event Schema**: See [logs-events.md](./logs-events.md#authloginfailed) for complete schema.

---

### user.password_reset_requested

**Description**: Emitted when a user requests a password reset. Triggers password reset email.

**Triggered When**: 
- User clicks "Forgot Password" and enters email
- Password reset email is sent

**Event Type**: `user.password_reset_requested`

**Notification Triggered**: Password reset email with reset link

**Event Schema**: See [logs-events.md](./logs-events.md#userpasswordresetrequested) for complete schema.

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "user.password_reset_requested",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth-service",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "user@example.com",
    "resetToken": "abc123def456..."
  }
}
```

**Note**: The `resetToken` in the event data should be used to construct the password reset URL.

---

### user.password_reset_success

**Description**: Emitted when a user successfully resets their password. Triggers confirmation email.

**Triggered When**: 
- User successfully completes password reset flow with valid token

**Event Type**: `user.password_reset_success`

**Notification Triggered**: Password reset confirmation email

**Event Schema**: See [logs-events.md](./logs-events.md#userpasswordresetsuccess) for complete schema.

---

### user.password_changed

**Description**: Emitted when a user changes their password. Triggers security notification.

**Triggered When**: 
- User changes password via change password flow
- Admin resets user password
- System forces password change

**Event Type**: `user.password_changed`

**Notification Triggered**: 
- Password change confirmation email
- Security alert (if changed by admin or system)

**Event Schema**: See [logs-events.md](./logs-events.md#userpasswordchanged) for complete schema.

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "user.password_changed",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "initiatedBy": "user"
  }
}
```

---

### user.email_verification_requested

**Description**: Emitted when a user requests email verification. Triggers verification email.

**Triggered When**: 
- User registers and needs to verify email
- User requests resend of verification email

**Event Type**: `user.email_verification_requested`

**Notification Triggered**: Email verification email with verification link

**Event Schema**: See [logs-events.md](./logs-events.md#useremailverificationrequested) for complete schema.

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "user.email_verification_requested",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth-service",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "user@example.com",
    "verificationToken": "abc123def456..."
  }
}
```

**Note**: The `verificationToken` in the event data should be used to construct the email verification URL.

---

### user.email_verified

**Description**: Emitted when a user verifies their email address. Triggers welcome/verification confirmation.

**Triggered When**: 
- User clicks email verification link
- Email verification token is validated

**Event Type**: `user.email_verified`

**Notification Triggered**: Email verification confirmation

**Event Schema**: See [logs-events.md](./logs-events.md#useremailverified) for complete schema.

---

### session.revoked

**Description**: Emitted when a user session is revoked. Triggers security notification.

**Triggered When**: 
- User revokes a specific session
- Admin revokes a user session
- Session is revoked due to security breach
- Session is revoked due to device change

**Event Type**: `session.revoked`

**Notification Triggered**: 
- Session revoked notification (if revoked by admin or security breach)
- Security alert

**Event Schema**: See [logs-events.md](./logs-events.md#sessionrevoked) for complete schema.

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "session.revoked",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "sessionId": "sess_12345678-1234-1234-1234-123456789abc",
    "reason": "admin_revoked",
    "revokedBy": "admin_12345678-1234-1234-1234-123456789abc"
  }
}
```

---

### sessions.bulk_revoked

**Description**: Emitted when multiple user sessions are revoked at once. Triggers security notification.

**Triggered When**: 
- User revokes all other sessions
- Admin revokes all sessions for a user
- Security breach triggers bulk revocation

**Event Type**: `sessions.bulk_revoked`

**Notification Triggered**: 
- Bulk session revocation notification
- Security alert

**Event Schema**: See [logs-events.md](./logs-events.md#sessionsbulkrevoked) for complete schema.

---

### user.provider_linked

**Description**: Emitted when a user links an authentication provider. Triggers confirmation notification.

**Triggered When**: 
- User links Google account
- User links GitHub account
- User links SSO provider

**Event Type**: `user.provider_linked`

**Notification Triggered**: Provider linked confirmation email

**Event Schema**: See [logs-events.md](./logs-events.md#userproviderlinked) for complete schema.

---

### user.provider_unlinked

**Description**: Emitted when a user unlinks an authentication provider. Triggers security notification.

**Triggered When**: 
- User unlinks Google account
- User unlinks GitHub account
- User unlinks SSO provider

**Event Type**: `user.provider_unlinked`

**Notification Triggered**: 
- Provider unlinked confirmation email
- Security alert (if last provider unlinked)

**Event Schema**: See [logs-events.md](./logs-events.md#userproviderunlinked) for complete schema.

---

## Consumed Events

The Authentication module does not consume events from other modules. It only publishes events.

