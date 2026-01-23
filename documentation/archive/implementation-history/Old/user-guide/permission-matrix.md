# Permission Matrix

This document provides a comprehensive matrix of all permissions and which roles have access to them.

## System Roles

| Permission | Super Admin | Admin | Member | Viewer |
|------------|-------------|-------|--------|--------|
| **Projects** |
| `projects.project.create` | ✅ | ✅ | ✅ | ❌ |
| `projects.project.read` | ✅ | ✅ | ✅ | ✅ |
| `projects.project.update` | ✅ | ✅ | ✅ | ❌ |
| `projects.project.delete` | ✅ | ✅ | ❌ | ❌ |
| **Tasks** |
| `projects.task.create` | ✅ | ✅ | ✅ | ❌ |
| `projects.task.read` | ✅ | ✅ | ✅ | ✅ |
| `projects.task.update` | ✅ | ✅ | ✅ | ❌ |
| `projects.task.delete` | ✅ | ✅ | ❌ | ❌ |
| `projects.task.assign` | ✅ | ✅ | ✅ | ❌ |
| **Users** |
| `users.user.invite` | ✅ | ✅ | ❌ | ❌ |
| `users.user.read` | ✅ | ✅ | ✅ | ✅ |
| `users.user.update` | ✅ | ✅ | ❌ | ❌ |
| `users.user.delete` | ✅ | ✅ | ❌ | ❌ |
| `users.user.suspend` | ✅ | ✅ | ❌ | ❌ |
| **Roles** |
| `roles.role.create` | ✅ | ❌ | ❌ | ❌ |
| `roles.role.read` | ✅ | ✅ | ✅ | ✅ |
| `roles.role.update` | ✅ | ❌ | ❌ | ❌ |
| `roles.role.delete` | ✅ | ❌ | ❌ | ❌ |
| **Organizations** |
| `organizations.organization.read` | ✅ | ✅ | ✅ | ✅ |
| `organizations.organization.update` | ✅ | ✅ | ❌ | ❌ |
| `organizations.organization.delete` | ✅ | ❌ | ❌ | ❌ |
| `organizations.organization.settings` | ✅ | ✅ | ❌ | ❌ |
| **Audit** |
| `audit.logs.read` | ✅ | ✅ | ❌ | ❌ |

## Permission Scopes

### All Scope
Access to all resources in the organization, regardless of ownership.

**Example**: `projects.project.read` with `all` scope can view all projects.

### Organization Scope
Access to all resources within the organization context.

**Example**: `users.user.read` with `organization` scope can view all organization members.

### Team Scope
Access to resources within assigned teams.

**Example**: `projects.project.read` with `team` scope can view projects in user's teams.

### Own Scope
Access only to resources created by the user.

**Example**: `projects.project.update` with `own` scope can only update own projects.

## Wildcard Permissions

### Full Wildcard (`*`)
Grants all permissions. Only available to Super Admin.

### Module Wildcard (`module.*`)
Grants all permissions within a module.

**Examples:**
- `projects.*` - All project and task permissions
- `users.*` - All user management permissions
- `roles.*` - All role management permissions

### Resource Wildcard (`module.resource.*`)
Grants all permissions for a specific resource type.

**Examples:**
- `projects.project.*` - All project CRUD operations
- `projects.task.*` - All task operations
- `users.user.*` - All user management operations

## Custom Role Examples

### Project Manager
```
- projects.project.create
- projects.project.read
- projects.project.update
- projects.task.create
- projects.task.read
- projects.task.update
- projects.task.assign
```

### Developer
```
- projects.project.read
- projects.task.create
- projects.task.read
- projects.task.update
```

### Guest
```
- projects.project.read
- projects.task.read
```

## Permission Inheritance

### Super Admin
- Has all permissions (`*`)
- Cannot be restricted
- Bypasses all permission checks

### Admin
- Has most permissions except:
  - Role management (create/update/delete)
  - Organization deletion
- Can manage users and projects

### Member
- Standard project and task permissions
- Cannot manage users or roles
- Can create and update own content

### Viewer
- Read-only access
- Cannot create or modify anything
- Can view projects and tasks

## Resource-Level Permissions

Some permissions can be granted at the resource level (optional feature):

### Project-Level Permissions
- `owner` - Full control over the project
- `editor` - Can edit project and tasks
- `viewer` - Read-only access

### Example
A user might not have `projects.project.read` at the role level, but could have `viewer` permission on a specific project.

## Permission Checking

### How Permissions Are Checked

1. **Super Admin Check**: If user is Super Admin, grant access
2. **Role Permissions**: Check user's role permissions
3. **Wildcard Resolution**: Resolve wildcards to specific permissions
4. **Scope Check**: Verify permission scope (all/organization/team/own)
5. **Resource-Level**: Check resource-specific permissions (if applicable)

### Permission Denial

If a permission check fails:
- API returns `403 Forbidden`
- UI hides or disables the action
- Audit log records the denied attempt

## Best Practices

1. **Principle of Least Privilege**: Grant minimum permissions needed
2. **Regular Reviews**: Audit permissions quarterly
3. **Document Custom Roles**: Explain why permissions were granted
4. **Test Permissions**: Verify permissions work as expected
5. **Use Scopes**: Leverage scopes for fine-grained control

## Troubleshooting

### User Cannot Perform Action

1. Check user's role
2. Verify role has the required permission
3. Check permission scope (own vs all)
4. Verify resource-level permissions (if applicable)
5. Check if user is Super Admin (should have all permissions)

### Permission Not Working

1. Verify permission code is correct
2. Check if permission is assigned to role
3. Ensure scope matches resource access needs
4. Verify user's membership is active
5. Check organization context is correct

## Permission Reference

See [API Documentation](../../server/src/docs/openapi.yaml) for complete permission list and codes.
