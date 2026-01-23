// @ts-nocheck
/**
 * Document Audit Integration Adapter
 * Bridges AuditLogService (existing) and DocumentAuditService
 * Also emits audit events to configured webhooks
 */

import { AuditLogService } from '@castiel/api-core';
import { AuditWebhookEmitter, AuditWebhookPayload } from './audit-webhook-emitter.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  DocumentUploadAuditPayload,
  DocumentDownloadAuditPayload,
  DocumentDeleteAuditPayload,
} from '../types/document-audit.types.js';

/**
 * Simple wrapper using AuditLogService (no NestJS dependency)
 * Also emits to webhooks via Redis queue for async processing
 */
export class DocumentAuditIntegration {
  constructor(
    private auditLogService: AuditLogService,
    private webhookEmitter?: AuditWebhookEmitter,
    private monitoring?: IMonitoringProvider,
  ) {}

  /**
   * Log document upload
   */
  async logUpload(
    tenantId: string,
    userId: string,
    documentId: string,
    fileName: string,
    payload: DocumentUploadAuditPayload,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.uploaded',
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          fileName,
          ...payload,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event (async, non-blocking)
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${documentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.uploaded',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId,
          metadata: payload,
          status: 'success',
        });
      }
    } catch (err: any) {
      // Log error but don't break upload flow
      this.monitoring?.trackException(err as Error, { operation: 'document-audit-integration.log-upload' });
    }
  }

  /**
   * Log document download
   */
  async logDownload(
    tenantId: string,
    userId: string,
    documentId: string,
    fileName: string,
    payload: DocumentDownloadAuditPayload,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.downloaded',
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          fileName,
          ...payload,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${documentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.downloaded',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId,
          metadata: payload,
          status: 'success',
        });
      }
    } catch (err: any) {
      this.monitoring?.trackException(err as Error, { operation: 'document-audit-integration.log-download' });
    }
  }

  /**
   * Log document delete
   */
  async logDelete(
    tenantId: string,
    userId: string,
    documentId: string,
    fileName: string,
    payload: DocumentDeleteAuditPayload,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.deleted',
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          fileName,
          ...payload,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${documentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.deleted',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId,
          metadata: payload,
          status: 'success',
        });
      }
    } catch (err: any) {
      this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
        component: 'DocumentAuditIntegration',
        operation: 'logDelete',
      });
    }
  }

  /**
   * Log document view
   */
  async logView(
    tenantId: string,
    userId: string,
    documentId: string,
    fileName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.viewed',
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          fileName,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${documentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.viewed',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId,
          metadata: { fileName },
          status: 'success',
        });
      }
    } catch (err: any) {
      this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
        component: 'DocumentAuditIntegration',
        operation: 'logView',
      });
    }
  }

  /**
   * Log document update
   */
  async logUpdate(
    tenantId: string,
    userId: string,
    documentId: string,
    fileName: string,
    changes: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.updated',
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          fileName,
          changes,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${documentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.updated',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId,
          metadata: { fileName, changes },
          status: 'success',
        });
      }
    } catch (err: any) {
      this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
        component: 'DocumentAuditIntegration',
        operation: 'logUpdate',
      });
    }
  }

  /**
   * Log document restore
   */
  async logRestore(
    tenantId: string,
    userId: string,
    documentId: string,
    fileName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.restored',
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          fileName,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${documentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.restored',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId,
          metadata: { fileName },
          status: 'success',
        });
      }
    } catch (err: any) {
      this.monitoring?.trackException(err as Error, { operation: 'document-audit-integration.log-restore' });
    }
  }

  /**
   * Log permission change
   */
  async logPermissionChange(
    tenantId: string,
    userId: string,
    documentId: string,
    fileName: string,
    changes: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.permission_changed',
        resourceType: 'document',
        resourceId: documentId,
        metadata: {
          fileName,
          ...changes,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${documentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.permission_changed',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId,
          metadata: { fileName, ...changes },
          status: 'success',
        });
      }
    } catch (err: any) {
      this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
        component: 'DocumentAuditIntegration',
        operation: 'logPermissionChange',
      });
    }
  }

  /**
   * Log document duplicate
   */
  async logDuplicate(
    tenantId: string,
    userId: string,
    sourceDocumentId: string,
    duplicateDocumentId: string,
    sourceFileName: string,
    duplicateFileName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.log({
        tenantId,
        userId,
        action: 'document.duplicated',
        resourceType: 'document',
        resourceId: duplicateDocumentId,
        metadata: {
          sourceDocumentId,
          sourceFileName,
          duplicateFileName,
          ipAddress,
          userAgent,
        },
      });

      // Emit webhook event
      if (this.webhookEmitter) {
        await this.webhookEmitter.emitAuditEvent({
          id: `audit-${duplicateDocumentId}-${Date.now()}`,
          tenantId,
          userId,
          action: 'document.duplicated',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          documentId: duplicateDocumentId,
          metadata: {
            sourceDocumentId,
            sourceFileName,
            duplicateFileName,
          },
          status: 'success',
        });
      }
    } catch (err: any) {
      this.monitoring?.trackException(err instanceof Error ? err : new Error(String(err)), {
        component: 'DocumentAuditIntegration',
        operation: 'logDuplicate',
      });
    }
  }
}
