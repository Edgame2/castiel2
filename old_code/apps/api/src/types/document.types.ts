/**
 * Document Management Types & Interfaces
 * Phase 1: Upload, Storage, and Management
 */

import { Shard, ACLEntry } from './shard.types.js';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Document status lifecycle
 */
export enum DocumentStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  PROCESSING = 'processing',
  ERROR = 'error',
}

/**
 * Document visibility levels
 */
export enum VisibilityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
}

/**
 * Storage providers
 */
export enum StorageProvider {
  AZURE = 'azure',
  AWS = 'aws',
  GCP = 'gcp',
}

/**
 * Collection types
 */
export enum CollectionType {
  FOLDER = 'folder',
  TAG = 'tag',
  SMART = 'smart',
}

/**
 * Bulk job status
 */
export enum BulkJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Bulk job types
 */
export enum BulkJobType {
  BULK_UPLOAD = 'bulk-upload',
  BULK_DELETE = 'bulk-delete',
  BULK_UPDATE = 'bulk-update',
  BULK_COLLECTION_ASSIGN = 'bulk-collection-assign',
}

/**
 * Document audit event types
 */
export enum DocumentAuditEventType {
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DOCUMENT_VIEWED = 'document_viewed',
  DOCUMENT_UPDATED = 'document_updated',
  DOCUMENT_DELETED = 'document_deleted',
  DOCUMENT_RESTORED = 'document_restored',
  DOCUMENT_VERSION_CREATED = 'document_version_created',
  DOCUMENT_VERSION_RESTORED = 'document_version_restored',
  DOCUMENT_MOVED_TO_COLLECTION = 'document_moved_to_collection',
  DOCUMENT_REMOVED_FROM_COLLECTION = 'document_removed_from_collection',
  DOCUMENT_PERMISSION_CHANGED = 'document_permission_changed',
  DOCUMENT_METADATA_UPDATED = 'document_metadata_updated',

  // Collection events
  COLLECTION_CREATED = 'collection_created',
  COLLECTION_UPDATED = 'collection_updated',
  COLLECTION_DELETED = 'collection_deleted',

  // Bulk operation events
  BULK_UPLOAD_STARTED = 'bulk_upload_started',
  BULK_UPLOAD_COMPLETED = 'bulk_upload_completed',
  BULK_DELETE_STARTED = 'bulk_delete_started',
  BULK_DELETE_COMPLETED = 'bulk_delete_completed',
  BULK_UPDATE = 'bulk_update',
  BULK_COLLECTION_ASSIGN = 'bulk_collection_assign',

  // Tenant settings
  DOCUMENT_SETTINGS_UPDATED = 'document_settings_updated',
  CATEGORY_CREATED = 'category_created',
  CATEGORY_UPDATED = 'category_updated',
}

// ============================================================================
// DOCUMENT INTERFACES
// ============================================================================

/**
 * Document version history entry
 */
export interface DocumentVersionEntry {
  version: number;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByEmail?: string;
  fileSize: number;
  mimeType: string;
  reason?: string;
  storageProvider: StorageProvider;
  storagePath: string;
}

/**
 * Document category definition
 */
export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  retentionDays?: number;
  isActive: boolean;
}

/**
 * Document structured data (stored in c_document shard)
 */
export interface DocumentStructuredData {
  // Required fields
  name: string; // REQUIRED by BaseShard

  // Core metadata
  description?: string;
  documentType?: string;
  mimeType: string;
  fileSize: number;

  // Storage information
  storageProvider: StorageProvider;
  storagePath: string; // e.g., "quarantine/tenant-123/shard-456/v1/file.pdf"

  // Optional URLs (generated on-demand with SAS tokens)
  thumbnailPath?: string;
  previewPath?: string;

  // Classification
  category?: string;
  tags: string[];
  visibility: VisibilityLevel;

  // Retention
  retentionPolicyId?: string;
  retentionUntil?: Date;

