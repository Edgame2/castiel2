/**
 * Shard Bulk Operations Controller
 * 
 * HTTP handlers for bulk shard operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ShardRepository } from '@castiel/api-core';
import { ShardEventService } from '../services/shard-event.service.js';
import type {
  CreateShardInput,
  UpdateShardInput,
  Shard,
} from '../types/shard.types.js';
import {
  ShardStatus,
  ShardSource,
  PermissionLevel,
} from '../types/shard.types.js';
import {
  ShardErrorCode,
  BulkOperationResult,
  BulkOperationError,
} from '../types/shard-errors.types.js';
import { ShardEventType } from '../types/shard-event.types.js';

interface AuthContext {
  tenantId: string;
  userId: string;
  roles?: string[];
}

interface BulkCreateInput {
  shards: Array<{
    shardTypeId: string;
    structuredData: Record<string, any>;
    unstructuredData?: Record<string, any>;
    metadata?: Record<string, any>;
    parentShardId?: string;
  }>;
  options?: {
    skipValidation?: boolean;
    skipEnrichment?: boolean;
    skipEvents?: boolean;
    transactional?: boolean;
    onError?: 'continue' | 'abort';
  };
}

interface BulkUpdateInput {
  updates: Array<{
    id: string;
    structuredData?: Record<string, any>;
    unstructuredData?: Record<string, any>;
    metadata?: Record<string, any>;
    status?: ShardStatus;
  }>;
  options?: {
    skipValidation?: boolean;
    createRevision?: boolean;
    skipEvents?: boolean;
    onError?: 'continue' | 'abort';
  };
}

interface BulkDeleteInput {
  shardIds: string[];
  options?: {
    hardDelete?: boolean;
    skipEvents?: boolean;
    onError?: 'continue' | 'abort';
  };
}

interface BulkRestoreInput {
  shardIds: string[];
  options?: {
    skipEvents?: boolean;
  };
}

interface BulkStatusChangeInput {
  shardIds: string[];
  status: ShardStatus;
  options?: {
    skipEvents?: boolean;
    onError?: 'continue' | 'abort';
  };
}

interface BulkTagOperationInput {
  shardIds: string[];
  operation: 'add' | 'remove' | 'set';
  tags: string[];
  options?: {
    skipEvents?: boolean;
    onError?: 'continue' | 'abort';
  };
}

interface BulkExportInput {
  shardIds?: string[];
  shardTypeId?: string;
  status?: ShardStatus;
  limit?: number;
  format?: 'json' | 'csv';
  includeMetadata?: boolean;
  fields?: string[];
}

interface BulkExportResult {
  format: string;
  count: number;
  data: string | any[]; // CSV is string, JSON is array
  exportedAt: string;
}

const MAX_BULK_SIZE = 100;
const MAX_EXPORT_SIZE = 1000;

/**
 * Shard Bulk Controller
 */
export class ShardBulkController {
  constructor(
    private readonly repository: ShardRepository,
    private readonly eventService?: ShardEventService
  ) {}

  /**
   * POST /api/v1/shards/bulk
   * Bulk create shards
   */
  bulkCreate = async (
    req: FastifyRequest<{ Body: BulkCreateInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { shards, options = {} } = req.body;

      // Validate size
      if (!shards || shards.length === 0) {
        reply.status(400).send({ error: 'No shards provided' });
        return;
      }

      if (shards.length > MAX_BULK_SIZE) {
        reply.status(400).send({
          error: `Maximum ${MAX_BULK_SIZE} shards allowed per request`,
          code: ShardErrorCode.BULK_OPERATION_LIMIT_EXCEEDED,
        });
        return;
      }

      const result: BulkOperationResult<Shard> = {
        success: true,
        summary: { total: shards.length, succeeded: 0, failed: 0 },
        results: [],
      };

      for (let i = 0; i < shards.length; i++) {
        const shardInput = shards[i];

        try {
          const input: CreateShardInput = {
            tenantId,
            createdBy: userId,
            shardTypeId: shardInput.shardTypeId,
            structuredData: shardInput.structuredData || {},
            unstructuredData: shardInput.unstructuredData,
            metadata: shardInput.metadata,
            parentShardId: shardInput.parentShardId,
            source: ShardSource.API,
            sourceDetails: { importJobId: `bulk-${Date.now()}` },
            acl: [
              {
                userId,
                permissions: [
                  PermissionLevel.READ,
                  PermissionLevel.WRITE,
                  PermissionLevel.DELETE,
                  PermissionLevel.ADMIN,
                ],
                grantedBy: userId,
                grantedAt: new Date(),
              },
            ],
          };

          const shard = await this.repository.create(input);

          // Emit event if enabled
          if (!options.skipEvents && this.eventService) {
            await this.eventService.emit(ShardEventType.CREATED, shard, {
              triggeredBy: userId,
              triggerSource: 'api',
            });
          }

          result.results.push({
            index: i,
            status: 'created',
            shardId: shard.id,
            data: shard,
          });
          result.summary.succeeded++;
        } catch (error: any) {
          result.results.push({
            index: i,
            status: 'failed',
            error: {
              index: i,
              code: ShardErrorCode.SHARD_VALIDATION_FAILED,
              message: error.message || 'Failed to create shard',
            },
          });
          result.summary.failed++;

          if (options.onError === 'abort') {
            result.success = false;
            break;
          }
        }
      }

      result.success = result.summary.failed === 0;
      const statusCode = result.success ? 201 : result.summary.succeeded > 0 ? 207 : 400;

      req.log.info({
        operation: 'bulk_create',
        total: result.summary.total,
        succeeded: result.summary.succeeded,
        failed: result.summary.failed,
        duration: Date.now() - startTime,
      });

      reply.status(statusCode).send(result);
    } catch (error: any) {
      req.log.error({ error }, 'Bulk create failed');
      reply.status(500).send({ error: 'Bulk create failed' });
    }
  };

