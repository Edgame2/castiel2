/**
 * Computed Fields Service
 *
 * Handles computed/derived field calculations for shards
 */
import { ComputeMethod, ComputeTrigger, AggregateFunction, FORMULA_FUNCTIONS, } from '../types/computed-fields.types.js';
// Redis keys
const CONFIG_KEY_PREFIX = 'computed_fields:';
const CACHE_KEY_PREFIX = 'computed_cache:';
/**
 * Computed Fields Service
 */
export class ComputedFieldsService {
    redis;
    shardRepository;
    relationshipRepository;
    server;
    customFunctions = new Map();
    constructor(redis, shardRepository, relationshipRepository, server) {
        this.redis = redis;
        this.shardRepository = shardRepository;
        this.relationshipRepository = relationshipRepository;
        this.server = server;
    }
    // =====================================
    // CONFIGURATION MANAGEMENT
    // =====================================
    /**
     * Set computed fields configuration for a shard type
     */
    async setComputedFieldsConfig(tenantId, shardTypeId, fields) {
        const config = {
            shardTypeId,
            tenantId,
            fields,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const key = `${CONFIG_KEY_PREFIX}${tenantId}:${shardTypeId}`;
        await this.redis.set(key, JSON.stringify(config));
        this.server?.log.info({ shardTypeId, fieldCount: fields.length }, 'Computed fields config set');
        return config;
    }
    /**
     * Get computed fields configuration
     */
    async getComputedFieldsConfig(tenantId, shardTypeId) {
        const key = `${CONFIG_KEY_PREFIX}${tenantId}:${shardTypeId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Delete computed fields configuration
     */
    async deleteComputedFieldsConfig(tenantId, shardTypeId) {
        const key = `${CONFIG_KEY_PREFIX}${tenantId}:${shardTypeId}`;
        const deleted = await this.redis.del(key);
        return deleted > 0;
    }
    // =====================================
    // COMPUTATION
    // =====================================
    /**
     * Compute all fields for a shard
     */
    async computeFields(shard, trigger, userId) {
        const results = new Map();
        const config = await this.getComputedFieldsConfig(shard.tenantId, shard.shardTypeId);
        if (!config || config.fields.length === 0) {
            return results;
        }
        const ctx = {
            shard: { ...shard.structuredData },
            tenantId: shard.tenantId,
            userId,
        };
        for (const field of config.fields) {
            // Check if this field should be computed on this trigger
            if (field.trigger !== trigger && trigger !== ComputeTrigger.ON_DEMAND) {
                continue;
            }
            try {
                // Check cache first
                if (field.cache) {
                    const cached = await this.getCachedValue(shard.tenantId, shard.id, field.fieldPath);
                    if (cached !== null) {
                        results.set(field.fieldPath, {
                            fieldPath: field.fieldPath,
                            value: cached,
                            computedAt: new Date(),
                            fromCache: true,
                        });
                        continue;
                    }
                }
                // Compute the value
                const value = await this.computeField(field, ctx);
                // Cache if configured
                if (field.cache && field.cacheTTL) {
                    await this.setCachedValue(shard.tenantId, shard.id, field.fieldPath, value, field.cacheTTL);
                }
                results.set(field.fieldPath, {
                    fieldPath: field.fieldPath,
                    value,
                    computedAt: new Date(),
                    fromCache: false,
                });
            }
            catch (error) {
                results.set(field.fieldPath, {
                    fieldPath: field.fieldPath,
                    value: null,
                    computedAt: new Date(),
                    fromCache: false,
                    error: error.message,
                });
                this.server?.log.warn({ field: field.fieldPath, error: error.message }, 'Computed field error');
            }
        }
        return results;
    }
    /**
     * Compute a single field
     */
    async computeField(field, ctx) {
        switch (field.method) {
            case ComputeMethod.FORMULA:
                return this.computeFormula(field.config, ctx);
            case ComputeMethod.TEMPLATE:
                return this.computeTemplate(field.config, ctx);
            case ComputeMethod.AGGREGATE:
                return this.computeAggregate(field.config, ctx);
            case ComputeMethod.LOOKUP:
                return this.computeLookup(field.config, ctx);
            case ComputeMethod.CONDITIONAL:
                return this.computeConditional(field.config, ctx);
            case ComputeMethod.CUSTOM:
                return this.computeCustom(field.config, ctx);
            default:
                throw new Error(`Unknown compute method: ${field.method}`);
        }
    }
    /**
     * Compute formula expression
     */
    computeFormula(config, ctx) {
        try {
            // Build safe expression context
            const safeContext = { ...FORMULA_FUNCTIONS };
            // Add shard fields to context
            for (const [key, value] of Object.entries(ctx.shard)) {
                safeContext[key] = value;
            }
            // Parse and evaluate the expression safely
            const result = this.evaluateExpression(config.expression, safeContext);
            if (typeof result === 'number' && config.precision !== undefined) {
                return Number(result.toFixed(config.precision));
            }
            return result ?? config.defaultValue ?? 0;
        }
        catch (error) {
            return config.defaultValue ?? 0;
        }
    }
    /**
     * Compute template string
     */
    computeTemplate(config, ctx) {
        try {
            let result = config.template;
            // Replace {{fieldName}} placeholders
            const matches = result.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                for (const match of matches) {
                    const fieldPath = match.slice(2, -2).trim();
                    const value = this.getNestedValue(ctx.shard, fieldPath);
                    result = result.replace(match, value !== undefined ? String(value) : '');
                }
            }
            return result.trim() || config.fallback || '';
        }
        catch (error) {
            return config.fallback || '';
        }
    }
    /**
     * Compute aggregate from related shards
     */
    async computeAggregate(config, ctx) {
        if (!this.relationshipRepository || !ctx.relatedShards) {
            return config.defaultValue;
        }
        // Get related shards of the specified relationship type
        const relatedShards = ctx.relatedShards[config.relationshipType] || [];
        // Extract values from target field
        const values = relatedShards
            .map((s) => this.getNestedValue(s.structuredData, config.targetField))
            .filter((v) => v !== undefined && v !== null);
        if (values.length === 0) {
            return config.defaultValue;
        }
        // Apply aggregate function
        switch (config.function) {
            case AggregateFunction.COUNT:
                return values.length;
            case AggregateFunction.SUM:
                return values.reduce((a, b) => Number(a) + Number(b), 0);
            case AggregateFunction.AVG:
                return values.reduce((a, b) => Number(a) + Number(b), 0) / values.length;
            case AggregateFunction.MIN:
                return Math.min(...values.map(Number));
            case AggregateFunction.MAX:
                return Math.max(...values.map(Number));
            case AggregateFunction.CONCAT:
                return values.join(', ');
            case AggregateFunction.FIRST:
                return values[0];
            case AggregateFunction.LAST:
                return values[values.length - 1];
            default:
                return config.defaultValue;
        }
    }
    /**
     * Compute lookup from another shard
     */
    async computeLookup(config, ctx) {
        const sourceValue = this.getNestedValue(ctx.shard, config.sourceField);
        if (!sourceValue) {
            return config.defaultValue;
        }
        // Search for matching shard
        const { shards } = await this.shardRepository.list({
            filter: {
                tenantId: ctx.tenantId,
                shardTypeId: config.targetShardTypeId,
            },
            limit: 1,
        });
        // Find matching shard (simplified - in production use indexed query)
        const matchingShard = shards.find((s) => this.getNestedValue(s.structuredData, config.targetMatchField) === sourceValue);
        if (!matchingShard) {
            return config.defaultValue;
        }
        return this.getNestedValue(matchingShard.structuredData, config.targetReturnField) ?? config.defaultValue;
    }
    /**
     * Compute conditional logic
     */
    computeConditional(config, ctx) {
        for (const condition of config.conditions) {
            try {
                const result = this.evaluateExpression(condition.when, { ...FORMULA_FUNCTIONS, ...ctx.shard });
                if (result) {
                    return condition.then;
                }
            }
            catch (error) {
                continue;
            }
        }
        return config.else;
    }
    /**
     * Compute using custom function
     */
    async computeCustom(config, ctx) {
        const fn = this.customFunctions.get(config.functionName);
        if (!fn) {
            throw new Error(`Custom function not found: ${config.functionName}`);
        }
        return fn(ctx, config.params);
    }
    // =====================================
    // HELPER METHODS
    // =====================================
    /**
     * Register a custom computation function
     */
    registerCustomFunction(name, fn) {
        this.customFunctions.set(name, fn);
    }
    /**
     * Evaluate a mathematical/logical expression safely
     */
    evaluateExpression(expression, context) {
        // Validate expression is safe (no function calls, no dangerous keywords)
        if (!this.isExpressionSafe(expression)) {
            throw new Error(`Unsafe expression detected: ${expression.substring(0, 100)}`);
        }
        // Limit expression length to prevent DoS
        if (expression.length > 1000) {
            throw new Error(`Expression too long: ${expression.length} characters`);
        }
        // Create a safe evaluation function using Function constructor
        // This is more controlled than eval()
        const keys = Object.keys(context);
        const values = Object.values(context);
        try {
            // Replace common operators
            const safeExpression = expression
                .replace(/\band\b/gi, '&&')
                .replace(/\bor\b/gi, '||')
                .replace(/\bnot\b/gi, '!')
                .replace(/\beq\b/gi, '===')
                .replace(/\bne\b/gi, '!==')
                .replace(/\bgt\b/gi, '>')
                .replace(/\blt\b/gi, '<')
                .replace(/\bge\b/gi, '>=')
                .replace(/\ble\b/gi, '<=');
            // Create function with context variables as parameters
            const fn = new Function(...keys, `return (${safeExpression})`);
            return fn(...values);
        }
        catch (error) {
            throw new Error(`Expression evaluation failed: ${expression.substring(0, 100)}`);
        }
    }
    /**
     * Validate expression is safe (basic check - not comprehensive)
     * Blocks function calls, require, import, eval, and other dangerous patterns
     */
    isExpressionSafe(expression) {
        if (!expression || typeof expression !== 'string') {
            return false;
        }
        // Block dangerous patterns
        const dangerousPatterns = [
            /require\s*\(/i,
            /import\s+/i,
            /eval\s*\(/i,
            /Function\s*\(/i,
            /new\s+Function/i,
            /\.constructor/i,
            /__proto__/i,
            /prototype/i,
            /process\./i,
            /global\./i,
            /window\./i,
            /document\./i,
            /XMLHttpRequest/i,
            /fetch\s*\(/i,
            /setTimeout\s*\(/i,
            /setInterval\s*\(/i,
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(expression)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (current[key] === undefined) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    // =====================================
    // CACHING
    // =====================================
    /**
     * Get cached computed value
     */
    async getCachedValue(tenantId, shardId, fieldPath) {
        const key = `${CACHE_KEY_PREFIX}${tenantId}:${shardId}:${fieldPath}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Set cached computed value
     */
    async setCachedValue(tenantId, shardId, fieldPath, value, ttl) {
        const key = `${CACHE_KEY_PREFIX}${tenantId}:${shardId}:${fieldPath}`;
        await this.redis.setex(key, ttl, JSON.stringify(value));
    }
    /**
     * Invalidate cache for a shard
     */
    async invalidateCache(tenantId, shardId, fieldPath) {
        if (fieldPath) {
            const key = `${CACHE_KEY_PREFIX}${tenantId}:${shardId}:${fieldPath}`;
            await this.redis.del(key);
        }
        else {
            // Invalidate all computed fields for this shard
            const pattern = `${CACHE_KEY_PREFIX}${tenantId}:${shardId}:*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
    }
    // =====================================
    // APPLICATION TO SHARDS
    // =====================================
    /**
     * Apply computed fields to shard data
     */
    async applyComputedFields(shard, trigger, userId) {
        const results = await this.computeFields(shard, trigger, userId);
        const enhancedData = { ...shard.structuredData };
        for (const [fieldPath, result] of results) {
            if (!result.error && result.value !== null) {
                this.setNestedValue(enhancedData, fieldPath, result.value);
            }
        }
        return enhancedData;
    }
    /**
     * Get computed field values as a separate object (not merged into structuredData)
     */
    async getComputedFieldValues(shard, userId) {
        const results = await this.computeFields(shard, ComputeTrigger.ON_DEMAND, userId);
        const output = {};
        for (const [fieldPath, result] of results) {
            output[fieldPath] = result;
        }
        return output;
    }
}
//# sourceMappingURL=computed-fields.service.js.map