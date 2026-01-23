// @ts-nocheck
/**
 * Document Audit Service
 * Wrapper around AuditIntegrationService for document management events
 */

import { AuditIntegrationService } from './audit-integration.service';
import {
  DocumentAuditEventType,
  DocumentAuditContext,
  DocumentAuditLog,
  DocumentUploadAuditPayload,
  DocumentDownloadAuditPayload,
  DocumentDeleteAuditPayload,
  DocumentPermissionChangeAuditPayload,
  DocumentMetadataAuditPayload,
  CollectionAuditPayload,
  BulkOperationAuditPayload,
  TenantSettingsAuditPayload,
} from '../types/document-audit.types';
import { v4 as uuidv4 } from 'uuid';

export class DocumentAuditService {
  constructor(private auditService: AuditIntegrationService) {}

  private async logDocumentEvent(
    eventType: DocumentAuditEventType,
    context: DocumentAuditContext,
    resourceId: string,
    resourceName: string,
    resourceType: 'document' | 'collection' | 'settings',
    payload: any,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info',
    status: 'success' | 'failure' = 'success',
    errorMessage?: string,
  ): Promise<void> {
    const auditLog: DocumentAuditLog = {
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
      action: eventType as any,
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

  async logUpload(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    payload: DocumentUploadAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_UPLOADED,
      context,
      documentId,
      fileName,
      'document',
      payload,
      'info',
      'success',
    );
  }

  async logDownload(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    payload: DocumentDownloadAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_DOWNLOADED,
      context,
      documentId,
      fileName,
      'document',
      payload,
      'info',
      'success',
    );
  }

  async logView(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_VIEWED,
      context,
      documentId,
      fileName,
      'document',
      { documentId, fileName },
      'info',
      'success',
    );
  }

  async logUpdate(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    payload: DocumentMetadataAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_UPDATED,
      context,
      documentId,
      fileName,
      'document',
      payload,
      'info',
      'success',
    );
  }

  async logDelete(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    payload: DocumentDeleteAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_DELETED,
      context,
      documentId,
      fileName,
      'document',
      payload,
      'info',
      'success',
    );
  }

  async logRestore(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_RESTORED,
      context,
      documentId,
      fileName,
      'document',
      { documentId, fileName },
      'info',
      'success',
    );
  }

  async logPermissionChange(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    payload: DocumentPermissionChangeAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_PERMISSION_CHANGED,
      context,
      documentId,
      fileName,
      'document',
      payload,
      'warning',
      'success',
    );
  }

  async logACLUpdate(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    changes: any,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_ACL_UPDATED,
      context,
      documentId,
      fileName,
      'document',
      { aclChanges: changes },
      'warning',
      'success',
    );
  }

  async logVersionCreated(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    version: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_VERSION_CREATED,
      context,
      documentId,
      fileName,
      'document',
      { version },
      'info',
      'success',
    );
  }

  async logVersionRestored(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    restoredVersion: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_VERSION_RESTORED,
      context,
      documentId,
      fileName,
      'document',
      { restoredVersion },
      'warning',
      'success',
    );
  }

  async logAddedToCollection(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    collectionId: string,
    collectionName: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_MOVED_TO_COLLECTION,
      context,
      documentId,
      fileName,
      'document',
      { collectionId, collectionName },
      'info',
      'success',
    );
  }

  async logRemovedFromCollection(
    context: DocumentAuditContext,
    documentId: string,
    fileName: string,
    collectionId: string,
    collectionName: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_REMOVED_FROM_COLLECTION,
      context,
      documentId,
      fileName,
      'document',
      { collectionId, collectionName },
      'info',
      'success',
    );
  }

  async logCollectionCreated(
    context: DocumentAuditContext,
    collectionId: string,
    collectionName: string,
    payload: CollectionAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.COLLECTION_CREATED,
      context,
      collectionId,
      collectionName,
      'collection',
      payload,
      'info',
      'success',
    );
  }

  async logCollectionUpdated(
    context: DocumentAuditContext,
    collectionId: string,
    collectionName: string,
    changes: any,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.COLLECTION_UPDATED,
      context,
      collectionId,
      collectionName,
      'collection',
      changes,
      'info',
      'success',
    );
  }

  async logCollectionDeleted(
    context: DocumentAuditContext,
    collectionId: string,
    collectionName: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.COLLECTION_DELETED,
      context,
      collectionId,
      collectionName,
      'collection',
      { collectionId, collectionName },
      'info',
      'success',
    );
  }

  async logBulkOperationStarted(
    context: DocumentAuditContext,
    jobId: string,
    operationType: 'upload' | 'delete' | 'update',
    totalItems: number,
  ): Promise<void> {
    const payload: BulkOperationAuditPayload = {
      jobId,
      operationType,
      totalItems,
    };
    await this.logDocumentEvent(
      operationType === 'upload'
        ? DocumentAuditEventType.BULK_UPLOAD_STARTED
        : operationType === 'delete'
          ? DocumentAuditEventType.BULK_DELETE_STARTED
          : DocumentAuditEventType.BULK_UPLOAD_STARTED,
      context,
      jobId,
      `Bulk ${operationType}`,
      'document',
      payload,
      'info',
      'success',
    );
  }

  async logBulkOperationCompleted(
    context: DocumentAuditContext,
    jobId: string,
    operationType: 'upload' | 'delete' | 'update',
    payload: BulkOperationAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      operationType === 'upload'
        ? DocumentAuditEventType.BULK_UPLOAD_COMPLETED
        : operationType === 'delete'
          ? DocumentAuditEventType.BULK_DELETE_COMPLETED
          : DocumentAuditEventType.BULK_UPLOAD_COMPLETED,
      context,
      jobId,
      `Bulk ${operationType}`,
      'document',
      payload,
      payload.failureCount && payload.failureCount > 0 ? 'warning' : 'info',
      'success',
    );
  }

  async logDocumentSettingsUpdated(
    context: DocumentAuditContext,
    tenantId: string,
    setting: string,
    payload: TenantSettingsAuditPayload,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.DOCUMENT_SETTINGS_UPDATED,
      context,
      tenantId,
      `Settings: ${setting}`,
      'settings',
      payload,
      'warning',
      'success',
    );
  }

  async logCategoryCreated(
    context: DocumentAuditContext,
    tenantId: string,
    categoryId: string,
    categoryName: string,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.CATEGORY_CREATED,
      context,
      categoryId,
      categoryName,
      'settings',
      { categoryId, categoryName },
      'info',
      'success',
    );
  }

  async logCategoryUpdated(
    context: DocumentAuditContext,
    tenantId: string,
    categoryId: string,
    categoryName: string,
    changes: any,
  ): Promise<void> {
    await this.logDocumentEvent(
      DocumentAuditEventType.CATEGORY_UPDATED,
      context,
      categoryId,
      categoryName,
      'settings',
      changes,
      'info',
      'success',
    );
  }

  async logOperationFailure(
    eventType: DocumentAuditEventType,
    context: DocumentAuditContext,
    resourceId: string,
    resourceName: string,
    resourceType: 'document' | 'collection' | 'settings',
    error: Error,
  ): Promise<void> {
    await this.logDocumentEvent(
      eventType,
      context,
      resourceId,
      resourceName,
      resourceType,
      { error: error.message, stack: error.stack },
      'error',
      'failure',
      error.message,
    );
  }
}