  // Versioning
  version: number; // Current version number (1, 2, 3...)
  versionHistory: DocumentVersionEntry[];

  // Processing status (for Phase 2+)
  scanStatus?: 'pending' | 'clean' | 'infected' | 'error';
  scanTimestamp?: Date;
  extractionStatus?: 'pending' | 'completed' | 'failed';
  extractionTimestamp?: Date;

  // Upload tracking
  uploadedBy: string;
  uploadedByEmail?: string;
  uploadedAt: Date;

  // Deletion tracking
  deletedBy?: string;
  deletedAt?: Date;
  deletionReason?: string;
}

/**
 * Document unstructured data (large content)
 */
export interface DocumentUnstructuredData {
  extractedText?: string; // From OCR/extraction (Phase 2)
  rawMetadata?: Record<string, any>;
}

/**
 * Complete c_document shard interface
 */
export interface DocumentShard extends Omit<Shard, 'structuredData' | 'unstructuredData'> {
  shardTypeId: 'c_document';
  structuredData: DocumentStructuredData;
  unstructuredData?: DocumentUnstructuredData;
}

// ============================================================================
// COLLECTION INTERFACES
// ============================================================================

/**
 * Collection query for smart collections (Phase 2)
 */
export interface CollectionQuery {
  filters: {
    category?: string[];
    tags?: string[];
    visibility?: VisibilityLevel[];
    documentType?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
  };
}

/**
 * Collection structured data
 */
export interface CollectionStructuredData {
  // Required
  name: string;

  // Core metadata
  description?: string;
  collectionType: CollectionType;

  // Document references
  documentIds: string[]; // Array of shard IDs
  documentNames: string[]; // Parallel array for display

  // Smart collection query (for type: 'smart')
  query?: CollectionQuery;

  // Classification
  visibility: VisibilityLevel;
  tags: string[];

  // Tracking
  createdBy: string;
  createdByEmail?: string;
  createdAt: Date;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
}

/**
 * Complete c_documentcollection shard interface
 */
export interface CollectionShard extends Omit<Shard, 'structuredData'> {
  shardTypeId: 'c_documentcollection';
  structuredData: CollectionStructuredData;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk job item result
 */
export interface BulkJobItemResult {
  itemId: string; // Original item identifier
  itemName?: string;
  status: 'success' | 'failure';
  shardId?: string; // Created/affected shard ID
  error?: string;
  errorCode?: string;
  processedAt: Date;
}

/**
 * Bulk job document
 */
export interface BulkJob {
  id: string;
  partitionKey: string; // tenantId
  tenantId: string;

  // Job metadata
  jobType: BulkJobType;
  status: BulkJobStatus;

  // Progress tracking
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;

  // Results
  results: BulkJobItemResult[];

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Actor
  createdBy: string;
  createdByEmail?: string;

  // Error handling
  errorMessage?: string;

  // Cancellation
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

/**
 * Bulk upload input
 */
export interface BulkUploadInput {
  tenantId: string;
  userId: string;
  userEmail?: string;

  // Shared metadata for all files
  sharedMetadata: {
    category?: string;
    tags?: string[];
    visibility?: VisibilityLevel;
    description?: string;
  };

  // Per-file overrides
  files: Array<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    buffer: Buffer;
    // Optional per-file overrides
    metadata?: {
      name?: string;
      category?: string;
      tags?: string[];
      visibility?: VisibilityLevel;
      description?: string;
    };
  }>;
}

/**
 * Bulk delete input
 */
export interface BulkDeleteInput {
  tenantId: string;
  userId: string;
  userEmail?: string;
  documentIds: string[];
  reason?: string;
  hardDelete?: boolean; // Super admin only
}

/**
 * Bulk update input
 */
export interface BulkUpdateInput {
  tenantId: string;
  userId: string;
  userEmail?: string;
  documentIds: string[];
  updates: {
    category?: string;
    tags?: string[];
    visibility?: VisibilityLevel;
    description?: string;
  };
}

/**
 * Bulk collection assign input
 */
export interface BulkCollectionAssignInput {
  tenantId: string;
  userId: string;
  userEmail?: string;
  collectionId: string;
  documentIds: string[];
}

// ============================================================================
// TENANT SETTINGS
// ============================================================================

/**
 * Tenant document settings (nested in tenant document)
 */
export interface TenantDocumentSettings {
  // Upload limits
  maxFileSizeBytes: number; // e.g., 104857600 (100MB)
  dailyUploadLimit: number; // e.g., 1000 files/day
  monthlyUploadLimit: number; // e.g., 10000 files/month

