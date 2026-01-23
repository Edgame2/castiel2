/**
 * Role Management Service
 *
 * Business logic for role and permission management
 */
import { Container, Database } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { RoleEntity, RoleCreate, RoleUpdate, RoleListQuery, RoleListResponse, RoleMemberListResponse, IdPGroupMapping, CreateIdPGroupMappingRequest, PermissionCategory } from '@castiel/shared-types';
export declare class RoleManagementService {
    private rolesContainer;
    private usersContainer;
    private database;
    private monitoring?;
    constructor(database: Database, rolesContainer: Container, usersContainer: Container, monitoring?: IMonitoringProvider);
    /**
     * List roles for a tenant
     */
    listRoles(tenantId: string, query?: RoleListQuery): Promise<RoleListResponse>;
    /**
     * Get role by ID
     */
    getRole(tenantId: string, roleId: string): Promise<RoleEntity>;
    /**
     * Get role by name
     */
    getRoleByName(tenantId: string, name: string): Promise<RoleEntity | null>;
    /**
     * Create a new role
     */
    createRole(tenantId: string, data: RoleCreate, createdBy?: string): Promise<RoleEntity>;
    /**
     * Update a role
     */
    updateRole(tenantId: string, roleId: string, data: RoleUpdate, updatedBy?: string): Promise<RoleEntity>;
    /**
     * Delete a role
     */
    deleteRole(tenantId: string, roleId: string): Promise<void>;
    /**
     * Get role members
     */
    getRoleMembers(tenantId: string, roleId: string): Promise<RoleMemberListResponse>;
    /**
     * Add members to role
     */
    addRoleMembers(tenantId: string, roleId: string, userIds: string[]): Promise<void>;
    /**
     * Remove member from role
     */
    removeRoleMember(tenantId: string, roleId: string, userId: string): Promise<void>;
    /**
     * Create IdP group mapping
     */
    createIdPGroupMapping(tenantId: string, roleId: string, data: CreateIdPGroupMappingRequest): Promise<IdPGroupMapping>;
    /**
     * Get IdP group mappings for a role
     */
    getIdPGroupMappings(tenantId: string, roleId: string): Promise<IdPGroupMapping[]>;
    /**
     * Get all available permissions
     */
    getPermissions(): Promise<PermissionCategory[]>;
    /**
     * Get member count for a role
     */
    private getRoleMemberCount;
}
//# sourceMappingURL=role-management.service.d.ts.map