/**
 * Role Management Service
 * 
 * Business logic for role and permission management
 */

import { Container, Database } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { IMonitoringProvider } from '@castiel/monitoring';
import type {
  RoleEntity,
  RoleCreate,
  RoleUpdate,
  RoleListQuery,
  RoleListResponse,
  RoleMember,
  RoleMemberListResponse,
  IdPGroupMapping,
  CreateIdPGroupMappingRequest,
  PermissionCategory,
} from '@castiel/shared-types';

export class RoleManagementService {
  private rolesContainer: Container;
  private usersContainer: Container;
  private database: Database;
  private monitoring?: IMonitoringProvider;

  constructor(database: Database, rolesContainer: Container, usersContainer: Container, monitoring?: IMonitoringProvider) {
    this.database = database;
    this.rolesContainer = rolesContainer;
    this.usersContainer = usersContainer;
    this.monitoring = monitoring;
  }

  /**
   * List roles for a tenant
   */
  async listRoles(tenantId: string, query: RoleListQuery = {}): Promise<RoleListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    let sqlQuery = `
      SELECT * FROM c
      WHERE c.tenantId = @tenantId
    `;
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (query.includeSystem === false) {
      sqlQuery += ' AND c.isSystem = false';
    }

    if (query.search) {
      sqlQuery += ' AND (CONTAINS(LOWER(c.displayName), @search) OR CONTAINS(LOWER(c.name), @search))';
      parameters.push({ name: '@search', value: query.search.toLowerCase() });
    }

    sqlQuery += ' ORDER BY c.displayName ASC';