  /**
   * PATCH /api/v1/shards/bulk
   * Bulk update shards
   */
  bulkUpdate = async (
    req: FastifyRequest<{ Body: BulkUpdateInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { updates, options = {} } = req.body;

      if (!updates || updates.length === 0) {
        reply.status(400).send({ error: 'No updates provided' });
        return;
      }

      if (updates.length > MAX_BULK_SIZE) {
        reply.status(400).send({
          error: `Maximum ${MAX_BULK_SIZE} updates allowed per request`,
          code: ShardErrorCode.BULK_OPERATION_LIMIT_EXCEEDED,
        });
        return;
      }

      const result: BulkOperationResult<Shard> = {
        success: true,
        summary: { total: updates.length, succeeded: 0, failed: 0 },
        results: [],
      };

      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];

        try {
          // Check permission
          const hasAccess = await this.repository.checkPermission(
            update.id,
            tenantId,
            userId
          );

          if (!hasAccess.hasAccess || !hasAccess.permissions.includes(PermissionLevel.WRITE)) {
            throw new Error('Insufficient permissions');
          }

          const existing = await this.repository.findById(update.id, tenantId);
          if (!existing) {
            throw new Error('Shard not found');
          }

          const input: UpdateShardInput = {
            structuredData: update.structuredData,
            unstructuredData: update.unstructuredData,
            metadata: update.metadata,
            status: update.status,
          };

          const updated = await this.repository.update(update.id, tenantId, input);

          if (!updated) {
            throw new Error('Update failed');
          }

          // Emit event if enabled
          if (!options.skipEvents && this.eventService) {
            const changes = ShardEventService.calculateChanges(existing, updated);
            await this.eventService.emit(ShardEventType.UPDATED, updated, {
              triggeredBy: userId,
              triggerSource: 'api',
              changes,
              previousState: existing.structuredData,
            });
          }

          result.results.push({
            index: i,
            status: 'updated',
            shardId: update.id,
            data: updated,
          });
          result.summary.succeeded++;
        } catch (error: any) {
          const errorCode = error.message === 'Shard not found'
            ? ShardErrorCode.SHARD_NOT_FOUND
            : error.message === 'Insufficient permissions'
            ? ShardErrorCode.INSUFFICIENT_PERMISSIONS
            : ShardErrorCode.SHARD_VALIDATION_FAILED;

          result.results.push({
            index: i,
            status: 'failed',
            shardId: update.id,
            error: {
              index: i,
              code: errorCode,
              message: error.message,
              shardId: update.id,
            },
          });
          result.summary.failed++;

          if (options.onError === 'abort') {
            result.success = false;
            break;
          }
        }
      }

      result.success = result.summary.failed === 0;
      const statusCode = result.success ? 200 : result.summary.succeeded > 0 ? 207 : 400;

      req.log.info({
        operation: 'bulk_update',
        total: result.summary.total,
        succeeded: result.summary.succeeded,
        failed: result.summary.failed,
        duration: Date.now() - startTime,
      });

