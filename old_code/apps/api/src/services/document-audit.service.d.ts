/**
 * Document Audit Service
 * Wrapper around AuditIntegrationService for document management events
 */
import { AuditIntegrationService } from './audit-integration.service';
import { DocumentAuditEventType, DocumentAuditContext, DocumentUploadAuditPayload, DocumentDownloadAuditPayload, DocumentDeleteAuditPayload, DocumentPermissionChangeAuditPayload, DocumentMetadataAuditPayload, CollectionAuditPayload, BulkOperationAuditPayload, TenantSettingsAuditPayload } from '../types/document-audit.types';
export declare class DocumentAuditService {
    private auditService;
    constructor(auditService: AuditIntegrationService);
    private logDocumentEvent;
    logUpload(context: DocumentAuditContext, documentId: string, fileName: string, payload: DocumentUploadAuditPayload): Promise<void>;
    logDownload(context: DocumentAuditContext, documentId: string, fileName: string, payload: DocumentDownloadAuditPayload): Promise<void>;
    logView(context: DocumentAuditContext, documentId: string, fileName: string): Promise<void>;
    logUpdate(context: DocumentAuditContext, documentId: string, fileName: string, payload: DocumentMetadataAuditPayload): Promise<void>;
    logDelete(context: DocumentAuditContext, documentId: string, fileName: string, payload: DocumentDeleteAuditPayload): Promise<void>;
    logRestore(context: DocumentAuditContext, documentId: string, fileName: string): Promise<void>;
    logPermissionChange(context: DocumentAuditContext, documentId: string, fileName: string, payload: DocumentPermissionChangeAuditPayload): Promise<void>;
    logACLUpdate(context: DocumentAuditContext, documentId: string, fileName: string, changes: any): Promise<void>;
    logVersionCreated(context: DocumentAuditContext, documentId: string, fileName: string, version: string): Promise<void>;
    logVersionRestored(context: DocumentAuditContext, documentId: string, fileName: string, restoredVersion: string): Promise<void>;
    logAddedToCollection(context: DocumentAuditContext, documentId: string, fileName: string, collectionId: string, collectionName: string): Promise<void>;
    logRemovedFromCollection(context: DocumentAuditContext, documentId: string, fileName: string, collectionId: string, collectionName: string): Promise<void>;
    logCollectionCreated(context: DocumentAuditContext, collectionId: string, collectionName: string, payload: CollectionAuditPayload): Promise<void>;
    logCollectionUpdated(context: DocumentAuditContext, collectionId: string, collectionName: string, changes: any): Promise<void>;
    logCollectionDeleted(context: DocumentAuditContext, collectionId: string, collectionName: string): Promise<void>;
    logBulkOperationStarted(context: DocumentAuditContext, jobId: string, operationType: 'upload' | 'delete' | 'update', totalItems: number): Promise<void>;
    logBulkOperationCompleted(context: DocumentAuditContext, jobId: string, operationType: 'upload' | 'delete' | 'update', payload: BulkOperationAuditPayload): Promise<void>;
    logDocumentSettingsUpdated(context: DocumentAuditContext, tenantId: string, setting: string, payload: TenantSettingsAuditPayload): Promise<void>;
    logCategoryCreated(context: DocumentAuditContext, tenantId: string, categoryId: string, categoryName: string): Promise<void>;
    logCategoryUpdated(context: DocumentAuditContext, tenantId: string, categoryId: string, categoryName: string, changes: any): Promise<void>;
    logOperationFailure(eventType: DocumentAuditEventType, context: DocumentAuditContext, resourceId: string, resourceName: string, resourceType: 'document' | 'collection' | 'settings', error: Error): Promise<void>;
}
//# sourceMappingURL=document-audit.service.d.ts.map