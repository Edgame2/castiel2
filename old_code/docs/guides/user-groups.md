# 👥 User Groups

> Organize users into groups for easier permission management. Groups can be managed manually or synced from SSO providers.

---

## Table of Contents

1. [Overview](#overview)
2. [Group Types](#group-types)
3. [Manual Groups](#manual-groups)
4. [SSO Groups](#sso-groups)
5. [Group Permissions](#group-permissions)
6. [API Reference](#api-reference)

---

## Overview

User Groups provide a way to organize users and assign permissions collectively. Groups are used for:

- **Dashboard access** - Share dashboards with entire teams
- **Feature access** - Control feature visibility by group
- **Data access** - Filter data based on group membership

### Key Features

| Feature | Description |
|---------|-------------|
| Manual Groups | Tenant Admin creates and manages manually |
| SSO Groups | Auto-sync from Azure AD, Okta, Google, SAML |
| Nested Permissions | Groups inherit from roles, users override groups |
| Audit Trail | Track membership changes |

---

## Group Types

### Source Types

| Source | Description | Management |
|--------|-------------|------------|
| `manual` | Created by Tenant Admin | Full control over membership |
| `sso` | Synced from SSO provider | Membership managed externally |

### Group Data Model

```typescript
interface UserGroup {
  id: string;
  tenantId: string;
  
  // Display
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  
  // Source
  source: 'manual' | 'sso';
  
  // SSO configuration (for source = 'sso')
  ssoConfig?: {
    providerId: string;
    externalGroupId: string;
    claimPath: string;
    syncEnabled: boolean;
    lastSyncAt?: Date;
  };
  
  // Members (for source = 'manual')
  memberUserIds?: string[];
  
  // Stats
  memberCount: number;
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}
```

---

## Manual Groups

### Creating Groups

Tenant Admins can create groups and assign members.

```http
POST /api/groups
Content-Type: application/json

{
  "name": "Sales Team",
  "description": "Sales department members",
  "color": "#3B82F6",
  "memberUserIds": ["user-1", "user-2", "user-3"]
}
```

### Managing Members

```http
# Add members
POST /api/groups/:id/members
{ "userIds": ["user-4", "user-5"] }

# Remove members
DELETE /api/groups/:id/members
{ "userIds": ["user-1"] }

# Replace all members
PUT /api/groups/:id/members
{ "userIds": ["user-2", "user-3", "user-4"] }
```

---

## SSO Groups

### Overview

SSO groups are automatically synced from identity providers. When users log in, their group memberships are updated based on claims in their authentication token.

### Supported Providers

| Provider | Claim Name | Format |
|----------|------------|--------|
| Azure AD | `groups` | Array of group IDs |
| Okta | `groups` | Array of group names |
| Google Workspace | `groups` | Array of group emails |
| SAML 2.0 | Configurable | Depends on IdP |
| OIDC | `groups` or custom | Array or comma-separated |

### Configuration

Tenant Admin configures SSO group mapping:

```typescript
interface SSOGroupMappingConfig {
  tenantId: string;
  providerId: string;
  providerType: 'azure_ad' | 'okta' | 'google' | 'saml' | 'oidc';
  
  // Claim configuration
  groupClaim: {
    claimName: string;           // e.g., 'groups', 'roles'
    claimType: 'array' | 'string';
    separator?: string;          // For string type (e.g., ',')
  };
  
  // Mapping rules
  mappings: SSOGroupMapping[];
  
  // Auto-create
  autoCreateGroups: boolean;
  autoCreatePrefix?: string;     // e.g., 'SSO: '
  
  // Sync behavior
  syncOnLogin: boolean;
  syncSchedule?: string;         // Cron expression
}

interface SSOGroupMapping {
  externalGroupId: string;       // ID from SSO provider
  externalGroupName?: string;    // For display
  
  // Target
  platformGroupId?: string;      // Map to existing group
  createGroup?: {                // Or create new group
    name: string;
    description?: string;
  };
  
  addOnly: boolean;              // Only add, never remove
}
```

### Azure AD Example

```typescript
const azureConfig: SSOGroupMappingConfig = {
  tenantId: 'tenant-123',
  providerId: 'azure-ad-main',
  providerType: 'azure_ad',
  
  groupClaim: {
    claimName: 'groups',
    claimType: 'array'
  },
  
  mappings: [
    {
      externalGroupId: '12345-azure-group-id',
      externalGroupName: 'Sales Team',
      platformGroupId: 'existing-sales-group'
    },
    {
      externalGroupId: '67890-azure-group-id',
      externalGroupName: 'Engineering',
      createGroup: {
        name: 'Engineering',
        description: 'Synced from Azure AD'
      }
    }
  ],
  
  autoCreateGroups: true,
  autoCreatePrefix: 'AD: ',
  syncOnLogin: true
};
```

### Okta Example

```typescript
const oktaConfig: SSOGroupMappingConfig = {
  tenantId: 'tenant-456',
  providerId: 'okta-main',
  providerType: 'okta',
  
  groupClaim: {
    claimName: 'groups',
    claimType: 'array'
  },
  
  mappings: [
    {
      externalGroupId: 'Administrators',
      platformGroupId: 'admin-group'
    }
  ],
  
  autoCreateGroups: true,
  syncOnLogin: true
};
```

### Sync Behavior

```
User Login
    │
    ▼
Extract groups from token
    │
    ▼
For each external group:
    │
    ├─ Check mapping rules
    │   ├─ Has explicit mapping? → Use mapped group
    │   └─ No mapping & autoCreate? → Create new group
    │
    └─ Update user's group membership
        ├─ Add to mapped/created groups
        └─ Remove from groups not in token (if !addOnly)
    │
    ▼
User session includes group IDs
```

---

## Group Permissions

### Permission Hierarchy

```
Role Permissions (lowest priority)
         │
         ▼
Group Permissions
         │
         ▼
User Permissions (highest priority)
```

When checking permissions:
1. Check user's direct permissions
2. Check user's group permissions
3. Check user's role permissions
4. Take the **highest** permission level found

### Dashboard Example

```typescript
interface DashboardPermissions {
  visibility: 'private' | 'tenant' | 'public';
  
  // Role-based
  roles: {
    role: string;
    permission: 'view' | 'interact' | 'customize' | 'edit' | 'admin';
  }[];
  
  // Group-based
  groups: {
    groupId: string;
    permission: 'view' | 'interact' | 'customize' | 'edit' | 'admin';
  }[];
  
  // User-specific
  users: {
    userId: string;
    permission: 'view' | 'interact' | 'customize' | 'edit' | 'admin';
  }[];
}
```

### Resolution Example

```typescript
function resolvePermission(
  userId: string,
  permissions: DashboardPermissions
): PermissionLevel {
  const levels = [];
  
  // 1. Check direct user permission
  const userPerm = permissions.users.find(u => u.userId === userId);
  if (userPerm) levels.push(userPerm.permission);
  
  // 2. Check group permissions
  const userGroups = await getUserGroups(userId);
  for (const group of userGroups) {
    const groupPerm = permissions.groups.find(g => g.groupId === group.id);
    if (groupPerm) levels.push(groupPerm.permission);
  }
  
  // 3. Check role permissions
  const userRoles = await getUserRoles(userId);
  for (const role of userRoles) {
    const rolePerm = permissions.roles.find(r => r.role === role);
    if (rolePerm) levels.push(rolePerm.permission);
  }
  
  // Return highest level
  return getHighestPermission(levels);
}
```

---

## API Reference

### Group Management

```http
# List all groups
GET /api/groups
Query: ?source=manual|sso&search=...&page=1&limit=20

# Get specific group
GET /api/groups/:id

# Create group (manual only)
POST /api/groups
Body: {
  "name": "Team Name",
  "description": "Optional description",
  "color": "#hex",
  "memberUserIds": ["user-1", "user-2"]
}

# Update group
PATCH /api/groups/:id
Body: {
  "name": "New Name",
  "description": "Updated description"
}

# Delete group
DELETE /api/groups/:id
```

### Member Management

```http
# Get group members
GET /api/groups/:id/members
Query: ?page=1&limit=20

# Add members
POST /api/groups/:id/members
Body: { "userIds": ["user-1", "user-2"] }

# Remove members
DELETE /api/groups/:id/members
Body: { "userIds": ["user-1"] }
```

### SSO Configuration

```http
# Get SSO group mapping config
GET /api/tenant/sso/group-mapping

# Update SSO group mapping config
PATCH /api/tenant/sso/group-mapping
Body: {
  "groupClaim": { "claimName": "groups", "claimType": "array" },
  "mappings": [...],
  "autoCreateGroups": true,
  "syncOnLogin": true
}

# Test SSO token parsing
POST /api/tenant/sso/group-mapping/test
Body: { "testToken": "eyJ..." }
Response: { "extractedGroups": ["group1", "group2"] }

# Force sync all SSO groups
POST /api/tenant/sso/group-mapping/sync
```

### User Group Membership

```http
# Get user's groups
GET /api/users/:userId/groups

# Check if user is in group
GET /api/users/:userId/groups/:groupId/membership
Response: { "isMember": true, "source": "sso" }
```

---

## Related Documentation

- [Dashboard Permissions](../features/dashboard/README.md#permissions-model)
- [SSO Configuration](./authentication.md)
- [Role-Based Access Control](./authentication.md#rbac)

---

**Last Updated**: January 2025  
**Version**: 1.0.0

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Mostly Complete** - User groups system implemented

#### Implemented Features (✅)

- ✅ Manual group management
- ✅ SSO group sync
- ✅ Group permissions
- ✅ API endpoints
- ✅ Group data model

#### Known Limitations

- ⚠️ **SSO Group Sync** - SSO group sync may not be fully automated
  - **Code Reference:**
    - SSO group sync may need verification
  - **Recommendation:**
    1. Verify SSO group sync implementation
    2. Test sync scenarios
    3. Document sync behavior

- ⚠️ **Group Permissions** - Group permissions may not be fully integrated
  - **Recommendation:**
    1. Verify group permission integration
    2. Test permission resolution
    3. Document permission behavior

### Code References

- **Backend Services:**
  - `apps/api/src/services/auth/role-management.service.ts` - Role and group management
  - Group-related services may need review

- **API Routes:**
  - `/api/v1/groups/*` - Group management endpoints

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Authentication Guide](./authentication.md) - SSO configuration
- [Dashboard System](../features/dashboard/README.md) - Dashboard permissions











