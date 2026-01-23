/**
 * Role Service
 * 
 * Manages custom roles within organizations.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';

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
  organizationId: string | null;
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
 * List roles for an organization
 */
export async function listRoles(
  organizationId: string,
  includeSystemRoles: boolean = true
): Promise<RoleDetails[]> {
  const db = getDatabaseClient();
  
  const where: any = {
    organizationId,
    archivedAt: null,
  };
  
  if (!includeSystemRoles) {
    where.isSystemRole = false;
  }
  
  const roles = await db.role.findMany({
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
  });
  
  return roles.map(role => ({
    id: role.id,
    organizationId: role.organizationId,
    name: role.name,
    description: role.description,
    isSystemRole: role.isSystemRole,
    isCustomRole: role.isCustomRole,
    isSuperAdmin: role.isSuperAdmin,
    createdByUserId: role.createdByUserId,
    archivedAt: role.archivedAt,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.permissions.map(rp => ({
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
  organizationId: string,
  roleId: string
): Promise<RoleDetails | null> {
  const db = getDatabaseClient();
  
  const role = await db.role.findUnique({
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
  });
  
  if (!role) {
    return null;
  }
  
  // Verify role belongs to organization
  if (role.organizationId !== organizationId) {
    return null;
  }
  
  return {
    id: role.id,
    organizationId: role.organizationId,
    name: role.name,
    description: role.description,
    isSystemRole: role.isSystemRole,
    isCustomRole: role.isCustomRole,
    isSuperAdmin: role.isSuperAdmin,
    createdByUserId: role.createdByUserId,
    archivedAt: role.archivedAt,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.permissions.map(rp => ({
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
  organizationId: string,
  name: string,
  description: string | null,
  permissionIds: string[],
  createdBy: string
): Promise<RoleDetails> {
  const db = getDatabaseClient();
  
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
  
  // Check if user has permission to create roles
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId: createdBy,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  });
  
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { ownerUserId: true },
  });
  
  const isOwner = organization?.ownerUserId === createdBy;
  const isSuperAdmin = membership?.role.isSuperAdmin || false;
  
  if (!isOwner && !isSuperAdmin) {
    throw new Error('Permission denied. Only organization owner or Super Admin can create roles.');
  }
  
  // Check if role name already exists in organization
  const existing = await db.role.findUnique({
    where: {
      organizationId_name: {
        organizationId,
        name: name.trim(),
      },
    },
  });
  
  if (existing) {
    throw new Error(`Role with name "${name}" already exists in this organization`);
  }
  
  // Validate all permissions exist and belong to system permissions
  if (permissionIds.length > 0) {
    const permissions = await db.permission.findMany({
      where: {
        id: { in: permissionIds },
        isSystemPermission: true,
      },
    });
    
    if (permissions.length !== permissionIds.length) {
      throw new Error('One or more permissions are invalid or not system permissions');
    }
  }
  
  // Create role
  const role = await db.role.create({
    data: {
      organizationId,
      name: name.trim(),
      description: description?.trim() || null,
      isSystemRole: false,
      isCustomRole: true,
      isSuperAdmin: false,
      createdByUserId: createdBy,
    },
  });
  
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
  const roleWithPermissions = await getRole(organizationId, role.id);
  
  if (!roleWithPermissions) {
    throw new Error('Failed to retrieve created role');
  }
  
  return roleWithPermissions;
}

/**
 * Update a custom role
 */
export async function updateCustomRole(
  organizationId: string,
  roleId: string,
  updates: {
    name?: string;
    description?: string | null;
    permissionIds?: string[];
  },
  updatedBy: string
): Promise<RoleDetails> {
  const db = getDatabaseClient();
  
  // Get role
  const role = await db.role.findUnique({
    where: { id: roleId },
  });
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify role belongs to organization
  if (role.organizationId !== organizationId) {
    throw new Error('Role does not belong to this organization');
  }
  
  // Cannot modify system roles
  if (role.isSystemRole) {
    throw new Error('Cannot modify system roles');
  }
  
  // Check permission
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId: updatedBy,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  });
  
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { ownerUserId: true },
  });
  
  const isOwner = organization?.ownerUserId === updatedBy;
  const isSuperAdmin = membership?.role.isSuperAdmin || false;
  
  if (!isOwner && !isSuperAdmin) {
    throw new Error('Permission denied. Only organization owner or Super Admin can update roles.');
  }
  
  // Prepare update data
  const updateData: any = {};
  
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
      const existing = await db.role.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: updates.name.trim(),
          },
        },
      });
      
      if (existing) {
        throw new Error(`Role with name "${updates.name}" already exists in this organization`);
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
      const permissions = await db.permission.findMany({
        where: {
          id: { in: updates.permissionIds },
          isSystemPermission: true,
        },
      });
      
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
  const updated = await getRole(organizationId, roleId);
  
  if (!updated) {
    throw new Error('Failed to retrieve updated role');
  }
  
  return updated;
}

/**
 * Delete a custom role
 */
export async function deleteCustomRole(
  organizationId: string,
  roleId: string,
  deletedBy: string
): Promise<void> {
  const db = getDatabaseClient();
  
  // Get role
  const role = await db.role.findUnique({
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
  });
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify role belongs to organization
  if (role.organizationId !== organizationId) {
    throw new Error('Role does not belong to this organization');
  }
  
  // Cannot delete system roles
  if (role.isSystemRole) {
    throw new Error('Cannot delete system roles');
  }
  
  // Check if users are assigned to this role
  if (role.memberships.length > 0) {
    throw new Error(`Cannot delete role. ${role.memberships.length} user(s) are assigned to this role. Please reassign users first.`);
  }
  
  // Check permission
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId: deletedBy,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  });
  
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { ownerUserId: true },
  });
  
  const isOwner = organization?.ownerUserId === deletedBy;
  const isSuperAdmin = membership?.role.isSuperAdmin || false;
  
  if (!isOwner && !isSuperAdmin) {
    throw new Error('Permission denied. Only organization owner or Super Admin can delete roles.');
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
 * Get role permissions
 */
export async function getRolePermissions(
  organizationId: string,
  roleId: string
): Promise<Array<{ id: string; code: string; displayName: string; description: string | null }>> {
  const role = await getRole(organizationId, roleId);
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  return role.permissions;
}

