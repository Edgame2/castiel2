/**
 * Opportunity Service
 * Centralized service for opportunity operations
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';
import { TeamService } from './team.service.js';
import type { OpportunityFilters, OpportunityListResult, OpportunityWithRelated } from '../types/opportunity.types.js';
import type { Shard } from '../types/shard.types.js';
export declare class OpportunityService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private relationshipService;
    private riskEvaluationService?;
    private teamService?;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, relationshipService: ShardRelationshipService, riskEvaluationService?: RiskEvaluationService | undefined, teamService?: TeamService | undefined);
    /**
     * List opportunities owned by user with filters
     */
    listOwnedOpportunities(userId: string, tenantId: string, filters?: OpportunityFilters, options?: {
        limit?: number;
        offset?: number;
        continuationToken?: string;
        includeRisk?: boolean;
    }): Promise<OpportunityListResult>;
    /**
     * Get opportunity with related shards
     */
    getOpportunity(opportunityId: string, tenantId: string, includeRelated?: boolean): Promise<OpportunityWithRelated>;
    /**
     * Get opportunities by account
     */
    getOpportunitiesByAccount(accountId: string, tenantId: string, options?: {
        limit?: number;
        includeClosed?: boolean;
    }): Promise<Shard[]>;
    /**
     * Update opportunity stage (for kanban drag-and-drop)
     */
    updateStage(opportunityId: string, newStage: string, tenantId: string, userId: string): Promise<Shard>;
    /**
     * Apply risk-based filters (post-query filtering)
     * Note: This requires risk evaluation, so it's done after initial query
     */
    private applyRiskFilters;
    /**
     * List opportunities for a team (all team members' opportunities)
     */
    listTeamOpportunities(teamId: string, tenantId: string, userId: string, filters?: OpportunityFilters, options?: {
        limit?: number;
        offset?: number;
        continuationToken?: string;
        includeRisk?: boolean;
    }): Promise<OpportunityListResult>;
    /**
     * List opportunities for all teams managed by a user
     */
    listManagerOpportunities(managerId: string, tenantId: string, userId: string, filters?: OpportunityFilters, options?: {
        limit?: number;
        offset?: number;
        continuationToken?: string;
        includeRisk?: boolean;
        includeAllTeams?: boolean;
    }): Promise<OpportunityListResult>;
    /**
     * Helper: Apply opportunity filters (stage, status, accountId, closeDate, searchQuery)
     */
    private applyOpportunityFilters;
}
//# sourceMappingURL=opportunity.service.d.ts.map