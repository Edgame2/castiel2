/**
 * Collaborative Insights Repository
 * Handles Cosmos DB operations for shared insights, comments, and reactions
 */
import { Container, CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { SharedInsight, InsightVisibility } from '../services/collaborative-insights.service.js';
/**
 * Collaborative Insights Repository
 */
export declare class CollaborativeInsightsRepository {
    private container;
    private monitoring?;
    constructor(client: CosmosClient, databaseId: string, containerId: string, monitoring?: IMonitoringProvider);
    /**
     * Ensure container exists with HPK
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId: string): Promise<Container>;
    /**
     * Create or update a shared insight
     */
    upsertInsight(insight: SharedInsight): Promise<SharedInsight>;
    /**
     * Get insight by ID
     */
    getInsight(insightId: string, tenantId: string): Promise<SharedInsight | null>;
    /**
     * List insights for a tenant with filters
     */
    listInsights(tenantId: string, options?: {
        visibility?: InsightVisibility;
        sharedBy?: string;
        tags?: string[];
        isArchived?: boolean;
        isPinned?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<SharedInsight[]>;
    /**
     * Delete insight
     */
    deleteInsight(insightId: string, tenantId: string): Promise<boolean>;
    /**
     * Update insight (partial update)
     */
    updateInsight(insightId: string, tenantId: string, updates: Partial<SharedInsight>): Promise<SharedInsight | null>;
    /**
     * Deserialize insight from Cosmos DB format (convert ISO strings back to Dates)
     */
    private deserializeInsight;
}
//# sourceMappingURL=collaborative-insights.repository.d.ts.map