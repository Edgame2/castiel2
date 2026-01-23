/**
 * Integration Deduplication Service
 * Finds and merges duplicate shards created from integrations
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Deduplication rule
 */
export interface DeduplicationRule {
    /** Field to match on */
    field: string;
    /** Match type */
    matchType: 'exact' | 'fuzzy' | 'soundex' | 'metaphone';
    /** Weight for scoring (0-1) */
    weight: number;
    /** Minimum similarity threshold (for fuzzy matching) */
    threshold?: number;
}
/**
 * Merge strategy
 */
export type MergeStrategy = 'keep_first' | 'keep_last' | 'keep_most_complete' | 'merge_fields' | 'manual';
/**
 * Duplicate match result
 */
export interface DuplicateMatch {
    shardId: string;
    score: number;
    matchedFields: string[];
}
/**
 * Integration Deduplication Service
 */
export declare class IntegrationDeduplicationService {
    private shardRepository;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository);
    /**
     * Find duplicate shards before creation
     */
    findDuplicates(tenantId: string, shardTypeId: string, data: Record<string, any>, rules: DeduplicationRule[]): Promise<string[]>;
    /**
     * Find exact field matches
     */
    private findExactMatches;
    /**
     * Find fuzzy matches using string similarity
     */
    private findFuzzyMatches;
    /**
     * Find phonetic matches (soundex/metaphone)
     */
    private findPhoneticMatches;
    /**
     * Merge duplicate shards
     */
    mergeDuplicates(tenantId: string, shardIds: string[], strategy: MergeStrategy): Promise<string>;
    /**
     * Merge fields from multiple shards (first non-null wins)
     */
    private mergeShardFields;
    /**
     * Normalize string for comparison
     */
    private normalizeString;
    /**
     * Calculate string similarity (Levenshtein distance)
     */
    private calculateSimilarity;
    /**
     * Soundex algorithm for phonetic matching
     */
    private soundex;
    /**
     * Metaphone algorithm for phonetic matching
     */
    private metaphone;
}
//# sourceMappingURL=integration-deduplication.service.d.ts.map