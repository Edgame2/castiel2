/**
 * Document Check Orchestrator Service
 * Orchestrates the complete document security check workflow:
 * 1. Performs security checks
 * 2. Moves blobs between containers based on check results
 * 3. Logs results to Cosmos DB (audit and notifications)
 * 4. Handles retries and error scenarios
 */

import { BlobClient, ContainerClient } from '@azure/storage-blob';
import { Container, Database } from '@azure/cosmos';
import { InvocationContext } from '@azure/functions';
import { randomUUID } from 'crypto';
import { SecurityCheckService } from './security-check.service.js';
import {
  DocumentCheckMessage,
  DocumentSecurityMetadata,
  DocumentCheckAuditLog,
  DocumentCheckNotification,
  SecurityCheckResult,
  SecurityCheckConfig,
} from '../types/document-check.types.js';

export class DocumentCheckOrchestrator {
  private readonly context: InvocationContext;
  private readonly blobQuarantineContainer: ContainerClient;
  private readonly blobDocumentsContainer: ContainerClient;
  private readonly cosmosDatabase: Database;
  private readonly cosmosAuditContainer: Container;
  private readonly cosmosNotificationsContainer: Container;
  private readonly securityCheckConfig: SecurityCheckConfig;
  private readonly maxRetries: number;

  constructor(
    context: InvocationContext,
    blobQuarantineContainer: ContainerClient,
    blobDocumentsContainer: ContainerClient,
    cosmosDatabase: Database,
    securityCheckConfig: SecurityCheckConfig,
    maxRetries: number = 3
  ) {
    this.context = context;
    this.blobQuarantineContainer = blobQuarantineContainer;
    this.blobDocumentsContainer = blobDocumentsContainer;
    this.cosmosDatabase = cosmosDatabase;
    this.cosmosAuditContainer = cosmosDatabase.container('audit');
    this.cosmosNotificationsContainer = cosmosDatabase.container('notifications');
    this.securityCheckConfig = securityCheckConfig;
    this.maxRetries = maxRetries;
  }

