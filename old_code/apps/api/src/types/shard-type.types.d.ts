/**
 * ShardType types for Cosmos DB
 * ShardTypes define the structure and validation rules for Shards
 */
import type { FieldDefinition, RelationshipDefinition, ValidationRule, WorkflowConfiguration, EnrichmentConfiguration, FieldGroup, DisplayConfiguration, RichSchemaDefinition } from '@castiel/shared-types';
import type { ShardTypeSecurityConfig, SecurityLevel } from './field-security.types.js';
import type { EmbeddingTemplate } from './embedding-template.types.js';
/**
 * JSON Schema definition
 * Used to validate structured data in Shards
 */
export interface JSONSchema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    type?: string | string[];
    properties?: Record<string, JSONSchema>;
    required?: string[];
    additionalProperties?: boolean | JSONSchema;
    items?: JSONSchema | JSONSchema[];
    enum?: any[];
    const?: any;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    minProperties?: number;
    maxProperties?: number;
    allOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    oneOf?: JSONSchema[];
    not?: JSONSchema;
    [key: string]: any;
}
/**
 * ShardType status
 */
export declare enum ShardTypeStatus {
    ACTIVE = "active",
    DEPRECATED = "deprecated",
    DELETED = "deleted"
}
/**
 * ShardType category for organization
 */
export declare enum ShardTypeCategory {
    DOCUMENT = "document",
    DATA = "data",
    MEDIA = "media",
    CONFIGURATION = "configuration",
    CUSTOM = "custom",
    SYSTEM = "system"
}
/**
 * Schema format types
 * - 'legacy': Old FieldDefinition-based format
 * - 'jsonschema': Standard JSON Schema format
 * - 'rich': New RichFieldDefinition-based format with design config
 */
export type SchemaFormat = 'legacy' | 'jsonschema' | 'rich';
/**
 * Legacy schema format using Record<string, FieldDefinition>
 */
export interface LegacySchemaDefinition {
    fields?: Record<string, FieldDefinition>;
    allowUnstructuredData?: boolean;
}
/**
 * Rich schema definition for advanced field types
 */
/**
 * Rich schema definition for advanced field types
 */
export type RichSchema = RichSchemaDefinition;
/**
 * Union type for all supported schema formats
 */
export type ShardTypeSchema = LegacySchemaDefinition | JSONSchema | RichSchema;
/**
 * Helper to detect schema format
 */
export declare function detectSchemaFormat(schema: ShardTypeSchema): SchemaFormat;
/**
 * Type guard for rich schema
 */
export declare function isRichSchema(schema: ShardTypeSchema): schema is RichSchema;
/**
 * Type guard for legacy schema
 */
export declare function isLegacySchema(schema: ShardTypeSchema): schema is LegacySchemaDefinition;
/**
 * Type guard for JSON schema
 */
export declare function isJSONSchema(schema: ShardTypeSchema): schema is JSONSchema;
/**
 * ShardType document stored in Cosmos DB
 */
export interface ShardType {
    id: string;
    tenantId: string;
    name: string;
    displayName: string;
    description?: string;
    category: ShardTypeCategory;
    schema: ShardTypeSchema;
    /** Explicit schema format indicator (for clarity) */
    schemaFormat?: SchemaFormat;
    uiSchema?: Record<string, JSONSchema>;
    relationships?: RelationshipDefinition[];
    validationRules?: ValidationRule[];
    workflow?: WorkflowConfiguration;
    enrichment?: EnrichmentConfiguration;
    fieldGroups?: FieldGroup[];
    display?: DisplayConfiguration;
    securityConfig?: ShardTypeSecurityConfig;
    defaultSecurityLevel?: SecurityLevel;
    embeddingTemplate?: EmbeddingTemplate;
    parentShardTypeId?: string;
    isCustom: boolean;
    isBuiltIn: boolean;
    isGlobal: boolean;
    isTemplate?: boolean;
    clonedFrom?: string;
    icon?: string;
    color?: string;
    tags: string[];
    createdBy: string;
    version: number;
    schemaVersion?: number;
    status: ShardTypeStatus;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    updatedBy?: string;
    _rid?: string;
    _self?: string;
    _etag?: string;
    _attachments?: string;
    _ts?: number;
}
/**
 * ShardType creation input
 */