      reply.status(statusCode).send(result);
    } catch (error: any) {
      req.log.error({ error }, 'Bulk update failed');
      reply.status(500).send({ error: 'Bulk update failed' });
    }
  };

  /**
   * DELETE /api/v1/shards/bulk
   * Bulk delete shards
   */
  bulkDelete = async (
    req: FastifyRequest<{ Body: BulkDeleteInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { shardIds, options = {} } = req.body;

      if (!shardIds || shardIds.length === 0) {
        reply.status(400).send({ error: 'No shard IDs provided' });
        return;
      }

      if (shardIds.length > MAX_BULK_SIZE) {
        reply.status(400).send({
          error: `Maximum ${MAX_BULK_SIZE} shards allowed per request`,
          code: ShardErrorCode.BULK_OPERATION_LIMIT_EXCEEDED,
        });
        return;
      }

      const result: BulkOperationResult = {
        success: true,
        summary: { total: shardIds.length, succeeded: 0, failed: 0 },
        results: [],
      };

      for (let i = 0; i < shardIds.length; i++) {
        const shardId = shardIds[i];

        try {
          // Check permission
          const hasAccess = await this.repository.checkPermission(shardId, tenantId, userId);

          if (!hasAccess.hasAccess || !hasAccess.permissions.includes(PermissionLevel.DELETE)) {
            throw new Error('Insufficient permissions');
          }

          const existing = await this.repository.findById(shardId, tenantId);
          if (!existing) {
            throw new Error('Shard not found');
          }

          const deleted = await this.repository.delete(shardId, tenantId, options.hardDelete || false);

          if (!deleted) {
            throw new Error('Delete failed');
          }

          // Emit event if enabled
          if (!options.skipEvents && this.eventService) {
            await this.eventService.emit(ShardEventType.DELETED, existing, {
              triggeredBy: userId,
              triggerSource: 'api',
            });
          }

          result.results.push({
            index: i,
            status: 'deleted',
            shardId,
          });
          result.summary.succeeded++;
        } catch (error: any) {
          const errorCode = error.message === 'Shard not found'
            ? ShardErrorCode.SHARD_NOT_FOUND
            : error.message === 'Insufficient permissions'
            ? ShardErrorCode.INSUFFICIENT_PERMISSIONS
            : ShardErrorCode.SHARD_VALIDATION_FAILED;

          result.results.push({
            index: i,
            status: 'failed',
            shardId,
            error: {
              index: i,
              code: errorCode,
              message: error.message,
              shardId,
            },
          });
          result.summary.failed++;

          if (options.onError === 'abort') {
            result.success = false;
            break;
          }
        }
      }

      result.success = result.summary.failed === 0;
      const statusCode = result.success ? 200 : result.summary.succeeded > 0 ? 207 : 400;

      req.log.info({
        operation: 'bulk_delete',
        total: result.summary.total,
        succeeded: result.summary.succeeded,
        failed: result.summary.failed,
        duration: Date.now() - startTime,
      });

      reply.status(statusCode).send(result);
    } catch (error: any) {
      req.log.error({ error }, 'Bulk delete failed');
      reply.status(500).send({ error: 'Bulk delete failed' });
    }
  };

  /**
   * POST /api/v1/shards/bulk/restore
   * Bulk restore soft-deleted shards
   */
  bulkRestore = async (
    req: FastifyRequest<{ Body: BulkRestoreInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { shardIds, options = {} } = req.body;

      if (!shardIds || shardIds.length === 0) {
        reply.status(400).send({ error: 'No shard IDs provided' });
        return;
      }

      if (shardIds.length > MAX_BULK_SIZE) {
        reply.status(400).send({
          error: `Maximum ${MAX_BULK_SIZE} shards allowed per request`,
          code: ShardErrorCode.BULK_OPERATION_LIMIT_EXCEEDED,
        });
        return;
      }

      const result: BulkOperationResult<Shard> = {
        success: true,
        summary: { total: shardIds.length, succeeded: 0, failed: 0 },
        results: [],
      };

      for (let i = 0; i < shardIds.length; i++) {
        const shardId = shardIds[i];

        try {
          // Check permission
          const hasAccess = await this.repository.checkPermission(shardId, tenantId, userId);

          if (!hasAccess.hasAccess || !hasAccess.permissions.includes(PermissionLevel.ADMIN)) {
            throw new Error('Insufficient permissions');
          }

          const restored = await this.repository.restore(shardId, tenantId);

          if (!restored) {
            throw new Error('Restore failed - shard not found or not deleted');
          }

          // Emit event if enabled
          if (!options.skipEvents && this.eventService) {
            await this.eventService.emit(ShardEventType.RESTORED, restored, {
              triggeredBy: userId,
              triggerSource: 'api',
            });
          }

          result.results.push({
            index: i,
            status: 'updated',
            shardId,
            data: restored,
          });
          result.summary.succeeded++;
        } catch (error: any) {
          const errorCode = error.message.includes('not found')
            ? ShardErrorCode.SHARD_NOT_FOUND
            : error.message === 'Insufficient permissions'
            ? ShardErrorCode.INSUFFICIENT_PERMISSIONS
            : ShardErrorCode.SHARD_RESTORE_FAILED;

          result.results.push({
            index: i,
            status: 'failed',
            shardId,
            error: {
              index: i,
              code: errorCode,
              message: error.message,
              shardId,
            },
          });
          result.summary.failed++;
        }
      }

      result.success = result.summary.failed === 0;
      const statusCode = result.success ? 200 : result.summary.succeeded > 0 ? 207 : 400;

      req.log.info({
        operation: 'bulk_restore',
        total: result.summary.total,
        succeeded: result.summary.succeeded,
        failed: result.summary.failed,
        duration: Date.now() - startTime,
      });

      reply.status(statusCode).send(result);
    } catch (error: any) {
      req.log.error({ error }, 'Bulk restore failed');
      reply.status(500).send({ error: 'Bulk restore failed' });
    }
  };

  /**
   * POST /api/v1/shards/:id/restore
   * Restore a single soft-deleted shard
   */
  restoreShard = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      // Check permission
      const hasAccess = await this.repository.checkPermission(id, tenantId, userId);

      if (!hasAccess.hasAccess || !hasAccess.permissions.includes(PermissionLevel.ADMIN)) {
        reply.status(403).send({
          error: 'Insufficient permissions',
          code: ShardErrorCode.INSUFFICIENT_PERMISSIONS,
        });
        return;
      }

      const restored = await this.repository.restore(id, tenantId);

      if (!restored) {
        reply.status(404).send({
          error: 'Shard not found or not deleted',
          code: ShardErrorCode.SHARD_NOT_FOUND,
        });
        return;
      }

      // Emit event
      if (this.eventService) {
        await this.eventService.emit(ShardEventType.RESTORED, restored, {
          triggeredBy: userId,
          triggerSource: 'api',
        });
      }

      req.log.info({ shardId: id }, 'Shard restored');

      reply.status(200).send(restored);
    } catch (error: any) {
      req.log.error({ error }, 'Restore failed');
      reply.status(500).send({ error: 'Restore failed' });
    }
  };

  /**
   * POST /api/v1/shards/bulk/status
   * Bulk change status of shards (archive, unarchive, etc.)
   */
  bulkStatusChange = async (
    req: FastifyRequest<{ Body: BulkStatusChangeInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { shardIds, status, options = {} } = req.body;

      if (!shardIds || shardIds.length === 0) {
        reply.status(400).send({ error: 'No shard IDs provided' });
        return;
      }

      if (shardIds.length > MAX_BULK_SIZE) {
        reply.status(400).send({
          error: `Maximum ${MAX_BULK_SIZE} shards allowed per request`,
          code: ShardErrorCode.BULK_OPERATION_LIMIT_EXCEEDED,
        });
        return;
      }

      const result: BulkOperationResult<Shard> = {
        success: true,
        summary: { total: shardIds.length, succeeded: 0, failed: 0 },
        results: [],
      };

      for (let i = 0; i < shardIds.length; i++) {
        const shardId = shardIds[i];

        try {
          // Check permission
          const hasAccess = await this.repository.checkPermission(shardId, tenantId, userId);

          if (!hasAccess.hasAccess || !hasAccess.permissions.includes(PermissionLevel.WRITE)) {
            throw new Error('Insufficient permissions');
          }

          const existing = await this.repository.findById(shardId, tenantId);
          if (!existing) {
            throw new Error('Shard not found');
          }

          const input: UpdateShardInput = { status };
          const updated = await this.repository.update(shardId, tenantId, input);

          if (!updated) {
            throw new Error('Update failed');
          }

          // Emit event if enabled
          if (!options.skipEvents && this.eventService) {
            await this.eventService.emit(
              status === ShardStatus.ARCHIVED ? ShardEventType.ARCHIVED : ShardEventType.STATUS_CHANGED,
              updated,
              {
                triggeredBy: userId,
                triggerSource: 'api',
                changes: [{ field: 'status', oldValue: existing.status, newValue: status }],
              }
            );
          }

          result.results.push({
            index: i,
            status: 'updated',
            shardId,
            data: updated,
          });
          result.summary.succeeded++;
        } catch (error: any) {
          const errorCode = error.message === 'Shard not found'
            ? ShardErrorCode.SHARD_NOT_FOUND
            : error.message === 'Insufficient permissions'
            ? ShardErrorCode.INSUFFICIENT_PERMISSIONS
            : ShardErrorCode.SHARD_VALIDATION_FAILED;

          result.results.push({
            index: i,
            status: 'failed',
            shardId,
            error: {
              index: i,
              code: errorCode,
              message: error.message,
              shardId,
            },
          });
          result.summary.failed++;

          if (options.onError === 'abort') {
            result.success = false;
            break;
          }
        }
      }

      result.success = result.summary.failed === 0;
      const statusCode = result.success ? 200 : result.summary.succeeded > 0 ? 207 : 400;

      req.log.info({
        operation: 'bulk_status_change',
        status,
        total: result.summary.total,
        succeeded: result.summary.succeeded,
        failed: result.summary.failed,
        duration: Date.now() - startTime,
      });

      reply.status(statusCode).send(result);
    } catch (error: any) {
      req.log.error({ error }, 'Bulk status change failed');
      reply.status(500).send({ error: 'Bulk status change failed' });
    }
  };

  /**
   * POST /api/v1/shards/bulk/tags
   * Bulk add, remove, or set tags on shards
   */
  bulkTagOperation = async (
    req: FastifyRequest<{ Body: BulkTagOperationInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { shardIds, operation, tags, options = {} } = req.body;

      if (!shardIds || shardIds.length === 0) {
        reply.status(400).send({ error: 'No shard IDs provided' });
        return;
      }

      if (!tags || tags.length === 0) {
        reply.status(400).send({ error: 'No tags provided' });
        return;
      }

      if (shardIds.length > MAX_BULK_SIZE) {
        reply.status(400).send({
          error: `Maximum ${MAX_BULK_SIZE} shards allowed per request`,
          code: ShardErrorCode.BULK_OPERATION_LIMIT_EXCEEDED,
        });
        return;
      }

      const result: BulkOperationResult<Shard> = {
        success: true,
        summary: { total: shardIds.length, succeeded: 0, failed: 0 },
        results: [],
      };

      for (let i = 0; i < shardIds.length; i++) {
        const shardId = shardIds[i];

        try {
          // Check permission
          const hasAccess = await this.repository.checkPermission(shardId, tenantId, userId);

          if (!hasAccess.hasAccess || !hasAccess.permissions.includes(PermissionLevel.WRITE)) {
            throw new Error('Insufficient permissions');
          }

          const existing = await this.repository.findById(shardId, tenantId);
          if (!existing) {
            throw new Error('Shard not found');
          }

          // Calculate new tags based on operation
          let newTags: string[];
          const existingTags = existing.metadata?.tags || [];

          switch (operation) {
            case 'add':
              newTags = Array.from(new Set([...existingTags, ...tags]));
              break;
            case 'remove':
              newTags = existingTags.filter(t => !tags.includes(t));
              break;
            case 'set':
              newTags = [...tags];
              break;
            default:
              throw new Error(`Invalid operation: ${operation}`);
          }

          const input: UpdateShardInput = {
            metadata: {
              ...existing.metadata,
              tags: newTags,
            },
          };

          const updated = await this.repository.update(shardId, tenantId, input);

          if (!updated) {
            throw new Error('Update failed');
          }

          // Emit event if enabled
          if (!options.skipEvents && this.eventService) {
            await this.eventService.emit(ShardEventType.UPDATED, updated, {
              triggeredBy: userId,
              triggerSource: 'api',
              changes: [{ field: 'metadata.tags', oldValue: existingTags, newValue: newTags }],
            });
          }

          result.results.push({
            index: i,
            status: 'updated',
            shardId,
            data: updated,
          });
          result.summary.succeeded++;
        } catch (error: any) {
          const errorCode = error.message === 'Shard not found'
            ? ShardErrorCode.SHARD_NOT_FOUND
            : error.message === 'Insufficient permissions'
            ? ShardErrorCode.INSUFFICIENT_PERMISSIONS
            : ShardErrorCode.SHARD_VALIDATION_FAILED;

          result.results.push({
            index: i,
            status: 'failed',
            shardId,
            error: {
              index: i,
              code: errorCode,
              message: error.message,
              shardId,
            },
          });
          result.summary.failed++;

          if (options.onError === 'abort') {
            result.success = false;
            break;
          }
        }
      }

      result.success = result.summary.failed === 0;
      const statusCode = result.success ? 200 : result.summary.succeeded > 0 ? 207 : 400;

      req.log.info({
        operation: 'bulk_tag_operation',
        tagOperation: operation,
        total: result.summary.total,
        succeeded: result.summary.succeeded,
        failed: result.summary.failed,
        duration: Date.now() - startTime,
      });

      reply.status(statusCode).send(result);
    } catch (error: any) {
      req.log.error({ error }, 'Bulk tag operation failed');
      reply.status(500).send({ error: 'Bulk tag operation failed' });
    }
  };

  /**
   * POST /api/v1/shards/bulk/export
   * Export shards to JSON or CSV format
   */
  bulkExport = async (
    req: FastifyRequest<{ Body: BulkExportInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        return;
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const {
        shardIds,
        shardTypeId,
        status,
        limit = MAX_EXPORT_SIZE,
        format = 'json',
        includeMetadata = true,
        fields,
      } = req.body;

      // Get shards to export
      let shardsToExport: Shard[] = [];

      if (shardIds && shardIds.length > 0) {
        // Export specific shards
        if (shardIds.length > MAX_EXPORT_SIZE) {
          reply.status(400).send({
            error: `Maximum ${MAX_EXPORT_SIZE} shards allowed per export`,
          });
          return;
        }

        for (const shardId of shardIds) {
          const shard = await this.repository.findById(shardId, tenantId);
          if (shard) {
            // Check read permission
            const hasAccess = await this.repository.checkPermission(shardId, tenantId, userId);
            if (hasAccess.hasAccess && hasAccess.permissions.includes(PermissionLevel.READ)) {
              shardsToExport.push(shard);
            }
          }
        }
      } else {
        // Export by filters
        const result = await this.repository.list({
          filter: {
            tenantId,
            shardTypeId,
            status,
          },
          limit: Math.min(limit, MAX_EXPORT_SIZE),
        });
        shardsToExport = result.shards;
      }

      // Transform data for export
      const exportData = shardsToExport.map(shard => {
        const base: Record<string, any> = {
          id: shard.id,
          shardTypeId: shard.shardTypeId,
          status: shard.status,
          structuredData: shard.structuredData,
          createdAt: shard.createdAt,
          updatedAt: shard.updatedAt,
        };

        if (includeMetadata) {
          base.metadata = shard.metadata;
          base.unstructuredData = shard.unstructuredData;
        }

        // Filter fields if specified
        if (fields && fields.length > 0) {
          const filtered: Record<string, any> = {};
          for (const field of fields) {
            if (field in base) {
              filtered[field] = base[field];
            } else if (field.startsWith('structuredData.')) {
              const key = field.replace('structuredData.', '');
              if (base.structuredData && key in base.structuredData) {
                filtered[field] = base.structuredData[key];
              }
            }
          }
          return filtered;
        }

        return base;
      });

      const csvData = format === 'csv' ? this.convertToCSV(exportData) : '';
      const exportResult: BulkExportResult = {
        format,
        count: exportData.length,
        data: format === 'csv' ? csvData : exportData,
        exportedAt: new Date().toISOString(),
      };

      req.log.info({
        operation: 'bulk_export',
        format,
        count: exportData.length,
        duration: Date.now() - startTime,
      });

      if (format === 'csv') {
        reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="shards-export-${Date.now()}.csv"`)
          .status(200)
          .send(exportResult.data);
      } else {
        reply.status(200).send(exportResult);
      }
    } catch (error: any) {
      req.log.error({ error }, 'Bulk export failed');
      reply.status(500).send({ error: 'Bulk export failed' });
    }
  };

  /**
   * Convert array of objects to CSV string
   */
  private convertToCSV(data: Record<string, any>[]): string {
    if (data.length === 0) {return '';}

    // Flatten nested objects for CSV
    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          Object.assign(result, flattenObject(value, newKey));
        } else {
          result[newKey] = value;
        }
      }
      return result;
    };

    const flatData = data.map(row => flattenObject(row));
    const headers = Array.from(new Set(flatData.flatMap(row => Object.keys(row))));

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) {return '';}
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      headers.join(','),
      ...flatData.map(row => headers.map(h => escapeCSV(row[h])).join(',')),
    ];

    return csvRows.join('\n');
  }
}

