# User Management Module - Audit Log Events

> Per [ModuleImplementationGuide Section 9.5](../../../global/ModuleImplementationGuide.md): Event documentation files

This document defines all events published by the User Management module that should be captured by the Audit Logging service.

## Overview

### User Events
| Event Type | Category | Severity | Description |
|------------|----------|----------|-------------|
| `user.profile_updated` | ACTION | INFO | User profile modified |
| `user.competency_added` | ACTION | INFO | Competency added to user |
| `user.competency_verified` | ACTION | INFO | Competency verified |
| `user.account_deleted` | SECURITY | WARN | User account deleted |

### Organization Events
| Event Type | Category | Severity | Description |
|------------|----------|----------|-------------|
| `organization.created` | ACTION | INFO | New organization created |
| `organization.updated` | ACTION | INFO | Organization settings modified |
| `organization.deleted` | SECURITY | WARN | Organization deleted |
| `organization.member_joined` | ACCESS | INFO | User joined organization |
| `organization.member_role_changed` | SECURITY | INFO | Member's role changed |
| `organization.member_removed` | ACCESS | INFO | Member removed |
| `organization.settings_updated` | ACTION | INFO | Organization settings changed |
| `organization.sso_configured` | SECURITY | INFO | SSO provider configured |

### Team Events
| Event Type | Category | Severity | Description |
|------------|----------|----------|-------------|
| `team.created` | ACTION | INFO | New team created |
| `team.updated` | ACTION | INFO | Team modified |
| `team.deleted` | ACTION | INFO | Team deleted |
| `team.members_added` | ACCESS | INFO | Members added to team |
| `team.member_removed` | ACCESS | INFO | Member removed from team |

### Role Events
| Event Type | Category | Severity | Description |
|------------|----------|----------|-------------|
| `role.created` | SECURITY | INFO | New role created |
| `role.updated` | SECURITY | INFO | Role permissions modified |
| `role.deleted` | SECURITY | WARN | Role deleted |

### Invitation Events
| Event Type | Category | Severity | Description |
|------------|----------|----------|-------------|
| `invitation.created` | ACTION | INFO | Invitation sent |
| `invitation.accepted` | ACCESS | INFO | Invitation accepted |
| `invitation.revoked` | ACTION | INFO | Invitation revoked |
| `invitation.expired` | SYSTEM | INFO | Invitation expired |

---

## Event Definitions

### User Events

#### `user.profile_updated`

Emitted when a user updates their profile.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `user.profile_updated`

