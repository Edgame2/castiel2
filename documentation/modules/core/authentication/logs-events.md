# Authentication Module - Audit Log Events

> Per [ModuleImplementationGuide Section 9.5](../../../global/ModuleImplementationGuide.md): Event documentation files

This document defines all events published by the Authentication module that should be captured by the Audit Logging service.

## Overview

| Event Type | Category | Severity | Description |
|------------|----------|----------|-------------|
| `user.registered` | SECURITY | INFO | New user registration |
| `auth.login.success` | SECURITY | INFO | Successful login |
| `auth.login.failed` | SECURITY | WARN | Failed login attempt |
| `user.logged_in` | ACCESS | INFO | User session started |
| `user.logged_out` | ACCESS | INFO | User session ended |
| `user.email_verified` | ACTION | INFO | Email address verified |
| `user.password_changed` | SECURITY | INFO | Password changed |
| `user.password_reset_requested` | SECURITY | INFO | Password reset requested |
| `user.password_reset_success` | SECURITY | INFO | Password reset completed |
| `user.provider_linked` | SECURITY | INFO | OAuth provider linked |
| `user.provider_unlinked` | SECURITY | INFO | OAuth provider unlinked |
| `session.revoked` | SECURITY | WARN | Session revoked |
| `sessions.bulk_revoked` | SECURITY | WARN | Multiple sessions revoked |

---

## Event Definitions

### `user.registered`

Emitted when a new user account is created.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `user.registered`

```json
{
  "type": "user.registered",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "provider": "password",
    "organizationId": "org-123"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "country": "US",
    "city": "New York"
  }
}
```

**Audit Log Mapping**:
| Event Field | Audit Log Field |
|-------------|-----------------|
| `data.userId` | `userId` |
| `data.email` | `metadata.email` |
| `data.provider` | `metadata.provider` |
| `timestamp` | `timestamp` |
| `metadata.ipAddress` | `ipAddress` |

---

### `auth.login.success`

Emitted when a user successfully authenticates.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `auth.login.success`

```json
{
  "type": "auth.login.success",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "sessionId": "sess-789",
    "provider": "password",
    "deviceName": "Chrome on MacOS",
    "deviceType": "desktop",
    "country": "US",
    "city": "New York"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "sess-789"
  }
}
```

**Audit Log Mapping**:
| Event Field | Audit Log Field |
|-------------|-----------------|
| `data.userId` | `userId` |
| `data.sessionId` | `sessionId` |
| `data.provider` | `metadata.provider` |
| `data.deviceName` | `metadata.deviceName` |
| `metadata.ipAddress` | `ipAddress` |

---

### `auth.login.failed`

Emitted when a login attempt fails.

**Category**: `SECURITY`  
**Severity**: `WARN`  
**Action**: `auth.login.failed`

