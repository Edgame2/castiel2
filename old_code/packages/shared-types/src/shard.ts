/**
 * Shard Related Types
 * Core content types shared across services
 */

/**
 * Shard status enum
 */
export enum ShardStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  DRAFT = 'draft',
}

/**
 * Source of shard creation
 */
export enum ShardSource {
  UI = 'ui',
  API = 'api',
  IMPORT = 'import',
  INTEGRATION = 'integration',
  SYSTEM = 'system',
}

/**
 * Source details for tracking origin
 */
export interface ShardSourceDetails {
  integrationName?: string;
  importJobId?: string;
  originalId?: string;
  syncedAt?: Date;
}

/**
 * Permission level enum
 */
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

/**
 * Shard metadata
 */
export interface ShardMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
  tags: string[];
  category?: string;
  deletedAt?: Date;
}

/**
 * Vector data for embeddings
 */
export interface VectorData {
  embedding: number[];
  model: string;
  dimensions: number;
  generatedAt: Date;
}

/**
 * JSON Schema definition (draft-07+)
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
 * Categories available for ShardTypes
 */
export enum ShardTypeCategory {
  DOCUMENT = 'document',
  DATA = 'data',
  MEDIA = 'media',
  CONFIGURATION = 'configuration',
  CUSTOM = 'custom',
}

/**
 * Lifecycle status for ShardTypes
 */
export enum ShardTypeStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  DELETED = 'deleted',
}

/**
 * Field types available for ShardType schemas
 */
export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  OBJECT = 'object',
  ARRAY = 'array',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  REFERENCE = 'reference',
  REFERENCES = 'references',
  USER = 'user',
  ENUM = 'enum',
  PICKLIST = 'picklist',
  ADDRESS = 'address',
  RICH_TEXT = 'rich_text',
  FILE = 'file',
}

/**
 * Auto-populate options for fields
 */
export enum AutoPopulateType {
  CURRENT_USER = 'currentUser',
  CURRENT_DATE = 'currentDate',
  SEQUENCE = 'sequence',
}

/**
 * Field definition for ShardType schema
 */
export interface FieldDefinition {
  type: FieldType;
  label?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  // Validation constraints
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  // Options
  options?: Array<string | { value: string; label: string }>;
  targetShardType?: string | string[]; // For REFERENCE/REFERENCES
  currencyCode?: string; // For CURRENCY
  defaultValue?: any;
  autoPopulate?: AutoPopulateType;
  // Field-level permissions
  permissions?: {
    read?: string[]; // Role names
    write?: string[];
  };
  // UI hints
  placeholder?: string;
  helpText?: string;
  uiWidget?: string;
}

/**
 * Relationship types between ShardTypes
 */
export enum RelationshipType {
  ONE_TO_ONE = 'one-to-one',
  ONE_TO_MANY = 'one-to-many',
  MANY_TO_MANY = 'many-to-many',
}

/**
 * Relationship definition between ShardTypes
 */
export interface RelationshipDefinition {
  name: string;
  displayName: string;
  type: RelationshipType;
  targetShardType: string;
  required?: boolean;
  cascade?: boolean; // Cascade delete
}

/**
 * Validation rule types
 */
export enum ValidationRuleType {
  CONDITIONAL_REQUIRED = 'conditionalRequired',
  UNIQUE = 'unique',
  CUSTOM = 'custom',
}

/**
 * Validation rule condition
 */
export interface ValidationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

/**
 * Validation rule for ShardType
 */
export interface ValidationRule {
  type: ValidationRuleType;
  condition?: ValidationCondition;
  requiredFields?: string[];
  errorMessage: string;
  customValidator?: string; // JavaScript function as string
}

/**
 * Workflow status definition
 */
export interface WorkflowStatus {
  value: string;
  label: string;
  color?: string;
  order: number;
}

/**
 * Workflow transition definition
 */
export interface WorkflowTransition {
  from: string;
  to: string[];
  requiredFields?: string[];
  requiredPermission?: string;
}

/**
 * Workflow configuration for ShardType
 */
export interface WorkflowConfiguration {
  statusField: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  defaultStatus: string;
}

