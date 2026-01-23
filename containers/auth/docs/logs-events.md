# Authentication Module - Logs Events

## Overview

This document describes all events published by the Authentication module that are consumed by the Logging service for audit trail and compliance logging.

## Published Events

### user.registered

**Description**: Emitted when a new user account is created through any authentication method.

**Triggered When**: 
- User registers with email/password
- User signs in with OAuth for the first time (account auto-created)
- User account is created via invitation acceptance

**Event Type**: `user.registered`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.registered"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version (e.g., '1.0')"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event (e.g., 'auth')"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "Actor user ID (optional, null for new user)"
    },
    "data": {
      "type": "object",
      "required": ["userId", "email", "provider"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the newly registered user"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "User's email address"
        },
        "firstName": {
          "type": "string",
          "description": "User's first name (optional)"
        },
        "lastName": {
          "type": "string",
          "description": "User's last name (optional)"
        },
        "provider": {
          "type": "string",
          "enum": ["password", "google", "github", "azure_ad", "okta"],
          "description": "Authentication provider used for registration"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid",
          "description": "Organization ID if user was invited (optional)"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "user.registered",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth",
  "correlationId": "req_45678901-2345-2345-2345-234567890def",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "provider": "google",
    "organizationId": "org_78901234-3456-3456-3456-345678901ghi"
  }
}
```

---

### auth.login.success

**Description**: Emitted when a user successfully authenticates.

**Triggered When**: 
- User successfully logs in with email/password
- User successfully authenticates via OAuth
- User successfully authenticates via SAML/SSO

**Event Type**: `auth.login.success`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["auth.login.success"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who logged in"
    },
    "data": {
      "type": "object",
      "required": ["userId", "sessionId", "provider"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who logged in"
        },
        "sessionId": {
          "type": "string",
          "format": "uuid",
          "description": "Session ID created for this login"
        },
        "provider": {
          "type": "string",
          "enum": ["password", "google", "github", "azure_ad", "okta"],
          "description": "Authentication provider used"
        },
        "deviceName": {
          "type": "string",
          "description": "Device name (optional)"
        },
        "deviceType": {
          "type": "string",
          "description": "Device type (optional)"
        },
        "country": {
          "type": "string",
          "description": "Country code from IP geolocation (optional)"
        },
        "city": {
          "type": "string",
          "description": "City from IP geolocation (optional)"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "auth.login.success",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth",
  "correlationId": "req_45678901-2345-2345-2345-234567890def",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "sessionId": "sess_12345678-1234-1234-1234-123456789abc",
    "provider": "password",
    "deviceName": "Chrome on Windows",
    "deviceType": "desktop",
    "country": "US",
    "city": "San Francisco"
  }
}
```

---

### auth.login.failed

**Description**: Emitted when a login attempt fails.

**Triggered When**: 
- Invalid email/password combination
- User account not found
- Account is locked or deactivated
- OAuth/SAML authentication fails

**Event Type**: `auth.login.failed`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["auth.login.failed"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "data": {
      "type": "object",
      "required": ["provider", "reason"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID if user was found (optional)"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address used in login attempt (optional, may be redacted for security)"
        },
        "provider": {
          "type": "string",
          "enum": ["password", "google", "github", "azure_ad", "okta"],
          "description": "Authentication provider used"
        },
        "reason": {
          "type": "string",
          "enum": ["user_not_found", "invalid_password", "account_deactivated", "account_locked", "no_password_set", "invalid_token", "other"],
          "description": "Reason for login failure"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "auth.login.failed",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "auth",
  "correlationId": "req_45678901-2345-2345-2345-234567890def",
  "data": {
    "email": "user@example.com",
    "provider": "password",
    "reason": "invalid_password"
  }
}
```

---

### user.logged_out

**Description**: Emitted when a user logs out or session is terminated.

**Triggered When**: 
- User explicitly logs out
- Session expires
- Session is revoked by admin
- All sessions are revoked

**Event Type**: `user.logged_out`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.logged_out"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who logged out"
    },
    "data": {
      "type": "object",
      "required": ["userId", "sessionId"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who logged out"
        },
        "sessionId": {
          "type": "string",
          "format": "uuid",
          "description": "Session ID that was terminated"
        },
        "reason": {
          "type": "string",
          "enum": ["user_initiated", "session_expired", "admin_revoked"],
          "description": "Reason for logout (optional)"
        }
      }
    }
  }
}
```

---

### user.password_changed

**Description**: Emitted when a user changes their password.

**Triggered When**: 
- User changes password via change password flow
- Admin resets user password
- System forces password change

**Event Type**: `user.password_changed`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.password_changed"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID whose password was changed"
    },
    "data": {
      "type": "object",
      "required": ["userId", "initiatedBy"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user whose password was changed"
        },
        "initiatedBy": {
          "type": "string",
          "enum": ["user", "admin", "system"],
          "description": "Who initiated the password change"
        }
      }
    }
  }
}
```

---

### user.password_reset_requested

**Description**: Emitted when a user requests a password reset.

**Triggered When**: 
- User clicks "Forgot Password" and enters email
- Password reset email is sent

**Event Type**: `user.password_reset_requested`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.password_reset_requested"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "data": {
      "type": "object",
      "required": ["userId", "email", "resetToken"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user requesting password reset"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address of the user"
        },
        "resetToken": {
          "type": "string",
          "description": "Password reset token (for email link)"
        }
      }
    }
  }
}
```

