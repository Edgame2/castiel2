/**
 * SCIM Service
 * Implements SCIM 2.0 protocol for user and group provisioning
 */
import { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { SCIMUser, SCIMGroup, SCIMListResponse, SCIMPatchRequest, TenantSCIMConfig, SCIMActivityLog, SCIMConfigResponse } from '../../types/scim.types.js';
import { UserService } from './user.service.js';
import { UserManagementService } from './user-management.service.js';
/**
 * SCIM Service
 */
export declare class SCIMService {
    private readonly configContainer;
    private readonly activityContainer;
    private readonly userContainer;
    private readonly userService;
    private readonly userManagementService;
    private readonly redis?;
    private readonly monitoring?;
    private readonly CACHE_PREFIX;
    private readonly CACHE_TTL;
    constructor(configContainer: Container, // tenant-configs container
    activityContainer: Container, // scim-activity-logs container
    userContainer: Container, // users container
    userService: UserService, userManagementService: UserManagementService, redis?: Redis | undefined, monitoring?: IMonitoringProvider | undefined);
    /**
     * Generate a secure SCIM bearer token
     */
    private generateToken;
    /**
     * Hash SCIM token for storage
     */
    private hashToken;
    /**
     * Verify SCIM token
     */
    verifyToken(tenantId: string, token: string): Promise<boolean>;
    /**
     * Get or create SCIM configuration for tenant
     */
    getConfig(tenantId: string): Promise<TenantSCIMConfig | null>;
    /**
     * Enable SCIM for tenant (creates config if doesn't exist)
     */
    enableSCIM(tenantId: string, createdBy: string, baseUrl: string): Promise<{
        config: TenantSCIMConfig;
        token: string;
    }>;
    /**
     * Disable SCIM for tenant
     */
    disableSCIM(tenantId: string): Promise<void>;
    /**
     * Rotate SCIM token
     */
    rotateToken(tenantId: string): Promise<string>;
    /**
     * Get SCIM config response (for API, token only shown on creation/rotation)
     */
    getConfigResponse(tenantId: string): Promise<SCIMConfigResponse | null>;
    /**
     * Create user via SCIM
     */
    createUser(tenantId: string, scimUser: SCIMUser): Promise<SCIMUser>;
    /**
     * Get user via SCIM
     */
    getUser(tenantId: string, userId: string): Promise<SCIMUser | null>;
    /**
     * List users via SCIM
     */
    listUsers(tenantId: string, startIndex?: number, count?: number, filter?: string): Promise<SCIMListResponse<SCIMUser>>;
    /**
     * Update user via SCIM (PUT - full update)
     */
    updateUser(tenantId: string, userId: string, scimUser: SCIMUser, method?: 'PUT' | 'PATCH'): Promise<SCIMUser>;
    /**
     * Patch user via SCIM (PATCH - partial update)
     */
    patchUser(tenantId: string, userId: string, patchRequest: SCIMPatchRequest): Promise<SCIMUser>;
    /**
     * Delete user via SCIM
     */
    deleteUser(tenantId: string, userId: string): Promise<void>;
    /**
     * Map internal User to SCIM User
     */
    private mapUserToSCIM;
    /**
     * Log SCIM activity
     */
    private logActivity;
    /**
     * Get SCIM activity logs
     */
    getActivityLogs(tenantId: string, limit?: number): Promise<SCIMActivityLog[]>;
    /**
     * Create group via SCIM (maps to role)
     * Note: In this implementation, Groups represent roles
     */
    createGroup(tenantId: string, scimGroup: SCIMGroup): Promise<SCIMGroup>;
    /**
     * Get group via SCIM
     */
    getGroup(tenantId: string, groupId: string): Promise<SCIMGroup | null>;
    /**
     * List groups via SCIM
     */
    listGroups(tenantId: string, startIndex?: number, count?: number, filter?: string): Promise<SCIMListResponse<SCIMGroup>>;
    /**
     * Patch group via SCIM (update membership)
     */
    patchGroup(tenantId: string, groupId: string, patchRequest: SCIMPatchRequest): Promise<SCIMGroup>;
    /**
     * Delete group via SCIM
     * Note: We don't actually delete roles, just remove all members
     */
    deleteGroup(tenantId: string, groupId: string): Promise<void>;
}
//# sourceMappingURL=scim.service.d.ts.map