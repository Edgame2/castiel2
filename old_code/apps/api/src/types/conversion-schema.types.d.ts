/**
 * Conversion Schema Types
 * Maps data from external integrations to Castiel ShardTypes
 */
/**
 * Source filter operator
 */
export type SourceFilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
/**
 * Source filter
 */
export interface SourceFilter {
    field: string;
    operator: SourceFilterOperator;
    value: any;
}
/**
 * Source configuration
 */
export interface SourceConfig {
    entity: string;
    filters?: SourceFilter[];
}
/**
 * Target configuration
 */
export interface TargetConfig {
    shardTypeId: string;
    createIfMissing: boolean;
    updateIfExists: boolean;
    deleteIfRemoved: boolean;
}
/**
 * Conditional rule for derived shard creation
 */
export interface ConditionalRule {
    field: string;
    operator: ConditionalOperator;
    value: any;
}
/**
 * Derived shard configuration
 * Creates additional shards from the same source data
 */
export interface DerivedShardConfig {
    /** Shard type to create */
    shardTypeId: string;
    /** Only create if condition is met */
    condition?: ConditionalRule;
    /** Field mappings specific to this derived shard */
    fieldMappings: Omit<FieldMapping, 'id'>[];
    /** Create a shard link to the primary shard */
    linkToPrimary: boolean;
    /** Relationship type for the link */
    linkRelationshipType?: string;
    /** Description */
    description?: string;
}
/**
 * Multi-shard output configuration
 */
export interface MultiShardOutputConfig {
    /** Primary shard type */
    primary: string;
    /** Derived shards to create from same data */
    derived: DerivedShardConfig[];
}
/**
 * Field mapping type
 */
export type FieldMappingType = 'direct' | 'transform' | 'conditional' | 'default' | 'composite' | 'flatten' | 'lookup';
/**
 * Transformation type
 */
export type TransformationType = 'uppercase' | 'lowercase' | 'trim' | 'truncate' | 'replace' | 'regex_replace' | 'split' | 'concat' | 'round' | 'floor' | 'ceil' | 'multiply' | 'divide' | 'add' | 'subtract' | 'abs' | 'currency_convert' | 'parse_date' | 'format_date' | 'add_days' | 'subtract_days' | 'to_timestamp' | 'to_iso_string' | 'extract_year' | 'extract_month' | 'extract_day' | 'to_string' | 'to_number' | 'to_boolean' | 'to_array' | 'to_date' | 'parse_json' | 'stringify_json' | 'custom';
/**
 * Transformation
 */
export interface Transformation {
    type: TransformationType;
    config?: Record<string, any>;
}
/**
 * Conditional operator
 */
export type ConditionalOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'exists' | 'not_exists' | 'is_null' | 'is_not_null' | 'regex';
/**
 * Condition
 */
export interface Condition {
    field: string;
    operator: ConditionalOperator;
    value: any;
}
/**
 * Conditional then clause
 */
export interface ConditionalThen {
    type: 'value' | 'field' | 'transform';
    value?: any;
    sourceField?: string;
    transformations?: Transformation[];
}
/**
 * Conditional rule
 */
export interface ConditionalRule {
    condition: Condition;
    then: ConditionalThen;
}
/**
 * Direct mapping config
 */
export interface DirectMappingConfig {
    type: 'direct';
    sourceField: string;
}
/**
 * Transform mapping config
 */
export interface TransformMappingConfig {
    type: 'transform';
    sourceField: string;
    transformations: Transformation[];
}
/**
 * Conditional mapping config
 */
export interface ConditionalMappingConfig {
    type: 'conditional';
    conditions: ConditionalRule[];
    default?: any;
}
/**
 * Default mapping config
 */
export interface DefaultMappingConfig {
    type: 'default';
    value: any;
}
/**
 * Composite mapping config
 */
export interface CompositeMappingConfig {
    type: 'composite';
    sourceFields: string[];
    separator?: string;
    template?: string;
}
/**
 * Flatten mapping config
 */
export interface FlattenMappingConfig {
    type: 'flatten';
    sourceField: string;
    path: string;
}
/**
 * Lookup mapping config
 */
