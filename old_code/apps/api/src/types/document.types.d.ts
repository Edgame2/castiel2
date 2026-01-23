/**
 * Document Management Types & Interfaces
 * Phase 1: Upload, Storage, and Management
 */
import { Shard } from './shard.types.js';
/**
 * Document status lifecycle
 */
export declare enum DocumentStatus {
    ACTIVE = "active",
    DELETED = "deleted",
    ARCHIVED = "archived",
    PROCESSING = "processing",
    ERROR = "error"
}
/**
 * Document visibility levels
 */
export declare enum VisibilityLevel {
    PUBLIC = "public",
    INTERNAL = "internal",
    CONFIDENTIAL = "confidential"
}
/**
 * Storage providers
 */
export declare enum StorageProvider {
    AZURE = "azure",
    AWS = "aws",
    GCP = "gcp"
}
/**
 * Collection types
 */
export declare enum CollectionType {
    FOLDER = "folder",
    TAG = "tag",
    SMART = "smart"
}
/**
 * Bulk job status
 */
export declare enum BulkJobStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
/**
 * Bulk job types
 */
export declare enum BulkJobType {
    BULK_UPLOAD = "bulk-upload",
    BULK_DELETE = "bulk-delete",
    BULK_UPDATE = "bulk-update",
    BULK_COLLECTION_ASSIGN = "bulk-collection-assign"
}
/**
 * Document audit event types
 */
export declare enum DocumentAuditEventType {
    DOCUMENT_UPLOADED = "document_uploaded",
    DOCUMENT_DOWNLOADED = "document_downloaded",
    DOCUMENT_VIEWED = "document_viewed",
    DOCUMENT_UPDATED = "document_updated",
    DOCUMENT_DELETED = "document_deleted",
    DOCUMENT_RESTORED = "document_restored",
    DOCUMENT_VERSION_CREATED = "document_version_created",
    DOCUMENT_VERSION_RESTORED = "document_version_restored",
    DOCUMENT_MOVED_TO_COLLECTION = "document_moved_to_collection",
    DOCUMENT_REMOVED_FROM_COLLECTION = "document_removed_from_collection",
    DOCUMENT_PERMISSION_CHANGED = "document_permission_changed",
    DOCUMENT_METADATA_UPDATED = "document_metadata_updated",
    COLLECTION_CREATED = "collection_created",
    COLLECTION_UPDATED = "collection_updated",
    COLLECTION_DELETED = "collection_deleted",
    BULK_UPLOAD_STARTED = "bulk_upload_started",
    BULK_UPLOAD_COMPLETED = "bulk_upload_completed",
    BULK_DELETE_STARTED = "bulk_delete_started",
    BULK_DELETE_COMPLETED = "bulk_delete_completed",
    BULK_UPDATE = "bulk_update",
    BULK_COLLECTION_ASSIGN = "bulk_collection_assign",
    DOCUMENT_SETTINGS_UPDATED = "document_settings_updated",
    CATEGORY_CREATED = "category_created",
    CATEGORY_UPDATED = "category_updated"
}
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
    name: string;
    description?: string;
    documentType?: string;
    mimeType: string;
    fileSize: number;
    storageProvider: StorageProvider;
    storagePath: string;
    thumbnailPath?: string;
    previewPath?: string;
    category?: string;
    tags: string[];
    visibility: VisibilityLevel;
    retentionPolicyId?: string;
    retentionUntil?: Date;
    version: number;
    versionHistory: DocumentVersionEntry[];
    scanStatus?: 'pending' | 'clean' | 'infected' | 'error';
    scanTimestamp?: Date;
    extractionStatus?: 'pending' | 'completed' | 'failed';
    extractionTimestamp?: Date;
    uploadedBy: string;
    uploadedByEmail?: string;
    uploadedAt: Date;
    deletedBy?: string;
    deletedAt?: Date;
    deletionReason?: string;
}
/**
 * Document unstructured data (large content)
 */
