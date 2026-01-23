# Admin Guide

This guide covers advanced administration features for Super Admins and Admins.

## Table of Contents

- [Organization Management](#organization-management)
- [Role Management](#role-management)
- [User Management](#user-management)
- [Audit Logs](#audit-logs)
- [Security Settings](#security-settings)

## Organization Management

### Creating Organizations

As a Super Admin, you can create multiple organizations:

1. Navigate to **Organizations** → **Create Organization**
2. Enter organization details
3. You'll automatically become the owner and Super Admin

### Updating Organization Settings

1. Navigate to **Settings** → **Organization**
2. Update:
   - Name and description
   - Logo
   - Member limit
   - Feature flags
   - Branding settings

### Deactivating Organizations

Only organization owners can deactivate organizations:

1. Navigate to **Settings** → **Organization**
2. Scroll to "Danger Zone"
3. Click "Deactivate Organization"
4. Confirm the action

**Note**: Deactivation is soft-delete. Data is preserved and can be reactivated.

## Role Management

### Creating Custom Roles

1. Navigate to **Settings** → **Roles & Permissions**
2. Click "Create Role"
3. Configure:
   - **Name**: Unique role name (cannot use system role names)
   - **Description**: Explain the role's purpose
   - **Permissions**: Select from available permissions

**Best Practices:**
- Use descriptive names (e.g., "Project Manager", "Developer")
- Document the role's purpose in the description
- Start with minimal permissions and add as needed
- Review permissions regularly

### Cloning Roles

To create a similar role:

1. Find the role you want to clone
2. Click "..." → "Clone"
3. Enter a new name
4. Modify permissions as needed
5. Click "Create"

### Updating Roles

1. Navigate to **Settings** → **Roles & Permissions**
2. Find the role you want to update
3. Click "Edit"
4. Modify name, description, or permissions
5. Click "Save"

**Note**: Changes apply to all users with that role immediately.

### Deleting Roles

1. Navigate to **Settings** → **Roles & Permissions**
2. Find the role you want to delete
3. Click "..." → "Delete"
4. Confirm the action

**Restrictions:**
- Cannot delete system roles
- Cannot delete roles with assigned users
- Must reassign users before deletion

## User Management

### Bulk Operations

#### Bulk Role Changes

1. Navigate to **User Management** → **Members**
2. Select multiple users (checkboxes)
3. Click "Bulk Actions" → "Change Role"
4. Select the new role
5. Click "Apply"

#### Bulk Invitations

See [Getting Started Guide](./getting-started.md#bulk-invitations)

### Advanced User Actions

#### Force Password Reset

1. Navigate to **User Management** → **Members**
2. Find the user
3. Click "..." → "Force Password Reset"
4. User will receive an email with reset instructions

#### View User Sessions

1. Navigate to **User Management** → **Members**
2. Find the user
3. Click "..." → "View Sessions"
4. See all active sessions
5. Optionally revoke sessions

#### Export User List

1. Navigate to **User Management** → **Members**
2. Click "Export" (CSV format)
3. Includes: name, email, role, status, joined date

## Audit Logs

### Viewing Audit Logs

1. Navigate to **Settings** → **Audit Logs**
2. Filter by:
   - User
   - Action type
   - Resource type
   - Date range
3. View detailed logs with:
   - Who performed the action
   - What changed
   - When it happened
   - IP address and user agent

### Audit Log Retention

- **Active logs**: 90 days in database
- **Archived logs**: Moved to S3 after 90 days
- **Compliance**: Logs are immutable and cannot be deleted

### Exporting Audit Logs

1. Navigate to **Settings** → **Audit Logs**
2. Apply filters
3. Click "Export"
4. Download CSV or JSON format

## Security Settings

### Password Policies

Configure password requirements:

1. Navigate to **Settings** → **Security**
2. Set:
   - Minimum length (default: 8)
   - Require uppercase, lowercase, numbers, symbols
   - Password history (prevent reuse)
   - Maximum age (force periodic changes)

### Account Lockout

Configure account lockout policies:

1. Navigate to **Settings** → **Security**
2. Set:
   - Maximum failed login attempts (default: 5)
   - Lockout duration (default: 30 minutes)
   - Enable automatic unlock

### Session Management

Configure session settings:

1. Navigate to **Settings** → **Security**
2. Set:
   - Session timeout (default: 24 hours)
   - Require re-authentication for sensitive actions
   - Maximum concurrent sessions per user

### Two-Factor Authentication (Coming Soon)

Enable 2FA for enhanced security:

1. Navigate to **Settings** → **Security**
2. Enable "Require 2FA for Admins"
3. Users will be prompted to set up 2FA

## Member Limits

### Setting Member Limits

1. Navigate to **Settings** → **Organization**
2. Set "Member Limit"
3. System will prevent new invitations when limit is reached

### Checking Member Count

1. Navigate to **Settings** → **Organization**
2. View "Current Members" count
3. See "Member Limit" status

## Best Practices

1. **Regular Audits**: Review audit logs weekly
2. **Role Reviews**: Audit user roles quarterly
3. **Security Updates**: Keep security settings current
4. **Documentation**: Document custom roles and their purposes
5. **Backup**: Export user lists and audit logs regularly
6. **Training**: Train Admins on security best practices

## Troubleshooting

### Organization at Member Limit

- Increase member limit in settings
- Remove inactive members
- Contact support for limit increases

### Cannot Delete Role

- Ensure no users are assigned to the role
- Reassign users to another role first
- System roles cannot be deleted

### Audit Logs Not Showing

- Check date range filters
- Verify you have permission to view audit logs
- Check if logs have been archived (contact support)

## Advanced Features

### API Access

Admins can use the API for automation:

- See [API Documentation](../../server/src/docs/openapi.yaml)
- Generate API tokens in **Settings** → **API Keys**
- Use tokens for programmatic access

### Webhooks (Coming Soon)

Configure webhooks for events:

- User invitations
- Role changes
- User removals
- Security events

## Support

For advanced administration needs:

- Email: admin-support@coder.com
- Documentation: [Developer Guide](../developer/)
- API Docs: [OpenAPI Spec](../../server/src/docs/openapi.yaml)
