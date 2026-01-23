import { Container } from '@azure/cosmos';
import { User, UserRegistrationData } from '../../types/user.types.js';
import { UserCacheService } from './user-cache.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * User service for managing user accounts in Cosmos DB
 */
export declare class UserService {
    private container;
    private cacheService?;
    private passwordHistoryService;
    private monitoring?;
    constructor(container: Container, cacheService?: UserCacheService, monitoring?: IMonitoringProvider);
    /**
     * Hash password using argon2
     */
    private hashPassword;
    /**
     * Verify password against hash
     */
    private verifyPassword;
    /**
     * Generate a secure random token
     */
    private generateToken;
    /**
     * Create a new user
     */
    createUser(data: UserRegistrationData): Promise<User>;
    /**
     * Find user by email and tenant
     */
    findByEmail(email: string, tenantId: string): Promise<User | null>;
    findByEmailAcrossTenants(email: string): Promise<User | null>;
    findAllByEmail(email: string): Promise<User[]>;
    /**
     * List users with pagination and filtering
     */
    listUsers(tenantId: string, options: {
        page: number;
        limit: number;
        search?: string;
        role?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        users: User[];
        total: number;
    }>;
    findDefaultUserByEmail(email: string): Promise<User | null>;
    findByIdAcrossTenants(userId: string): Promise<User | null>;
    /**
     * Find user by ID and tenant
     */
    findById(userId: string, tenantId: string): Promise<User | null>;
    /**
     * Verify user email with token
     */
    verifyEmail(verificationToken: string, tenantId: string): Promise<User | null>;
    /**
     * Create a new verification token for an existing user
     */
    createVerificationToken(userId: string, tenantId: string): Promise<string | null>;
    /**
     * Find user by email across all tenants
     */
    findByEmailGlobally(email: string): Promise<User | null>;
    /**
     * Authenticate user with email and password
     */
    authenticateUser(email: string, password: string, tenantId: string): Promise<User | null>;
    /**
     * Create password reset token
     */
    createPasswordResetToken(email: string, tenantId: string): Promise<string | null>;
    /**
     * Reset password with token
     */
    resetPassword(resetToken: string, newPassword: string, tenantId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Change password for authenticated user
     */
    changePassword(userId: string, tenantId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Update user profile
     */
    updateUser(userId: string, tenantId: string, updates: Partial<User>): Promise<User | null>;
    ensureUserRoles(userId: string, tenantId: string, roles?: string[]): Promise<User | null>;
    cloneUserToTenant(sourceUser: User, targetTenantId: string, roles?: string[]): Promise<User>;
    createInvitedUserAccount(email: string, tenantId: string, roles?: string[]): Promise<User>;
    /**
     * Delete user (soft delete)
     */
    deleteUser(userId: string, tenantId: string): Promise<boolean>;
    updateDefaultTenant(email: string, newDefaultTenantId: string): Promise<User>;
}
//# sourceMappingURL=user.service.d.ts.map