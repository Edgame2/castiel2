import { ComputedFieldSource, FORMULA_FUNCTIONS, AggregationOperation, } from '../types/computed-field.types.js';
/**
 * Computed Field Service
 * Calculates derived fields based on shard data and relationships
 */
export class ComputedFieldService {
    monitoring;
    redis;
    shardRepository;
    shardEdgeRepository;
    // In-memory cache for short-lived computed values
    cache = new Map();
    constructor(options) {
        this.monitoring = options.monitoring;
        this.redis = options.redis;
        this.shardRepository = options.shardRepository;
        this.shardEdgeRepository = options.shardEdgeRepository;
    }
    /**
     * Compute all fields for a shard
     */
    async computeFieldsForShard(shard, shardType, options = {}) {
        const startTime = Date.now();
        const computedFields = this.getComputedFieldDefinitions(shardType);
        if (!computedFields || computedFields.length === 0) {
            return {
                shardId: shard.id,
                fields: [],
                computedAt: new Date(),
                totalTimeMs: 0,
            };
        }
        const context = {
            self: shard.structuredData || {},
            computed: {},
            now: new Date(),
            tenantId: shard.tenantId,
            userId: options.userId,
        };
        const results = [];
        // Compute fields in dependency order
        for (const fieldDef of computedFields) {
            try {
                // Check cache first
                if (options.useCache && fieldDef.cache) {
                    const cached = await this.getCachedValue(shard.id, fieldDef.name);
                    if (cached !== undefined) {
                        results.push({
                            name: fieldDef.name,
                            value: cached,
                            computedAt: new Date(),
                            cached: true,
                            source: fieldDef.source,
                        });
                        context.computed[fieldDef.name] = cached;
                        continue;
                    }
                }
                // Compute the field
                const value = await this.computeField(fieldDef, shard, context);
                // Store in context for subsequent fields
                context.computed[fieldDef.name] = value;
                // Cache if configured
                if (fieldDef.cache) {
                    await this.setCachedValue(shard.id, fieldDef.name, value, fieldDef.cacheTTLSeconds || 300);
                }
                results.push({
                    name: fieldDef.name,
                    value,
                    computedAt: new Date(),
                    cached: false,
                    source: fieldDef.source,
                });
            }
            catch (error) {
                results.push({
                    name: fieldDef.name,
                    value: fieldDef.defaultValue ?? null,
                    computedAt: new Date(),
                    cached: false,
                    source: fieldDef.source,
                    error: error.message,
                });
                this.monitoring.trackEvent('computedField.error', {
                    shardId: shard.id,
                    field: fieldDef.name,
                    error: error.message,
                });
            }
        }
        const totalTimeMs = Date.now() - startTime;
        this.monitoring.trackEvent('computedField.computed', {
            shardId: shard.id,
            fieldsComputed: results.length,
            cachedFields: results.filter(r => r.cached).length,
            totalTimeMs,
        });
        return {
            shardId: shard.id,
            fields: results,
            computedAt: new Date(),
            totalTimeMs,
        };
    }
    /**
     * Compute a single field
     */
    async computeField(fieldDef, shard, context) {
        switch (fieldDef.source) {
            case ComputedFieldSource.SELF:
                return this.computeSelfField(fieldDef.config, context);
            case ComputedFieldSource.RELATED:
                return this.computeRelatedField(fieldDef.config, shard);
            case ComputedFieldSource.LOOKUP:
                return this.computeLookupField(fieldDef.config, shard);
            case ComputedFieldSource.FORMULA:
                return this.computeFormulaField(fieldDef.config, context);
            default:
                throw new Error(`Unsupported computed field source: ${fieldDef.source}`);
        }
    }
    /**
     * Compute self-referencing field
     */
    computeSelfField(config, context) {
        return this.evaluateExpression(config.expression, context);
    }
    /**
     * Compute field from related shards
     */
    async computeRelatedField(config, shard) {
        // Get related shard IDs
        const edges = await this.shardEdgeRepository.list({
            filter: {
                ...(config.direction === 'outgoing' ? { sourceId: shard.id } : {}),
                ...(config.direction === 'incoming' ? { targetId: shard.id } : {}),
                ...(config.relationshipType !== '*' ? { relationshipType: config.relationshipType } : {}),
            },
            limit: config.limit || 1000,
        });
        // Get the related shard IDs
        const relatedIds = edges.edges.map(e => config.direction === 'outgoing' ? e.targetId : e.sourceId);
        if (relatedIds.length === 0) {
            return this.getDefaultForAggregation(config.aggregation);
        }
        // For COUNT, we don't need to fetch shards
        if (config.aggregation === AggregationOperation.COUNT) {
            return relatedIds.length;
        }
        if (config.aggregation === AggregationOperation.EXISTS) {
            return relatedIds.length > 0;
        }
        // Fetch related shards
        const relatedShards = await Promise.all(relatedIds.slice(0, config.limit || 100).map(id => this.shardRepository.findById(id, shard.tenantId)));
        const validShards = relatedShards.filter((s) => s !== null);
        // Apply filters
        let filteredShards = validShards;
        if (config.filter) {
            filteredShards = validShards.filter(s => {
                if (config.filter.shardTypeId && s.shardTypeId !== config.filter.shardTypeId) {
                    return false;
                }
                if (config.filter.status && !config.filter.status.includes(s.status)) {
                    return false;
                }
                if (config.filter.structuredDataFilter) {
                    for (const [key, value] of Object.entries(config.filter.structuredDataFilter)) {
                        if (s.structuredData?.[key] !== value) {
                            return false;
                        }
                    }
                }
                return true;
            });
        }
        // Perform aggregation
        return this.aggregate(filteredShards, config);
    }
    /**
     * Compute lookup field
     */
    async computeLookupField(config, shard) {
        const referenceId = shard.structuredData?.[config.referenceField];
        if (!referenceId) {
            return config.fallback ?? null;
        }
        const referencedShard = await this.shardRepository.findById(referenceId, shard.tenantId);
        if (!referencedShard) {
            return config.fallback ?? null;
        }
        return this.getNestedValue(referencedShard.structuredData || {}, config.lookupField) ?? config.fallback ?? null;
    }
    /**
     * Compute formula field
     */
    computeFormulaField(config, context) {
        // Build variable values
        const variables = {};
        for (const v of config.variables) {
            switch (v.source) {
                case 'field':
                    variables[v.name] = context.self[v.value];
                    break;
                case 'computed':
                    variables[v.name] = context.computed[v.value];
                    break;
                case 'constant':
                    variables[v.name] = v.value;
                    break;
            }
        }
        // Substitute variables in formula
        let formula = config.formula;
        for (const [name, value] of Object.entries(variables)) {
            formula = formula.replace(new RegExp(`\\$\\{${name}\\}`, 'g'), JSON.stringify(value));
        }
        return this.evaluateExpression(formula, context);
    }
    /**
     * Evaluate an expression with context
     */
    evaluateExpression(expression, context) {
        // Replace field references
        let expr = expression;
        // Replace ${fieldName} with actual values
        expr = expr.replace(/\$\{([^}]+)\}/g, (match, fieldPath) => {
            if (fieldPath.startsWith('computed.')) {
                const fieldName = fieldPath.replace('computed.', '');
                return JSON.stringify(context.computed[fieldName]);
            }
            const value = this.getNestedValue(context.self, fieldPath);
            return JSON.stringify(value);
        });
        // Create a safe evaluation context with allowed functions
        const safeContext = {
            ...FORMULA_FUNCTIONS,
            // Add context values
            now: context.now,
            tenantId: context.tenantId,
            userId: context.userId,
        };
        try {
            // Build function string with allowed operations
            const fn = new Function(...Object.keys(safeContext), `"use strict"; return (${expr});`);
            return fn(...Object.values(safeContext));
        }
        catch (error) {
            throw new Error(`Expression evaluation failed: ${error.message}`);
        }
    }
    /**
     * Perform aggregation on shards
     */
    aggregate(shards, config) {
        const values = config.aggregateField
            ? shards.map(s => s.structuredData?.[config.aggregateField]).filter(v => v !== undefined && v !== null)
            : shards;
        switch (config.aggregation) {
            case AggregationOperation.COUNT:
                return shards.length;
            case AggregationOperation.SUM:
                return values.reduce((sum, v) => sum + (Number(v) || 0), 0);
            case AggregationOperation.AVG:
                if (values.length === 0) {
                    return 0;
                }
                return values.reduce((sum, v) => sum + (Number(v) || 0), 0) / values.length;
            case AggregationOperation.MIN:
                if (values.length === 0) {
                    return null;
                }
                return Math.min(...values.map(v => Number(v)));
            case AggregationOperation.MAX:
                if (values.length === 0) {
                    return null;
                }
                return Math.max(...values.map(v => Number(v)));
            case AggregationOperation.FIRST:
                return values[0] ?? null;
            case AggregationOperation.LAST:
                return values[values.length - 1] ?? null;
            case AggregationOperation.CONCAT:
                return values.join(config.separator || ', ');
            case AggregationOperation.DISTINCT:
                return [...new Set(values)];
            case AggregationOperation.EXISTS:
                return shards.length > 0;
            default:
                return null;
        }
    }
    /**
     * Get default value for aggregation type
     */
    getDefaultForAggregation(aggregation) {
        switch (aggregation) {
            case AggregationOperation.COUNT:
            case AggregationOperation.SUM:
            case AggregationOperation.AVG:
                return 0;
            case AggregationOperation.CONCAT:
                return '';
            case AggregationOperation.DISTINCT:
                return [];
            case AggregationOperation.EXISTS:
                return false;
            default:
                return null;
        }
    }
    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /**
     * Get cached value
     */
    async getCachedValue(shardId, fieldName) {
        const key = `computed:${shardId}:${fieldName}`;
        // Check Redis first
        if (this.redis) {
            const cached = await this.redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        // Check in-memory cache
        const inMemory = this.cache.get(key);
        if (inMemory && inMemory.expiresAt > Date.now()) {
            return inMemory.value;
        }
        return undefined;
    }
    /**
     * Set cached value
     */
    async setCachedValue(shardId, fieldName, value, ttlSeconds) {
        const key = `computed:${shardId}:${fieldName}`;
        // Store in Redis
        if (this.redis) {
            await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        }
        // Store in memory cache
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }
    /**
     * Invalidate cached computed fields for a shard
     */
    async invalidateCache(shardId, fieldNames) {
        if (this.redis) {
            if (fieldNames) {
                const keys = fieldNames.map(f => `computed:${shardId}:${f}`);
                await this.redis.del(...keys);
            }
            else {
                const pattern = `computed:${shardId}:*`;
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }
        }
        // Clear in-memory cache
        for (const key of this.cache.keys()) {
            if (key.startsWith(`computed:${shardId}:`)) {
                if (!fieldNames || fieldNames.some(f => key.endsWith(`:${f}`))) {
                    this.cache.delete(key);
                }
            }
        }
    }
    /**
     * Get computed field definitions from ShardType
     */
    getComputedFieldDefinitions(shardType) {
        // Look for computedFields in the ShardType
        const computedFields = shardType.computedFields;
        return computedFields || [];
    }
    /**
     * Add computed fields to shard response
     */
    async enrichShardWithComputedFields(shard, shardType, options = {}) {
        const result = await this.computeFieldsForShard(shard, shardType, options);
        if (result.fields.length === 0) {
            return shard;
        }
        const computedFields = {};
        for (const field of result.fields) {
            if (!field.error) {
                computedFields[field.name] = field.value;
            }
        }
        return {
            ...shard,
            computedFields,
        };
    }
}
//# sourceMappingURL=computed-field.service.js.map