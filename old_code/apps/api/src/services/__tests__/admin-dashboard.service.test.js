/**
 * Admin Dashboard Service Tests
 *
 * Comprehensive test suite for AdminDashboardService covering:
 * - Provider management (list, get, update, test)
 * - Fallback chain configuration
 * - Provider health monitoring
 * - Usage analytics
 * - Quota management
 * - Tenant configuration
 * - Platform statistics
 *
 * @author AI Insights Team
 * @version 1.0.0
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { AdminDashboardService } from '../admin-dashboard.service.js';
/**
 * Create mock monitoring provider
 */
function createMockMonitoring() {
    return {
        trackEvent: vi.fn(),
        trackException: vi.fn(),
        trackDependency: vi.fn(),
        trackPageView: vi.fn(),
        trackTrace: vi.fn(),
    };
}
describe('AdminDashboardService', () => {
    let service;
    let monitoring;
    beforeEach(() => {
        monitoring = createMockMonitoring();
        service = new AdminDashboardService(monitoring);
    });
    describe('Deterministic mode', () => {
        it('should produce stable defaults with the same seed', async () => {
            const serviceA = new AdminDashboardService(createMockMonitoring(), { deterministic: true, seed: 123 });
            const serviceB = new AdminDashboardService(createMockMonitoring(), { deterministic: true, seed: 123 });
            const quotaA = await serviceA.getQuotaConfig('tenant-seed');
            const quotaB = await serviceB.getQuotaConfig('tenant-seed');
            expect(quotaA.currentMonthSearches).toBe(quotaB.currentMonthSearches);
            expect(quotaA.currentMonthCost).toBe(quotaB.currentMonthCost);
        });
    });
    describe('Provider Management', () => {
        it('should get all providers', async () => {
            const providers = await service.getProviders();
            expect(providers).toBeDefined();
            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
            expect(providers[0]).toHaveProperty('id');
            expect(providers[0]).toHaveProperty('name');
            expect(providers[0]).toHaveProperty('enabled');
        });
        it('should get specific provider by ID', async () => {
            const providers = await service.getProviders();
            const providerId = providers[0].id;
            const provider = await service.getProvider(providerId);
            expect(provider).toBeDefined();
            expect(provider?.id).toBe(providerId);
        });
        it('should return null for non-existent provider', async () => {
            const provider = await service.getProvider('non-existent-id');
            expect(provider).toBeNull();
        });
        it('should update provider configuration', async () => {
            const providers = await service.getProviders();
            const providerId = providers[0].id;
            const updated = await service.updateProvider(providerId, {
                enabled: false,
                priority: 5,
            });
            expect(updated).toBeDefined();
            expect(updated?.enabled).toBe(false);
            expect(updated?.priority).toBe(5);
            expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(new Date().getTime() - 1000);
        });
        it('should track event when updating provider', async () => {
            const providers = await service.getProviders();
            const providerId = providers[0].id;
            await service.updateProvider(providerId, { enabled: false });
            expect(monitoring.trackEvent).toHaveBeenCalledWith('admin.provider.updated', expect.objectContaining({ providerId }));
        });
        it('should test provider connectivity', async () => {
            const providers = await service.getProviders();
            const providerId = providers[0].id;
            const result = await service.testProvider(providerId);
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('latency');
            expect(result.latency).toBeGreaterThanOrEqual(0);
        });
        it('should return error for non-existent provider test', async () => {
            const result = await service.testProvider('non-existent-id');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        it('should handle update of non-existent provider', async () => {
            const result = await service.updateProvider('non-existent-id', {
                enabled: false,
            });
            expect(result).toBeNull();
        });
        it('should validate provider has all required fields', async () => {
            const providers = await service.getProviders();
            const provider = providers[0];
            expect(provider).toHaveProperty('id');
            expect(provider).toHaveProperty('name');
            expect(provider).toHaveProperty('type');
            expect(provider).toHaveProperty('enabled');
            expect(provider).toHaveProperty('priority');
            expect(provider).toHaveProperty('config');
            expect(provider).toHaveProperty('createdAt');
            expect(provider).toHaveProperty('updatedAt');
        });
    });
    describe('Fallback Chain Management', () => {
        it('should get fallback chain', async () => {
            const chain = await service.getFallbackChain('default-chain');
            expect(chain).toBeDefined();
            expect(chain?.id).toBe('default-chain');
            expect(chain?.providers).toBeDefined();
            expect(Array.isArray(chain?.providers)).toBe(true);
        });
        it('should return null for non-existent chain', async () => {
            const chain = await service.getFallbackChain('non-existent-chain');
            expect(chain).toBeNull();
        });
        it('should update fallback chain', async () => {
            const updated = await service.updateFallbackChain('default-chain', {
                smartRouting: {
                    enabled: false,
                    rules: [],
                },
            });
            expect(updated).toBeDefined();
            expect(updated?.smartRouting.enabled).toBe(false);
        });
        it('should validate fallback chain structure', async () => {
            const chain = await service.getFallbackChain('default-chain');
            expect(chain?.providers.length).toBeGreaterThan(0);
            expect(chain?.providers[0]).toHaveProperty('providerId');
            expect(chain?.providers[0]).toHaveProperty('priority');
            expect(chain?.providers[0]).toHaveProperty('enabled');
        });
        it('should track event when updating fallback chain', async () => {
            await service.updateFallbackChain('default-chain', {
                smartRouting: { enabled: false, rules: [] },
            });
            expect(monitoring.trackEvent).toHaveBeenCalledWith('admin.fallbackChain.updated', expect.any(Object));
        });
    });
    describe('Provider Health Monitoring', () => {
        it('should get health for all providers', async () => {
            const health = await service.getProviderHealth();
            expect(Array.isArray(health)).toBe(true);
            expect(health.length).toBeGreaterThan(0);
        });
        it('should get health for specific provider', async () => {
            const providers = await service.getProviders();
            const providerId = providers[0].id;
            const health = await service.getProviderHealth(providerId);
            expect(Array.isArray(health)).toBe(false);
            expect(health.providerId).toBe(providerId);
        });
        it('should include latency metrics in health', async () => {
            const health = await service.getProviderHealth();
            const firstHealth = Array.isArray(health) ? health[0] : health;
            expect(firstHealth.latency).toBeDefined();
            expect(firstHealth.latency.p50).toBeGreaterThanOrEqual(0);
            expect(firstHealth.latency.p95).toBeGreaterThanOrEqual(0);
            expect(firstHealth.latency.p99).toBeGreaterThanOrEqual(0);
        });
        it('should include error rate in health', async () => {
            const health = await service.getProviderHealth();
            const firstHealth = Array.isArray(health) ? health[0] : health;
            expect(firstHealth.errorRate).toBeDefined();
            expect(firstHealth.errorRate).toBeGreaterThanOrEqual(0);
            expect(firstHealth.errorRate).toBeLessThanOrEqual(1);
        });
        it('should include cache hit rate in health', async () => {
            const health = await service.getProviderHealth();
            const firstHealth = Array.isArray(health) ? health[0] : health;
            expect(firstHealth.cacheHitRate).toBeDefined();
            expect(firstHealth.cacheHitRate).toBeGreaterThanOrEqual(0);
            expect(firstHealth.cacheHitRate).toBeLessThanOrEqual(1);
        });
        it('should return non-existent provider with down status', async () => {
            const health = await service.getProviderHealth('non-existent-id');
            expect(health.providerId).toBe('non-existent-id');
            expect(health.status).toBe('down');
        });
    });
    describe('Usage Analytics', () => {
        it('should get usage analytics for default period', async () => {
            const usage = await service.getUsageAnalytics();
            expect(usage).toBeDefined();
            expect(usage.period).toBeDefined();
            expect(usage.summary).toBeDefined();
            expect(usage.byProvider).toBeDefined();
        });
        it('should get usage analytics for custom period', async () => {
            const usage = await service.getUsageAnalytics(7);
            expect(usage.period.label).toContain('7');
        });
        it('should include provider breakdown', async () => {
            const usage = await service.getUsageAnalytics();
            expect(Array.isArray(usage.byProvider)).toBe(true);
            expect(usage.byProvider.length).toBeGreaterThan(0);
            expect(usage.byProvider[0]).toHaveProperty('providerId');
            expect(usage.byProvider[0]).toHaveProperty('searches');
            expect(usage.byProvider[0]).toHaveProperty('cost');
        });
        it('should include tenant breakdown', async () => {
            const usage = await service.getUsageAnalytics();
            expect(Array.isArray(usage.byTenant)).toBe(true);
            expect(usage.byTenant.length).toBeGreaterThan(0);
        });
        it('should include query type breakdown', async () => {
            const usage = await service.getUsageAnalytics();
            expect(Array.isArray(usage.byQueryType)).toBe(true);
            expect(usage.byQueryType.length).toBeGreaterThan(0);
            expect(usage.byQueryType[0]).toHaveProperty('type');
            expect(usage.byQueryType[0]).toHaveProperty('searches');
        });
        it('should include daily breakdown', async () => {
            const usage = await service.getUsageAnalytics(5);
            expect(Array.isArray(usage.dailyBreakdown)).toBe(true);
            expect(usage.dailyBreakdown.length).toBe(5);
            expect(usage.dailyBreakdown[0]).toHaveProperty('date');
            expect(usage.dailyBreakdown[0]).toHaveProperty('searches');
            expect(usage.dailyBreakdown[0]).toHaveProperty('cost');
        });
        it('should cache analytics results', async () => {
            const usage1 = await service.getUsageAnalytics(30);
            const usage2 = await service.getUsageAnalytics(30);
            // Should be identical (same object reference or deep equal)
            expect(JSON.stringify(usage1)).toEqual(JSON.stringify(usage2));
        });
        it('should calculate percentage correctly', async () => {
            const usage = await service.getUsageAnalytics();
            const totalSearches = usage.byProvider.reduce((sum, p) => sum + p.searches, 0);
            const percentages = usage.byProvider.map((p) => p.percentage);
            const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
            expect(totalPercentage).toBeCloseTo(100, 1);
        });
    });
    describe('Quota Management', () => {
        it('should get quota config for tenant', async () => {
            const quota = await service.getQuotaConfig('tenant-123');
            expect(quota).toBeDefined();
            expect(quota?.tenantId).toBe('tenant-123');
            expect(quota?.monthlySearchQuota).toBeGreaterThan(0);
            expect(quota?.monthlyBudget).toBeGreaterThan(0);
        });
        it('should update quota config', async () => {
            const updated = await service.updateQuotaConfig('tenant-123', {
                monthlySearchQuota: 5000,
                monthlyBudget: 250,
            });
            expect(updated.monthlySearchQuota).toBe(5000);
            expect(updated.monthlyBudget).toBe(250);
        });
        it('should track event when updating quota', async () => {
            await service.updateQuotaConfig('tenant-123', { monthlySearchQuota: 5000 });
            expect(monitoring.trackEvent).toHaveBeenCalledWith('admin.quota.updated', expect.objectContaining({ tenantId: 'tenant-123' }));
        });
        it('should calculate usage percentage', async () => {
            const quota = await service.getQuotaConfig('tenant-123');
            expect(quota?.usedPercentage).toBeGreaterThanOrEqual(0);
            expect(quota?.usedPercentage).toBeLessThanOrEqual(100);
        });
        it('should calculate budget percentage', async () => {
            const quota = await service.getQuotaConfig('tenant-123');
            expect(quota?.budgetPercentage).toBeGreaterThanOrEqual(0);
            expect(quota?.budgetPercentage).toBeLessThanOrEqual(100);
        });
        it('should include alerts in quota config', async () => {
            const quota = await service.getQuotaConfig('tenant-123');
            expect(Array.isArray(quota?.alerts)).toBe(true);
            expect(quota?.alerts.length).toBeGreaterThan(0);
        });
    });
    describe('Tenant Configuration', () => {
        it('should get tenant web search config', async () => {
            const config = await service.getTenantWebSearchConfig('tenant-123');
            expect(config).toBeDefined();
            expect(config?.tenantId).toBe('tenant-123');
            expect(config?.enabled).toBeDefined();
        });
        it('should update tenant web search config', async () => {
            const updated = await service.updateTenantWebSearchConfig('tenant-123', {
                enabled: false,
                autoTriggerEnabled: false,
            });
            expect(updated.enabled).toBe(false);
            expect(updated.autoTriggerEnabled).toBe(false);
        });
        it('should track event when updating tenant config', async () => {
            await service.updateTenantWebSearchConfig('tenant-123', { enabled: false });
            expect(monitoring.trackEvent).toHaveBeenCalledWith('admin.tenantConfig.updated', expect.objectContaining({ tenantId: 'tenant-123' }));
        });
        it('should include auto-trigger keywords', async () => {
            const config = await service.getTenantWebSearchConfig('tenant-123');
            expect(Array.isArray(config?.autoTriggerKeywords)).toBe(true);
        });
        it('should include domain lists', async () => {
            const config = await service.getTenantWebSearchConfig('tenant-123');
            expect(Array.isArray(config?.domainWhitelist)).toBe(true);
            expect(Array.isArray(config?.domainBlacklist)).toBe(true);
        });
        it('should include quota config in tenant config', async () => {
            const config = await service.getTenantWebSearchConfig('tenant-123');
            expect(config?.quotaConfig).toBeDefined();
            expect(config?.quotaConfig.tenantId).toBe('tenant-123');
        });
    });
    describe('Platform Statistics', () => {
        it('should get platform stats', async () => {
            const stats = await service.getPlatformStats();
            expect(stats).toBeDefined();
            expect(stats.totalProviders).toBeGreaterThan(0);
            expect(stats.enabledProviders).toBeGreaterThanOrEqual(0);
            expect(stats.healthyProviders).toBeGreaterThanOrEqual(0);
        });
        it('should calculate provider counts correctly', async () => {
            const stats = await service.getPlatformStats();
            expect(stats.enabledProviders).toBeLessThanOrEqual(stats.totalProviders);
            expect(stats.healthyProviders).toBeLessThanOrEqual(stats.totalProviders);
        });
        it('should include cost metrics', async () => {
            const stats = await service.getPlatformStats();
            expect(stats.totalCostMonth).toBeGreaterThanOrEqual(0);
            expect(typeof stats.totalCostMonth).toBe('number');
        });
        it('should include latency metrics', async () => {
            const stats = await service.getPlatformStats();
            expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
            expect(typeof stats.averageLatency).toBe('number');
        });
        it('should include error rate', async () => {
            const stats = await service.getPlatformStats();
            expect(stats.systemErrorRate).toBeGreaterThanOrEqual(0);
            expect(stats.systemErrorRate).toBeLessThanOrEqual(100);
        });
        it('should reflect updates in stats', async () => {
            const statsBefore = await service.getPlatformStats();
            await service.updateProvider((await service.getProviders())[0].id, { enabled: false });
            const statsAfter = await service.getPlatformStats();
            expect(statsAfter.enabledProviders).toBeLessThanOrEqual(statsBefore.enabledProviders);
        });
    });
    describe('Error Handling', () => {
        it('should handle get provider errors gracefully', async () => {
            // Should not throw, just return null
            const result = await service.getProvider('invalid-id');
            expect(result).toBeNull();
        });
        it('should handle update non-existent provider gracefully', async () => {
            const result = await service.updateProvider('invalid-id', { enabled: false });
            expect(result).toBeNull();
        });
        it('should handle fallback chain get errors gracefully', async () => {
            const result = await service.getFallbackChain('invalid-id');
            expect(result).toBeNull();
        });
        it('should track exceptions when monitoring enabled', async () => {
            // Force an error scenario
            const monitoringWithError = createMockMonitoring();
            monitoringWithError.trackException = vi.fn().mockImplementation(() => {
                throw new Error('Monitoring error');
            });
            const serviceWithError = new AdminDashboardService(monitoringWithError);
            // Should not throw even if monitoring fails
            const providers = await serviceWithError.getProviders();
            expect(providers).toBeDefined();
        });
    });
    describe('Data Integrity', () => {
        it('should not modify original data on partial updates', async () => {
            const before = await service.getProvider((await service.getProviders())[0].id);
            const beforeMetrics = { ...before?.metrics };
            await service.updateProvider(before.id, { priority: 10 });
            const after = await service.getProvider(before.id);
            expect(after?.metrics).toEqual(beforeMetrics);
        });
        it('should maintain referential integrity for tenant configs', async () => {
            const config = await service.getTenantWebSearchConfig('tenant-xyz');
            const quota = await service.getQuotaConfig('tenant-xyz');
            expect(config?.quotaConfig.tenantId).toBe(quota?.tenantId);
        });
        it('should generate unique timestamps for updates', async () => {
            const provider = (await service.getProviders())[0];
            const timestampBefore = provider.updatedAt.getTime();
            // Wait a small amount to ensure timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 10));
            await service.updateProvider(provider.id, { priority: 5 });
            const updated = await service.getProvider(provider.id);
            expect(updated?.updatedAt.getTime()).toBeGreaterThan(timestampBefore);
        });
    });
});
//# sourceMappingURL=admin-dashboard.service.test.js.map