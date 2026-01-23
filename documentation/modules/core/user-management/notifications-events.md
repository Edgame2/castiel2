# User Management Module - Notification Events

> Per [ModuleImplementationGuide Section 9.5](../../../global/ModuleImplementationGuide.md): Event documentation files

This document defines all events published by the User Management module that trigger notifications via the Notification module.

## Overview

### User Notifications
| Event Type | Notification Type | Channels | Recipients |
|------------|-------------------|----------|------------|
| `user.profile_updated` | Confirmation | - | None (no notification) |
| `user.competency_verified` | Achievement | email, in-app | User |
| `user.account_deleted` | Confirmation | email | User (to backup email) |

### Organization Notifications
| Event Type | Notification Type | Channels | Recipients |
|------------|-------------------|----------|------------|
| `organization.created` | Welcome | email | Creator |
| `organization.member_joined` | Welcome | email, in-app | New member |
| `organization.member_role_changed` | Role Update | email, in-app | Affected member |
| `organization.member_removed` | Removal Notice | email | Removed member |
| `organization.sso_configured` | Admin Notice | email | Org admins |

### Team Notifications
| Event Type | Notification Type | Channels | Recipients |
|------------|-------------------|----------|------------|
| `team.created` | Info | in-app | Team creator |
| `team.members_added` | Welcome | email, in-app | Added members |
| `team.member_removed` | Removal Notice | in-app | Removed member |

### Invitation Notifications
| Event Type | Notification Type | Channels | Recipients |
|------------|-------------------|----------|------------|
| `invitation.created` | Invitation Email | email | Invitee |
| `invitation.accepted` | Confirmation | email, in-app | Inviter |
| `invitation.revoked` | - | - | None (no notification) |
| `invitation.expired` | Reminder | email | Inviter (admin) |

---

## Notification Definitions

### User Notifications

#### `user.competency_verified` → Achievement Notification

Notifies user when their competency is verified.

