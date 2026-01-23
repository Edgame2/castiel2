/**
 * Shard types for Cosmos DB
 * Shards are the core data entities in the system
 */

import type { EnrichmentResults } from './enrichment.types.js';

/**
 * Permission level for ACL entries
 */
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

/**
 * ACL entry for shard access control
 */
export interface ACLEntry {
  userId?: string;
  roleId?: string; // For role-based permissions
  permissions: PermissionLevel[];
  grantedBy: string;
  grantedAt: Date;
}

/**
 * Enrichment configuration for AI processing
 */
export interface EnrichmentConfig {
  enabled: boolean;
  providers?: string[]; // e.g., ['openai', 'azure-openai']
  autoEnrich?: boolean;
  enrichmentTypes?: string[]; // e.g., ['summary', 'keywords', 'sentiment']
}

/**
 * Enrichment metadata
 */
export interface Enrichment {
  config: EnrichmentConfig;
  lastEnrichedAt?: Date;
  enrichmentData?: Record<string, any>;
  error?: string;
}

/**
 * Vector embedding for semantic search
 */
export interface VectorEmbedding {
  id: string;
  field: string; // Which field this embedding is for
  model: string; // e.g., 'text-embedding-ada-002'
  dimensions: number;
  embedding: number[];
  createdAt: Date;
}

/**
 * Shard status
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
 * Structured data (cacheable)
 * This is a flexible object that conforms to the ShardType's JSON Schema
 */
export type StructuredData = Record<string, any>;

/**
 * Unstructured data (not cached)
 * Can contain large text, files, etc.
 */
export interface UnstructuredData {
  text?: string;
  files?: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  rawData?: any;
}

/**
 * Redaction metadata (Phase 2)
 */
export interface RedactionMetadata {
  redacted: boolean;
  redactedFields?: string[];
  redactedAt?: Date;
  redactedBy?: string;
  redactionConfigId?: string;
}

/**
 * Shard metadata
 */
export interface ShardMetadata {
  tags?: string[];
  category?: string;
  priority?: number;
  customFields?: Record<string, any>;
  enrichment?: EnrichmentResults;
  redaction?: RedactionMetadata; // Phase 2: Redaction tracking
}

export interface InternalRelationship {
  shardId: string;
  shardTypeId: string;
  shardTypeName?: string;
  shardName: string;
  createdAt: Date;
  // Phase 2: Enhanced metadata for confidence scores and enrichment
  metadata?: {
    confidence?: number;              // 0.0 - 1.0
    source?: 'crm' | 'llm' | 'messaging' | 'manual';
    extractionMethod?: string;      // e.g., "llm-ner", "regex", "structured-field"
    extractedAt?: Date;
    verified?: boolean;              // Manually verified by user
    verifiedBy?: string;             // User ID who verified
    verifiedAt?: Date;
    [key: string]: any;              // Additional metadata
  };
}

/**
 * Sync status for external relationships
 */
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed',
  STALE = 'stale',
}

/**
 * Sync direction for external relationships
 */
export enum SyncDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  BIDIRECTIONAL = 'bidirectional',
}

/**
 * Type guard to check if a string is a valid SyncStatus
 */
export function isValidSyncStatus(value: string): value is SyncStatus {
  return Object.values(SyncStatus).includes(value as SyncStatus);
}

/**
 * Type guard to check if a string is a valid SyncDirection
 */
export function isValidSyncDirection(value: string): value is SyncDirection {
  return Object.values(SyncDirection).includes(value as SyncDirection);
}

/**
 * External relationship linking shards to external systems
 * Phase 2 enhanced structure with backward compatibility
 */
export interface ExternalRelationship {
  // Phase 2 new fields (optional for backward compatibility)
  id?: string;                        // Relationship UUID
  system?: string;                    // System name (e.g., "salesforce", "gdrive")
  systemType?: string;                // Type (crm, storage, messaging, etc.)
  label?: string;                     // Human-readable label
  syncStatus?: SyncStatus;            // synced | pending | failed | stale
  syncDirection?: SyncDirection;      // inbound | outbound | bidirectional
  lastSyncedAt?: Date;                // Last sync timestamp
  metadata?: Record<string, any>;     // Additional relationship data
  createdBy?: string;                  // User ID who created the relationship

