import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserManagementService } from '../services/auth/user-management.service.js';
import { CacheManager } from '../cache/manager.js';
import { UserService } from '../services/auth/user.service.js';
import type { ImpersonateUserRequest, CreateUserRequest, UpdateUserRequest } from '../types/user-management.types.js';
interface ImpersonateUserParams {
    tenantId: string;
    userId: string;
}
interface UpdateStatusParams {
    userId: string;
}
interface UpdateStatusBody {
    status: 'active' | 'suspended' | 'pending_verification' | 'pending_approval' | 'deleted';
}
interface BulkOperationBody {
    action: 'activate' | 'deactivate' | 'delete' | 'add-role' | 'remove-role' | 'send-password-reset';
    userIds: string[];
    role?: string;
}
export declare class UserManagementController {
    private readonly userManagementService;
    private readonly cacheManager;
    private readonly userService;
    constructor(userManagementService: UserManagementService, cacheManager: CacheManager, userService: UserService);
    /**
     * GET /api/tenants/:tenantId/users
     * List users
     */
    listUsers(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
        Querystring: {
            page?: number;
            limit?: number;
            search?: string;
            role?: string;
            status?: string;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/tenants/:tenantId/users/:userId
     * Get user details
     */
    getUser(request: FastifyRequest<{
        Params: {
            tenantId: string;
            userId: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/users
     * Create user
     */
    createUser(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
        Body: CreateUserRequest;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /api/tenants/:tenantId/users/:userId
     * Update user
     */
    updateUser(request: FastifyRequest<{
        Params: {
            tenantId: string;
            userId: string;
        };
        Body: UpdateUserRequest;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /api/tenants/:tenantId/users/:userId
     * Delete user
     */
    deleteUser(request: FastifyRequest<{
        Params: {
            tenantId: string;
            userId: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /api/users/:userId/status
     * Update user status (active, suspended, etc.)
     */
    updateUserStatus(request: FastifyRequest<{
        Params: UpdateStatusParams;
        Body: UpdateStatusBody;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/users/bulk
     * Perform bulk operations on multiple users
     */
    bulkOperation(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
        Body: BulkOperationBody;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/users/import
     * Import users from CSV
     */
    importUsers(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
        Body: {
            fileContent: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/users/:userId/impersonate
     * Issues temporary impersonation tokens for admins
     */
    impersonateUser(request: FastifyRequest<{
        Params: ImpersonateUserParams;
        Body: ImpersonateUserRequest;
    }>, reply: FastifyReply): Promise<never>;
    private ensureAdminPrivileges;
    private ensureMFA;
    private getDisplayName;
}
export {};
//# sourceMappingURL=user-management.controller.d.ts.map