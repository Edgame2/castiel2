# Getting Started with User Management

Welcome to the Coder User Management System! This guide will help you get started with managing users, organizations, roles, and permissions.

## Table of Contents

- [Creating Your First Organization](#creating-your-first-organization)
- [Inviting Users](#inviting-users)
- [Understanding Roles](#understanding-roles)
- [Managing Permissions](#managing-permissions)
- [Switching Organizations](#switching-organizations)

## Creating Your First Organization

When you first register or log in, you'll be prompted to create an organization. The organization creator automatically becomes the **Super Admin** with full access.

### Steps:

1. Click "Create Organization" or navigate to the organization creation page
2. Enter your organization name (e.g., "Acme Corp")
3. Optionally provide a description
4. Click "Create"

You'll automatically be assigned the Super Admin role and can start inviting team members.

## Inviting Users

As a Super Admin or Admin, you can invite users to your organization.

### Single Invitation:

1. Navigate to **User Management** → **Invitations**
2. Click "Invite User"
3. Enter the user's email address
4. Select a role (Member, Viewer, or custom role)
5. Optionally add a personal message
6. Click "Send Invitation"

The user will receive an email with an invitation link. They can accept the invitation even if they don't have an account yet (a new account will be created).

### Bulk Invitations:

1. Navigate to **User Management** → **Invitations**
2. Click "Bulk Invite"
3. Upload a CSV file or enter emails manually
4. Select a default role for all invitations
5. Click "Send Invitations"

**CSV Format:**
```csv
email,roleId
user1@example.com,role-member-id
user2@example.com,role-member-id
```

## Understanding Roles

### System Roles

The system includes four built-in roles that cannot be modified:

- **Super Admin**: Full access to everything in the organization
- **Admin**: Can manage users, roles, and most settings (cannot delete organization)
- **Member**: Standard user with project access
- **Viewer**: Read-only access to projects and resources

### Custom Roles

Super Admins can create custom roles with specific permissions:

1. Navigate to **Settings** → **Roles & Permissions**
2. Click "Create Role"
3. Enter role name and description
4. Select permissions from the list
5. Click "Create Role"

**Permission Categories:**
- **Projects**: Create, read, update, delete projects
- **Tasks**: Manage tasks within projects
- **Teams**: Create and manage teams
- **Users**: Manage organization members
- **Roles**: Create and manage roles
- **Settings**: Modify organization settings

## Managing Permissions

### Permission Scopes

Permissions can have different scopes:

- **All**: Access to all resources in the organization
- **Organization**: Access to all resources within the organization
- **Team**: Access to resources within assigned teams
- **Own**: Access only to resources you created

### Wildcard Permissions

You can use wildcards for bulk permission assignment:

- `projects.*` - All project permissions
- `projects.project.*` - All project CRUD operations
- `*` - All permissions (Super Admin only)

## Switching Organizations

If you belong to multiple organizations, you can switch between them:

1. Click your profile icon in the top-right
2. Select "Switch Organization"
3. Choose the organization you want to switch to

Your permissions and access will change based on your role in the selected organization.

## Common Tasks

### Changing a User's Role

1. Navigate to **User Management** → **Members**
2. Find the user you want to modify
3. Click the "..." menu next to their name
4. Select "Change Role"
5. Choose the new role
6. Click "Save"

**Note**: You cannot change the role of the last Super Admin in an organization.

### Suspending a User

1. Navigate to **User Management** → **Members**
2. Find the user you want to suspend
3. Click the "..." menu
4. Select "Suspend"
5. Optionally provide a reason
6. Click "Confirm"

Suspended users cannot access the organization but their data is preserved.

### Reactivating a User

1. Navigate to **User Management** → **Members**
2. Filter by "Suspended" status
3. Find the user you want to reactivate
4. Click the "..." menu
5. Select "Reactivate"
6. Click "Confirm"

### Removing a User

1. Navigate to **User Management** → **Members**
2. Find the user you want to remove
3. Click the "..." menu
4. Select "Remove from Organization"
5. Click "Confirm"

**Note**: You cannot remove yourself or the last Super Admin.

## Best Practices

1. **Start with System Roles**: Use built-in roles (Member, Viewer) for most users
2. **Create Custom Roles Sparingly**: Only create custom roles when system roles don't fit
3. **Regular Audits**: Periodically review user roles and permissions
4. **Document Custom Roles**: Add descriptions to custom roles explaining their purpose
5. **Limit Super Admins**: Only assign Super Admin to trusted users who need full access

## Troubleshooting

### User Cannot Access Organization

- Check if the user's membership is active
- Verify the user's role has the necessary permissions
- Ensure the user has accepted their invitation

### Cannot Change Role

- Verify you have permission to manage roles (Super Admin or Admin)
- Check if the role is a system role (cannot be modified)
- Ensure the user is not the last Super Admin

### Invitation Not Received

- Check spam/junk folder
- Verify email address is correct
- Resend invitation (max 5 resends allowed)
- Check if invitation has expired (7 days default)

## Need Help?

- Check the [Admin Guide](./admin-guide.md) for advanced features
- Review the [Permission Matrix](./permission-matrix.md) for detailed permissions
- See [Backend Authentication Module](../modules/backend/auth/) for technical details