```json
{
  "type": "user.profile_updated",
  "eventCategory": "users",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "changes": {
      "firstName": { "old": "John", "new": "Jonathan" },
      "title": { "old": null, "new": "Senior Developer" }
    }
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

**Audit Log Fields**:
- `resourceType`: `user`
- `resourceId`: `user.data.userId`
- `message`: "User profile updated: firstName, title"

---

#### `user.competency_added`

Emitted when a competency is added to a user's profile.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `user.competency_added`

```json
{
  "type": "user.competency_added",
  "eventCategory": "users",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "userId": "user-456",
    "competencyId": "comp-789",
    "competencyName": "TypeScript"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

---

#### `user.competency_verified`

Emitted when a competency is verified by another user.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `user.competency_verified`

```json
{
  "type": "user.competency_verified",
  "eventCategory": "users",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "verifier-123",
  "data": {
    "userId": "user-456",
    "competencyId": "comp-789",
    "competencyName": "TypeScript",
    "verifiedBy": "verifier-123"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

---

#### `user.account_deleted`

Emitted when a user account is deleted.

**Category**: `SECURITY`  
**Severity**: `WARN`  
**Action**: `user.account_deleted`

```json
{
  "type": "user.account_deleted",
  "eventCategory": "users",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "admin-123",
  "data": {
    "userId": "user-456",
    "email": "user@example.com",
    "deletedBy": "admin-123",
    "reason": "User requested deletion"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "admin-sess"
  }
}
```

---

### Organization Events

#### `organization.created`

Emitted when a new organization is created.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `organization.created`

```json
{
  "type": "organization.created",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-456",
  "actorId": "user-456",
  "data": {
    "organizationId": "org-123",
    "name": "Acme Corp",
    "createdBy": "user-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

**Audit Log Fields**:
- `resourceType`: `organization`
- `resourceId`: `data.organizationId`
- `message`: "Organization created: Acme Corp"

---

#### `organization.updated`

Emitted when organization details are updated.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `organization.updated`

```json
{
  "type": "organization.updated",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "organizationId": "org-123",
    "changes": {
      "name": { "old": "Acme Corp", "new": "Acme Corporation" },
      "logo": { "old": null, "new": "https://..." }
    }
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

---

#### `organization.deleted`

Emitted when an organization is deleted.

**Category**: `SECURITY`  
**Severity**: `WARN`  
**Action**: `organization.deleted`

```json
{
  "type": "organization.deleted",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "owner-456",
  "actorId": "owner-456",
  "data": {
    "organizationId": "org-123",
    "name": "Acme Corp",
    "deletedBy": "owner-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-789"
  }
}
```

**Note**: This is a critical event that should trigger additional retention policies.

---

#### `organization.member_joined`

Emitted when a user joins an organization.

**Category**: `ACCESS`  
**Severity**: `INFO`  
**Action**: `organization.member_joined`

```json
{
  "type": "organization.member_joined",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "new-user-789",
  "actorId": "new-user-789",
  "data": {
    "organizationId": "org-123",
    "userId": "new-user-789",
    "email": "newuser@example.com",
    "roleId": "role-member",
    "roleName": "Member",
    "invitationId": "inv-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100"
  }
}
```

---

#### `organization.member_role_changed`

Emitted when a member's role is changed.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `organization.member_role_changed`

```json
{
  "type": "organization.member_role_changed",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-789",
  "actorId": "admin-456",
  "data": {
    "organizationId": "org-123",
    "userId": "user-789",
    "oldRoleId": "role-member",
    "oldRoleName": "Member",
    "newRoleId": "role-admin",
    "newRoleName": "Admin",
    "changedBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `organization.member_removed`

Emitted when a member is removed from an organization.

**Category**: `ACCESS`  
**Severity**: `INFO`  
**Action**: `organization.member_removed`

```json
{
  "type": "organization.member_removed",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-789",
  "actorId": "admin-456",
  "data": {
    "organizationId": "org-123",
    "userId": "user-789",
    "email": "user@example.com",
    "removedBy": "admin-456",
    "reason": "No longer with company"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `organization.settings_updated`

Emitted when organization settings are changed.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `organization.settings_updated`

```json
{
  "type": "organization.settings_updated",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "organizationId": "org-123",
    "changes": {
      "mfaRequired": { "old": false, "new": true },
      "sessionTimeout": { "old": 3600, "new": 1800 }
    }
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `organization.sso_configured`

Emitted when SSO is configured for an organization.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `organization.sso_configured`

```json
{
  "type": "organization.sso_configured",
  "eventCategory": "organizations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "organizationId": "org-123",
    "provider": "azure_ad",
    "configuredBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

### Team Events

#### `team.created`

Emitted when a new team is created.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `team.created`

```json
{
  "type": "team.created",
  "eventCategory": "teams",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "teamId": "team-789",
    "organizationId": "org-123",
    "name": "Engineering",
    "parentTeamId": null,
    "createdBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `team.updated`

Emitted when team details are updated.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `team.updated`

```json
{
  "type": "team.updated",
  "eventCategory": "teams",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "teamId": "team-789",
    "organizationId": "org-123",
    "changes": {
      "name": { "old": "Engineering", "new": "Platform Engineering" }
    }
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `team.deleted`

Emitted when a team is deleted.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `team.deleted`

```json
{
  "type": "team.deleted",
  "eventCategory": "teams",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "teamId": "team-789",
    "organizationId": "org-123",
    "name": "Engineering",
    "deletedBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `team.members_added`

Emitted when members are added to a team.

**Category**: `ACCESS`  
**Severity**: `INFO`  
**Action**: `team.members_added`

```json
{
  "type": "team.members_added",
  "eventCategory": "teams",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "teamId": "team-789",
    "organizationId": "org-123",
    "userIds": ["user-1", "user-2", "user-3"],
    "addedBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `team.member_removed`

Emitted when a member is removed from a team.

**Category**: `ACCESS`  
**Severity**: `INFO`  
**Action**: `team.member_removed`

```json
{
  "type": "team.member_removed",
  "eventCategory": "teams",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "user-789",
  "actorId": "admin-456",
  "data": {
    "teamId": "team-789",
    "organizationId": "org-123",
    "userId": "user-789",
    "removedBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

### Role Events

#### `role.created`

Emitted when a new role is created.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `role.created`

```json
{
  "type": "role.created",
  "eventCategory": "roles",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "roleId": "role-custom-1",
    "organizationId": "org-123",
    "name": "Project Manager",
    "createdBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `role.updated`

Emitted when role permissions are modified.

**Category**: `SECURITY`  
**Severity**: `INFO`  
**Action**: `role.updated`

```json
{
  "type": "role.updated",
  "eventCategory": "roles",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "roleId": "role-custom-1",
    "organizationId": "org-123",
    "changes": {
      "permissions": {
        "added": ["projects.create", "projects.delete"],
        "removed": ["users.manage"]
      }
    }
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `role.deleted`

Emitted when a role is deleted.

**Category**: `SECURITY`  
**Severity**: `WARN`  
**Action**: `role.deleted`

```json
{
  "type": "role.deleted",
  "eventCategory": "roles",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "roleId": "role-custom-1",
    "organizationId": "org-123",
    "name": "Project Manager",
    "deletedBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

### Invitation Events

#### `invitation.created`

Emitted when an invitation is sent.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `invitation.created`

```json
{
  "type": "invitation.created",
  "eventCategory": "invitations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "invitationId": "inv-789",
    "organizationId": "org-123",
    "email": "newuser@example.com",
    "invitationType": "email",
    "expiresAt": "2025-01-29T10:30:00.000Z",
    "createdBy": "admin-456"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `invitation.accepted`

Emitted when an invitation is accepted.

**Category**: `ACCESS`  
**Severity**: `INFO`  
**Action**: `invitation.accepted`

```json
{
  "type": "invitation.accepted",
  "eventCategory": "invitations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "new-user-789",
  "actorId": "new-user-789",
  "data": {
    "invitationId": "inv-789",
    "organizationId": "org-123",
    "userId": "new-user-789",
    "email": "newuser@example.com",
    "acceptedAt": "2025-01-22T10:30:00.000Z"
  },
  "metadata": {
    "ipAddress": "192.168.1.100"
  }
}
```

---

#### `invitation.revoked`

Emitted when an invitation is revoked.

**Category**: `ACTION`  
**Severity**: `INFO`  
**Action**: `invitation.revoked`

```json
{
  "type": "invitation.revoked",
  "eventCategory": "invitations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": "admin-456",
  "actorId": "admin-456",
  "data": {
    "invitationId": "inv-789",
    "organizationId": "org-123",
    "revokedBy": "admin-456",
    "reason": "Sent to wrong email"
  },
  "metadata": {
    "ipAddress": "192.168.1.100",
    "sessionId": "sess-admin"
  }
}
```

---

#### `invitation.expired`

Emitted when an invitation expires (system event).

**Category**: `SYSTEM`  
**Severity**: `INFO`  
**Action**: `invitation.expired`

```json
{
  "type": "invitation.expired",
  "eventCategory": "invitations",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "organizationId": "org-123",
  "userId": null,
  "actorId": "system",
  "data": {
    "invitationId": "inv-789",
    "organizationId": "org-123",
    "email": "newuser@example.com"
  },
  "metadata": {}
}
```

---

## Alert Rules

| Rule Name | Type | Condition | Severity |
|-----------|------|-----------|----------|
| Mass Member Removal | THRESHOLD | 5+ `organization.member_removed` in 10 min | CRITICAL |
| Role Escalation | PATTERN | `organization.member_role_changed` to Admin/Owner | WARN |
| Organization Deletion | PATTERN | `organization.deleted` | CRITICAL |
| Bulk Team Changes | THRESHOLD | 10+ team events in 5 min | WARN |

---

## Retention Policy

| Event Category | Retention Days | Archive After | Immutable |
|----------------|----------------|---------------|-----------|
| Role events | 730 | 180 | Yes |
| Organization deletion | 2555 (7 years) | 365 | Yes |
| Member changes | 365 | 90 | Yes |
| Other events | 180 | 60 | No |

---

## Related Documentation

- [User Management README](./README.md)
- [Notification Events](./notifications-events.md)
- [Authentication Module](../auth/README.md)
- [Module Implementation Guide - Events](../../../global/ModuleImplementationGuide.md#9-event-driven-communication)


