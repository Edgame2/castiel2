/**
 * Seed Service
 * 
 * Manages seeding of system permissions and organization roles.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient, getContainer } from '@coder/shared';
import { randomUUID } from 'crypto';
import { log } from '../utils/logger';

const USER_ORGANIZATIONS = 'user_organizations';
const USER_USERS = 'user_users';
const USER_ROLES = 'user_roles';
const USER_MEMBERSHIPS = 'user_memberships';
const REVIMIZE_SLUG = 'revimize';
const REVIMIZE_NAME = 'Revimize';
const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

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

/**
 * Seed Revimize tenant and promote existing user to Super Admin (isEmailVerified: true).
 * Runs when SEED_SUPER_ADMIN_EMAIL is set. Uses Cosmos getContainer for reliability.
 * - Ensures organization "Revimize" (slug: revimize) exists
 * - Ensures Super Admin role exists for that org (direct Cosmos create if missing)
 * - Finds user by email, sets isEmailVerified: true and tenantId to Revimize org id
 * - Creates organizationMembership for that user with Super Admin role
 */
export async function seedRevimizeSuperAdmin(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim();
  if (!email) {
    return;
  }

  try {
    const orgs = getContainer(USER_ORGANIZATIONS);
    const users = getContainer(USER_USERS);
    const roles = getContainer(USER_ROLES);
    const memberships = getContainer(USER_MEMBERSHIPS);

    // 1. Find or create Revimize organization (partitionKey = organizationId per architecture)
    const { resources: existingOrgs } = await orgs.items
      .query({ query: 'SELECT * FROM c WHERE c.slug = @slug', parameters: [{ name: '@slug', value: REVIMIZE_SLUG }] })
      .fetchAll();
    let orgId: string;
    if (existingOrgs.length > 0) {
      orgId = (existingOrgs[0] as { id: string }).id;
      log.info('Revimize organization already exists', { orgId, service: 'user-management' });
    } else {
      orgId = randomUUID();
      await orgs.items.create({
        id: orgId,
        partitionKey: orgId,
        name: REVIMIZE_NAME,
        slug: REVIMIZE_SLUG,
      } as Record<string, unknown>);
      log.info('Created Revimize organization', { orgId, service: 'user-management' });
    }

    // 2. Ensure Super Admin role exists for Revimize org (direct Cosmos; roles partitionKey = tenantId = orgId)
    const { resources: roleListExisting } = await roles.items
      .query({
        query: 'SELECT * FROM c WHERE c.organizationId = @orgId AND c.name = @name',
        parameters: [
          { name: '@orgId', value: orgId },
          { name: '@name', value: SUPER_ADMIN_ROLE_NAME },
        ],
      })
      .fetchAll();
    let superAdminRoleId: string;
    if (roleListExisting.length > 0) {
      superAdminRoleId = (roleListExisting[0] as { id: string }).id;
    } else {
      superAdminRoleId = randomUUID();
      await roles.items.create({
        id: superAdminRoleId,
        partitionKey: orgId,
        organizationId: orgId,
        name: SUPER_ADMIN_ROLE_NAME,
        description: getRoleDescription(SUPER_ADMIN_ROLE_NAME),
        isSystemRole: true,
        isSuperAdmin: true,
      } as Record<string, unknown>);
      log.info('Created Super Admin role for Revimize', { orgId, roleId: superAdminRoleId, service: 'user-management' });
    }

    // 3. Find user by email (cross-partition)
    const { resources: userList } = await users.items
      .query({ query: 'SELECT * FROM c WHERE c.email = @email', parameters: [{ name: '@email', value: email }] })
      .fetchAll();
    const user = userList[0] as (Record<string, unknown> & { id: string; tenantId?: string; partitionKey?: string }) | undefined;
    if (!user) {
      log.warn('Seed super admin: user not found by email', { email, service: 'user-management' });
      return;
    }
    const userId = user.id;
    const currentPartition = (user.tenantId ?? user.partitionKey ?? 'default') as string;

    // 4. Update user: isEmailVerified true, tenantId = orgId (Cosmos: partition key must match target partition)
    if (currentPartition === orgId) {
      const updatedSamePartition = { ...user, isEmailVerified: true, tenantId: orgId, updatedAt: new Date() };
      await users.item(userId, currentPartition).replace(updatedSamePartition as Record<string, unknown>);
      log.info('Updated user: isEmailVerified and tenantId (same partition)', { userId, email, orgId, service: 'user-management' });
    } else {
      // Update in place so replace succeeds (partition key must match)
      const updatedInPlace = { ...user, isEmailVerified: true, tenantId: currentPartition, updatedAt: new Date() };
      await users.item(userId, currentPartition).replace(updatedInPlace as Record<string, unknown>);
      // Create in Revimize partition and remove from old partition so there is a single canonical copy
      const userInNewPartition = { ...user, id: userId, tenantId: orgId, isEmailVerified: true, updatedAt: new Date() };
      await users.items.create(userInNewPartition as Record<string, unknown>);
      await users.item(userId, currentPartition).delete();
      log.info('Updated user: isEmailVerified, migrated to Revimize partition', { userId, email, orgId, service: 'user-management' });
    }

    // 5. Create membership if not exists (partitionKey = organizationId)
    const { resources: existingMemberships } = await memberships.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.organizationId = @orgId',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@orgId', value: orgId },
        ],
      })
      .fetchAll();
    if (existingMemberships.length > 0) {
      log.info('User already has membership in Revimize', { userId, orgId, service: 'user-management' });
      return;
    }
    await memberships.items.create(
      {
        id: randomUUID(),
        partitionKey: orgId,
        userId,
        organizationId: orgId,
        roleId: superAdminRoleId,
        status: 'active',
        joinedAt: new Date(),
      } as Record<string, unknown>
    );
    log.info('Seeded Revimize super admin: membership created', { userId, email, orgId, service: 'user-management' });
  } catch (err) {
    log.error('Seed Revimize super admin failed', { error: err, email, service: 'user-management' });
    throw err;
  }
}

