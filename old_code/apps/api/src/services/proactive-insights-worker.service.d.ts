/**
 * Proactive Insights Worker
 * Background worker that periodically checks triggers and generates proactive insights
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ProactiveInsightService } from './proactive-insight.service.js';
import { TenantService } from './auth/tenant.service.js';
export interface ProactiveInsightsWorkerConfig {
    pollIntervalMs?: number;
    batchSize?: number;
    maxConcurrentTenants?: number;
    enabled?: boolean;
}
/**
 * Background worker for proactive insights
 */
export declare class ProactiveInsightsWorker {
    private proactiveInsightService;
    private tenantService;
    private monitoring;
    private tenantsContainer;
    private isRunning;
    private pollInterval;
    private activeTenants;
    private readonly pollIntervalMs;
    private readonly batchSize;
    private readonly maxConcurrentTenants;
    private readonly enabled;
    constructor(proactiveInsightService: ProactiveInsightService, tenantService: TenantService | null, monitoring: IMonitoringProvider, tenantsContainer: Container | null, config?: ProactiveInsightsWorkerConfig);
    /**
     * Start the background worker
     */
    start(): void;
    /**
     * Stop the background worker
     */
    stop(): void;
    /**
     * Check if the worker is running
     */
    getIsRunning(): boolean;
    /**
     * Get current stats
     */
    getStats(): {
        isRunning: boolean;
        activeTenants: number;
        enabled: boolean;
    };
    /**
     * Poll for tenants and check triggers
     */
    private poll;
    /**
     * Process tenants and check triggers
     */
    private processTenants;
    /**
     * Get tenants to process
     */
    private getTenantsToProcess;
    /**
     * Process a single tenant (check triggers and generate insights)
     */
    private processTenant;
}
//# sourceMappingURL=proactive-insights-worker.service.d.ts.map