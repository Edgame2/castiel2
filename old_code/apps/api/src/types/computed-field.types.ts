/**
 * Computed/Derived Field Types
 * Auto-calculated fields based on other data
 */

/**
 * Computed field data source
 */
export enum ComputedFieldSource {
  /** Value from the shard itself */
  SELF = 'self',
  /** Aggregation across related shards */
  RELATED = 'related',
  /** Value from a lookup/reference */
  LOOKUP = 'lookup',
  /** Combined from multiple sources */
  FORMULA = 'formula',
  /** From external API */
  EXTERNAL = 'external',
}

/**
 * Aggregation operations for related shards
 */
export enum AggregationOperation {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  FIRST = 'first',
  LAST = 'last',
  CONCAT = 'concat',
  DISTINCT = 'distinct',
  EXISTS = 'exists',
}

/**
 * Data type for computed field output
 */
export enum ComputedFieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Computed field definition
 */
export interface ComputedFieldDefinition {
  /** Field name (unique within ShardType) */
  name: string;
  /** Display label */
  label: string;
  /** Description of what this field computes */
  description?: string;
  /** Output data type */
  type: ComputedFieldType;
  /** Data source type */
  source: ComputedFieldSource;
  /** Source-specific configuration */
  config: SelfFieldConfig | RelatedFieldConfig | LookupFieldConfig | FormulaFieldConfig | ExternalFieldConfig;
  /** Default value if computation fails */
  defaultValue?: any;
  /** Whether to cache the computed value */
  cache?: boolean;
  /** Cache TTL in seconds */
  cacheTTLSeconds?: number;
  /** Format string for display (e.g., currency, percentage) */
  format?: string;
  /** Include in AI context */
  includeInAI?: boolean;
  /** Include in search index */
  includeInSearch?: boolean;
}

/**
 * Self field config - derives from fields on the same shard
 */
export interface SelfFieldConfig {
  type: 'self';
  /** Expression to compute (supports field references, math, string ops) */
  expression: string;
  /** Field dependencies (for cache invalidation) */
  dependsOn: string[];
}

/**
 * Related field config - aggregates from related shards
 */
export interface RelatedFieldConfig {
  type: 'related';
  /** Relationship type to traverse */
  relationshipType: string;
  /** Direction: outgoing or incoming relationships */
  direction: 'outgoing' | 'incoming' | 'both';
  /** Filter for related shards */
  filter?: {
    shardTypeId?: string;
    status?: string[];
    structuredDataFilter?: Record<string, any>;
  };
  /** Aggregation operation */
  aggregation: AggregationOperation;
  /** Field to aggregate (required for sum, avg, min, max) */
  aggregateField?: string;
  /** Separator for concat operations */
  separator?: string;
  /** Limit for results */
  limit?: number;
}

/**
 * Lookup field config - gets value from a referenced shard
 */
export interface LookupFieldConfig {
  type: 'lookup';
  /** Field containing the reference (shardId) */
  referenceField: string;
  /** Field to retrieve from the referenced shard */
  lookupField: string;
  /** Fallback value if lookup fails */
  fallback?: any;
}

/**
 * Formula field config - combines multiple computed sources
 */
export interface FormulaFieldConfig {
  type: 'formula';
  /** 
   * Formula expression
   * Supports:
   * - Field references: ${fieldName} or ${computed.fieldName}
   * - Math: +, -, *, /, %, (, )
   * - Functions: round(), floor(), ceil(), abs(), min(), max()
   * - String: concat(), upper(), lower(), trim(), substring()
   * - Date: now(), daysAgo(), daysBetween(), formatDate()
   * - Conditional: if(condition, trueValue, falseValue)
   */
  formula: string;
  /** Variables used in formula */
  variables: Array<{
    name: string;
    source: 'field' | 'computed' | 'constant';
    value: string | number;
  }>;
}

/**
 * External field config - fetches from external API
 */
