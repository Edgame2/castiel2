/**
 * Proactive Insights Repository
 * Handles Cosmos DB operations for proactive insights
 */
import { CosmosClient } from '@azure/cosmos';
import { ProactiveInsight, ProactiveInsightStatus, ProactiveInsightType, ProactiveInsightPriority } from '../types/proactive-insights.types.js';
/**
 * Proactive Insights Repository
 */
export declare class ProactiveInsightsRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId: string);
    /**
     * Create or update a proactive insight
     */
    upsertInsight(insight: ProactiveInsight): Promise<ProactiveInsight>;
    /**
     * Get insight by ID
     */
    getInsight(insightId: string, tenantId: string): Promise<ProactiveInsight | null>;
    /**
     * List insights for a tenant with filters
     */
    listInsights(tenantId: string, options?: {
        status?: ProactiveInsightStatus | ProactiveInsightStatus[];
        type?: ProactiveInsightType | ProactiveInsightType[];
        priority?: ProactiveInsightPriority | ProactiveInsightPriority[];
        shardId?: string;
        triggerId?: string;
        limit?: number;
        offset?: number;
        orderBy?: 'createdAt' | 'updatedAt' | 'priority';
        order?: 'asc' | 'desc';
    }): Promise<{
        insights: ProactiveInsight[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Update insight status
     */
    updateInsightStatus(insightId: string, tenantId: string, status: ProactiveInsightStatus, userId?: string, reason?: string): Promise<ProactiveInsight>;
    /**
     * Delete insight
     */
    deleteInsight(insightId: string, tenantId: string): Promise<void>;
    /**
     * Deserialize insight from Cosmos DB format (convert ISO strings back to Dates)
     */
    private deserializeInsight;
}
//# sourceMappingURL=proactive-insights.repository.d.ts.map