```json
{
  "type": "auth.login.failed",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": null,
  "userId": null,
  "actorId": "anonymous",
  "data": {
    "userId": "user-456",
    "email": "user@example.com",
    "provider": "password",
    "reason": "invalid_password"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Reason Values**:
- `user_not_found` - Email/username not found
- `invalid_password` - Password incorrect
- `account_deactivated` - Account is deactivated
- `account_locked` - Account is locked (too many attempts)
- `no_password_set` - No password set (OAuth only account)
- `invalid_token` - Invalid OAuth/refresh token
- `other` - Other reason

**Alert Rule**: Trigger alert after 5 failed attempts within 15 minutes.

---

### `user.logged_in`

Emitted when a user session is established (duplicate of `auth.login.success` for backward compatibility).

**Category**: `ACCESS`  
**Severity**: `INFO`  
**Action**: `user.logged_in`

```json
{
  "type": "user.logged_in",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "sessionId": "sess-789",
    "provider": "google",
    "deviceName": "Safari on iOS",
    "deviceType": "mobile",
    "country": "CA",
    "city": "Toronto"
  },
  "metadata": {
    "ipAddress": "10.0.0.50",
    "userAgent": "Mozilla/5.0..."
  }
}
```

---

### `user.logged_out`

Emitted when a user session ends.

**Category**: `ACCESS`  
**Severity**: `INFO`  
**Action**: `user.logged_out`

```json
{
  "type": "user.logged_out",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "sessionId": "sess-789",
    "reason": "user_initiated"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

**Reason Values**:
- `user_initiated` - User clicked logout
- `session_expired` - Session timed out
- `admin_revoked` - Admin revoked session

---

### `user.email_verified`

Emitted when a user verifies their email address.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `user.email_verified`

```json
{
  "type": "user.email_verified",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "email": "user@example.com"
  },
  "metadata": {
    "ipAddress": "192.168.1.100"
  }
}
```

---

### `user.password_changed`

Emitted when a user's password is changed.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `user.password_changed`

```json
{
  "type": "user.password_changed",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "initiatedBy": "user"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

**InitiatedBy Values**:
- `user` - User changed their own password
- `admin` - Admin reset user's password
- `system` - System forced password change (policy)

---

### `user.password_reset_requested`

Emitted when a password reset is requested.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `user.password_reset_requested`

```json
{
  "type": "user.password_reset_requested",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "email": "user@example.com"
  },
  "metadata": {
    "ipAddress": "192.168.1.100"
  }
}
```

---

### `user.password_reset_success`

Emitted when a password reset is completed successfully.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `user.password_reset_success`

```json
{
  "type": "user.password_reset_success",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "email": "user@example.com"
  },
  "metadata": {
    "ipAddress": "192.168.1.100"
  }
}
```

---

### `user.provider_linked`

Emitted when an OAuth provider is linked to a user account.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `user.provider_linked`

```json
{
  "type": "user.provider_linked",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "provider": "google",
    "providerUserId": "google-12345"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

---

### `user.provider_unlinked`

Emitted when an OAuth provider is unlinked from a user account.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `user.provider_unlinked`

```json
{
  "type": "user.provider_unlinked",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "provider": "github"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

---

### `session.revoked`

Emitted when a single session is revoked.

**Category**: `SECURITY`  
**Severity**: `WARN`  
**Action**: `session.revoked`

```json
{
  "type": "session.revoked",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "admin-123",
  "data": {
    "userId": "user-456",
    "sessionId": "sess-789",
    "reason": "admin_revoked",
    "revokedBy": "admin-123"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "admin-session"
  }
}
```

**Reason Values**:
- `user_initiated` - User revoked their own session
- `admin_revoked` - Admin revoked user's session
- `security_breach` - Revoked due to security concern
- `device_change` - Revoked due to device change

---

### `sessions.bulk_revoked`

Emitted when multiple sessions are revoked at once.

**Category**: `SECURITY`  
**Severity**: `WARN`  
**Action**: `sessions.bulk_revoked`

```json
{
  "type": "sessions.bulk_revoked",
  "eventCategory": "auth",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "sessionIds": ["sess-1", "sess-2", "sess-3"],
    "reason": "user_initiated",
    "revokedBy": "user-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-current"
  }
}
```

---

## Alert Rules

The following alert rules should be configured in the Logging module:

| Rule Name | Type | Condition | Severity |
|-----------|------|-----------|----------|
| Failed Login Spike | THRESHOLD | 5+ `auth.login.failed` in 15 min | WARN |
| Session Mass Revocation | THRESHOLD | 10+ `session.revoked` in 5 min | CRITICAL |
| Password Reset Abuse | THRESHOLD | 10+ `user.password_reset_requested` same IP in 1 hour | WARN |
| New Device Login | PATTERN | `auth.login.success` from new device | INFO |

---

## Retention Policy

| Event Type | Retention Days | Archive After | Immutable |
|------------|----------------|---------------|-----------|
| `auth.login.failed` | 365 | 90 | Yes |
| `auth.login.success` | 365 | 90 | Yes |
| `session.revoked` | 365 | 90 | Yes |
| Other auth events | 180 | 60 | No |

---

## Related Documentation

- [Authentication API](./API.md)
- [Notification Events](./notifications-events.md)
- [Module Implementation Guide - Events](../../../global/ModuleImplementationGuide.md#9-event-driven-communication)


