# Authentication Module - Notification Events

> Per [ModuleImplementationGuide Section 9.5](../../../global/ModuleImplementationGuide.md): Event documentation files

This document defines all events published by the Authentication module that trigger notifications via the Notification module.

## Overview

| Event Type | Notification Type | Channels | Recipients |
|------------|-------------------|----------|------------|
| `user.registered` | Welcome Email | email | User |
| `auth.login.success` | New Device Alert | email, push | User |
| `auth.login.failed` | Security Alert | email | User (5+ attempts) |
| `user.email_verified` | Confirmation | email | User |
| `user.password_changed` | Security Alert | email | User |
| `user.password_reset_requested` | Reset Link | email | User |
| `user.password_reset_success` | Confirmation | email | User |
| `user.provider_linked` | Account Update | email | User |
| `user.provider_unlinked` | Account Update | email | User |
| `session.revoked` | Security Alert | email, push | User |
| `sessions.bulk_revoked` | Security Alert | email, push | User |

---

## Notification Definitions

### `user.registered` → Welcome Email

Sends a welcome email to newly registered users.

**Notification Type**: `email`  
**Template**: `welcome`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "user.registered",
  "data": {
    "userId": "user-456",
    "email": "user@example.com",
    "firstName": "John",
    "provider": "password"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "welcome",
  "recipients": ["user@example.com"],
  "data": {
    "firstName": "John",
    "email": "user@example.com",
    "verificationLink": "https://app.example.com/verify?token=...",
    "loginLink": "https://app.example.com/login"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "Welcome to Coder IDE, {{firstName}}!"
- Include email verification link (if provider is `password`)
- Include getting started guide

---

### `auth.login.success` → New Device Alert

Sends an alert when user logs in from a new device or location.

**Notification Type**: `email`, `push`  
**Template**: `new_device_login`  
**Priority**: `high`  
**Condition**: New device OR new location detected

**Trigger Event**:
```json
{
  "type": "auth.login.success",
  "data": {
    "userId": "user-456",
    "sessionId": "sess-789",
    "provider": "password",
    "deviceName": "Chrome on Windows",
    "deviceType": "desktop",
    "country": "DE",
    "city": "Berlin"
  },
  "metadata": {
    "ipAddress": "203.0.113.45"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "new_device_login",
  "recipients": ["user@example.com"],
  "data": {
    "deviceName": "Chrome on Windows",
    "location": "Berlin, Germany",
    "ipAddress": "203.0.113.45",
    "time": "2025-01-22T10:30:00.000Z",
    "secureAccountLink": "https://app.example.com/account/security"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "New sign-in to your Coder IDE account"
- Device name and type
- Location (city, country)
- IP address
- Time of login
- "Not you?" link to secure account

---

### `auth.login.failed` → Security Alert

Sends a security alert after multiple failed login attempts.

**Notification Type**: `email`  
**Template**: `login_failed_alert`  
**Priority**: `high`  
**Condition**: 5+ failed attempts within 15 minutes

**Trigger Event** (aggregated):
```json
{
  "type": "auth.login.failed",
  "data": {
    "email": "user@example.com",
    "reason": "invalid_password"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "attemptCount": 5
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "login_failed_alert",
  "recipients": ["user@example.com"],
  "data": {
    "attemptCount": 5,
    "ipAddress": "192.168.1.100",
    "timeWindow": "15 minutes",
    "resetPasswordLink": "https://app.example.com/forgot-password",
    "secureAccountLink": "https://app.example.com/account/security"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "Security Alert: Failed login attempts detected"
- Number of failed attempts
- IP address(es)
- "Reset password" link
- "Secure your account" link

---

### `user.email_verified` → Confirmation

Confirms successful email verification.

**Notification Type**: `email`  
**Template**: `email_verified`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "user.email_verified",
  "data": {
    "userId": "user-456",
    "email": "user@example.com"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "email_verified",
  "recipients": ["user@example.com"],
  "data": {
    "email": "user@example.com",
    "dashboardLink": "https://app.example.com/dashboard"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "Email verified successfully"
- Confirmation message
- Link to dashboard

---

### `user.password_changed` → Security Alert

Notifies user when their password is changed.

**Notification Type**: `email`  
**Template**: `password_changed`  
**Priority**: `high`

**Trigger Event**:
```json
{
  "type": "user.password_changed",
  "data": {
    "userId": "user-456",
    "initiatedBy": "user"
  },
  "metadata": {
    "ipAddress": "192.168.1.100"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "password_changed",
  "recipients": ["user@example.com"],
  "data": {
    "time": "2025-01-22T10:30:00.000Z",
    "ipAddress": "192.168.1.100",
    "initiatedBy": "user",
    "secureAccountLink": "https://app.example.com/account/security"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "Your password was changed"
- Time of change
- "Not you?" security link
- Different content if admin-initiated

---

### `user.password_reset_requested` → Reset Link

Sends password reset link to user.

**Notification Type**: `email`  
**Template**: `password_reset`  
**Priority**: `high`

**Trigger Event**:
```json
{
  "type": "user.password_reset_requested",
  "data": {
    "userId": "user-456",
    "email": "user@example.com"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "password_reset",
  "recipients": ["user@example.com"],
  "data": {
    "resetLink": "https://app.example.com/reset-password?token=...",
    "expiresIn": "1 hour"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "Reset your password"
- Reset link with token
- Expiration time
- "Didn't request this?" message

---

### `user.password_reset_success` → Confirmation

Confirms successful password reset.

**Notification Type**: `email`  
**Template**: `password_reset_success`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "user.password_reset_success",
  "data": {
    "userId": "user-456",
    "email": "user@example.com"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "password_reset_success",
  "recipients": ["user@example.com"],
  "data": {
    "loginLink": "https://app.example.com/login",
    "secureAccountLink": "https://app.example.com/account/security"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "Password reset successful"
- Confirmation message
- Login link
- Security recommendations

---

### `user.provider_linked` → Account Update

Notifies user when an OAuth provider is linked.

**Notification Type**: `email`  
**Template**: `provider_linked`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "user.provider_linked",
  "data": {
    "userId": "user-456",
    "provider": "google",
    "providerUserId": "google-12345"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "provider_linked",
  "recipients": ["user@example.com"],
  "data": {
    "provider": "Google",
    "time": "2025-01-22T10:30:00.000Z",
    "accountSettingsLink": "https://app.example.com/account/settings"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "Google account linked"
- Provider name
- "Not you?" link

---

### `user.provider_unlinked` → Account Update

Notifies user when an OAuth provider is unlinked.

**Notification Type**: `email`  
**Template**: `provider_unlinked`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "user.provider_unlinked",
  "data": {
    "userId": "user-456",
    "provider": "github"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "provider_unlinked",
  "recipients": ["user@example.com"],
  "data": {
    "provider": "GitHub",
    "time": "2025-01-22T10:30:00.000Z",
    "accountSettingsLink": "https://app.example.com/account/settings"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "GitHub account unlinked"
- Provider name
- Reminder about other login methods

---

### `session.revoked` → Security Alert

Notifies user when a session is revoked (especially by admin).

**Notification Type**: `email`, `push`  
**Template**: `session_revoked`  
**Priority**: `high`  
**Condition**: Send only if `reason` is `admin_revoked` or `security_breach`

**Trigger Event**:
```json
{
  "type": "session.revoked",
  "data": {
    "userId": "user-456",
    "sessionId": "sess-789",
    "reason": "admin_revoked",
    "revokedBy": "admin-123"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "session_revoked",
  "recipients": ["user@example.com"],
  "data": {
    "reason": "admin_revoked",
    "time": "2025-01-22T10:30:00.000Z",
    "secureAccountLink": "https://app.example.com/account/security"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "A session was terminated"
- Reason for termination
- Security recommendations
- Contact support link (if security breach)

---

### `sessions.bulk_revoked` → Security Alert

Notifies user when multiple sessions are revoked.

**Notification Type**: `email`, `push`  
**Template**: `sessions_bulk_revoked`  
**Priority**: `high`

**Trigger Event**:
```json
{
  "type": "sessions.bulk_revoked",
  "data": {
    "userId": "user-456",
    "sessionIds": ["sess-1", "sess-2", "sess-3"],
    "reason": "security_breach",
    "revokedBy": "admin-123"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "sessions_bulk_revoked",
  "recipients": ["user@example.com"],
  "data": {
    "sessionCount": 3,
    "reason": "security_breach",
    "time": "2025-01-22T10:30:00.000Z",
    "resetPasswordLink": "https://app.example.com/forgot-password",
    "supportLink": "https://app.example.com/support"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "All your sessions have been terminated"
- Number of sessions terminated
- Reason
- Strong recommendation to reset password
- Support contact

---

## Notification Channels

| Channel | Use Cases | Configuration |
|---------|-----------|---------------|
| `email` | All auth notifications | SMTP/SendGrid |
| `push` | Security alerts (new device, session revoked) | Firebase/OneSignal |

---

## User Preferences

Users can configure notification preferences for auth events:

| Preference | Default | Options |
|------------|---------|---------|
| `security_alerts` | `enabled` | `enabled`, `disabled` |
| `new_device_alerts` | `enabled` | `enabled`, `disabled` |
| `password_change_alerts` | `enabled` | `enabled`, `disabled` (always on for admin changes) |
| `login_activity_digest` | `disabled` | `daily`, `weekly`, `disabled` |

---

## Rate Limiting

To prevent notification spam:

| Event Type | Max Notifications | Window |
|------------|-------------------|--------|
| `auth.login.failed` alert | 3 | 1 hour |
| `auth.login.success` new device | 5 | 24 hours |
| `session.revoked` | 10 | 1 hour |

---

## Related Documentation

- [Authentication API](./API.md)
- [Audit Log Events](./logs-events.md)
- [Notification Module Documentation](../notification/README.md)
- [Module Implementation Guide - Events](../../../global/ModuleImplementationGuide.md#9-event-driven-communication)


