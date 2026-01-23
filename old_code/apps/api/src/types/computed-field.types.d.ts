/**
 * Computed/Derived Field Types
 * Auto-calculated fields based on other data
 */
/**
 * Computed field data source
 */
export declare enum ComputedFieldSource {
    /** Value from the shard itself */
    SELF = "self",
    /** Aggregation across related shards */
    RELATED = "related",
    /** Value from a lookup/reference */
    LOOKUP = "lookup",
    /** Combined from multiple sources */
    FORMULA = "formula",
    /** From external API */
    EXTERNAL = "external"
}
/**
 * Aggregation operations for related shards
 */
export declare enum AggregationOperation {
    COUNT = "count",
    SUM = "sum",
    AVG = "avg",
    MIN = "min",
    MAX = "max",
    FIRST = "first",
    LAST = "last",
    CONCAT = "concat",
    DISTINCT = "distinct",
    EXISTS = "exists"
}
/**
 * Data type for computed field output
 */
export declare enum ComputedFieldType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    DATE = "date",
    ARRAY = "array",
    OBJECT = "object"
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
export declare const FORMULA_FUNCTIONS: {
    round: (value: number, decimals?: number) => number;
    floor: (x: number) => number;
    ceil: (x: number) => number;
    abs: (x: number) => number;
    min: (...args: number[]) => number;
    max: (...args: number[]) => number;
    pow: (x: number, y: number) => number;
    sqrt: (x: number) => number;
    concat: (...args: string[]) => string;
    upper: (s: string) => string;
    lower: (s: string) => string;
    trim: (s: string) => string;
    substring: (s: string, start: number, end?: number) => string;
    length: (s: string | any[]) => number;
    replace: (s: string, search: string, replace: string) => string;
    now: () => Date;
    daysAgo: (days: number) => Date;
    daysBetween: (date1: Date, date2: Date) => number;
    formatDate: (date: Date, format: string) => string;
    addDays: (date: Date, days: number) => Date;
    if: (condition: boolean, trueValue: any, falseValue: any) => any;
    coalesce: (...args: any[]) => any;
    default: (value: any, defaultValue: any) => any;
    first: (arr: any[]) => any;
    last: (arr: any[]) => any;
    sum: (arr: number[]) => number;
    avg: (arr: number[]) => number;
    count: (arr: any[]) => number;
    join: (arr: any[], sep?: string) => string;
    includes: (arr: any[], value: any) => boolean;
    filter: (arr: any[], field: string, value: any) => any[];
    toNumber: (value: any) => number;
    toString: (value: any) => string;
    toBoolean: (value: any) => boolean;
    toDate: (value: any) => Date;
};
/**
 * Predefined computed field templates
 */
export declare const COMPUTED_FIELD_TEMPLATES: {
    /** Age in days since creation */
    ageInDays: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "formula";
            formula: string;
            variables: {
                name: string;
                source: "field";
                value: string;
            }[];
        };
    };
    /** Days since last update */
    daysSinceUpdate: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "formula";
            formula: string;
            variables: {
                name: string;
                source: "field";
                value: string;
            }[];
        };
    };
    /** Count of related items */
    relatedCount: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "related";
            relationshipType: string;
            direction: "both";
            aggregation: AggregationOperation;
        };
    };
    /** Full name from first + last */
    fullName: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "self";
            expression: string;
            dependsOn: string[];
        };
    };
    /** Total value from quantity * price */
    totalValue: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "self";
            expression: string;
            dependsOn: string[];
        };
    };
    /** Days until due date */
    daysUntilDue: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "formula";
            formula: string;
            variables: {
                name: string;
                source: "field";
                value: string;
            }[];
        };
    };
    /** Is overdue check */
    isOverdue: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "formula";
            formula: string;
            variables: {
                name: string;
                source: "field";
                value: string;
            }[];
        };
    };
    /** Completion percentage */
    completionPercentage: {
        name: string;
        label: string;
        type: ComputedFieldType;
        source: ComputedFieldSource;
        config: {
            type: "formula";
            formula: string;
            variables: {
                name: string;
                source: "field";
                value: string;
            }[];
        };
    };
};
/**
 * Apply a computed field template
 */
export declare function applyComputedFieldTemplate(templateName: keyof typeof COMPUTED_FIELD_TEMPLATES, overrides?: Partial<ComputedFieldDefinition>): ComputedFieldDefinition;
//# sourceMappingURL=computed-field.types.d.ts.map