  // Storage quota
  maxStorageSizeBytes: number; // e.g., 107374182400 (100GB)
  currentStorageUsed: number; // Updated on each upload/delete

  // Usage tracking (for rate limiting)
  dailyUploadCount: number;
  dailyUploadCountResetAt: Date;
  monthlyUploadCount: number;
  monthlyUploadCountResetAt: Date;

  // Allowed file types
  acceptedMimeTypes: string[]; // e.g., ['application/pdf', 'image/*']
  blockedMimeTypes?: string[]; // Explicit blocklist

  // Categories
  categories: DocumentCategory[];
  allowCustomCategories: boolean;

  // Tags
  controlledTags?: string[]; // null = free-form, array = controlled

  // Visibility
  defaultVisibility: VisibilityLevel;
  allowPublicDocuments: boolean;

  // Feature flags (Phase 1 - all false)
  enableVirusScanning: boolean;
  enablePIIRedaction: boolean;
  enableTextExtraction: boolean;
  enablePreviewGeneration: boolean;

  // Retention
  defaultRetentionDays: number;

  // Updated tracking
  updatedAt: Date;
  updatedBy: string;
  updatedByEmail?: string;
}

/**
 * Super admin global document settings
 */
export interface GlobalDocumentSettings {
  id: string; // 'document-global-settings'
  configType: string; // 'documents'
  partitionKey: string; // 'documents'

  // Hard limits
  globalMaxFileSizeBytes: number; // e.g., 524288000 (500MB)
  globalMaxStorageSizeBytes: number; // e.g., 1099511627776 (1TB per tenant)

  // Default tenant settings
  defaultTenantMaxFileSizeBytes: number; // e.g., 104857600 (100MB)
  defaultTenantMaxStorageBytes: number; // e.g., 107374182400 (100GB)
  defaultDailyUploadLimit: number; // e.g., 1000
  defaultMonthlyUploadLimit: number; // e.g., 10000

  // System-wide lists
  systemAcceptedMimeTypes: string[];
  systemBlockedMimeTypes: string[];

  // Default categories for all tenants
  defaultCategories: DocumentCategory[];

  // Feature flags
  enableDocumentManagement: boolean;
  enableBulkOperations: boolean;
  enableCollections: boolean;

  // Retention
  defaultRetentionDays: number; // e.g., 30 days for soft delete
  hardDeleteAfterDays: number; // e.g., 30 days after soft delete

  // Updated tracking
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
  updatedByEmail?: string;
}

// ============================================================================
// WEBHOOK PAYLOADS
// ============================================================================

/**
 * Document webhook payload
 */
export interface DocumentWebhookPayload {
  eventId: string;
  eventType: string;
  timestamp: string; // ISO 8601
  tenantId: string;

  // Actor
  userId: string;
  userEmail?: string;

  // Document data
  document: {
    id: string;
    name: string;
    documentType?: string;
    category?: string;
    fileSize: number;
    mimeType: string;
    visibility: string;
    tags: string[];
  };

  // Context
  collection?: {
    id: string;
    name: string;
  };
  previousVersion?: {
    version: number;
  };

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Collection webhook payload
 */
export interface CollectionWebhookPayload {
  eventId: string;
  eventType: string;
  timestamp: string; // ISO 8601
  tenantId: string;

  // Actor
  userId: string;
  userEmail?: string;

  // Collection data
  collection: {
    id: string;
    name: string;
    collectionType: string;
    visibility: string;
    documentCount: number;
  };

