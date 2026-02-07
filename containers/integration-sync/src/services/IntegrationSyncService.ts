/**
 * Integration Sync Service
 * Manages sync tasks, bidirectional synchronization, and webhook management
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { EventPublisher } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  SyncTask,
  SyncExecution,
  SyncConflict,
  Webhook,
  SyncDirection,
  ConflictResolutionStrategy,
} from '../types/integration-sync.types';
import { publishIntegrationSyncEvent } from '../events/publishers/IntegrationSyncEventPublisher';
import { v4 as uuidv4 } from 'uuid';

export class IntegrationSyncService {
  private config: ReturnType<typeof loadConfig>;
  private integrationManagerClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private secretManagementClient: ServiceClient;
  private eventPublisher: EventPublisher | null = null;
  private runningTasks = new Set<string>();
  private runningTasksByTenant = new Map<string, Set<string>>();
  private app: FastifyInstance | null = null;
  private activeSyncExecutions = new Map<string, {
    total: number;
    processed: number;
    created: number;
    updated: number;
    failed: number;
  }>();

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    // Initialize service clients
    this.integrationManagerClient = new ServiceClient({
      baseURL: this.config.services.integration_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.secretManagementClient = new ServiceClient({
      baseURL: this.config.services.secret_management?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    // Initialize event publisher for raw data events
    if (this.config.rabbitmq?.url) {
      this.eventPublisher = new EventPublisher(
        {
          url: this.config.rabbitmq.url,
          exchange: this.config.rabbitmq.exchange || 'coder_events',
          exchangeType: 'topic',
        },
        'integration-sync'
      );
      this.eventPublisher.connect().catch((error) => {
        log.error('Failed to connect event publisher', error, { service: 'integration-sync' });
      });
    }
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'integration-sync',
      serviceName: 'integration-sync',
      tenantId,
    });
  }

  /**
   * Get integration details from integration-manager (for sync config / entity mappings).
   */
  async getIntegration(integrationId: string, tenantId: string): Promise<{ syncConfig?: { entityMappings?: Array<{ externalEntity: string; enabled?: boolean }> } } | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const res = await this.integrationManagerClient.get<any>(
        `/api/v1/integrations/${integrationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return res?.data ?? res ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Create sync task
   */
  async createSyncTask(
    tenantId: string,
    integrationId: string,
    direction: SyncDirection,
    entityType?: string,
    filters?: Record<string, any>
  ): Promise<SyncTask> {
    const taskId = uuidv4();

    try {
      log.info('Creating sync task', {
        taskId,
        integrationId,
        direction,
        tenantId,
        service: 'integration-sync',
      });

      const task: SyncTask = {
        taskId,
        tenantId,
        integrationId,
        direction,
        status: 'pending',
        entityType,
        filters,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      const container = getContainer('integration_sync_tasks');
      await container.items.create(
        { ...task, id: taskId, tenantId, createdAt: new Date() },
        { partitionKey: tenantId } as any
      );

      // Publish sync started event
      await publishIntegrationSyncEvent('integration.sync.started', tenantId, {
        taskId,
        integrationId,
        direction,
      });

      return task;
    } catch (error: any) {
      log.error('Failed to create sync task', error, {
        taskId,
        integrationId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }

  /**
   * Execute sync task
   */
  async executeSyncTask(taskId: string, tenantId: string): Promise<SyncExecution> {
    if (this.runningTasks.has(taskId)) {
      throw new Error('Sync task is already running');
    }

    const task = await this.getSyncTask(taskId, tenantId);
    if (!task) {
      throw new Error('Sync task not found');
    }
    if (task.status === 'running') {
      throw new Error('Sync task is already running');
    }

    const maxConcurrent = this.config.sync_limits?.max_concurrent_syncs_per_tenant ?? 3;
    const tenantRunning = this.runningTasksByTenant.get(tenantId)?.size ?? 0;
    if (tenantRunning >= maxConcurrent) {
      throw new Error(`Max concurrent syncs per tenant (${maxConcurrent}) reached`);
    }

    const minIntervalMinutes = this.config.sync_limits?.min_interval_minutes ?? 5;
    if (minIntervalMinutes > 0) {
      try {
        const execContainer = getContainer('integration_executions');
        const { resources } = await execContainer.items
          .query(
            {
              query: 'SELECT TOP 1 * FROM c WHERE c.integrationId = @integrationId AND c.status = @status AND IS_DEFINED(c.completedAt) ORDER BY c.completedAt DESC',
              parameters: [
                { name: '@integrationId', value: task.integrationId },
                { name: '@status', value: 'completed' },
              ],
            },
            { partitionKey: tenantId }
          )
          .fetchAll();
        const last = resources?.[0];
        if (last?.completedAt) {
          const lastAt = new Date(last.completedAt).getTime();
          const minMs = minIntervalMinutes * 60 * 1000;
          if (Date.now() - lastAt < minMs) {
            throw new Error(`Min sync interval (${minIntervalMinutes} min) not elapsed for this integration`);
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('Min sync interval')) throw e;
      }
    }

    this.runningTasks.add(taskId);
    if (!this.runningTasksByTenant.has(tenantId)) {
      this.runningTasksByTenant.set(tenantId, new Set());
    }
    this.runningTasksByTenant.get(tenantId)!.add(taskId);

    const executionId = uuidv4();

    try {
      log.info('Executing sync task', {
        taskId,
        executionId,
        tenantId,
        service: 'integration-sync',
      });

      // Update task status
      task.status = 'running';
      task.startedAt = new Date();
      await this.updateSyncTask(task, tenantId);

      // Create execution record
      const execution: SyncExecution = {
        executionId,
        taskId,
        tenantId,
        status: 'running',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        startedAt: new Date(),
      };

      const executionContainer = getContainer('integration_executions');
      await executionContainer.items.create(
        { ...execution, id: executionId, tenantId, integrationId: task.integrationId, createdAt: new Date() },
        { partitionKey: tenantId } as any
      );

      // Execute actual sync logic
      const token = this.getServiceToken(tenantId);
      
      // Step 1: Get integration connection details from integration-manager
      let integration: any;
      try {
        integration = await this.integrationManagerClient.get<any>(
          `/api/v1/integrations/${task.integrationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );
      } catch (error: any) {
        log.error('Failed to get integration details', error, {
          integrationId: task.integrationId,
          tenantId,
          service: 'integration-sync',
        });
        throw new Error(`Integration not found: ${task.integrationId}`);
      }

      // Step 2: Get credentials from secret-management via connection
      // Note: IntegrationSyncService should use connection-based credential retrieval
      // For now, we'll use credentialSecretName if available, otherwise skip credential retrieval
      // (credentials will be retrieved by integration-manager adapter when fetching)
      let _credentials: any = null;
      if (integration.credentialSecretName) {
        try {
          _credentials = await this.secretManagementClient.get<any>(
            `/api/v1/secrets/${integration.credentialSecretName}/value`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );
        } catch (error: any) {
          log.warn('Failed to get integration credentials (will be retrieved by adapter)', {
            error,
            secretName: integration.credentialSecretName,
            tenantId,
            service: 'integration-sync',
          });
          // Continue without credentials - adapter will retrieve them
        }
      }

      // Step 3: Fetch data from external system (via integration-manager adapter)
      let externalData: any[] = [];
      try {
        const fetchResponse = await this.integrationManagerClient.post<any>(
          `/api/v1/integrations/${task.integrationId}/fetch`,
          {
            direction: task.direction,
            entityType: task.entityType,
            filters: task.filters,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );
        externalData = fetchResponse.data || [];
        const maxRec = this.config.sync_limits?.max_records_per_sync ?? 1000;
        if (externalData.length > maxRec) {
          log.info('Capping sync to max_records_per_sync', {
            total: externalData.length,
            cap: maxRec,
            integrationId: task.integrationId,
            service: 'integration-sync',
          });
          externalData = externalData.slice(0, maxRec);
        }
      } catch (error: any) {
        log.error('Failed to fetch data from external system', error, {
          integrationId: task.integrationId,
          tenantId,
          service: 'integration-sync',
        });
        // Continue with empty data - will result in 0 records processed
      }

      // Step 4: Publish raw data events to RabbitMQ for async processing
      // Generate correlation ID for this sync execution
      const correlationId = uuidv4();
      
      // Initialize sync execution tracking
      this.activeSyncExecutions.set(executionId, {
        total: externalData.length,
        processed: 0,
        created: 0,
        updated: 0,
        failed: 0,
      });

      const batchThreshold = this.config.mapping?.batch_threshold ?? 100;
      const batchSize = this.config.mapping?.batch_size ?? 50;
      const entityType = task.entityType || 'opportunity';

      let recordsPublished = 0;
      let recordsFailed = 0;

      if (externalData.length > batchThreshold) {
        // Large sync: Use batch events
        log.info('Publishing batch events for large sync', {
          taskId,
          executionId,
          totalRecords: externalData.length,
          batchSize,
          tenantId,
          service: 'integration-sync',
        });

        // Group records into batches
        for (let i = 0; i < externalData.length; i += batchSize) {
          const batch = externalData.slice(i, i + batchSize);
          const batchRecords = batch.map((item) => {
            const externalId = item.id || item.externalId || uuidv4();
            const idempotencyKey = `${task.integrationId}-${externalId}-${task.taskId}`;
            return {
              rawData: item,
              externalId,
              idempotencyKey,
            };
          });

          try {
            await this.publishRawDataEvent(
              'integration.data.raw.batch',
              task.integrationId,
              tenantId,
              {
                integrationId: task.integrationId,
                tenantId,
                entityType,
                records: batchRecords,
                syncTaskId: task.taskId,
                correlationId,
                batchSize: batchRecords.length,
                metadata: {
                  direction: task.direction,
                  filters: task.filters,
                },
              }
            );
            recordsPublished += batchRecords.length;
          } catch (error: any) {
            recordsFailed += batchRecords.length;
            log.error('Failed to publish batch event', error, {
              taskId,
              batchIndex: Math.floor(i / batchSize),
              tenantId,
              service: 'integration-sync',
            });
          }
        }
      } else {
        // Small sync or webhook: Publish individual events
        for (const item of externalData) {
          try {
            // Detect data type and route to appropriate event
            const dataType = this.detectDataType(entityType, item);
            const eventType = this.getEventType(dataType) as any;
            const externalId = item.id || item.externalId || item.documentId || item.emailId || item.messageId || item.meetingId || item.eventId || uuidv4();
            const idempotencyKey = `${task.integrationId}-${externalId}-${task.taskId}`;

            // Transform data for event-specific format
            const eventData = this.transformDataForEvent(
              dataType,
              item,
              {
                integrationId: task.integrationId,
                tenantId,
                entityType,
                externalId,
                syncTaskId: task.taskId,
                idempotencyKey,
                correlationId,
                integrationSource: task.integrationId, // Can be enhanced with actual source detection
                metadata: {
                  direction: task.direction,
                  filters: task.filters,
                },
              }
            );

            await this.publishRawDataEvent(
              eventType,
              task.integrationId,
              tenantId,
              eventData
            );
            recordsPublished++;
          } catch (error: any) {
            recordsFailed++;
            log.error('Failed to publish raw data event', error, {
              item,
              tenantId,
              service: 'integration-sync',
            });
          }
        }
      }

      // Update execution status to "processing" (mapping will update stats asynchronously)
      execution.status = 'processing';
      execution.recordsProcessed = recordsPublished;
      execution.recordsCreated = 0; // Will be updated by mapping consumer
      execution.recordsUpdated = 0; // Will be updated by mapping consumer
      execution.recordsFailed = recordsFailed;

      // Execution stats will be updated asynchronously via integration.data.mapped events
      // For now, mark as processing - will be updated by event consumer

      // Update execution
      await executionContainer.item(executionId, tenantId).replace({
        ...execution,
        id: executionId,
        tenantId,
        integrationId: task.integrationId,
        updatedAt: new Date(),
      });

      // Update task status to processing (will be updated when mapping completes)
      task.status = 'processing';
      task.recordsProcessed = execution.recordsProcessed;
      task.recordsFailed = execution.recordsFailed;
      await this.updateSyncTask(task, tenantId);

      // Note: integration.sync.completed will be published when all records are mapped
      // (tracked via integration.data.mapped events)

      log.info('Sync task events published', {
        taskId,
        executionId,
        recordsPublished,
        recordsFailed,
        correlationId,
        tenantId,
        service: 'integration-sync',
      });

      return execution;
    } catch (error: any) {
      log.error('Sync task execution failed', error, {
        taskId,
        executionId,
        tenantId,
        service: 'integration-sync',
      });

      // Update task status
      try {
        const task = await this.getSyncTask(taskId, tenantId);
        if (task) {
          task.status = 'failed';
          task.error = error.message;
          task.completedAt = new Date();
          await this.updateSyncTask(task, tenantId);
        }
      } catch (updateError) {
        log.error('Failed to update task status', updateError, { service: 'integration-sync' });
      }

      // Publish failure event
      await publishIntegrationSyncEvent('integration.sync.failed', tenantId, {
        taskId,
        executionId,
        error: error.message,
      });

      throw error;
    } finally {
      this.runningTasks.delete(taskId);
      this.runningTasksByTenant.get(tenantId)?.delete(taskId);
    }
  }

  /**
   * Detect data type from entity type and raw data
   */
  private detectDataType(entityType: string, rawData: any): 'crm' | 'document' | 'email' | 'message' | 'meeting' | 'event' {
    const entityTypeLower = entityType?.toLowerCase() || '';

    // Check entity type first
    if (['opportunity', 'account', 'contact', 'lead'].includes(entityTypeLower)) {
      return 'crm';
    }
    if (['document', 'file', 'attachment'].includes(entityTypeLower)) {
      return 'document';
    }
    if (['email', 'message'].includes(entityTypeLower)) {
      // Distinguish between email and message based on source or structure
      if (rawData?.threadId || rawData?.subject || rawData?.from || rawData?.to) {
        return 'email';
      }
      return 'message';
    }
    if (['meeting', 'call', 'recording'].includes(entityTypeLower)) {
      return 'meeting';
    }
    if (['event', 'calendar', 'appointment'].includes(entityTypeLower)) {
      return 'event';
    }

    // Fallback: Check raw data structure
    if (rawData?.mimeType || rawData?.fileUrl || rawData?.documentUrl || rawData?.blobUrl) {
      return 'document';
    }
    if (rawData?.recordingUrl || rawData?.transcriptUrl || rawData?.meetingId) {
      return 'meeting';
    }
    if (rawData?.startTime || rawData?.endTime || rawData?.attendees) {
      if (rawData?.recordingUrl || rawData?.transcriptUrl) {
        return 'meeting';
      }
      return 'event';
    }
    if (rawData?.channelId || rawData?.messageId || rawData?.threadId) {
      if (rawData?.subject || rawData?.from || rawData?.to) {
        return 'email';
      }
      return 'message';
    }

    // Default to CRM
    return 'crm';
  }

  /**
   * Get event type based on data type
   */
  private getEventType(dataType: 'crm' | 'document' | 'email' | 'message' | 'meeting' | 'event'): string {
    switch (dataType) {
      case 'crm':
        return 'integration.data.raw';
      case 'document':
        return 'integration.document.detected';
      case 'email':
        return 'integration.email.received';
      case 'message':
        return 'integration.message.received';
      case 'meeting':
        return 'integration.meeting.completed';
      case 'event':
        return 'integration.event.created';
      default:
        return 'integration.data.raw';
    }
  }

  /**
   * Transform raw data to event-specific format
   */
  private transformDataForEvent(dataType: 'crm' | 'document' | 'email' | 'message' | 'meeting' | 'event', rawData: any, metadata: any): any {
    const baseData = {
      integrationId: metadata.integrationId,
      tenantId: metadata.tenantId,
      externalId: rawData.id || rawData.externalId || rawData.documentId || rawData.emailId || rawData.messageId || rawData.meetingId || rawData.eventId || uuidv4(),
      syncTaskId: metadata.syncTaskId,
      correlationId: metadata.correlationId,
      metadata: metadata.metadata || {},
    };

    switch (dataType) {
      case 'crm':
        return {
          ...baseData,
          entityType: metadata.entityType,
          rawData,
          idempotencyKey: metadata.idempotencyKey,
        };
      case 'document':
        return {
          ...baseData,
          documentId: rawData.id || rawData.documentId || baseData.externalId,
          externalUrl: rawData.url || rawData.fileUrl || rawData.documentUrl || rawData.blobUrl,
          title: rawData.title || rawData.name || rawData.filename,
          mimeType: rawData.mimeType || rawData.contentType,
          size: rawData.size || rawData.fileSize,
          integrationSource: rawData.integrationSource || metadata.integrationSource,
          sourcePath: rawData.path || rawData.sourcePath,
          parentFolderId: rawData.parentFolderId || rawData.folderId,
          parentFolderName: rawData.parentFolderName || rawData.folderName,
          createdBy: rawData.createdBy,
          modifiedBy: rawData.modifiedBy,
          createdAt: rawData.createdAt,
          modifiedAt: rawData.modifiedAt,
        };
      case 'email':
        return {
          ...baseData,
          emailId: rawData.id || rawData.emailId || baseData.externalId,
          threadId: rawData.threadId,
          from: rawData.from,
          to: rawData.to || rawData.recipients,
          subject: rawData.subject,
          body: rawData.body || rawData.htmlBody || rawData.textBody,
          attachments: rawData.attachments || [],
          receivedAt: rawData.receivedAt || rawData.createdAt,
        };
      case 'message':
        return {
          ...baseData,
          messageId: rawData.id || rawData.messageId || baseData.externalId,
          channelId: rawData.channelId,
          from: rawData.from || rawData.sender,
          text: rawData.text || rawData.content || rawData.message,
          mentions: rawData.mentions || [],
          reactions: rawData.reactions || [],
          receivedAt: rawData.receivedAt || rawData.createdAt,
        };
      case 'meeting':
        return {
          ...baseData,
          meetingId: rawData.id || rawData.meetingId || baseData.externalId,
          title: rawData.title || rawData.name,
          description: rawData.description,
          startTime: rawData.startTime || rawData.start,
          endTime: rawData.endTime || rawData.end,
          duration: rawData.duration,
          timezone: rawData.timezone,
          integrationSource: rawData.integrationSource || metadata.integrationSource,
          externalUrl: rawData.url || rawData.meetingUrl,
          recordingUrl: rawData.recordingUrl,
          transcriptUrl: rawData.transcriptUrl,
          organizer: rawData.organizer,
          participants: rawData.participants || [],
        };
      case 'event':
        return {
          ...baseData,
          eventId: rawData.id || rawData.eventId || baseData.externalId,
          title: rawData.title || rawData.summary,
          description: rawData.description,
          startTime: rawData.startTime || rawData.start,
          endTime: rawData.endTime || rawData.end,
          duration: rawData.duration,
          timezone: rawData.timezone,
          isAllDay: rawData.isAllDay,
          location: rawData.location,
          locationType: rawData.locationType,
          meetingUrl: rawData.meetingUrl,
          organizer: rawData.organizer,
          attendees: rawData.attendees || [],
          recurrence: rawData.recurrence,
          status: rawData.status,
          integrationSource: rawData.integrationSource || metadata.integrationSource,
          externalUrl: rawData.url || rawData.eventUrl,
        };
      default:
        return {
          ...baseData,
          entityType: metadata.entityType,
          rawData,
          idempotencyKey: metadata.idempotencyKey,
        };
    }
  }

  /**
   * Publish raw data event to RabbitMQ
   */
  private async publishRawDataEvent(
    eventType: 'integration.data.raw' | 'integration.data.raw.batch' | 'integration.document.detected' | 'integration.email.received' | 'integration.message.received' | 'integration.meeting.completed' | 'integration.event.created',
    integrationId: string,
    tenantId: string,
    data: any
  ): Promise<void> {
    if (!this.eventPublisher) {
      // Fallback to existing publisher if eventPublisher not initialized
      await publishIntegrationSyncEvent(eventType, tenantId, data);
      return;
    }

    try {
      await this.eventPublisher.publish(eventType, tenantId, data, {
        correlationId: data.correlationId,
      });
    } catch (error: any) {
      log.error('Failed to publish raw data event', error, {
        eventType,
        integrationId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }

  /**
   * Update sync execution stats from mapping events
   * Called by event consumer when integration.data.mapped events are received
   */
  async updateSyncExecutionStats(
    executionId: string,
    tenantId: string,
    stats: { created?: number; updated?: number; failed?: number }
  ): Promise<void> {
    const tracking = this.activeSyncExecutions.get(executionId);
    if (!tracking) {
      log.warn('Sync execution tracking not found', { executionId, tenantId, service: 'integration-sync' });
      return;
    }

    if (stats.created) tracking.created += stats.created;
    if (stats.updated) tracking.updated += stats.updated;
    if (stats.failed) tracking.failed += stats.failed;
    tracking.processed = tracking.created + tracking.updated + tracking.failed;

    // Update Cosmos DB execution record periodically (every 10 records or every 5 seconds)
    // This will be handled by a periodic updater or event consumer

    // Check if all records processed
    if (tracking.processed >= tracking.total) {
      // All records processed - mark as completed
      const executionContainer = getContainer('integration_executions');
      const execution = await executionContainer.item(executionId, tenantId).read();
      if (execution.resource) {
        await executionContainer.item(executionId, tenantId).replace({
          ...execution.resource,
          status: 'completed',
          recordsCreated: tracking.created,
          recordsUpdated: tracking.updated,
          recordsFailed: tracking.failed,
          recordsProcessed: tracking.processed,
          completedAt: new Date(),
          updatedAt: new Date(),
        });

        // Update task
        const task = await this.getSyncTask(execution.resource.taskId, tenantId);
        if (task) {
          task.status = 'completed';
          task.completedAt = new Date();
          task.recordsProcessed = tracking.processed;
          task.recordsCreated = tracking.created;
          task.recordsUpdated = tracking.updated;
          task.recordsFailed = tracking.failed;
          await this.updateSyncTask(task, tenantId);
        }

        // Publish completion event
        await publishIntegrationSyncEvent('integration.sync.completed', tenantId, {
          taskId: execution.resource.taskId,
          executionId,
          recordsProcessed: tracking.processed,
          recordsCreated: tracking.created,
          recordsUpdated: tracking.updated,
          recordsFailed: tracking.failed,
        });

        // Clean up tracking
        this.activeSyncExecutions.delete(executionId);
      }
    }
  }

  /**
   * Find shard by external ID
   */
  private async _findShardByExternalId(
    externalId: string,
    entityType: string,
    tenantId: string,
    token: string
  ): Promise<any | null> {
    try {
      // Query shards by external ID
      const response = await this.shardManagerClient.get<any>(
        `/api/v1/shards?filter=externalId eq '${externalId}' and shardType eq '${entityType}'`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error: any) {
      log.error('Failed to find shard by external ID', error, {
        externalId,
        entityType,
        tenantId,
        service: 'integration-sync',
      });
      return null;
    }
  }

  /**
   * Store sync conflict
   */
  private async storeConflict(
    taskId: string,
    tenantId: string,
    item: any,
    error: string
  ): Promise<void> {
    try {
      const conflict: SyncConflict = {
        conflictId: uuidv4(),
        taskId,
        tenantId,
        entityId: item.id || item.externalId || '',
        entityType: item.type || 'unknown',
        sourceData: item,
        targetData: null,
        resolutionStrategy: 'manual',
        resolved: false,
        createdAt: new Date(),
      };

      const container = getContainer('integration_conflicts');
      await container.items.create(
        { ...conflict, id: conflict.conflictId, tenantId },
        { partitionKey: tenantId } as any
      );
    } catch (_error: any) {
      log.error('Failed to store conflict', {
        error: _error,
        taskId,
        tenantId,
        service: 'integration-sync',
      });
    }
  }

  /**
   * Handle bidirectional sync (when shard is updated)
   */
  async handleBidirectionalSync(shardId: string, tenantId: string): Promise<void> {
    try {
      log.info('Handling bidirectional sync', {
        shardId,
        tenantId,
        service: 'integration-sync',
      });

      const token = this.getServiceToken(tenantId);

      // Step 1: Get shard
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${shardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!shard || !shard.externalId || !shard.externalSource) {
        // Shard not linked to external integration, skip
        return;
      }

      // Step 2: Find integration by type
      const integrations = await this.integrationManagerClient.get<any>(
        `/api/v1/integrations?filter=type eq '${shard.externalSource}'`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!integrations.data || integrations.data.length === 0) {
        log.warn('No integration found for bidirectional sync', {
          externalSource: shard.externalSource,
          tenantId,
          service: 'integration-sync',
        });
        return;
      }

      const integration = integrations.data[0];

      // Step 3: Sync changes to external system
      try {
        await this.integrationManagerClient.post<any>(
          `/api/v1/integrations/${integration.id}/push`,
          {
            externalId: shard.externalId,
            data: shard.data,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        // Publish data synced event
        await publishIntegrationSyncEvent('integration.data.synced', tenantId, {
          shardId,
          direction: 'outbound',
          integrationId: integration.id,
        });
      } catch (error: any) {
        log.error('Failed to push changes to external system', error, {
          shardId,
          integrationId: integration.id,
          tenantId,
          service: 'integration-sync',
        });
        
        // Store conflict
        await this.storeConflict('bidirectional', tenantId, shard, error.message);
      }
    } catch (error: any) {
      log.error('Bidirectional sync failed', error, {
        shardId,
        tenantId,
        service: 'integration-sync',
      });
    }
  }

  /**
   * Get sync task by ID
   */
  async getSyncTask(taskId: string, tenantId: string): Promise<SyncTask | null> {
    try {
      const container = getContainer('integration_sync_tasks');
      const { resource } = await container.item(taskId, tenantId).read<SyncTask>();
      return resource || null;
    } catch (error: any) {
      log.error('Failed to get sync task', error, {
        taskId,
        tenantId,
        service: 'integration-sync',
      });
      return null;
    }
  }

  /**
   * Update sync task
   */
  private async updateSyncTask(task: SyncTask, tenantId: string): Promise<void> {
    try {
      const container = getContainer('integration_sync_tasks');
      await container.item(task.taskId, tenantId).replace({
        ...task,
        id: task.taskId,
        tenantId,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      log.error('Failed to update sync task', error, {
        taskId: task.taskId,
        tenantId,
        service: 'integration-sync',
      });
    }
  }

  /**
   * Resolve sync conflict
   */
  async resolveConflict(
    conflictId: string,
    tenantId: string,
    resolution: ConflictResolutionStrategy,
    resolvedBy: string
  ): Promise<SyncConflict> {
    try {
      const container = getContainer('integration_conflicts');
      const { resource: conflict } = await container.item(conflictId, tenantId).read<SyncConflict>();

      if (!conflict) {
        throw new Error('Conflict not found');
      }

      conflict.resolutionStrategy = resolution;
      conflict.resolved = true;
      conflict.resolvedAt = new Date();
      conflict.resolvedBy = resolvedBy;

      await container.item(conflictId, tenantId).replace({
        ...conflict,
        id: conflictId,
        tenantId,
        updatedAt: new Date(),
      });

      return conflict;
    } catch (error: any) {
      log.error('Failed to resolve conflict', error, {
        conflictId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(
    tenantId: string,
    integrationId: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<Webhook> {
    const webhookId = uuidv4();
    try {
      const webhook: Webhook = {
        webhookId,
        tenantId,
        integrationId,
        url,
        events,
        secret,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const container = getContainer('integration_webhooks');
      await container.items.create(
        { ...webhook, id: webhookId, tenantId },
        { partitionKey: tenantId } as any
      );

      return webhook;
    } catch (error: any) {
      log.error('Failed to create webhook', error, {
        webhookId,
        integrationId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(webhookId: string, tenantId: string): Promise<Webhook | null> {
    try {
      const container = getContainer('integration_webhooks');
      const { resource } = await container.item(webhookId, tenantId).read<Webhook>();
      return resource || null;
    } catch (error: any) {
      log.error('Failed to get webhook', error, {
        webhookId,
        tenantId,
        service: 'integration-sync',
      });
      return null;
    }
  }

  /**
   * List webhooks for integration
   */
  async listWebhooks(integrationId: string, tenantId: string): Promise<Webhook[]> {
    try {
      const container = getContainer('integration_webhooks');
      const { resources } = await container.items
        .query<Webhook>({
          query: 'SELECT * FROM c WHERE c.integrationId = @integrationId AND c.tenantId = @tenantId',
          parameters: [
            { name: '@integrationId', value: integrationId },
            { name: '@tenantId', value: tenantId },
          ],
        })
        .fetchAll();
      return resources || [];
    } catch (error: any) {
      log.error('Failed to list webhooks', error, {
        integrationId,
        tenantId,
        service: 'integration-sync',
      });
      return [];
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    tenantId: string,
    updates: Partial<Pick<Webhook, 'url' | 'events' | 'active' | 'secret'>>
  ): Promise<Webhook> {
    try {
      const webhook = await this.getWebhook(webhookId, tenantId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      const updated: Webhook = {
        ...webhook,
        ...updates,
        updatedAt: new Date(),
      };

      const container = getContainer('integration_webhooks');
      await container.item(webhookId, tenantId).replace({
        ...updated,
        id: webhookId,
        tenantId,
      });

      return updated;
    } catch (error: any) {
      log.error('Failed to update webhook', error, {
        webhookId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, tenantId: string): Promise<void> {
    try {
      const container = getContainer('integration_webhooks');
      await container.item(webhookId, tenantId).delete();
    } catch (error: any) {
      log.error('Failed to delete webhook', error, {
        webhookId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }
}