    try {
      // Get total count
      const countQuery = sqlQuery.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c');
      const { resources: countResources } = await this.rolesContainer.items
        .query({ query: countQuery, parameters })
        .fetchAll();
      const total = countResources[0] || 0;

      // Get paginated results
      const { resources: roles } = await this.rolesContainer.items
        .query<RoleEntity>({
          query: `${sqlQuery} OFFSET @offset LIMIT @limit`,
          parameters: [
            ...parameters,
            { name: '@offset', value: offset },
            { name: '@limit', value: limit },
          ],
        })
        .fetchAll();

      // Get member counts
      for (const role of roles) {
        role.memberCount = await this.getRoleMemberCount(role.id);
      }

      return { roles, total, page, limit };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.list-roles' });
      throw new Error('Failed to list roles');
    }
  }

  /**
   * Get role by ID
   */
  async getRole(tenantId: string, roleId: string): Promise<RoleEntity> {
    try {
      const { resource: role } = await this.rolesContainer.item(roleId, tenantId).read<RoleEntity>();
      if (!role) {
        throw new Error('Role not found');
      }

      role.memberCount = await this.getRoleMemberCount(roleId);
      return role;
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('Role not found');
      }
      throw error;
    }
  }

  /**
   * Get role by name
   */
  async getRoleByName(tenantId: string, name: string): Promise<RoleEntity | null> {
    try {
      const { resources: roles } = await this.rolesContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.name = @name',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@name', value: name },
          ],
        })
        .fetchAll();

      return roles[0] || null;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.get-role-by-name' });
      return null;
    }
  }

  /**
   * Create a new role
   */
  async createRole(tenantId: string, data: RoleCreate, createdBy?: string): Promise<RoleEntity> {
    // Check if role name already exists
    const { resources: existing } = await this.rolesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.name = @name',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@name', value: data.name },
        ],
      })
      .fetchAll();

    if (existing.length > 0) {
      throw new Error('Role with this name already exists');
    }

    const role: RoleEntity = {
      id: uuidv4(),
      tenantId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      permissions: data.permissions,
      isSystem: false,
      memberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
    };

    try {
      await this.rolesContainer.items.create(role);
      return role;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.create-role' });
      throw new Error('Failed to create role');
    }
  }

  /**
   * Update a role
   */
  async updateRole(
    tenantId: string,
    roleId: string,
    data: RoleUpdate,
    updatedBy?: string
  ): Promise<RoleEntity> {
    const role = await this.getRole(tenantId, roleId);

    if (role.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    const updated: RoleEntity = {
      ...role,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    try {
      await this.rolesContainer.item(roleId, tenantId).replace(updated);
      return updated;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.update-role' });
      throw new Error('Failed to update role');
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(tenantId: string, roleId: string): Promise<void> {
    const role = await this.getRole(tenantId, roleId);

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    const memberCount = await this.getRoleMemberCount(roleId);
    if (memberCount > 0) {
      throw new Error('Cannot delete role with assigned members');
    }

    try {
      await this.rolesContainer.item(roleId, tenantId).delete();
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.delete-role' });
      throw new Error('Failed to delete role');
    }
  }

  /**
   * Get role members
   */
  async getRoleMembers(tenantId: string, roleId: string): Promise<RoleMemberListResponse> {
    try {
      const { resources: users } = await this.usersContainer.items
        .query({
          query: `
            SELECT c.id as userId, c.email as userEmail, 
                   c.firstName, c.lastName, c.createdAt
            FROM c
            WHERE c.tenantId = @tenantId
              AND ARRAY_CONTAINS(c.roles, @roleId)
          `,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@roleId', value: roleId },
          ],
        })
        .fetchAll();

      const members: RoleMember[] = users.map((user: any) => ({
        userId: user.userId,
        userEmail: user.userEmail,
        userName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
        assignedAt: user.createdAt,
      }));

      return { members, total: members.length };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.get-role-members' });
      throw new Error('Failed to get role members');
    }
  }

  /**
   * Add members to role
   */
  async addRoleMembers(tenantId: string, roleId: string, userIds: string[]): Promise<void> {
    // Verify role exists
    await this.getRole(tenantId, roleId);

    try {
      for (const userId of userIds) {
        const { resource: user } = await this.usersContainer.item(userId, tenantId).read();
        if (user) {
          const roles = user.roles || [];
          if (!roles.includes(roleId)) {
            roles.push(roleId);
            await this.usersContainer.item(userId, tenantId).replace({
              ...user,
              roles,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.add-role-members' });
      throw new Error('Failed to add role members');
    }
  }

  /**
   * Remove member from role
   */
  async removeRoleMember(tenantId: string, roleId: string, userId: string): Promise<void> {
    try {
      const { resource: user } = await this.usersContainer.item(userId, tenantId).read();
      if (user && user.roles) {
        const roles = user.roles.filter((r: string) => r !== roleId);
        await this.usersContainer.item(userId, tenantId).replace({
          ...user,
          roles,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.remove-role-member' });
      throw new Error('Failed to remove role member');
    }
  }

  /**
   * Create IdP group mapping
   */
  async createIdPGroupMapping(
    tenantId: string,
    roleId: string,
    data: CreateIdPGroupMappingRequest
  ): Promise<IdPGroupMapping> {
    // Verify role exists
    await this.getRole(tenantId, roleId);

    const mapping: IdPGroupMapping = {
      id: uuidv4(),
      roleId,
      idpId: data.idpId,
      groupAttribute: data.groupAttribute,
      groupValues: data.groupValues,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const container = this.database.container('RoleIdPMappings');
      await container.items.create({ ...mapping, tenantId });
      return mapping;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.create-idp-mapping' });
      throw new Error('Failed to create IdP group mapping');
    }
  }

  /**
   * Get IdP group mappings for a role
   */
  async getIdPGroupMappings(tenantId: string, roleId: string): Promise<IdPGroupMapping[]> {
    try {
      const container = this.database.container('RoleIdPMappings');
      const { resources: mappings } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.roleId = @roleId',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@roleId', value: roleId },
          ],
        })
        .fetchAll();

      return mappings;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'role-management.get-idp-mappings' });
      return [];
    }
  }

  /**
   * Get all available permissions
   */
  async getPermissions(): Promise<PermissionCategory[]> {
    // Define permission catalog
    const categories: PermissionCategory[] = [
      {
        name: 'User Management',
        description: 'Permissions for managing users',
        permissions: [
          {
            id: 'users:create:tenant',
            name: 'Create Users',
            resource: 'users',
            action: 'create',
            scope: 'tenant',
            description: 'Create new users in the tenant',
            category: 'User Management',
          },
          {
            id: 'users:read:tenant',
            name: 'View Users',
            resource: 'users',
            action: 'read',
            scope: 'tenant',
            description: 'View all users in the tenant',
            category: 'User Management',
          },
          {
            id: 'users:update:tenant',
            name: 'Update Users',
            resource: 'users',
            action: 'update',
            scope: 'tenant',
            description: 'Update user information',
            category: 'User Management',
          },
          {
            id: 'users:delete:tenant',
            name: 'Delete Users',
            resource: 'users',
            action: 'delete',
            scope: 'tenant',
            description: 'Delete users from the tenant',
            category: 'User Management',
          },
        ],
      },
      {
        name: 'Role Management',
        description: 'Permissions for managing roles',
        permissions: [
          {
            id: 'roles:create:tenant',
            name: 'Create Roles',
            resource: 'roles',
            action: 'create',
            scope: 'tenant',
            description: 'Create new roles',
            category: 'Role Management',
          },
          {
            id: 'roles:read:tenant',
            name: 'View Roles',
            resource: 'roles',
            action: 'read',
            scope: 'tenant',
            description: 'View all roles',
            category: 'Role Management',
          },
          {
            id: 'roles:update:tenant',
            name: 'Update Roles',
            resource: 'roles',
            action: 'update',
            scope: 'tenant',
            description: 'Update role information',
            category: 'Role Management',
          },
          {
            id: 'roles:delete:tenant',
            name: 'Delete Roles',
            resource: 'roles',
            action: 'delete',
            scope: 'tenant',
            description: 'Delete roles',
            category: 'Role Management',
          },
        ],
      },
      {
        name: 'Settings',
        description: 'Permissions for tenant settings',
        permissions: [
          {
            id: 'settings:read:tenant',
            name: 'View Settings',
            resource: 'settings',
            action: 'read',
            scope: 'tenant',
            description: 'View tenant settings',
            category: 'Settings',
          },
          {
            id: 'settings:update:tenant',
            name: 'Update Settings',
            resource: 'settings',
            action: 'update',
            scope: 'tenant',
            description: 'Update tenant settings',
            category: 'Settings',
          },
        ],
      },
      {
        name: 'Audit Logs',
        description: 'Permissions for audit logs',
        permissions: [
          {
            id: 'audit:read:tenant',
            name: 'View Audit Logs',
            resource: 'audit',
            action: 'read',
            scope: 'tenant',
            description: 'View audit logs',
            category: 'Audit Logs',
          },
          {
            id: 'audit:export:tenant',
            name: 'Export Audit Logs',
            resource: 'audit',
            action: 'export',
            scope: 'tenant',
            description: 'Export audit logs to CSV',
            category: 'Audit Logs',
          },
        ],
      },
    ];

    return categories;
  }

  /**
   * Get member count for a role
   */
  private async getRoleMemberCount(roleId: string): Promise<number> {
    try {
      const { resources: counts } = await this.usersContainer.items
        .query({
          query: `
            SELECT VALUE COUNT(1)
            FROM c
            WHERE ARRAY_CONTAINS(c.roles, @roleId)
          `,
          parameters: [{ name: '@roleId', value: roleId }],
        })
        .fetchAll();

      return counts[0] || 0;
    } catch (error) {
      return 0;
    }
  }
}
