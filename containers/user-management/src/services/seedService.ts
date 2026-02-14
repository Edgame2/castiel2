/**
 * Seed Service
 * 
 * Manages seeding of system permissions and tenant roles.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient, getContainer } from '@coder/shared';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { log } from '../utils/logger';

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
  { code: 'users.user.invite', module: 'users', resource: 'user', action: 'invite', scope: null, displayName: 'Invite User', description: 'Invite users to the tenant' },
  { code: 'users.user.manage', module: 'users', resource: 'user', action: 'manage', scope: null, displayName: 'Manage Users', description: 'Full user management (suspend, reactivate, remove)' },

  // SSO (tenant-scoped; auth service enforces)
  { code: 'tenants.sso.manage', module: 'tenants', resource: 'sso', action: 'manage', scope: null, displayName: 'Manage SSO', description: 'Configure and manage tenant SSO (SAML, etc.)' },
  { code: 'organizations.sso.manage', module: 'organizations', resource: 'sso', action: 'manage', scope: null, displayName: 'Manage SSO (deprecated)', description: 'Deprecated: use tenants.sso.manage. For org-scoped SSO routes until removal.' },
];

/**
 * Permission codes for each system role
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': [], // Super Admin bypasses all permission checks (isSuperAdmin=true)
  'Admin': [
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
    'tenants.sso.manage',
    'organizations.sso.manage', // deprecated; keep for backward compat until org SSO routes removed
  ],
  'Member': [
    'teams.team.view',
    'users.user.view',
  ],
  'Viewer': [
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
 * Seed system roles for a tenant
 */
export async function seedTenantRoles(tenantId: string): Promise<void> {
  const db = getDatabaseClient() as unknown as {
    permission: { findMany: (args: unknown) => Promise<{ id: string; code: string }[]> };
    role: { upsert: (args: unknown) => Promise<{ id: string; name: string }> };
    rolePermission: { deleteMany: (args: unknown) => Promise<unknown>; createMany: (args: unknown) => Promise<unknown> };
  };

  log.info('Seeding roles for tenant', { tenantId, service: 'user-management' });
  
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
        tenantId_name: {
          tenantId,
          name: roleName,
        },
      },
      update: {
        isSystemRole: true,
        isCustomRole: false,
        isSuperAdmin,
      },
      create: {
        tenantId,
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
  
  log.info('Seeded system roles for tenant', { tenantId, roleCount: Object.keys(roles).length, service: 'user-management' });
}

/**
 * Get role description
 */
function getRoleDescription(roleName: string): string {
  const descriptions: Record<string, string> = {
    'Super Admin': 'Super Administrator with full access to all features and bypasses all permission checks',
    'Admin': 'Administrator with full access to manage users, roles, projects, and tenant settings',
    'Member': 'Standard member with access to create and manage projects and tasks',
    'Viewer': 'Read-only access to view projects, tasks, and teams',
  };
  
  return descriptions[roleName] || `${roleName} role`;
}

/**
 * Seed Revimize tenant and promote user to Super Admin.
 * Runs when SEED_SUPER_ADMIN_EMAIL is set. Uses Cosmos getContainer for reliability.
 * - Uses SEED_DEFAULT_TENANT_ID or a new UUID as default tenant
 * - Ensures Super Admin role exists for that tenant
 * - Finds user by email, or creates user if SEED_SUPER_ADMIN_PASSWORD is set
 * - Sets isEmailVerified: true, tenantId to default tenant id
 * - Creates tenant membership with Super Admin role
 */
