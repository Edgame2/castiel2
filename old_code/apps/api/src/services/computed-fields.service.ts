/**
 * Computed Fields Service
 * 
 * Handles computed/derived field calculations for shards
 */

import type { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import {
  ComputedFieldDefinition,
  ShardTypeComputedFields,
  ComputedFieldResult,
  ComputationContext,
  ComputeMethod,
  ComputeTrigger,
  FormulaConfig,
  TemplateConfig,
  AggregateConfig,
  LookupConfig,
  ConditionalConfig,
  CustomConfig,
  AggregateFunction,
  FORMULA_FUNCTIONS,
} from '../types/computed-fields.types.js';
import type { Shard, StructuredData } from '../types/shard.types.js';
import type { ShardRepository } from '@castiel/api-core';
import type { ShardRelationshipRepository } from '../repositories/shard-relationship.repository.js';

// Redis keys
const CONFIG_KEY_PREFIX = 'computed_fields:';
const CACHE_KEY_PREFIX = 'computed_cache:';

/**
 * Computed Fields Service
 */
export class ComputedFieldsService {
  private customFunctions: Map<string, (ctx: ComputationContext, params?: any) => any> = new Map();

  constructor(
    private readonly redis: Redis,
    private readonly shardRepository: ShardRepository,
    private readonly relationshipRepository?: ShardRelationshipRepository,
    private readonly server?: FastifyInstance
  ) {}

  // =====================================
  // CONFIGURATION MANAGEMENT
  // =====================================

  /**
   * Set computed fields configuration for a shard type
   */
  async setComputedFieldsConfig(
    tenantId: string,
    shardTypeId: string,
    fields: ComputedFieldDefinition[]
  ): Promise<ShardTypeComputedFields> {
    const config: ShardTypeComputedFields = {
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
  async getComputedFieldsConfig(
    tenantId: string,
    shardTypeId: string
  ): Promise<ShardTypeComputedFields | null> {
    const key = `${CONFIG_KEY_PREFIX}${tenantId}:${shardTypeId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete computed fields configuration
   */
  async deleteComputedFieldsConfig(tenantId: string, shardTypeId: string): Promise<boolean> {
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
  async computeFields(
    shard: Shard,
    trigger: ComputeTrigger,
    userId: string
  ): Promise<Map<string, ComputedFieldResult>> {
    const results = new Map<string, ComputedFieldResult>();

    const config = await this.getComputedFieldsConfig(shard.tenantId, shard.shardTypeId);
    if (!config || config.fields.length === 0) {
      return results;
    }

    const ctx: ComputationContext = {
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
      } catch (error: any) {
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
  private async computeField(
    field: ComputedFieldDefinition,
    ctx: ComputationContext
  ): Promise<any> {
    switch (field.method) {
      case ComputeMethod.FORMULA:
        return this.computeFormula(field.config as FormulaConfig, ctx);
      case ComputeMethod.TEMPLATE:
        return this.computeTemplate(field.config as TemplateConfig, ctx);
      case ComputeMethod.AGGREGATE:
        return this.computeAggregate(field.config as AggregateConfig, ctx);
      case ComputeMethod.LOOKUP:
        return this.computeLookup(field.config as LookupConfig, ctx);
      case ComputeMethod.CONDITIONAL:
        return this.computeConditional(field.config as ConditionalConfig, ctx);
      case ComputeMethod.CUSTOM:
        return this.computeCustom(field.config as CustomConfig, ctx);
      default:
        throw new Error(`Unknown compute method: ${field.method}`);
    }
  }

  /**
   * Compute formula expression
   */
  private computeFormula(config: FormulaConfig, ctx: ComputationContext): number {
    try {
      // Build safe expression context
      const safeContext: Record<string, any> = { ...FORMULA_FUNCTIONS };

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
    } catch (error) {
      return config.defaultValue ?? 0;
    }
  }

  /**
   * Compute template string
   */
  private computeTemplate(config: TemplateConfig, ctx: ComputationContext): string {
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
    } catch (error) {
      return config.fallback || '';
    }
  }

  /**
   * Compute aggregate from related shards
   */
  private async computeAggregate(config: AggregateConfig, ctx: ComputationContext): Promise<any> {
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
  private async computeLookup(config: LookupConfig, ctx: ComputationContext): Promise<any> {
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
    const matchingShard = shards.find(
      (s) => this.getNestedValue(s.structuredData, config.targetMatchField) === sourceValue
    );

    if (!matchingShard) {
      return config.defaultValue;
    }

    return this.getNestedValue(matchingShard.structuredData, config.targetReturnField) ?? config.defaultValue;
  }

  /**
   * Compute conditional logic
   */
  private computeConditional(config: ConditionalConfig, ctx: ComputationContext): any {
    for (const condition of config.conditions) {
      try {
        const result = this.evaluateExpression(condition.when, { ...FORMULA_FUNCTIONS, ...ctx.shard });
        if (result) {
          return condition.then;
        }
      } catch (error) {
        continue;
      }
    }
    return config.else;
  }

  /**
   * Compute using custom function
   */
  private async computeCustom(config: CustomConfig, ctx: ComputationContext): Promise<any> {
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
  registerCustomFunction(name: string, fn: (ctx: ComputationContext, params?: any) => any): void {
    this.customFunctions.set(name, fn);
  }

  /**
   * Evaluate a mathematical/logical expression safely
   */
  private evaluateExpression(expression: string, context: Record<string, any>): any {
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
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${expression.substring(0, 100)}`);
    }
  }

  /**
   * Validate expression is safe (basic check - not comprehensive)
   * Blocks function calls, require, import, eval, and other dangerous patterns
   */
  private isExpressionSafe(expression: string): boolean {
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
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (current[key] === undefined) {current[key] = {};}
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
  private async getCachedValue(
    tenantId: string,
    shardId: string,
    fieldPath: string
  ): Promise<any | null> {
    const key = `${CACHE_KEY_PREFIX}${tenantId}:${shardId}:${fieldPath}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Set cached computed value
   */
  private async setCachedValue(
    tenantId: string,
    shardId: string,
    fieldPath: string,
    value: any,
    ttl: number
  ): Promise<void> {
    const key = `${CACHE_KEY_PREFIX}${tenantId}:${shardId}:${fieldPath}`;
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  /**
   * Invalidate cache for a shard
   */
  async invalidateCache(tenantId: string, shardId: string, fieldPath?: string): Promise<void> {
    if (fieldPath) {
      const key = `${CACHE_KEY_PREFIX}${tenantId}:${shardId}:${fieldPath}`;
      await this.redis.del(key);
    } else {
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
  async applyComputedFields(
    shard: Shard,
    trigger: ComputeTrigger,
    userId: string
  ): Promise<StructuredData> {
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
  async getComputedFieldValues(
    shard: Shard,
    userId: string
  ): Promise<Record<string, ComputedFieldResult>> {
    const results = await this.computeFields(shard, ComputeTrigger.ON_DEMAND, userId);
    const output: Record<string, ComputedFieldResult> = {};

    for (const [fieldPath, result] of results) {
      output[fieldPath] = result;
    }

    return output;
  }
}

