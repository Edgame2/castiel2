/**
 * Document Management Audit Types
 * Event types and payloads for document upload, download, deletion, and permission changes
 */

export enum DocumentAuditEventType {
  // Document lifecycle
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DOCUMENT_VIEWED = 'document_viewed',
  DOCUMENT_UPDATED = 'document_updated',
  DOCUMENT_DELETED = 'document_deleted',
  DOCUMENT_RESTORED = 'document_restored',

  // Versioning
  DOCUMENT_VERSION_CREATED = 'document_version_created',
  DOCUMENT_VERSION_RESTORED = 'document_version_restored',

  // Collections
  DOCUMENT_MOVED_TO_COLLECTION = 'document_moved_to_collection',
  DOCUMENT_REMOVED_FROM_COLLECTION = 'document_removed_from_collection',

  // Permissions & Metadata
  DOCUMENT_PERMISSION_CHANGED = 'document_permission_changed',
  DOCUMENT_METADATA_UPDATED = 'document_metadata_updated',
  DOCUMENT_ACL_UPDATED = 'document_acl_updated',

  // Collections
  COLLECTION_CREATED = 'collection_created',
  COLLECTION_UPDATED = 'collection_updated',
  COLLECTION_DELETED = 'collection_deleted',

  // Bulk operations
  BULK_UPLOAD_STARTED = 'bulk_upload_started',
  BULK_UPLOAD_COMPLETED = 'bulk_upload_completed',
  BULK_DELETE_STARTED = 'bulk_delete_started',
  BULK_DELETE_COMPLETED = 'bulk_delete_completed',

  // Tenant settings
  DOCUMENT_SETTINGS_UPDATED = 'document_settings_updated',
  CATEGORY_CREATED = 'category_created',
  CATEGORY_UPDATED = 'category_updated',
  CATEGORY_DELETED = 'category_deleted',
}

export interface DocumentAuditContext {
  tenantId: string;
  userId: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface DocumentUploadAuditPayload {
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  tags?: string[];
  visibility: string;
  uploadDurationMs?: number;
}

export interface DocumentDownloadAuditPayload {
  documentId: string;
  fileName: string;
  fileSize: number;
  downloadedBytes?: number;
  downloadDurationMs?: number;
}

export interface DocumentDeleteAuditPayload {
  documentId: string;
  fileName: string;
  reason?: string;
  softDelete: boolean;
}

export interface DocumentPermissionChangeAuditPayload {
  documentId: string;
  fileName: string;
  previousVisibility?: string;
  newVisibility?: string;
  aclChanges?: {
    added?: Array<{ principalId: string; role: string }>;
    removed?: Array<{ principalId: string; role: string }>;
    modified?: Array<{ principalId: string; oldRole: string; newRole: string }>;
  };
}

export interface DocumentMetadataAuditPayload {
  documentId: string;
  fileName: string;
  changes: {
    [key: string]: { old: any; new: any };
  };
}

export interface CollectionAuditPayload {
  collectionId: string;
  collectionName: string;
  collectionType?: string;
  documentCount?: number;
  documentIds?: string[];
}

export interface BulkOperationAuditPayload {
  jobId: string;
  operationType: 'upload' | 'delete' | 'update';
  totalItems: number;
  successCount?: number;
  failureCount?: number;
  durationMs?: number;
}

export interface TenantSettingsAuditPayload {
  setting: string;
  previousValue?: any;
  newValue: any;
  affectedAreas?: string[];
}

export interface DocumentAuditLog {
  eventId: string;
  eventType: DocumentAuditEventType;
  timestamp: string; // ISO 8601
  tenantId: string;
  userId: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  resourceId: string; // documentId or collectionId
  resourceType: 'document' | 'collection' | 'settings';
  resourceName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'success' | 'failure';
  payload: any;
  errorMessage?: string;
  metadata?: Record<string, any>;
}
