/**
 * SCIM Service
 * Implements SCIM 2.0 protocol for user and group provisioning
 */
import { createHash, randomBytes } from 'crypto';
/**
 * SCIM Service
 */
export class SCIMService {
    configContainer;
    activityContainer;
    userContainer;
    userService;
    userManagementService;
    redis;
    monitoring;
    CACHE_PREFIX = 'scim:config:';
    CACHE_TTL = 3600; // 1 hour
    constructor(configContainer, // tenant-configs container
    activityContainer, // scim-activity-logs container
    userContainer, // users container
    userService, userManagementService, redis, monitoring) {
        this.configContainer = configContainer;
        this.activityContainer = activityContainer;
        this.userContainer = userContainer;
        this.userService = userService;
        this.userManagementService = userManagementService;
        this.redis = redis;
        this.monitoring = monitoring;
    }
    // ============================================
    // Credential Management
    // ============================================
    /**
     * Generate a secure SCIM bearer token
     */
    generateToken() {
        return `scim_${randomBytes(32).toString('base64url')}`;
    }
    /**
     * Hash SCIM token for storage
     */
    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
    /**
     * Verify SCIM token
     */
    async verifyToken(tenantId, token) {
        const config = await this.getConfig(tenantId);
        if (!config || !config.enabled) {
            return false;
        }
        const tokenHash = this.hashToken(token);
        return tokenHash === config.tokenHash;
    }
    /**
     * Get or create SCIM configuration for tenant
     */
    async getConfig(tenantId) {
        // Try cache first
        if (this.redis) {
            const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        // Query from Cosmos DB
        const { resources } = await this.configContainer.items
            .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.configType = @type',
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@type', value: 'scim-config' },
            ],
        })
            .fetchAll();
        if (resources.length === 0) {
            return null;
        }
        const config = resources[0];
        // Cache for future requests
        if (this.redis) {
            const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
            await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(config));
        }
        return config;
    }
    /**
     * Enable SCIM for tenant (creates config if doesn't exist)
     */
    async enableSCIM(tenantId, createdBy, baseUrl) {
        const existing = await this.getConfig(tenantId);
        if (existing && existing.enabled) {
            throw new Error('SCIM is already enabled for this tenant');
        }
        const token = this.generateToken();
        const tokenHash = this.hashToken(token);
        const endpointUrl = `${baseUrl}/scim/v2`;
        const config = existing
            ? {
                ...existing,
                enabled: true,
                tokenHash,
                endpointUrl,
                updatedAt: new Date(),
            }
            : {
                id: `tenant-${tenantId}-scim`,
                tenantId,
                enabled: true,
                token: '', // Never store plain token
                tokenHash,
                endpointUrl,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy,
                partitionKey: tenantId,
            };
        // Store in Cosmos DB
        if (existing) {
            await this.configContainer.item(config.id, tenantId).replace({
                ...config,
                configType: 'scim-config', // Add type for querying
            });
        }
        else {
            await this.configContainer.items.create({
                ...config,
                configType: 'scim-config',
            });
        }
        // Invalidate cache
        if (this.redis) {
            const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
            await this.redis.del(cacheKey);
        }
        this.monitoring?.trackEvent('scim.enabled', {
            tenantId,
            createdBy,
        });
        return { config, token };
    }
    /**
     * Disable SCIM for tenant
     */
    async disableSCIM(tenantId) {
        const config = await this.getConfig(tenantId);
        if (!config) {
            throw new Error('SCIM is not configured for this tenant');
        }
        config.enabled = false;
        config.updatedAt = new Date();
        await this.configContainer.item(config.id, tenantId).replace({
            ...config,
            configType: 'scim-config',
        });
        // Invalidate cache
        if (this.redis) {
            const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
            await this.redis.del(cacheKey);
        }
        this.monitoring?.trackEvent('scim.disabled', { tenantId });
    }
    /**
     * Rotate SCIM token
     */
    async rotateToken(tenantId) {
        const config = await this.getConfig(tenantId);
        if (!config || !config.enabled) {
            throw new Error('SCIM is not enabled for this tenant');
        }
        const token = this.generateToken();
        const tokenHash = this.hashToken(token);
        config.tokenHash = tokenHash;
        config.lastRotatedAt = new Date();
        config.updatedAt = new Date();
        await this.configContainer.item(config.id, tenantId).replace({
            ...config,
            configType: 'scim-config',
        });
        // Invalidate cache
        if (this.redis) {
            const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
            await this.redis.del(cacheKey);
        }
        this.monitoring?.trackEvent('scim.token-rotated', { tenantId });
        return token;
    }
    /**
     * Get SCIM config response (for API, token only shown on creation/rotation)
     */
    async getConfigResponse(tenantId) {
        const config = await this.getConfig(tenantId);
        if (!config) {
            return null;
        }
        return {
            enabled: config.enabled,
            endpointUrl: config.endpointUrl,
            createdAt: config.createdAt,
            lastRotatedAt: config.lastRotatedAt,
        };
    }
    // ============================================
    // SCIM User Operations
    // ============================================
    /**
     * Create user via SCIM
     */
    async createUser(tenantId, scimUser) {
        const startTime = Date.now();
        try {
            // Extract primary email
            const primaryEmail = scimUser.emails.find((e) => e.primary) || scimUser.emails[0];
            if (!primaryEmail) {
                throw new Error('User must have at least one email address');
            }
            // Check if user already exists (find by email in tenant)
            const { resources: existingUsers } = await this.userContainer.items
                .query({
                query: 'SELECT * FROM c WHERE c.email = @email AND c.tenantId = @tenantId',
                parameters: [
                    { name: '@email', value: primaryEmail.value.toLowerCase() },
                    { name: '@tenantId', value: tenantId },
                ],
            })
                .fetchAll();
            const existingUser = existingUsers[0];
            if (existingUser) {
                // Update existing user instead
                return this.updateUser(tenantId, existingUser.id, scimUser, 'PUT');
            }
            // Map SCIM user to internal user model
            const userData = {
                email: primaryEmail.value.toLowerCase(),
                password: scimUser.password || randomBytes(32).toString('hex'), // Random password if not provided
                firstName: scimUser.name?.givenName || scimUser.displayName?.split(' ')[0],
                lastName: scimUser.name?.familyName || scimUser.displayName?.split(' ').slice(1).join(' '),
                tenantId,
                emailVerified: true, // SCIM users are pre-verified
                status: scimUser.active ? UserStatus.ACTIVE : UserStatus.PENDING_APPROVAL,
                roles: ['user'], // Default role
                metadata: {
                    scimId: scimUser.id || randomBytes(16).toString('hex'),
                    scimExternalId: scimUser.externalId,
                    scimUserName: scimUser.userName,
                    provisionedVia: 'scim',
                },
            };
            const user = await this.userService.createUser(userData);
            // Create SCIM user response
            const createdSCIMUser = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: user.metadata?.scimId || user.id,
                externalId: user.metadata?.scimExternalId,
                userName: scimUser.userName || primaryEmail.value,
                name: {
                    formatted: scimUser.name?.formatted || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                    familyName: user.lastName,
                    givenName: user.firstName,
                },
                displayName: scimUser.displayName || user.firstName || user.email,
                active: user.status === UserStatus.ACTIVE,
                emails: [
                    {
                        value: user.email,
                        primary: true,
                        type: 'work',
                    },
                ],
                meta: {
                    resourceType: 'User',
                    created: user.createdAt.toISOString(),
                    lastModified: user.updatedAt.toISOString(),
                    location: `/scim/v2/Users/${user.metadata?.scimId || user.id}`,
                },
            };
            // Log activity
            await this.logActivity(tenantId, {
                operation: 'create',
                resourceType: 'User',
                resourceId: createdSCIMUser.id,
                success: true,
                metadata: { userId: user.id },
            });
            this.monitoring?.trackEvent('scim.user.created', {
                tenantId,
                userId: user.id,
                scimId: createdSCIMUser.id,
                durationMs: Date.now() - startTime,
            });
            return createdSCIMUser;
        }
        catch (error) {
            await this.logActivity(tenantId, {
                operation: 'create',
                resourceType: 'User',
                success: false,
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Get user via SCIM
     */
    async getUser(tenantId, userId) {
        try {
            // Try to find by SCIM ID first, then by internal user ID
            const { resources } = await this.userContainer.items
                .query({
                query: `
            SELECT * FROM c 
            WHERE c.tenantId = @tenantId 
            AND (c.metadata.scimId = @scimId OR c.id = @userId)
          `,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@scimId', value: userId },
                    { name: '@userId', value: userId },
                ],
            })
                .fetchAll();
            if (resources.length === 0) {
                return null;
            }
            const user = resources[0];
            return this.mapUserToSCIM(user);
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                operation: 'scim.getUser',
                tenantId,
                userId,
            });
            return null;
        }
    }
    /**
     * List users via SCIM
     */
    async listUsers(tenantId, startIndex = 1, count = 100, filter) {
        try {
            // Parse filter (simple implementation - supports userName eq "value")
            let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
            const parameters = [{ name: '@tenantId', value: tenantId }];
            if (filter) {
                // Simple filter parsing for userName eq "value"
                const userNameMatch = filter.match(/userName eq "([^"]+)"/);
                if (userNameMatch) {
                    query += ' AND c.email = @email';
                    parameters.push({ name: '@email', value: userNameMatch[1].toLowerCase() });
                }
            }
            const { resources } = await this.userContainer.items
                .query({ query, parameters })
                .fetchAll();
            const users = resources;
            const scimUsers = users.map((u) => this.mapUserToSCIM(u));
            // Apply pagination
            const totalResults = scimUsers.length;
            const itemsPerPage = Math.min(count, 100);
            const start = Math.max(0, startIndex - 1);
            const paginatedUsers = scimUsers.slice(start, start + itemsPerPage);
            return {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
                totalResults,
                itemsPerPage,
                startIndex,
                Resources: paginatedUsers,
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                operation: 'scim.listUsers',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Update user via SCIM (PUT - full update)
     */
    async updateUser(tenantId, userId, scimUser, method = 'PUT') {
        const startTime = Date.now();
        try {
            const existing = await this.getUser(tenantId, userId);
            if (!existing) {
                throw new Error('User not found');
            }
            // Find internal user
            const { resources } = await this.userContainer.items
                .query({
                query: `
            SELECT * FROM c 
            WHERE c.tenantId = @tenantId 
            AND (c.metadata.scimId = @scimId OR c.id = @userId)
          `,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@scimId', value: userId },
                    { name: '@userId', value: userId },
                ],
            })
                .fetchAll();
            if (resources.length === 0) {
                throw new Error('User not found');
            }
            const user = resources[0];
            // Update user fields
            const primaryEmail = scimUser.emails.find((e) => e.primary) || scimUser.emails[0];
            if (primaryEmail && primaryEmail.value !== user.email) {
                // Email change - would need special handling in production
                this.monitoring?.trackEvent('scim.user.email-change-attempted', {
                    tenantId,
                    userId: user.id,
                });
            }
            const updates = {
                firstName: scimUser.name?.givenName || user.firstName,
                lastName: scimUser.name?.familyName || user.lastName,
                status: scimUser.active ? UserStatus.ACTIVE : UserStatus.SUSPENDED,
                updatedAt: new Date(),
                metadata: {
                    ...user.metadata,
                    scimExternalId: scimUser.externalId,
                    scimUserName: scimUser.userName,
                },
            };
            await this.userContainer.item(user.id, tenantId).replace({
                ...user,
                ...updates,
            });
            const updatedSCIMUser = await this.getUser(tenantId, userId);
            if (!updatedSCIMUser) {
                throw new Error('Failed to retrieve updated user');
            }
            await this.logActivity(tenantId, {
                operation: method.toLowerCase(),
                resourceType: 'User',
                resourceId: userId,
                success: true,
                metadata: { userId: user.id },
            });
            this.monitoring?.trackEvent('scim.user.updated', {
                tenantId,
                userId: user.id,
                method,
                durationMs: Date.now() - startTime,
            });
            return updatedSCIMUser;
        }
        catch (error) {
            await this.logActivity(tenantId, {
                operation: method.toLowerCase(),
                resourceType: 'User',
                resourceId: userId,
                success: false,
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Patch user via SCIM (PATCH - partial update)
     */
    async patchUser(tenantId, userId, patchRequest) {
        const existing = await this.getUser(tenantId, userId);
        if (!existing) {
            throw new Error('User not found');
        }
        // Apply patch operations
        for (const op of patchRequest.Operations) {
            if (op.op === 'replace') {
                if (op.path === 'active') {
                    existing.active = op.value;
                }
                else if (op.path === 'name.givenName') {
                    existing.name = existing.name || {};
                    existing.name.givenName = op.value;
                }
                else if (op.path === 'name.familyName') {
                    existing.name = existing.name || {};
                    existing.name.familyName = op.value;
                }
                else if (op.path === 'emails[value eq "' + existing.emails[0]?.value + '"].value') {
                    // Email update - complex, would need special handling
                    this.monitoring?.trackEvent('scim.user.email-patch-attempted', {
                        tenantId,
                        userId,
                    });
                }
            }
            else if (op.op === 'add') {
                // Add operation
                if (op.path === 'emails') {
                    existing.emails.push(...op.value);
                }
            }
            else if (op.op === 'remove') {
                // Remove operation
                if (op.path?.startsWith('emails[')) {
                    const emailIndex = parseInt(op.path.match(/\[(\d+)\]/)?.[1] || '0');
                    existing.emails.splice(emailIndex, 1);
                }
            }
        }
        return this.updateUser(tenantId, userId, existing, 'PATCH');
    }
    /**
     * Delete user via SCIM
     */
    async deleteUser(tenantId, userId) {
        const startTime = Date.now();
        try {
            const existing = await this.getUser(tenantId, userId);
            if (!existing) {
                throw new Error('User not found');
            }
            // Find internal user
            const { resources } = await this.userContainer.items
                .query({
                query: `
            SELECT * FROM c 
            WHERE c.tenantId = @tenantId 
            AND (c.metadata.scimId = @scimId OR c.id = @userId)
          `,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@scimId', value: userId },
                    { name: '@userId', value: userId },
                ],
            })
                .fetchAll();
            if (resources.length === 0) {
                throw new Error('User not found');
            }
            const user = resources[0];
            // Deactivate user instead of deleting (soft delete)
            await this.userContainer.item(user.id, tenantId).replace({
                ...user,
                status: UserStatus.DELETED,
                updatedAt: new Date(),
            });
            await this.logActivity(tenantId, {
                operation: 'delete',
                resourceType: 'User',
                resourceId: userId,
                success: true,
                metadata: { userId: user.id },
            });
            this.monitoring?.trackEvent('scim.user.deleted', {
                tenantId,
                userId: user.id,
                durationMs: Date.now() - startTime,
            });
        }
        catch (error) {
            await this.logActivity(tenantId, {
                operation: 'delete',
                resourceType: 'User',
                resourceId: userId,
                success: false,
                error: error.message,
            });
            throw error;
        }
    }
    // ============================================
    // Helper Methods
    // ============================================
    /**
     * Map internal User to SCIM User
     */
    mapUserToSCIM(user) {
        return {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            id: user.metadata?.scimId || user.id,
            externalId: user.metadata?.scimExternalId,
            userName: user.metadata?.scimUserName || user.email,
            name: {
                formatted: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                familyName: user.lastName,
                givenName: user.firstName,
            },
            displayName: user.firstName || user.email,
            active: user.status === UserStatus.ACTIVE,
            emails: [
                {
                    value: user.email,
                    primary: true,
                    type: 'work',
                },
            ],
            meta: {
                resourceType: 'User',
                created: user.createdAt.toISOString(),
                lastModified: user.updatedAt.toISOString(),
                location: `/scim/v2/Users/${user.metadata?.scimId || user.id}`,
            },
        };
    }
    /**
     * Log SCIM activity
     */
    async logActivity(tenantId, activity) {
        const log = {
            id: randomBytes(16).toString('hex'),
            tenantId,
            timestamp: new Date(),
            ...activity,
            partitionKey: tenantId,
        };
        try {
            await this.activityContainer.items.create(log);
        }
        catch (error) {
            // Non-blocking - log error but don't fail the operation
            this.monitoring?.trackException(error, {
                operation: 'scim.logActivity',
                tenantId,
            });
        }
    }
    /**
     * Get SCIM activity logs
     */
    async getActivityLogs(tenantId, limit = 100) {
        const { resources } = await this.activityContainer.items
            .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@limit', value: limit },
            ],
        })
            .fetchAll();
        return resources;
    }
    // ============================================
    // SCIM Group Operations
    // SCIM Groups map to user roles in the system
    // ============================================
    /**
     * Create group via SCIM (maps to role)
     * Note: In this implementation, Groups represent roles
     */
    async createGroup(tenantId, scimGroup) {
        const startTime = Date.now();
        try {
            // In this implementation, Groups are read-only representations of roles
            // We don't create new roles via SCIM, only manage membership
            // If group doesn't exist as a role, return error
            const roleName = scimGroup.displayName.toLowerCase();
            const validRoles = ['admin', 'user', 'owner', 'global_admin', 'super_admin'];
            if (!validRoles.includes(roleName)) {
                throw new Error(`Group "${scimGroup.displayName}" does not exist as a role`);
            }
            // Add members to the role
            if (scimGroup.members && scimGroup.members.length > 0) {
                for (const member of scimGroup.members) {
                    const user = await this.getUser(tenantId, member.value);
                    if (user) {
                        // Find internal user and add role
                        const { resources } = await this.userContainer.items
                            .query({
                            query: `
                  SELECT * FROM c 
                  WHERE c.tenantId = @tenantId 
                  AND (c.metadata.scimId = @scimId OR c.id = @userId)
                `,
                            parameters: [
                                { name: '@tenantId', value: tenantId },
                                { name: '@scimId', value: member.value },
                                { name: '@userId', value: member.value },
                            ],
                        })
                            .fetchAll();
                        if (resources.length > 0) {
                            const internalUser = resources[0];
                            if (!internalUser.roles.includes(roleName)) {
                                internalUser.roles = [...internalUser.roles, roleName];
                                await this.userContainer.item(internalUser.id, tenantId).replace(internalUser);
                            }
                        }
                    }
                }
            }
            const createdGroup = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
                id: roleName,
                displayName: scimGroup.displayName,
                members: scimGroup.members || [],
                meta: {
                    resourceType: 'Group',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    location: `/scim/v2/Groups/${roleName}`,
                },
            };
            await this.logActivity(tenantId, {
                operation: 'create',
                resourceType: 'Group',
                resourceId: roleName,
                success: true,
            });
            this.monitoring?.trackEvent('scim.group.created', {
                tenantId,
                groupId: roleName,
                durationMs: Date.now() - startTime,
            });
            return createdGroup;
        }
        catch (error) {
            await this.logActivity(tenantId, {
                operation: 'create',
                resourceType: 'Group',
                success: false,
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Get group via SCIM
     */
    async getGroup(tenantId, groupId) {
        try {
            const roleName = groupId.toLowerCase();
            const validRoles = ['admin', 'user', 'owner', 'global_admin', 'super_admin'];
            if (!validRoles.includes(roleName)) {
                return null;
            }
            // Get all users with this role
            const { resources } = await this.userContainer.items
                .query({
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND ARRAY_CONTAINS(c.roles, @role)',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@role', value: roleName },
                ],
            })
                .fetchAll();
            const users = resources;
            const members = users.map((u) => ({
                value: u.metadata?.scimId || u.id,
                display: u.email,
                $ref: `/scim/v2/Users/${u.metadata?.scimId || u.id}`,
            }));
            return {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
                id: roleName,
                displayName: roleName.charAt(0).toUpperCase() + roleName.slice(1),
                members,
                meta: {
                    resourceType: 'Group',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    location: `/scim/v2/Groups/${roleName}`,
                },
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                operation: 'scim.getGroup',
                tenantId,
                groupId,
            });
            return null;
        }
    }
    /**
     * List groups via SCIM
     */
    async listGroups(tenantId, startIndex = 1, count = 100, filter) {
        try {
            const validRoles = ['admin', 'user', 'owner', 'global_admin', 'super_admin'];
            const groups = [];
            for (const roleName of validRoles) {
                const group = await this.getGroup(tenantId, roleName);
                if (group) {
                    groups.push(group);
                }
            }
            // Apply pagination
            const totalResults = groups.length;
            const itemsPerPage = Math.min(count, 100);
            const start = Math.max(0, startIndex - 1);
            const paginatedGroups = groups.slice(start, start + itemsPerPage);
            return {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
                totalResults,
                itemsPerPage,
                startIndex,
                Resources: paginatedGroups,
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                operation: 'scim.listGroups',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Patch group via SCIM (update membership)
     */
    async patchGroup(tenantId, groupId, patchRequest) {
        const startTime = Date.now();
        try {
            const roleName = groupId.toLowerCase();
            const validRoles = ['admin', 'user', 'owner', 'global_admin', 'super_admin'];
            if (!validRoles.includes(roleName)) {
                throw new Error('Group not found');
            }
            // Apply patch operations
            for (const op of patchRequest.Operations) {
                if (op.op === 'add' && op.path === 'members') {
                    // Add members to role
                    const membersToAdd = Array.isArray(op.value) ? op.value : [op.value];
                    for (const member of membersToAdd) {
                        const userId = typeof member === 'string' ? member : member.value;
                        const user = await this.getUser(tenantId, userId);
                        if (user) {
                            const { resources } = await this.userContainer.items
                                .query({
                                query: `
                    SELECT * FROM c 
                    WHERE c.tenantId = @tenantId 
                    AND (c.metadata.scimId = @scimId OR c.id = @userId)
                  `,
                                parameters: [
                                    { name: '@tenantId', value: tenantId },
                                    { name: '@scimId', value: userId },
                                    { name: '@userId', value: userId },
                                ],
                            })
                                .fetchAll();
                            if (resources.length > 0) {
                                const internalUser = resources[0];
                                if (!internalUser.roles.includes(roleName)) {
                                    internalUser.roles = [...internalUser.roles, roleName];
                                    await this.userContainer.item(internalUser.id, tenantId).replace(internalUser);
                                }
                            }
                        }
                    }
                }
                else if (op.op === 'remove' && op.path?.startsWith('members[')) {
                    // Remove members from role
                    const memberValue = op.value;
                    const userId = typeof memberValue === 'string' ? memberValue : memberValue.value;
                    const { resources } = await this.userContainer.items
                        .query({
                        query: `
                SELECT * FROM c 
                WHERE c.tenantId = @tenantId 
                AND (c.metadata.scimId = @scimId OR c.id = @userId)
              `,
                        parameters: [
                            { name: '@tenantId', value: tenantId },
                            { name: '@scimId', value: userId },
                            { name: '@userId', value: userId },
                        ],
                    })
                        .fetchAll();
                    if (resources.length > 0) {
                        const internalUser = resources[0];
                        internalUser.roles = internalUser.roles.filter((r) => r !== roleName);
                        await this.userContainer.item(internalUser.id, tenantId).replace(internalUser);
                    }
                }
            }
            const updatedGroup = await this.getGroup(tenantId, groupId);
            if (!updatedGroup) {
                throw new Error('Failed to retrieve updated group');
            }
            await this.logActivity(tenantId, {
                operation: 'patch',
                resourceType: 'Group',
                resourceId: groupId,
                success: true,
            });
            this.monitoring?.trackEvent('scim.group.patched', {
                tenantId,
                groupId,
                durationMs: Date.now() - startTime,
            });
            return updatedGroup;
        }
        catch (error) {
            await this.logActivity(tenantId, {
                operation: 'patch',
                resourceType: 'Group',
                resourceId: groupId,
                success: false,
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Delete group via SCIM
     * Note: We don't actually delete roles, just remove all members
     */
    async deleteGroup(tenantId, groupId) {
        const startTime = Date.now();
        try {
            const roleName = groupId.toLowerCase();
            const validRoles = ['admin', 'user', 'owner', 'global_admin', 'super_admin'];
            if (!validRoles.includes(roleName)) {
                throw new Error('Group not found');
            }
            // Remove role from all users
            const { resources } = await this.userContainer.items
                .query({
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND ARRAY_CONTAINS(c.roles, @role)',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@role', value: roleName },
                ],
            })
                .fetchAll();
            for (const user of resources) {
                user.roles = user.roles.filter((r) => r !== roleName);
                await this.userContainer.item(user.id, tenantId).replace(user);
            }
            await this.logActivity(tenantId, {
                operation: 'delete',
                resourceType: 'Group',
                resourceId: groupId,
                success: true,
            });
            this.monitoring?.trackEvent('scim.group.deleted', {
                tenantId,
                groupId,
                durationMs: Date.now() - startTime,
            });
        }
        catch (error) {
            await this.logActivity(tenantId, {
                operation: 'delete',
                resourceType: 'Group',
                resourceId: groupId,
                success: false,
                error: error.message,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=scim.service.js.map