/**
 * Computed Fields Types
 * 
 * Types for computed/derived fields that are calculated from other field values
 */

/**
 * When to compute the field
 */
export enum ComputeTrigger {
  ON_READ = 'on_read',       // Compute when reading the shard
  ON_WRITE = 'on_write',     // Compute when creating/updating
  ON_DEMAND = 'on_demand',   // Only compute when explicitly requested
  SCHEDULED = 'scheduled',   // Compute on a schedule
}

/**
 * Computation method
 */
export enum ComputeMethod {
  FORMULA = 'formula',       // Math formula (e.g., "price * quantity")
  TEMPLATE = 'template',     // String template (e.g., "{{firstName}} {{lastName}}")
  AGGREGATE = 'aggregate',   // Aggregate from related shards
  LOOKUP = 'lookup',         // Lookup from another shard
  CONDITIONAL = 'conditional', // If/then/else logic
  CUSTOM = 'custom',         // Custom function
}

/**
 * Aggregate function type
 */
export enum AggregateFunction {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  CONCAT = 'concat',
  FIRST = 'first',
  LAST = 'last',
}

/**
 * Computed field definition
 */
export interface ComputedFieldDefinition {
  fieldPath: string;          // Where to store the computed value
  displayName: string;
  description?: string;
  
  // Output type
  outputType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  
  // Computation settings
  method: ComputeMethod;
  trigger: ComputeTrigger;
  
  // Caching
  cache: boolean;
  cacheTTL?: number;          // Cache duration in seconds
  
  // Dependencies (fields that trigger recomputation)
  dependencies: string[];
  
  // Method-specific configuration
  config: ComputedFieldConfig;
}

/**
 * Union type for all compute configurations
 */
export type ComputedFieldConfig =
  | FormulaConfig
  | TemplateConfig
  | AggregateConfig
  | LookupConfig
  | ConditionalConfig
  | CustomConfig;

/**
 * Formula computation config
 */
export interface FormulaConfig {
  type: 'formula';
  expression: string;         // Math expression: "price * quantity * (1 - discount)"
  precision?: number;         // Decimal places for numeric results
  defaultValue?: number;
}

/**
 * Template computation config
 */
export interface TemplateConfig {
  type: 'template';
  template: string;           // String template: "{{firstName}} {{lastName}}"
  fallback?: string;          // Value if template fails
}

/**
 * Aggregate computation config
 */
export interface AggregateConfig {
  type: 'aggregate';
  relationshipType: string;   // Type of relationship to follow
  targetField: string;        // Field to aggregate from related shards
  function: AggregateFunction;
  filter?: Record<string, any>; // Filter for related shards
  defaultValue?: any;
}

/**
 * Lookup computation config
 */
export interface LookupConfig {
  type: 'lookup';
  sourceField: string;        // Field in current shard to match
  targetShardTypeId: string;  // ShardType to look up in
  targetMatchField: string;   // Field to match against
  targetReturnField: string;  // Field to return
  defaultValue?: any;
}

/**
 * Conditional computation config
 */
export interface ConditionalConfig {
  type: 'conditional';
  conditions: Array<{
    when: string;             // Condition expression
    then: any;                // Value if true
  }>;
  else: any;                  // Default value
}

/**
 * Custom function config
 */
export interface CustomConfig {
  type: 'custom';
  functionName: string;       // Name of registered function
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
export const FORMULA_FUNCTIONS = {
  // Math
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  sqrt: Math.sqrt,
  
  // String
  upper: (s: string) => String(s).toUpperCase(),
  lower: (s: string) => String(s).toLowerCase(),
  trim: (s: string) => String(s).trim(),
  len: (s: string) => String(s).length,
  concat: (...args: any[]) => args.join(''),
  substr: (s: string, start: number, len?: number) => String(s).substr(start, len),
  
  // Date
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().split('T')[0],
  year: (d: string) => new Date(d).getFullYear(),
  month: (d: string) => new Date(d).getMonth() + 1,
  day: (d: string) => new Date(d).getDate(),
  daysBetween: (d1: string, d2: string) => {
    const diff = new Date(d2).getTime() - new Date(d1).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },
  
  // Array
  count: (arr: any[]) => Array.isArray(arr) ? arr.length : 0,
  sum: (arr: number[]) => Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0,
  avg: (arr: number[]) => {
    if (!Array.isArray(arr) || arr.length === 0) {return 0;}
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },
  first: (arr: any[]) => Array.isArray(arr) && arr.length > 0 ? arr[0] : null,
  last: (arr: any[]) => Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null,
  join: (arr: any[], sep = ', ') => Array.isArray(arr) ? arr.join(sep) : '',
  
  // Conditional
  if: (condition: boolean, ifTrue: any, ifFalse: any) => condition ? ifTrue : ifFalse,
  coalesce: (...args: any[]) => args.find((a) => a !== null && a !== undefined),
  
  // Type conversion
  num: (v: any) => Number(v) || 0,
  str: (v: any) => String(v),
  bool: (v: any) => Boolean(v),
};

