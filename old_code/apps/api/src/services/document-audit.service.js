/**
 * Document Audit Service
 * Wrapper around AuditIntegrationService for document management events
 */
import { DocumentAuditEventType, } from '../types/document-audit.types';
import { v4 as uuidv4 } from 'uuid';
export class DocumentAuditService {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    async logDocumentEvent(eventType, context, resourceId, resourceName, resourceType, payload, severity = 'info', status = 'success', errorMessage) {
        const auditLog = {
            eventId: uuidv4(),
            eventType,
            timestamp: new Date().toISOString(),
            tenantId: context.tenantId,
            userId: context.userId,
            userEmail: context.userEmail,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            sessionId: context.sessionId,
            resourceId,
            resourceType,
            resourceName,
            severity,
            status,
            payload,
            errorMessage,
        };
        // Log using existing audit integration service
        await this.auditService.logAudit({
            tenantId: context.tenantId,
            userId: context.userId,
            action: eventType,
            resourceType: 'DOCUMENT',
            resourceId,
            resourceName,
            severity: severity === 'critical' ? 'CRITICAL' : 'INFO',
            status: status === 'success' ? 'SUCCESS' : 'FAILURE',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            sessionId: context.sessionId,
            metadata: auditLog,
        });
    }
    async logUpload(context, documentId, fileName, payload) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_UPLOADED, context, documentId, fileName, 'document', payload, 'info', 'success');
    }
    async logDownload(context, documentId, fileName, payload) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_DOWNLOADED, context, documentId, fileName, 'document', payload, 'info', 'success');
    }
    async logView(context, documentId, fileName) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_VIEWED, context, documentId, fileName, 'document', { documentId, fileName }, 'info', 'success');
    }
    async logUpdate(context, documentId, fileName, payload) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_UPDATED, context, documentId, fileName, 'document', payload, 'info', 'success');
    }
    async logDelete(context, documentId, fileName, payload) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_DELETED, context, documentId, fileName, 'document', payload, 'info', 'success');
    }
    async logRestore(context, documentId, fileName) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_RESTORED, context, documentId, fileName, 'document', { documentId, fileName }, 'info', 'success');
    }
    async logPermissionChange(context, documentId, fileName, payload) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_PERMISSION_CHANGED, context, documentId, fileName, 'document', payload, 'warning', 'success');
    }
    async logACLUpdate(context, documentId, fileName, changes) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_ACL_UPDATED, context, documentId, fileName, 'document', { aclChanges: changes }, 'warning', 'success');
    }
    async logVersionCreated(context, documentId, fileName, version) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_VERSION_CREATED, context, documentId, fileName, 'document', { version }, 'info', 'success');
    }
    async logVersionRestored(context, documentId, fileName, restoredVersion) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_VERSION_RESTORED, context, documentId, fileName, 'document', { restoredVersion }, 'warning', 'success');
    }
    async logAddedToCollection(context, documentId, fileName, collectionId, collectionName) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_MOVED_TO_COLLECTION, context, documentId, fileName, 'document', { collectionId, collectionName }, 'info', 'success');
    }
    async logRemovedFromCollection(context, documentId, fileName, collectionId, collectionName) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_REMOVED_FROM_COLLECTION, context, documentId, fileName, 'document', { collectionId, collectionName }, 'info', 'success');
    }
    async logCollectionCreated(context, collectionId, collectionName, payload) {
        await this.logDocumentEvent(DocumentAuditEventType.COLLECTION_CREATED, context, collectionId, collectionName, 'collection', payload, 'info', 'success');
    }
    async logCollectionUpdated(context, collectionId, collectionName, changes) {
        await this.logDocumentEvent(DocumentAuditEventType.COLLECTION_UPDATED, context, collectionId, collectionName, 'collection', changes, 'info', 'success');
    }
    async logCollectionDeleted(context, collectionId, collectionName) {
        await this.logDocumentEvent(DocumentAuditEventType.COLLECTION_DELETED, context, collectionId, collectionName, 'collection', { collectionId, collectionName }, 'info', 'success');
    }
    async logBulkOperationStarted(context, jobId, operationType, totalItems) {
        const payload = {
            jobId,
            operationType,
            totalItems,
        };
        await this.logDocumentEvent(operationType === 'upload'
            ? DocumentAuditEventType.BULK_UPLOAD_STARTED
            : operationType === 'delete'
                ? DocumentAuditEventType.BULK_DELETE_STARTED
                : DocumentAuditEventType.BULK_UPLOAD_STARTED, context, jobId, `Bulk ${operationType}`, 'document', payload, 'info', 'success');
    }
    async logBulkOperationCompleted(context, jobId, operationType, payload) {
        await this.logDocumentEvent(operationType === 'upload'
            ? DocumentAuditEventType.BULK_UPLOAD_COMPLETED
            : operationType === 'delete'
                ? DocumentAuditEventType.BULK_DELETE_COMPLETED
                : DocumentAuditEventType.BULK_UPLOAD_COMPLETED, context, jobId, `Bulk ${operationType}`, 'document', payload, payload.failureCount && payload.failureCount > 0 ? 'warning' : 'info', 'success');
    }
    async logDocumentSettingsUpdated(context, tenantId, setting, payload) {
        await this.logDocumentEvent(DocumentAuditEventType.DOCUMENT_SETTINGS_UPDATED, context, tenantId, `Settings: ${setting}`, 'settings', payload, 'warning', 'success');
    }
    async logCategoryCreated(context, tenantId, categoryId, categoryName) {
        await this.logDocumentEvent(DocumentAuditEventType.CATEGORY_CREATED, context, categoryId, categoryName, 'settings', { categoryId, categoryName }, 'info', 'success');
    }
    async logCategoryUpdated(context, tenantId, categoryId, categoryName, changes) {
        await this.logDocumentEvent(DocumentAuditEventType.CATEGORY_UPDATED, context, categoryId, categoryName, 'settings', changes, 'info', 'success');
    }
    async logOperationFailure(eventType, context, resourceId, resourceName, resourceType, error) {
        await this.logDocumentEvent(eventType, context, resourceId, resourceName, resourceType, { error: error.message, stack: error.stack }, 'error', 'failure', error.message);
    }
}
//# sourceMappingURL=document-audit.service.js.map