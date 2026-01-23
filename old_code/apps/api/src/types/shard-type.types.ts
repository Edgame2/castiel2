/**
 * ShardType types for Cosmos DB
 * ShardTypes define the structure and validation rules for Shards
 */

// Import enhanced types from shared package
import type {
  FieldDefinition,
  RelationshipDefinition,
  ValidationRule,
  WorkflowConfiguration,
  EnrichmentConfiguration,
  FieldGroup,
  DisplayConfiguration,
  // Rich Field Types
  RichFieldDefinition,
  RichSchemaDefinition,
  FormLayoutConfig,
} from '@castiel/shared-types';
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
  [key: string]: any; // Allow additional JSON Schema properties
}

/**
 * ShardType status
 */
export enum ShardTypeStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  DELETED = 'deleted',
}

/**
 * ShardType category for organization
 */
export enum ShardTypeCategory {
  DOCUMENT = 'document',
  DATA = 'data',
  MEDIA = 'media',
  CONFIGURATION = 'configuration',
  CUSTOM = 'custom',
  SYSTEM = 'system',
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
export function detectSchemaFormat(schema: ShardTypeSchema): SchemaFormat {
  if ('format' in schema && schema.format === 'rich') {
    return 'rich';
  }
  if ('$schema' in schema || ('type' in schema && schema.type === 'object')) {
    return 'jsonschema';
  }
  return 'legacy';
}

/**
 * Type guard for rich schema
 */
export function isRichSchema(schema: ShardTypeSchema): schema is RichSchema {
  return 'format' in schema && schema.format === 'rich';
}

/**
 * Type guard for legacy schema
 */
export function isLegacySchema(schema: ShardTypeSchema): schema is LegacySchemaDefinition {
  return !('format' in schema) && !('$schema' in schema) && !('type' in schema);
}

/**
 * Type guard for JSON schema
 */
export function isJSONSchema(schema: ShardTypeSchema): schema is JSONSchema {
  return '$schema' in schema || ('type' in schema && !('format' in schema));
}

/**
 * ShardType document stored in Cosmos DB
 */
export interface ShardType {
  id: string;
  tenantId: string; // Partition key

  // Basic information
  name: string;
  displayName: string;
  description?: string;
  category: ShardTypeCategory;

  // Schema definition - supports multiple formats
  schema: ShardTypeSchema;
  /** Explicit schema format indicator (for clarity) */
  schemaFormat?: SchemaFormat;
  uiSchema?: Record<string, JSONSchema>;

  // Enhanced features
  relationships?: RelationshipDefinition[];
  validationRules?: ValidationRule[];
  workflow?: WorkflowConfiguration;
  enrichment?: EnrichmentConfiguration;
  fieldGroups?: FieldGroup[];
  display?: DisplayConfiguration;

  // Field-level security
  securityConfig?: ShardTypeSecurityConfig;
  defaultSecurityLevel?: SecurityLevel;

  // Embedding configuration for vector search
  embeddingTemplate?: EmbeddingTemplate;

  // Inheritance
  parentShardTypeId?: string; // For sub-types

  // Type classification
  isCustom: boolean; // true = tenant-created, false = built-in system type
  isBuiltIn: boolean; // true = system-provided, false = tenant-created
  isGlobal: boolean; // true = available across tenants
  isTemplate?: boolean; // Can be cloned by tenants
  clonedFrom?: string; // Original ShardType ID if this is a clone
  icon?: string;
  color?: string;
  tags: string[];

  // Metadata
  createdBy: string; // userId who created this type
  version: number; // Version number for schema changes
  schemaVersion?: number; // Schema evolution version (starts at 1)

  // Status
  status: ShardTypeStatus;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // For soft delete
  updatedBy?: string;

  // Cosmos DB system fields (optional)
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
  resolvedSchema: JSONSchema; // Schema with parent inheritance applied
  inheritanceChain: string[]; // Array of parent IDs from root to this type
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
export const BUILT_IN_SHARD_TYPES = {
  DOCUMENT: 'document',
  NOTE: 'note',
  FILE: 'file',
  CONTACT: 'contact',
  TASK: 'task',
  EVENT: 'event',
  ARTICLE: 'article',
  PRODUCT: 'product',
} as const;

/**
 * Helper to check if a ShardType name is built-in
 */
export function isBuiltInShardType(name: string): boolean {
  return Object.values(BUILT_IN_SHARD_TYPES).includes(name as any);
}

/**
 * Helper to merge parent and child schemas
 * Deep merges properties and combines required arrays
 */
export function mergeSchemas(parentSchema: JSONSchema, childSchema: JSONSchema): JSONSchema {
  const merged: JSONSchema = {
    ...parentSchema,
    ...childSchema,
  };

  // Merge properties
  if (parentSchema.properties || childSchema.properties) {
    merged.properties = {
      ...parentSchema.properties,
      ...childSchema.properties,
    };
  }

  // Merge required arrays
  if (parentSchema.required || childSchema.required) {
    const parentRequired = parentSchema.required || [];
    const childRequired = childSchema.required || [];
    merged.required = Array.from(new Set([...parentRequired, ...childRequired]));
  }

  // Child schema's allOf, anyOf, oneOf take precedence
  // But we can extend them if needed

  return merged;
}
