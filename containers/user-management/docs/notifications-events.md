# User Management Module - Notifications Events

## Overview

This document describes all events published by the User Management module that trigger notifications to users via the Notification service.

## Published Events

### user.profile_updated

**Description**: Emitted when a user profile is updated. Can trigger notification if significant changes occur.

**Triggered When**: 
- User updates their own profile
- Admin updates a user profile

**Event Type**: `user.profile_updated`

**Notification Triggered**: Profile update confirmation (optional, configurable)

**Event Schema**: See [logs-events.md](./logs-events.md#userprofileupdated) for complete schema.

---

### user.deactivated

**Description**: Emitted when a user account is deactivated. Triggers notification to user.

**Triggered When**: 
- User deactivates their own account
- Admin deactivates a user account

**Event Type**: `user.deactivated`

**Notification Triggered**: 
- Account deactivation confirmation email
- Security alert (if deactivated by admin)

**Event Schema**: See [logs-events.md](./logs-events.md#userdeactivated) for complete schema.

---

### user.reactivated

**Description**: Emitted when a user account is reactivated. Triggers welcome back notification.

**Triggered When**: 
- Admin reactivates a deactivated user account

**Event Type**: `user.reactivated`

**Notification Triggered**: Account reactivation welcome email

**Event Schema**: See [logs-events.md](./logs-events.md#userreactivated) for complete schema.

---

### user.deleted

**Description**: Emitted when a user account is permanently deleted. Triggers final notification.

**Triggered When**: 
- Admin permanently deletes a user account after soft-deletion period

**Event Type**: `user.deleted`

**Notification Triggered**: Account deletion confirmation (if user email still accessible)

**Event Schema**: See [logs-events.md](./logs-events.md#userdeleted) for complete schema.

---

### user.session_revoked

**Description**: Emitted when a user session is revoked. Triggers security notification.

**Triggered When**: 
- User revokes a specific session
- User revokes all other sessions

**Event Type**: `user.session_revoked`

**Notification Triggered**: 
- Session revocation confirmation
- Security alert (if multiple sessions revoked)

**Event Schema**: See [logs-events.md](./logs-events.md#usersessionrevoked) for complete schema.

---

### tenant.member_joined

**Description**: Emitted when a user joins a tenant. Triggers welcome notification.

**Triggered When**: 
- User accepts an invitation
- User is added directly to tenant

**Event Type**: `tenant.member_joined`

**Notification Triggered**: Welcome to tenant email

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "tenant.member_joined",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "tenantId": "tenant_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "tenantId": "tenant_78901234-3456-3456-3456-345678901ghi",
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "email": "user@example.com",
    "roleId": "role_12345678-1234-1234-1234-123456789abc",
    "roleName": "member"
  }
}
```

---

### tenant.member_role_changed

**Description**: Emitted when a member's role is changed. Triggers notification about role change.

**Triggered When**: 
- Admin changes member's role
- Role is updated via API

**Event Type**: `tenant.member_role_changed`

**Notification Triggered**: Role change notification email

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "tenant.member_role_changed",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "tenantId": "tenant_78901234-3456-3456-3456-345678901ghi",
  "userId": "admin_12345678-1234-1234-1234-123456789abc",
  "data": {
    "tenantId": "tenant_78901234-3456-3456-3456-345678901ghi",
    "userId": "user_90123456-4567-4567-4567-456789012jkl",
    "oldRoleId": "role_12345678-1234-1234-1234-123456789abc",
    "oldRoleName": "member",
    "newRoleId": "role_98765432-4321-4321-4321-432109876fed",
    "newRoleName": "admin",
    "changedBy": "admin_12345678-1234-1234-1234-123456789abc"
  }
}
```

---

### tenant.member_removed

**Description**: Emitted when a user is removed from a tenant. Triggers notification.

**Triggered When**: 
- Admin removes member from tenant
- User leaves tenant voluntarily

**Event Type**: `tenant.member_removed`

**Notification Triggered**: 
- Member removal notification (if removed by admin)
- Goodbye notification (if user left voluntarily)

---

### invitation.created

**Description**: Emitted when an invitation is created. Triggers invitation email.

**Triggered When**: 
- Admin creates invitation for new user
- System creates invitation via API

**Event Type**: `invitation.created`

**Notification Triggered**: Invitation email with invitation link

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "invitation.created",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "user-management",
  "tenantId": "tenant_78901234-3456-3456-3456-345678901ghi",
  "userId": "admin_12345678-1234-1234-1234-123456789abc",
  "data": {
    "invitationId": "inv_12345678-1234-1234-1234-123456789abc",
    "tenantId": "tenant_78901234-3456-3456-3456-345678901ghi",
    "email": "newuser@example.com",
    "invitationType": "email",
    "expiresAt": "2025-01-29T10:00:00Z",
    "createdBy": "admin_12345678-1234-1234-1234-123456789abc"
  }
}
```

---

### invitation.accepted

**Description**: Emitted when a user accepts an invitation. Triggers confirmation to inviter.

**Triggered When**: 
- User clicks invitation link and accepts
- User accepts invitation via API

**Event Type**: `invitation.accepted`

**Notification Triggered**: 
- Invitation accepted confirmation (to inviter)
- Welcome notification (to new member)

---

### invitation.expired

**Description**: Emitted when an invitation expires. Can trigger reminder or expiration notification.

**Triggered When**: 
- Invitation expiration date is reached
- System processes expired invitations

**Event Type**: `invitation.expired`

**Notification Triggered**: Invitation expiration notification (optional)

---

### team.members_added

**Description**: Emitted when members are added to a team. Triggers team welcome notification.

**Triggered When**: 
- Admin adds members to team
- Members are added via API

**Event Type**: `team.members_added`

**Notification Triggered**: Team welcome notification

---

## Consumed Events

The User Management module does not consume events that trigger notifications. It only publishes events.

