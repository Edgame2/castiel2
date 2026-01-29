/**
 * Entity Linking Service
 * Links documents, emails, messages, meetings to CRM entities (opportunities, accounts, contacts)
 * @module @coder/shared/services
 */
import { ServiceClient } from './ServiceClient';
/**
 * Entity link with confidence score
 */
export interface EntityLink {
    id: string;
    shardTypeId: string;
    shardTypeName?: string;
    confidence: number;
    strategy: string;
    metadata?: Record<string, any>;
}
/**
 * Collection of entity links grouped by type
 */
export interface EntityLinks {
    opportunities: EntityLink[];
    accounts: EntityLink[];
    contacts: EntityLink[];
}
/**
 * Entity linking service
 * Provides fast linking (during shard creation) and deep linking (async) strategies
 */
export declare class EntityLinkingService {
    private shardManager;
    private aiService?;
    constructor(shardManager: ServiceClient, aiService?: ServiceClient);
    /**
     * Fast linking - strategies that can run during shard creation (100-300ms)
     * Strategies: Explicit Reference, Participant Matching
     */
    fastLink(shard: any, tenantId: string): Promise<EntityLinks>;
    /**
     * Deep linking - strategies that run async after shard creation (1-5 seconds)
     * Strategies: Content Analysis (LLM), Temporal Correlation, Vector Similarity
     */
    deepLink(shard: any, tenantId: string): Promise<EntityLinks>;
    /**
     * Strategy 1: Find explicit references to entities
     * - Document/email contains opportunity ID
     * - Message @mentions deal name
     * - Calendar event has deal in title
     * Confidence: 100%
     */
    private findExplicitReferences;
    /**
     * Strategy 2: Match participants to contacts/opportunities
     * - Email to/from contact in opportunity
     * - Meeting participants match stakeholders
     * - Message in channel with stakeholder
     * Confidence: 80-90%
     */
    private matchParticipants;
    /**
     * Strategy 3: Content Analysis using LLM
     * - Extract company names → match to accounts
     * - Extract deal amounts → match to opportunity value
     * - Topic similarity
     * Confidence: 60-80%
     */
    private analyzeContent;
    /**
     * Strategy 4: Temporal Correlation
     * - Activity near opportunity close date
     * - Activity during active stage
     * - Activity with same participants
     * Confidence: 40-60%
     */
    private findTemporalCorrelations;
    /**
     * Extract text content from unstructured data
     */
    private extractTextContent;
    /**
     * Deduplicate and merge entity links
     * Removes duplicates and merges links from multiple strategies
     */
    mergeLinks(...linkSets: EntityLinks[]): EntityLinks;
}
//# sourceMappingURL=EntityLinkingService.d.ts.map