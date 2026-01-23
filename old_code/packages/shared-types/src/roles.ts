/**
 * User Role Definitions and Permissions
 * Defines role-based access control for the Castiel system
 */

/**
 * User roles in the system
 */
export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    DIRECTOR = 'director',
    MANAGER = 'manager',
    USER = 'user',
    GUEST = 'guest',
}

/**
 * System Permissions
 * Centralized list of all available permissions in the system.
 * Format: resource:action:scope
 */
export const SYSTEM_PERMISSIONS = {
    // User Management
    USERS: {
        READ: 'user:read:tenant',
        UPDATE: 'user:update:tenant',
        CREATE: 'user:create:tenant',
        DELETE: 'user:delete:tenant',
        INVITE: 'user:invite:tenant',
        BULK_ACTION: 'user:bulk:tenant',
        IMPERSONATE: 'user:impersonate:tenant',
    },
    // Role Management
    ROLES: {
        READ: 'role:read:tenant',
        CREATE: 'role:create:tenant',
        UPDATE: 'role:update:tenant',
        DELETE: 'role:delete:tenant',
    },
    // Audit Logs
    AUDIT: {
        READ: 'audit:read:tenant',
        EXPORT: 'audit:export:tenant',
    },
    // Shards (Existing mapped)
    SHARDS: {
        READ_ALL: 'shard:read:all',
        CREATE_TENANT: 'shard:create:tenant',
        UPDATE_ALL: 'shard:update:all',
        DELETE_ALL: 'shard:delete:all',
    },
    // ACL
    ACL: {
        MANAGE: 'acl:manage:tenant',
    },
    // Integration Management
    INTEGRATIONS: {
        READ: 'integration:read:tenant',
        CREATE: 'integration:create:tenant',
        UPDATE: 'integration:update:tenant',
        DELETE: 'integration:delete:tenant',
        SEARCH: 'integration:search:tenant',
        CONFIGURE: 'integration:configure:tenant',
        TEST_CONNECTION: 'integration:test:tenant',
    },
    // Integration Providers (Super Admin)
    INTEGRATION_PROVIDERS: {
        READ: 'integration-provider:read:system',
        CREATE: 'integration-provider:create:system',
        UPDATE: 'integration-provider:update:system',
        DELETE: 'integration-provider:delete:system',
        CHANGE_STATUS: 'integration-provider:status:system',
        CHANGE_AUDIENCE: 'integration-provider:audience:system',
    }
} as const;

export const ShardTypeRolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.SUPER_ADMIN]: ['*'],
    [UserRole.ADMIN]: [
        'shard-type:create:tenant',
        'shard-type:read:all',
        'shard-type:update:tenant',
        'shard-type:delete:tenant',
        'shard-type:clone:global',
    ],
    [UserRole.DIRECTOR]: ['shard-type:read:all'],
    [UserRole.MANAGER]: ['shard-type:read:all'],
    [UserRole.USER]: ['shard-type:read:assigned'],
    [UserRole.GUEST]: [],
};

/**
 * Permission format: resource:action:scope
 * Examples:
 * - shard-type:create:tenant
 * - shard-type:read:all
 * - shard:delete:own
 */
export type Permission = string;