**Notification Type**: `email`, `in-app`  
**Template**: `competency_verified`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "user.competency_verified",
  "data": {
    "userId": "user-456",
    "competencyId": "comp-789",
    "competencyName": "TypeScript",
    "verifiedBy": "verifier-123"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "competency_verified",
  "recipients": ["user@example.com"],
  "data": {
    "competencyName": "TypeScript",
    "verifiedByName": "Jane Smith",
    "profileLink": "https://app.example.com/profile"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "Your TypeScript skill has been verified! 🎉"
- Congratulations message
- Link to view profile

---

#### `user.account_deleted` → Deletion Confirmation

Sends confirmation email when account is deleted.

**Notification Type**: `email`  
**Template**: `account_deleted`  
**Priority**: `high`

**Trigger Event**:
```json
{
  "type": "user.account_deleted",
  "data": {
    "userId": "user-456",
    "email": "user@example.com",
    "deletedBy": "user-456",
    "reason": "User requested"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "account_deleted",
  "recipients": ["user@example.com"],
  "data": {
    "deletionDate": "2025-01-22T10:30:00.000Z",
    "dataRetentionDays": 30,
    "supportEmail": "support@example.com"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "Your account has been deleted"
- Confirmation of deletion
- Data retention policy
- Contact support link

---

### Organization Notifications

#### `organization.created` → Welcome Email

Sends welcome email to organization creator.

**Notification Type**: `email`  
**Template**: `organization_created`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "organization.created",
  "data": {
    "organizationId": "org-123",
    "name": "Acme Corp",
    "createdBy": "user-456"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "organization_created",
  "recipients": ["admin@example.com"],
  "data": {
    "organizationName": "Acme Corp",
    "dashboardLink": "https://app.example.com/org/org-123",
    "inviteLink": "https://app.example.com/org/org-123/invite",
    "settingsLink": "https://app.example.com/org/org-123/settings"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "Welcome to your new organization: Acme Corp"
- Getting started guide
- Link to invite members
- Link to organization settings

---

#### `organization.member_joined` → Welcome to Organization

Notifies new member when they join an organization.

**Notification Type**: `email`, `in-app`  
**Template**: `member_joined`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "organization.member_joined",
  "data": {
    "organizationId": "org-123",
    "userId": "new-user-789",
    "email": "newuser@example.com",
    "roleId": "role-member",
    "roleName": "Member"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "member_joined",
  "recipients": ["newuser@example.com"],
  "data": {
    "organizationName": "Acme Corp",
    "roleName": "Member",
    "dashboardLink": "https://app.example.com/dashboard",
    "teamLink": "https://app.example.com/org/org-123/teams"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "Welcome to Acme Corp!"
- Organization name and role
- Getting started links
- Team directory link

---

#### `organization.member_role_changed` → Role Update

Notifies member when their role is changed.

**Notification Type**: `email`, `in-app`  
**Template**: `role_changed`  
**Priority**: `high`

**Trigger Event**:
```json
{
  "type": "organization.member_role_changed",
  "data": {
    "organizationId": "org-123",
    "userId": "user-789",
    "oldRoleId": "role-member",
    "oldRoleName": "Member",
    "newRoleId": "role-admin",
    "newRoleName": "Admin",
    "changedBy": "admin-456"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "role_changed",
  "recipients": ["user@example.com"],
  "data": {
    "organizationName": "Acme Corp",
    "oldRole": "Member",
    "newRole": "Admin",
    "changedByName": "John Admin",
    "permissionsLink": "https://app.example.com/org/org-123/roles"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "Your role has been updated in Acme Corp"
- Old and new role names
- Who made the change
- Link to view new permissions

---

#### `organization.member_removed` → Removal Notice

Notifies member when they are removed from an organization.

**Notification Type**: `email`  
**Template**: `member_removed`  
**Priority**: `high`

**Trigger Event**:
```json
{
  "type": "organization.member_removed",
  "data": {
    "organizationId": "org-123",
    "userId": "user-789",
    "email": "user@example.com",
    "removedBy": "admin-456",
    "reason": "No longer with company"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "member_removed",
  "recipients": ["user@example.com"],
  "data": {
    "organizationName": "Acme Corp",
    "removalDate": "2025-01-22T10:30:00.000Z",
    "dataExportLink": "https://app.example.com/data-export",
    "supportEmail": "support@example.com"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "You have been removed from Acme Corp"
- Removal date
- Data export option (if applicable)
- Support contact

---

#### `organization.sso_configured` → Admin Notice

Notifies organization admins when SSO is configured.

**Notification Type**: `email`  
**Template**: `sso_configured`  
**Priority**: `high`  
**Recipients**: All organization admins

**Trigger Event**:
```json
{
  "type": "organization.sso_configured",
  "data": {
    "organizationId": "org-123",
    "provider": "azure_ad",
    "configuredBy": "admin-456"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "sso_configured",
  "recipients": ["admin1@example.com", "admin2@example.com"],
  "data": {
    "organizationName": "Acme Corp",
    "provider": "Azure AD",
    "configuredByName": "John Admin",
    "ssoSettingsLink": "https://app.example.com/org/org-123/settings/sso"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "SSO has been configured for Acme Corp"
- Provider name
- Who configured it
- Link to SSO settings

---

### Team Notifications

#### `team.members_added` → Welcome to Team

Notifies members when they are added to a team.

**Notification Type**: `email`, `in-app`  
**Template**: `team_member_added`  
**Priority**: `normal`

**Trigger Event**:
```json
{
  "type": "team.members_added",
  "data": {
    "teamId": "team-789",
    "organizationId": "org-123",
    "userIds": ["user-1", "user-2", "user-3"],
    "addedBy": "admin-456"
  }
}
```

**Notification Payload** (sent to each user):
```json
{
  "type": "email",
  "template": "team_member_added",
  "recipients": ["user1@example.com"],
  "data": {
    "teamName": "Engineering",
    "organizationName": "Acme Corp",
    "addedByName": "John Admin",
    "teamLink": "https://app.example.com/teams/team-789"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "You've been added to the Engineering team"
- Team and organization names
- Link to team page

---

#### `team.member_removed` → Team Removal

Notifies member when removed from a team (in-app only).

**Notification Type**: `in-app`  
**Template**: `team_member_removed`  
**Priority**: `low`

**Notification Payload**:
```json
{
  "type": "in-app",
  "template": "team_member_removed",
  "recipients": ["user-789"],
  "data": {
    "teamName": "Engineering",
    "message": "You have been removed from the Engineering team"
  },
  "priority": "low"
}
```

---

### Invitation Notifications

#### `invitation.created` → Invitation Email

Sends invitation to join organization.

**Notification Type**: `email`  
**Template**: `invitation`  
**Priority**: `high`

**Trigger Event**:
```json
{
  "type": "invitation.created",
  "data": {
    "invitationId": "inv-789",
    "organizationId": "org-123",
    "email": "newuser@example.com",
    "invitationType": "email",
    "expiresAt": "2025-01-29T10:30:00.000Z",
    "createdBy": "admin-456"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "invitation",
  "recipients": ["newuser@example.com"],
  "data": {
    "organizationName": "Acme Corp",
    "inviterName": "John Admin",
    "inviteLink": "https://app.example.com/invite/inv-789",
    "expiresAt": "2025-01-29T10:30:00.000Z",
    "expiresIn": "7 days"
  },
  "priority": "high"
}
```

**Email Content**:
- Subject: "John Admin invited you to join Acme Corp"
- Organization name
- Who invited them
- Accept invitation button
- Expiration notice

---

#### `invitation.accepted` → Invitation Accepted

Notifies inviter when invitation is accepted.

**Notification Type**: `email`, `in-app`  
**Template**: `invitation_accepted`  
**Priority**: `normal`  
**Recipients**: Inviter

**Trigger Event**:
```json
{
  "type": "invitation.accepted",
  "data": {
    "invitationId": "inv-789",
    "organizationId": "org-123",
    "userId": "new-user-789",
    "email": "newuser@example.com",
    "acceptedAt": "2025-01-22T10:30:00.000Z"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "invitation_accepted",
  "recipients": ["admin@example.com"],
  "data": {
    "inviteeName": "New User",
    "inviteeEmail": "newuser@example.com",
    "organizationName": "Acme Corp",
    "membersLink": "https://app.example.com/org/org-123/members"
  },
  "priority": "normal"
}
```

**Email Content**:
- Subject: "New User accepted your invitation"
- Who accepted
- Link to manage members

---

#### `invitation.expired` → Expiration Reminder

Notifies admin when invitation expires without being accepted.

**Notification Type**: `email`  
**Template**: `invitation_expired`  
**Priority**: `low`  
**Recipients**: Original inviter

**Trigger Event**:
```json
{
  "type": "invitation.expired",
  "data": {
    "invitationId": "inv-789",
    "organizationId": "org-123",
    "email": "newuser@example.com"
  }
}
```

**Notification Payload**:
```json
{
  "type": "email",
  "template": "invitation_expired",
  "recipients": ["admin@example.com"],
  "data": {
    "inviteeEmail": "newuser@example.com",
    "organizationName": "Acme Corp",
    "resendLink": "https://app.example.com/org/org-123/invite?email=newuser@example.com"
  },
  "priority": "low"
}
```

**Email Content**:
- Subject: "Invitation to newuser@example.com has expired"
- Option to resend invitation

---

## Notification Channels

| Channel | Use Cases | Configuration |
|---------|-----------|---------------|
| `email` | All organization notifications | SMTP/SendGrid |
| `in-app` | Team changes, role updates | WebSocket/Push |
| `push` | Critical admin notices | Firebase/OneSignal |

---

## User Preferences

Users can configure notification preferences:

| Preference | Default | Options |
|------------|---------|---------|
| `org_updates` | `enabled` | `enabled`, `disabled` |
| `team_updates` | `enabled` | `enabled`, `disabled` |
| `invitation_updates` | `enabled` | `enabled`, `disabled` |
| `competency_updates` | `enabled` | `enabled`, `disabled` |

---

## Rate Limiting

| Event Type | Max Notifications | Window |
|------------|-------------------|--------|
| `invitation.created` | 50 | 24 hours (per org) |
| `team.members_added` | 100 | 1 hour |
| Role change notifications | 10 | 1 hour (per user) |

---

## Related Documentation

- [User Management README](./README.md)
- [Audit Log Events](./logs-events.md)
- [Notification Module Documentation](../notification/README.md)
- [Module Implementation Guide - Events](../../../global/ModuleImplementationGuide.md#9-event-driven-communication)


