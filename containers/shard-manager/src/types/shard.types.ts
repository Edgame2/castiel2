/**
 * Shard types for Shard Manager
 * Core data model types
 */

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

export interface ACLEntry {
  userId?: string;
  roleId?: string;
  permissions: PermissionLevel[];
  grantedBy: string;
  grantedAt: Date;
}

export interface VectorEmbedding {
  id: string;
  field: string;
  model: string;
  dimensions: number;
  embedding: number[];
  createdAt: Date;
}

export enum ShardStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  DRAFT = 'draft',
}

export enum ShardSource {
  UI = 'ui',
  API = 'api',
  IMPORT = 'import',
  INTEGRATION = 'integration',
  SYSTEM = 'system',
}

export interface ShardSourceDetails {
  integrationName?: string;
  importJobId?: string;
  originalId?: string;
  syncedAt?: Date;
}

export type StructuredData = Record<string, any>;
export type UnstructuredData = Record<string, any>;

export interface ShardMetadata {
  tags?: string[];
  customFields?: Record<string, any>;
  redaction?: {
    applied: boolean;
    fields: string[];
    reason?: string;
  };
}

export interface InternalRelationship {
  shardId: string;
  relationshipType: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export interface ExternalRelationship {
  id: string;
  system: string;
  systemType: string;
  externalId: string;
  label?: string;
  syncStatus?: 'synced' | 'pending' | 'error';
  syncDirection?: 'inbound' | 'outbound' | 'bidirectional';
  lastSyncedAt?: Date;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface EnrichmentConfig {
  enabled: boolean;
  providers?: string[];
  autoEnrich?: boolean;
  enrichmentTypes?: string[];
}

export interface Enrichment {
  config: EnrichmentConfig;
  lastEnrichedAt?: Date;
  enrichmentData?: Record<string, any>;
  error?: string;
}

/**
 * Shard document stored in Cosmos DB
 */
export interface Shard {
  id: string;
  tenantId: string; // Partition key
  userId: string; // Creator/owner
  shardTypeId: string;
  shardTypeName?: string;
  parentShardId?: string;

  schemaVersion?: number;
  structuredData: StructuredData;
  unstructuredData?: UnstructuredData;
  metadata?: ShardMetadata;

  internal_relationships?: InternalRelationship[];
  external_relationships?: ExternalRelationship[];

  acl: ACLEntry[];

  enrichment?: Enrichment;
  lastEnrichedAt?: Date;

  vectors?: VectorEmbedding[];

  revisionId: string;
  revisionNumber: number;

  status: ShardStatus;
  source: ShardSource;
  sourceDetails?: ShardSourceDetails;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  archivedAt?: Date;
  lastActivityAt?: Date;

  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Shard creation input
 */
export interface CreateShardInput {
  tenantId: string;
  userId: string;
  shardTypeId: string;
  shardTypeName?: string;
  parentShardId?: string;
  structuredData: StructuredData;
  unstructuredData?: UnstructuredData;
  metadata?: ShardMetadata;
  internal_relationships?: InternalRelationship[];
  external_relationships?: ExternalRelationship[];
  acl?: ACLEntry[];
  enrichment?: EnrichmentConfig;
  status?: ShardStatus;
  source?: ShardSource;
  sourceDetails?: ShardSourceDetails;
}

/**
 * Shard update input
 */
export interface UpdateShardInput {
  structuredData?: StructuredData;
  unstructuredData?: UnstructuredData;
  metadata?: ShardMetadata;
  internal_relationships?: InternalRelationship[];
  external_relationships?: ExternalRelationship[];
  acl?: ACLEntry[];
  status?: ShardStatus;
  parentShardId?: string;
}

/**
 * ShardType (schema definition)
 */
export interface ShardType {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  schema: Record<string, any>; // JSON Schema
  displayConfig?: {
    defaultFields?: string[];
    defaultSortField?: string;
    defaultSortOrder?: 'asc' | 'desc';
  };
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Create ShardType input
 */
export interface CreateShardTypeInput {
  tenantId: string;
  name: string;
  description?: string;
  schema: Record<string, any>;
  displayConfig?: ShardType['displayConfig'];
  isSystem?: boolean;
  createdBy: string;
}

/**
 * Update ShardType input
 */
export interface UpdateShardTypeInput {
  name?: string;
  description?: string;
  schema?: Record<string, any>;
  displayConfig?: ShardType['displayConfig'];
  isActive?: boolean;
}

