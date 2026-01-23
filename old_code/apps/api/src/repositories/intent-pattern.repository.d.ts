/**
 * Intent Pattern Repository
 * Manages intent classification patterns in Cosmos DB
 */
import { Container, CosmosClient } from '@azure/cosmos';
import type { IntentPattern, CreateIntentPatternInput, UpdateIntentPatternInput, ListIntentPatternsOptions } from '../types/intent-pattern.types.js';
export declare class IntentPatternRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId?: string);
    /**
     * Ensure container exists
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId?: string): Promise<Container>;
    /**
     * Create a new intent pattern
     */
    create(input: CreateIntentPatternInput, createdBy: string): Promise<IntentPattern>;
    /**
     * Get pattern by ID
     */
    findById(id: string): Promise<IntentPattern | null>;
    /**
     * List patterns with filters
     */
    list(options?: ListIntentPatternsOptions): Promise<{
        patterns: IntentPattern[];
        total: number;
    }>;
    /**
     * Update pattern
     */
    update(id: string, input: UpdateIntentPatternInput, updatedBy: string): Promise<IntentPattern>;
    /**
     * Delete pattern
     */
    delete(id: string): Promise<void>;
    /**
     * Get active patterns for a specific intent type
     */
    findActiveByIntentType(intentType: string): Promise<IntentPattern[]>;
    /**
     * Update pattern metrics
     */
    updateMetrics(id: string, metrics: Partial<IntentPattern['metrics']>): Promise<IntentPattern>;
}
//# sourceMappingURL=intent-pattern.repository.d.ts.map