/**
 * Tenant Project Configuration Service
 * Manages tenant-specific project settings with caching and validation
 */
const SYSTEM_CONFIG_ID = 'system-project-config';
const CACHE_KEY_PREFIX = 'tenant-project-settings:';
const SYSTEM_CACHE_KEY = 'system-project-settings';
const CACHE_TTL = 3600; // 1 hour
export class TenantProjectConfigService {
    cosmosDb;
    cache;
    monitoring;
    logger = {
        log: (message) => {
            if (this.monitoring) {
                this.monitoring.trackEvent('tenant-project-config.log', { message });
            }
        },
        error: (message, error) => {
            if (this.monitoring) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(message), { operation: 'tenant-project-config.error' });
            }
        },
        warn: (message) => {
            if (this.monitoring) {
                this.monitoring.trackEvent('tenant-project-config.warn', { message });
            }
        },
        debug: (message) => {
            if (this.monitoring) {
                this.monitoring.trackEvent('tenant-project-config.debug', { message });
            }
        },
    };
    constructor(cosmosDb, cache, monitoring) {
        this.cosmosDb = cosmosDb;
        this.cache = cache;
        this.monitoring = monitoring;
    }
    /**
     * Get tenant project settings with caching
     */
    async getTenantConfig(tenantId) {
        const cacheKey = `${CACHE_KEY_PREFIX}${tenantId}`;
        // Try cache first
        if (this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        // Fetch from database
        try {
            const resources = await this.cosmosDb.queryDocuments('tenant-configs', 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.configType = @type', [
                { name: '@tenantId', value: tenantId },
                { name: '@type', value: 'project-settings' },
            ], tenantId);
            const filtered = resources.filter(r => r.tenantId === tenantId && r.configType === 'project-settings');
            if (filtered.length === 0) {
                // Return defaults
                return this.getDefaultTenantConfig(tenantId);
            }
            const config = filtered[0];
            if (this.cache) {
                await this.cache.set(cacheKey, config, CACHE_TTL);
            }
            return config;
        }
        catch (error) {
            this.logger.error(`Failed to get tenant config for ${tenantId}`, error);
            return this.getDefaultTenantConfig(tenantId);
        }
    }
    /**
     * Update tenant project settings
     */
    async updateTenantConfig(tenantId, input, updatedBy) {
        // Get current config
        const current = await this.getTenantConfig(tenantId);
        // Validate input
        this.validateConfigInput(input);
        // Merge with existing, preserving required metadata fields and ensuring all required fields are present
        const updated = {
            ...current,
            ...input,
            tenantId: current.tenantId, // Ensure tenantId is preserved
            createdAt: current.createdAt, // Preserve creation metadata
            createdBy: current.createdBy, // Preserve creation metadata
            updatedAt: new Date(),
            updatedBy,
            // Ensure required objects are fully merged, not partially replaced
            projectRoles: input.projectRoles ? { ...current.projectRoles, ...input.projectRoles } : current.projectRoles,
            recommendationConfig: input.recommendationConfig ? { ...current.recommendationConfig, ...input.recommendationConfig } : current.recommendationConfig,
        };
        // Store in database
        try {
            const item = {
                id: `${tenantId}-project-settings`,
                configType: 'project-settings',
                ...updated,
            };
            await this.cosmosDb.upsertDocument('tenant-configs', item, tenantId);
            // Invalidate cache
            if (this.cache) {
                await this.cache.delete(`${CACHE_KEY_PREFIX}${tenantId}`);
            }
            this.logger.log(`Updated tenant project config for ${tenantId}`);
            return updated;
        }
        catch (error) {
            this.logger.error(`Failed to update tenant config for ${tenantId}`, error);
            throw error;
        }
    }
    /**
     * Reset tenant config to system defaults
     */
    async resetToDefaults(tenantId, updatedBy) {
        const defaults = this.getDefaultTenantConfig(tenantId);
        defaults.updatedBy = updatedBy;
        defaults.updatedAt = new Date();
        try {
            await this.cosmosDb.upsertDocument('tenant-configs', {
                id: `${tenantId}-project-settings`,
                configType: 'project-settings',
                ...defaults,
            }, tenantId);
            if (this.cache) {
                await this.cache.delete(`${CACHE_KEY_PREFIX}${tenantId}`);
            }
            this.logger.log(`Reset tenant project config to defaults for ${tenantId}`);
            return defaults;
        }
        catch (error) {
            this.logger.error(`Failed to reset tenant config for ${tenantId}`, error);
            throw error;
        }
    }
    /**
     * Get system project settings
     */
    async getSystemConfig() {
        // Try cache
        if (this.cache) {
            const cached = await this.cache.get(SYSTEM_CACHE_KEY);
            if (cached) {
                return cached;
            }
        }
        try {
            const resource = await this.cosmosDb.getDocument('system-config', SYSTEM_CONFIG_ID);
            if (resource) {
                if (this.cache) {
                    await this.cache.set(SYSTEM_CACHE_KEY, resource, CACHE_TTL);
                }
                return resource;
            }
            return this.getDefaultSystemConfig();
        }
        catch (error) {
            this.logger.error('Failed to get system project config', error);
            return this.getDefaultSystemConfig();
        }
    }
    /**
     * Update system project settings (super admin only)
     */
    async updateSystemConfig(updates, updatedBy) {
        const current = await this.getSystemConfig();
        const updated = {
            ...current,
            ...updates,
            updatedAt: new Date(),
            updatedBy,
        };
        try {
            await this.cosmosDb.upsertDocument('system-config', {
                ...updated,
                id: SYSTEM_CONFIG_ID,
                configType: 'system-project-settings',
            });
            if (this.cache) {
                await this.cache.delete(SYSTEM_CACHE_KEY);
            }
            this.logger.log('Updated system project config');
            return updated;
        }
        catch (error) {
            this.logger.error('Failed to update system project config', error);
            throw error;
        }
    }
    /**
     * Validate configuration input
     */
    validateConfigInput(input) {
        if (input.maxLinkedShards !== undefined) {
            if (input.maxLinkedShards < 1 || input.maxLinkedShards > 500) {
                throw new Error('maxLinkedShards must be between 1 and 500');
            }
        }
        if (input.chatTokenLimit !== undefined) {
            if (input.chatTokenLimit < 1000 || input.chatTokenLimit > 100000) {
                throw new Error('chatTokenLimit must be between 1000 and 100000');
            }
        }
        if (input.recommendationConfig) {
            const rc = input.recommendationConfig;
            if (rc.similarityThreshold !== undefined) {
                if (rc.similarityThreshold < 0 || rc.similarityThreshold > 1) {
                    throw new Error('similarityThreshold must be between 0 and 1');
                }
            }
            if (rc.recencyWeight !== undefined) {
                if (rc.recencyWeight < 0 || rc.recencyWeight > 2) {
                    throw new Error('recencyWeight must be between 0 and 2');
                }
            }
            if (rc.maxRecommendations !== undefined) {
                if (rc.maxRecommendations < 1 || rc.maxRecommendations > 50) {
                    throw new Error('maxRecommendations must be between 1 and 50');
                }
            }
        }
        if (input.activityFeedRetentionDays !== undefined) {
            if (input.activityFeedRetentionDays < 1 || input.activityFeedRetentionDays > 365) {
                throw new Error('activityFeedRetentionDays must be between 1 and 365');
            }
        }
    }
    /**
     * Get default tenant configuration
     */
    getDefaultTenantConfig(tenantId) {
        return {
            tenantId,
            maxLinkedShards: 100,
            excludedShardTypes: [],
            chatTokenLimit: 8000,
            contextTruncationStrategy: 'drop_lowest',
            roleBasedSharingEnabled: true,
            projectRoles: {
                manager: ['read', 'write', 'delete', 'manage_access'],
                contributor: ['read', 'write'],
                viewer: ['read'],
            },
            recommendationConfig: {
                similarityThreshold: 0.7,
                recencyWeight: 1,
                vectorWeight: 50,
                collaborativeWeight: 30,
                temporalWeight: 20,
                maxRecommendations: 10,
                cacheTtlMinutes: 30,
            },
            activityFeedEnabled: true,
            activityFeedRetentionDays: 30,
            templatesEnabled: true,
            versioningEnabled: true,
            maxVersionsPerProject: 50,
            versionRetentionDays: 90,
            analyticsEnabled: true,
            costTrackingEnabled: true,
            defaultNotificationChannels: ['email', 'in_app'],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            updatedBy: 'system',
        };
    }
    /**
     * Get default system configuration
     */
    getDefaultSystemConfig() {
        return {
            id: SYSTEM_CONFIG_ID,
            defaultMaxLinkedShards: 100,
            maxLinkedShardsLimit: 500,
            defaultChatTokenLimit: 8000,
            maxChatTokenLimit: 100000,
            minChatTokenLimit: 1000,
            defaultRecommendationConfig: {
                similarityThreshold: 0.7,
                recencyWeight: 1,
                vectorWeight: 50,
                collaborativeWeight: 30,
                temporalWeight: 20,
                maxRecommendations: 10,
                cacheTtlMinutes: 30,
            },
            defaultActivityFeedRetentionDays: 30,
            defaultVersionRetentionDays: 90,
            defaultMaxVersionsPerProject: 50,
            performanceMonitoringEnabled: true,
            anomalyDetectionStdDevThreshold: 2.0,
            updatedAt: new Date(),
            updatedBy: 'system',
        };
    }
}
//# sourceMappingURL=tenant-project-config.service.js.map