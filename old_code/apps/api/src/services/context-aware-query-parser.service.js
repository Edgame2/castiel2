/**
 * Context-Aware Query Parser Service
 * Parses user queries to detect entity references and inject context
 */
/**
 * Context-Aware Query Parser Service
 */
export class ContextAwareQueryParserService {
    entityResolutionService;
    shardRepository;
    monitoring;
    constructor(entityResolutionService, shardRepository, monitoring) {
        this.entityResolutionService = entityResolutionService;
        this.shardRepository = shardRepository;
        this.monitoring = monitoring;
    }
    /**
     * Parse query and extract entity references
     * Example: "summarize Project Proposal" → { entities: [{ name: "Project Proposal", type: "c_document" }] }
     */
    async parseQuery(query, tenantId, projectId) {
        const startTime = Date.now();
        try {
            // 1. Detect entity mentions (natural language + @mentions)
            const detectedEntities = this.detectEntityReferences(query);
            if (detectedEntities.length === 0) {
                // No entities detected, return original query
                return {
                    originalQuery: query,
                    enhancedQuery: query,
                    entities: [],
                    entityContext: [],
                    hasEntityReferences: false,
                };
            }
            // 2. Resolve entity names to shardIds (with disambiguation if needed)
            const resolvedEntities = [];
            for (const detected of detectedEntities) {
                const resolved = await this.entityResolutionService.resolveEntity(tenantId, detected.name, {
                    projectId,
                    shardTypes: detected.types,
                    limit: 1, // For now, take the best match (disambiguation will be handled by UI)
                });
                if (resolved.length > 0) {
                    resolvedEntities.push(resolved[0]);
                }
            }
            if (resolvedEntities.length === 0) {
                // Entities detected but couldn't be resolved
                return {
                    originalQuery: query,
                    enhancedQuery: query,
                    entities: [],
                    entityContext: [],
                    hasEntityReferences: true, // Entities were detected but not resolved
                };
            }
            // 3. Fetch entity content from shards (respect ACL)
            const entityContext = [];
            for (const entity of resolvedEntities) {
                try {
                    const shard = await this.shardRepository.findById(entity.shardId, tenantId);
                    if (!shard) {
                        continue;
                    }
                    // Extract content based on shard type
                    const content = this.extractEntityContent(shard, query);
                    const fields = this.extractFields(shard, query);
                    entityContext.push({
                        shardId: entity.shardId,
                        shardType: entity.shardType,
                        name: entity.name,
                        content,
                        fields,
                    });
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        component: 'ContextAwareQueryParser',
                        operation: 'parseQuery',
                        tenantId,
                        shardId: entity.shardId,
                    });
                    // Continue with other entities
                }
            }
            // 4. Inject entity context into query
            const enhancedQuery = this.injectContext(query, entityContext);
            this.monitoring.trackDependency('query.parse.contextAware', 'ContextAwareQueryParser', 'parse', Date.now() - startTime, true);
            return {
                originalQuery: query,
                enhancedQuery,
                entities: resolvedEntities,
                entityContext,
                hasEntityReferences: true,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'ContextAwareQueryParser',
                operation: 'parseQuery',
                tenantId,
                query,
                projectId,
            });
            // Return original query on error
            return {
                originalQuery: query,
                enhancedQuery: query,
                entities: [],
                entityContext: [],
                hasEntityReferences: false,
            };
        }
    }
    /**
     * Detect entity references in query
     */
    detectEntityReferences(query) {
        const entities = [];
        // Pattern 1: @mention format - "@Project Proposal summarize"
        const mentionPattern = /@([A-Za-z0-9\s\-_]+)/g;
        let match;
        while ((match = mentionPattern.exec(query)) !== null) {
            entities.push({
                name: match[1].trim(),
            });
        }
        // Pattern 2: Natural language patterns
        // "summarize [entity name]"
        const summarizePattern = /summarize\s+([A-Za-z0-9\s\-_]+)/i;
        match = summarizePattern.exec(query);
        if (match) {
            entities.push({
                name: match[1].trim(),
                types: ['c_document'], // Summarize typically refers to documents
            });
        }
        // "what's in [entity name]" or "what's in Document X" or "what's in Note Y"
        const whatsInPattern = /what'?s?\s+in\s+([A-Za-z0-9\s\-_]+(?:\s+[A-Za-z0-9\s\-_]+)*)/i;
        match = whatsInPattern.exec(query);
        if (match && !entities.some(e => e.name.toLowerCase() === match[1].trim().toLowerCase())) {
            entities.push({
                name: match[1].trim(),
                types: ['c_document', 'c_note'], // "What's in" typically refers to documents or notes
            });
        }
        // "what's the [field] from [entity name]"
        const fieldPattern = /what'?s?\s+the\s+([A-Za-z0-9\s\-_]+)\s+from\s+([A-Za-z0-9\s\-_]+)/i;
        match = fieldPattern.exec(query);
        if (match && !entities.some(e => e.name.toLowerCase() === match[2].trim().toLowerCase())) {
            entities.push({
                name: match[2].trim(),
            });
        }
        // "[action] [entity name]" - generic action pattern
        // Enhanced to catch more patterns like "tell me about", "what is", "what are"
        const actionPattern = /^(analyze|review|explain|describe|show|get|find|search|tell\s+me\s+about|what\s+is|what\s+are)\s+([A-Za-z0-9\s\-_]+(?:\s+[A-Za-z0-9\s\-_]+)*)/i;
        match = actionPattern.exec(query);
        if (match && !entities.some(e => e.name.toLowerCase() === match[2].trim().toLowerCase())) {
            entities.push({
                name: match[2].trim(),
            });
        }
        // Remove duplicates
        const uniqueEntities = Array.from(new Map(entities.map(e => [e.name.toLowerCase(), e])).values());
        return uniqueEntities;
    }
    /**
     * Extract content from shard based on type
     */
    extractEntityContent(shard, query) {
        const data = shard.structuredData;
        // Try to extract relevant content based on query intent
        if (shard.shardTypeId === 'c_document') {
            // For documents, prefer content field
            if (data.content) {
                return String(data.content).substring(0, 2000); // Limit context size
            }
            if (data.text) {
                return String(data.text).substring(0, 2000);
            }
        }
        else if (shard.shardTypeId === 'c_opportunity') {
            // For opportunities, include key fields
            const parts = [];
            if (data.name) {
                parts.push(`Name: ${data.name}`);
            }
            if (data.description) {
                parts.push(`Description: ${data.description}`);
            }
            if (data.amount) {
                parts.push(`Amount: ${data.amount}`);
            }
            if (data.stage) {
                parts.push(`Stage: ${data.stage}`);
            }
            return parts.join('\n');
        }
        else if (shard.shardTypeId === 'c_note') {
            // For notes, include content
            if (data.content) {
                return String(data.content).substring(0, 2000);
            }
            if (data.text) {
                return String(data.text).substring(0, 2000);
            }
        }
        // Fallback to description or name
        const description = shard.structuredData?.description;
        if (description) {
            return description.substring(0, 1000);
        }
        const name = shard.structuredData?.name;
        if (name) {
            return name;
        }
        return '';
    }
    /**
     * Extract specific fields from query (e.g., "what's the amount from Project X")
     */
    extractFields(shard, query) {
        const data = shard.structuredData;
        const fieldPattern = /what'?s?\s+the\s+([A-Za-z0-9\s\-_]+)\s+from/i;
        const match = fieldPattern.exec(query);
        if (!match) {
            return undefined;
        }
        const fieldName = match[1].toLowerCase().trim();
        const fields = {};
        // Map common field names to structured data paths
        const fieldMappings = {
            amount: ['amount', 'value', 'price', 'cost'],
            stage: ['stage', 'status', 'phase'],
            description: ['description', 'summary', 'overview'],
            date: ['date', 'createdAt', 'updatedAt', 'dueDate'],
            customer: ['customer', 'client', 'company', 'contact'],
        };
        for (const [key, paths] of Object.entries(fieldMappings)) {
            if (fieldName.includes(key)) {
                for (const path of paths) {
                    if (data[path] !== undefined) {
                        fields[path] = data[path];
                        break;
                    }
                }
            }
        }
        return Object.keys(fields).length > 0 ? fields : undefined;
    }
    /**
     * Inject entity context into query
     */
    injectContext(query, entityContext) {
        if (entityContext.length === 0) {
            return query;
        }
        // Build context string
        const contextParts = [];
        for (const entity of entityContext) {
            let contextEntry = `\n\n[Context from ${entity.name} (${entity.shardType}):\n`;
            contextEntry += entity.content;
            if (entity.fields) {
                contextEntry += `\n\nSpecific fields: ${JSON.stringify(entity.fields)}`;
            }
            contextEntry += '\n]';
            contextParts.push(contextEntry);
        }
        // Append context to query
        const enhancedQuery = query + '\n\n' + contextParts.join('\n');
        return enhancedQuery;
    }
    /**
     * Determine query pattern type
     */
    detectQueryPattern(query) {
        if (/^summarize\s+/i.test(query)) {
            return 'summarize';
        }
        if (/what'?s?\s+the\s+.+\s+from/i.test(query)) {
            return 'field_extraction';
        }
        if (/^@/.test(query)) {
            return 'mention';
        }
        if (/^(analyze|review|explain|describe|show|get|find|search)\s+/i.test(query)) {
            return 'action';
        }
        return 'unknown';
    }
}
//# sourceMappingURL=context-aware-query-parser.service.js.map