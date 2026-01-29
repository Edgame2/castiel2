/**
 * Seed Service
 * 
 * Manages seeding of system permissions and organization roles.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';

/**
 * System permission definitions
 */
interface PermissionDefinition {
  code: string;
  module: string;
  resource: string;
  action: string;
  scope: string | null;
  displayName: string;
  description: string | null;
}

/**
 * All system permissions
 */
const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Organizations
  { code: 'organizations.organization.view', module: 'organizations', resource: 'organization', action: 'view', scope: null, displayName: 'View Organization', description: 'View organization details' },
  { code: 'organizations.organization.create', module: 'organizations', resource: 'organization', action: 'create', scope: null, displayName: 'Create Organization', description: 'Create new organizations' },
  { code: 'organizations.organization.update', module: 'organizations', resource: 'organization', action: 'update', scope: null, displayName: 'Update Organization', description: 'Edit organization details' },
  { code: 'organizations.organization.delete', module: 'organizations', resource: 'organization', action: 'delete', scope: null, displayName: 'Delete Organization', description: 'Delete organizations' },
  { code: 'organizations.organization.manage_members', module: 'organizations', resource: 'organization', action: 'manage_members', scope: null, displayName: 'Manage Organization Members', description: 'Add, remove, and manage organization members' },
  
  // Teams
  { code: 'teams.team.view', module: 'teams', resource: 'team', action: 'view', scope: null, displayName: 'View Teams', description: 'View teams' },
  { code: 'teams.team.create', module: 'teams', resource: 'team', action: 'create', scope: null, displayName: 'Create Team', description: 'Create new teams' },
  { code: 'teams.team.update', module: 'teams', resource: 'team', action: 'update', scope: null, displayName: 'Update Team', description: 'Edit teams' },
  { code: 'teams.team.delete', module: 'teams', resource: 'team', action: 'delete', scope: null, displayName: 'Delete Team', description: 'Delete teams' },
  { code: 'teams.team.manage_members', module: 'teams', resource: 'team', action: 'manage_members', scope: null, displayName: 'Manage Team Members', description: 'Add and remove team members' },
  
  // Roles
  { code: 'roles.role.view', module: 'roles', resource: 'role', action: 'view', scope: null, displayName: 'View Roles', description: 'View roles and permissions' },
  { code: 'roles.role.create', module: 'roles', resource: 'role', action: 'create', scope: null, displayName: 'Create Role', description: 'Create custom roles' },
  { code: 'roles.role.update', module: 'roles', resource: 'role', action: 'update', scope: null, displayName: 'Update Role', description: 'Edit roles and permissions' },
  { code: 'roles.role.delete', module: 'roles', resource: 'role', action: 'delete', scope: null, displayName: 'Delete Role', description: 'Delete custom roles' },
  
  // Users
  { code: 'users.user.view', module: 'users', resource: 'user', action: 'view', scope: null, displayName: 'View Users', description: 'View user profiles' },
  { code: 'users.user.invite', module: 'users', resource: 'user', action: 'invite', scope: null, displayName: 'Invite User', description: 'Invite users to the organization' },
  { code: 'users.user.manage', module: 'users', resource: 'user', action: 'manage', scope: null, displayName: 'Manage Users', description: 'Full user management (suspend, reactivate, remove)' },
];

/**
 * Permission codes for each system role
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': [], // Super Admin bypasses all permission checks (isSuperAdmin=true)
  'Admin': [
    'organizations.organization.view',
    'organizations.organization.update',
    'organizations.organization.manage_members',
    'teams.team.create',
    'teams.team.read',
    'teams.team.update',
    'teams.team.delete',
    'teams.team.manage_members',
    'roles.role.create',
    'roles.role.read',
    'roles.role.update',
    'roles.role.delete',
    'users.user.invite',
    'users.user.view',
    'users.user.manage',
  ],
  'Member': [
    'organizations.organization.view',
    'teams.team.view',
    'users.user.view',
  ],
  'Viewer': [
    'organizations.organization.view',
    'teams.team.view',
    'users.user.view',
  ],
};

/**
 * Seed all system permissions
 */
