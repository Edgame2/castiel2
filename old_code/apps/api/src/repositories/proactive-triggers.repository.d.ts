/**
 * Proactive Triggers Repository
 * Handles Cosmos DB operations for proactive triggers
 */
import { CosmosClient } from '@azure/cosmos';
import { ProactiveTrigger, ProactiveInsightType } from '../types/proactive-insights.types.js';
export interface ListTriggersOptions {
    shardTypeId?: string;
    type?: ProactiveInsightType;
    isActive?: boolean;
    isSystem?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'triggerCount';
    order?: 'asc' | 'desc';
}
/**
 * Proactive Triggers Repository
 */
export declare class ProactiveTriggersRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId: string);
    /**
     * Create or update a trigger
     */
    upsertTrigger(trigger: ProactiveTrigger): Promise<ProactiveTrigger>;
    /**
     * Get trigger by ID
     */
    getTrigger(triggerId: string, tenantId: string): Promise<ProactiveTrigger | null>;
    /**
     * List triggers for a tenant with filters
     */
    listTriggers(tenantId: string, options?: ListTriggersOptions): Promise<{
        triggers: ProactiveTrigger[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Delete trigger
     */
    deleteTrigger(triggerId: string, tenantId: string): Promise<void>;
    /**
     * Update trigger statistics
     */
    updateTriggerStats(triggerId: string, tenantId: string, updates: {
        lastTriggeredAt?: Date;
        triggerCount?: number;
    }): Promise<ProactiveTrigger>;
    /**
     * Deserialize trigger from Cosmos DB format (convert ISO strings back to Dates)
     */
    private deserializeTrigger;
}
//# sourceMappingURL=proactive-triggers.repository.d.ts.map