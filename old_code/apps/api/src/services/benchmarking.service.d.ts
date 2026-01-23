/**
 * Benchmarking Service
 * Calculates benchmarks for win rates, closing times, deal sizes, and renewal estimates
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import type { WinRateBenchmark, ClosingTimeBenchmark, DealSizeBenchmark, RenewalEstimate } from '../types/quota.types.js';
export declare class BenchmarkingService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private relationshipService;
    private readonly DEFAULT_BENCHMARK_PERIOD_DAYS;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, relationshipService: ShardRelationshipService);
    /**
     * Calculate win rates by stage, industry, or overall
     */
    calculateWinRates(tenantId: string, options?: {
        industryId?: string;
        startDate?: Date;
        endDate?: Date;
        scope?: 'tenant' | 'industry' | 'peer';
    }): Promise<WinRateBenchmark>;
    /**
     * Calculate closing times (average, median, percentiles)
     */
    calculateClosingTimes(tenantId: string, options?: {
        industryId?: string;
        startDate?: Date;
        endDate?: Date;
        scope?: 'tenant' | 'industry' | 'peer';
    }): Promise<ClosingTimeBenchmark>;
    /**
     * Calculate deal size distribution
     */
    calculateDealSizeDistribution(tenantId: string, options?: {
        industryId?: string;
        startDate?: Date;
        endDate?: Date;
        scope?: 'tenant' | 'industry' | 'peer';
    }): Promise<DealSizeBenchmark>;
    /**
     * Estimate renewal probability for a contract
     * Note: This is a simplified implementation. In a real system, contracts would be
     * stored as separate shards (e.g., c_contract). For now, we'll use opportunities
     * with a specific relationship or metadata to identify contracts.
     */
    estimateRenewal(contractId: string, tenantId: string): Promise<RenewalEstimate>;
    /**
     * Helper: Get closed opportunities in a period
     */
    private getClosedOpportunities;
}
//# sourceMappingURL=benchmarking.service.d.ts.map