export async function seedSystemPermissions(): Promise<void> {
  const db = getDatabaseClient() as unknown as { permission: { upsert: (args: unknown) => Promise<unknown> } };
  
  log.info('Seeding system permissions', { service: 'user-management' });
  
  for (const perm of SYSTEM_PERMISSIONS) {
    await db.permission.upsert({
      where: { code: perm.code },
      update: {
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope,
        displayName: perm.displayName,
        description: perm.description,
        isSystemPermission: true,
      },
      create: {
        code: perm.code,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope,
        displayName: perm.displayName,
        description: perm.description,
        isSystemPermission: true,
        name: perm.code.replace(/\./g, ':'), // Legacy format
        category: perm.module,
      },
    });
  }
  
  log.info(`Seeded ${SYSTEM_PERMISSIONS.length} system permissions`, { service: 'user-management' });
}

/**
 * Seed system roles for an organization
 */
export async function seedOrganizationRoles(organizationId: string): Promise<void> {
  const db = getDatabaseClient() as unknown as {
    organization: { findUnique: (args: unknown) => Promise<{ name: string } | null> };
    permission: { findMany: (args: unknown) => Promise<{ id: string; code: string }[]> };
    role: { upsert: (args: unknown) => Promise<{ id: string; name: string }> };
    rolePermission: { deleteMany: (args: unknown) => Promise<unknown>; createMany: (args: unknown) => Promise<unknown> };
  };
  
  // Verify organization exists
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
  });
  
  if (!organization) {
    throw new Error(`Organization ${organizationId} not found`);
  }
  
  log.info('Seeding roles for organization', { organizationId, organizationName: organization.name, service: 'user-management' });
  
  // Ensure system permissions are seeded first
  await seedSystemPermissions();
  
  // Get all permissions by code
  const permissionMap = new Map<string, string>();
  const permissions = await db.permission.findMany({
    where: {
      code: { in: SYSTEM_PERMISSIONS.map(p => p.code) },
    },
    select: {
      id: true,
      code: true,
    },
  });
  
  for (const perm of permissions) {
    permissionMap.set(perm.code, perm.id);
  }
  
  // Create or update system roles
  const roles: Record<string, { id: string; name: string }> = {};
  
  for (const roleName of ['Super Admin', 'Admin', 'Member', 'Viewer']) {
    const isSuperAdmin = roleName === 'Super Admin';
    
    const role = await db.role.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: roleName,
        },
      },
      update: {
        isSystemRole: true,
        isCustomRole: false,
        isSuperAdmin,
      },
      create: {
        organizationId,
        name: roleName,
        description: getRoleDescription(roleName),
        isSystemRole: true,
        isCustomRole: false,
        isSuperAdmin,
      },
    });
    
    roles[roleName] = role;
    
    // Assign permissions (Super Admin doesn't need permissions - uses bypass)
    if (!isSuperAdmin && ROLE_PERMISSIONS[roleName]) {
      const permissionCodes = ROLE_PERMISSIONS[roleName];
      
      // Delete existing role permissions
      await db.rolePermission.deleteMany({
        where: { roleId: role.id },
      });
      
      // Create new role permissions
      const rolePermissions = permissionCodes
        .map(code => {
          const permissionId = permissionMap.get(code);
          if (!permissionId) {
            log.warn('Permission not found', { code, service: 'user-management' });
            return null;
          }
          return {
            roleId: role.id,
            permissionId,
            grantedAt: new Date(),
          };
        })
        .filter((rp): rp is { roleId: string; permissionId: string; grantedAt: Date } => rp !== null);
      
      if (rolePermissions.length > 0) {
        await db.rolePermission.createMany({
          data: rolePermissions,
          skipDuplicates: true,
        });
      }
      
      log.info('Assigned permissions to role', { roleName, permissionCount: rolePermissions.length, service: 'user-management' });
    } else if (isSuperAdmin) {
      log.info('Super Admin role created (bypasses all permissions)', { service: 'user-management' });
    }
  }
  
  log.info('Seeded system roles for organization', { organizationId, roleCount: Object.keys(roles).length, service: 'user-management' });
}

/**
 * Get role description
 */
function getRoleDescription(roleName: string): string {
  const descriptions: Record<string, string> = {
    'Super Admin': 'Super Administrator with full access to all features and bypasses all permission checks',
    'Admin': 'Administrator with full access to manage users, roles, projects, and organization settings',
    'Member': 'Standard member with access to create and manage projects and tasks',
    'Viewer': 'Read-only access to view projects, tasks, and teams',
  };
  
  return descriptions[roleName] || `${roleName} role`;
}