export interface ExternalFieldConfig {
  type: 'external';
  /** API endpoint template (supports field substitution) */
  endpoint: string;
  /** HTTP method */
  method: 'GET' | 'POST';
  /** Headers template */
  headers?: Record<string, string>;
  /** Body template for POST */
  body?: string;
  /** JSONPath to extract value from response */
  responsePath: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Required for security (only allowlisted domains) */
  allowedDomains: string[];
}

/**
 * Computed field result
 */
export interface ComputedFieldResult {
  name: string;
  value: any;
  computedAt: Date;
  cached: boolean;
  source: ComputedFieldSource;
  error?: string;
}

/**
 * Computed fields for a shard
 */
export interface ComputedFieldsResult {
  shardId: string;
  fields: ComputedFieldResult[];
  computedAt: Date;
  totalTimeMs: number;
}

/**
 * Expression evaluation context
 */
export interface ExpressionContext {
  /** Current shard's structured data */
  self: Record<string, any>;
  /** Previously computed fields */
  computed: Record<string, any>;
  /** Current date/time */
  now: Date;
  /** Tenant ID for lookups */
  tenantId: string;
  /** User ID for personalization */
  userId?: string;
}

/**
 * Built-in formula functions
 */
export const FORMULA_FUNCTIONS = {
  // Math functions
  round: (value: number, decimals = 0) => Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals),
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  min: (...args: number[]) => Math.min(...args),
  max: (...args: number[]) => Math.max(...args),
  pow: Math.pow,
  sqrt: Math.sqrt,
  
  // String functions
  concat: (...args: string[]) => args.join(''),
  upper: (s: string) => String(s).toUpperCase(),
  lower: (s: string) => String(s).toLowerCase(),
  trim: (s: string) => String(s).trim(),
  substring: (s: string, start: number, end?: number) => {
    const str = String(s ?? '');
    const startIdx = Math.max(0, Math.min(start, str.length));
    const endIdx = end !== undefined ? Math.max(startIdx, Math.min(end, str.length)) : str.length;
    return str.substring(startIdx, endIdx);
  },
  length: (s: string | any[]) => (Array.isArray(s) ? s : String(s)).length,
  replace: (s: string, search: string, replace: string) => {
    try {
      // Escape special regex characters to prevent ReDoS
      const escapedSearch = String(search ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return String(s ?? '').replace(new RegExp(escapedSearch, 'g'), String(replace ?? ''));
    } catch (error) {
      // If regex construction fails, fall back to simple string replacement
      return String(s ?? '').split(String(search ?? '')).join(String(replace ?? ''));
    }
  },
  
  // Date functions
  now: () => new Date(),
  daysAgo: (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },
  daysBetween: (date1: Date, date2: Date) => {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  },
  formatDate: (date: Date, format: string) => {
    const d = new Date(date);
    return format
      .replace('YYYY', d.getFullYear().toString())
      .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(d.getDate()).padStart(2, '0'));
  },
  addDays: (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },
  
  // Conditional functions
  if: (condition: boolean, trueValue: any, falseValue: any) => condition ? trueValue : falseValue,
  coalesce: (...args: any[]) => args.find(a => a !== null && a !== undefined),
  default: (value: any, defaultValue: any) => value ?? defaultValue,
  
  // Array functions
  first: (arr: any[]) => arr?.[0],
  last: (arr: any[]) => arr?.[arr?.length - 1],
  sum: (arr: number[]) => arr?.reduce((a, b) => a + b, 0) ?? 0,
  avg: (arr: number[]) => arr?.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
  count: (arr: any[]) => arr?.length ?? 0,
  join: (arr: any[], sep = ', ') => arr?.join(sep) ?? '',
  includes: (arr: any[], value: any) => arr?.includes(value) ?? false,
  filter: (arr: any[], field: string, value: any) => arr?.filter(item => item?.[field] === value) ?? [],
  
  // Type conversion
  toNumber: (value: any) => Number(value) || 0,
  toString: (value: any) => String(value ?? ''),
  toBoolean: (value: any) => Boolean(value),
  toDate: (value: any) => new Date(value),
};

/**
 * Predefined computed field templates
 */
