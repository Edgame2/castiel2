/**
 * Document Management Audit Types
 * Event types and payloads for document upload, download, deletion, and permission changes
 */
export var DocumentAuditEventType;
(function (DocumentAuditEventType) {
    // Document lifecycle
    DocumentAuditEventType["DOCUMENT_UPLOADED"] = "document_uploaded";
    DocumentAuditEventType["DOCUMENT_DOWNLOADED"] = "document_downloaded";
    DocumentAuditEventType["DOCUMENT_VIEWED"] = "document_viewed";
    DocumentAuditEventType["DOCUMENT_UPDATED"] = "document_updated";
    DocumentAuditEventType["DOCUMENT_DELETED"] = "document_deleted";
    DocumentAuditEventType["DOCUMENT_RESTORED"] = "document_restored";
    // Versioning
    DocumentAuditEventType["DOCUMENT_VERSION_CREATED"] = "document_version_created";
    DocumentAuditEventType["DOCUMENT_VERSION_RESTORED"] = "document_version_restored";
    // Collections
    DocumentAuditEventType["DOCUMENT_MOVED_TO_COLLECTION"] = "document_moved_to_collection";
    DocumentAuditEventType["DOCUMENT_REMOVED_FROM_COLLECTION"] = "document_removed_from_collection";
    // Permissions & Metadata
    DocumentAuditEventType["DOCUMENT_PERMISSION_CHANGED"] = "document_permission_changed";
    DocumentAuditEventType["DOCUMENT_METADATA_UPDATED"] = "document_metadata_updated";
    DocumentAuditEventType["DOCUMENT_ACL_UPDATED"] = "document_acl_updated";
    // Collections
    DocumentAuditEventType["COLLECTION_CREATED"] = "collection_created";
    DocumentAuditEventType["COLLECTION_UPDATED"] = "collection_updated";
    DocumentAuditEventType["COLLECTION_DELETED"] = "collection_deleted";
    // Bulk operations
    DocumentAuditEventType["BULK_UPLOAD_STARTED"] = "bulk_upload_started";
    DocumentAuditEventType["BULK_UPLOAD_COMPLETED"] = "bulk_upload_completed";
    DocumentAuditEventType["BULK_DELETE_STARTED"] = "bulk_delete_started";
    DocumentAuditEventType["BULK_DELETE_COMPLETED"] = "bulk_delete_completed";
    // Tenant settings
    DocumentAuditEventType["DOCUMENT_SETTINGS_UPDATED"] = "document_settings_updated";
    DocumentAuditEventType["CATEGORY_CREATED"] = "category_created";
    DocumentAuditEventType["CATEGORY_UPDATED"] = "category_updated";
    DocumentAuditEventType["CATEGORY_DELETED"] = "category_deleted";
})(DocumentAuditEventType || (DocumentAuditEventType = {}));
//# sourceMappingURL=document-audit.types.js.map