/**
 * Proactive Insights Worker
 * Background worker that periodically checks triggers and generates proactive insights
 */
/**
 * Background worker for proactive insights
 */
export class ProactiveInsightsWorker {
    proactiveInsightService;
    tenantService;
    monitoring;
    tenantsContainer;
    isRunning = false;
    pollInterval = null;
    activeTenants = new Set();
    pollIntervalMs;
    batchSize;
    maxConcurrentTenants;
    enabled;
    constructor(proactiveInsightService, tenantService, monitoring, tenantsContainer, config = {}) {
        this.proactiveInsightService = proactiveInsightService;
        this.tenantService = tenantService;
        this.monitoring = monitoring;
        this.tenantsContainer = tenantsContainer;
        this.pollIntervalMs = config.pollIntervalMs || 60000; // 1 minute default
        this.batchSize = config.batchSize || 10;
        this.maxConcurrentTenants = config.maxConcurrentTenants || 5;
        this.enabled = config.enabled !== false;
    }
    /**
     * Start the background worker
     */
    start() {
        if (!this.enabled) {
            this.monitoring.trackEvent('proactive_insights_worker.disabled');
            return;
        }
        if (this.isRunning) {
            this.monitoring.trackEvent('proactive_insights_worker.already_running');
            return;
        }
        this.isRunning = true;
        this.monitoring.trackEvent('proactive_insights_worker.started', {
            pollIntervalMs: this.pollIntervalMs,
            maxConcurrentTenants: this.maxConcurrentTenants,
        });
        // Start polling immediately
        this.poll();
    }
    /**
     * Stop the background worker
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.pollInterval) {
            clearTimeout(this.pollInterval);
            this.pollInterval = null;
        }
        this.monitoring.trackEvent('proactive_insights_worker.stopped', {
            activeTenants: this.activeTenants.size,
        });
    }
    /**
     * Check if the worker is running
     */
    getIsRunning() {
        return this.isRunning;
    }
    /**
     * Get current stats
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            activeTenants: this.activeTenants.size,
            enabled: this.enabled,
        };
    }
    /**
     * Poll for tenants and check triggers
     */
    poll() {
        if (!this.isRunning) {
            return;
        }
        this.processTenants()
            .catch((err) => {
            this.monitoring.trackException(err, {
                operation: 'proactive_insights_worker.poll',
            });
        })
            .finally(() => {
            // Schedule next poll
            this.pollInterval = setTimeout(() => {
                this.poll();
            }, this.pollIntervalMs);
        });
    }
    /**
     * Process tenants and check triggers
     */
    async processTenants() {
        // Skip if we're at max concurrent tenants
        if (this.activeTenants.size >= this.maxConcurrentTenants) {
            return;
        }
        try {
            // Get tenants to process
            const tenants = await this.getTenantsToProcess();
            for (const tenantId of tenants) {
                // Skip if already being processed
                if (this.activeTenants.has(tenantId)) {
                    continue;
                }
                // Skip if we're at max concurrent tenants
                if (this.activeTenants.size >= this.maxConcurrentTenants) {
                    break;
                }
                // Start processing this tenant
                this.activeTenants.add(tenantId);
                // Process tenant with error handling to prevent unhandled promise rejections
                this.processTenant(tenantId)
                    .catch((err) => {
                    this.monitoring.trackException(err, {
                        operation: 'proactive_insights_worker.processTenant',
                        tenantId,
                    });
                })
                    .finally(() => {
                    this.activeTenants.delete(tenantId);
                });
            }
            if (tenants.length > 0) {
                this.monitoring.trackMetric('proactive_insights_worker.tenants_processed', tenants.length);
            }
        }
        catch (err) {
            this.monitoring.trackException(err, {
                operation: 'proactive_insights_worker.processTenants',
            });
        }
    }
    /**
     * Get tenants to process
     */
    async getTenantsToProcess() {
        try {
            // Try to get tenants from Cosmos DB directly
            if (this.tenantsContainer) {
                // Query for active tenants (status = 'active')
                const query = 'SELECT c.id FROM c WHERE c.status = @status';
                const { resources } = await this.tenantsContainer.items
                    .query({
                    query,
                    parameters: [{ name: '@status', value: 'active' }],
                    maxItemCount: this.batchSize,
                })
                    .fetchNext();
                if (resources && resources.length > 0) {
                    return resources.map(t => t.id).filter(Boolean);
                }
            }
            // Fallback: If tenant service is available, try to use it
            if (this.tenantService && typeof this.tenantService.listTenants === 'function') {
                try {
                    const result = await this.tenantService.listTenants({
                        limit: this.batchSize,
                        status: 'active',
                    });
                    return result.tenants.map((t) => t.id || t.tenantId).filter(Boolean);
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'proactive_insights_worker.getTenantsToProcess.tenantService',
                    });
                }
            }
            // If no way to get tenants, return empty array
            return [];
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'proactive_insights_worker.getTenantsToProcess',
            });
            return [];
        }
    }
    /**
     * Process a single tenant (check triggers and generate insights)
     */
    async processTenant(tenantId) {
        const startTime = Date.now();
        try {
            this.monitoring.trackEvent('proactive_insights_worker.tenant_check_started', {
                tenantId,
            });
            // Check triggers for this tenant
            const result = await this.proactiveInsightService.checkTriggers(tenantId, {
                dryRun: false,
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('proactive_insights_worker.tenant_check_duration_ms', duration, {
                tenantId,
            });
            this.monitoring.trackEvent('proactive_insights_worker.tenant_check_completed', {
                tenantId,
                triggersEvaluated: result.triggersEvaluated,
                shardsEvaluated: result.shardsEvaluated,
                insightsGenerated: result.insightsGenerated.length,
                errors: result.errors.length,
                durationMs: duration,
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'proactive_insights_worker.processTenant',
                tenantId,
                durationMs: duration,
            });
            this.monitoring.trackEvent('proactive_insights_worker.tenant_check_failed', {
                tenantId,
                error: error.message,
                durationMs: duration,
            });
        }
    }
}
//# sourceMappingURL=proactive-insights-worker.service.js.map