/**
 * Enrichment types available
 */
export enum EnrichmentType {
  EXTRACT = 'extract',
  CLASSIFY = 'classify',
  SUMMARIZE = 'summarize',
  TRANSLATE = 'translate',
  SENTIMENT = 'sentiment',
  SUGGEST = 'suggest',
  VALIDATE = 'validate',
  EXPAND = 'expand',
  NORMALIZE = 'normalize',
  LOOKUP = 'lookup',
}

/**
 * Enrichment frequency options
 */
export enum EnrichmentFrequency {
  ON_CREATE = 'on_create',
  ON_UPDATE = 'on_update',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  CONTINUOUS = 'continuous',
}

/**
 * Enrichment trigger types
 */
export enum EnrichmentTriggerType {
  FIELD_CHANGE = 'field_change',
  STATUS_CHANGE = 'status_change',
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
}

/**
 * Enrichment trigger configuration
 */
export interface EnrichmentTrigger {
  type: EnrichmentTriggerType;
  condition?: ValidationCondition;
  schedule?: string; // Cron expression
}

/**
 * Field enrichment configuration
 */
export interface EnrichmentFieldConfig {
  fieldName: string;
  enrichmentType: EnrichmentType;
  prompt?: string;
  sourceFields?: string[];
  autoApply?: boolean;
  confidence?: number; // 0-1 threshold
}

/**
 * AI provider configuration for enrichment
 */
