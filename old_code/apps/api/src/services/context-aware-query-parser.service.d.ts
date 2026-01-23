/**
 * Context-Aware Query Parser Service
 * Parses user queries to detect entity references and inject context
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { EntityResolutionService, ResolvedEntity } from './entity-resolution.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Parsed query with extracted entities
 */
export interface ParsedQuery {
    originalQuery: string;
    enhancedQuery: string;
    entities: ResolvedEntity[];
    entityContext: EntityContext[];
    hasEntityReferences: boolean;
}
/**
 * Entity context to inject into query
 */
export interface EntityContext {
    shardId: string;
    shardType: string;
    name: string;
    content: string;
    fields?: Record<string, any>;
}
/**
 * Context-Aware Query Parser Service
 */
export declare class ContextAwareQueryParserService {
    private entityResolutionService;
    private shardRepository;
    private monitoring;
    constructor(entityResolutionService: EntityResolutionService, shardRepository: ShardRepository, monitoring: IMonitoringProvider);
    /**
     * Parse query and extract entity references
     * Example: "summarize Project Proposal" → { entities: [{ name: "Project Proposal", type: "c_document" }] }
     */
    parseQuery(query: string, tenantId: string, projectId?: string): Promise<ParsedQuery>;
    /**
     * Detect entity references in query
     */
    private detectEntityReferences;
    /**
     * Extract content from shard based on type
     */
    private extractEntityContent;
    /**
     * Extract specific fields from query (e.g., "what's the amount from Project X")
     */
    private extractFields;
    /**
     * Inject entity context into query
     */
    private injectContext;
    /**
     * Determine query pattern type
     */
    private detectQueryPattern;
}
//# sourceMappingURL=context-aware-query-parser.service.d.ts.map