  // Existing fields (maintained for backward compatibility)
  externalId: string;                 // ID in external system
  integrationConnectionId?: string;   // Integration connection ID (backward compat)
  createdAt: Date;                    // Creation timestamp
}

/**
 * Shard document stored in Cosmos DB
 */
export interface Shard {
  id: string;
  tenantId: string; // Partition key
  userId: string; // Creator/owner
  shardTypeId: string;
  shardTypeName?: string; // Denormalized name for easier display
  parentShardId?: string; // For hierarchical shards

  // Schema version tracking
  schemaVersion?: number; // Version of the ShardType schema this conforms to

  // Data fields
  structuredData: StructuredData; // CACHEABLE - conforms to ShardType schema
  unstructuredData?: UnstructuredData; // NOT cached - can be large
  metadata?: ShardMetadata;

  // Relationships
  internal_relationships?: InternalRelationship[];
  external_relationships?: ExternalRelationship[];

  // Access control
  acl: ACLEntry[]; // Access control list

  // AI enrichment
  enrichment?: Enrichment;
  lastEnrichedAt?: Date;

  // Vector embeddings for semantic search
  vectors?: VectorEmbedding[];

  // Revision tracking
  revisionId: string;
  revisionNumber: number;

  // Status
  status: ShardStatus;

  // Source tracking
  source: ShardSource; // How this shard was created
  sourceDetails?: ShardSourceDetails; // Additional source metadata

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // For soft delete
  archivedAt?: Date; // When status changed to archived
  lastActivityAt?: Date; // Last significant activity (view, edit, relationship change)

  // Cosmos DB system fields (optional)
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}

/**
 * Shard creation input
 */
export interface CreateShardInput {
  tenantId: string;
  userId?: string; // Optional for backwards compatibility
  createdBy?: string; // Added for consistency
  shardTypeId: string;
  shardTypeName?: string; // Optional, will be fetched if missing
  structuredData: StructuredData;
  unstructuredData?: UnstructuredData;
  metadata?: ShardMetadata;
  internal_relationships?: InternalRelationship[];
  external_relationships?: ExternalRelationship[];
  parentShardId?: string; // Added for hierarchical shards
  acl?: ACLEntry[];
  enrichment?: EnrichmentConfig;
  status?: ShardStatus;
  source?: ShardSource; // How this shard is being created
  sourceDetails?: ShardSourceDetails; // Additional source metadata
  skipEnqueueing?: boolean; // Skip Service Bus enqueuing
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
  enrichment?: Enrichment;
  status?: ShardStatus;
  schemaVersion?: number; // Version of the ShardType schema this conforms to
}

/**
 * Shard query filters
 */
export interface ShardQueryFilter {
  tenantId: string;
  userId?: string;
  shardTypeId?: string;
  parentShardId?: string; // Added for hierarchical filtering
  status?: ShardStatus;
  category?: string; // Added for metadata filtering
  priority?: number; // Added for metadata filtering
  tags?: string[];
  source?: ShardSource; // Filter by creation source
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  lastActivityAfter?: Date; // Filter by last activity
  lastActivityBefore?: Date;
  archivedAfter?: Date; // Filter by archive date
  archivedBefore?: Date;
  managerId?: string; // Filter by project manager
  teamMemberId?: string; // Filter by team member
  // StructuredData filters - for filtering by fields in structuredData
  structuredDataFilters?: Record<string, any>; // e.g., { ownerId: 'user-123', stage: 'negotiation' }
}

/**
 * Shard list options
 */
export interface ShardListOptions {
  filter?: ShardQueryFilter;
  limit?: number;
  continuationToken?: string;
  orderBy?: 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Shard list result
 */
export interface ShardListResult {
  shards: Shard[];
  continuationToken?: string;
  count: number;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasAccess: boolean;
  permissions: PermissionLevel[];
}