  /**
   * Main orchestration method for document security check
   */
  async checkAndProcessDocument(message: DocumentCheckMessage): Promise<void> {
    const startTime = Date.now();
    const documentId = randomUUID();
    const traceId = `doc-check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.context.log(
      `[${traceId}] Starting security check for ${message.documentFileName} (shardId: ${message.shardId})`
    );

    try {
      // Get blob client from quarantine container
      const blobClient = this.blobQuarantineContainer.getBlobClient(
        message.filePath
      );

      // Check if blob exists
      const exists = await blobClient.exists();
      if (!exists) {
        throw new Error(
          `Blob not found in quarantine: ${message.filePath}`
        );
      }

      // Perform security checks
      const securityCheckService = new SecurityCheckService(
        this.context,
        this.securityCheckConfig
      );

      const checkResults = await securityCheckService.performAllSecurityChecks(
        blobClient,
        message.documentFileName
      );

      const allChecksPassed =
        SecurityCheckService.allChecksPassed(checkResults);
      const overallRiskLevel =
        SecurityCheckService.getOverallRiskLevel(checkResults);

      // Create security metadata
      const securityMetadata: DocumentSecurityMetadata = {
        documentId,
        shardId: message.shardId,
        tenantId: message.tenantId,
        documentFileName: message.documentFileName,
        userId: message.userId ?? 'system',
        checkStatus: allChecksPassed ? 'passed' : 'failed',
        checksPerformed: checkResults,
        overallRiskLevel,
        checkedAt: new Date().toISOString(),
        shardMetadata: message.metadata,
      };

      // Handle check results
      if (allChecksPassed) {
        await this.moveDocumentToDocumentsContainer(
          blobClient,
          message,
          securityMetadata,
          traceId,
          startTime
        );
      } else {
        await this.handleSecurityCheckFailure(
          blobClient,
          message,
          securityMetadata,
          checkResults,
          traceId,
          startTime
        );
      }

      const duration = Date.now() - startTime;
      this.context.log(
        `[${traceId}] Document security check completed in ${duration}ms. Status: ${securityMetadata.checkStatus}, Risk Level: ${overallRiskLevel}`
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.context.error(
        `[${traceId}] Document security check failed after ${duration}ms: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Move document from quarantine to documents container
   */
  private async moveDocumentToDocumentsContainer(
    sourceBlob: BlobClient,
    message: DocumentCheckMessage,
    securityMetadata: DocumentSecurityMetadata,
    traceId: string,
    startTime: number
  ): Promise<void> {
    try {
      this.context.log(
        `[${traceId}] Moving document from quarantine to documents container: ${message.filePath}`
      );

      // Copy blob to documents container
      const destinationBlob = this.blobDocumentsContainer.getBlobClient(
        message.filePath
      );

      // Copy with metadata
      const copyPoller = await destinationBlob.beginCopyFromURL(
        sourceBlob.url,
        {
          metadata: {
            documentId: securityMetadata.documentId,
            shardId: message.shardId,
            tenantId: message.tenantId,
            checkedAt: securityMetadata.checkedAt,
            riskLevel: securityMetadata.overallRiskLevel,
          },
        }
      );

      await copyPoller.pollUntilDone();

      // Delete from quarantine
      await sourceBlob.delete();

      securityMetadata.movedAt = new Date().toISOString();

      // Log to audit
      await this.logToAuditContainer(
        securityMetadata,
        message,
        'approved',
        startTime,
        message.filePath,
        `documents/${message.filePath}`
      );

      this.context.log(
        `[${traceId}] Document successfully moved to documents container`
      );
    } catch (error: any) {
      this.context.error(
        `[${traceId}] Error moving document: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Handle security check failure - delete document and log
   */
  private async handleSecurityCheckFailure(
    blobClient: BlobClient,
    message: DocumentCheckMessage,
    securityMetadata: DocumentSecurityMetadata,
    checkResults: SecurityCheckResult[],
    traceId: string,
    startTime: number
  ): Promise<void> {
    try {
      this.context.log(
        `[${traceId}] Security checks failed. Deleting document: ${message.documentFileName}`
      );

      // Determine failure reason
      const failedChecks = checkResults.filter((r) => !r.passed);
      const failureReason = failedChecks
        .map((r) => `${r.checkType}: ${r.details}`)
        .join(' | ');

      securityMetadata.failureReason = failureReason;

      // Delete the blob from quarantine
      await blobClient.delete();
      securityMetadata.deletedAt = new Date().toISOString();

      this.context.log(
        `[${traceId}] Document deleted from quarantine: ${message.filePath}`
      );

      // Log to audit container
      await this.logToAuditContainer(
        securityMetadata,
        message,
        'rejected',
        startTime,
        message.filePath
      );

      // Create notification
      await this.createNotification(
        securityMetadata,
        message,
        'security-failed',
        failureReason,
        checkResults
      );

      this.context.log(
        `[${traceId}] Security failure logged and notification created`
      );
    } catch (error: any) {
      this.context.error(
        `[${traceId}] Error handling security check failure: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Log security check result to audit container in Cosmos DB
   */
  private async logToAuditContainer(
    securityMetadata: DocumentSecurityMetadata,
    message: DocumentCheckMessage,
    action: 'checked' | 'approved' | 'rejected',
    startTime: number,
    sourcePath?: string,
    destinationPath?: string
  ): Promise<void> {
    try {
      const auditLog: DocumentCheckAuditLog = {
        id: randomUUID(),
        documentId: securityMetadata.documentId,
        shardId: message.shardId,
        tenantId: message.tenantId,
        documentFileName: message.documentFileName,
        userId: message.userId ?? 'system',
        action,
        checkDetails: securityMetadata.checksPerformed,
        overallRiskLevel: securityMetadata.overallRiskLevel,
        failureReason: securityMetadata.failureReason,
        timestamp: new Date().toISOString(),
        blobSourcePath: sourcePath,
        blobDestinationPath: destinationPath,
        duration: Date.now() - startTime,
      };

      // Insert audit log (partition key is automatically set from the item's tenantId property)
      await this.cosmosAuditContainer.items.create(auditLog);

      this.context.log(
        `Audit log created: ${auditLog.id} for document ${securityMetadata.documentId}`
      );
    } catch (error: any) {
      this.context.error(`Error logging to audit container: ${error.message}`);
      // Don't throw - audit logging failure shouldn't block the main flow
    }
  }

  /**
   * Create notification for failed security checks
   */
  private async createNotification(
    securityMetadata: DocumentSecurityMetadata,
    message: DocumentCheckMessage,
    notificationType: 'security-failed' | 'document-deleted' | 'check-error',
    message_text: string,
    checkResults: SecurityCheckResult[]
  ): Promise<void> {
    try {
      const notification: DocumentCheckNotification = {
        id: randomUUID(),
        documentId: securityMetadata.documentId,
        shardId: message.shardId,
        tenantId: message.tenantId,
        documentFileName: message.documentFileName,
        userId: message.userId ?? 'system',
        notificationType,
        message: message_text,
        details: checkResults,
        overallRiskLevel: securityMetadata.overallRiskLevel,
        createdAt: new Date().toISOString(),
        read: false,
      };

      // Insert notification (partition key is automatically set from the item's tenantId property)
      await this.cosmosNotificationsContainer.items.create(notification);

      this.context.log(
        `Notification created: ${notification.id} for user ${notification.userId}`
      );
    } catch (error: any) {
      this.context.error(`Error creating notification: ${error.message}`);
      // Don't throw - notification failure shouldn't block the main flow
    }
  }
}
