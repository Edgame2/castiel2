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
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Search provider configuration
 */
export interface SearchProviderConfig {
    id: string;
    name: string;
    type: 'azure-ai-search' | 'bing' | 'google' | 'serpapi' | 'custom';
    enabled: boolean;
    priority: number;
    endpoint?: string;
    apiKeyVault?: string;
    config: {
        maxResults?: number;
        timeout?: number;
        retryAttempts?: number;
        backoffStrategy?: 'exponential' | 'linear';
        customHeaders?: Record<string, string>;
    };
    budget?: {
        costPer1K: number;
        monthlyLimit?: number;
        alertAtPercent?: number;
    };
    metrics?: {
        requestsMonth: number;
        costMonth: number;
        avgLatency: number;
        errorRate: number;
        cacheHitRate: number;
        avgRelevanceScore: number;
    };
    health?: {
        status: 'healthy' | 'degraded' | 'down';
        lastCheck: Date;
        lastError?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Provider fallback chain configuration
 */
export interface ProviderFallbackChain {
    id: string;
    name: string;
    description?: string;
    providers: Array<{
        providerId: string;
        priority: number;
        enabled: boolean;
    }>;
    smartRouting: {
        enabled: boolean;
        rules: Array<{
            type: string;
            preferredProvider: string;
        }>;
    };
    failover: {
        maxRetries: number;
        initialDelay: number;
        maxDelay: number;
        backoffMultiplier: number;
    };
    healthCheck: {
        interval: number;
        timeout: number;
        enabled: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Provider health status
 */
export interface ProviderHealth {
    providerId: string;
    status: 'healthy' | 'degraded' | 'down';
    lastCheck: Date;
    latency: {
        p50: number;
        p95: number;
        p99: number;
    };
    errorRate: number;
    cacheHitRate: number;
    requestsLastHour: number;
    errors: Array<{
        timestamp: Date;
        code: string;
        message: string;
    }>;
}
/**
 * Usage analytics data
 */
export interface UsageAnalytics {
    period: {
        startDate: Date;
        endDate: Date;
        label: string;
    };
    summary: {
        totalSearches: number;
        totalCost: number;
        totalUsers: number;
        totalTenants: number;
        cacheHitRate: number;
    };
    byProvider: Array<{
        providerId: string;
        name: string;
        searches: number;
        cost: number;
        percentage: number;
        trend: number;
        avgLatency: number;
        errorRate: number;
    }>;
    byTenant: Array<{
        tenantId: string;
        name: string;
        searches: number;
        cost: number;
        percentage: number;
        trend: number;
    }>;
    byQueryType: Array<{
        type: string;
        searches: number;
        cost: number;
        percentage: number;
    }>;
    dailyBreakdown: Array<{
        date: Date;
        searches: number;
        cost: number;
        avgLatency: number;
        errorRate: number;
    }>;
}
/**
 * Quota and budget management
 */
export interface QuotaConfig {
    tenantId: string;
    monthlySearchQuota: number;
    monthlyBudget: number;
    currentMonthSearches: number;
    currentMonthCost: number;
    usedPercentage: number;
    budgetPercentage: number;
    alerts: Array<{
        id: string;
        type: 'quota' | 'budget';
        threshold: number;
        triggered: boolean;
        triggeredAt?: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Tenant web search configuration
 */
export interface TenantWebSearchConfig {
    tenantId: string;
    enabled: boolean;
    autoTriggerEnabled: boolean;
    autoTriggerKeywords: string[];
    domainWhitelist: string[];
    domainBlacklist: string[];
    deepSearchEnabled: boolean;
    deepSearchPageDepth: number;
    defaultSearchProvider?: string;
    quotaConfig: QuotaConfig;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Admin Dashboard Service
 *
 * Manages all admin-level dashboard operations including provider
 * configuration, monitoring, analytics, and quota management.
 */
export declare class AdminDashboardService {
    private logger;
    private monitoring;
    private providers;
    private fallbackChains;
    private providerHealth;
    private usageMetrics;
    private quotaConfigs;
    private tenantConfigs;
    private rand;
    constructor(monitoring: IMonitoringProvider, options?: {
        deterministic?: boolean;
        seed?: number;
    });
    /**
     * Initialize default providers and configurations
     */
    private initializeDefaults;
    /**
     * Deterministic-friendly random generator (LCG) used in tests/QA to stabilize metrics
     */
    private createRandom;
    /**
     * Get all providers
     */
    getProviders(): Promise<SearchProviderConfig[]>;
    /**
     * Get specific provider
     */
    getProvider(providerId: string): Promise<SearchProviderConfig | null>;
    /**
     * Update provider configuration
     */
    updateProvider(providerId: string, updates: Partial<SearchProviderConfig>): Promise<SearchProviderConfig | null>;
    /**
     * Test provider connectivity
     */
    testProvider(providerId: string): Promise<{
        success: boolean;
        latency: number;
        error?: string;
    }>;
    /**
     * Get fallback chain
     */
    getFallbackChain(chainId?: string): Promise<ProviderFallbackChain | null>;
    /**
     * Update fallback chain
     */
    updateFallbackChain(chainId: string, updates: Partial<ProviderFallbackChain>): Promise<ProviderFallbackChain | null>;
    /**
     * Get provider health status
     */
    getProviderHealth(providerId?: string): Promise<ProviderHealth | ProviderHealth[]>;
    /**
     * Get usage analytics
     */
    getUsageAnalytics(days?: number, tenantId?: string): Promise<UsageAnalytics>;
    /**
     * Generate daily breakdown for usage analytics
     */
    private generateDailyBreakdown;
    /**
     * Get quota configuration for tenant
     */
    getQuotaConfig(tenantId: string): Promise<QuotaConfig | null>;
    /**
     * Update quota configuration
     */
    updateQuotaConfig(tenantId: string, updates: Partial<QuotaConfig>): Promise<QuotaConfig>;
    /**
     * Get tenant web search configuration
     */
    getTenantWebSearchConfig(tenantId: string): Promise<TenantWebSearchConfig | null>;
    /**
     * Update tenant web search configuration
     */
    updateTenantWebSearchConfig(tenantId: string, updates: Partial<TenantWebSearchConfig>): Promise<TenantWebSearchConfig>;
    /**
     * Get platform statistics
     */
    getPlatformStats(): Promise<{
        totalProviders: number;
        enabledProviders: number;
        healthyProviders: number;
        totalTenants: number;
        totalSearchesMonth: number;
        totalCostMonth: number;
        averageLatency: number;
        systemErrorRate: number;
    }>;
}
//# sourceMappingURL=admin-dashboard.service.d.ts.map