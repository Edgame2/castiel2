/**
 * Admin Dashboard Service
 *
 * Provides comprehensive admin dashboard functionality including:
 * - Provider management (list, update, configure)
 * - Fallback chain configuration
 * - Provider health monitoring
 * - Usage analytics and cost tracking
 * - Quota and budget management
 * - Tenant configuration
 *
 * @author AI Insights Team
 * @version 1.0.0
 */
import { Logger } from '../utils/logger.js';
/**
 * Admin Dashboard Service
 *
 * Manages all admin-level dashboard operations including provider
 * configuration, monitoring, analytics, and quota management.
 */
export class AdminDashboardService {
    logger;
    monitoring;
    // In-memory storage (would be replaced with database in production)
    providers = new Map();
    fallbackChains = new Map();
    providerHealth = new Map();
    usageMetrics = new Map();
    quotaConfigs = new Map();
    tenantConfigs = new Map();
    rand;
    constructor(monitoring, options) {
        this.logger = new Logger('AdminDashboardService');
        this.monitoring = monitoring;
        this.rand = this.createRandom(options);
        this.initializeDefaults();
    }
    /**
     * Initialize default providers and configurations
     */
    initializeDefaults() {
        const defaultProviders = [
            {
                id: 'azure-ai-search-1',
                name: 'Azure AI Search',
                type: 'azure-ai-search',
                enabled: true,
                priority: 1,
                endpoint: 'https://castiel-search.search.windows.net/',
                apiKeyVault: 'web-search/azure-key-v1',
                config: {
                    maxResults: 25,
                    timeout: 30,
                    retryAttempts: 3,
                    backoffStrategy: 'exponential',
                },
                budget: {
                    costPer1K: 0.03,
                    monthlyLimit: 500,
                    alertAtPercent: 80,
                },
                metrics: {
                    requestsMonth: 3600,
                    costMonth: 156,
                    avgLatency: 120,
                    errorRate: 0.001,
                    cacheHitRate: 0.71,
                    avgRelevanceScore: 0.87,
                },
                health: {
                    status: 'healthy',
                    lastCheck: new Date(),
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'bing-search-1',
                name: 'Bing Search',
                type: 'bing',
                enabled: true,
                priority: 2,
                apiKeyVault: 'web-search/bing-key-v1',
                config: {
                    maxResults: 25,
                    timeout: 30,
                    retryAttempts: 3,
                    backoffStrategy: 'exponential',
                },
                budget: {
                    costPer1K: 0.048,
                    monthlyLimit: 300,
                    alertAtPercent: 80,
                },
                metrics: {
                    requestsMonth: 1634,
                    costMonth: 79,
                    avgLatency: 240,
                    errorRate: 0.005,
                    cacheHitRate: 0.65,
                    avgRelevanceScore: 0.82,
                },
                health: {
                    status: 'healthy',
                    lastCheck: new Date(),
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        defaultProviders.forEach((provider) => {
            this.providers.set(provider.id, provider);
        });
        const defaultFallbackChain = {
            id: 'default-chain',
            name: 'Default Fallback Chain',
            description: 'Primary: Azure AI Search → Fallback: Bing Search',
            providers: [
                { providerId: 'azure-ai-search-1', priority: 1, enabled: true },
                { providerId: 'bing-search-1', priority: 2, enabled: true },
            ],
            smartRouting: {
                enabled: true,
                rules: [
                    { type: 'latest', preferredProvider: 'bing-search-1' },
                    { type: 'technical', preferredProvider: 'azure-ai-search-1' },
                    { type: 'comparison', preferredProvider: 'azure-ai-search-1' },
                ],
            },
            failover: {
                maxRetries: 3,
                initialDelay: 100,
                maxDelay: 5000,
                backoffMultiplier: 2,
            },
            healthCheck: {
                interval: 30,
                timeout: 5,
                enabled: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.fallbackChains.set(defaultFallbackChain.id, defaultFallbackChain);
    }
    /**
     * Deterministic-friendly random generator (LCG) used in tests/QA to stabilize metrics
     */
    createRandom(options) {
        if (options?.deterministic) {
            let seed = options.seed ?? 42;
            return () => {
                seed = (seed * 1664525 + 1013904223) % 4294967296;
                return seed / 4294967296;
            };
        }
        return () => Math.random();
    }
    /**
     * Get all providers
     */
    async getProviders() {
        try {
            const providers = Array.from(this.providers.values());
            this.monitoring.trackEvent('admin.providers.list', {
                count: providers.length,
            });
            return providers;
        }
        catch (error) {
            this.logger.error('Error getting providers', error);
            this.monitoring.trackException(error, {
                operation: 'admin.providers.list',
            });
            throw error;
        }
    }
    /**
     * Get specific provider
     */
    async getProvider(providerId) {
        try {
            const provider = this.providers.get(providerId);
            if (!provider) {
                this.logger.warn(`Provider not found: ${providerId}`);
                return null;
            }
            return provider;
        }
        catch (error) {
            this.logger.error(`Error getting provider ${providerId}`, error);
            throw error;
        }
    }
    /**
     * Update provider configuration
     */
    async updateProvider(providerId, updates) {
        try {
            const provider = this.providers.get(providerId);
            if (!provider) {
                this.logger.warn(`Provider not found: ${providerId}`);
                return null;
            }
            const updated = {
                ...provider,
                ...updates,
                updatedAt: new Date(),
            };
            this.providers.set(providerId, updated);
            this.monitoring.trackEvent('admin.provider.updated', {
                providerId,
                fields: Object.keys(updates),
            });
            return updated;
        }
        catch (error) {
            this.logger.error(`Error updating provider ${providerId}`, error);
            this.monitoring.trackException(error, {
                operation: 'admin.provider.updated',
                providerId,
            });
            throw error;
        }
    }
    /**
     * Test provider connectivity
     */
    async testProvider(providerId) {
        try {
            const provider = this.providers.get(providerId);
            if (!provider) {
                return { success: false, latency: 0, error: 'Provider not found' };
            }
            const startTime = Date.now();
            // In production, this would actually test the provider
            // For now, simulate success with latency based on provider type
            const baseLatency = provider.type === 'azure-ai-search' ? 120 : 240;
            const latency = baseLatency + this.rand() * 50;
            const success = this.rand() > 0.05; // 95% success rate
            if (success) {
                this.monitoring.trackEvent('admin.provider.test', {
                    providerId,
                    success: true,
                    latency: Math.round(latency),
                });
                return {
                    success: true,
                    latency: Math.round(latency),
                };
            }
            else {
                const error = 'Connection timeout';
                return {
                    success: false,
                    latency: Math.round(Date.now() - startTime),
                    error,
                };
            }
        }
        catch (error) {
            this.logger.error(`Error testing provider ${providerId}`, error);
            return {
                success: false,
                latency: 0,
                error: error.message,
            };
        }
    }
    /**
     * Get fallback chain
     */
    async getFallbackChain(chainId = 'default-chain') {
        try {
            const chain = this.fallbackChains.get(chainId);
            return chain || null;
        }
        catch (error) {
            this.logger.error(`Error getting fallback chain ${chainId}`, error);
            throw error;
        }
    }
    /**
     * Update fallback chain
     */
    async updateFallbackChain(chainId, updates) {
        try {
            const chain = this.fallbackChains.get(chainId);
            if (!chain) {
                this.logger.warn(`Fallback chain not found: ${chainId}`);
                return null;
            }
            const updated = {
                ...chain,
                ...updates,
                updatedAt: new Date(),
            };
            this.fallbackChains.set(chainId, updated);
            this.monitoring.trackEvent('admin.fallbackChain.updated', {
                chainId,
            });
            return updated;
        }
        catch (error) {
            this.logger.error(`Error updating fallback chain ${chainId}`, error);
            this.monitoring.trackException(error, {
                operation: 'admin.fallbackChain.updated',
                chainId,
            });
            throw error;
        }
    }
    /**
     * Get provider health status
     */
    async getProviderHealth(providerId) {
        try {
            if (providerId) {
                const health = this.providerHealth.get(providerId);
                if (!health) {
                    // Return default health for unknown provider
                    const provider = this.providers.get(providerId);
                    if (!provider) {
                        return {
                            providerId,
                            status: 'down',
                            lastCheck: new Date(),
                            latency: { p50: 0, p95: 0, p99: 0 },
                            errorRate: 1,
                            cacheHitRate: 0,
                            requestsLastHour: 0,
                            errors: [],
                        };
                    }
                    return {
                        providerId,
                        status: provider.health?.status || 'healthy',
                        lastCheck: provider.health?.lastCheck || new Date(),
                        latency: { p50: provider.metrics?.avgLatency || 0, p95: (provider.metrics?.avgLatency || 0) * 1.5, p99: (provider.metrics?.avgLatency || 0) * 2 },
                        errorRate: provider.metrics?.errorRate || 0,
                        cacheHitRate: provider.metrics?.cacheHitRate || 0,
                        requestsLastHour: 0,
                        errors: [],
                    };
                }
                return health;
            }
            const allHealth = Array.from(this.providerHealth.values());
            if (allHealth.length === 0) {
                // Return health for all configured providers
                return Array.from(this.providers.values()).map((provider) => ({
                    providerId: provider.id,
                    status: provider.health?.status || 'healthy',
                    lastCheck: provider.health?.lastCheck || new Date(),
                    latency: {
                        p50: provider.metrics?.avgLatency || 0,
                        p95: (provider.metrics?.avgLatency || 0) * 1.5,
                        p99: (provider.metrics?.avgLatency || 0) * 2,
                    },
                    errorRate: provider.metrics?.errorRate || 0,
                    cacheHitRate: provider.metrics?.cacheHitRate || 0,
                    requestsLastHour: 0,
                    errors: [],
                }));
            }
            return allHealth;
        }
        catch (error) {
            this.logger.error('Error getting provider health', error);
            throw error;
        }
    }
    /**
     * Get usage analytics
     */
    async getUsageAnalytics(days = 30, tenantId) {
        try {
            const cacheKey = `usage-${days}-${tenantId || 'all'}`;
            const cached = this.usageMetrics.get(cacheKey);
            if (cached) {
                return cached;
            }
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (days - 1));
            // Generate mock analytics data based on provider metrics
            const providers = Array.from(this.providers.values()).filter((p) => p.enabled);
            const totalSearches = providers.reduce((sum, p) => sum + (p.metrics?.requestsMonth || 0), 0);
            const totalCost = providers.reduce((sum, p) => sum + (p.metrics?.costMonth || 0), 0);
            const analytics = {
                period: {
                    startDate,
                    endDate,
                    label: `Last ${days} days`,
                },
                summary: {
                    totalSearches,
                    totalCost,
                    totalUsers: 150,
                    totalTenants: 8,
                    cacheHitRate: 0.68,
                },
                byProvider: providers.map((p) => ({
                    providerId: p.id,
                    name: p.name,
                    searches: p.metrics?.requestsMonth || 0,
                    cost: p.metrics?.costMonth || 0,
                    percentage: totalSearches > 0 ? ((p.metrics?.requestsMonth || 0) / totalSearches) * 100 : 0,
                    trend: this.rand() * 20 - 10,
                    avgLatency: p.metrics?.avgLatency || 0,
                    errorRate: p.metrics?.errorRate || 0,
                })),
                byTenant: [
                    { tenantId: 'tenant-1', name: 'Acme Corp', searches: 1200, cost: 45, percentage: 22, trend: 5 },
                    { tenantId: 'tenant-2', name: 'Tech Inc', searches: 1050, cost: 52, percentage: 20, trend: -3 },
                    { tenantId: 'tenant-3', name: 'Global Services', searches: 980, cost: 41, percentage: 18, trend: 8 },
                    { tenantId: 'tenant-4', name: 'Others', searches: 1404, cost: 67, percentage: 40, trend: 2 },
                ],
                byQueryType: [
                    { type: 'research', searches: 2100, cost: 91, percentage: 40 },
                    { type: 'analysis', searches: 1800, cost: 78, percentage: 34 },
                    { type: 'comparison', searches: 900, cost: 39, percentage: 17 },
                    { type: 'other', searches: 434, cost: 18, percentage: 9 },
                ],
                dailyBreakdown: this.generateDailyBreakdown(startDate, endDate),
            };
            this.usageMetrics.set(cacheKey, analytics);
            this.monitoring.trackEvent('admin.usage.fetched', {
                days,
                tenantId,
                totalSearches: analytics.summary.totalSearches,
            });
            return analytics;
        }
        catch (error) {
            this.logger.error('Error getting usage analytics', error);
            this.monitoring.trackException(error, {
                operation: 'admin.usage.fetched',
            });
            throw error;
        }
    }
    /**
     * Generate daily breakdown for usage analytics
     */
    generateDailyBreakdown(startDate, endDate) {
        const breakdown = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            breakdown.push({
                date: new Date(current),
                searches: Math.floor(this.rand() * 200) + 150,
                cost: Math.floor(this.rand() * 15) + 8,
                avgLatency: Math.floor(this.rand() * 100) + 120,
                errorRate: this.rand() * 0.01,
            });
            current.setDate(current.getDate() + 1);
        }
        return breakdown;
    }
    /**
     * Get quota configuration for tenant
     */
    async getQuotaConfig(tenantId) {
        try {
            let quota = this.quotaConfigs.get(tenantId);
            if (!quota) {
                // Create default quota config
                quota = {
                    tenantId,
                    monthlySearchQuota: 10000,
                    monthlyBudget: 500,
                    currentMonthSearches: Math.floor(this.rand() * 5000),
                    currentMonthCost: Math.floor(this.rand() * 300),
                    usedPercentage: 35,
                    budgetPercentage: 42,
                    alerts: [
                        {
                            id: 'quota-80',
                            type: 'quota',
                            threshold: 80,
                            triggered: false,
                        },
                        {
                            id: 'budget-80',
                            type: 'budget',
                            threshold: 80,
                            triggered: false,
                        },
                    ],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                this.quotaConfigs.set(tenantId, quota);
            }
            return quota;
        }
        catch (error) {
            this.logger.error(`Error getting quota config for ${tenantId}`, error);
            throw error;
        }
    }
    /**
     * Update quota configuration
     */
    async updateQuotaConfig(tenantId, updates) {
        try {
            let quota = await this.getQuotaConfig(tenantId);
            if (!quota) {
                throw new Error(`Quota config not found for tenant ${tenantId}`);
            }
            quota = {
                ...quota,
                ...updates,
                tenantId,
                updatedAt: new Date(),
            };
            this.quotaConfigs.set(tenantId, quota);
            this.monitoring.trackEvent('admin.quota.updated', {
                tenantId,
            });
            return quota;
        }
        catch (error) {
            this.logger.error(`Error updating quota config for ${tenantId}`, error);
            this.monitoring.trackException(error, {
                operation: 'admin.quota.updated',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get tenant web search configuration
     */
    async getTenantWebSearchConfig(tenantId) {
        try {
            let config = this.tenantConfigs.get(tenantId);
            if (!config) {
                const quotaConfig = await this.getQuotaConfig(tenantId);
                if (!quotaConfig) {
                    return null;
                }
                config = {
                    tenantId,
                    enabled: true,
                    autoTriggerEnabled: true,
                    autoTriggerKeywords: ['latest', 'news', 'research'],
                    domainWhitelist: [],
                    domainBlacklist: [],
                    deepSearchEnabled: true,
                    deepSearchPageDepth: 3,
                    quotaConfig,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                this.tenantConfigs.set(tenantId, config);
            }
            return config;
        }
        catch (error) {
            this.logger.error(`Error getting tenant web search config for ${tenantId}`, error);
            throw error;
        }
    }
    /**
     * Update tenant web search configuration
     */
    async updateTenantWebSearchConfig(tenantId, updates) {
        try {
            let config = await this.getTenantWebSearchConfig(tenantId);
            if (!config) {
                throw new Error(`Tenant config not found for ${tenantId}`);
            }
            config = {
                ...config,
                ...updates,
                tenantId,
                updatedAt: new Date(),
            };
            this.tenantConfigs.set(tenantId, config);
            this.monitoring.trackEvent('admin.tenantConfig.updated', {
                tenantId,
            });
            return config;
        }
        catch (error) {
            this.logger.error(`Error updating tenant config for ${tenantId}`, error);
            this.monitoring.trackException(error, {
                operation: 'admin.tenantConfig.updated',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get platform statistics
     */
    async getPlatformStats() {
        try {
            const providers = Array.from(this.providers.values());
            const enabledProviders = providers.filter((p) => p.enabled).length;
            const healthyProviders = providers.filter((p) => p.health?.status === 'healthy').length;
            const totalSearches = providers.reduce((sum, p) => sum + (p.metrics?.requestsMonth || 0), 0);
            const totalCost = providers.reduce((sum, p) => sum + (p.metrics?.costMonth || 0), 0);
            const avgLatency = providers.length > 0
                ? providers.reduce((sum, p) => sum + (p.metrics?.avgLatency || 0), 0) / providers.length
                : 0;
            const avgErrorRate = providers.length > 0
                ? providers.reduce((sum, p) => sum + (p.metrics?.errorRate || 0), 0) / providers.length
                : 0;
            return {
                totalProviders: providers.length,
                enabledProviders,
                healthyProviders,
                totalTenants: this.tenantConfigs.size,
                totalSearchesMonth: totalSearches,
                totalCostMonth: totalCost,
                averageLatency: Math.round(avgLatency),
                systemErrorRate: Number((avgErrorRate * 100).toFixed(3)),
            };
        }
        catch (error) {
            this.logger.error('Error getting platform stats', error);
            throw error;
        }
    }
}
//# sourceMappingURL=admin-dashboard.service.js.map