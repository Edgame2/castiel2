/**
 * Insight Computation Service (Phase 2)
 *
 * Computes KPI insights from CRM data and maintains provenance links.
 *
 * Responsibilities:
 * 1. Recompute KPI shards on CRM changes (via Change Feed subscription)
 * 2. Nightly batch recomputation
 * 3. Create provenance shards linking to source shards via internal_relationships[]
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { Container } from '@azure/cosmos';
interface InsightComputationConfig {
    enableChangeFeed?: boolean;
    enableNightlyBatch?: boolean;
    batchSize?: number;
    pollIntervalMs?: number;
}
export declare class InsightComputationService {
    private shardRepository;
    private monitoring;
    private shardsContainer;
    private changeFeedIterator;
    private isRunning;
    private config;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardsContainer: Container, config?: InsightComputationConfig);
    /**
     * Start change feed listener for CRM changes
     */
    startChangeFeedListener(): Promise<void>;
    /**
     * Process change feed loop
     */
    private processChangeFeedLoop;
    /**
     * Recompute KPIs for a specific shard
     */
    private recomputeKPIsForShard;
    /**
     * Compute KPIs for an opportunity shard
     */
    private computeOpportunityKPIs;
    /**
     * Compute KPIs for an account shard
     */
    private computeAccountKPIs;
    /**
     * Create or update KPI shard with provenance
     */
    private createOrUpdateKPIShard;
    /**
     * Run nightly batch recomputation
     */
    runNightlyBatchRecomputation(tenantId?: string): Promise<void>;
    /**
     * Stop change feed listener
     */
    stopChangeFeedListener(): Promise<void>;
}
export {};
//# sourceMappingURL=insight-computation.service.d.ts.map