---

### user.password_reset_success

**Description**: Emitted when a user successfully resets their password using a reset token.

**Triggered When**: 
- User successfully completes password reset flow with valid token

**Event Type**: `user.password_reset_success`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.password_reset_success"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who reset password"
    },
    "data": {
      "type": "object",
      "required": ["userId", "email"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who reset password"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address of the user"
        }
      }
    }
  }
}
```

---

### user.email_verification_requested

**Description**: Emitted when a user requests email verification (e.g., during registration or resend).

**Triggered When**: 
- User registers and needs to verify email
- User requests resend of verification email
- Verification token is generated

**Event Type**: `user.email_verification_requested`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.email_verification_requested"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID requesting verification"
    },
    "data": {
      "type": "object",
      "required": ["userId", "email", "verificationToken"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user requesting verification"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address to verify"
        },
        "verificationToken": {
          "type": "string",
          "description": "Verification token (for email link)"
        }
      }
    }
  }
}
```

---

### user.email_verified

**Description**: Emitted when a user verifies their email address.

**Triggered When**: 
- User clicks email verification link
- Email verification token is validated

**Event Type**: `user.email_verified`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.email_verified"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID whose email was verified"
    },
    "data": {
      "type": "object",
      "required": ["userId", "email"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user whose email was verified"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address that was verified"
        }
      }
    }
  }
}
```

---

### user.provider_linked

**Description**: Emitted when a user links an authentication provider to their account.

**Triggered When**: 
- User links Google account
- User links GitHub account
- User links SSO provider

**Event Type**: `user.provider_linked`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.provider_linked"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who linked provider"
    },
    "data": {
      "type": "object",
      "required": ["userId", "provider", "providerUserId"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who linked provider"
        },
        "provider": {
          "type": "string",
          "enum": ["google", "github", "azure_ad", "okta"],
          "description": "Authentication provider that was linked"
        },
        "providerUserId": {
          "type": "string",
          "description": "User ID from the provider"
        }
      }
    }
  }
}
```

---

### user.provider_unlinked

**Description**: Emitted when a user unlinks an authentication provider from their account.

**Triggered When**: 
- User unlinks Google account
- User unlinks GitHub account
- User unlinks SSO provider

**Event Type**: `user.provider_unlinked`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["user.provider_unlinked"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who unlinked provider"
    },
    "data": {
      "type": "object",
      "required": ["userId", "provider"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who unlinked provider"
        },
        "provider": {
          "type": "string",
          "enum": ["google", "github", "azure_ad", "okta"],
          "description": "Authentication provider that was unlinked"
        }
      }
    }
  }
}
```

---

### session.revoked

**Description**: Emitted when a user session is revoked.

**Triggered When**: 
- User revokes a specific session
- Admin revokes a user session
- Session is revoked due to security breach
- Session is revoked due to device change

**Event Type**: `session.revoked`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["session.revoked"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID whose session was revoked"
    },
    "data": {
      "type": "object",
      "required": ["userId", "sessionId", "reason"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user whose session was revoked"
        },
        "sessionId": {
          "type": "string",
          "format": "uuid",
          "description": "Session ID that was revoked"
        },
        "reason": {
          "type": "string",
          "enum": ["user_initiated", "admin_revoked", "security_breach", "device_change"],
          "description": "Reason for session revocation"
        },
        "revokedBy": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who revoked the session (if admin, optional)"
        }
      }
    }
  }
}
```

---

### sessions.bulk_revoked

**Description**: Emitted when multiple user sessions are revoked at once.

**Triggered When**: 
- User revokes all other sessions
- Admin revokes all sessions for a user
- Security breach triggers bulk revocation

**Event Type**: `sessions.bulk_revoked`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["sessions.bulk_revoked"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID whose sessions were revoked"
    },
    "data": {
      "type": "object",
      "required": ["userId", "sessionIds", "reason"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user whose sessions were revoked"
        },
        "sessionIds": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "description": "List of session IDs that were revoked"
        },
        "reason": {
          "type": "string",
          "enum": ["user_initiated", "admin_revoked", "security_breach"],
          "description": "Reason for bulk revocation"
        },
        "revokedBy": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who revoked the sessions (if admin, optional)"
        }
      }
    }
  }
}
```

---

## Consumed Events

The Authentication module does not consume events from other modules. It only publishes events.

