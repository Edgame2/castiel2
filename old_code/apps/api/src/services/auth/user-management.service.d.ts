/**
 * User Management Service
 * Admin-level operations for user management
 */
import { Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { User } from '../../types/user.types.js';
import type { CreateUserRequest, UpdateUserRequest, UserResponse, UserListQuery, UserListResponse, UserActivityResponse, AdminPasswordResetResponse, InviteUserRequest, InviteUserResponse } from '../../types/user-management.types.js';
import { UserCacheService } from './user-cache.service.js';
import { EmailService } from './email.service.js';
interface ImportResult {
    added: number;
    failed: number;
    errors: {
        row: number;
        error: string;
        email?: string;
    }[];
}
interface ImpersonationOptions {
    adminId: string;
    adminEmail: string;
    reason?: string;
    expiryMinutes?: number;
    metadata?: Record<string, any>;
}
interface ImpersonationResult {
    user: UserResponse;
    impersonationId: string;
    expiresAt: string;
    expiresInSeconds: number;
    reason?: string;
}
export declare class UserManagementService {
    private container;
    private cacheService?;
    private emailService?;
    constructor(container: Container, cacheService?: UserCacheService, emailService?: EmailService, monitoring?: IMonitoringProvider);
    /**
     * Initiate user impersonation (admin action)
     */
    impersonateUser(tenantId: string, userId: string, options: ImpersonationOptions): Promise<ImpersonationResult>;
    /**
     * Convert User document to UserResponse (remove sensitive data)
     */
    private toResponse;
    /**
     * List users with filtering and pagination
     */
    listUsers(tenantId: string, query?: UserListQuery): Promise<UserListResponse>;
    /**
     * Create user (admin)
     */
    createUser(tenantId: string, data: CreateUserRequest): Promise<UserResponse>;
    /**
     * Get user by ID
     */
    getUserById(tenantId: string, userId: string): Promise<UserResponse | null>;
    /**
     * Update user
     */
    updateUser(tenantId: string, userId: string, data: UpdateUserRequest): Promise<UserResponse>;
    /**
     * Delete user (soft delete)
     */
    deleteUser(tenantId: string, userId: string): Promise<void>;
    /**
     * Activate user
     */
    activateUser(tenantId: string, userId: string): Promise<UserResponse>;
    /**
     * Deactivate user
     */
    deactivateUser(tenantId: string, userId: string): Promise<UserResponse>;
    /**
     * Update user status (generic method for all status changes)
     */
    updateUserStatus(userId: string, newStatus: string, adminUser: {
        id: string;
        tenantId: string;
    }): Promise<UserResponse | null>;
    /**
     * Admin password reset
     */
    adminPasswordReset(tenantId: string, userId: string, sendEmail?: boolean): Promise<AdminPasswordResetResponse>;
    /**
     * Add role to user
     */
    addRoleToUser(userId: string, tenantId: string, role: string): Promise<User | null>;
    /**
     * Remove role from user
     */
    removeRoleFromUser(userId: string, tenantId: string, role: string): Promise<User | null>;
    /**
     * Get user activity (placeholder - requires activity logging system)
     */
    getUserActivity(_tenantId: string, _userId: string, page?: number, limit?: number): Promise<UserActivityResponse>;
    /**
     * Invite user
     */
    inviteUser(tenantId: string, data: InviteUserRequest): Promise<InviteUserResponse>;
    /**
     * Import users from CSV content
     */
    importUsers(tenantId: string, fileContent: string): Promise<ImportResult>;
    /**
     * Simple CSV Parser
     * Assumes first row is header
     */
    private parseCSV;
}
export {};
//# sourceMappingURL=user-management.service.d.ts.map