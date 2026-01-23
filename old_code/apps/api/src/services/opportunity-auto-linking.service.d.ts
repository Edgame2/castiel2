/**
 * Opportunity Auto-Linking Service
 *
 * Automatically links shards to opportunities based on multi-factor matching:
 * - Content overlap: Same account, contact, company IDs
 * - Metadata overlap: Same owner, team members, dates
 * - Temporal overlap: Shards created within time window of opportunity activity
 * - Account-based: Shards linked to same account as opportunity
 *
 * Trigger: Service Bus events (shard-created) or Change Feed
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import type { Shard } from '../types/shard.types.js';
export declare class OpportunityAutoLinkingService {
    private monitoring;
    private shardRepository;
    private relationshipService;
    private shardTypeRepository;
    private readonly ACTIVITY_TIME_WINDOW_DAYS;
    private readonly STRONG_CONFIDENCE_THRESHOLD;
    private readonly MEDIUM_CONFIDENCE_THRESHOLD;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, relationshipService: ShardRelationshipService, shardTypeRepository: ShardTypeRepository);
    /**
     * Process shard creation event and auto-link to opportunities
     */
    processShardCreated(shard: Shard): Promise<void>;
    /**
     * Find candidate opportunities for auto-linking
     */
    private findCandidateOpportunities;
    /**
     * Evaluate linking rules between shard and opportunity
     */
    private evaluateLinkingRules;
    /**
     * Check content overlap (account, contact, company IDs)
     */
    private checkContentOverlap;
    /**
     * Check metadata overlap (owner, team, dates)
     */
    private checkMetadataOverlap;
    /**
     * Check temporal overlap (time window)
     */
    private checkTemporalOverlap;
    /**
     * Check account-based linking (shard linked to same account as opportunity)
     */
    private checkAccountBased;
    /**
     * Calculate total confidence from rules
     */
    private calculateTotalConfidence;
    /**
     * Link shard to opportunity
     */
    private linkShardToOpportunity;
    /**
     * Get relationship type based on shard type
     */
    private getRelationshipType;
    /**
     * Check if shard is already linked to an opportunity
     */
    private isAlreadyLinkedToOpportunity;
}
//# sourceMappingURL=opportunity-auto-linking.service.d.ts.map