export interface EnrichmentProvider {
  name: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Enrichment budget configuration
 */
export interface EnrichmentBudget {
  daily?: number; // USD
  monthly?: number; // USD
}

/**
 * Enrichment configuration for ShardType
 */
export interface EnrichmentConfiguration {
  enabled: boolean;
  fields: EnrichmentFieldConfig[];
  frequency: EnrichmentFrequency;
  triggers?: EnrichmentTrigger[];
  provider?: EnrichmentProvider;
  budget?: EnrichmentBudget;
}

/**
 * Field group for UI organization
 */
export interface FieldGroup {
  name: string;
  displayName: string;
  fields: string[];
  collapsible?: boolean;
  collapsed?: boolean;
  order: number;
}

/**
 * Display configuration for ShardType
 */
export interface DisplayConfiguration {
  titleField: string;
  subtitleField?: string;
  iconField?: string;
  searchableFields: string[];
  sortableFields: string[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

/**
 * Shard - main content entity
 */
export interface Shard {
  id: string;
  tenantId: string;
  shardTypeId: string;
  status: ShardStatus;
  structuredData: Record<string, any>;
  unstructuredData?: string;
  vectors: VectorData[];
  metadata: ShardMetadata;
  
  // Schema version tracking (default: 1)
  schemaVersion: number;
  
  // Activity tracking
  lastActivityAt?: Date;
  
  // Source tracking
  source: ShardSource;
  sourceDetails?: ShardSourceDetails;
  
  // Archive tracking
  archivedAt?: Date;
}

/**
 * Structured data type (for cache)
 */
export type StructuredData = Record<string, any>;

/**
 * Shard creation input
 */
export interface CreateShardInput {
  tenantId: string;
  shardTypeId: string;
  structuredData: Record<string, any>;
  unstructuredData?: string;
  tags?: string[];
  category?: string;
  source?: ShardSource;
  sourceDetails?: ShardSourceDetails;
}

/**
 * Shard update input
 */
export interface UpdateShardInput {
  structuredData?: Record<string, any>;
  unstructuredData?: string;
  status?: ShardStatus;
  tags?: string[];
  category?: string;
}

/**
 * Shard filter for queries
 */
export interface ShardFilter {
  tenantId: string;
  shardTypeId?: string;
  status?: ShardStatus;
  tags?: string[];
  category?: string;
  source?: ShardSource;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;
  archivedAfter?: Date;
  archivedBefore?: Date;
}

/**
 * ShardType - schema definition for shards
 */
export interface ShardType {
  id: string;
  tenantId: string; // "system" for global types, tenant UUID for tenant-specific
  name: string;
  displayName: string;
  description?: string;
  version: number;
  schema: {
    fields: Record<string, FieldDefinition>;
    allowUnstructuredData?: boolean;
  };
  uiSchema?: Record<string, any>;
  relationships?: RelationshipDefinition[];
  validationRules?: ValidationRule[];
  workflow?: WorkflowConfiguration;
  enrichment?: EnrichmentConfiguration;
  fieldGroups?: FieldGroup[];
  display: DisplayConfiguration;
  isActive: boolean;
  isSystem: boolean;
  isGlobal: boolean;
  isTemplate: boolean; // Can be cloned by tenants
  clonedFrom?: string; // Original ShardType ID if this is a clone
  icon?: string;
  color?: string;
  tags: string[];
  category: ShardTypeCategory;
  status: ShardTypeStatus;
  parentShardTypeId?: string;
  isCustom: boolean;
  isBuiltIn: boolean;
  metadata: ShardMetadata;
  deletedAt?: Date;
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
  schema: {
    fields: Record<string, FieldDefinition>;
    allowUnstructuredData?: boolean;
  };
  uiSchema?: Record<string, any>;
  relationships?: RelationshipDefinition[];
  validationRules?: ValidationRule[];
  workflow?: WorkflowConfiguration;
  enrichment?: EnrichmentConfiguration;
  fieldGroups?: FieldGroup[];
  display: DisplayConfiguration;
  isGlobal?: boolean;
  isTemplate?: boolean;
  parentShardTypeId?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  createdBy?: string;
  isCustom?: boolean;
  isBuiltIn?: boolean;
}

/**
 * ShardType update input
 */
export interface UpdateShardTypeInput {
  name?: string;
  displayName?: string;
  description?: string;
  category?: ShardTypeCategory;
  schema?: {
    fields: Record<string, FieldDefinition>;
    allowUnstructuredData?: boolean;
  };
  uiSchema?: Record<string, any>;
  relationships?: RelationshipDefinition[];
  validationRules?: ValidationRule[];
  workflow?: WorkflowConfiguration;
  enrichment?: EnrichmentConfiguration;
  fieldGroups?: FieldGroup[];
  display?: DisplayConfiguration;
  isActive?: boolean;
  isGlobal?: boolean;
  isTemplate?: boolean;
  status?: ShardTypeStatus;
  icon?: string;
  color?: string;
  tags?: string[];
  parentShardTypeId?: string;
}

/**
 * ShardType clone customizations
 */
export interface CloneShardTypeCustomizations {
  fields?: Record<string, FieldDefinition>;
  enrichment?: EnrichmentConfiguration;
  validationRules?: ValidationRule[];
  fieldGroups?: FieldGroup[];
}

/**
 * ShardType clone input
 */
export interface CloneShardTypeInput {
  name?: string;
  displayName?: string;
  customizations?: CloneShardTypeCustomizations;
}

/**
 * Change type for revisions
 */
export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  BULK_UPDATE = 'bulk_update',
  SCHEMA_MIGRATION = 'schema_migration',
}

/**
 * Revision storage strategy
 */
export enum RevisionStorageStrategy {
  SNAPSHOT = 'snapshot',
  DELTA = 'delta',
  HYBRID = 'hybrid',
}

/**
 * Revision - version history for shards
 */
export interface Revision {
  id: string;
  tenantId: string;
  shardId: string;
  shardTypeId: string;
  version: number;
  changeType: ChangeType;
  changedBy: string;
  changedAt: Date;
  previousData?: Record<string, any>;
  currentData: Record<string, any>;
  changesSummary?: Record<string, any>;
  storageStrategy: RevisionStorageStrategy;
  isRestorePoint: boolean;
  metadata?: Record<string, any>;
}

/**
 * Revision filter for queries
 */
export interface RevisionFilter {
  tenantId: string;
  shardId?: string;
  shardTypeId?: string;
  changeType?: ChangeType;
  changedBy?: string;
  changedAfter?: Date;
  changedBefore?: Date;
  version?: number;
}

/**
 * Revision query options
 */
export interface RevisionQueryOptions {
  filter: RevisionFilter;
  limit?: number;
  offset?: number;
  orderBy?: 'version' | 'changedAt';
  orderDirection?: 'asc' | 'desc';
}