export interface DocumentUnstructuredData {
    extractedText?: string;
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
    name: string;
    description?: string;
    collectionType: CollectionType;
    documentIds: string[];
    documentNames: string[];
    query?: CollectionQuery;
    visibility: VisibilityLevel;
    tags: string[];
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
/**
 * Bulk job item result
 */
export interface BulkJobItemResult {
    itemId: string;
    itemName?: string;
    status: 'success' | 'failure';
    shardId?: string;
    error?: string;
    errorCode?: string;
    processedAt: Date;
}
/**
 * Bulk job document
 */
export interface BulkJob {
    id: string;
    partitionKey: string;
    tenantId: string;
    jobType: BulkJobType;
    status: BulkJobStatus;
    totalItems: number;
    processedItems: number;
    successCount: number;
    failureCount: number;
    results: BulkJobItemResult[];
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    createdBy: string;
    createdByEmail?: string;
    errorMessage?: string;
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
    sharedMetadata: {
        category?: string;
        tags?: string[];
        visibility?: VisibilityLevel;
        description?: string;
    };
    files: Array<{
        fileName: string;
        fileSize: number;
        mimeType: string;
        buffer: Buffer;
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
    hardDelete?: boolean;
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
/**
 * Tenant document settings (nested in tenant document)
 */
export interface TenantDocumentSettings {
    maxFileSizeBytes: number;
    dailyUploadLimit: number;
    monthlyUploadLimit: number;
    maxStorageSizeBytes: number;
    currentStorageUsed: number;
    dailyUploadCount: number;
    dailyUploadCountResetAt: Date;
    monthlyUploadCount: number;
    monthlyUploadCountResetAt: Date;
    acceptedMimeTypes: string[];
    blockedMimeTypes?: string[];
    categories: DocumentCategory[];
    allowCustomCategories: boolean;
    controlledTags?: string[];
    defaultVisibility: VisibilityLevel;
    allowPublicDocuments: boolean;
    enableVirusScanning: boolean;
    enablePIIRedaction: boolean;
    enableTextExtraction: boolean;
    enablePreviewGeneration: boolean;
    defaultRetentionDays: number;
    updatedAt: Date;
    updatedBy: string;
    updatedByEmail?: string;
}
/**
 * Super admin global document settings
 */
export interface GlobalDocumentSettings {
    id: string;
    configType: string;
    partitionKey: string;
    globalMaxFileSizeBytes: number;
    globalMaxStorageSizeBytes: number;
    defaultTenantMaxFileSizeBytes: number;
    defaultTenantMaxStorageBytes: number;
    defaultDailyUploadLimit: number;
    defaultMonthlyUploadLimit: number;
    systemAcceptedMimeTypes: string[];
    systemBlockedMimeTypes: string[];
    defaultCategories: DocumentCategory[];
    enableDocumentManagement: boolean;
    enableBulkOperations: boolean;
    enableCollections: boolean;
    defaultRetentionDays: number;
    hardDeleteAfterDays: number;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;
    updatedByEmail?: string;
}
/**
 * Document webhook payload
 */
export interface DocumentWebhookPayload {
    eventId: string;
    eventType: string;
    timestamp: string;
    tenantId: string;
    userId: string;
    userEmail?: string;
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
    collection?: {
        id: string;
        name: string;
    };
    previousVersion?: {
        version: number;
    };
    metadata?: Record<string, any>;
}
/**
 * Collection webhook payload
 */
export interface CollectionWebhookPayload {
    eventId: string;
    eventType: string;
    timestamp: string;
    tenantId: string;
    userId: string;
    userEmail?: string;
    collection: {
        id: string;
        name: string;
        collectionType: string;
        visibility: string;
        documentCount: number;
    };
    affectedDocuments?: Array<{
        id: string;
        name: string;
    }>;
    metadata?: Record<string, any>;
}
/**
 * Bulk operation webhook payload
 */
export interface BulkOperationWebhookPayload {
    eventId: string;
    eventType: string;
    timestamp: string;
    tenantId: string;
    userId: string;
    userEmail?: string;
    job: {
        id: string;
        jobType: string;
        status: string;
        totalItems: number;
        successCount: number;
        failureCount: number;
    };
    metadata?: Record<string, any>;
}
/**
 * Chunked upload session
 */
export interface ChunkedUploadSession {
    sessionId: string;
    tenantId: string;
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    totalChunks: number;
    chunkSize: number;
    uploadedChunks: number[];
    blockIds: string[];
    containerName: string;
    blobPath: string;
    documentMetadata: {
        name?: string;
        category?: string;
        tags?: string[];
        visibility?: VisibilityLevel;
        description?: string;
    };
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
    tenantStorageUsed?: number;
    tenantStorageLimit?: number;
    tenantStorageAvailable?: number;
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
    storagePath?: string;
    fileSize?: number;
    uploadDurationMs?: number;
}
/**
 * Create document request
 */
export interface CreateDocumentRequest {
    name?: string;
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
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expiresAt: string;
}
/**
 * List documents query
 */
export interface ListDocumentsQuery {
    tenantId: string;
    category?: string;
    tags?: string[];
    visibility?: VisibilityLevel;
    status?: DocumentStatus;
    documentType?: string;
    search?: string;
    limit?: number;
    offset?: number;
    continuationToken?: string;
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
    recentUploads: number;
    storageUsedPercentage: number;
}
/**
 * MIME type validation rules
 */
export interface MimeTypeValidation {
    allowed: string[];
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
//# sourceMappingURL=document.types.d.ts.map