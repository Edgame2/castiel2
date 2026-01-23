/**
 * Memory & Long-Term Context Service
 * Stores and retrieves user preferences, entity facts, and conversation history
 * for personalized AI interactions
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface UserMemory {
    userId: string;
    tenantId: string;
    preferences: UserPreferences;
    facts: MemoryFact[];
    patterns: InteractionPattern[];
    recentTopics: string[];
    recentShards: string[];
    stats: UserStats;
    updatedAt: Date;
}
export interface UserPreferences {
    responseLength: 'brief' | 'standard' | 'detailed';
    responseStyle: 'formal' | 'casual' | 'technical';
    includeExamples: boolean;
    includeVisuals: boolean;
    primaryFocusAreas: string[];
    excludeTopics: string[];
    preferredFormat: 'text' | 'markdown' | 'bullet_list';
    language: string;
    timezone: string;
    proactiveInsights: boolean;
    dailyBriefing: boolean;
    followUpSuggestions: boolean;
}
export interface MemoryFact {
    id: string;
    category: FactCategory;
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    source: 'explicit' | 'inferred' | 'system';
    createdAt: Date;
    expiresAt?: Date;
    usageCount: number;
}
export type FactCategory = 'role' | 'expertise' | 'interest' | 'responsibility' | 'preference' | 'relationship' | 'context' | 'custom';
export interface InteractionPattern {
    pattern: string;
    frequency: number;
    lastOccurred: Date;
    confidence: number;
}
export interface UserStats {
    totalQueries: number;
    averageQueryLength: number;
    mostUsedFeatures: string[];
    peakActivityHours: number[];
    preferredModels: string[];
    averageSatisfaction: number;
}
export interface EntityMemory {
    entityId: string;
    tenantId: string;
    entityType: string;
    entityName: string;
    facts: EntityFact[];
    relationships: EntityRelationship[];
    mentionHistory: EntityMention[];
    summary?: string;
    summaryGeneratedAt?: Date;
    updatedAt: Date;
}
export interface EntityFact {
    id: string;
    key: string;
    value: string;
    source: 'data' | 'inferred' | 'user_stated';
    confidence: number;
    createdAt: Date;
}
export interface EntityRelationship {
    relatedEntityId: string;
    relatedEntityName: string;
    relationshipType: string;
    strength: number;
    bidirectional: boolean;
}
export interface EntityMention {
    conversationId: string;
    messageId: string;
    timestamp: Date;
    context: string;
}
export interface ConversationMemory {
    conversationId: string;
    tenantId: string;
    userId: string;
    summary: string;
    keyPoints: string[];
    entitiesMentioned: string[];
    decisions: string[];
    followUps: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    createdAt: Date;
}
export declare class MemoryContextService {
    private readonly redis;
    private readonly monitoring;
    private readonly USER_MEMORY_KEY;
    private readonly ENTITY_MEMORY_KEY;
    private readonly CONVERSATION_MEMORY_KEY;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Get or create user memory
     */
    getUserMemory(userId: string, tenantId: string): Promise<UserMemory>;
    /**
     * Update user preferences
     */
    updateUserPreferences(userId: string, tenantId: string, preferences: Partial<UserPreferences>): Promise<UserMemory>;
    /**
     * Add a fact about the user
     */
    addUserFact(userId: string, tenantId: string, fact: Omit<MemoryFact, 'id' | 'createdAt' | 'usageCount'>): Promise<MemoryFact>;
    /**
     * Record user interaction
     */
    recordInteraction(userId: string, tenantId: string, query: string, shardIds: string[], topics: string[]): Promise<void>;
    /**
     * Get relevant context for a query
     */
    getRelevantContext(userId: string, tenantId: string, query: string): Promise<{
        preferences: UserPreferences;
        relevantFacts: MemoryFact[];
        recentContext: {
            topics: string[];
            shards: string[];
        };
        patterns: InteractionPattern[];
    }>;
    /**
     * Get or create entity memory
     */
    getEntityMemory(entityId: string, tenantId: string): Promise<EntityMemory | null>;
    /**
     * Update entity memory
     */
    updateEntityMemory(entityId: string, tenantId: string, entityType: string, entityName: string, updates: {
        facts?: EntityFact[];
        relationships?: EntityRelationship[];
        summary?: string;
    }): Promise<EntityMemory>;
    /**
     * Record entity mention in conversation
     */
    recordEntityMention(entityId: string, tenantId: string, conversationId: string, messageId: string, context: string): Promise<void>;
    /**
     * Store conversation summary
     */
    storeConversationMemory(memory: Omit<ConversationMemory, 'createdAt'>): Promise<ConversationMemory>;
    /**
     * Get conversation memory
     */
    getConversationMemory(conversationId: string, tenantId: string): Promise<ConversationMemory | null>;
    /**
     * Get user's recent conversation memories
     */
    getRecentConversations(userId: string, tenantId: string, limit?: number): Promise<ConversationMemory[]>;
    /**
     * Estimate token count for a message or text
     * Uses rough estimate: ~4 characters per token
     */
    estimateTokens(data: unknown): number;
    /**
     * Estimate total tokens for an array of messages
     */
    estimateMessageTokens(messages: Array<{
        content: string;
        role?: string;
    }>): number;
    private detectPatterns;
    private extractQueryPatterns;
    private getDefaultPreferences;
    private saveUserMemory;
    private saveEntityMemory;
    /**
     * Remove a specific fact (forget)
     */
    removeUserFact(userId: string, tenantId: string, factId: string): Promise<boolean>;
    /**
     * Search user memory
     */
    searchUserMemory(userId: string, tenantId: string, query: string, options?: {
        category?: string;
        limit?: number;
    }): Promise<MemoryFact[]>;
    /**
     * Remember explicit information (explicit memory management)
     * Extracts structured information from natural language
     */
    remember(userId: string, tenantId: string, information: string, options?: {
        subject?: string;
        category?: string;
        confidence?: number;
    }): Promise<MemoryFact>;
    /**
     * Forget specific information (explicit memory management)
     */
    forget(userId: string, tenantId: string, query: string): Promise<{
        removed: number;
        facts: MemoryFact[];
    }>;
    /**
     * List all user facts (for memory management UI)
     */
    listUserFacts(userId: string, tenantId: string, options?: {
        category?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        facts: MemoryFact[];
        total: number;
        limit: number;
        offset: number;
    }>;
    /**
     * Clear user memory (for privacy/GDPR)
     */
    clearUserMemory(userId: string, tenantId: string): Promise<void>;
}
export declare function createMemoryContextService(redis: Redis, monitoring: IMonitoringProvider): MemoryContextService;
//# sourceMappingURL=memory-context.service.d.ts.map