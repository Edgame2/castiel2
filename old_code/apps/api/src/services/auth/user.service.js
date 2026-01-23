import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { UserStatus } from '../../types/user.types.js';
import { PasswordHistoryService } from '../security/password-history.service.js';
/**
 * User service for managing user accounts in Cosmos DB
 */
export class UserService {
    container;
    cacheService;
    passwordHistoryService;
    monitoring;
    constructor(container, cacheService, monitoring) {
        this.container = container;
        this.cacheService = cacheService;
        this.monitoring = monitoring;
        this.passwordHistoryService = new PasswordHistoryService({
            historySize: 5, // Remember last 5 passwords
            minPasswordAgeDays: 0, // No minimum age requirement
        }, this.monitoring);
    }
    /**
     * Hash password using argon2
     */
    async hashPassword(password) {
        return argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65536, // 64MB
            timeCost: 3, // 3 iterations
            parallelism: 4, // 4 threads
        });
    }
    /**
     * Verify password against hash
     */
    async verifyPassword(hash, password) {
        try {
            return await argon2.verify(hash, password);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Generate a secure random token
     */
    generateToken() {
        return randomBytes(32).toString('hex');
    }
    /**
     * Create a new user
     */
    async createUser(data) {
        const userId = randomBytes(16).toString('hex');
        const passwordHash = await this.hashPassword(data.password);
        const requiresVerification = !data.emailVerified;
        const verificationToken = requiresVerification ? this.generateToken() : undefined;
        const userStatus = data.status || (requiresVerification ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE);
        const userRoles = data.roles && data.roles.length > 0 ? data.roles : ['user'];
        const user = {
            id: userId,
            tenantId: data.tenantId,
            tenantIds: data.tenantIds || [data.tenantId],
            activeTenantId: data.activeTenantId || data.tenantId,
            isDefaultTenant: data.isDefaultTenant ?? true,
            email: data.email.toLowerCase(),
            emailVerified: !requiresVerification,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            status: userStatus,
            pendingTenantId: data.pendingTenantId,
            roles: userRoles,
            metadata: data.metadata,
            linkedUserId: data.linkedUserId,
            verificationToken,
            verificationTokenExpiry: verificationToken
                ? new Date(Date.now() + 24 * 60 * 60 * 1000)
                : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            partitionKey: data.tenantId, // Partition by tenant
        };
        try {
            const { resource } = await this.container.items.create(user);
            const createdUser = resource;
            // Cache the newly created user
            if (this.cacheService) {
                await this.cacheService.setCachedUser(createdUser);
            }
            return createdUser;
        }
        catch (error) {
            if (error.code === 409) {
                throw new Error('User with this email already exists');
            }
            throw error;
        }
    }
    /**
     * Find user by email and tenant
     */
    async findByEmail(email, tenantId) {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.email = @email AND c.tenantId = @tenantId',
            parameters: [
                { name: '@email', value: email.toLowerCase() },
                { name: '@tenantId', value: tenantId },
            ],
        };
        try {
            const { resources } = await this.container.items
                .query(querySpec, { partitionKey: tenantId })
                .fetchAll();
            const user = resources[0] || null;
            // Cache the user if found
            if (user && this.cacheService) {
                await this.cacheService.setCachedUser(user);
            }
            return user;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'findByEmail',
            });
            return null;
        }
    }
    async findByEmailAcrossTenants(email) {
        const users = await this.findAllByEmail(email);
        return users[0] || null;
    }
    async findAllByEmail(email) {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: email.toLowerCase() }],
        };
        const { resources } = await this.container.items
            .query(querySpec)
            .fetchAll();
        return resources || [];
    }
    /**
     * List users with pagination and filtering
     */
    async listUsers(tenantId, options) {
        const { page, limit, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
        const parameters = [{ name: '@tenantId', value: tenantId }];
        if (search) {
            query += ' AND (CONTAINS(c.email, @search, true) OR CONTAINS(c.firstName, @search, true) OR CONTAINS(c.lastName, @search, true))';
            parameters.push({ name: '@search', value: search });
        }
        if (role) {
            query += ' AND ARRAY_CONTAINS(c.roles, @role)';
            parameters.push({ name: '@role', value: role });
        }
        if (status) {
            query += ' AND c.status = @status';
            parameters.push({ name: '@status', value: status });
        }
        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
        const { resources: countResources } = await this.container.items
            .query({ query: countQuery, parameters }, { partitionKey: tenantId })
            .fetchAll();
        const total = countResources[0] || 0;
        // Add sorting and pagination
        query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;
        query += ` OFFSET ${offset} LIMIT ${limit}`;
        const { resources } = await this.container.items
            .query({ query, parameters }, { partitionKey: tenantId })
            .fetchAll();
        return { users: resources, total };
    }
    async findDefaultUserByEmail(email) {
        const users = await this.findAllByEmail(email);
        if (!users.length) {
            return null;
        }
        return users.find((user) => user.isDefaultTenant) || users[0] || null;
    }
    async findByIdAcrossTenants(userId) {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.id = @id',
            parameters: [{ name: '@id', value: userId }],
        };
        const { resources } = await this.container.items
            .query(querySpec)
            .fetchAll();
        return resources[0] || null;
    }
    /**
     * Find user by ID and tenant
     */
    async findById(userId, tenantId) {
        // Check cache first
        if (this.cacheService) {
            const cachedUser = await this.cacheService.getCachedUser(userId, tenantId);
            if (cachedUser) {
                return cachedUser;
            }
        }
        try {
            const { resource } = await this.container.item(userId, tenantId).read();
            const user = resource || null;
            // Cache the user if found
            if (user && this.cacheService) {
                await this.cacheService.setCachedUser(user);
            }
            return user;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Verify user email with token
     */
    async verifyEmail(verificationToken, tenantId) {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.verificationToken = @token AND c.tenantId = @tenantId',
            parameters: [
                { name: '@token', value: verificationToken },
                { name: '@tenantId', value: tenantId },
            ],
        };
        try {
            const { resources } = await this.container.items
                .query(querySpec, { partitionKey: tenantId })
                .fetchAll();
            const user = resources[0];
            if (!user) {
                return null;
            }
            // Check if token is expired
            if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
                return null;
            }
            // Update user status
            user.emailVerified = true;
            if (user.status !== UserStatus.PENDING_APPROVAL) {
                user.status = UserStatus.ACTIVE;
            }
            user.verificationToken = undefined;
            user.verificationTokenExpiry = undefined;
            user.updatedAt = new Date();
            const { resource } = await this.container.item(user.id, user.tenantId).replace(user);
            const updatedUser = resource;
            // Invalidate cache and publish event
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(user.id, user.tenantId);
                await this.cacheService.publishCacheInvalidation(user.id, user.tenantId);
            }
            return updatedUser;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'verifyEmail',
            });
            return null;
        }
    }
    /**
     * Create a new verification token for an existing user
     */
    async createVerificationToken(userId, tenantId) {
        try {
            const user = await this.findById(userId, tenantId);
            if (!user) {
                return null;
            }
            // Generate new verification token
            const verificationToken = this.generateToken();
            const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            // Update user with new token
            user.verificationToken = verificationToken;
            user.verificationTokenExpiry = verificationTokenExpiry;
            user.updatedAt = new Date();
            await this.container.item(userId, tenantId).replace(user);
            // Invalidate cache
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(userId, tenantId);
                await this.cacheService.publishCacheInvalidation(userId, tenantId);
            }
            return verificationToken;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'createVerificationToken',
            });
            return null;
        }
    }
    /**
     * Find user by email across all tenants
     */
    async findByEmailGlobally(email) {
        return this.findByEmailAcrossTenants(email);
    }
    /**
     * Authenticate user with email and password
     */
    async authenticateUser(email, password, tenantId) {
        const user = await this.findByEmail(email, tenantId);
        if (!user || !user.passwordHash) {
            return null;
        }
        // Verify password first to prevent user enumeration
        const isValidPassword = await this.verifyPassword(user.passwordHash, password);
        if (!isValidPassword) {
            return null;
        }
        // Check user status after password verification
        if (user.status === UserStatus.PENDING_APPROVAL) {
            throw new Error('User account pending approval');
        }
        if (user.status !== UserStatus.ACTIVE) {
            throw new Error('User account is not active');
        }
        // Update last login
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();
        try {
            const { resource } = await this.container.item(user.id, user.tenantId).replace(user);
            const updatedUser = resource;
            // Invalidate cache and publish event
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(user.id, user.tenantId);
                await this.cacheService.publishCacheInvalidation(user.id, user.tenantId);
            }
            return updatedUser;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'authenticateUser',
                context: 'update-last-login',
            });
            return user; // Return user even if update fails
        }
    }
    /**
     * Create password reset token
     */
    async createPasswordResetToken(email, tenantId) {
        const user = await this.findByEmail(email, tenantId);
        if (!user || user.status !== UserStatus.ACTIVE) {
            return null;
        }
        const resetToken = this.generateToken();
        user.passwordResetToken = resetToken;
        user.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        user.updatedAt = new Date();
        try {
            await this.container.item(user.id, user.tenantId).replace(user);
            // Invalidate cache and publish event
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(user.id, user.tenantId);
                await this.cacheService.publishCacheInvalidation(user.id, user.tenantId);
            }
            return resetToken;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'createPasswordResetToken',
            });
            return null;
        }
    }
    /**
     * Reset password with token
     */
    async resetPassword(resetToken, newPassword, tenantId) {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.passwordResetToken = @token AND c.tenantId = @tenantId',
            parameters: [
                { name: '@token', value: resetToken },
                { name: '@tenantId', value: tenantId },
            ],
        };
        try {
            const { resources } = await this.container.items
                .query(querySpec, { partitionKey: tenantId })
                .fetchAll();
            const user = resources[0];
            if (!user) {
                return { success: false, error: 'Invalid or expired reset token' };
            }
            // Check if token is expired
            if (user.passwordResetTokenExpiry && new Date() > new Date(user.passwordResetTokenExpiry)) {
                return { success: false, error: 'Reset token has expired' };
            }
            // Check password history to prevent reuse
            const reuseCheck = await this.passwordHistoryService.checkPasswordReuse(newPassword, user.passwordHash, user.passwordHistory);
            if (reuseCheck.isReused) {
                return { success: false, error: reuseCheck.message };
            }
            // Update password history before changing
            const newPasswordHistory = user.passwordHash
                ? this.passwordHistoryService.addToHistory(user.passwordHash, user.passwordHistory)
                : user.passwordHistory || [];
            // Update password
            user.passwordHash = await this.hashPassword(newPassword);
            user.passwordResetToken = undefined;
            user.passwordResetTokenExpiry = undefined;
            user.passwordHistory = newPasswordHistory;
            user.lastPasswordChangeAt = new Date();
            user.updatedAt = new Date();
            await this.container.item(user.id, user.tenantId).replace(user);
            // Invalidate cache and publish event
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(user.id, user.tenantId);
                await this.cacheService.publishCacheInvalidation(user.id, user.tenantId);
            }
            return { success: true };
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'resetPassword',
            });
            return { success: false, error: 'Failed to reset password' };
        }
    }
    /**
     * Change password for authenticated user
     */
    async changePassword(userId, tenantId, currentPassword, newPassword) {
        try {
            const user = await this.findById(userId, tenantId);
            if (!user) {
                return { success: false, error: 'User not found' };
            }
            // Verify current password
            if (user.passwordHash) {
                const isValidPassword = await this.verifyPassword(user.passwordHash, currentPassword);
                if (!isValidPassword) {
                    return { success: false, error: 'Current password is incorrect' };
                }
            }
            // Check password history
            const reuseCheck = await this.passwordHistoryService.checkPasswordReuse(newPassword, user.passwordHash, user.passwordHistory);
            if (reuseCheck.isReused) {
                return { success: false, error: reuseCheck.message };
            }
            // Update password history
            const newPasswordHistory = user.passwordHash
                ? this.passwordHistoryService.addToHistory(user.passwordHash, user.passwordHistory)
                : user.passwordHistory || [];
            // Update password
            user.passwordHash = await this.hashPassword(newPassword);
            user.passwordHistory = newPasswordHistory;
            user.lastPasswordChangeAt = new Date();
            user.updatedAt = new Date();
            await this.container.item(userId, tenantId).replace(user);
            // Invalidate cache
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(userId, tenantId);
                await this.cacheService.publishCacheInvalidation(userId, tenantId);
            }
            return { success: true };
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'changePassword',
            });
            return { success: false, error: 'Failed to change password' };
        }
    }
    /**
     * Update user profile
     */
    async updateUser(userId, tenantId, updates) {
        try {
            const user = await this.findById(userId, tenantId);
            if (!user) {
                return null;
            }
            // Merge updates
            const updatedUser = {
                ...user,
                ...updates,
                id: user.id, // Prevent ID change
                tenantId: user.tenantId, // Prevent tenant change
                partitionKey: user.partitionKey, // Prevent partition key change
                updatedAt: new Date(),
            };
            const { resource } = await this.container.item(userId, tenantId).replace(updatedUser);
            const result = resource;
            // Invalidate cache and publish event
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(userId, tenantId);
                await this.cacheService.publishCacheInvalidation(userId, tenantId);
            }
            return result;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'updateUser',
            });
            return null;
        }
    }
    async ensureUserRoles(userId, tenantId, roles) {
        if (!roles || roles.length === 0) {
            return this.findById(userId, tenantId);
        }
        const user = await this.findById(userId, tenantId);
        if (!user) {
            return null;
        }
        const mergedRoles = Array.from(new Set([...(user.roles || []), ...roles]));
        if (mergedRoles.length === user.roles.length) {
            return user;
        }
        user.roles = mergedRoles;
        user.updatedAt = new Date();
        const { resource } = await this.container.item(userId, tenantId).replace(user);
        const updated = resource;
        if (this.cacheService) {
            await this.cacheService.invalidateUserCache(userId, tenantId);
            await this.cacheService.publishCacheInvalidation(userId, tenantId);
        }
        return updated;
    }
    async cloneUserToTenant(sourceUser, targetTenantId, roles) {
        const userId = randomBytes(16).toString('hex');
        const now = new Date();
        const linkedTenantIds = new Set(sourceUser.linkedTenantIds || []);
        linkedTenantIds.add(sourceUser.tenantId);
        const cloned = {
            id: userId,
            tenantId: targetTenantId,
            tenantIds: [targetTenantId],
            activeTenantId: targetTenantId,
            isDefaultTenant: false,
            email: sourceUser.email,
            emailVerified: sourceUser.emailVerified,
            passwordHash: sourceUser.passwordHash,
            firstName: sourceUser.firstName,
            lastName: sourceUser.lastName,
            status: sourceUser.emailVerified ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
            pendingTenantId: undefined,
            organizationId: sourceUser.organizationId,
            roles: roles && roles.length ? roles : sourceUser.roles,
            verificationToken: sourceUser.emailVerified ? undefined : sourceUser.verificationToken,
            verificationTokenExpiry: sourceUser.emailVerified ? undefined : sourceUser.verificationTokenExpiry,
            passwordResetToken: undefined,
            passwordResetTokenExpiry: undefined,
            providers: sourceUser.providers,
            oauthProviders: sourceUser.oauthProviders,
            linkedUserId: sourceUser.linkedUserId || sourceUser.id,
            linkedTenantIds: Array.from(linkedTenantIds),
            createdAt: now,
            updatedAt: now,
            lastLoginAt: undefined,
            metadata: sourceUser.metadata,
            partitionKey: targetTenantId,
        };
        const { resource } = await this.container.items.create(cloned);
        const createdUser = resource;
        if (this.cacheService) {
            await this.cacheService.setCachedUser(createdUser);
        }
        return createdUser;
    }
    async createInvitedUserAccount(email, tenantId, roles) {
        const password = randomBytes(24).toString('hex');
        const invitedUser = await this.createUser({
            email,
            password,
            tenantId,
            roles: roles && roles.length ? roles : ['user'],
            status: UserStatus.PENDING_VERIFICATION,
            emailVerified: false,
        });
        return invitedUser;
    }
    /**
     * Delete user (soft delete)
     */
    async deleteUser(userId, tenantId) {
        try {
            const user = await this.findById(userId, tenantId);
            if (!user) {
                return false;
            }
            user.status = UserStatus.DELETED;
            user.updatedAt = new Date();
            await this.container.item(userId, tenantId).replace(user);
            // Invalidate cache and publish event
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(userId, tenantId);
                await this.cacheService.publishCacheInvalidation(userId, tenantId);
            }
            return true;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                component: 'UserService',
                operation: 'deleteUser',
            });
            return false;
        }
    }
    async updateDefaultTenant(email, newDefaultTenantId) {
        const memberships = await this.findAllByEmail(email);
        if (!memberships.length) {
            throw new Error('User not found for default tenant update');
        }
        const targetMembership = memberships.find((membership) => membership.tenantId === newDefaultTenantId);
        if (!targetMembership) {
            throw new Error('User is not a member of the requested tenant');
        }
        await Promise.all(memberships.map(async (membership) => {
            const shouldBeDefault = membership.tenantId === newDefaultTenantId;
            if (membership.isDefaultTenant === shouldBeDefault) {
                return;
            }
            membership.isDefaultTenant = shouldBeDefault;
            membership.updatedAt = new Date();
            await this.container.item(membership.id, membership.tenantId).replace(membership);
            if (this.cacheService) {
                await this.cacheService.invalidateUserCache(membership.id, membership.tenantId);
                await this.cacheService.publishCacheInvalidation(membership.id, membership.tenantId);
            }
        }));
        return targetMembership;
    }
}
//# sourceMappingURL=user.service.js.map