export const COMPUTED_FIELD_TEMPLATES = {
  /** Age in days since creation */
  ageInDays: {
    name: 'ageInDays',
    label: 'Age (Days)',
    type: ComputedFieldType.NUMBER,
    source: ComputedFieldSource.FORMULA,
    config: {
      type: 'formula' as const,
      formula: 'daysBetween(${createdAt}, now())',
      variables: [
        { name: 'createdAt', source: 'field' as const, value: 'createdAt' },
      ],
    },
  },
  
  /** Days since last update */
  daysSinceUpdate: {
    name: 'daysSinceUpdate',
    label: 'Days Since Update',
    type: ComputedFieldType.NUMBER,
    source: ComputedFieldSource.FORMULA,
    config: {
      type: 'formula' as const,
      formula: 'daysBetween(${updatedAt}, now())',
      variables: [
        { name: 'updatedAt', source: 'field' as const, value: 'updatedAt' },
      ],
    },
  },
  
  /** Count of related items */
  relatedCount: {
    name: 'relatedCount',
    label: 'Related Items',
    type: ComputedFieldType.NUMBER,
    source: ComputedFieldSource.RELATED,
    config: {
      type: 'related' as const,
      relationshipType: '*',
      direction: 'both' as const,
      aggregation: AggregationOperation.COUNT,
    },
  },
  
  /** Full name from first + last */
  fullName: {
    name: 'fullName',
    label: 'Full Name',
    type: ComputedFieldType.STRING,
    source: ComputedFieldSource.SELF,
    config: {
      type: 'self' as const,
      expression: 'concat(${firstName}, " ", ${lastName})',
      dependsOn: ['firstName', 'lastName'],
    },
  },
  
  /** Total value from quantity * price */
  totalValue: {
    name: 'totalValue',
    label: 'Total Value',
    type: ComputedFieldType.NUMBER,
    source: ComputedFieldSource.SELF,
    config: {
      type: 'self' as const,
      expression: '${quantity} * ${unitPrice}',
      dependsOn: ['quantity', 'unitPrice'],
    },
  },
  
  /** Days until due date */
  daysUntilDue: {
    name: 'daysUntilDue',
    label: 'Days Until Due',
    type: ComputedFieldType.NUMBER,
    source: ComputedFieldSource.FORMULA,
    config: {
      type: 'formula' as const,
      formula: 'daysBetween(now(), ${dueDate})',
      variables: [
        { name: 'dueDate', source: 'field' as const, value: 'dueDate' },
      ],
    },
  },
  
  /** Is overdue check */
  isOverdue: {
    name: 'isOverdue',
    label: 'Overdue',
    type: ComputedFieldType.BOOLEAN,
    source: ComputedFieldSource.FORMULA,
    config: {
      type: 'formula' as const,
      formula: 'if(${dueDate} !== null && daysBetween(${dueDate}, now()) > 0, true, false)',
      variables: [
        { name: 'dueDate', source: 'field' as const, value: 'dueDate' },
      ],
    },
  },
  
  /** Completion percentage */
  completionPercentage: {
    name: 'completionPercentage',
    label: 'Completion %',
    type: ComputedFieldType.NUMBER,
    source: ComputedFieldSource.FORMULA,
    config: {
      type: 'formula' as const,
      formula: 'round((${completed} / max(${total}, 1)) * 100, 1)',
      variables: [
        { name: 'completed', source: 'field' as const, value: 'completedCount' },
        { name: 'total', source: 'field' as const, value: 'totalCount' },
      ],
    },
  },
};

/**
 * Apply a computed field template
 */
export function applyComputedFieldTemplate(
  templateName: keyof typeof COMPUTED_FIELD_TEMPLATES,
  overrides?: Partial<ComputedFieldDefinition>
): ComputedFieldDefinition {
  const template = COMPUTED_FIELD_TEMPLATES[templateName];
  return {
    ...template,
    ...overrides,
    config: {
      ...template.config,
      ...(overrides?.config || {}),
    },
  } as ComputedFieldDefinition;
}