/**
 * Role-based permissions mapping
 * Defines what each role can do in the system
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.SUPER_ADMIN]: [
        '*', // All permissions - super admin has unrestricted access
        // Explicitly includes all integration provider permissions
        ...Object.values(SYSTEM_PERMISSIONS.INTEGRATION_PROVIDERS),
    ],
    [UserRole.ADMIN]: [
        // ShardType permissions
        ...ShardTypeRolePermissions[UserRole.ADMIN],

        // Shard permissions
        'shard:create:tenant',
        'shard:read:all',
        'shard:update:all',
        'shard:delete:all',

        // ACL permissions
        'acl:manage:tenant',

        // User management
        'user:read:tenant',
        'user:update:tenant',
        'user:create:tenant',
        'user:delete:tenant',
        'user:invite:tenant',
        'user:bulk:tenant',
        'user:impersonate:tenant',

        // Role management
        'role:read:tenant',
        'role:create:tenant',
        'role:update:tenant',
        'role:delete:tenant',

        // Audit Logs
        'audit:read:tenant',
        'audit:export:tenant',

        // Integration management
        ...Object.values(SYSTEM_PERMISSIONS.INTEGRATIONS),
    ],
    [UserRole.DIRECTOR]: [
        // ShardType permissions
        ...ShardTypeRolePermissions[UserRole.DIRECTOR],

        // Shard permissions - can read all shards in tenant (department-level access)
        'shard:create:own',
        'shard:read:all', // Department/tenant-wide read access
        'shard:read:team',
        'shard:read:assigned',
        'shard:update:own',
        'shard:delete:own',

        // Team management - can read all teams in tenant
        'team:read:tenant',
        'team:read:own',
        'team:update:own',

        // Profile
        'user:read:own',
        'user:read:team',
        'user:read:tenant', // Can read all users in tenant
        'user:update:own',

        // Integration permissions (read and search)
        'integration:read:tenant',
        'integration:search:tenant',

        // Dashboard and analytics - tenant-level access
        'dashboard:read:team',
        'dashboard:read:tenant', // Department/tenant-wide dashboard access
        'quota:read:team',
        'quota:read:tenant', // Department/tenant-wide quota access
        'pipeline:read:team',
        'pipeline:read:tenant', // Department/tenant-wide pipeline access
        'risk:read:team',
        'risk:read:tenant', // Department/tenant-wide risk access

        // Strategic analytics
        'audit:read:tenant', // Can read audit logs for strategic analysis
    ],
    [UserRole.MANAGER]: [
        // ShardType permissions
        ...ShardTypeRolePermissions[UserRole.MANAGER],

        // Shard permissions - can read team members' shards
        'shard:create:own',
        'shard:read:team',
        'shard:read:assigned',
        'shard:update:own',
        'shard:delete:own',

        // Team management
        'team:read:tenant',
        'team:read:own',
        'team:update:own',

        // Profile
        'user:read:own',
        'user:read:team',
        'user:update:own',

        // Integration permissions (read and search)
        'integration:read:tenant',
        'integration:search:tenant',

        // Dashboard and analytics
        'dashboard:read:team',
        'quota:read:team',
        'pipeline:read:team',
        'risk:read:team',
    ],
    [UserRole.USER]: [
        // ShardType permissions
        ...ShardTypeRolePermissions[UserRole.USER],

        // Shard permissions
        'shard:create:own',
        'shard:read:assigned',
        'shard:update:own',
        'shard:delete:own',

        // Profile
        'user:read:own',
        'user:update:own',

        // Integration permissions (read and search)
        'integration:read:tenant',
        'integration:search:tenant',
    ],
    [UserRole.GUEST]: [
        // Read-only access
        'shard-type:read:public',
        'shard:read:public',
    ],
};

/**
 * Check if a role has a specific permission
 * @param role User role to check
 * @param permission Permission to verify
 * @returns True if role has permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = RolePermissions[role];

    // Super admin has all permissions
    if (permissions.includes('*')) {
        return true;
    }

    // Check exact match
    if (permissions.includes(permission)) {
        return true;
    }

    // Check wildcard patterns (e.g., 'shard:*:own' matches 'shard:read:own')
    return permissions.some(p => {
        if (p.includes('*')) {
            const pattern = p.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(permission);
        }
        return false;
    });
}

/**
 * Check if a role has any of the specified permissions
 * @param role User role to check
 * @param permissions Array of permissions to verify
 * @returns True if role has at least one permission
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 * @param role User role to check
 * @param permissions Array of permissions to verify
 * @returns True if role has all permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 * @param role User role
 * @returns Array of permissions
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
    return RolePermissions[role];
}

/**
 * Check if a user can create global ShardTypes
 * @param role User role
 * @returns True if user can create global ShardTypes
 */
export function canCreateGlobalShardType(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN;
}

/**
 * Check if a user can manage tenant ShardTypes
 * @param role User role
 * @returns True if user can manage tenant ShardTypes
 */
export function canManageTenantShardType(role: UserRole): boolean {
    return hasPermission(role, 'shard-type:create:tenant');
}
