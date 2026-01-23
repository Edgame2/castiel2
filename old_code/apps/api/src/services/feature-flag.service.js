/**
 * Feature Flag Service
 *
 * Business logic for managing and evaluating feature flags.
 * Supports global and tenant-specific flags with environment, role, and percentage-based rollouts.
 */
/**
 * Feature Flag Service
 */
export class FeatureFlagService {
    repository;
    monitoring;
    cache = new Map();
    CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    constructor(repository, monitoring) {
        this.repository = repository;
        this.monitoring = monitoring;
    }
    /**
     * Initialize the service
     */
    async initialize() {
        await this.repository.initialize();
    }
    /**
     * Get current environment from NODE_ENV
     */
    getCurrentEnvironment() {
        const env = process.env.NODE_ENV || 'development';
        if (env === 'production')
            return 'production';
        if (env === 'staging')
            return 'staging';
        return 'development';
    }
    /**
     * Calculate user rollout percentage (consistent hash)
     */
    getUserRolloutPercentage(userId) {
        if (!userId)
            return 0;
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash % 100);
    }
    /**
     * Evaluate if a feature flag is enabled for the given context
     */
    async isEnabled(flagName, context) {
        try {
            const flag = await this.getFlag(flagName, context?.tenantId);
            if (!flag) {
                // Flag doesn't exist - default to false
                return false;
            }
            // Check if globally disabled
            if (!flag.enabled) {
                return false;
            }
            // Check environment restrictions
            const currentEnv = context?.environment || this.getCurrentEnvironment();
            if (flag.environments && flag.environments.length > 0) {
                if (!flag.environments.includes(currentEnv)) {
                    return false;
                }
            }
            // Check role restrictions
            if (flag.roles && flag.roles.length > 0 && context?.userRole) {
                if (!flag.roles.includes(context.userRole)) {
                    return false;
                }
            }
            // Check percentage rollout
            if (flag.percentage !== undefined && context?.userId) {
                const userPercentage = this.getUserRolloutPercentage(context.userId);
                if (userPercentage >= flag.percentage) {
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'isEnabled',
                flagName,
                tenantId: context?.tenantId,
            });
            // On error, default to false (fail closed)
            return false;
        }
    }
    /**
     * Get a feature flag by name (with tenant override support)
     */
    async getFlag(name, tenantId) {
        const cacheKey = `${name}:${tenantId || 'global'}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.flag;
        }
        try {
            const flag = await this.repository.getByName(name, tenantId ?? undefined);
            // Cache the result
            this.cache.set(cacheKey, {
                flag,
                expiresAt: Date.now() + this.CACHE_TTL_MS,
            });
            return flag;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'getFlag',
                name,
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * List all feature flags for a tenant
     */
    async list(tenantId) {
        try {
            return await this.repository.list(tenantId ?? null);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'list',
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * Create a feature flag
     */
    async create(input, userId) {
        try {
            // Check if flag already exists
            const existing = await this.repository.getByName(input.name, input.tenantId);
            if (existing) {
                throw new Error(`Feature flag "${input.name}" already exists`);
            }
            const flag = await this.repository.create(input, userId);
            // Invalidate cache
            this.invalidateCache(input.name, input.tenantId ?? undefined);
            this.monitoring.trackEvent('feature-flag-created', {
                name: input.name,
                tenantId: input.tenantId || 'global',
                enabled: input.enabled,
            });
            return flag;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'create',
                name: input.name,
                tenantId: input.tenantId,
            });
            throw error;
        }
    }
    /**
     * Update a feature flag
     */
    async update(id, tenantId, input, userId) {
        try {
            const flag = await this.repository.update(id, tenantId ?? null, input, userId);
            if (!flag) {
                throw new Error(`Feature flag not found: ${id}`);
            }
            // Invalidate cache
            this.invalidateCache(flag.name, tenantId ?? undefined);
            this.monitoring.trackEvent('feature-flag-updated', {
                id,
                name: flag.name,
                tenantId: tenantId || 'global',
            });
            return flag;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'update',
                id,
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * Delete a feature flag
     */
    async delete(id, tenantId) {
        try {
            // Get flag name before deleting for cache invalidation
            const flag = await this.repository.getById(id, tenantId ?? null);
            const deleted = await this.repository.delete(id, tenantId ?? null);
            if (deleted && flag) {
                // Invalidate cache
                this.invalidateCache(flag.name, tenantId);
            }
            return deleted;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'delete',
                id,
                tenantId: tenantId ?? 'global',
            });
            throw error;
        }
    }
    /**
     * Invalidate cache for a feature flag
     */
    invalidateCache(name, tenantId) {
        const cacheKey = `${name}:${tenantId || 'global'}`;
        this.cache.delete(cacheKey);
    }
    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=feature-flag.service.js.map