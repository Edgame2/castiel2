/**
 * Role Service
 *
 * Manages custom roles within a tenant.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';

/** DB client shape used by this service (shared returns Cosmos Database) */
type RoleDb = {
  role: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  membership: { findFirst: (args: unknown) => Promise<unknown> };
  permission: { findMany: (args: unknown) => Promise<unknown[]> };
  rolePermission: {
    createMany: (args: unknown) => Promise<unknown>;
    deleteMany: (args: unknown) => Promise<unknown>;
  };
};

function getDb(): RoleDb {
  return getDatabaseClient() as unknown as RoleDb;
}

/**
 * Maximum permissions per role
 */
const MAX_PERMISSIONS_PER_ROLE = 100;

/**
 * System role names that cannot be used for custom roles
 */
const SYSTEM_ROLE_NAMES = ['Super Admin', 'Admin', 'Member', 'Viewer'];

/**
 * Role details with permissions
 */
export interface RoleDetails {
  id: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isCustomRole: boolean;
  isSuperAdmin: boolean;
  createdByUserId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{
    id: string;
    code: string;
    displayName: string;
    description: string | null;
  }>;
  userCount?: number;
}

/**
 * List roles for a tenant
 */
export async function listRoles(
  tenantId: string,
  includeSystemRoles: boolean = true
): Promise<RoleDetails[]> {
  const db = getDb();
  
  const where: Record<string, unknown> = {
    tenantId,
    archivedAt: null,
  };
  
  if (!includeSystemRoles) {
    where.isSystemRole = false;
  }
  
  const roles = (await db.role.findMany({
    where,
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              id: true,
              code: true,
              displayName: true,
              description: true,
            },
          },
        },
      },
      memberships: {
        where: {
          status: 'active',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })) as Array<{
    id: string;
    tenantId: string | null;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    isCustomRole: boolean;
    isSuperAdmin: boolean;
    createdByUserId: string | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    permissions: Array<{ permission: { id: string; code: string; displayName: string; description: string | null } }>;
    memberships: Array<{ id: string }>;
  }>;
  
  return roles.map((role) => ({
    id: role.id,
    tenantId: role.tenantId,
    name: role.name,
    description: role.description,
    isSystemRole: role.isSystemRole,
    isCustomRole: role.isCustomRole,
    isSuperAdmin: role.isSuperAdmin,
    createdByUserId: role.createdByUserId,
    archivedAt: role.archivedAt,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.permissions.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      displayName: rp.permission.displayName,
      description: rp.permission.description,
    })),
    userCount: role.memberships.length,
  }));
}

/**
 * Get role details
 */
export async function getRole(
  tenantId: string,
  roleId: string
): Promise<RoleDetails | null> {
  const db = getDb();
  
  const role = (await db.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              id: true,
              code: true,
              displayName: true,
              description: true,
            },
          },
        },
      },
      memberships: {
        where: {
          status: 'active',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
  })) as {
    id: string;
    tenantId: string | null;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    isCustomRole: boolean;
    isSuperAdmin: boolean;
    createdByUserId: string | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    permissions: Array<{ permission: { id: string; code: string; displayName: string; description: string | null } }>;
    memberships: Array<{ id: string }>;
  } | null;
  
  if (!role) {
    return null;
  }
  
  // Verify role belongs to tenant
  if (role.tenantId !== tenantId) {
    return null;
  }
  
  return {
    id: role.id,
    tenantId: role.tenantId,
    name: role.name,
    description: role.description,
    isSystemRole: role.isSystemRole,
    isCustomRole: role.isCustomRole,
    isSuperAdmin: role.isSuperAdmin,
    createdByUserId: role.createdByUserId,
    archivedAt: role.archivedAt,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.permissions.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      displayName: rp.permission.displayName,
      description: rp.permission.description,
    })),
    userCount: role.memberships.length,
  };
}

/**
 * Create a custom role
 */
