import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { Shard } from '../types/shard.types.js';
import { ContextTemplateStructuredData, ContextAssemblyOptions, ContextAssemblyResult, TemplateSelectionOptions } from '../types/context-template.types.js';
/**
 * Context Template Service
 * Handles template resolution, selection, and context assembly
 */
export declare class ContextTemplateService {
    private shardRepository;
    private shardTypeRepository;
    private relationshipService;
    private monitoring;
    private redis?;
    private systemTemplateCache;
    private unifiedAIClient?;
    private aiConnectionService?;
    private vectorSearchService?;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, relationshipService: ShardRelationshipService, redis?: Redis, unifiedAIClient?: any, // Optional: for LLM-based query understanding
    aiConnectionService?: any, // Optional: for LLM-based query understanding
    vectorSearchService?: any);
    /**
     * Assemble context for a shard using a template
     */
    assembleContext(shardId: string, tenantId: string, options?: ContextAssemblyOptions): Promise<ContextAssemblyResult>;
    /**
     * Select the appropriate template using hierarchy
     * Enhanced to support intent-based and scope-based selection
     */
    selectTemplate(tenantId: string, options: TemplateSelectionOptions): Promise<Shard | null>;
    /**
     * Select template based on intent type and shard type
     * Maps insight types to template categories
     * Optionally uses query text for enhanced matching
     */
    private selectTemplateByIntent;
    /**
     * Use LLM to select the best template from candidates based on query understanding
     */
    private selectTemplateWithLLM;
    /**
     * Get template by ID
     */
    getTemplateById(templateId: string, tenantId: string): Promise<Shard | null>;
    /**
     * Get system template for a shard type
     */
    getSystemTemplateForType(shardTypeName: string, tenantId: string): Promise<Shard | null>;
    /**
     * List all templates available for a tenant
     */
    listTemplates(tenantId: string, options?: {
        category?: string;
        applicableShardType?: string;
        includeSystem?: boolean;
    }): Promise<Shard[]>;
    /**
     * Traverse a relationship and get related shards
     */
    private traverseRelationship;
    /**
     * Check if data matches a filter
     */
    private matchesFilter;
    /**
     * Select specific fields from data
     */
    private selectFields;
    /**
     * Estimate token count for data
     */
    private estimateTokens;
    /**
     * Perform RAG retrieval using vector search
     */
    private performRAGRetrieval;
    /**
     * Estimate tokens for RAG chunks
     */
    private estimateRAGTokens;
    /**
     * Truncate context to fit within token limit
     */
    private truncateContext;
    /**
     * Format context for output
     */
    private formatContext;
    /**
     * Format as minimal key-value pairs
     */
    private formatMinimal;
    /**
     * Format as structured sections
     */
    private formatStructured;
    /**
     * Format as natural language prose
     */
    private formatProse;
    /**
     * Format a key for display
     */
    private formatKey;
    /**
     * Format a value for display
     */
    private formatValue;
    /**
     * Cache assembled context
     */
    private cacheContext;
    /**
     * Get cached context
     */
    private getCachedContext;
    /**
     * Invalidate cached context
     */
    invalidateCache(shardId: string, tenantId: string): Promise<void>;
    /**
     * Get system templates
     */
    getSystemTemplates(): ContextTemplateStructuredData[];
}
//# sourceMappingURL=context-template.service.d.ts.map