  // Context
  affectedDocuments?: Array<{
    id: string;
    name: string;
  }>;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Bulk operation webhook payload
 */
export interface BulkOperationWebhookPayload {
  eventId: string;
  eventType: string;
  timestamp: string; // ISO 8601
  tenantId: string;

  // Actor
  userId: string;
  userEmail?: string;

  // Job data
  job: {
    id: string;
    jobType: string;
    status: string;
    totalItems: number;
    successCount: number;
    failureCount: number;
  };

  // Metadata
  metadata?: Record<string, any>;
}

// ============================================================================
// UPLOAD INTERFACES
// ============================================================================

/**
 * Chunked upload session
 */
export interface ChunkedUploadSession {
  sessionId: string;
  tenantId: string;
  userId: string;

  // File metadata
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;

  // Upload tracking
  uploadedChunks: number[];
  blockIds: string[];

  // Blob info
  containerName: string;
  blobPath: string;

  // Document metadata
  documentMetadata: {
    name?: string;
    category?: string;
    tags?: string[];
    visibility?: VisibilityLevel;
    description?: string;
  };

  // Session timing
  createdAt: Date;
  expiresAt: Date;
  lastChunkAt?: Date;
}

/**
 * Upload validation result
 */
export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];

  // Quota information
  tenantStorageUsed?: number;
  tenantStorageLimit?: number;
  tenantStorageAvailable?: number;

  // Rate limit information
  dailyUploadCount?: number;
  dailyUploadLimit?: number;
  monthlyUploadCount?: number;
  monthlyUploadLimit?: number;
}

/**
 * Document upload result
 */
export interface DocumentUploadResult {
  success: boolean;
  shard?: DocumentShard;
  error?: string;
  errorCode?: string;

  // Upload details
  storagePath?: string;
  fileSize?: number;
  uploadDurationMs?: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create document request
 */
export interface CreateDocumentRequest {
  // File will come from multipart/form-data
  name?: string; // Override filename
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: VisibilityLevel;
  documentType?: string;
  projectId?: string;
}

/**
 * Update document request
 */
export interface UpdateDocumentRequest {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: VisibilityLevel;
  documentType?: string;
}

/**
 * Download document response
 */
export interface DownloadDocumentResponse {
  downloadUrl: string; // SAS URL
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt: string; // ISO 8601
}

/**
 * List documents query
 */
export interface ListDocumentsQuery {
  tenantId: string;

  // Filters
  category?: string;
  tags?: string[];
  visibility?: VisibilityLevel;
  status?: DocumentStatus;
  documentType?: string;

  // Search
  search?: string;

  // Pagination
  limit?: number;
  offset?: number;
  continuationToken?: string;

  // Sorting
  sortBy?: 'name' | 'uploadedAt' | 'fileSize' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * List documents response
 */
export interface ListDocumentsResponse {
  documents: DocumentShard[];
  total: number;
  limit: number;
  offset: number;
  continuationToken?: string;
  hasMore: boolean;
}

/**
 * Document statistics
 */
export interface DocumentStatistics {
  totalDocuments: number;
  totalSize: number;
  byCategory: Record<string, number>;
  byVisibility: Record<string, number>;
  byDocumentType: Record<string, number>;
  byStatus: Record<string, number>;
  recentUploads: number; // Last 24 hours
  storageUsedPercentage: number;
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

/**
 * MIME type validation rules
 */
export interface MimeTypeValidation {
  allowed: string[]; // Can include wildcards like 'image/*'
  blocked: string[];
}

/**
 * File size validation rules
 */
export interface FileSizeValidation {
  maxBytes: number;
  globalMaxBytes: number;
}

/**
 * Quota validation rules
 */
export interface QuotaValidation {
  currentStorageBytes: number;
  maxStorageBytes: number;
  dailyUploadCount: number;
  dailyUploadLimit: number;
  monthlyUploadCount: number;
  monthlyUploadLimit: number;
}
