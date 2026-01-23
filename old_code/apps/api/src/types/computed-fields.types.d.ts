/**
 * Computed Fields Types
 *
 * Types for computed/derived fields that are calculated from other field values
 */
/**
 * When to compute the field
 */
export declare enum ComputeTrigger {
    ON_READ = "on_read",// Compute when reading the shard
    ON_WRITE = "on_write",// Compute when creating/updating
    ON_DEMAND = "on_demand",// Only compute when explicitly requested
    SCHEDULED = "scheduled"
}
/**
 * Computation method
 */
export declare enum ComputeMethod {
    FORMULA = "formula",// Math formula (e.g., "price * quantity")
    TEMPLATE = "template",// String template (e.g., "{{firstName}} {{lastName}}")
    AGGREGATE = "aggregate",// Aggregate from related shards
    LOOKUP = "lookup",// Lookup from another shard
    CONDITIONAL = "conditional",// If/then/else logic
    CUSTOM = "custom"
}
/**
 * Aggregate function type
 */
export declare enum AggregateFunction {
    COUNT = "count",
    SUM = "sum",
    AVG = "avg",
    MIN = "min",
    MAX = "max",
    CONCAT = "concat",
    FIRST = "first",
    LAST = "last"
}
/**
 * Computed field definition
 */
export interface ComputedFieldDefinition {
    fieldPath: string;
    displayName: string;
    description?: string;
    outputType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    method: ComputeMethod;
    trigger: ComputeTrigger;
    cache: boolean;
    cacheTTL?: number;
    dependencies: string[];
    config: ComputedFieldConfig;
}
/**
 * Union type for all compute configurations
 */
export type ComputedFieldConfig = FormulaConfig | TemplateConfig | AggregateConfig | LookupConfig | ConditionalConfig | CustomConfig;
/**
 * Formula computation config
 */
export interface FormulaConfig {
    type: 'formula';
    expression: string;
    precision?: number;
    defaultValue?: number;
}
/**
 * Template computation config
 */
export interface TemplateConfig {
    type: 'template';
    template: string;
    fallback?: string;
}
/**
 * Aggregate computation config
 */
export interface AggregateConfig {
    type: 'aggregate';
    relationshipType: string;
    targetField: string;
    function: AggregateFunction;
    filter?: Record<string, any>;
    defaultValue?: any;
}
/**
 * Lookup computation config
 */
export interface LookupConfig {
    type: 'lookup';
    sourceField: string;
    targetShardTypeId: string;
    targetMatchField: string;
    targetReturnField: string;
    defaultValue?: any;
}
/**
 * Conditional computation config
 */
export interface ConditionalConfig {
    type: 'conditional';
    conditions: Array<{
        when: string;
        then: any;
    }>;
    else: any;
}
/**
 * Custom function config
 */
export interface CustomConfig {
    type: 'custom';
    functionName: string;
    params?: Record<string, any>;
}
/**
 * ShardType computed fields configuration
 */
export interface ShardTypeComputedFields {
    shardTypeId: string;
    tenantId: string;
    fields: ComputedFieldDefinition[];
    createdAt: Date;
    updatedAt?: Date;
}
/**
 * Computed field result
 */
export interface ComputedFieldResult {
    fieldPath: string;
    value: any;
    computedAt: Date;
    fromCache: boolean;
    error?: string;
}
/**
 * Computation context
 */
export interface ComputationContext {
    shard: Record<string, any>;
    tenantId: string;
    userId: string;
    relatedShards?: Record<string, any[]>;
}
/**
 * Built-in formula functions available in expressions
 */
export declare const FORMULA_FUNCTIONS: {
    abs: (x: number) => number;
    ceil: (x: number) => number;
    floor: (x: number) => number;
    round: (x: number) => number;
    max: (...values: number[]) => number;
    min: (...values: number[]) => number;
    pow: (x: number, y: number) => number;
    sqrt: (x: number) => number;
    upper: (s: string) => string;
    lower: (s: string) => string;
    trim: (s: string) => string;
    len: (s: string) => number;
    concat: (...args: any[]) => string;
    substr: (s: string, start: number, len?: number) => string;
    now: () => string;
    today: () => string;
    year: (d: string) => number;
    month: (d: string) => number;
    day: (d: string) => number;
    daysBetween: (d1: string, d2: string) => number;
    count: (arr: any[]) => number;
    sum: (arr: number[]) => number;
    avg: (arr: number[]) => number;
    first: (arr: any[]) => any;
    last: (arr: any[]) => any;
    join: (arr: any[], sep?: string) => string;
    if: (condition: boolean, ifTrue: any, ifFalse: any) => any;
    coalesce: (...args: any[]) => any;
    num: (v: any) => number;
    str: (v: any) => string;
    bool: (v: any) => boolean;
};
//# sourceMappingURL=computed-fields.types.d.ts.map