export async function seedRevimizeSuperAdmin(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD?.trim();
  if (!email) {
    log.info('Seed skipped: SEED_SUPER_ADMIN_EMAIL not set (add to .env and restart)', { service: 'user-management' });
    return;
  }

  const defaultTenantId = process.env.SEED_DEFAULT_TENANT_ID?.trim() || randomUUID();

  try {
    const users = getContainer(USER_USERS);
    const roles = getContainer(USER_ROLES);
    const memberships = getContainer(USER_MEMBERSHIPS);

    // 1. Ensure Super Admin role exists for default tenant (roles partitionKey = tenantId)
    const { resources: roleListExisting } = await roles.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tid AND c.name = @name',
        parameters: [
          { name: '@tid', value: defaultTenantId },
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
        tenantId: defaultTenantId,
        partitionKey: defaultTenantId,
        name: SUPER_ADMIN_ROLE_NAME,
        description: getRoleDescription(SUPER_ADMIN_ROLE_NAME),
        isSystemRole: true,
        isSuperAdmin: true,
      } as Record<string, unknown>);
      log.info('Created Super Admin role for default tenant', { tenantId: defaultTenantId, roleId: superAdminRoleId, service: 'user-management' });
    }

    // 3. Find or create user by email (cross-partition)
    const { resources: userList } = await users.items
      .query({ query: 'SELECT * FROM c WHERE c.email = @email', parameters: [{ name: '@email', value: email }] })
      .fetchAll();
    let user = userList[0] as (Record<string, unknown> & { id: string; tenantId?: string; partitionKey?: string }) | undefined;
    if (!user) {
      if (!password) {
        log.warn('Seed super admin: user not found by email (set SEED_SUPER_ADMIN_PASSWORD to create user)', { email, service: 'user-management' });
        return;
      }
      const userId = randomUUID();
      const username = email.split('@')[0].replace(/[^a-z0-9]/gi, '') || 'admin';
      const passwordHash = await bcrypt.hash(password, 12);
      const userDoc = {
        id: userId,
        tenantId: defaultTenantId,
        partitionKey: defaultTenantId,
        email,
        username: `${username}-${Date.now().toString(36)}`,
        name: email.split('@')[0],
        firstName: email.split('@')[0],
        lastName: '',
        passwordHash,
        isEmailVerified: true,
        isActive: true,
        authProviders: ['email'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Record<string, unknown>;
      await users.items.create(userDoc);
      user = userDoc as Record<string, unknown> & { id: string; tenantId: string };
      log.info('Created user for Revimize super admin', { userId, email, tenantId: defaultTenantId, service: 'user-management' });
    }
    const userId = user.id;
    const currentPartition = (user.tenantId ?? user.partitionKey ?? 'default') as string;
    // 4. Update user: isEmailVerified true, tenantId = defaultTenantId (Cosmos: partition key must match target partition)
    if (currentPartition === defaultTenantId) {
      const updatedSamePartition = { ...user, isEmailVerified: true, tenantId: defaultTenantId, updatedAt: new Date() };
      await users.item(userId, currentPartition).replace(updatedSamePartition as Record<string, unknown>);
      log.info('Updated user: isEmailVerified and tenantId (same partition)', { userId, email, tenantId: defaultTenantId, service: 'user-management' });
    } else {
      const updatedInPlace = { ...user, isEmailVerified: true, tenantId: currentPartition, updatedAt: new Date() };
      await users.item(userId, currentPartition).replace(updatedInPlace as Record<string, unknown>);
      const userInNewPartition = { ...user, id: userId, tenantId: defaultTenantId, isEmailVerified: true, updatedAt: new Date() };
      await users.items.create(userInNewPartition as Record<string, unknown>);
      await users.item(userId, currentPartition).delete();
      log.info('Updated user: isEmailVerified, migrated to default tenant partition', { userId, email, tenantId: defaultTenantId, service: 'user-management' });
    }

    // 5. Create membership if not exists (partitionKey = tenantId)
    const { resources: existingMemberships } = await memberships.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.tenantId = @tid',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@tid', value: defaultTenantId },
        ],
      })
      .fetchAll();
    if (existingMemberships.length > 0) {
      log.info('User already has membership in default tenant', { userId, tenantId: defaultTenantId, service: 'user-management' });
      return;
    }
    await memberships.items.create(
      {
        id: randomUUID(),
        tenantId: defaultTenantId,
        partitionKey: defaultTenantId,
        userId,
        roleId: superAdminRoleId,
        status: 'active',
        joinedAt: new Date(),
      } as Record<string, unknown>
    );
    log.info('Seeded Revimize super admin: membership created', { userId, email, tenantId: defaultTenantId, service: 'user-management' });
  } catch (err) {
    log.error('Seed Revimize super admin failed', { error: err, email, service: 'user-management' });
    throw err;
  }
}
