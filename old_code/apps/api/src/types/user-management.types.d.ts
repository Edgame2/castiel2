/**
 * User Management Types
 * Additional types for admin-level user operations
 */
import { UserStatus } from './user.types.js';
/**
 * User list query parameters
 */
export interface UserListQuery {
    status?: UserStatus;
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'status';
    sortOrder?: 'asc' | 'desc';
}
/**
 * User list response
 */
export interface UserListResponse {
    users: UserResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
/**
 * Admin user creation request
 */
export interface CreateUserRequest {
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    status?: UserStatus;
    sendInvite?: boolean;
    metadata?: Record<string, any>;
}
/**
 * Admin user update request
 */
export interface UpdateUserRequest {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    status?: UserStatus;
    metadata?: Record<string, any>;
    emailVerified?: boolean;
}
/**
 * User response (DTO without sensitive data)
 */
export interface UserResponse {
    id: string;
    tenantId: string;
    email: string;
    emailVerified: boolean;
    organizationId?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    status: UserStatus;
    roles: string[];
    providers?: {
        provider: string;
        providerId: string;
        email?: string;
        connectedAt: string;
    }[];
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
}
/**
 * User activity log entry
 */
export interface UserActivityEntry {
    id: string;
    userId: string;
    tenantId: string;
    action: string;
    resource?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: {
        country?: string;
        city?: string;
    };
    metadata?: Record<string, any>;
    timestamp: string;
}
/**
 * User activity response
 */
export interface UserActivityResponse {
    activities: UserActivityEntry[];
    total: number;
    page: number;
    limit: number;
}
/**
 * Password reset request
 */
export interface AdminPasswordResetRequest {
    sendEmail?: boolean;
}
/**
 * Password reset response
 */
export interface AdminPasswordResetResponse {
    message: string;
    resetToken?: string;
    expiresAt?: string;
}
/**
 * Audit entry for impersonation events
 */
export interface ImpersonationAuditEntry {
    id: string;
    adminId: string;
    adminEmail: string;
    reason?: string;
    createdAt: string;
    expiresAt: string;
    metadata?: Record<string, any>;
}
/**
 * User impersonation request
 */
export interface ImpersonateUserRequest {
    reason?: string;
    expiryMinutes?: number;
}
/**
 * User impersonation response
 */
export interface ImpersonateUserResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: string;
    impersonationId: string;
    message: string;
    user: UserResponse;
}
/**
 * Bulk user operation request
 */
export interface BulkUserOperationRequest {
    userIds: string[];
    operation: 'activate' | 'deactivate' | 'delete';
}
/**
 * Bulk user operation response
 */
export interface BulkUserOperationResponse {
    successful: string[];
    failed: {
        userId: string;
        error: string;
    }[];
    total: number;
    successCount: number;
    failureCount: number;
}
/**
 * User invitation request
 */
export interface InviteUserRequest {
    email: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    message?: string;
    expiryDays?: number;
}
/**
 * User invitation response
 */
export interface InviteUserResponse {
    invitationId: string;
    email: string;
    expiresAt: string;
    invitationUrl: string;
}
/**
 * Bulk user invitation request
 */
export interface BulkInviteRequest {
    invitations: {
        email: string;
        firstName?: string;
        lastName?: string;
        roles?: string[];
    }[];
    message?: string;
    expiryDays?: number;
}
/**
 * Bulk user invitation response
 */
export interface BulkInviteResponse {
    successful: InviteUserResponse[];
    failed: {
        email: string;
        error: string;
    }[];
    total: number;
    successCount: number;
    failureCount: number;
}
//# sourceMappingURL=user-management.types.d.ts.map