export async function createCustomRole(
  tenantId: string,
  name: string,
  description: string | null,
  permissionIds: string[],
  createdBy: string
): Promise<RoleDetails> {
  const db = getDb();
  
  // Validate name
  if (!name || name.trim().length === 0) {
    throw new Error('Role name is required');
  }
  
  if (name.length > 100) {
    throw new Error('Role name must be 100 characters or less');
  }
  
  // Check if name is a system role name
  if (SYSTEM_ROLE_NAMES.includes(name.trim())) {
    throw new Error(`Cannot create custom role with system role name: ${name}`);
  }
  
  // Check permission count
  if (permissionIds.length > MAX_PERMISSIONS_PER_ROLE) {
    throw new Error(`Maximum ${MAX_PERMISSIONS_PER_ROLE} permissions per role`);
  }
  
  // Check if user has membership in tenant (route enforces roles.role.create permission)
  const membership = (await db.membership.findFirst({
    where: {
      userId: createdBy,
      tenantId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;
  
  if (!membership) {
    throw new Error('Permission denied. You must be a member of this tenant to create roles.');
  }
  
  // Check if role name already exists in tenant
  const existing = (await db.role.findUnique({
    where: {
      tenantId_name: {
        tenantId,
        name: name.trim(),
      },
    },
  })) as { id: string } | null;
  
  if (existing) {
    throw new Error(`Role with name "${name}" already exists in this tenant`);
  }
  
  // Validate all permissions exist and belong to system permissions
  if (permissionIds.length > 0) {
    const permissions = (await db.permission.findMany({
      where: {
        id: { in: permissionIds },
        isSystemPermission: true,
      },
    })) as unknown[];
    
    if (permissions.length !== permissionIds.length) {
      throw new Error('One or more permissions are invalid or not system permissions');
    }
  }
  
  // Create role
  const role = (await db.role.create({
    data: {
      tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      isSystemRole: false,
      isCustomRole: true,
      isSuperAdmin: false,
      createdByUserId: createdBy,
    },
  })) as { id: string };
  
  // Add permissions
  if (permissionIds.length > 0) {
    await db.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        roleId: role.id,
        permissionId,
        grantedAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }
  
  // Get role with permissions
  const roleWithPermissions = await getRole(tenantId, role.id);
  
  if (!roleWithPermissions) {
    throw new Error('Failed to retrieve created role');
  }
  
  return roleWithPermissions;
}

/**
 * Update a custom role
 */
export async function updateCustomRole(
  tenantId: string,
  roleId: string,
  updates: {
    name?: string;
    description?: string | null;
    permissionIds?: string[];
  },
  updatedBy: string
): Promise<RoleDetails> {
  const db = getDb();
  
  // Get role
  const role = (await db.role.findUnique({
    where: { id: roleId },
  })) as { id: string; tenantId: string | null; name: string; isSystemRole: boolean } | null;
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify role belongs to tenant
  if (role.tenantId !== tenantId) {
    throw new Error('Role does not belong to this tenant');
  }
  
  // Cannot modify system roles
  if (role.isSystemRole) {
    throw new Error('Cannot modify system roles');
  }
  
  // Check permission (route enforces roles.role.update; must be member of tenant)
  const membership = (await db.membership.findFirst({
    where: {
      userId: updatedBy,
      tenantId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;
  
  if (!membership) {
    throw new Error('Permission denied. You must be a member of this tenant to update roles.');
  }
  
  // Prepare update data
  const updateData: Record<string, unknown> = {};
  
  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length === 0) {
      throw new Error('Role name cannot be empty');
    }
    
    if (updates.name.length > 100) {
      throw new Error('Role name must be 100 characters or less');
    }
    
    // Check if name is a system role name
    if (SYSTEM_ROLE_NAMES.includes(updates.name.trim())) {
      throw new Error(`Cannot use system role name: ${updates.name}`);
    }
    
    // Check if name already exists (excluding current role)
    if (updates.name.trim() !== role.name) {
      const existing = (await db.role.findUnique({
        where: {
          tenantId_name: {
            tenantId,
            name: updates.name.trim(),
          },
        },
      })) as { id: string } | null;
      
      if (existing) {
        throw new Error(`Role with name "${updates.name}" already exists in this tenant`);
      }
    }
    
    updateData.name = updates.name.trim();
  }
  
  if (updates.description !== undefined) {
    updateData.description = updates.description?.trim() || null;
  }
  
  // Update role
  await db.role.update({
    where: { id: roleId },
    data: updateData,
  });
  
  // Update permissions if provided
  if (updates.permissionIds !== undefined) {
    if (updates.permissionIds.length > MAX_PERMISSIONS_PER_ROLE) {
      throw new Error(`Maximum ${MAX_PERMISSIONS_PER_ROLE} permissions per role`);
    }
    
    // Validate permissions
    if (updates.permissionIds.length > 0) {
      const permissions = (await db.permission.findMany({
        where: {
          id: { in: updates.permissionIds },
          isSystemPermission: true,
        },
      })) as unknown[];
      
      if (permissions.length !== updates.permissionIds.length) {
        throw new Error('One or more permissions are invalid or not system permissions');
      }
    }
    
    // Delete existing role permissions
    await db.rolePermission.deleteMany({
      where: { roleId },
    });
    
    // Create new role permissions
    if (updates.permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: updates.permissionIds.map(permissionId => ({
          roleId,
          permissionId,
          grantedAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }
  }
  
  // Get updated role
  const updated = await getRole(tenantId, roleId);
  
  if (!updated) {
    throw new Error('Failed to retrieve updated role');
  }
  
  return updated;
}

/**
 * Delete a custom role
 */
export async function deleteCustomRole(
  tenantId: string,
  roleId: string,
  deletedBy: string
): Promise<void> {
  const db = getDb();
  
  // Get role
  const role = (await db.role.findUnique({
    where: { id: roleId },
    include: {
      memberships: {
        where: {
          status: 'active',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
  })) as {
    id: string;
    tenantId: string | null;
    isSystemRole: boolean;
    memberships: Array<{ id: string }>;
  } | null;
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify role belongs to tenant
  if (role.tenantId !== tenantId) {
    throw new Error('Role does not belong to this tenant');
  }
  
  // Cannot delete system roles
  if (role.isSystemRole) {
    throw new Error('Cannot delete system roles');
  }
  
  // Check if users are assigned to this role
  if (role.memberships.length > 0) {
    throw new Error(`Cannot delete role. ${role.memberships.length} user(s) are assigned to this role. Please reassign users first.`);
  }
  
  // Check permission (route enforces roles.role.delete; must be member of tenant)
  const membership = (await db.membership.findFirst({
    where: {
      userId: deletedBy,
      tenantId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;
  
  if (!membership) {
    throw new Error('Permission denied. You must be a member of this tenant to delete roles.');
  }
  
  // Delete role (soft delete by archiving)
  await db.role.update({
    where: { id: roleId },
    data: {
      archivedAt: new Date(),
    },
  });
}

/**
 * List all system permissions (for role create/edit UI).
 * Caller must have access to the tenant (enforced by route).
 *
 * @param _tenantId - Tenant ID (for auth context; permissions are global)
 * @returns Promise resolving to array of permission summaries
 */
export async function listPermissions(
  _tenantId: string
): Promise<Array<{ id: string; code: string; displayName: string; description: string | null }>> {
  const db = getDb();
  const permissions = (await db.permission.findMany({
    where: { isSystemPermission: true },
    select: { id: true, code: true, displayName: true, description: true },
    orderBy: { code: 'asc' },
  })) as Array<{ id: string; code: string; displayName: string; description: string | null }>;
  return permissions.map((p: { id: string; code: string; displayName: string; description: string | null }) => ({
    id: p.id,
    code: p.code,
    displayName: p.displayName,
    description: p.description,
  }));
}

/**
 * Get role permissions
 */
export async function getRolePermissions(
  tenantId: string,
  roleId: string
): Promise<Array<{ id: string; code: string; displayName: string; description: string | null }>> {
  const role = await getRole(tenantId, roleId);
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  return role.permissions;
}

