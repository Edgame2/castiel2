# User Management Module - Logs Events

## Overview

This document describes all events published by the User Management module that are consumed by the Logging service for audit trail and compliance logging.

## Published Events

### user.deactivated

**Description**: Emitted when a user account is deactivated.

**Triggered When**: 
- User deactivates their own account
- Admin deactivates a user account

**Event Type**: `user.deactivated`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "data"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["user.deactivated"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who was deactivated"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization context (optional)"
    },
    "actorId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who performed the deactivation"
    },
    "data": {
      "type": "object",
      "required": ["userId", "deactivatedBy", "reason"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who was deactivated"
        },
        "deactivatedBy": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who performed the deactivation"
        },
        "reason": {
          "type": "string",
          "enum": ["self", "admin"],
          "description": "Reason for deactivation"
        }
      }
    }
  }
}
```

---

### user.reactivated

**Description**: Emitted when a user account is reactivated.

**Triggered When**: 
- Admin reactivates a deactivated user account

**Event Type**: `user.reactivated`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "data"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["user.reactivated"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who was reactivated"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization context (optional)"
    },
    "actorId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who performed the reactivation"
    },
    "data": {
      "type": "object",
      "required": ["userId", "reactivatedBy"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who was reactivated"
        },
        "reactivatedBy": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who performed the reactivation"
        }
      }
    }
  }
}
```

---

### user.deleted

**Description**: Emitted when a user account is permanently deleted (after 90-day grace period).

**Triggered When**: 
- Admin permanently deletes a user account after soft-deletion period

**Event Type**: `user.deleted`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "data"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["user.deleted"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who was deleted"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization context (optional)"
    },
    "actorId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who performed the deletion"
    },
    "data": {
      "type": "object",
      "required": ["userId", "deletedBy"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who was deleted"
        },
        "deletedBy": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user who performed the deletion"
        }
      }
    }
  }
}
```

---

### user.session_revoked

**Description**: Emitted when a user session is revoked.

**Triggered When**: 
- User revokes a specific session
- User revokes all other sessions

**Event Type**: `user.session_revoked`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "data"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["user.session_revoked"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID whose session was revoked"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization context (optional)"
    },
    "actorId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who performed the revocation"
    },
    "data": {
      "type": "object",
      "required": ["userId", "sessionId"],
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
          "enum": ["user_initiated", "admin_revoked", "security"],
          "description": "Reason for session revocation"
        },
        "count": {
          "type": "number",
          "description": "Number of sessions revoked (for bulk revocation)"
        }
      }
    }
  }
}
```

---

### user.profile_updated

**Description**: Emitted when a user profile is updated.

**Triggered When**: 
- User updates their own profile
- Admin updates a user profile
- Profile fields are modified

**Event Type**: `user.profile_updated`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "data"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["user.profile_updated"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID whose profile was updated"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization context (optional)"
    },
    "actorId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who performed the update"
    },
    "data": {
      "type": "object",
      "required": ["userId", "changes"],
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the user whose profile was updated"
        },
        "changes": {
          "type": "object",
          "description": "Fields that were changed",
          "properties": {
            "name": {"type": "string"},
            "firstName": {"type": "string"},
            "lastName": {"type": "string"},
            "phoneNumber": {"type": "string"},
            "avatarUrl": {"type": "string"},
            "function": {"type": "string"},
            "speciality": {"type": "string"},
            "timezone": {"type": "string"},
            "language": {"type": "string"}
          }
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "type": "user.profile_updated",
  "timestamp": "2025-01-22T10:00:00Z",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "actorId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "changes": {
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

---

### organization.created

**Description**: Emitted when a new organization is created.

**Triggered When**: 
- User creates a new organization
- System creates organization during setup

**Event Type**: `organization.created`

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "organization.created",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
    "name": "Acme Corp",
    "createdBy": "user_90123456-4567-4567-4567-456789012jkl"
  }
}
```

---

### organization.member_joined

**Description**: Emitted when a user joins an organization.

**Triggered When**: 
- User accepts an invitation
- User is added directly to organization
- User creates organization (auto-joins)

**Event Type**: `organization.member_joined`

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "organization.member_joined",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "user@example.com",
    "roleId": "role_12345678-1234-1234-1234-123456789abc",
    "roleName": "member",
    "invitationId": "inv_12345678-1234-1234-1234-123456789abc"
  }
}
```

---

### organization.member_removed

**Description**: Emitted when a user is removed from an organization.

**Triggered When**: 
- Admin removes member from organization
- User leaves organization voluntarily

**Event Type**: `organization.member_removed`

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "organization.member_removed",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "admin_12345678-1234-1234-1234-123456789abc",
  "data": {
    "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "user@example.com",
    "removedBy": "admin_12345678-1234-1234-1234-123456789abc",
    "reason": "No longer needed"
  }
}
```

---

### role.created

**Description**: Emitted when a new role is created.

**Triggered When**: 
- Admin creates a custom role
- System creates a default role

**Event Type**: `role.created`

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "role.created",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "admin_12345678-1234-1234-1234-123456789abc",
  "data": {
    "roleId": "role_12345678-1234-1234-1234-123456789abc",
    "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
    "name": "Developer",
    "createdBy": "admin_12345678-1234-1234-1234-123456789abc"
  }
}
```

---

### invitation.accepted

**Description**: Emitted when a user accepts an invitation.

**Triggered When**: 
- User clicks invitation link and accepts
- User accepts invitation via API

**Event Type**: `invitation.accepted`

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "invitation.accepted",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "invitationId": "inv_12345678-1234-1234-1234-123456789abc",
    "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "user@example.com",
    "acceptedAt": "2025-01-22T10:00:00Z"
  }
}
```

---

## Consumed Events

### auth.login.success

**Description**: Updates user's last login timestamp when authentication succeeds.

**Handler**: `src/events/consumers/authConsumer.ts`

**Action Taken**:
- Updates `lastLoginAt` field in user profile
- Records login history entry

---

### auth.login.failed

**Description**: Tracks failed login attempts for security monitoring.

**Handler**: `src/events/consumers/authConsumer.ts`

**Action Taken**:
- Records failed login attempt
- Updates account lockout status if threshold reached

---

### user.registered

**Description**: Initializes user profile when new user registers.

**Handler**: `src/events/consumers/authConsumer.ts`

**Action Taken**:
- Creates default user profile
- Sets up default preferences
- Assigns to default organization if applicable