export interface LookupMappingConfig {
    type: 'lookup';
    sourceField: string;
    lookupEntity: string;
    lookupField: string;
    returnField: string;
    fallback?: any;
}
/**
 * Field mapping config union
 */
export type FieldMappingConfig = DirectMappingConfig | TransformMappingConfig | ConditionalMappingConfig | DefaultMappingConfig | CompositeMappingConfig | FlattenMappingConfig | LookupMappingConfig;
/**
 * Validation rule for field mapping
 */
export interface MappingValidationRule {
    type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'enum' | 'custom';
    value?: any;
    message: string;
}
/**
 * Field mapping
 */
export interface FieldMapping {
    id: string;
    targetField: string;
    mappingType: FieldMappingType;
    config: FieldMappingConfig;
    required?: boolean;
    validation?: MappingValidationRule[];
}
/**
 * Relationship mapping
 */
export interface RelationshipMapping {
    relationshipType: string;
    targetField: string;
    sourceField: string;
    lookupShardType: string;
    lookupByExternalId: boolean;
    lookupField?: string;
    createIfMissing?: boolean;
}
/**
 * Deduplication strategy
 */
export type DeduplicationStrategy = 'external_id' | 'field_match' | 'composite';
/**
 * Deduplication config
 */
export interface DeduplicationConfig {
    strategy: DeduplicationStrategy;
    externalIdField?: string;
    matchFields?: string[];
    compositeFields?: string[];
}
/**
 * Conversion schema
 */
export interface ConversionSchema {
    id: string;
    tenantIntegrationId: string;
    tenantId: string;
    name: string;
    description?: string;
    source: SourceConfig;
    target: TargetConfig;
    outputShardTypes?: MultiShardOutputConfig;
    fieldMappings: FieldMapping[];
    relationshipMappings?: RelationshipMapping[];
    preserveRelationships: boolean;
    deduplication: DeduplicationConfig;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create conversion schema input
 */
export interface CreateConversionSchemaInput {
    tenantIntegrationId: string;
    tenantId: string;
    name: string;
    description?: string;
    source: SourceConfig;
    target: TargetConfig;
    fieldMappings: Omit<FieldMapping, 'id'>[];
    relationshipMappings?: RelationshipMapping[];
    preserveRelationships?: boolean;
    deduplication: DeduplicationConfig;
    isActive?: boolean;
    createdBy: string;
}
/**
 * Update conversion schema input
 */
export interface UpdateConversionSchemaInput {
    name?: string;
    description?: string;
    source?: SourceConfig;
    target?: TargetConfig;
    fieldMappings?: Omit<FieldMapping, 'id'>[];
    relationshipMappings?: RelationshipMapping[];
    deduplication?: DeduplicationConfig;
    isActive?: boolean;
}
/**
 * Conversion schema list filter
 */
export interface ConversionSchemaListFilter {
    tenantId: string;
    tenantIntegrationId?: string;
    isActive?: boolean;
}
/**
 * Conversion schema list options
 */
export interface ConversionSchemaListOptions {
    filter: ConversionSchemaListFilter;
    limit?: number;
    offset?: number;
}
/**
 * Conversion schema list result
 */
export interface ConversionSchemaListResult {
    schemas: ConversionSchema[];
    total: number;
    hasMore: boolean;
}
/**
 * Transformation context
 */
export interface TransformationContext {
    sourceData: Record<string, any>;
    taskConfig?: Record<string, any>;
    tenantId: string;
    integrationId: string;
    monitoring?: import('@castiel/monitoring').IMonitoringProvider;
}
/**
 * Transformation result
 */
export interface TransformationResult {
    success: boolean;
    value?: any;
    error?: string;
}
/**
 * Schema test input
 */
export interface SchemaTestInput {
    schemaId: string;
    sampleData: Record<string, any>;
}
/**
 * Schema test result
 */
export interface SchemaTestResult {
    success: boolean;
    transformedData?: Record<string, any>;
    fieldResults: Array<{
        targetField: string;
        sourceValue: any;
        transformedValue: any;
        success: boolean;
        error?: string;
    }>;
    errors: string[];
}
//# sourceMappingURL=conversion-schema.types.d.ts.map