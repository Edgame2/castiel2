# Role Management API - Quick Reference

## API Endpoints

### List Roles
```bash
GET /api/tenants/:tenantId/roles?includeSystem=true&search=admin&page=1&limit=10
```

### Create Role
```bash
POST /api/tenants/:tenantId/roles
Content-Type: application/json

{
  "name": "content-editor",
  "displayName": "Content Editor",
  "description": "Can create and edit content",
  "permissions": ["users:read:tenant", "settings:read:tenant"]
}
```

### Get Role Details
```bash
GET /api/tenants/:tenantId/roles/:roleId
```

### Update Role
```bash
PATCH /api/tenants/:tenantId/roles/:roleId
Content-Type: application/json

{
  "displayName": "Senior Content Editor",
  "permissions": ["users:read:tenant", "users:create:tenant", "settings:read:tenant"]
}
```

### Delete Role
```bash
DELETE /api/tenants/:tenantId/roles/:roleId
# Returns 204 No Content on success
# Returns 409 Conflict if role has members
```

### List Role Members
```bash
GET /api/tenants/:tenantId/roles/:roleId/members
```

### Add Members to Role
```bash
POST /api/tenants/:tenantId/roles/:roleId/members
Content-Type: application/json

{
  "userIds": ["user-id-1", "user-id-2"]
}
```

### Remove Member from Role
```bash
DELETE /api/tenants/:tenantId/roles/:roleId/members/:userId
```

### Get Permission Catalog
```bash
GET /api/permissions
```

## Frontend Routes

- **List**: `/tenant/roles`
- **Create**: `/tenant/roles/new`
- **Details**: `/tenant/roles/:id`
- **Edit**: `/tenant/roles/:id/edit`

## React Query Hooks

```typescript
import {
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useRoleMembers,
  useAddRoleMembers,
  useRemoveRoleMember,
  usePermissions,
} from '@/hooks/use-roles';

// List roles
const { data, isLoading } = useRoles(tenantId, { 
  includeSystem: true,
  search: 'admin',
  page: 1,
  limit: 10 
});

// Get single role
const { data: role } = useRole(tenantId, roleId);

// Create role
const createMutation = useCreateRole(tenantId);
await createMutation.mutateAsync({
  name: 'editor',
  displayName: 'Editor',
  permissions: ['users:read:tenant']
});

// Update role
const updateMutation = useUpdateRole(tenantId, roleId);
await updateMutation.mutateAsync({
  displayName: 'Senior Editor',
  permissions: ['users:read:tenant', 'users:create:tenant']
});

// Delete role
const deleteMutation = useDeleteRole(tenantId);
await deleteMutation.mutateAsync(roleId);

// Get role members
const { data: members } = useRoleMembers(tenantId, roleId);

// Add members
const addMembersMutation = useAddRoleMembers(tenantId, roleId);
await addMembersMutation.mutateAsync(['user-id-1', 'user-id-2']);

// Remove member
const removeMemberMutation = useRemoveRoleMember(tenantId, roleId);
await removeMemberMutation.mutateAsync('user-id-1');

// Get permissions catalog
const { data: permissions } = usePermissions();
```

## Permission Format

Format: `resource:action:scope`

Examples:
- `users:create:tenant`
- `roles:update:tenant`
- `settings:read:tenant`
- `audit:export:tenant`

## Available Permissions

### User Management
- `users:create:tenant` - Create new users
- `users:read:tenant` - View user information
- `users:update:tenant` - Update user details
- `users:delete:tenant` - Delete users

### Role Management
- `roles:create:tenant` - Create new roles
- `roles:read:tenant` - View role information
- `roles:update:tenant` - Update role details
- `roles:delete:tenant` - Delete roles

### Settings
- `settings:read:tenant` - View tenant settings
- `settings:update:tenant` - Update tenant settings

### Audit Logs
- `audit:read:tenant` - View audit logs
- `audit:export:tenant` - Export audit logs

## Type Definitions

```typescript
interface RoleEntity {
  id: string;
  tenantId: string;
  name: string;              // Internal ID (lowercase, alphanumeric, hyphens)
  displayName: string;        // Human-readable name
  description?: string;
  permissions: string[];      // Array of permission IDs
  isSystem: boolean;          // System roles cannot be edited/deleted
  memberCount?: number;       // Number of users with this role
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

interface RoleCreate {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

interface RoleUpdate {
  displayName?: string;
  description?: string;
  permissions?: string[];
}

interface RoleMember {
  userId: string;
  userEmail: string;
  userName?: string;
  assignedAt: string;
  assignedBy?: string;
}

interface PermissionDefinition {
  id: string;
  name: string;
  resource: string;
  action: string;
  scope: string;
  description: string;
  category: string;
}

interface PermissionCategory {
  name: string;
  description: string;
  permissions: PermissionDefinition[];
}
```

## Error Codes

- **400 Bad Request**: Invalid input data
- **403 Forbidden**: Cannot modify system role
- **404 Not Found**: Role not found
- **409 Conflict**: 
  - Role name already exists
  - Cannot delete role with members
- **500 Internal Server Error**: Server error

## System Role Protection

System roles (where `isSystem: true`) are protected:
- ❌ Cannot update display name, description, or permissions
- ❌ Cannot delete
- ✅ Can view details
- ✅ Can list members
- ❌ Cannot remove members (in most cases)

## Testing with curl

```bash
# Set variables
TENANT_ID="your-tenant-id"
AUTH_TOKEN="your-jwt-token"
API_URL="http://localhost:3002"

# List roles
curl -X GET "$API_URL/api/tenants/$TENANT_ID/roles" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Create role
curl -X POST "$API_URL/api/tenants/$TENANT_ID/roles" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "editor",
    "displayName": "Content Editor",
    "permissions": ["users:read:tenant", "settings:read:tenant"]
  }'

# Get permissions catalog
curl -X GET "$API_URL/api/permissions" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Common Patterns

### Check if role is deletable
```typescript
const canDelete = !role.isSystem && (!role.memberCount || role.memberCount === 0);
```

### Toggle all permissions in a category
```typescript
const categoryPermissionIds = category.permissions.map(p => p.id);
const allSelected = categoryPermissionIds.every(p => selectedPermissions.includes(p));

if (allSelected) {
  // Deselect all
  setPermissions(current => current.filter(p => !categoryPermissionIds.includes(p)));
} else {
  // Select all
  setPermissions(current => [...new Set([...current, ...categoryPermissionIds])]);
}
```

### Validate role name format
```typescript
const roleNameRegex = /^[a-z0-9-]+$/;
const isValid = roleNameRegex.test(roleName);
```

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Role management API fully implemented

#### Implemented Features (✅)

- ✅ Role CRUD operations
- ✅ Role member management
- ✅ Permission catalog
- ✅ API endpoints
- ✅ Frontend routes
- ✅ React Query hooks

#### Known Limitations

- ⚠️ **Director Role Features** - Director role may not be fully implemented
  - **Code Reference:**
    - Director role features may need completion
  - **Recommendation:**
    1. Complete director role implementation
    2. Test director role features
    3. Document director role behavior

### Code References

- **Backend Services:**
  - `apps/api/src/services/auth/role-management.service.ts` - Role management service

- **API Routes:**
  - `/api/v1/role-management/*` - Role management endpoints

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Backend Documentation](../backend/README.md) - Backend implementation
