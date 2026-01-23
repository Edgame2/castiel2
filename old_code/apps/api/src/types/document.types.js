/**
 * Document Management Types & Interfaces
 * Phase 1: Upload, Storage, and Management
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Document status lifecycle
 */
export var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["ACTIVE"] = "active";
    DocumentStatus["DELETED"] = "deleted";
    DocumentStatus["ARCHIVED"] = "archived";
    DocumentStatus["PROCESSING"] = "processing";
    DocumentStatus["ERROR"] = "error";
})(DocumentStatus || (DocumentStatus = {}));
/**
 * Document visibility levels
 */
export var VisibilityLevel;
(function (VisibilityLevel) {
    VisibilityLevel["PUBLIC"] = "public";
    VisibilityLevel["INTERNAL"] = "internal";
    VisibilityLevel["CONFIDENTIAL"] = "confidential";
})(VisibilityLevel || (VisibilityLevel = {}));
/**
 * Storage providers
 */
export var StorageProvider;
(function (StorageProvider) {
    StorageProvider["AZURE"] = "azure";
    StorageProvider["AWS"] = "aws";
    StorageProvider["GCP"] = "gcp";
})(StorageProvider || (StorageProvider = {}));
/**
 * Collection types
 */
export var CollectionType;
(function (CollectionType) {
    CollectionType["FOLDER"] = "folder";
    CollectionType["TAG"] = "tag";
    CollectionType["SMART"] = "smart";
})(CollectionType || (CollectionType = {}));
/**
 * Bulk job status
 */
export var BulkJobStatus;
(function (BulkJobStatus) {
    BulkJobStatus["PENDING"] = "pending";
    BulkJobStatus["PROCESSING"] = "processing";
    BulkJobStatus["COMPLETED"] = "completed";
    BulkJobStatus["FAILED"] = "failed";
    BulkJobStatus["CANCELLED"] = "cancelled";
})(BulkJobStatus || (BulkJobStatus = {}));
/**
 * Bulk job types
 */
export var BulkJobType;
(function (BulkJobType) {
    BulkJobType["BULK_UPLOAD"] = "bulk-upload";
    BulkJobType["BULK_DELETE"] = "bulk-delete";
    BulkJobType["BULK_UPDATE"] = "bulk-update";
    BulkJobType["BULK_COLLECTION_ASSIGN"] = "bulk-collection-assign";
})(BulkJobType || (BulkJobType = {}));
/**
 * Document audit event types
 */
export var DocumentAuditEventType;
(function (DocumentAuditEventType) {
    DocumentAuditEventType["DOCUMENT_UPLOADED"] = "document_uploaded";
    DocumentAuditEventType["DOCUMENT_DOWNLOADED"] = "document_downloaded";
    DocumentAuditEventType["DOCUMENT_VIEWED"] = "document_viewed";
    DocumentAuditEventType["DOCUMENT_UPDATED"] = "document_updated";
    DocumentAuditEventType["DOCUMENT_DELETED"] = "document_deleted";
    DocumentAuditEventType["DOCUMENT_RESTORED"] = "document_restored";
    DocumentAuditEventType["DOCUMENT_VERSION_CREATED"] = "document_version_created";
    DocumentAuditEventType["DOCUMENT_VERSION_RESTORED"] = "document_version_restored";
    DocumentAuditEventType["DOCUMENT_MOVED_TO_COLLECTION"] = "document_moved_to_collection";
    DocumentAuditEventType["DOCUMENT_REMOVED_FROM_COLLECTION"] = "document_removed_from_collection";
    DocumentAuditEventType["DOCUMENT_PERMISSION_CHANGED"] = "document_permission_changed";
    DocumentAuditEventType["DOCUMENT_METADATA_UPDATED"] = "document_metadata_updated";
    // Collection events
    DocumentAuditEventType["COLLECTION_CREATED"] = "collection_created";
    DocumentAuditEventType["COLLECTION_UPDATED"] = "collection_updated";
    DocumentAuditEventType["COLLECTION_DELETED"] = "collection_deleted";
    // Bulk operation events
    DocumentAuditEventType["BULK_UPLOAD_STARTED"] = "bulk_upload_started";
    DocumentAuditEventType["BULK_UPLOAD_COMPLETED"] = "bulk_upload_completed";
    DocumentAuditEventType["BULK_DELETE_STARTED"] = "bulk_delete_started";
    DocumentAuditEventType["BULK_DELETE_COMPLETED"] = "bulk_delete_completed";
    DocumentAuditEventType["BULK_UPDATE"] = "bulk_update";
    DocumentAuditEventType["BULK_COLLECTION_ASSIGN"] = "bulk_collection_assign";
    // Tenant settings
    DocumentAuditEventType["DOCUMENT_SETTINGS_UPDATED"] = "document_settings_updated";
    DocumentAuditEventType["CATEGORY_CREATED"] = "category_created";
    DocumentAuditEventType["CATEGORY_UPDATED"] = "category_updated";
})(DocumentAuditEventType || (DocumentAuditEventType = {}));
//# sourceMappingURL=document.types.js.map