export interface CreateShardTypeInput {
    tenantId: string;
    name: string;
    displayName: string;
    description?: string;
    category: ShardTypeCategory;
    schema: ShardTypeSchema;
    schemaFormat?: SchemaFormat;
    parentShardTypeId?: string;
    isCustom?: boolean;
    isGlobal?: boolean;
    uiSchema?: Record<string, JSONSchema>;
    relationships?: RelationshipDefinition[];
    validationRules?: ValidationRule[];
    workflow?: WorkflowConfiguration;
    enrichment?: EnrichmentConfiguration;
    fieldGroups?: FieldGroup[];
    display?: DisplayConfiguration;
    securityConfig?: ShardTypeSecurityConfig;
    defaultSecurityLevel?: SecurityLevel;
    embeddingTemplate?: EmbeddingTemplate;
    icon?: string;
    color?: string;
    tags?: string[];
    createdBy: string;
}
/**
 * ShardType update input
 */
export interface UpdateShardTypeInput {
    displayName?: string;
    name?: string;
    description?: string;
    category?: ShardTypeCategory;
    schema?: ShardTypeSchema;
    schemaFormat?: SchemaFormat;
    status?: ShardTypeStatus;
    uiSchema?: Record<string, JSONSchema>;
    relationships?: RelationshipDefinition[];
    validationRules?: ValidationRule[];
    workflow?: WorkflowConfiguration;
    enrichment?: EnrichmentConfiguration;
    fieldGroups?: FieldGroup[];
    display?: DisplayConfiguration;
    embeddingTemplate?: EmbeddingTemplate;
    isGlobal?: boolean;
    icon?: string;
    color?: string;
    tags?: string[];
    parentShardTypeId?: string;
}
/**
 * ShardType query filters
 */
export interface ShardTypeQueryFilter {
    tenantId: string;
    name?: string;
    category?: ShardTypeCategory;
    isCustom?: boolean;
    isBuiltIn?: boolean;
    status?: ShardTypeStatus;
    isGlobal?: boolean;
    tags?: string[];
    parentShardTypeId?: string;
    createdBy?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    search?: string;
}
/**
 * ShardType list options
 */
export interface ShardTypeListOptions {
    filter?: ShardTypeQueryFilter;
    limit?: number;
    continuationToken?: string;
    orderBy?: 'name' | 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
}
/**
 * ShardType list result
 */
export interface ShardTypeListResult {
    shardTypes: ShardType[];
    continuationToken?: string;
    count: number;
}
/**
 * Schema with resolved inheritance
 * Used when parent schemas are merged with child schemas
 */
export interface ResolvedShardType extends ShardType {
    resolvedSchema: JSONSchema;
    inheritanceChain: string[];
}
/**
 * Schema validation result
 */
export interface SchemaValidationResult {
    valid: boolean;
    errors?: Array<{
        field: string;
        message: string;
        value?: any;
    }>;
}
/**
 * Built-in ShardType names
 * System-provided types that are always available
 */
export declare const BUILT_IN_SHARD_TYPES: {
    readonly DOCUMENT: "document";
    readonly NOTE: "note";
    readonly FILE: "file";
    readonly CONTACT: "contact";
    readonly TASK: "task";
    readonly EVENT: "event";
    readonly ARTICLE: "article";
    readonly PRODUCT: "product";
};
/**
 * Helper to check if a ShardType name is built-in
 */
export declare function isBuiltInShardType(name: string): boolean;
/**
 * Helper to merge parent and child schemas
 * Deep merges properties and combines required arrays
 */
export declare function mergeSchemas(parentSchema: JSONSchema, childSchema: JSONSchema): JSONSchema;
//# sourceMappingURL=shard-type.types.d.ts.map