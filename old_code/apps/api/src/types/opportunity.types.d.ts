/**
 * Opportunity Types
 * Type definitions for opportunity-related features
 */
import type { Shard } from './shard.types.js';
import type { RiskEvaluation } from './risk-analysis.types.js';
/**
 * Opportunity filters for querying
 */
export interface OpportunityFilters {
    ownerId?: string;
    stage?: string | string[];
    status?: 'open' | 'won' | 'lost' | ('open' | 'won' | 'lost')[];
    accountId?: string;
    riskLevel?: 'high' | 'medium' | 'low' | ('high' | 'medium' | 'low')[];
    riskCategory?: string | string[];
    riskScoreMin?: number;
    riskScoreMax?: number;
    revenueAtRiskMin?: number;
    closeDateFrom?: Date;
    closeDateTo?: Date;
    dateRange?: {
        startDate: Date;
        endDate: Date;
    };
    searchQuery?: string;
}
/**
 * Opportunity list result
 */
export interface OpportunityListResult {
    opportunities: Shard[];
    total: number;
    continuationToken?: string;
    hasMore: boolean;
}
/**
 * Opportunity with related shards
 */
export interface OpportunityWithRelated {
    opportunity: Shard;
    relatedShards: {
        account?: Shard;
        contact?: Shard;
        documents: Shard[];
        tasks: Shard[];
        notes: Shard[];
        meetings: Shard[];
        calls: Shard[];
    };
    riskEvaluation?: RiskEvaluation;
}
/**
 * Pipeline view types
 */
export type PipelineViewType = 'all' | 'active' | 'stage' | 'kanban';
/**
 * Pipeline view data
 */
export interface PipelineView {
    viewType: PipelineViewType;
    opportunities: Shard[];
    stages?: {
        stage: string;
        opportunities: Shard[];
        totalValue: number;
        totalExpectedRevenue: number;
        count: number;
    }[];
    summary: {
        totalValue: number;
        totalExpectedRevenue: number;
        totalRevenueAtRisk: number;
        riskAdjustedValue: number;
        opportunityCount: number;
    };
}
/**
 * Kanban view data
 */
export interface KanbanView {
    columns: {
        stage: string;
        opportunities: Shard[];
        totalValue: number;
        count: number;
    }[];
    summary: {
        totalValue: number;
        totalExpectedRevenue: number;
        opportunityCount: number;
    };
}
/**
 * Pipeline filters
 */
export interface PipelineFilters extends OpportunityFilters {
    viewType?: PipelineViewType;
    includeClosed?: boolean;
}
/**
 * Pipeline metrics
 */
export interface PipelineMetrics {
    userId: string;
    totalPipelineValue: number;
    totalExpectedRevenue: number;
    totalRevenueAtRisk: number;
    riskAdjustedValue: number;
    opportunityCount: number;
    currency: string;
    calculatedAt: Date;
}
/**
 * Closed won/lost metrics
 */
export interface ClosedWonMetrics {
    userId: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    closedWon: {
        count: number;
        totalValue: number;
        totalRevenue: number;
    };
    closedLost: {
        count: number;
        totalValue: number;
        lostReasons: Record<string, number>;
    };
    winRate: number;
    calculatedAt: Date;
}
/**
 * Risk level organization
 */
export interface RiskLevelOrganization {
    high: {
        opportunities: Shard[];
        count: number;
        totalValue: number;
        totalRevenueAtRisk: number;
    };
    medium: {
        opportunities: Shard[];
        count: number;
        totalValue: number;
        totalRevenueAtRisk: number;
    };
    low: {
        opportunities: Shard[];
        count: number;
        totalValue: number;
        totalRevenueAtRisk: number;
    };
}
/**
 * Recommendation for opportunity
 */
export interface OpportunityRecommendation {
    id: string;
    type: 'action' | 'risk' | 'forecast' | 'relationship';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    impact?: number;
    suggestedActions?: string[];
    relatedRiskIds?: string[];
    generatedAt: Date;
    generatedBy: 'ai' | 'rule' | 'system';
}
//# sourceMappingURL=opportunity.types.d.ts.map